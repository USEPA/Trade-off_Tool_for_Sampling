// types
import { LayerEditsType } from 'types/Edits';
import { LayerType } from 'types/Layer';
// config
import { defaultLayerProps, defaultTableProps } from 'config/layerProps';
// utils
import { fetchPost, fetchCheck } from 'utils/fetchUtils';
import { chunkArray, escapeForLucene } from 'utils/utils';

type ServiceMetaDataType = {
  name: string;
  description: string;
};

/**
 * Returns an environment string to be passed as a parameter
 * to ESRI web service calls in order to avoid CORS errors.
 *
 * @returns envString The environment string to avoid
 *          CORS errors
 */
export function getEnvironmentString() {
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
export function isServiceNameAvailable(
  portal: __esri.Portal,
  serviceName: string,
) {
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
export function getFeatureService(
  portal: __esri.Portal,
  serviceMetaData: ServiceMetaDataType,
  isTable: boolean = false,
) {
  return new Promise((resolve, reject) => {
    // check if the tots feature service already exists
    getFeatureServiceWrapped(portal, serviceMetaData)
      .then((service) => {
        if (service) resolve(service);
        else {
          createFeatureService(portal, serviceMetaData, isTable)
            .then((service) => resolve(service))
            .catch((err) => reject(err));
        }
      })
      .catch((err) => reject(err));
  });
}

export function getFeatureServiceRetry(
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
        .catch((err) => reject(err));
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
) {
  return new Promise((resolve, reject) => {
    portal
      .queryItems({
        query: `orgid:${escapeForLucene(portal.user.orgId)} AND name:${
          serviceMetaData.name
        }`,
      })
      .then((res) => {
        const exactMatch = res.results.find(
          (layer: any) => layer.name === serviceMetaData.name,
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
            .catch((err) => reject(err));
        } else {
          resolve(null);
        }
      })
      .catch((err) => reject(err));
  });
}

/**
 * Creates and returns the hosted feature service
 *
 * @param portal The portal object to create the hosted feature service on
 * @param serviceMetaData Metadata to be added to the feature service and layers.
 * @param isTable Determines what category to add.
 * @returns A promise that resolves to the hosted feature service object
 */
export function createFeatureService(
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
        name: serviceMetaData.name,
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
            .catch((err) => reject(err));
        });
      })
      .catch((err) => reject(err));
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
    fetchCheck(
      `${serviceUrl}?f=json&${getEnvironmentStringParam()}=1&token=${token}`,
    )
      .then((res: any) => {
        if (res) resolve(res.layers);
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
    fetchCheck(
      `${serviceUrl}/${id}?f=json&${getEnvironmentStringParam()}=1&token=${token}`,
    )
      .then((layer: any) => {
        resolve(layer);
      })
      .catch((err) => reject(err));
  });
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
export function createFeatureLayers(
  portal: __esri.Portal,
  serviceUrl: string,
  layers: LayerType[],
  serviceMetaData: ServiceMetaDataType,
) {
  return new Promise((resolve, reject) => {
    const layersParams: any[] = [];
    if (layers.length === 0) {
      resolve({
        success: true,
        layers: [],
      });
      return;
    }

    layers.forEach((layer) => {
      // don't duplicate existing layers
      if (layer.id > -1) return;

      // get the current extent, so we can go back
      let graphicsExtent: __esri.Extent | null = null;

      // get the extent from the array of graphics
      if (layer.sketchLayer.type === 'graphics') {
        layer.sketchLayer.graphics.forEach((graphic) => {
          graphicsExtent === null
            ? (graphicsExtent = graphic.geometry.extent)
            : graphicsExtent.union(graphic.geometry.extent);
        });
      }
      if (layer.sketchLayer.type === 'feature') {
        graphicsExtent = layer.sketchLayer.fullExtent;
      }

      layersParams.push({
        ...defaultLayerProps,
        name: serviceMetaData.name,
        description: serviceMetaData.description,
        extent: graphicsExtent,

        // add a custom type for determining which layers in a feature service
        // are the sample layers. All feature services made through TOTS should only
        // have one layer, but it is possible for user
        types:
          layer.layerType === 'Samples'
            ? [
                {
                  id: 'epa-tots-sample-layer',
                  name: 'epa-tots-sample-layer',
                },
              ]
            : layer.layerType === 'VSP'
            ? [
                {
                  id: 'epa-tots-vsp-layer',
                  name: 'epa-tots-vsp-layer',
                },
              ]
            : null,
      });
    });

    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      addToDefinition: {
        layers: layersParams,
      },
    };
    appendEnvironmentObjectParam(data);

    if (layersParams.length === 0) {
      resolve({
        success: true,
        layers: [],
      });
      return;
    }

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
 * Used for adding a table to a hosted feature service on
 * ArcGIS Online
 *
 * @param portal The portal object to create feature layers on
 * @param serviceUrl The hosted feature service to save layers to
 * @param serviceMetaData Array of service metadata to be added to the layers of a feature service.
 * @returns A promise that resolves to the layers that were saved
 */
export function createFeatureTables(
  portal: __esri.Portal,
  serviceUrl: string,
  serviceMetaData: ServiceMetaDataType,
) {
  return new Promise((resolve, reject) => {
    const tableParams: any[] = [];

    tableParams.push({
      ...defaultTableProps,
      type: 'Table',
      name: serviceMetaData.name,
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
    fetchPost(`${adminServiceUrl}/deleteFromDefinition`, data)
      .then((res) => resolve(res))
      .catch((err) => reject(err));
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
export function getAllFeatures(portal: __esri.Portal, serviceUrl: string) {
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
        if (!objectIds) {
          resolve({ features: [] });
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
            where: `OBJECTID in (${chunk.join(',')})`,
            outFields: '*',
            returnGeometry: true,
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
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
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
export function applyEdits({
  portal,
  serviceUrl,
  edits,
}: {
  portal: __esri.Portal;
  serviceUrl: string;
  edits: LayerEditsType[];
}) {
  return new Promise((resolve, reject) => {
    const changes: any[] = [];
    // loop through the layers and build the payload
    edits.forEach((layerEdits) => {
      // build the deletes list, which is just an array of global ids.
      const deletes: string[] = [];
      layerEdits.deletes.forEach((item) => {
        deletes.push(item.GLOBALID);
      });

      changes.push({
        id: layerEdits.id,
        adds: layerEdits.adds,
        updates: layerEdits.updates,
        deletes,
      });
    });

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

    fetchPost(`${serviceUrl}/applyEdits`, data)
      .then((res) => resolve(res))
      .catch((err) => reject(err));
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
export function applyEditsTable({
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
 * @param layers The layers that the edits object pertain to
 * @param edits The edits to be saved to the hosted feature service
 * @param serviceMetaData The name and description of the service to be saved
 * @returns A promise that resolves to the successfully published data
 */
export function publish({
  portal,
  layers,
  edits,
  serviceMetaData,
}: {
  portal: __esri.Portal;
  layers: LayerType[];
  edits: LayerEditsType[];
  serviceMetaData: ServiceMetaDataType;
}) {
  return new Promise((resolve, reject) => {
    if (layers.length === 0) {
      reject('No layers to publish.');
      return;
    }

    getFeatureService(portal, serviceMetaData)
      .then((service: any) => {
        const serviceUrl: string = service.portalService.url;
        // create the layers
        createFeatureLayers(portal, serviceUrl, layers, serviceMetaData)
          .then((res: any) => {
            // update the layer ids in edits
            res.layers.forEach((layer: any) => {
              const layerEdits = edits.find(
                (layerEdit) =>
                  layerEdit.id === -1 && serviceMetaData.name === layer.name,
              );

              const mapLayer = layers.find(
                (mapLayer) =>
                  mapLayer.id === -1 && layerEdits?.layerId === layer.layerId,
              );

              if (layerEdits) layerEdits.id = layer.id;
              if (mapLayer) mapLayer.id = layer.id;
            });

            // publish the edits
            applyEdits({ portal, serviceUrl, edits })
              .then((res) => resolve(res))
              .catch((err) => reject(err));
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
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
export function publishTable({
  portal,
  changes,
  serviceMetaData,
}: {
  portal: __esri.Portal;
  changes: any;
  serviceMetaData: ServiceMetaDataType;
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
            .then((res) => resolve(res))
            .catch((err) => reject(err));
        }

        for (let table of service.featureService.tables) {
          if (table.name === serviceMetaData.name) {
            changes.id = table.id;
            break;
          }
        }

        if (changes.id !== -1) {
          localApplyEdits();
          return;
        }

        // create the layers
        createFeatureTables(portal, serviceUrl, serviceMetaData)
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
