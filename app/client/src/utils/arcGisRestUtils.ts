// types
import {
  CalculateSettingsType,
  FeatureEditsType,
  LayerEditsType,
  ReferenceLayersTableType,
  ReferenceLayerTableType,
  ServiceMetaDataType,
  TableType,
} from 'types/Edits';
import { LayerType } from 'types/Layer';
import { LookupFile } from 'types/Misc';
import { AttributesType, ReferenceLayerSelections } from 'types/Publish';
// utils
import { fetchPost, fetchCheck } from 'utils/fetchUtils';
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
function getEnvironmentStringParam() {
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
function appendEnvironmentObjectParam(params: any) {
  const environmentStr = getEnvironmentString();
  if (environmentStr) params[environmentStr] = 1;
}

/**
 * Checks if the feature service name is available.
 *
 * @param portal The portal object to check against.
 * @param serviceName The desired feature service name.
 */
function isServiceNameAvailable(portal: __esri.Portal, serviceName: string) {
  return new Promise((resolve, reject) => {
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

    fetchPost(
      `${portal.restUrl}/portals/${portal.id}/isServiceNameAvailable`,
      params,
    )
      .then((res) => {
        resolve(res);
      })
      .catch((err) => {
        console.error(err);
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Attempts to get the hosted feature service and creates it if
 * it doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @param isTable Determines what category to add.
 * @returns A promise that resolves to the hosted feature service object
 */
async function getFeatureService(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
  isTable: boolean = false,
) {
  try {
    // check if the tots feature service already exists
    let service = await getFeatureServiceWrapped(portal, serviceMetaData);
    if (!service) {
      service = await createFeatureService(portal, serviceMetaData, isTable);
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

function getFeatureServiceRetry(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
) {
  return new Promise((resolve, reject) => {
    // Function that fetches the lookup file.
    // This will retry the fetch 3 times if the fetch fails with a
    // 1 second delay between each retry.
    const fetchLookup = (retryCount: number = 0) => {
      // check if the tots feature service already exists
      getFeatureServiceWrapped(portal, serviceMetaData)
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
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @returns A promise that resolves to the hosted feature service object or
 *  null if the service does not exist
 */
function getFeatureServiceWrapped(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
): Promise<any> {
  return new Promise((resolve, reject) => {
    let query = `orgid:${escapeForLucene(portal.user.orgId)}`;
    query += serviceMetaData.value
      ? ` AND id:${serviceMetaData.value}`
      : ` AND name:${serviceMetaData.label}`;
    portal
      .queryItems({
        query,
      })
      .then((res) => {
        const exactMatch = res.results.find(
          (layer: any) => layer.name === serviceMetaData.label,
        );

        if (exactMatch) {
          const portalService = exactMatch;

          // Workaround for esri.Portal not having credential
          const tempPortal: any = portal;
          fetchCheck(
            `${portalService.url}?f=json${getEnvironmentStringParam()}&token=${
              tempPortal.credential.token
            }`,
          )
            .then((res) => {
              const returnValue = {
                portalService,
                featureService: res,
              };
              resolve(returnValue);
            })
            .catch((err) => {
              window.logErrorToGa(err);
              reject(err);
            });
        } else {
          resolve(null);
        }
      })
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Gets the web map or web scene and returns null if it it
 * doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @param type Web Map or Web Scene depending on what needs to be retrieved
 * @returns A promise that resolves to the web map/scene object or
 *  null if the service does not exist
 */
async function getWebMapSceneWrapped(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
  type: 'Web Map' | 'Web Scene',
) {
  try {
    let query = `orgid:"${escapeForLucene(portal.user.orgId)}"`;
    query += `AND title:"${serviceMetaData.label}" AND type: "${type}"`;
    const res = await portal.queryItems({ query });

    const exactMatch = res.results.find(
      (layer: any) => layer.title === serviceMetaData.label,
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
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @param isTable Determines what category to add.
 * @returns A promise that resolves to the hosted feature service object
 */
function createFeatureService(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
  isTable: boolean = false,
) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // feature service creation parameters
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      outputType: 'featureService',
      description: serviceMetaData.description,
      snippet: serviceMetaData.description,
      createParameters: {
        name: serviceMetaData.label,
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
    fetchPost(`${portal.user.userContentUrl}/createService`, data)
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
          categories: isTable
            ? 'contains-epa-tots-user-defined-sample-types'
            : 'contains-epa-tots-sample-layer',
        };
        appendEnvironmentObjectParam(indata);

        fetchPost(
          `${portal.user.userContentUrl}/items/${res.itemId}/update`,
          indata,
        ).then((res) => {
          // get the feature service from the portal and return it
          getFeatureServiceRetry(portal, serviceMetaData)
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
function getFeatureLayers(serviceUrl: string, token: string) {
  return new Promise((resolve, reject) => {
    fetchCheck(
      `${serviceUrl}?f=json&${getEnvironmentStringParam()}&token=${token}`,
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
function getFeatureTables(serviceUrl: string, token: string) {
  return new Promise((resolve, reject) => {
    fetchCheck(
      `${serviceUrl}?f=json&${getEnvironmentStringParam()}&token=${token}`,
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
function getFeatureLayer(serviceUrl: string, token: string, id: number) {
  return new Promise((resolve, reject) => {
    fetchCheck(
      `${serviceUrl}/${id}?f=json&${getEnvironmentStringParam()}=1&token=${token}`,
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
function buildRendererParams(layer: LayerType, layerProps: any | null) {
  // get the current extent, so we can go back
  let graphicsExtent: __esri.Extent | null = null;

  const uniqueValueInfosPolygons: any[] = [];
  const typesAdded: string[] = [];
  const uniqueValueInfosPoints: any[] = [];
  const templatesPolygons: any[] = [];
  const templatesPoints: any[] = [];
  const sampleTypes: any = {};

  // get the extent from the array of graphics
  if (layer.sketchLayer.type === 'graphics') {
    layer.sketchLayer.graphics.forEach((graphic) => {
      graphicsExtent === null
        ? (graphicsExtent = graphic.geometry.extent)
        : graphicsExtent.union(graphic.geometry.extent);

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
              const foundField = layerProps.data.defaultFields.find(
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
  if (layer.sketchLayer.type === 'feature') {
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
 * @param layerMetaData Array of service metadata to be added to the layers of a feature service.
 * @returns A promise that resolves to the layers that were saved
 */
function createFeatureLayers(
  portal: __esri.Portal,
  serviceUrl: string,
  layers: LayerType[],
  serviceMetaData: ServiceMetaDataType,
  attributesToInclude: AttributesType[] | null,
  layerProps: LookupFile,
  referenceMaterials: {
    createWebMap: boolean;
    createWebScene: boolean;
    webMapReferenceLayerSelections: ReferenceLayerSelections[];
    webSceneReferenceLayerSelections: ReferenceLayerSelections[];
  },
  service: any,
) {
  return new Promise((resolve, reject) => {
    const layersParams: any[] = [];
    if (layers.length === 0) {
      resolve({
        success: true,
        layers: [],
        tables: [],
      });
      return;
    }

    const layerIds: string[] = [];
    layers.forEach((layer) => {
      const {
        graphicsExtent,
        templatesPoints,
        templatesPolygons,
        uniqueValueInfosPolygons,
        uniqueValueInfosPoints,
      } = buildRendererParams(layer, null);

      // add a custom type for determining which layers in a feature service
      // are the sample layers. All feature services made through TOTS should only
      // have one layer, but it is possible for user
      if (layer.layerType === 'Samples') {
        templatesPolygons.push({
          id: 'epa-tots-sample-layer',
          name: 'epa-tots-sample-layer',
        });
      }
      if (layer.layerType === 'VSP') {
        templatesPolygons.push({
          id: 'epa-tots-vsp-layer',
          name: 'epa-tots-vsp-layer',
        });
      }

      let fields = layerProps.data.defaultFields;
      if (attributesToInclude) {
        fields = layerProps.data.defaultFields.filter(
          (x: any) =>
            attributesToInclude.findIndex((y) => y.name === x.name) > -1 ||
            x.name === 'GLOBALID' ||
            x.name === 'OBJECTID',
        );
      }

      attributesToInclude?.forEach((attribute) => {
        const fieldIndex = fields.findIndex(
          (x: any) => x.name === attribute.name,
        );

        if (fieldIndex > -1) return;

        fields.push(buildFieldFromCustomAttribute(attribute));
      });

      // add the polygon representation
      const polyLayerFromService = service.featureService.layers.find(
        (l: any) => l.id === layer.id && l.name === layer.label,
      );
      if (!polyLayerFromService) {
        layerIds.push(layer.sketchLayer.id);
        layersParams.push({
          ...layerProps.data.defaultLayerProps,
          fields,
          name: serviceMetaData.label,
          description: serviceMetaData.description,
          extent: graphicsExtent,
          drawingInfo: {
            renderer: {
              type: 'uniqueValue',
              field1: 'TYPEUUID',
              uniqueValueInfos: uniqueValueInfosPolygons,
            },
          },
          types: templatesPolygons,
        });
      }

      // add a custom type for determining which layers in a feature service
      // are the sample layers. All feature services made through TOTS should only
      // have one layer, but it is possible for user
      if (layer.layerType === 'Samples') {
        templatesPoints.push({
          id: 'epa-tots-sample-points-layer',
          name: 'epa-tots-sample-points-layer',
        });
      }
      if (layer.layerType === 'VSP') {
        templatesPoints.push({
          id: 'epa-tots-vsp-points-layer',
          name: 'epa-tots-vsp-points-layer',
        });
      }

      // add the point representation
      const pointLayerFromService = service.featureService.layers.find(
        (l: any) =>
          l.id === layer.pointsId && l.name === layer.pointsLayer?.title,
      );
      if (!pointLayerFromService) {
        layerIds.push(layer.pointsLayer?.id || '');
        layersParams.push({
          ...layerProps.data.defaultLayerProps,
          fields,
          geometryType: 'esriGeometryPoint',
          name: serviceMetaData.label + '-points',
          description: serviceMetaData.description,
          extent: graphicsExtent,
          drawingInfo: {
            renderer: {
              type: 'uniqueValue',
              field1: 'TYPEUUID',
              uniqueValueInfos: uniqueValueInfosPoints,
            },
          },
          types: templatesPoints,
        });
      }
    });

    const refIdsAdded: string[] = [];
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

    referenceMaterials.webMapReferenceLayerSelections.forEach(
      processReferencLayerSelections,
    );
    referenceMaterials.webSceneReferenceLayerSelections.forEach(
      processReferencLayerSelections,
    );

    const tablesOut: any[] = [];

    // add the sample-types table if it hasn't already been added
    const sampleTypeTableName = `${serviceMetaData.label}-sample-types`;
    const hasSampleTable =
      service.featureService.tables.findIndex(
        (t: any) => t.name === sampleTypeTableName,
      ) > -1;
    if (!hasSampleTable) {
      tablesOut.push({
        ...layerProps.data.defaultTableProps,
        fields: layerProps.data.defaultFields,
        type: 'Table',
        name: sampleTypeTableName,
        description: `Custom sample type definitions for "${serviceMetaData.label}".`,
      });
    }

    // add the reference-layers table if it hasn't already been added
    const refLayerTableName = `${serviceMetaData.label}-reference-layers`;
    const hasRefLayerTable =
      service.featureService.tables.findIndex(
        (t: any) => t.name === refLayerTableName,
      ) > -1;
    if (!hasRefLayerTable) {
      tablesOut.push({
        ...layerProps.data.defaultTableProps,
        fields: layerProps.data.defaultReferenceTableFields,
        type: 'Table',
        name: refLayerTableName,
        description: `Links to reference layers for "${serviceMetaData.label}".`,
      });
    }

    // add the calculate-settings table if it hasn't already been added
    const calculateResultsTableName = `${serviceMetaData.label}-calculate-settings`;
    const hasCalculateResultsTable =
      service.featureService.tables.findIndex(
        (t: any) => t.name === calculateResultsTableName,
      ) > -1;
    if (!hasCalculateResultsTable) {
      tablesOut.push({
        ...layerProps.data.defaultTableProps,
        fields: layerProps.data.defaultCalculateResultsTableFields,
        type: 'Table',
        name: calculateResultsTableName,
        description: `Calculate settings for "${serviceMetaData.label}".`,
      });
    }

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
    fetchPost(`${adminServiceUrl}/addToDefinition`, data)
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
 * Used for adding a table to a hosted feature service on
 * ArcGIS Online
 *
 * @param portal The portal object to create feature layers on
 * @param serviceUrl The hosted feature service to save layers to
 * @param serviceMetaData Array of service metadata to be added to the layers of a feature service.
 * @returns A promise that resolves to the layers that were saved
 */
function createFeatureTables(
  portal: __esri.Portal,
  serviceUrl: string,
  serviceMetaData: ServiceMetaDataType,
  layerProps: LookupFile,
) {
  return new Promise((resolve, reject) => {
    const tableParams: any[] = [];

    tableParams.push({
      ...layerProps.data.defaultTableProps,
      fields: [
        ...layerProps.data.defaultFields,
        ...layerProps.data.additionalTableFields,
      ],
      type: 'Table',
      name: serviceMetaData.label,
      description: serviceMetaData.description,
    });

    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      addToDefinition: {
        tables: tableParams,
      },
    };
    appendEnvironmentObjectParam(data);

    // inject /admin into rest/services to be able to call
    const adminServiceUrl = serviceUrl.replace(
      'rest/services',
      'rest/admin/services',
    );
    fetchPost(`${adminServiceUrl}/addToDefinition`, data)
      .then((res) => resolve(res))
      .catch((err) => reject(err));
  });
}

/**
 * Builds a field to be sent to AGO from the TOTS definition of
 * custom attributes.
 *
 * @param attribute The attribute to be converted
 * @returns A field that can be sent to AGO
 */
function buildFieldFromCustomAttribute(attribute: AttributesType) {
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

    if (!hasField) newFields.push(buildFieldFromCustomAttribute(attribute));
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
 * @param layers The layers to be updated
 * @param layersResponse The response from creating layers
 * @param service The feature service object
 * @param attributesToInclude The attributes to include with each graphic
 * @returns A promise that resolves to the layers that were updated
 */
async function updateFeatureLayers({
  portal,
  serviceUrl,
  layers,
  layersResponse,
  service,
  attributesToInclude,
}: {
  portal: __esri.Portal;
  serviceUrl: string;
  layers: LayerType[];
  layersResponse: any;
  service: any;
  attributesToInclude?: AttributesType[] | null;
}) {
  try {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    let polygonsLayerCreated = false;
    let pointsLayerCreated = false;
    layersResponse?.layers?.forEach((layer: any) => {
      if (layer.id === 0) polygonsLayerCreated = true;
      if (layer.id === 1) pointsLayerCreated = true;
    });

    if (layers?.length === 0) {
      return {
        success: true,
        layers: [],
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
    layers.forEach((layer, index: number) => {
      const {
        graphicsExtent,
        uniqueValueInfosPolygons,
        uniqueValueInfosPoints,
      } = buildRendererParams(layer, null);

      // update the polygon representation
      if (!polygonsLayerCreated) {
        const fieldsToDelete = getFieldsToDelete(
          0,
          service,
          attributesToInclude,
        );

        if (fieldsToDelete.length > 0) {
          // delete any fields that have been marked for removal
          deleteParams.push({
            url: `${adminServiceUrl}/0/deleteFromDefinition`,
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
        const fieldsToAdd = getNewFields(0, service, attributesToInclude);
        if (fieldsToAdd.length > 0) {
          addParams.push({
            url: `${adminServiceUrl}/0/addToDefinition`,
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
          url: `${adminServiceUrl}/0/updateDefinition`,
          params: {
            f: 'json',
            token: tempPortal.credential.token,
            updateDefinition: {
              extent: graphicsExtent,
              drawingInfo: {
                renderer: {
                  type: 'uniqueValue',
                  field1: 'TYPEUUID',
                  uniqueValueInfos: uniqueValueInfosPolygons,
                },
              },
            },
          },
        });
      }

      // update the point representation
      if (!pointsLayerCreated) {
        const fieldsToDelete = getFieldsToDelete(
          1,
          service,
          attributesToInclude,
        );

        if (fieldsToDelete.length > 0) {
          // delete any fields that have been marked for removal
          deleteParams.push({
            url: `${adminServiceUrl}/1/deleteFromDefinition`,
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
        const fieldsToAdd = getNewFields(1, service, attributesToInclude);
        if (fieldsToAdd.length > 0) {
          addParams.push({
            url: `${adminServiceUrl}/1/addToDefinition`,
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
          url: `${adminServiceUrl}/1/updateDefinition`,
          params: {
            f: 'json',
            token: tempPortal.credential.token,
            updateDefinition: {
              extent: graphicsExtent,
              drawingInfo: {
                renderer: {
                  type: 'uniqueValue',
                  field1: 'TYPEUUID',
                  uniqueValueInfos: uniqueValueInfosPoints,
                },
              },
            },
          },
        });
      }
    });

    // Fire off requests in order of deletes, adds, and updates.
    // The order is important. If we fired the requests off immediatly
    // we end up with data errors in AGO.

    // fire off delete requests
    const deleteRequests: any[] = [];
    deleteParams.forEach((requestParam) => {
      deleteRequests.push(fetchPost(requestParam.url, requestParam.params));
    });
    const deleteResponses = await Promise.all(deleteRequests);

    // fire off add requests
    const addRequests: any[] = [];
    addParams.forEach((requestParam) => {
      addRequests.push(fetchPost(requestParam.url, requestParam.params));
    });
    const addResponses = await Promise.all(addRequests);

    // fire off update requests
    const updateRequests: any[] = [];
    updateParams.forEach((requestParam) => {
      updateRequests.push(fetchPost(requestParam.url, requestParam.params));
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
function deleteFeatureLayer(
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
    fetchPost(`${adminServiceUrl}/deleteFromDefinition`, data)
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
 * @returns A promise that resolves to all of the features on the hosted
 *  feature service
 */
function getAllFeatures(
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

    fetchPost(`${serviceUrl}/query`, query)
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

          const request = fetchPost(`${serviceUrl}/query`, data);
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
 * @param forDeletes True means this is for the deletes change type which is just the global id
 * @returns
 */
function addPointFeatures(
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
  if (layer?.sketchLayer.type === 'graphics') {
    const graphic = layer.sketchLayer.graphics.find(
      (graphic) =>
        graphic.attributes.PERMANENT_IDENTIFIER ===
        item.attributes.PERMANENT_IDENTIFIER,
    );

    attributes['GLOBALID'] = graphic.attributes['GLOBALID'];
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
  layer = service.featureService.layers.find((l: any) => l.name === name);
  if (layer) return layer.id;

  // check in service.tables
  layer = service.featureService.tables.find((l: any) => l.name === name);
  if (layer) return layer.id;

  // check in layersResponse.layers
  layer = layersResponse.layers.find((l: any) => l.name === name);
  if (layer) return layer.id;

  // check in layersResponse.tables
  layer = layersResponse.tables.find((l: any) => l.name === name);
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
 * @param layerProps Default/shared properties used for creating feature services, layers, web maps, and web scenes.
 * @param layers The layers that the edits object pertain to
 * @param edits The edits to be saved to the hosted feature service
 * @param serviceMetaData The name and description of the service to be saved
 * @param table any - The table object
 * @param attributesToInclude The attributes to include with each graphic
 * @param referenceLayersTable Reference layers that were previously published
 * @param referenceMaterials Reference layers to store in reference layers table
 * @param calculateSettings Calculate settings to be stored
 * @returns A promise that resolves to the successfully saved objects
 */
async function applyEdits({
  portal,
  service,
  serviceUrl,
  layerProps,
  layers,
  layersResponse,
  edits,
  serviceMetaData,
  table,
  attributesToInclude,
  referenceLayersTable,
  referenceMaterials,
  calculateSettings,
}: {
  portal: __esri.Portal;
  service: any;
  serviceUrl: string;
  layerProps: any | null;
  layers: LayerType[];
  layersResponse: any;
  edits: LayerEditsType[];
  serviceMetaData: ServiceMetaDataType;
  table: TableType | null;
  attributesToInclude: AttributesType[] | null;
  referenceLayersTable: ReferenceLayersTableType;
  referenceMaterials: {
    createWebMap: boolean;
    createWebScene: boolean;
    webMapReferenceLayerSelections: ReferenceLayerSelections[];
    webSceneReferenceLayerSelections: ReferenceLayerSelections[];
  };
  calculateSettings: CalculateSettingsType;
}) {
  try {
    const changes: any[] = [];
    const scenarioName = serviceMetaData.label;

    // loop through the layers and build the payload
    edits.forEach((layerEdits) => {
      // build the deletes list, which is just an array of global ids.
      const deletes: string[] = [];
      layerEdits.deletes.forEach((item) => {
        deletes.push(item.GLOBALID);
      });

      if (
        layerEdits.adds.length > 0 ||
        layerEdits.updates.length > 0 ||
        deletes.length > 0
      ) {
        changes.push({
          id: findLayerId({ service, layersResponse, name: scenarioName }),
          adds: layerEdits.adds,
          updates: layerEdits.updates,
          deletes,
        });
      }

      // find the points version of the layer
      const mapLayer = layers.find(
        (mapLayer) => mapLayer.layerId === layerEdits?.layerId,
      );
      if (!mapLayer?.pointsLayer) return;

      // Loop through the above changes and build a points version
      const pointsAdds: FeatureEditsType[] = [];
      const pointsUpdates: FeatureEditsType[] = [];
      const pointsDeletes: FeatureEditsType[] = [];
      layerEdits.adds.forEach((item) => {
        addPointFeatures(mapLayer, pointsAdds, item, attributesToInclude);
      });
      layerEdits.updates.forEach((item) => {
        addPointFeatures(
          mapLayer,
          layerEdits.pointsId === -1 ? pointsAdds : pointsUpdates,
          item,
          attributesToInclude,
        );
      });
      if (layerEdits.pointsId !== -1) {
        layerEdits.deletes.forEach((item) => {
          addPointFeatures(
            mapLayer,
            pointsDeletes,
            {
              attributes: item,
              geometry: {},
            },
            attributesToInclude,
          );
        });
      }

      // Push the points version into the changes array
      if (
        pointsAdds.length > 0 ||
        pointsUpdates.length > 0 ||
        pointsDeletes.length > 0
      ) {
        changes.push({
          id: findLayerId({
            service,
            layersResponse,
            name: `${scenarioName}-points`,
          }),
          adds: pointsAdds,
          updates: pointsUpdates,
          deletes: pointsDeletes,
        });
      }
    });

    const refIdsAdded: string[] = [];
    referenceMaterials.webMapReferenceLayerSelections.forEach((l) => {
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
    });
    referenceMaterials.webSceneReferenceLayerSelections.forEach((l) => {
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
    });

    let tableOut: TableType | null = null;
    const output = buildTableEdits({
      layers,
      table,
      id: findLayerId({
        service,
        layersResponse,
        name: `${scenarioName}-sample-types`,
      }),
      layerProps,
    });
    changes.push(output.edits);
    tableOut = output.table;

    let refLayerTableOut: ReferenceLayersTableType | null = null;
    const refOutput = await buildReferenceLayerTableEdits({
      id: findLayerId({
        service,
        layersResponse,
        name: `${scenarioName}-reference-layers`,
      }),
      referenceLayersTable,
      referenceMaterials,
    });
    changes.push(refOutput.edits);
    refLayerTableOut = refOutput.table;

    let calculateSettingsTableOut: any | null = null;
    const calculateSettingsOutput = await buildCalculateResultsTableEdits({
      id: findLayerId({
        service,
        layersResponse,
        name: `${scenarioName}-calculate-settings`,
      }),
      calculateSettings,
    });
    changes.push(calculateSettingsOutput.edits);
    calculateSettingsTableOut = calculateSettingsOutput.edits;

    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // run the webserivce call to update ArcGIS Online
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      edits: changes,
      honorSequenceOfEdits: true,
      useGlobalIds: true,
    };
    appendEnvironmentObjectParam(data);

    const res = await fetchPost(`${serviceUrl}/applyEdits`, data);

    return {
      response: res,
      table: tableOut,
      refLayerTableOut,
      calculateSettingsTableOut,
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
 * @param layers LayerType[] - The layers to search for sample types in
 * @param table any - The table object
 * @param id Id of the layer
 * @param layerProps Default/shared properties used for creating feature services, layers, web maps, and web scenes.
 * @returns An object containing the edits arrays
 */
function buildTableEdits({
  layers,
  table,
  id,
  layerProps,
}: {
  layers: LayerType[];
  table: TableType | null;
  id: number;
  layerProps: any | null;
}) {
  const adds: any[] = [];
  const updates: any[] = [];
  const deletes: any[] = [];
  let sampleTypesOut: any = {};

  layers.forEach((layer) => {
    const { sampleTypes } = buildRendererParams(layer, layerProps);

    // build the deletes array
    if (table?.sampleTypes) {
      Object.keys(table.sampleTypes).forEach((key) => {
        if (
          !sampleTypes.hasOwnProperty(key) &&
          table.sampleTypes[key]?.OBJECTID
        ) {
          deletes.push(table.sampleTypes[key].OBJECTID);
        }
      });
    }

    // build the adds and updates arrays
    Object.keys(sampleTypes).forEach((key) => {
      if (table?.sampleTypes?.hasOwnProperty(key)) {
        updates.push(sampleTypes[key]);
        sampleTypesOut[key] = sampleTypes[key];
      } else {
        adds.push(sampleTypes[key]);
        sampleTypesOut[key] = sampleTypes[key];
      }
    });
  });

  return {
    table: {
      id,
      sampleTypes: sampleTypesOut,
    },
    edits: {
      id,
      adds,
      updates,
      deletes,
    },
  };
}

/**
 * Builds the edits arrays for publishing the sample types layer of
 * the sampling plan feature service.
 *
 * @param id Id of the layer
 * @param referenceLayersTable Reference layers that were previously published
 * @param referenceMaterials Reference layers to store in reference layers table
 * @returns An object containing the edits arrays
 */
async function buildReferenceLayerTableEdits({
  id,
  referenceLayersTable,
  referenceMaterials,
}: {
  id: number;
  referenceLayersTable: ReferenceLayersTableType;
  referenceMaterials: {
    createWebMap: boolean;
    createWebScene: boolean;
    webMapReferenceLayerSelections: ReferenceLayerSelections[];
    webSceneReferenceLayerSelections: ReferenceLayerSelections[];
  };
}) {
  const adds: any[] = [];
  const updates: any[] = [];
  const deletes: any[] = [];
  let referenceLayersOut: ReferenceLayerTableType[] = [];
  const timestamp = getCurrentDateTime();

  // build a unique list of reference materials across web map and web scene
  const uniqueReferenceLayerSelections: ReferenceLayerSelections[] = [];
  const refIdsAdded: string[] = [];

  // delete any layers that are already duplicated
  const layersAlreadyPublishedToKeep: string[] = [];
  referenceLayersTable?.referenceLayers.forEach((l) => {
    if (layersAlreadyPublishedToKeep.includes(l.layerId)) {
      deletes.push(l.globalId);
      return;
    }
    layersAlreadyPublishedToKeep.push(l.layerId);
  });

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

  // get reference layers that were already published
  const layersAlreadyPublished: string[] = [];
  referenceLayersTable?.referenceLayers.forEach((l) => {
    layersAlreadyPublished.push(l.layerId);

    // add to deletes array if layer isn't in output list
    const newLayer = uniqueReferenceLayerSelections.find(
      (j) => j.id === l.layerId,
    );
    if (!newLayer && l.globalId) deletes.push(l.globalId);
  });

  // build the adds, updates, and deletes
  uniqueReferenceLayerSelections.forEach((refLayer) => {
    // build the adds and updates arrays
    if (layersAlreadyPublished.includes(refLayer.id)) {
      updates.push(refLayer);
    } else {
      adds.push({
        attributes: {
          GLOBALID: generateUUID(),
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
        },
      });
    }
  });

  return {
    table: {
      id,
      referenceLayers: referenceLayersOut,
    },
    edits: {
      id,
      adds,
      updates,
      deletes,
    },
  };
}

/**
 * Builds the edits arrays for publishing the calculate settings table of
 * the sampling plan feature service.
 *
 * @param id Id of the layer
 * @param calculateSettings Calculate Settings both current and already published
 * @returns An object containing the edits arrays
 */
async function buildCalculateResultsTableEdits({
  id,
  calculateSettings,
}: {
  id: number;
  calculateSettings: CalculateSettingsType;
}) {
  const adds: any[] = [];
  const updates: any[] = [];
  const timestamp = getCurrentDateTime();

  if (!calculateSettings.published) {
    adds.push({
      attributes: {
        ...calculateSettings.current,
        GLOBALID: generateUUID(),
        CREATEDDATE: timestamp,
        UPDATEDDATE: timestamp,
      },
    });
  } else {
    updates.push({
      attributes: {
        ...calculateSettings.published,
        ...calculateSettings.current,
        UPDATEDDATE: timestamp,
      },
    });
  }

  return {
    edits: {
      id,
      adds,
      updates,
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
 * @param layers The layers that the edits object pertain to
 * @param layersResponse The response from creating layers
 * @param attributesToInclude The attributes to include with each graphic
 * @param layerProps Default properties to apply to the layer
 * @param referenceMaterials Reference layers to apply to web map
 * @param map Esri Map - Used for sorting the reference layers
 * @returns A promise that resolves to the successfully saved web map
 */
function addWebMap({
  portal,
  service,
  layers,
  layersResponse,
  attributesToInclude,
  layerProps,
  referenceMaterials,
  map,
  existingWebMap,
}: {
  portal: __esri.Portal;
  service: any;
  layers: LayerType[];
  layersResponse: any;
  attributesToInclude: AttributesType[] | null;
  layerProps: LookupFile;
  referenceMaterials: ReferenceLayerSelections[];
  map: __esri.Map;
  existingWebMap: any | null;
}) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    const itemId = service.portalService.id;
    const baseUrl = service.portalService.url;
    const title = service.portalService.title;

    const fieldInfos: any[] = [];
    attributesToInclude?.forEach((attribute) => {
      if (layerProps.data.webMapFieldProps.hasOwnProperty(attribute.name)) {
        fieldInfos.push(
          (layerProps.data.webMapFieldProps as any)[attribute.name],
        );
      } else {
        let format: any = undefined;
        if (
          attribute.dataType === 'double' ||
          attribute.dataType === 'integer'
        ) {
          format = {
            digitSeparator: true,
            places: 0,
          };
        }

        fieldInfos.push({
          fieldName: attribute.name,
          label: attribute.label,
          isEditable: true,
          visible: true,
          format,
        });
      }
    });

    const operationalLayers: any[] = [];
    const mainLayer = layers[0];
    let extent: __esri.Extent = mainLayer.sketchLayer.fullExtent;
    const { graphicsExtent } = buildRendererParams(mainLayer, null);
    if (graphicsExtent) {
      extent = graphicsExtent;
    }

    buildReferenceLayers(map, operationalLayers, referenceMaterials);

    const responseChoice =
      service.featureService.layers.length > 0
        ? service.featureService.layers
        : layersResponse.layers;

    const layer0 = responseChoice[0];
    const layer1 = responseChoice[1];
    const layersOut: any[] = [];
    const choicesCombined = [
      ...service.featureService.layers,
      ...layersResponse.layers,
    ];
    choicesCombined.forEach((l: any, index: number) => {
      if (index === 0 || index === 1) return;
      layersOut.push(l);
    });
    layersOut.push(layer0);
    layersOut.push(layer1);

    layersOut.forEach((layer: any) => {
      operationalLayers.push({
        title: layer.name,
        url: `${baseUrl}/${layer.id}`,
        itemId,
        layerType: 'ArcGISFeatureLayer',
        popupInfo: {
          popupElements: [{ type: 'fields' }, { type: 'attachments' }],
          showAttachments: true,
          fieldInfos: fieldInfos,
          title: `${layer.name}: {USERNAME}`,
        },
      });
    });

    // run the webserivce call to update ArcGIS Online
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      title: title,
      type: 'Web Map',
      text: {
        version: '2.27',
        authoringApp: 'ArcGISMapViewer',
        authoringAppVersion: '2023.1',
        operationalLayers,
        baseMap: {
          baseMapLayers: [
            {
              id: 'VectorTile_9568',
              title: 'World Topographic Map',
              layerType: 'VectorTileLayer',
              styleUrl:
                'https://cdn.arcgis.com/sharing/rest/content/items/42df0d22517e49ad84edcee4c093857d/resources/styles/root.json',
            },
          ],
          title: 'Topographic',
        },
        initialState: {
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
        },
        spatialReference: {
          latestWkid: 3857,
          wkid: 102100,
        },
      },
    };
    appendEnvironmentObjectParam(data);

    // const serviceUrl: string = service.portalService.url;
    const url = existingWebMap
      ? `${existingWebMap.userItemUrl}/update`
      : `${portal.user.userContentUrl}/addItem`;

    fetchPost(url, data)
      .then((res) => resolve(res))
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Publishes a web scene version of the feature service.
 *
 * @param portal The portal object to apply edits to
 * @param service The feature service object
 * @param layers The layers that the edits object pertain to
 * @param layersResponse The response from creating layers
 * @param attributesToInclude The attributes to include with each graphic
 * @param layerProps Default properties to apply to the layer
 * @param referenceMaterials Reference layers to apply to web scene
 * @param map Esri Map - Used for sorting the reference layers
 * @returns A promise that resolves to the successfully saved web scene
 */
function addWebScene({
  portal,
  service,
  layers,
  layersResponse,
  attributesToInclude,
  layerProps,
  referenceMaterials,
  map,
  existingWebScene,
}: {
  portal: __esri.Portal;
  service: any;
  layers: LayerType[];
  layersResponse: any;
  attributesToInclude: AttributesType[] | null;
  layerProps: LookupFile;
  referenceMaterials: ReferenceLayerSelections[];
  map: __esri.Map;
  existingWebScene: any | null;
}) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    const itemId = service.portalService.id;
    const baseUrl = service.portalService.url;
    const title = service.portalService.title;

    const fieldInfos: any[] = [];
    attributesToInclude?.forEach((attribute) => {
      if (layerProps.data.webMapFieldProps.hasOwnProperty(attribute.name)) {
        fieldInfos.push(
          (layerProps.data.webMapFieldProps as any)[attribute.name],
        );
      } else {
        let format: any = undefined;
        if (
          attribute.dataType === 'double' ||
          attribute.dataType === 'integer'
        ) {
          format = {
            digitSeparator: true,
            places: 0,
          };
        }

        fieldInfos.push({
          fieldName: attribute.name,
          label: attribute.label,
          isEditable: true,
          visible: true,
          format,
        });
      }
    });

    const operationalLayers: any[] = [];
    const mainLayer = layers[0];
    let extent: __esri.Extent = mainLayer.sketchLayer.fullExtent;
    const { graphicsExtent } = buildRendererParams(mainLayer, null);
    if (graphicsExtent) {
      extent = graphicsExtent;
    }

    buildReferenceLayers(map, operationalLayers, referenceMaterials);

    const responseChoice =
      service.featureService.layers.length > 0
        ? service.featureService.layers
        : layersResponse.layers;

    const layer0 = responseChoice[0];
    const layer1 = responseChoice[1];
    const layersOut: any[] = [];
    const choicesCombined = [
      ...service.featureService.layers,
      ...layersResponse.layers,
    ];
    choicesCombined.forEach((l: any, index: number) => {
      if (index === 0 || index === 1) return;
      layersOut.push(l);
    });
    layersOut.push(layer0);
    layersOut.push(layer1);

    layersOut.forEach((layer: any) => {
      operationalLayers.push({
        title: layer.name,
        url: `${baseUrl}/${layer.id}`,
        itemId,
        layerType: 'ArcGISFeatureLayer',
        popupInfo: {
          popupElements: [{ type: 'fields' }, { type: 'attachments' }],
          showAttachments: true,
          fieldInfos: fieldInfos,
          title: `${layer.name}: {USERNAME}`,
        },
      });
    });

    // run the webserivce call to update ArcGIS Online
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      title: title,
      type: 'Web Scene',
      text: {
        version: '1.30',
        authoringApp: 'WebSceneViewer',
        authoringAppVersion: '2023.1.0',
        operationalLayers,
        baseMap: {
          baseMapLayers: [
            {
              id: '1866114cd76-layer-1',
              title: 'World Topo Map',
              url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer',
              layerType: 'ArcGISTiledMapServiceLayer',
            },
          ],
          id: '1866114cb4d-basemap-0',
          title: 'Topographic',
          elevationLayers: [
            {
              id: 'globalElevation',
              listMode: 'show',
              title: 'Terrain3D',
              url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer',
              layerType: 'ArcGISTiledElevationServiceLayer',
            },
          ],
        },
        ground: {
          layers: [
            {
              id: 'globalElevation',
              listMode: 'show',
              title: 'Terrain3D',
              url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer',
              layerType: 'ArcGISTiledElevationServiceLayer',
            },
          ],
          transparency: 0,
          navigationConstraint: {
            type: 'none',
          },
        },
        heightModelInfo: {
          heightModel: 'gravity_related_height',
          heightUnit: 'meter',
        },
        initialState: {
          environment: {
            lighting: {
              type: 'sun',
              datetime: 1678899363000,
              displayUTCOffset: -5,
            },
            atmosphereEnabled: true,
            starsEnabled: true,
            weather: {
              type: 'sunny',
              cloudCover: 0.5,
            },
          },
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
            camera: {
              fov: 55,
              heading: 0,
              tilt: 0.22039218612040226,
            },
          },
        },
        spatialReference: {
          latestWkid: 3857,
          wkid: 102100,
        },
      },
    };
    appendEnvironmentObjectParam(data);

    const url = existingWebScene
      ? `${existingWebScene.userItemUrl}/update`
      : `${portal.user.userContentUrl}/addItem`;

    fetchPost(url, data)
      .then((res) => resolve(res))
      .catch((err) => {
        window.logErrorToGa(err);
        reject(err);
      });
  });
}

/**
 * Applys edits to a layer or layers within a hosted feature service
 * on ArcGIS Online.
 *
 * @param portal The portal object to apply edits to
 * @param serviceUrl The url of the hosted feature service
 * @param layers The layers that the edits object pertain to
 * @param edits The edits to be saved to the hosted feature service
 * @returns A promise that resolves to the successfully saved objects
 */
function applyEditsTable({
  portal,
  serviceUrl,
  changes,
}: {
  portal: __esri.Portal;
  serviceUrl: string;
  changes: any;
}) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // run the webserivce call to update ArcGIS Online
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      adds: changes.adds,
      updates: changes.updates,
      deletes: changes.deletes.map((item: any) => {
        return item.attributes.OBJECTID;
      }),
      honorSequenceOfEdits: true,
    };
    appendEnvironmentObjectParam(data);

    fetchPost(`${serviceUrl}/${changes.id}/applyEdits`, data)
      .then((res) => resolve(res))
      .catch((err) => reject(err));
  });
}

/**
 * Publishes a layer or layers to ArcGIS online.
 *
 * @param portal The portal object to apply edits to
 * @param map Esri Map - Used for sorting the reference layers
 * @param layers The layers that the edits object pertain to
 * @param edits The edits to be saved to the hosted feature service
 * @param serviceMetaData The name and description of the service to be saved
 * @param layerProps Default/shared properties used for creating feature services, layers, web maps, and web scenes.
 * @param attributesToInclude Attributes to include in the final layers, web map, and web scene
 * @param table Table of custom sample types
 * @param referenceLayersTable Reference layers that were previously published
 * @param referenceMaterials Reference layers to apply to web map
 * @param calculateSettings Calculate settings to be stored
 * @returns A promise that resolves to the successfully published data
 */
function publish({
  portal,
  map,
  layers,
  edits,
  serviceMetaData,
  layerProps,
  attributesToInclude = null,
  table = null,
  referenceLayersTable,
  referenceMaterials,
  calculateSettings,
}: {
  portal: __esri.Portal;
  map: __esri.Map;
  layers: LayerType[];
  edits: LayerEditsType[];
  serviceMetaData: ServiceMetaDataType;
  layerProps: LookupFile;
  attributesToInclude?: AttributesType[] | null;
  table?: any;
  referenceLayersTable: ReferenceLayersTableType;
  referenceMaterials: {
    createWebMap: boolean;
    createWebScene: boolean;
    webMapReferenceLayerSelections: ReferenceLayerSelections[];
    webSceneReferenceLayerSelections: ReferenceLayerSelections[];
  };
  calculateSettings: CalculateSettingsType;
}) {
  return new Promise((resolve, reject) => {
    if (layers.length === 0) {
      reject('No layers to publish.');
      return;
    }

    getFeatureService(portal, serviceMetaData)
      .then((service: any) => {
        const serviceUrl: string = service.portalService.url;
        const portalId: string = service.portalService.id;
        const idMapping: any = {};
        // create the layers
        createFeatureLayers(
          portal,
          serviceUrl,
          layers,
          serviceMetaData,
          attributesToInclude,
          layerProps,
          referenceMaterials,
          service,
        )
          .then((layersResponse: any) => {
            let tableParam = table;
            // update the layer ids in edits
            layersResponse.layers?.forEach((layer: any) => {
              const isPoints = layer.name.endsWith('-points');

              const layerEdits = edits.find((layerEdit) => {
                return (
                  ((!isPoints && layerEdit.id === -1) || isPoints) &&
                  (serviceMetaData.label === layer.name ||
                    `${serviceMetaData.label}-points` === layer.name)
                );
              });

              const mapLayer = layers.find(
                (mapLayer) => mapLayer.layerId === layerEdits?.layerId,
              );

              // update the various ids (id, pointsId, portalId)
              if (layerEdits) {
                if (!isPoints) {
                  layerEdits.id = layer.id;
                  layerEdits.portalId = portalId;
                }

                // Figure out how to get the points version of the id
                if (isPoints && layerEdits) {
                  layerEdits.pointsId = layer.id;
                }
              }
              if (mapLayer) {
                if (!isPoints) {
                  mapLayer.id = layer.id;
                  mapLayer.portalId = portalId;
                }

                // Figure out how to get the points version of the id
                if (isPoints && mapLayer.pointsLayer) {
                  mapLayer.pointsId = layer.id;
                }

                if (!idMapping.hasOwnProperty(mapLayer.uuid)) {
                  idMapping[mapLayer.uuid] = { portalId };
                }
                if (isPoints) idMapping[mapLayer.uuid].pointsId = layer.id;
                else idMapping[mapLayer.uuid].id = layer.id;
              }
            });

            layersResponse.tables?.forEach((table: any) => {
              const isSampleTypes = table.name.endsWith('-sample-types');
              if (isSampleTypes) {
                tableParam = {
                  id: table.id,
                  sampleTypes: {},
                };
              }
            });

            // update the renderers
            updateFeatureLayers({
              portal,
              serviceUrl,
              layers,
              layersResponse,
              service,
              attributesToInclude,
            })
              .then((_updateRes) => {
                // publish the edits
                applyEdits({
                  portal,
                  service,
                  serviceUrl,
                  layerProps,
                  layers,
                  layersResponse,
                  edits,
                  serviceMetaData,
                  table: tableParam,
                  attributesToInclude,
                  referenceLayersTable,
                  referenceMaterials,
                  calculateSettings,
                })
                  .then(async (editsRes: any) => {
                    try {
                      if (referenceMaterials.createWebMap) {
                        const webMapRes = await getWebMapSceneWrapped(
                          portal,
                          serviceMetaData,
                          'Web Map',
                        );

                        await addWebMap({
                          portal,
                          service,
                          layers,
                          layersResponse,
                          attributesToInclude,
                          layerProps,
                          referenceMaterials:
                            referenceMaterials.webMapReferenceLayerSelections,
                          map,
                          existingWebMap: webMapRes,
                        });
                      }

                      if (referenceMaterials.createWebScene) {
                        const webSceneRes = await getWebMapSceneWrapped(
                          portal,
                          serviceMetaData,
                          'Web Scene',
                        );

                        await addWebScene({
                          portal,
                          service,
                          layers,
                          layersResponse,
                          attributesToInclude,
                          layerProps,
                          referenceMaterials:
                            referenceMaterials.webSceneReferenceLayerSelections,
                          map,
                          existingWebScene: webSceneRes,
                        });
                      }

                      resolve({
                        portalId,
                        idMapping,
                        edits: editsRes.response,
                        table: editsRes.table,
                        calculateSettings: editsRes.calculateSettingsTableOut,
                      });
                    } catch (err) {
                      window.logErrorToGa(err);
                      reject(err);
                    }
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
 * Publishes a table to ArcGIS online. Currently this is used for
 * publishing user defined sample types.
 *
 * @param portal The portal object to apply edits to
 * @param changes The table data to be saved to the hosted feature service
 * @param serviceMetaData The name and description of the service to be saved
 * @returns A promise that resolves to the successfully published data
 */
function publishTable({
  portal,
  changes,
  serviceMetaData,
  layerProps,
}: {
  portal: __esri.Portal;
  changes: any;
  serviceMetaData: ServiceMetaDataType;
  layerProps: any;
}) {
  return new Promise((resolve, reject) => {
    if (
      changes.adds.length === 0 &&
      changes.updates.length === 0 &&
      changes.deletes.length === 0
    ) {
      reject('No data to publish.');
      return;
    }

    getFeatureService(portal, serviceMetaData, true)
      .then((service: any) => {
        const serviceUrl: string = service.portalService.url;

        // publish the edits
        function localApplyEdits() {
          applyEditsTable({ portal, serviceUrl, changes })
            .then((res) =>
              resolve({
                service,
                edits: res,
              }),
            )
            .catch((err) => reject(err));
        }

        for (let table of service.featureService.tables) {
          if (table.name === serviceMetaData.label) {
            changes.id = table.id;
            break;
          }
        }

        if (changes.id !== -1) {
          localApplyEdits();
          return;
        }

        // create the layers
        createFeatureTables(portal, serviceUrl, serviceMetaData, layerProps)
          .then((res: any) => {
            // update the layer ids in edits
            changes.id = res.layers[0].id;

            localApplyEdits();
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}

export {
  appendEnvironmentObjectParam,
  deleteFeatureLayer,
  getAllFeatures,
  getEnvironmentString,
  getEnvironmentStringParam,
  getFeatureLayer,
  getFeatureLayers,
  getFeatureTables,
  isServiceNameAvailable,
  publish,
  publishTable,
};
