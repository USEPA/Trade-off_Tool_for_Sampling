// types
import { FeatureEditsType } from 'types/Edits';
import { LayerType } from 'types/Layer';
import { LayerProps } from 'types/Misc';
import { AttributesType, ReferenceLayerSelections } from 'types/Publish';
// utils
import { fetchPost, fetchCheck, retryCall } from 'utils/fetchUtils';
import { generateUUID, getCurrentDateTime } from 'utils/sketchUtils';
import { chunkArray, escapeForLucene } from 'utils/utils';

/**
 * Changes the layer name such that it will work with ArcGIS Online
 *
 * @param name Desired name for layer
 * @returns Name of layer that is suitable for AGO
 */
function convertLayerName(name: string): string {
  return name.replaceAll('.', ' '); // workaround for .zip causing failure
}

/**
 * Returns an environment string to be passed as a parameter
 * to ESRI web service calls in order to avoid CORS errors.
 *
 * @returns envString The environment string to avoid
 *          CORS errors
 */
function getEnvironmentString() {
  const envStringMap: any = {
    localhost: 'onlocalhost',
    'tots-dev.app.cloud.gov': 'ondev',
    'tots-stage.app.cloud.gov': 'onstage',
  };
  return envStringMap[window.location.hostname];
}

/**
 * Returns an environment string query parameter to be passed into
 * ESRI web service calls in order to avoid CORS errors.
 *
 * @returns A string to be used as a parameter to ESRI REST services
 *          to avoid CORS errors
 */
export function getEnvironmentStringParam() {
  const environmentStr = getEnvironmentString();
  return environmentStr ? `&${environmentStr}=1` : '';
}

/**
 * Appends the environment specific parameter to the provided
 * parameters, if necessary. This is intended to be used with Esri
 * web services to avoid CORS issues.
 *
 * @param params The web service parameters to append the environment
 *               variable to
 */
export function appendEnvironmentObjectParam(params: any) {
  const environmentStr = getEnvironmentString();
  if (environmentStr) params[environmentStr] = 1;
}

/**
 * Checks if the feature service name is available.
 *
 * @param portal The portal object to check against.
 * @param serviceName The desired feature service name.
 */
export async function isServiceNameAvailable(
  portal: __esri.Portal | null,
  signedIn: boolean,
  serviceName: string,
) {
  if (!serviceName.replaceAll(' ', '') || /[^0-9a-zA-Z\-_ ]/.test(serviceName))
    return { available: false, problem: 'invalid-characters' };

  if (!portal || !signedIn) return { available: true };

  try {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // check if the tots feature service already exists
    const params: any = {
      f: 'json',
      token: tempPortal.credential.token,
      name: serviceName,
      type: 'Feature Service',
    };
    appendEnvironmentObjectParam(params);

    return await retryCall(() =>
      fetchPost(
        `${portal.restUrl}/portals/${portal.id}/isServiceNameAvailable`,
        params,
      ),
    );
  } catch (err) {
    console.error(err);
    window.logErrorToGa(err);
    return err;
  }
}

/**
 * Attempts to get the hosted feature service and creates it if
 * it doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @param featureService Object detailing information about the feature service to be published.
 * @returns A promise that resolves to the hosted feature service object
 */
