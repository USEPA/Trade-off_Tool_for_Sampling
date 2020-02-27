// types
import { EditsType, FeatureEditsType } from 'types/Edits';
import { LayerType } from 'types/Layer';
// config
import { defaultLayerProps } from 'config/layerProps';
// utils
import { fetchPost, fetchCheck } from 'utils/fetchUtils';
import { convertToSimpleGraphic } from 'utils/sketchUtils';

const featureServiceName = 'EPA_TOTS_FS_jklj_test';

/**
 * Attempts to get the hosted feature service and creates it if
 * it doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @returns A promise that resolves to the hosted feature service object
 */
export function getFeatureService(portal: __esri.Portal) {
  return new Promise((resolve, reject) => {
    // check if the tots feature service already exists
    getFeatureServiceWrapped(portal)
      .then((service) => {
        if (service) resolve(service);
        else {
          createFeatureService(portal)
            .then((service) => resolve(service))
            .catch((err) => reject(err));
        }
      })
      .catch((err) => reject(err));
  });
}

/**
 * Gets the hosted feature service and returns null if it it
 * doesn't already exist
 *
 * @param portal The portal object to retreive the hosted feature service from
 * @returns A promise that resolves to the hosted feature service object or
 *  null if the service does not exist
 */
function getFeatureServiceWrapped(portal: __esri.Portal) {
  return new Promise((resolve, reject) => {
    // check if the tots feature service already exists
    portal
      .queryItems({ query: `name:${featureServiceName}` })
      .then((res) => {
        if (res.results.length > 0) {
          const portalService = res.results[0];

          // Workaround for esri.Portal not having credential
          const tempPortal: any = portal;
          fetchCheck(
            `${portalService.url}?f=json&token=${tempPortal.credential.token}`,
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
 * @returns A promise that resolves to the hosted feature service object
 */
export function createFeatureService(portal: __esri.Portal) {
  return new Promise((resolve, reject) => {
    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;

    // feature service creation parameters
    const folderParams = {
      f: 'json',
      token: tempPortal.credential.token,
      title: 'EPA_TOTS',
    };
    fetchPost(`${portal.user.userContentUrl}/createFolder`, folderParams)
      .then((res) => console.log('res: ', res))
      .catch((err) => console.error(err));

    // feature service creation parameters
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      outputType: 'featureService',
      description: '<Add a description>',
      snippet: '<Add a summary>',
      createParameters: {
        name: featureServiceName,
        hasStaticData: false,
        maxRecordCount: 1000,
        supportedQueryFormats: 'JSON',
        capabilities: 'Create,Delete,Query,Update,Editing',
        spatialReference: {
          wkid: 102100,
        },
        initialExtent: {
          xmin: -20037507.0671618,
          ymin: -30240971.9583862,
          xmax: 20037507.0671618,
          ymax: 18398924.324645,
          spatialReference: {
            wkid: 102100,
            latestWkid: 3857,
          },
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

          // below are some examples on how we can add metadata for determining
          // whether a feature service has a sample layer vs just being a reference layer.
          // tags: "epa-tots-test-tag1,epa-tots-test-tag2",
          // categories: "epa-tots-test-category1,epa-tots-test-category2",
          // appCategories: "epa-tots-test-appcategory1,epa-tots-test-appcategory2",
          properties: {
            EPA_TOTS: {
              sampleLayers: ['test1', 'test2'],
            },
          },
        };
        fetchPost(
          `${portal.user.userContentUrl}/items/${res.itemId}/update`,
          indata,
        ).then((res) => {
          // get the feature service from the portal and return it
          getFeatureServiceWrapped(portal)
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
    fetchCheck(`${serviceUrl}?f=json&token=${token}`)
      .then((res: any) => {
        if (res) resolve(res.layers);
        else resolve([]);
      })
      .catch((err) => reject(err));
  });
}

/**
 * Attempts to get the feature service and creates it if it
 * doesn't already exist
 *
 * @param service Object representing the hosted feature service
 * @param token Security token
 * @param id ID of the layer to retreive
 * @returns A promise that resolves to the requested layers
 */
export function getFeatureLayer(serviceUrl: string, token: string, id: number) {
  return new Promise((resolve, reject) => {
    getFeatureLayers(serviceUrl, token)
      .then((layers: any) => {
        const matchedLayer = layers.find((layer: any) => layer.id === id);
        resolve(matchedLayer);
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
 * @param layerNames The names of the layers to create
 * @returns A promise that resolves to the layers that were saved
 */
export function createFeatureLayers(
  portal: __esri.Portal,
  serviceUrl: string,
  layerNames: string[],
) {
  return new Promise((resolve, reject) => {
    const layers: any[] = [];
    if (layerNames.length === 0) {
      resolve({
        success: true,
        layers: [],
      });
      return;
    }

    layerNames.forEach((name) => {
      layers.push({
        ...defaultLayerProps,
        name,
      });
    });

    // Workaround for esri.Portal not having credential
    const tempPortal: any = portal;
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      addToDefinition: {
        layers,
      },
    };

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
    const data = {
      f: 'json',
      token: tempPortal.credential.token,
      where: '0=0',
      outFields: '*',
      returnGeometry: true,
    };

    fetchPost(`${serviceUrl}/query`, data)
      .then((res) => {
        resolve(res);
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
  layers,
  edits,
}: {
  portal: __esri.Portal;
  serviceUrl: string;
  layers: LayerType[];
  edits: EditsType;
}) {
  return new Promise((resolve, reject) => {
    const changes: any[] = [];
    // loop through the layers and build the payload
    edits.edits.forEach((layerEdits) => {
      const adds: FeatureEditsType[] = [];
      if (layerEdits.adds.length > 0) {
        // get the graphics layer
        const layerToSearch = layers.find(
          (layer) => layer.id === layerEdits.id,
        );

        // loop through and find any graphics without objectids
        if (
          layerToSearch?.sketchLayer &&
          layerToSearch.sketchLayer.type === 'graphics'
        ) {
          layerToSearch.sketchLayer.graphics.forEach((graphic) => {
            if (!graphic?.attributes?.OBJECTID) {
              return;
            }

            const formattedGraphic = convertToSimpleGraphic(graphic);
            adds.push(formattedGraphic);
          });
        }
      }

      changes.push({
        id: layerEdits.id,
        adds,
        updates: layerEdits.updates,
        deletes: layerEdits.deletes,
        // splits: layerEdits.splits, // not sure if we need this one
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
    };
    fetchPost(`${serviceUrl}/applyEdits`, data)
      .then((res) => {
        resolve(res);
      })
      .catch((err) => reject(err));
  });
}

/**
 * Publishes a layer or layers to ArcGIS online.
 *
 * @param portal The portal object to apply edits to
 * @param layers The layers that the edits object pertain to
 * @param edits The edits to be saved to the hosted feature service
 * @returns A promise that resolves to the successfully published data
 */
export function publish({
  portal,
  layers,
  edits,
}: {
  portal: __esri.Portal;
  layers: LayerType[];
  edits: EditsType;
}) {
  return new Promise((resolve, reject) => {
    getFeatureService(portal)
      .then((service: any) => {
        // build a list of layers that need to be created
        const layerNames: string[] = [];
        edits.edits.forEach((layer) => {
          if (layer.id < 0) layerNames.push(layer.name);
        });

        const serviceUrl: string = service.portalService.url;
        // create the layers
        createFeatureLayers(portal, serviceUrl, layerNames)
          .then((res: any) => {
            // update the layer ids in edits
            res.layers.forEach((layer: any) => {
              const layerEdits = edits.edits.find(
                (layerEdit) =>
                  layerEdit.id === -1 && layerEdit.name === layer.name,
              );

              const mapLayer = layers.find(
                (mapLayer) =>
                  mapLayer.id === -1 && mapLayer.name === layer.name,
              );

              if (layerEdits) layerEdits.id = layer.id;
              if (mapLayer) mapLayer.id = layer.id;
            });

            // publish the edits
            applyEdits({ portal, serviceUrl, layers, edits })
              .then((res) => resolve(res))
              .catch((err) => reject(err));
          })
          .catch((err) => reject(err));
      })
      .catch((err) => reject(err));
  });
}