async function getFeatureService(portal: __esri.Portal, featureService: any) {
  try {
    // check if the tots feature service already exists
    let service: any = await getFeatureServiceWrapped(portal, featureService);
    if (!service) {
      service = await createFeatureService(portal, featureService);
    }

    // get individual layer definitions
    const tempPortal: any = portal;
    const requests: Promise<any>[] = [];
    service.featureService.layers.forEach((layer: any) => {
      requests.push(
        getFeatureLayer(
          `${service.portalService.url}`,
          tempPortal.credential.token,
          layer.id,
        ),
      );
    });
    service.featureService.tables.forEach((table: any) => {
      requests.push(
        getFeatureLayer(
          `${service.portalService.url}`,
          tempPortal.credential.token,
          table.id,
        ),
      );
    });

    const layerDefinitions = await Promise.all(requests);

    return {
      ...service,
      layerDefinitions,
    };
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

function getFeatureServiceRetry(portal: __esri.Portal, featureService: any) {
  return new Promise((resolve, reject) => {
    // Function that fetches the lookup file.
    // This will retry the fetch 3 times if the fetch fails with a
    // 1 second delay between each retry.
    const fetchLookup = (retryCount: number = 0) => {
      // check if the tots feature service already exists
      getFeatureServiceWrapped(portal, featureService)
        .then((service) => {
          if (service) {
            resolve(service);
            return;
          }

          // resolve the request when the max retry count of 3 is hit
          if (retryCount === 3) {
            reject('No service');
          } else {
            // recursive retry (1 second between retries)
            console.log(
              `Failed to fetch feature service. Retrying (${
                retryCount + 1
              } of 3)...`,
            );
            setTimeout(() => fetchLookup(retryCount + 1), 1000);
          }
        })
        .catch((err) => {
          window.logErrorToGa(err);
          reject(err);
        });
    };

    fetchLookup();
  });
}

/**
 * Gets the hosted feature service and returns null if it it
 * doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @param featureService Object detailing information about the feature service to be published.
 * @returns A promise that resolves to the hosted feature service object or
 *  null if the service does not exist
 */
async function getFeatureServiceWrapped(
  portal: __esri.Portal,
  featureService: any,
) {
  try {
    let query = `orgid:${escapeForLucene(portal.user.orgId)}`;
    query += featureService.value
      ? ` AND id:${featureService.value}`
      : ` AND name:${featureService.label}`;
    const queryRes = await portal.queryItems({
      query,
      num: 100,
    });

    const exactMatch = queryRes.results.find(
      (layer: any) => layer.name === featureService.label,
    );

    if (exactMatch) {
      const portalService = exactMatch;

      // Workaround for esri.Portal not having credential
      const tempPortal: any = portal;
      const res = await fetchCheck(
        `${portalService.url}?f=json${getEnvironmentStringParam()}&token=${
          tempPortal.credential.token
        }`,
      );
      return {
        portalService,
        featureService: res,
      };
    } else {
      return null;
    }
  } catch (err) {
    window.logErrorToGa(err);
    return err;
  }
}

/**
 * Gets the web map or web scene and returns null if it it
 * doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @param featureService Object detailing information about the feature service to be published.
 * @param type Web Map or Web Scene depending on what needs to be retrieved
 * @returns A promise that resolves to the web map/scene object or
 *  null if the service does not exist
 */
async function getWebMapSceneWrapped(
  portal: __esri.Portal,
  featureService: any,
  type: 'Web Map' | 'Web Scene',
) {
  try {
    let query = `orgid:"${escapeForLucene(portal.user.orgId)}"`;
    query += `AND title:"${featureService.label}" AND type: "${type}"`;
    const res = await portal.queryItems({ query });

    const exactMatch = res.results.find(
      (layer: any) => layer.title === featureService.label,
    );
    if (exactMatch) return exactMatch;
    else return null;
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Creates and returns the hosted feature service
 *
 * @param portal The portal object to create the hosted feature service on
 * @param featureService Object detailing information about the feature service to be published.
 * @returns A promise that resolves to the hosted feature service object
 */
function createFeatureService(portal: __esri.Portal, featureService: any) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // feature service creation parameters
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      outputType: 'featureService',
      description: featureService.description,
      snippet: featureService.description,
      createParameters: {
        name: featureService.label,
        hasStaticData: false,
        maxRecordCount: 1000,
        supportedQueryFormats: 'JSON',
        capabilities: 'Create,Delete,Query,Update,Editing',
        spatialReference: {
          wkid: 3857,
        },
        allowGeometryUpdates: true,
        units: 'esriMeters',
        xssPreventionInfo: {
          xssPreventionEnabled: true,
          xssPreventionRule: 'InputOnly',
          xssInputRule: 'rejectInvalid',
        },
      },
    };
    appendEnvironmentObjectParam(data);

    // create the feature service
    retryCall(() =>
      fetchPost(`${portal.user.userContentUrl}/createService`, data),
    )
      .then((res: any) => {
        // Add metadata to the new feature service.
        // NOTE: It is unfortunate, but we have to do a separate call to update the feature
        // service with metadata. The documentation makes it look like we can add metadata
        // via createService, but this does not work. I looked at the web service requests
        // in the ArcGIS Online portal and found that ESRI is also doing a separate update
        // call to add metadata (tags in this case).
        const indata = {
          f: 'json',
          token: tempPortal.credential.token,

          // add metadata for determining whether a feature service has a sample layer vs
          // just being a reference layer.
          categories: featureService.category,
        };
        appendEnvironmentObjectParam(indata);

        retryCall(() =>
          fetchPost(
            `${portal.user.userContentUrl}/items/${res.itemId}/update`,
            indata,
          ),
        ).then((res: any) => {
          featureService.value = res.id;
          // get the feature service from the portal and return it
          getFeatureServiceRetry(portal, featureService)
            .then((service) => resolve(service))
            .catch((err) => {
              window.logErrorToGa(err);
              reject(err);
            });
        });
      })
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Gets all of the feature layers associated with the service
 *
 * @param service Object representing the hosted feature service
 * @param token Security token
 * @returns A promise that resolves to the layers on the hosted
 *  feature service
 */
export function getFeatureLayers(serviceUrl: string, token: string) {
  return new Promise((resolve, reject) => {
    retryCall(() =>
      fetchCheck(
        `${serviceUrl}?f=json&${getEnvironmentStringParam()}&token=${token}`,
      ),
    )
      .then((res: any) => {
        if (res) resolve(res);
        else resolve([]);
      })
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Gets all of the feature tables associated with the service
 *
 * @param service Object representing the hosted feature service
 * @param token Security token
 * @returns A promise that resolves to the layers on the hosted
 *  feature service
 */
export function getFeatureTables(serviceUrl: string, token: string) {
  return new Promise((resolve, reject) => {
    retryCall(() =>
      fetchCheck(
        `${serviceUrl}?f=json&${getEnvironmentStringParam()}&token=${token}`,
      ),
    )
      .then((res: any) => {
        if (res) resolve(res.tables);
        else resolve([]);
      })
      .catch((err) => reject(err));
  });
}

/**
 * Attempts to get the the layer, with the provided id, from the feature service.
 *
 * @param serviceUrl Object representing the hosted feature service
 * @param token Security token
 * @param id ID of the layer to retreive
 * @returns A promise that resolves to the requested layer
 */
export function getFeatureLayer(serviceUrl: string, token: string, id: number) {
  return new Promise((resolve, reject) => {
    retryCall(() =>
      fetchCheck(
        `${serviceUrl}/${id}?f=json&${getEnvironmentStringParam()}=1&token=${token}`,
      ),
    )
      .then((layer: any) => {
        resolve(layer);
      })
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Builds the renderer parameter for publishing and gets the extent
 * of all of the graphics in the layer.
 *
 * @param layer The layer to build the renderer for
 * @param layerProps Default/shared properties used for creating feature services, layers, web maps, and web scenes.
 * @returns The extent of graphics, the renderers for points and polygons
 */
export function buildRendererParams(
  layer: LayerType,
  layerProps: LayerProps | null,
) {
  // get the current extent, so we can go back
  let graphicsExtent: __esri.Extent | null = null;

  const uniqueValueInfosPolygons: any[] = [];
  const typesAdded: string[] = [];
  const uniqueValueInfosPoints: any[] = [];
  const templatesPolygons: any[] = [];
  const templatesPoints: any[] = [];
  const sampleTypes: any = {};

  // get the extent from the array of graphics
  if (layer.sketchLayer?.type === 'graphics') {
    layer.sketchLayer.graphics.forEach((graphic) => {
      if (graphicsExtent === null) graphicsExtent = graphic.geometry.extent;
      else graphicsExtent.union(graphic.geometry.extent);

      // build the renderer to publish
      const attributes = graphic.attributes;
      if (!typesAdded.includes(attributes.TYPEUUID)) {
        typesAdded.push(attributes.TYPEUUID);

        sampleTypes[attributes.TYPEUUID] = {
          attributes: {
            ...attributes,
            PERMANENT_IDENTIFIER: null,
            AA: null,
            Notes: '',
            CONTAMTYPE: null,
            CONTAMVAL: null,
            CONTAMUNIT: null,
            CREATEDDATE: null,
            UPDATEDDATE: null,
            USERNAME: null,
            ORGANIZATION: null,
            DECISIONUNITUUID: null,
            DECISIONUNIT: null,
            DECISIONUNITSORT: 0,
          },
        };

        if (layerProps) {
          // delete any custom attributes
          Object.keys(sampleTypes[attributes.TYPEUUID].attributes).forEach(
            (key) => {
              const foundField = layerProps.defaultFields.find(
                (field: any) => field.name === key,
              );

              if (!foundField) {
                delete sampleTypes[attributes.TYPEUUID].attributes[key];
              }
            },
          );
        }

        const tempSymbol = {
          color: graphic.symbol.color,
          outline: (graphic.symbol as any).outline,
        };

        // build the polygon renderer
        uniqueValueInfosPolygons.push({
          value: attributes.TYPEUUID,
          label: attributes.TYPE,
          symbol: {
            type: 'esriSFS',
            style: 'esriSFSSolid',
            ...tempSymbol,
          },
        });

        // build the points renderer
        const pointStyle = attributes.POINT_STYLE || 'circle';
        const isPath = pointStyle.includes('path|');
        const style: string =
          'esriSMS' +
          (isPath
            ? 'Path'
            : pointStyle.charAt(0).toUpperCase() + pointStyle.slice(1));
        const symbol: any = {
          type: 'esriSMS',
          style,
          ...tempSymbol,
        };
        if (isPath) {
          symbol.path = attributes.POINT_STYLE.replace('path|', '');
        }

        uniqueValueInfosPoints.push({
          value: attributes.TYPEUUID,
          label: attributes.TYPE,
          symbol,
        });
      }
    });
  }
  if (layer.sketchLayer?.type === 'feature') {
    graphicsExtent = layer.sketchLayer.fullExtent;
  }

  return {
    graphicsExtent,
    sampleTypes,
    templatesPoints,
    templatesPolygons,
    uniqueValueInfosPolygons,
    uniqueValueInfosPoints,
  };
}

/**
 * Used for adding a feature layer to a hosted feature service on
 * ArcGIS Online
 *
 * @param portal The portal object to create feature layers on
 * @param serviceUrl The hosted feature service to save layers to
 * @param featureService Object detailing information about the feature service to be published.
 * @param service The feature service object
 * @returns A promise that resolves to the layers that were saved
 */
function createFeatureLayers(
  portal: __esri.Portal,
  serviceUrl: string,
  featureService: any,
  service: any,
) {
  return new Promise((resolve, reject) => {
    if (
      featureService.layers.length === 0 &&
      featureService.tables.length === 0
    ) {
      resolve({
        success: true,
        layers: [],
        tables: [],
      });
      return;
    }

    const layerIds: string[] = [];
    const layersParams: any[] =
      featureService.layers
        ?.filter(
          (l) =>
            service.featureService.layers?.findIndex(
              (i) => i.id === l.id || i.name === l.layerDefinitionProps.name,
            ) === -1,
        )
        .map((l) => {
          layerIds.push(l.layerId);
          return l.layerDefinitionProps;
        }) ?? [];
    const tablesOut: any[] =
      featureService.tables
        ?.filter(
          (t) =>
            service.featureService.tables?.findIndex(
              (i) => i.name === t.tableDefinitionProps.name,
            ) === -1,
        )
        .map((t) => t.tableDefinitionProps) ?? [];

    const refIdsAdded: string[] = [];
    console.log('referenceMaterials: ', featureService.referenceMaterials);
    const processReferencLayerSelections = (l: ReferenceLayerSelections) => {
      if (refIdsAdded.includes(l.id)) return;
      if (l.type !== 'file') return;

      // don't duplicate existing layers
      const layerFromService = service.featureService.layers.find(
        (m: any) => m.name === l.label,
      );
      if (layerFromService) return;

      refIdsAdded.push(l.id);
      layerIds.push(l.id);

      layersParams.push({
        ...l.layer.rawLayer.layerDefinition,
        name: convertLayerName(l.label),
      });
    };

    featureService.referenceMaterials?.webMapReferenceLayerSelections?.forEach(
      processReferencLayerSelections,
    );
    featureService.referenceMaterials?.webSceneReferenceLayerSelections?.forEach(
      processReferencLayerSelections,
    );

    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      addToDefinition: {
        layers: layersParams,
        tables: tablesOut,
      },
    };
    appendEnvironmentObjectParam(data);

    if (layersParams.length === 0 && tablesOut.length === 0) {
      resolve({
        success: true,
        layers: [],
        tables: [],
      });
      return;
    }

    // inject /admin into rest/services to be able to call
    const adminServiceUrl = serviceUrl.replace(
      'rest/services',
      'rest/admin/services',
    );
    retryCall(() => fetchPost(`${adminServiceUrl}/addToDefinition`, data))
      .then((res: any) => {
        res.layers.forEach((l: any, index: number) => {
          l['layerId'] = layerIds[index];
        });
        resolve(res);
      })
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Builds a field to be sent to AGO from the TOTS definition of
 * custom attributes.
 *
 * @param attribute The attribute to be converted
 * @returns A field that can be sent to AGO
 */
export function buildFieldFromCustomAttribute(attribute: AttributesType) {
  let esriType = '';
  let actualType: string | undefined = undefined;
  let sqlType = '';
  let length: number | undefined = undefined;
  if (attribute.dataType === 'date') {
    esriType = 'esriFieldTypeDate';
    sqlType = 'sqlTypeOther';
  }
  if (attribute.dataType === 'double') {
    esriType = 'esriFieldTypeDouble';
    actualType = 'double';
    sqlType = 'sqlTypeDouble';
  }
  if (attribute.dataType === 'integer') {
    esriType = 'esriFieldTypeInteger';
    actualType = 'int';
    sqlType = 'sqlTypeInteger';
  }
  if (attribute.dataType === 'string') {
    esriType = 'esriFieldTypeString';
    actualType = 'nvarchar';
    sqlType = 'sqlTypeNVarchar';
    length = attribute.length ?? undefined;
  }

  let domain = null;
  if (attribute.domain?.type === 'range' && attribute.domain.range) {
    const range = attribute.domain.range;
    domain = {
      type: 'range',
      name: `${attribute.name}DOMAIN`,
      range: [range.min, range.max],
    };
  }
  if (attribute.domain?.type === 'coded' && attribute.domain.codedValues) {
    domain = {
      type: 'codedValue',
      name: `${attribute.name}DOMAIN`,
      codedValues: attribute.domain.codedValues.map((item) => {
        return {
          name: item.label,
          code: item.value,
        };
      }),
    };
  }

  return {
    name: attribute.name,
    alias: attribute.label,
    type: esriType,
    actualType,
    sqlType,
    nullable: true,
    editable: true,
    defaultValue: null,
    length,
    domain,
  } as any;
}

/**
 * Builds a TOTS custom attribute from a field from AGO.
 *
 * @param field A field from AGO to be converted
 * @param id Id to be applied to the TOTS attributes
 * @returns A TOTS custom attribute definition
 */
export function buildCustomAttributeFromField(field: any, id: number) {
  let dataType = '';
  let length: number | null = null;
  if (field.type === 'esriFieldTypeDate') {
    dataType = 'date';
  }
  if (field.type === 'esriFieldTypeDouble') {
    dataType = 'double';
  }
  if (field.type === 'esriFieldTypeInteger') {
    dataType = 'integer';
  }
  if (field.type === 'esriFieldTypeString') {
    dataType = 'string';
    length = field.length ?? null;
  }

  let domain = null;
  if (field.domain?.type === 'range' && field.domain.range) {
    const range = field.domain.range;
    domain = {
      type: 'range',
      codededValues: null,
      range: { min: range[0], max: range[1] },
    };
  }
  if (field.domain?.type === 'codedValue' && field.domain.codedValues) {
    domain = {
      type: 'coded',
      range: null,
      codedValues: field.domain.codedValues.map((item: any, index: number) => {
        const localIndex = index + 1;
        const id =
          localIndex === field.domain.codedValues.length ? -1 : localIndex;
        return {
          id,
          label: item.name,
          value: item.code,
        };
      }),
    };
  }

  return {
    id,
    name: field.name,
    label: field.alias,
    dataType,
    length,
    domain,
  } as any;
}

/**
 * Gets fields that have been added by the user.
 *
 * @param id Id of the layer
 * @param service The feature service object
 * @param attributesToInclude The attributes to include with each graphic
 * @returns The new fields that were added
 */
function getNewFields(
  id: number,
  service: any,
  attributesToInclude?: any[] | null,
) {
  // get the layer definition
  const layerDefinition = service.layerDefinitions.find(
    (def: any) => def.id === id,
  );
  if (!layerDefinition) return [];

  // check fields
  const newFields: any[] = [];
  attributesToInclude?.forEach((attribute) => {
    const hasField =
      layerDefinition.fields.findIndex((f: any) => f.name === attribute.name) >
      -1;

    if (!hasField) newFields.push(attribute);
  });

  return newFields;
}

/**
 * Gets fields that have been removed by the user.
 *
 * @param id Id of the layer
 * @param service The feature service object
 * @param attributesToInclude The attributes to include with each graphic
 * @returns The fields that were removed
 */
function getFieldsToDelete(
  id: number,
  service: any,
  attributesToInclude?: any[] | null,
) {
  const fieldsToSkip = ['OBJECTID', 'GLOBALID', 'Shape__Area', 'Shape__Length'];

  // get layer definition
  const layerDefinition = service.layerDefinitions.find(
    (def: any) => def.id === id,
  );

  // check fields
  const fieldsToDelete: any[] = [];
  layerDefinition?.fields?.forEach((field: any) => {
    if (fieldsToSkip.includes(field.name)) return;

    const hasAttribute =
      attributesToInclude &&
      attributesToInclude?.findIndex((a: any) => a.name === field.name) > -1;

    if (!hasAttribute) fieldsToDelete.push({ name: field.name });
  });

  return fieldsToDelete;
}

/**
 * Updates the renderers, extent, and fields of the feature layers.
 *
 * @param portal The portal object to create feature layers on
 * @param serviceUrl The hosted feature service to save layers to
 * @param featureService Object detailing information about the feature service to be published.
 * @param layersResponse The response from creating layer
 * @param service The feature service object
 * @returns A promise that resolves to the layers that were updated
 */
async function updateFeatureLayers({
  portal,
  serviceUrl,
  featureService,
  layersResponse,
  service,
}: {
  portal: __esri.Portal;
  serviceUrl: string;
  featureService: any;
  layersResponse: any;
  service: any;
}) {
  try {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    if (
      featureService.layers.length === 0 &&
      featureService.tables.length === 0
    ) {
      return {
        success: true,
        layers: [],
        tables: [],
      };
    }

    // inject /admin into rest/services to be able to call
    const adminServiceUrl = serviceUrl.replace(
      'rest/services',
      'rest/admin/services',
    );

    const addParams: any[] = [];
    const deleteParams: any[] = [];
    const updateParams: any[] = [];
    featureService.layers.forEach((layer) => {
      const id = findLayerId({
        service,
        layersResponse,
        name: layer.layerDefinitionProps.name,
      });

      // update the polygon representation
      const fieldsToDelete = getFieldsToDelete(
        id,
        service,
        layer.layerDefinitionProps.fields,
      );

      if (fieldsToDelete.length > 0) {
        // delete any fields that have been marked for removal
        deleteParams.push({
          url: `${adminServiceUrl}/${id}/deleteFromDefinition`,
          params: {
            f: 'json',
            token: tempPortal.credential.token,
            deleteFromDefinition: {
              fields: fieldsToDelete,
            },
          },
        });
      }

      // add any new fields
      const fieldsToAdd = getNewFields(
        id,
        service,
        layer.layerDefinitionProps.fields,
      );
      if (fieldsToAdd.length > 0) {
        addParams.push({
          url: `${adminServiceUrl}/${id}/addToDefinition`,
          params: {
            f: 'json',
            token: tempPortal.credential.token,
            addToDefinition: {
              fields: fieldsToAdd,
            },
          },
        });
      }

      // update definition
      updateParams.push({
        url: `${adminServiceUrl}/${id}/updateDefinition`,
        params: {
          f: 'json',
          token: tempPortal.credential.token,
          updateDefinition: {
            name: layer.layerDefinitionProps.name,
            description: layer.layerDefinitionProps.description,
            extent: layer.layerDefinitionProps.extent,
            drawingInfo: layer.layerDefinitionProps.drawingInfo,
          },
        },
      });
    });

    featureService.tables?.forEach((table) => {
      const id = findLayerId({
        service,
        layersResponse,
        name: table.tableDefinitionProps.name,
      });

      // update the polygon representation
      const fieldsToDelete = getFieldsToDelete(
        id,
        service,
        table.tableDefinitionProps.fields,
      );

      if (fieldsToDelete.length > 0) {
        // delete any fields that have been marked for removal
        deleteParams.push({
          url: `${adminServiceUrl}/${id}/deleteFromDefinition`,
          params: {
            f: 'json',
            token: tempPortal.credential.token,
            deleteFromDefinition: {
              fields: fieldsToDelete,
            },
          },
        });
      }

      // add any new fields
      const fieldsToAdd = getNewFields(
        id,
        service,
        table.tableDefinitionProps.fields,
      );
      if (fieldsToAdd.length > 0) {
        addParams.push({
          url: `${adminServiceUrl}/${id}/addToDefinition`,
          params: {
            f: 'json',
            token: tempPortal.credential.token,
            addToDefinition: {
              fields: fieldsToAdd,
            },
          },
        });
      }

      // update definition
      updateParams.push({
        url: `${adminServiceUrl}/${id}/updateDefinition`,
        params: {
          f: 'json',
          token: tempPortal.credential.token,
          updateDefinition: {
            name: table.tableDefinitionProps.name,
            description: table.tableDefinitionProps.description,
          },
        },
      });
    });

    // Fire off requests in order of deletes, adds, and updates.
    // The order is important. If we fired the requests off immediatly
    // we end up with data errors in AGO.

    // fire off delete requests
    const deleteRequests: any[] = [];
    deleteParams.forEach((requestParam) => {
      deleteRequests.push(
        retryCall(() => fetchPost(requestParam.url, requestParam.params)),
      );
    });
    const deleteResponses = await Promise.all(deleteRequests);

    // fire off add requests
    const addRequests: any[] = [];
    addParams.forEach((requestParam) => {
      addRequests.push(
        retryCall(() => fetchPost(requestParam.url, requestParam.params)),
      );
    });
    const addResponses = await Promise.all(addRequests);

    // fire off update requests
    const updateRequests: any[] = [];
    updateParams.forEach((requestParam) => {
      updateRequests.push(
        retryCall(() => fetchPost(requestParam.url, requestParam.params)),
      );
    });
    const updateResponses = await Promise.all(updateRequests);

    return {
      success: true,
      res: {
        addResponses,
        deleteResponses,
        updateResponses,
      },
    };
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Used for deleteing a feature layer from a hosted feature service
 * on ArcGIS Online
 *
 * @param portal The portal object to delete layers from
 * @param servicUrl The hosted feature service to delete layers from
 * @param id The ID of the layer to delete
 * @returns A promise that resolves to the layers that were deleted
 */
export function deleteFeatureLayer(
  portal: __esri.Portal,
  servicUrl: string,
  id: number,
) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      deleteFromDefinition: {
        layers: [{ id: id.toString() }],
      },
    };
    appendEnvironmentObjectParam(data);

    // inject /admin into rest/services to be able to call
    const adminServiceUrl = servicUrl.replace(
      'rest/services',
      'rest/admin/services',
    );
    retryCall(() => fetchPost(`${adminServiceUrl}/deleteFromDefinition`, data))
      .then((res) => resolve(res))
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Gets all of the features from a hosted feature service on ArcGIS Online
 *
 * @param portal The portal to get all features from
 * @param serviceUrl The hosted feature service to query
 * @param objectIdField The object id field for the service
 * @returns A promise that resolves to all of the features on the hosted
 *  feature service
 */
export function getAllFeatures(
  portal: __esri.Portal,
  serviceUrl: string,
  objectIdField: string = 'OBJECTID',
) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;
    const query = {
      f: 'json',
      token: tempPortal.credential.token,
      where: '0=0',
      returnIdsOnly: true,
      returnGeometry: false,
    };
    appendEnvironmentObjectParam(query);

    retryCall(() => fetchPost(`${serviceUrl}/query`, query))
      .then((objectIds: any) => {
        if (objectIds.objectIds.length === 0) {
          resolve({
            features: [],
            objectIdFieldName: objectIds.objectIdFieldName,
          });
          return;
        }

        // Break the data up into chunks of 1000 or the max record count
        const chunkedObjectIds = chunkArray(objectIds.objectIds, 1000);

        // request data with each chunk of objectIds
        const requests: Promise<any>[] = [];

        // fire off the requests for the features with geometry
        chunkedObjectIds.forEach((chunk: Array<string>) => {
          const data = {
            f: 'json',
            token: tempPortal.credential.token,
            where: `${objectIdField} in (${chunk.join(',')})`,
            outFields: '*',
            returnGeometry: true,
            returnZ: true,
          };
          appendEnvironmentObjectParam(data);

          const request = retryCall(() =>
            fetchPost(`${serviceUrl}/query`, data),
          );
          requests.push(request);
        });

        // When all of the requests are complete, combine them and
        // return the result.
        Promise.all(requests)
          .then((responses) => {
            let result: any = {};
            responses.forEach((res, index) => {
              // first iteration just copy the entire response
              if (index === 0) {
                result = res;
                return;
              }

              // subsequent iterations only append the features
              res.features.forEach((feature: any) => {
                result.features.push(feature);
              });
            });

            resolve(result);
          })
          .catch((err) => {
            window.logErrorToGa(err);
            reject(err);
          });
      })
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Adds point versions of features to the provided array. This is to support publishing a point
 * version of the layers being published.
 *
 * @param layer The layer the graphic is on
 * @param array The array to add the point version of graphic to
 * @param item The edits item that is being looked for
 * @param attributesToInclude The attributes to include with each graphic
 * @param forDeletes True means this is for the deletes change type which is just the global id
 * @returns
 */
export function addPointFeatures(
  layer: LayerType,
  array: any[],
  item: FeatureEditsType,
  attributesToInclude: AttributesType[] | null,
  forDeletes: boolean = false,
) {
  // find the graphic
  const graphic = layer.pointsLayer?.graphics.find(
    (graphic) =>
      graphic.attributes?.PERMANENT_IDENTIFIER ===
      item.attributes.PERMANENT_IDENTIFIER,
  );
  if (!graphic) return;

  // Add the globalids of graphics to delete
  if (forDeletes) {
    array.push(graphic.attributes.GLOBALID);
    return;
  }

  let attributes: any = {};
  if (layer?.sketchLayer?.type === 'graphics') {
    const graphic = layer.sketchLayer.graphics.find(
      (graphic) =>
        graphic.attributes.PERMANENT_IDENTIFIER ===
        item.attributes.PERMANENT_IDENTIFIER,
    );

    attributes['GLOBALID'] = generateUUID();
    attributes['OBJECTID'] = graphic.attributes['OBJECTID'];
    if (attributesToInclude) {
      attributesToInclude.forEach((attribute) => {
        attributes[attribute.name] = graphic.attributes[attribute.name] || null;
      });
    } else {
      attributes = { ...graphic.attributes };
    }
  }

  // Add full feature for graphics to add or update
  array.push({
    attributes,
    geometry: graphic.geometry,
    symbol: graphic.symbol,
  });
}

/**
 * Finds the layer id for the provided layer name from the
 * hosted feature service and the addToDefinition response.
 *
 * @param service The feature service object
 * @param layersReponse The addToDefinition response for newly added layers
 * @param name Name of the layer to search for
 * @returns AGO id of the desired layer
 */
function findLayerId({
  service,
  layersResponse,
  name,
}: {
  service: any;
  layersResponse: any;
  name: string;
}): number {
  let layer;

  // check in service.layers
  layer = service.featureService.layers?.find((l: any) => l.name === name);
  if (layer) return layer.id;

  // check in service.tables
  layer = service.featureService.tables?.find((l: any) => l.name === name);
  if (layer) return layer.id;

  // check in layersResponse.layers
  layer = layersResponse.layers?.find((l: any) => l.name === name);
  if (layer) return layer.id;

  // check in layersResponse.tables
  layer = layersResponse.tables?.find((l: any) => l.name === name);
  if (layer) return layer.id;

  return -1;
}

/**
 * Applys edits to a layer or layers within a hosted feature service
 * on ArcGIS Online.
 *
 * @param portal The portal object to apply edits to
 * @param service The feature service object
 * @param serviceUrl The url of the hosted feature service
 * @param featureService Object detailing information about the feature service to be published.
 * @param layersResponse The response from creating layers
 * @returns A promise that resolves to the successfully saved objects
 */
async function applyEdits({
  portal,
  service,
  serviceUrl,
  featureService,
  layersResponse,
}: {
  portal: __esri.Portal;
  service: any;
  serviceUrl: string;
  featureService: any;
  layersResponse: any;
}) {
  try {
    const changes: any[] = [];
    const tempPortal: any = portal;

    // clear out data
    const idsToClear: number[] = [
      ...(service.featureService.layers?.map((l) => l.id) ?? []),
      ...(service.featureService.tables?.map((t) => t.id) ?? []),
    ];
    const clearPromises: Promise<unknown>[] = [];
    idsToClear.forEach((id) => {
      const data = {
        f: 'json',
        token: tempPortal.credential.token,
        where: '1=1',
      };
      appendEnvironmentObjectParam(data);

      clearPromises.push(
        retryCall(() => fetchPost(`${serviceUrl}/${id}/deleteFeatures`, data)),
      );
    });
    const clearResponses = await Promise.all(clearPromises);
    console.log('clearResponses: ', clearResponses);

    console.log('featureService: ', featureService);
    featureService.layers.forEach((layer) => {
      changes.push({
        id: findLayerId({
          service,
          layersResponse,
          name: layer.layerDefinitionProps.name,
        }),
        adds: layer.adds,
        updates: layer.updates,
        deletes: [],
      });
    });

    const refIdsAdded: string[] = [];
    featureService.referenceMaterials?.webMapReferenceLayerSelections?.forEach(
      (l) => {
        if (refIdsAdded.includes(l.id)) return;
        if (l.type !== 'file') return;

        // don't duplicate existing layers
        const layerFromService = service.featureService.layers.find(
          (m: any) => m.name === l.label,
        );
        if (layerFromService) return;

        refIdsAdded.push(l.id);

        if (l.layer.rawLayer.featureSet.features.length === 0) return;

        changes.push({
          id: findLayerId({
            service,
            layersResponse,
            name: convertLayerName(l.label),
          }),
          adds: l.layer.rawLayer.featureSet.features,
          updates: [],
          deletes: [],
        });
      },
    );
    featureService.referenceMaterials?.webSceneReferenceLayerSelections?.forEach(
      (l) => {
        if (refIdsAdded.includes(l.id)) return;
        if (l.type !== 'file') return;

        // don't duplicate existing layers
        const layerFromService = service.featureService.layers.find(
          (m: any) => m.name === l.label,
        );
        if (layerFromService) return;

        refIdsAdded.push(l.id);

        if (l.layer.rawLayer.featureSet.features.length === 0) return;

        changes.push({
          id: findLayerId({
            service,
            layersResponse,
            name: convertLayerName(l.label),
          }),
          adds: l.layer.rawLayer.featureSet.features,
          updates: [],
          deletes: [],
        });
      },
    );

    const tableOutputs: any[] = [];
    featureService.tables?.forEach((table: any) => {
      const output = buildSimpleTableEdits({
        id: findLayerId({
          service,
          layersResponse,
          name: table.tableDefinitionProps.name,
        }),
        data: table.data,
      });
      tableOutputs.push(output.edits);
      changes.push(output.edits);
    });

    // run the webserivce call to update ArcGIS Online
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      edits: changes,
      honorSequenceOfEdits: true,
      useGlobalIds: true,
    };
    appendEnvironmentObjectParam(data);

    const res = await retryCall(() =>
      fetchPost(`${serviceUrl}/applyEdits`, data),
    );

    return {
      response: res,
      tableOutputs,
    };
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}

/**
 * Builds the edits arrays for publishing the sample types layer of
 * the sampling plan feature service.
 *
 * @param referenceMaterials Reference layers to store in reference layers table
 * @returns An object containing the edits arrays
 */
export function buildReferenceLayerTableEdits(referenceMaterials: {
  createWebMap: boolean;
  createWebScene: boolean;
  webMapReferenceLayerSelections: ReferenceLayerSelections[];
  webSceneReferenceLayerSelections: ReferenceLayerSelections[];
}) {
  const adds: any[] = [];
  const timestamp = getCurrentDateTime();

  // build a unique list of reference materials across web map and web scene
  const uniqueReferenceLayerSelections: ReferenceLayerSelections[] = [];
  const refIdsAdded: string[] = [];

  referenceMaterials.webMapReferenceLayerSelections.forEach((l) => {
    if (refIdsAdded.includes(l.id)) return;
    refIdsAdded.push(l.id);

    const onWebScene =
      referenceMaterials.webSceneReferenceLayerSelections.findIndex(
        (m) => m.id === l.id,
      ) > -1
        ? 1
        : 0;

    uniqueReferenceLayerSelections.push({
      ...l,
      onWebMap: 1,
      onWebScene: onWebScene,
    });
  });
  referenceMaterials.webSceneReferenceLayerSelections.forEach((l) => {
    if (refIdsAdded.includes(l.id)) return;
    refIdsAdded.push(l.id);

    const onWebMap =
      referenceMaterials.webMapReferenceLayerSelections.findIndex(
        (m) => m.id === l.id,
      ) > -1
        ? 1
        : 0;

    uniqueReferenceLayerSelections.push({
      ...l,
      onWebMap,
      onWebScene: 1,
    });
  });

  // build the adds, updates, and deletes
  uniqueReferenceLayerSelections.forEach((refLayer) => {
    adds.push({
      GLOBALID: generateUUID(),
      TOTSLAYERID: refLayer.totsLayerId,
      LAYERID: refLayer.id,
      LABEL: refLayer.label,
      LAYERTYPE: refLayer.type === 'file' ? '' : refLayer.layerType,
      ONWEBMAP: refLayer.onWebMap,
      ONWEBSCENE: refLayer.onWebScene,
      TYPE: refLayer.type,
      URL: refLayer.value,
      URLTYPE: refLayer.type === 'url' ? refLayer.urlType : '',
      CREATEDDATE: timestamp,
      UPDATEDDATE: timestamp,
    });
  });

  return adds;
}

/**
 * Builds the edits arrays for publishing the calculate settings table of
 * the sampling plan feature service.
 *
 * @param id Id of the layer
 * @param data data to be saved to table
 * @returns An object containing the edits arrays
 */
function buildSimpleTableEdits({ id, data }: { id: number; data: any[] }) {
  const adds: any[] = [];
  const timestamp = getCurrentDateTime();

  data.forEach((row) => {
    adds.push({
      attributes: {
        ...row,
        GLOBALID: generateUUID(),
        CREATEDDATE: timestamp,
        UPDATEDDATE: timestamp,
      },
    });
  });

  return {
    edits: {
      id,
      adds,
      updates: [],
      deletes: [],
    },
  };
}

type AgoLayerType =
  | 'ArcGISFeatureLayer'
  | 'ArcGISImageServiceLayer'
  | 'ArcGISMapServiceLayer'
  | 'ArcGISSceneServiceLayer'
  | 'BuildingSceneLayer'
  | 'CSV'
  | 'GeoRSS'
  | 'IntegratedMeshLayer'
  | 'KML'
  | 'PointCloudLayer'
  | 'VectorTileLayer'
  | 'WMS';

/**
 * Gets the layer type value that the ArcGIS REST API needs from
 * the TOTS layer type value.
 *
 * @param refLayer Object of the reference layer being added
 * @returns AGO Layer type
 */
function getAgoLayerType(
  refLayer: ReferenceLayerSelections,
): AgoLayerType | null {
  if (refLayer.type === 'file') return 'ArcGISFeatureLayer';
  const layerType = refLayer.layerType;

  let layerTypeOut: AgoLayerType | null = null;
  if (refLayer.type === 'url' && refLayer.urlType === 'ArcGIS') {
    if (layerType === 'feature') layerTypeOut = 'ArcGISFeatureLayer';
    if (layerType === 'tile') layerTypeOut = 'ArcGISMapServiceLayer';
    if (layerType === 'map-image') layerTypeOut = 'ArcGISMapServiceLayer';
    if (layerType === 'imagery') layerTypeOut = 'ArcGISImageServiceLayer';
    if (layerType === 'imagery-tile') layerTypeOut = 'ArcGISImageServiceLayer';
    if (layerType === 'scene') layerTypeOut = 'ArcGISSceneServiceLayer';
    if (layerType === 'integrated-mesh') layerTypeOut = 'IntegratedMeshLayer';
    if (layerType === 'point-cloud') layerTypeOut = 'PointCloudLayer';
    if (layerType === 'building-scene') layerTypeOut = 'BuildingSceneLayer';
    return layerTypeOut;
  }

  if (['CSV', 'csv'].includes(layerType)) layerTypeOut = 'CSV';
  if (['GeoRSS', 'geo-rss'].includes(layerType)) layerTypeOut = 'GeoRSS';
  if (layerType === 'Feature Service') layerTypeOut = 'ArcGISFeatureLayer';
  if (layerType === 'Image Service') layerTypeOut = 'ArcGISImageServiceLayer';
  if (['KML', 'kml'].includes(layerType)) layerTypeOut = 'KML';
  if (layerType === 'Map Service') layerTypeOut = 'ArcGISMapServiceLayer';
  if (layerType === 'Scene Service') layerTypeOut = 'ArcGISSceneServiceLayer';
  if (layerType === 'Vector Tile Service') layerTypeOut = 'VectorTileLayer';
  if (['WMS', 'wms'].includes(layerType)) layerTypeOut = 'WMS';

  return layerTypeOut;
}

/**
 * Builds reference layers to be published to the web map and or web scene.
 * Then adds them to the provided operationalLayers array.
 *
 * @param map Esri map - Used for sorting the reference layers
 * @param operationalLayers Layers to be saved to web map/scene
 * @param referenceMaterials Reference layers to be saved to web map/scene
 */
function buildReferenceLayers(
  map: __esri.Map,
  operationalLayers: any[],
  referenceMaterials: ReferenceLayerSelections[],
) {
  referenceMaterials
    .sort((a, b) => {
      const aIndex = map.layers.findIndex((l) => l.id === a.id);
      const bIndex = map.layers.findIndex((l) => l.id === b.id);

      return aIndex - bIndex;
    })
    .forEach((l) => {
      if (l.type === 'file') return;

      const layerType = getAgoLayerType(l);
      if (layerType === 'VectorTileLayer') {
        operationalLayers.push({
          layerType,
          title: l.label,
          styleUrl: `${l.value}/resources/styles/root.json`,
        });
      } else {
        operationalLayers.push({
          layerType,
          title: l.label,
          url: l.value,
        });
      }
    });
}

/**
 * Publishes a web map version of the feature service.
 *
 * @param portal The portal object to apply edits to
 * @param service The feature service object
 * @param featureService Object detailing information about the feature service to be published.
 * @param layersResponse The response from creating layers
 * @param referenceMaterials Reference layers to apply to web map
 * @param map Esri Map - Used for sorting the reference layers
 * @param layerProps The layer properties to be used for publishing
 * @param type Web Map or Web Scene
 * @param existingWebMapScene Object for existing web map or web scene, if available
 * @returns A promise that resolves to the successfully saved web map
 */
function addWebMapScene({
  portal,
  service,
  featureService,
  layersResponse,
  referenceMaterials,
  map,
  layerProps,
  type,
  existingWebMapScene,
}: {
  portal: __esri.Portal;
  service: any;
  featureService: any;
  layersResponse: any;
  referenceMaterials: ReferenceLayerSelections[];
  map: __esri.Map;
  layerProps: LayerProps;
  type: 'Web Map' | 'Web Scene';
  existingWebMapScene: any | null;
}) {
  return new Promise((resolve, reject) => {
    if (featureService.layers.length === 0) {
      resolve({
        success: true,
      });
    }
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    const itemId = service.portalService.id;
    const baseUrl = service.portalService.url;
    const title = service.portalService.title;

    const operationalLayers: any[] = [];
    const extent: __esri.Extent =
      featureService.layers[0].layerDefinitionProps.extent;

    console.log('referenceMaterials: ', referenceMaterials);
    buildReferenceLayers(map, operationalLayers, referenceMaterials);
    console.log('operationalLayers: ', operationalLayers.length);
    operationalLayers.forEach((opLayer) => console.log('opLayer: ', opLayer));

    const responseChoice =
      service.featureService.layers.length > 0
        ? service.featureService.layers
        : layersResponse.layers;
    console.log('service: ', service);
    console.log('responseChoice: ', responseChoice);

    const layersOut: any[] = [];
    const choicesCombined = [
      ...service.featureService.layers,
      ...layersResponse.layers,
    ];
    choicesCombined.reverse();
    choicesCombined.forEach((l: any) => {
      layersOut.push(l);
    });

    layersOut.forEach((layer: any) => {
      // get the fields from the layer definition
      let layerFields = featureService.layers.find(
        (l) => l.layerId === layer.layerId,
      )?.layerDefinitionProps?.fields;
      if (!layerFields) {
        layerFields = referenceMaterials.find(
          (l) => l.id === layer.layerId && l.type === 'file',
        )?.layer?.fields;
      }

      // get the fieldInfos for the popups
      const fieldInfos = layerFields?.map((field: any) => {
        let format: any = undefined;
        if (
          field.type === 'esriFieldTypeDouble' ||
          field.type === 'esriFieldTypeInteger'
        ) {
          format = {
            digitSeparator: true,
            places: 0,
          };
        }

        return {
          fieldName: field.name,
          label: field.alias,
          isEditable: field.editable,
          visible: true,
          format,
        };
      });

      operationalLayers.push({
        title: layer.name,
        url: `${baseUrl}/${layer.id}`,
        itemId,
        layerType: 'ArcGISFeatureLayer',
        popupInfo: {
          popupElements: [{ type: 'fields' }, { type: 'attachments' }],
          showAttachments: true,
          fieldInfos,
          title: `${layer.name}: {USERNAME}`,
        },
      });
    });
    console.log('operationalLayers: ', operationalLayers);

    const webProps =
      type === 'Web Map'
        ? layerProps.defaultWebMapProps
        : layerProps.defaultWebSceneProps;

    // run the webserivce call to update ArcGIS Online
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      title: title,
      type,
      text: {
        ...webProps,
        operationalLayers,
        initialState: {
          ...webProps.initialState,
          viewpoint: {
            targetGeometry: {
              spatialReference: {
                latestWkid: 3857,
                wkid: 102100,
              },
              xmin: extent.xmin,
              ymin: extent.ymin,
              xmax: extent.xmax,
              ymax: extent.ymax,
            },
          },
          camera:
            type === 'Web Scene'
              ? {
                  fov: 55,
                  heading: 0,
                  tilt: 0.22039218612040226,
                }
              : undefined,
        },
      },
    };
    appendEnvironmentObjectParam(data);

    // const serviceUrl: string = service.portalService.url;
    const url = existingWebMapScene
      ? `${existingWebMapScene.userItemUrl}/update`
      : `${portal.user.userContentUrl}/addItem`;

    retryCall(() => fetchPost(url, data))
      .then((res) => resolve(res))
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Publishes a single feature service
 *
 * @param portal The portal object to apply edits to
 * @param map Esri Map - Used for sorting the reference layers
 * @param featureService Object detailing information about the feature service to be published.
 * @param layerProps The layer properties to be used for publishing
 * @returns A promise that resolves to the successfully published data
 */
async function publishFeatureService({
  portal,
  map,
  featureService,
  layerProps,
}: {
  portal: __esri.Portal;
  map: __esri.Map;
  featureService: any;
  layerProps: LayerProps;
}) {
  const service = await getFeatureService(portal, featureService);

  const itemName: string = service.portalService.name;
  const itemServiceUrl: string = service.portalService.itemPageUrl;
  const serviceUrl: string = service.portalService.url;
  const portalId: string = service.portalService.id;
  const idMapping: any = {};

  // create the layers
  const layersResponse: any = await createFeatureLayers(
    portal,
    serviceUrl,
    featureService,
    service,
  );
  console.log('layersResponse: ', layersResponse);

  // update the layer ids in edits
  layersResponse.layers?.forEach((layer: any) => {
    const isPoints = layer.name.endsWith('-points');

    const layerEdits = featureService.layers.find((layerEdit) => {
      const leName = layerEdit.layerDefinitionProps.name;
      return (
        ((!isPoints && layerEdit.id === -1) || isPoints) &&
        (leName === layer.name || `${leName}-points` === layer.name)
      );
    });

    // update the various ids (id, pointsId, portalId)
    if (layerEdits) {
      if (
        !Object.prototype.hasOwnProperty.call(idMapping, layerEdits.layerId)
      ) {
        idMapping[layerEdits.layerId] = { portalId };
      }
      if (isPoints) idMapping[layerEdits.layerId].pointsId = layer.id;
      else idMapping[layerEdits.layerId].id = layer.id;
    }
  });

  const updateRes = await updateFeatureLayers({
    portal,
    serviceUrl,
    featureService,
    layersResponse,
    service,
  });
  console.log('updateRes: ', updateRes);

  // publish the edits
  const editsRes = await applyEdits({
    portal,
    service,
    serviceUrl,
    featureService,
    layersResponse,
  });

  if (featureService.referenceMaterials?.createWebMap) {
    const webMapRes = await getWebMapSceneWrapped(
      portal,
      featureService,
      'Web Map',
    );

    await addWebMapScene({
      type: 'Web Map',
      portal,
      service,
      featureService,
      layersResponse,
      referenceMaterials:
        featureService.referenceMaterials.webMapReferenceLayerSelections,
      map,
      layerProps,
      existingWebMapScene: webMapRes,
    });
  }

  if (featureService.referenceMaterials?.createWebScene) {
    const webSceneRes = await getWebMapSceneWrapped(
      portal,
      featureService,
      'Web Scene',
    );

    await addWebMapScene({
      type: 'Web Scene',
      portal,
      service,
      featureService,
      layersResponse,
      referenceMaterials:
        featureService.referenceMaterials.webSceneReferenceLayerSelections,
      map,
      layerProps,
      existingWebMapScene: webSceneRes,
    });
  }

  const output = {
    portalId,
    idMapping,
    edits: editsRes.response,
    itemData: {
      name: itemName,
      itemServiceUrl,
      serviceUrl,
    },
  };
  featureService?.onPublishComplete?.(output);

  return output;
}

/**
 * Publishes a layer or layers to ArcGIS online.
 *
 * @param portal The portal object to apply edits to
 * @param map Esri Map - Used for sorting the reference layers
 * @param featureService Object detailing information about the feature service to be published.
 * @param layerProps The layer properties to be used for publishing
 * @returns A promise that resolves to the successfully published data
 */
export async function publish({
  portal,
  map,
  featureServices,
  layerProps,
}: {
  portal: __esri.Portal;
  map: __esri.Map;
  featureServices: any[];
  layerProps: LayerProps;
}) {
  if (featureServices.length === 0) return 'Nothing to publish.';

  try {
    const requests: Promise<any>[] = [];

    // sort services to ensur synchronous services are published first
    featureServices.sort((a, b) => (a === b ? 0 : a ? -1 : 1));

    const layerPortalIdMapping: {
      [key: string]: {
        layerId: string;
        portalId: string;
        label: string;
        layerType: string;
        type: string;
        url: string;
      };
    } = {};
    for (const featureService of featureServices) {
      // add synchronous services to the reference layers
      if (
        !featureService.synchronous &&
        Object.keys(layerPortalIdMapping).length > 0
      ) {
        const referenceTable = featureService.tables.find((tbl) =>
          tbl.tableDefinitionProps.name.endsWith('-reference-layers'),
        );

        Object.values(layerPortalIdMapping).forEach((value) => {
          const hasRow =
            referenceTable.data.findIndex(
              (row) => row.LAYERID === value.portalId,
            ) > -1;
          if (hasRow) return;

          const currDate = getCurrentDateTime();
          if (referenceTable) {
            referenceTable.data.push({
              GLOBALID: generateUUID(),
              TOTSLAYERID: value.layerId,
              LAYERID: value.portalId,
              LABEL: value.label,
              LAYERTYPE: value.layerType,
              TYPE: value.type,
              URL: value.url,
              ONWEBMAP: 1,
              ONWEBSCENE: 1,
              CREATEDDATE: currDate,
              UPDATEDDATE: currDate,
            });
          }

          const refSelection = {
            id: value.portalId,
            totsLayerId: value.layerId,
            label: value.label,
            layerType: 'Feature Service',
            onWebMap: 1,
            onWebScene: 1,
            type: value.type,
            value: value.url,
          };
          if (featureService.referenceMaterials) {
            featureService.referenceMaterials.webMapReferenceLayerSelections.push(
              refSelection,
            );
            featureService.referenceMaterials.webSceneReferenceLayerSelections.push(
              refSelection,
            );
          }
        });
      }

      const request = publishFeatureService({
        portal,
        map,
        featureService,
        layerProps,
      });
      requests.push(request);

      // wait for synchronous services to finish prior to continuing
      if (featureService.synchronous && featureService.layerId) {
        const output = await request;
        layerPortalIdMapping[featureService.layerId] = {
          layerId: featureService.layerId,
          portalId: output.portalId,
          label: featureService.label,
          layerType: 'Feature Service',
          type: 'tots',
          url: output.itemData.serviceUrl,
        };
      }
    }

    return await Promise.all(requests);
  } catch (err) {
    window.logErrorToGa(err);
    throw err;
  }
}
