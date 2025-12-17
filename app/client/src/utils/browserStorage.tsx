/** @jsxImportSource @emotion/react */

import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import Dexie from 'dexie';
import CSVLayer from '@arcgis/core/layers/CSVLayer';
import Extent from '@arcgis/core/geometry/Extent';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Field from '@arcgis/core/layers/support/Field';
import * as geometryJsonUtils from '@arcgis/core/geometry/support/jsonUtils';
import GeoRSSLayer from '@arcgis/core/layers/GeoRSSLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import KMLLayer from '@arcgis/core/layers/KMLLayer';
import Layer from '@arcgis/core/layers/Layer';
import PortalItem from '@arcgis/core/portal/PortalItem';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import * as rendererJsonUtils from '@arcgis/core/renderers/support/jsonUtils';
import Viewpoint from '@arcgis/core/Viewpoint';
import WMSLayer from '@arcgis/core/layers/WMSLayer';
// contexts
import { CalculateContext } from 'contexts/Calculate';
import { DialogContext, AlertDialogOptions } from 'contexts/Dialog';
import { LookupFilesContext, useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { DefaultConfigureOutput, PublishContext } from 'contexts/Publish';
import { PlanGraphics, SketchContext } from 'contexts/Sketch';
// types
import {
  EditsType,
  LayerDeconEditsType,
  ScenarioDeconEditsType,
  ScenarioEditsType,
  ServiceMetaDataType,
} from 'types/Edits';
import { LayerType, PortalLayerType, UrlLayerType } from 'types/Layer';
import { AppType, GoToOptions } from 'types/Navigation';
import { SampleTypeOptions } from 'types/Publish';
// config
import { isDecon, PanelValueType } from 'config/navigation';
import {
  SampleSelectType,
  UserDefinedAttributes,
} from 'config/sampleAttributes';
// utils
import { useDynamicPopup } from 'utils/hooks';
import {
  applyRendererForTotsLayer,
  createLayer,
  generateUUID,
} from 'utils/sketchUtils';
import { getEnvironment } from 'utils/utils';

let appKey = isDecon() ? 'tods' : 'tots';

const environment = getEnvironment();
const dataTableName = 'tots-data';
const metadataTableName = 'tots-metadata';
const sessionId = getOrCreateTabId();
const db = new Dexie(
  `tots-sessions-cache${environment !== 'production' ? `-${environment}` : ''}`,
);

export async function clearDB() {
  // Remove the session from indexeddb and session storage
  await db.table('tots-data').where('key').startsWith(sessionId).delete();
  await db.table(metadataTableName).delete(sessionId);
  sessionStorage.clear();
}

async function initializeDB() {
  // Dynamically create the table for this tab
  db.version(1).stores({
    [metadataTableName]: 'id, timestamp, timestampstr',
    [dataTableName]: 'key',
  });
  await db.open();

  // Register this session in the metadata table
  const timestamp = Date.now();
  await db
    .table(metadataTableName)
    .put({ id: sessionId, timestamp, timestampstr: new Date().toString() });

  // Cleanup old sessions
  await cleanupOldSessions();

  // Periodically update the timestamp to indicate the session is active
  setInterval(async () => {
    const timestamp = Date.now();
    await db
      .table(metadataTableName)
      .put({ id: sessionId, timestamp, timestampstr: new Date().toString() });
  }, 60_000);
}

// Function to generate or retrieve a unique tab ID
function getOrCreateTabId() {
  const key = `${appKey}-session-id`;
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = generateUUID(); // Unique ID for this tab
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

async function cleanupOldSessions() {
  const metadataTable = db.table(metadataTableName);
  const now = Date.now();
  const threshold = 24 * 60 * 60 * 1000; // 24 hours of inactivity
  const inactiveSessions = await metadataTable
    .filter((session) => now - session.timestamp > threshold)
    .toArray();

  for (const session of inactiveSessions) {
    console.log(`Cleaning up session: ${session.id}`);
    // Delete the inactive session's table
    await db.table('tots-data').where('key').startsWith(session.id).delete();
    // Remove the session from metadata
    await metadataTable.delete(session.id);
  }
}

export async function writeToStorage(
  key: string,
  data: string | boolean | object | null,
  setOptions: Dispatch<SetStateAction<AlertDialogOptions | null>>,
) {
  const itemSize = data ? Math.round(JSON.stringify(data).length / 1024) : 0;

  try {
    await db
      .table(dataTableName)
      .put({ key: `${sessionId}-${key}`, value: data });
  } catch (e) {
    const rows = await db.table(dataTableName).toArray();
    let storageSize = 0;

    for (const row of rows) {
      const serializedRow = JSON.stringify(row);
      storageSize += new Blob([serializedRow]).size; // Size in bytes
    }

    const message = `New storage size would be ${
      storageSize + itemSize
    }K up from ${storageSize}K already in storage`;
    console.error(e);

    setOptions({
      title: 'IndexedDb Storage Limit Reached',
      ariaLabel: 'IndexedDb Storage Limit Reached',
      description: message,
    });

    window.logErrorToGa(`${key}:${message}`);
  }
}

// Reads data from session storage
export async function readFromStorage(key: string) {
  return (await db.table(dataTableName).get(`${sessionId}-${key}`))?.value;
}

// Finds the layer by the layer id
function getLayerById(layers: LayerType[], id: string) {
  const index = layers.findIndex((layer) => layer.layerId === id);
  return layers[index];
}

// Saves/Retrieves data to browser storage
export function useSessionStorage(appType: AppType) {
  appKey = appType === 'decon' ? 'tods' : 'tots';

  const [dbInitialized, setDbInitialized] = useState(false);
  useEffect(() => {
    initializeDB().then(() => setDbInitialized(true));
  }, []);

  useGraphicColor(dbInitialized);
  useEditsLayerStorage(dbInitialized, appType);
  useReferenceLayerStorage(dbInitialized);
  useUrlLayerStorage(dbInitialized);
  usePortalLayerStorage(dbInitialized);
  useMapExtentStorage(dbInitialized);
  useMapPositionStorage(dbInitialized);
  useHomeWidgetStorage(dbInitialized);
  useLayerSelectionsStorage(dbInitialized);
  useGenerateRandomMaskStorage(dbInitialized);
  useCalculateSettingsStorage(dbInitialized);
  useCurrentTabSettings(dbInitialized);
  useBasemapStorage2d(dbInitialized);
  useBasemapStorage3d(dbInitialized);
  useUserDefinedSampleOptionsStorage(dbInitialized);
  useUserDefinedSampleAttributesStorage(dbInitialized);
  useTablePanelStorage(dbInitialized);
  usePublishStorage(dbInitialized);
  useDisplayModeStorage(dbInitialized);
  useGsgFileStorage(dbInitialized);
  useTrainingModeStorage(dbInitialized);
}

// Uses browser storage for holding graphics color.
function useGraphicColor(dbInitialized: boolean) {
  const key = 'polygon_symbol';

  const { setOptions } = useContext(DialogContext);
  const { defaultSymbols, setDefaultSymbols, setSymbolsInitialized } =
    useContext(SketchContext);

  // Retreives training mode data from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((polygon) => {
      setReadDone(true);

      if (!polygon) {
        // if no key in browser storage, leave as default and say initialized
        setSymbolsInitialized(true);
        return;
      }

      // validate the polygon
      setDefaultSymbols(polygon);
      setSymbolsInitialized(true);
    });
  }, [
    dbInitialized,
    readInitialized,
    setDefaultSymbols,
    setSymbolsInitialized,
  ]);

  useEffect(() => {
    if (!readDone) return;
    const polygonObj = defaultSymbols as object;
    writeToStorage(key, polygonObj, setOptions);
  }, [defaultSymbols, readDone, setOptions]);
}

// Uses browser storage for holding the training mode selection.
function useTrainingModeStorage(dbInitialized: boolean) {
  const key = 'training_mode';

  const { setOptions } = useContext(DialogContext);
  const { trainingMode, setTrainingMode } = useContext(NavigationContext);

  // Retreives training mode data from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((trainingMode) => {
      setReadDone(true);
      setTrainingMode(Boolean(trainingMode));
    });
  }, [dbInitialized, readInitialized, setTrainingMode]);

  useEffect(() => {
    if (!readDone) return;

    writeToStorage(key, trainingMode, setOptions);
  }, [readDone, setOptions, trainingMode]);
}

// Uses browser storage for holding any editable layers.
function useEditsLayerStorage(dbInitialized: boolean, appType: AppType) {
  const key = 'edits';
  const { setCalculateResultsDecon } = useContext(CalculateContext);
  const { setOptions } = useContext(DialogContext);
  const {
    defaultSymbols,
    edits,
    layers,
    layersInitialized,
    map,
    setAoiCharacterizationData,
    setEdits,
    setLayers,
    setLayersInitialized,
    symbolsInitialized,
  } = useContext(SketchContext);
  const getPopupTemplate = useDynamicPopup(appType);

  // Retreives edit data from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  useEffect(() => {
    if (
      !map ||
      !setEdits ||
      !setLayers ||
      !symbolsInitialized ||
      !dbInitialized ||
      readInitialized
    )
      return;

    setReadInitialized(true);

    readFromStorage(key).then((edits: EditsType | null | undefined) => {
      if (!edits) {
        setLayersInitialized(true);
        return;
      }

      // change the edit type to add and set the edit context state
      // const edits: EditsType = JSON.parse(editsStr);
      edits.edits.forEach((edit) => {
        edit.editType = 'add';
      });
      setEdits(edits);

      const newLayers: LayerType[] = [];
      const graphicsLayers: (__esri.GraphicsLayer | __esri.GroupLayer)[] = [];
      let calculateResults: any | null = null;
      const newAoiCharacterizationGraphics: PlanGraphics = {};

      edits.edits.forEach((editsLayer) => {
        // add layer edits directly
        if (editsLayer.type === 'layer') {
          graphicsLayers.push(
            ...createLayer({
              defaultSymbols,
              editsLayer,
              getPopupTemplate,
              newLayers,
            }),
          );
        }
        // scenarios need to be added to a group layer first
        if (
          editsLayer.type === 'scenario' ||
          editsLayer.type === 'layer-aoi-analysis'
        ) {
          const groupLayer = new GroupLayer({
            id: editsLayer.layerId,
            title:
              editsLayer.type === 'layer-aoi-analysis'
                ? editsLayer.name
                : editsLayer.scenarioName,
            visible: editsLayer.visible,
            listMode: editsLayer.listMode,
          });

          newLayers.push({
            id: editsLayer.id,
            pointsId: -1,
            uuid: editsLayer.layerId,
            layerId: editsLayer.layerId,
            portalId: editsLayer.portalId,
            value: editsLayer.value,
            name: editsLayer.name,
            label: editsLayer.label,
            layerType: editsLayer.layerType,
            editType: 'add',
            addedFrom: 'sketch',
            status: editsLayer.status,
            visible: editsLayer.visible,
            listMode: editsLayer.listMode,
            sort: 0,
            geometryType: 'esriGeometryPolygon',
            sketchLayer: groupLayer,
            pointsLayer: null,
            hybridLayer: null,
            parentLayer: null,
          });

          // create the layers and add them to the group layer
          const buildingGraphics: __esri.Graphic[] = [];
          const imageGraphics: __esri.Graphic[] = [];
          const scenarioLayers: __esri.GraphicsLayer[] = [];
          editsLayer.layers.forEach((layer) => {
            const layers = createLayer({
              defaultSymbols,
              editsLayer: layer,
              getPopupTemplate,
              newLayers,
              parentLayer: groupLayer,
            });
            scenarioLayers.push(...layers);

            if (layer.layerType === 'Decon Mask') {
              layers[0].visible = false;
              layers[0].elevationInfo = { mode: 'on-the-ground' };
            }
            if (layer.layerType === 'Staging Area Mask')
              layers[0].elevationInfo = { mode: 'on-the-ground' };
            if (layer.layerType === 'AOI Assessed')
              buildingGraphics.push(...layers[0].graphics);
            if (layer.layerType === 'Image Analysis')
              imageGraphics.push(...layers[0].graphics);
          });
          groupLayer.addMany(scenarioLayers);

          graphicsLayers.push(groupLayer);
        }
        // scenarios need to be added to a group layer first
        if (editsLayer.type === 'layer-decon') {
          newLayers.push({
            id: editsLayer.id,
            pointsId: -1,
            uuid: editsLayer.layerId,
            layerId: editsLayer.layerId,
            portalId: editsLayer.portalId,
            value: editsLayer.value,
            name: editsLayer.name,
            label: editsLayer.label,
            layerType: editsLayer.layerType,
            editType: 'add',
            addedFrom: 'sketch',
            status: editsLayer.status,
            visible: editsLayer.visible,
            listMode: editsLayer.listMode,
            sort: 0,
            geometryType: 'esriGeometryPolygon',
            sketchLayer: null,
            pointsLayer: null,
            hybridLayer: null,
            parentLayer: null,
          });

          calculateResults =
            editsLayer?.deconSummaryResults?.calculateResults ?? null;
        }

        if (editsLayer.type === 'scenario-decon') {
          // do nothing
        }
      });

      if (Object.keys(newAoiCharacterizationGraphics).length > 0) {
        setAoiCharacterizationData({
          status: 'success',
          planGraphics: newAoiCharacterizationGraphics,
        });
      }

      if (calculateResults) {
        setCalculateResultsDecon({
          status: 'success',
          panelOpen: false,
          data: calculateResults,
        });
      }

      if (newLayers.length > 0) {
        window.totsLayers = [...layers, ...newLayers];
        setLayers(window.totsLayers);
        map.addMany(graphicsLayers);
      }

      setLayersInitialized(true);
    });
  }, [
    dbInitialized,
    defaultSymbols,
    getPopupTemplate,
    layers,
    layersInitialized,
    map,
    readInitialized,
    setAoiCharacterizationData,
    setCalculateResultsDecon,
    setEdits,
    setLayers,
    setLayersInitialized,
    symbolsInitialized,
  ]);

  // Saves the edits to browser storage everytime they change
  useEffect(() => {
    if (!layersInitialized) return;
    writeToStorage(key, edits, setOptions);
  }, [edits, layersInitialized, setOptions]);
}

// Uses browser storage for holding the reference layers that have been added.
function useReferenceLayerStorage(dbInitialized: boolean) {
  const key = 'reference_layers';
  const { setOptions } = useContext(DialogContext);
  const { map, referenceLayers, setReferenceLayers } =
    useContext(SketchContext);

  // Retreives reference layers from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!map || !setReferenceLayers || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((referenceLayers) => {
      setReadDone(true);
      if (!referenceLayers) return;

      const layersToAdd: __esri.FeatureLayer[] = [];
      referenceLayers.forEach((layer: any) => {
        const fields: __esri.Field[] = [];
        layer.fields.forEach((field: __esri.Field) => {
          fields.push(Field.fromJSON(field));
        });

        const source: any[] = [];
        layer.source.forEach((feature: any) => {
          source.push({
            attributes: feature.attributes,
            geometry: geometryJsonUtils.fromJSON(feature.geometry),
            popupTemplate: feature.popupTemplate,
            symbol: feature.symbol,
          });
        });

        const layerProps = {
          fields,
          source,
          id: layer.layerId,
          objectIdField: layer.objectIdField,
          outFields: layer.outFields,
          title: layer.title,
          renderer: rendererJsonUtils.fromJSON(layer.renderer),
          popupTemplate: layer.popupTemplate,
        };

        layersToAdd.push(new FeatureLayer(layerProps));
      });

      map.addMany(layersToAdd);
      setReferenceLayers(referenceLayers);
    });
  }, [dbInitialized, map, readInitialized, setReferenceLayers]);

  // Saves the reference layers to browser storage everytime they change
  useEffect(() => {
    if (!readDone) return;
    writeToStorage(key, referenceLayers, setOptions);
  }, [readDone, referenceLayers, setOptions]);
}

// Uses browser storage for holding the url layers that have been added.
function useUrlLayerStorage(dbInitialized: boolean) {
  const key = 'url_layers';
  const { setOptions } = useContext(DialogContext);
  const { map, urlLayers, setUrlLayers } = useContext(SketchContext);

  // Retreives url layers from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!map || !setUrlLayers || !dbInitialized || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then(
      (urlLayers: UrlLayerType[] | null | undefined) => {
        setReadDone(true);
        if (!urlLayers) return;

        const newUrlLayers: UrlLayerType[] = [];

        // add the portal layers to the map
        urlLayers.forEach((urlLayer) => {
          const type = urlLayer.type;

          if (
            type === 'ArcGIS' ||
            type === 'WMS' ||
            // type === 'WFS' ||
            type === 'KML' ||
            type === 'GeoRSS' ||
            type === 'CSV'
          ) {
            newUrlLayers.push(urlLayer);
          }
        });

        setUrlLayers(newUrlLayers);
      },
    );
  }, [dbInitialized, map, readInitialized, setUrlLayers]);

  // Saves the url layers to browser storage everytime they change
  useEffect(() => {
    if (!readDone) return;
    writeToStorage(key, urlLayers, setOptions);
  }, [readDone, setOptions, urlLayers]);

  // adds url layers to map
  useEffect(() => {
    if (!map || urlLayers.length === 0) return;

    // add the url layers to the map
    urlLayers.forEach((urlLayer) => {
      const type = urlLayer.type;
      const url = urlLayer.url;
      const id = urlLayer.layerId;

      const layerFound = map.layers.findIndex((l) => l.id === id) > -1;
      if (layerFound) return;

      let layer;
      if (type === 'ArcGIS') {
        Layer.fromArcGISServerUrl({ url, properties: { id } })
          .then((layer) => map.add(layer))
          .catch((err) => {
            console.error(err);

            window.logErrorToGa(err);
          });
        return;
      }
      if (type === 'WMS') {
        layer = new WMSLayer({ url, id });
      }
      /* // not supported in 4.x js api
      if(type === 'WFS') {
        layer = new WFSLayer({ url, id });
      } */
      if (type === 'KML') {
        layer = new KMLLayer({ url, id });
      }
      if (type === 'GeoRSS') {
        layer = new GeoRSSLayer({ url, id });
      }
      if (type === 'CSV') {
        layer = new CSVLayer({ url, id });
      }

      // add the layer if isn't null
      if (layer) {
        map.add(layer);
      }
    });
  }, [map, urlLayers]);
}

// Uses browser storage for holding the portal layers that have been added.
function usePortalLayerStorage(dbInitialized: boolean) {
  const key = 'portal_layers';
  const { setOptions } = useContext(DialogContext);
  const { map, portalLayers, setPortalLayers } = useContext(SketchContext);
  const technologyTypes = useLookupFiles().data.technologyTypes;

  // Retreives portal layers from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || !map || !setPortalLayers || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then(
      (portalLayers: PortalLayerType[] | null | undefined) => {
        setReadDone(true);
        if (!portalLayers) return;
        setPortalLayers(portalLayers);
      },
    );
  }, [dbInitialized, map, portalLayers, readInitialized, setPortalLayers]);

  // Saves the portal layers to browser storage everytime they change
  useEffect(() => {
    if (!readDone) return;
    writeToStorage(key, portalLayers, setOptions);
  }, [portalLayers, readDone, setOptions]);

  // adds portal layers to map
  useEffect(() => {
    if (!map || portalLayers.length === 0) return;

    // add the portal layers to the map
    portalLayers.forEach((portalLayer) => {
      const id = portalLayer.id;

      const layerFound =
        map.layers.findIndex((l: any) => l?.portalItem?.id === id) > -1;
      if (layerFound) return;

      // Skip tots layers, since they are stored in edits.
      // The only reason tots layers are also in portal layers is
      // so the search panel will show the layer as having been
      // added.
      const isTotsLayerForTods =
        portalLayer.categories.includes('contains-epa-tots-sample-layer') &&
        isDecon();
      if (portalLayer.type === 'tots' && !isTotsLayerForTods) return;

      Layer.fromPortalItem({
        portalItem: new PortalItem({ id }),
      }).then((layer) => {
        layer.load().then(() => {
          map.add(layer);
          if (isTotsLayerForTods && portalLayer.type === 'tots')
            applyRendererForTotsLayer(layer, technologyTypes);
        });
      });
    });
  }, [map, portalLayers, technologyTypes]);
}

// Uses browser storage for holding the map's view port extent.
function useMapExtentStorage(dbInitialized: boolean) {
  const key2d = 'map_2d_extent';
  const key3d = 'map_3d_extent';

  const { setOptions } = useContext(DialogContext);
  const { mapView, sceneView } = useContext(SketchContext);

  // Retreives the map position and zoom level from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || !mapView || !sceneView || readInitialized) return;

    setReadInitialized(true);

    Promise.all([readFromStorage(key2d), readFromStorage(key3d)])
      .then((extents) => {
        if (extents.length > 0 && extents[0]) {
          mapView.extent = Extent.fromJSON(extents[0]);
        }

        if (extents.length > 1 && extents[1]) {
          sceneView.extent = Extent.fromJSON(extents[1]);
        }

        setReadDone(true);
      })
      .catch((err) => console.error(err));
  }, [dbInitialized, mapView, readInitialized, sceneView]);

  // Saves the map position and zoom level to browser storage whenever it changes
  const [
    watchExtentInitialized,
    setWatchExtentInitialized, //
  ] = useState(false);
  useEffect(() => {
    if (!mapView || !sceneView || watchExtentInitialized) return;

    reactiveUtils.when(
      () => mapView.stationary,
      () => {
        if (mapView && mapView.extent && mapView.stationary) {
          writeToStorage(key2d, mapView.extent.toJSON(), setOptions);
        }
      },
    );
    reactiveUtils.watch(
      () => sceneView.stationary,
      () => {
        if (sceneView && sceneView.extent && sceneView.stationary) {
          writeToStorage(key3d, sceneView.extent.toJSON(), setOptions);
        }
      },
    );

    setWatchExtentInitialized(true);
  }, [readDone, mapView, sceneView, setOptions, watchExtentInitialized]);
}

// Uses browser storage for holding the map's view port extent.
function useMapPositionStorage(dbInitialized: boolean) {
  const key = 'map_scene_position';

  const { setOptions } = useContext(DialogContext);
  const { mapView, sceneView } = useContext(SketchContext);

  // Retreives the map position and zoom level from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || !sceneView || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((camera) => {
      if (!camera) {
        setReadDone(true);
        return;
      }

      if (!sceneView.camera) sceneView.camera = {} as any;
      sceneView.camera.fov = camera.fov;
      sceneView.camera.heading = camera.heading;
      sceneView.camera.position = geometryJsonUtils.fromJSON(
        camera.position,
      ) as __esri.Point;
      sceneView.camera.tilt = camera.tilt;

      setReadDone(true);
    });
  }, [dbInitialized, readInitialized, sceneView]);

  // Saves the map position and zoom level to browser storage whenever it changes
  const [
    watchExtentInitialized,
    setWatchExtentInitialized, //
  ] = useState(false);
  useEffect(() => {
    if (!mapView || !sceneView || watchExtentInitialized) return;

    reactiveUtils.watch(
      () => mapView.center,
      () => {
        if (!mapView.center) return;
        const cameraObj = {
          fov: sceneView.camera?.fov,
          heading: sceneView.camera?.heading,
          position: mapView.center.toJSON(),
          tilt: sceneView.camera?.tilt,
        };
        writeToStorage(key, cameraObj, setOptions);
      },
    );

    reactiveUtils.watch(
      () => sceneView.camera,
      () => {
        if (!sceneView.camera) return;
        const cameraObj = {
          fov: sceneView.camera.fov,
          heading: sceneView.camera.heading,
          position: sceneView.camera.position.toJSON(),
          tilt: sceneView.camera.tilt,
        };
        writeToStorage(key, cameraObj, setOptions);
      },
    );

    setWatchExtentInitialized(true);
  }, [readDone, mapView, sceneView, setOptions, watchExtentInitialized]);
}

// Uses browser storage for holding the home widget's viewpoint.
function useHomeWidgetStorage(dbInitialized: boolean) {
  const key2d = 'home_2d_viewpoint';
  const key3d = 'home_3d_viewpoint';

  const { setOptions } = useContext(DialogContext);
  const { homeWidget } = useContext(SketchContext);

  // Retreives the home widget viewpoint from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || !homeWidget || readInitialized) return;

    setReadInitialized(true);
    Promise.all([readFromStorage(key2d), readFromStorage(key3d)])
      .then((viewpoints) => {
        setReadDone(true);

        if (viewpoints.length > 0) {
          homeWidget['2d'].viewpoint = Viewpoint.fromJSON(viewpoints[0]);
        }
        if (viewpoints.length > 1) {
          homeWidget['3d'].viewpoint = Viewpoint.fromJSON(viewpoints[1]);
        }
      })
      .catch((err) => console.error(err));
  }, [dbInitialized, homeWidget, readInitialized]);

  // Saves the home widget viewpoint to browser storage whenever it changes
  const [
    watchHomeWidgetInitialized,
    setWatchHomeWidgetInitialized, //
  ] = useState(false);
  useEffect(() => {
    if (!homeWidget || watchHomeWidgetInitialized) return;

    reactiveUtils.watch(
      () => homeWidget['2d']?.viewpoint,
      () => {
        writeToStorage(
          key2d,
          homeWidget['2d']?.viewpoint
            ? homeWidget['2d']?.viewpoint.toJSON()
            : {},
          setOptions,
        );
      },
    );

    reactiveUtils.watch(
      () => homeWidget['3d']?.viewpoint,
      () => {
        writeToStorage(
          key3d,
          homeWidget['3d']?.viewpoint
            ? homeWidget['3d']?.viewpoint.toJSON()
            : {},
          setOptions,
        );
      },
    );

    setWatchHomeWidgetInitialized(true);
  }, [homeWidget, readDone, setOptions, watchHomeWidgetInitialized]);
}

// Uses browser storage for holding the currently selected sample layer.
function useLayerSelectionsStorage(dbInitialized: boolean) {
  const key = 'layer_selections';

  const { contaminationMap, setContaminationMap } =
    useContext(CalculateContext);
  const { setOptions } = useContext(DialogContext);
  const {
    deconOperation,
    edits,
    layers,
    selectedScenario,
    sketchLayer,
    setDeconOperation,
    setJsonDownload,
    setSelectedScenario,
    setSketchLayer,
  } = useContext(SketchContext);

  type LayerSelectionType = {
    contaminationMap: string;
    deconOperation: string;
    scenario: string;
    sketchLayer: string;
  };

  // Retreives the selected sample layer (sketchLayer) from browser storage
  // when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || layers.length === 0 || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key)
      .then((selections: LayerSelectionType | undefined) => {
        if (!selections) return;

        if (selections.scenario) {
          const scenarioId = selections.scenario;
          const scenario = edits.edits.find(
            (item) =>
              ['scenario', 'scenario-decon'].includes(item.type) &&
              item.layerId === scenarioId,
          );
          if (scenario) {
            setSelectedScenario(
              scenario as ScenarioEditsType | ScenarioDeconEditsType,
            );
            if (scenario.type === 'scenario-decon') {
              const deconOp = edits.edits.find(
                (e) =>
                  e.type === 'layer-decon' &&
                  scenario.linkedLayerIds.includes(e.layerId),
              ) as LayerDeconEditsType | undefined;
              if (
                deconOp?.deconSummaryResults?.calculateResults?.resultsTable
              ) {
                setJsonDownload(
                  deconOp.deconSummaryResults.calculateResults.resultsTable,
                );
              }
            }
          }
        }

        if (selections.sketchLayer)
          setSketchLayer(getLayerById(layers, selections.sketchLayer));

        if (selections.contaminationMap)
          setContaminationMap(
            getLayerById(layers, selections.contaminationMap),
          );

        if (selections.deconOperation)
          setDeconOperation(getLayerById(layers, selections.deconOperation));
      })
      .catch((err) => {
        console.error('error: ', err);
      })
      .finally(() => {
        setReadDone(true);
      });
  }, [
    dbInitialized,
    edits,
    layers,
    readDone,
    readInitialized,
    setContaminationMap,
    setDeconOperation,
    setJsonDownload,
    setSelectedScenario,
    setSketchLayer,
  ]);

  // Saves the selected sample layer (sketchLayer) to browser storage whenever it changes
  useEffect(() => {
    if (!readDone) return;

    const data: LayerSelectionType = {
      contaminationMap: contaminationMap?.layerId
        ? contaminationMap.layerId
        : '',
      deconOperation: deconOperation?.layerId ? deconOperation.layerId : '',
      scenario: selectedScenario?.layerId ? selectedScenario.layerId : '',
      sketchLayer: sketchLayer?.layerId ? sketchLayer.layerId : '',
    };

    writeToStorage(key, data, setOptions);
  }, [
    contaminationMap,
    deconOperation,
    readDone,
    setOptions,
    selectedScenario,
    sketchLayer,
  ]);
}

// Uses browser storage for holding the currently selected sampling mask layer.
function useGenerateRandomMaskStorage(dbInitialized: boolean) {
  const key = 'generate_random_mask_layer';
  const { setOptions } = useContext(DialogContext);
  const { layers } = useContext(SketchContext);
  const {
    aoiSketchLayer,
    setAoiSketchLayer, //
  } = useContext(SketchContext);

  // Retreives the selected sampling mask from browser storage
  // when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || layers.length === 0 || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((layerId) => {
      setReadDone(true);
      if (!layerId) return;
      setAoiSketchLayer(getLayerById(layers, layerId));
    });
  }, [dbInitialized, layers, readInitialized, setAoiSketchLayer]);

  // Saves the selected sampling mask to browser storage whenever it changes
  useEffect(() => {
    if (!readDone) return;

    const data = aoiSketchLayer?.layerId ? aoiSketchLayer.layerId : '';
    writeToStorage(key, data, setOptions);
  }, [aoiSketchLayer, readDone, setOptions]);
}

// Uses browser storage for holding the current calculate settings.
function useCalculateSettingsStorage(dbInitialized: boolean) {
  const key = 'calculate_settings';
  const { setOptions } = useContext(DialogContext);
  const {
    inputNumLabs,
    setInputNumLabs,
    inputNumLabHours,
    setInputNumLabHours,
    inputNumSamplingHours,
    setInputNumSamplingHours,
    inputNumSamplingPersonnel,
    setInputNumSamplingPersonnel,
    inputNumSamplingShifts,
    setInputNumSamplingShifts,
    inputNumSamplingTeams,
    setInputNumSamplingTeams,
    inputSamplingLaborCost,
    setInputSamplingLaborCost,
    inputSurfaceArea,
    setInputSurfaceArea,
  } = useContext(CalculateContext);

  type CalculateSettingsType = {
    numLabs: number;
    numLabHours: number;
    numSamplingHours: number;
    numSamplingPersonnel: number;
    numSamplingShifts: number;
    numSamplingTeams: number;
    samplingLaborCost: number;
    surfaceArea: number;
  };

  // Reads the calculate settings from browser storage.
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then(
      (settings: CalculateSettingsType | null | undefined) => {
        setReadDone(true);
        if (!settings) return;

        setInputNumLabs(settings.numLabs);
        setInputNumLabHours(settings.numLabHours);
        setInputNumSamplingHours(settings.numSamplingHours);
        setInputNumSamplingPersonnel(settings.numSamplingPersonnel);
        setInputNumSamplingShifts(settings.numSamplingShifts);
        setInputNumSamplingTeams(settings.numSamplingTeams);
        setInputSamplingLaborCost(settings.samplingLaborCost);
        setInputSurfaceArea(settings.surfaceArea);
      },
    );
  }, [
    dbInitialized,
    readInitialized,
    setInputNumLabs,
    setInputNumLabHours,
    setInputNumSamplingHours,
    setInputNumSamplingPersonnel,
    setInputNumSamplingShifts,
    setInputNumSamplingTeams,
    setInputSamplingLaborCost,
    setInputSurfaceArea,
  ]);

  // Saves the calculate settings to browser storage
  useEffect(() => {
    if (!readDone) return;

    const settings: CalculateSettingsType = {
      numLabs: inputNumLabs,
      numLabHours: inputNumLabHours,
      numSamplingHours: inputNumSamplingHours,
      numSamplingPersonnel: inputNumSamplingPersonnel,
      numSamplingShifts: inputNumSamplingShifts,
      numSamplingTeams: inputNumSamplingTeams,
      samplingLaborCost: inputSamplingLaborCost,
      surfaceArea: inputSurfaceArea,
    };

    writeToStorage(key, settings, setOptions);
  }, [
    inputNumLabs,
    inputNumLabHours,
    inputNumSamplingHours,
    inputNumSamplingPersonnel,
    inputNumSamplingShifts,
    inputNumSamplingTeams,
    inputSamplingLaborCost,
    inputSurfaceArea,
    readDone,
    setOptions,
  ]);
}

// Uses browser storage for holding the current tab and current tab's options.
function useCurrentTabSettings(dbInitialized: boolean) {
  const key = 'current_tab';

  type PanelSettingsType = {
    goTo: PanelValueType | '';
    goToOptions: GoToOptions;
  };

  const { setOptions } = useContext(DialogContext);
  const {
    goTo,
    setGoTo,
    goToOptions,
    setGoToOptions, //
  } = useContext(NavigationContext);

  // Retreives the current tab and current tab's options from browser storage
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((data: PanelSettingsType | null | undefined) => {
      setReadDone(true);
      if (!data) return;

      setGoTo(data.goTo);
      setGoToOptions(data.goToOptions);
    });
  }, [dbInitialized, readInitialized, setGoTo, setGoToOptions]);

  // Saves the current tab and options to browser storage whenever it changes
  useEffect(() => {
    if (!readDone || !goTo) return;

    let data: PanelSettingsType = { goTo: '', goToOptions: null };

    readFromStorage(key).then((dataRes) => {
      // get the current value from storage, if it exists
      if (dataRes) {
        data = dataRes;
      }

      // Update the data values only if they have values.
      // This is because other components clear these once they have been applied
      // but the browser storage needs to hold onto it.
      if (goTo) data['goTo'] = goTo;
      if (goToOptions) data['goToOptions'] = goToOptions;

      // save to storage
      writeToStorage(key, data, setOptions);
    });
  }, [goTo, goToOptions, readDone, setOptions]);
}

// Uses browser storage for holding the currently selected basemap.
function useBasemapStorage2d(dbInitialized: boolean) {
  const key = 'selected_basemap_layer_2d';

  const { setOptions } = useContext(DialogContext);
  const { basemapWidget } = useContext(SketchContext);

  // Retreives the selected basemap from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  const [
    watchHandler,
    setWatchHandler, //
  ] = useState<__esri.WatchHandle | null>(null);
  useEffect(() => {
    if (!dbInitialized || !basemapWidget || watchHandler || readInitialized)
      return;

    setReadInitialized(true);
    readFromStorage(key).then((portalId: string | null | undefined) => {
      if (!portalId) {
        // early return since this field isn't in storage
        setReadDone(true);
        return;
      }

      // create the watch handler for finding the selected basemap
      const newWatchHandle = basemapWidget['2d'].watch(
        'source.basemaps.length',
        (newValue) => {
          // wait for the basemaps to be populated
          if (newValue === 0) return;

          setReadDone(true);

          // Search for the basemap with the matching portal id
          let selectedBasemap: __esri.Basemap | null = null;
          basemapWidget['2d'].source.basemaps.forEach((basemap) => {
            if (basemap.portalItem.id === portalId) selectedBasemap = basemap;
          });

          // Set the activeBasemap to the basemap that was found
          if (selectedBasemap)
            basemapWidget['2d'].activeBasemap = selectedBasemap;
        },
      );

      setWatchHandler(newWatchHandle);
    });
  }, [basemapWidget, dbInitialized, readInitialized, watchHandler]);

  // destroys the watch handler after initialization completes
  useEffect(() => {
    if (!watchHandler || !readDone) return;

    watchHandler.remove();
    setWatchHandler(null);
  }, [readDone, watchHandler]);

  // Saves the selected basemap to browser storage whenever it changes
  const [
    watchBasemapInitialized,
    setWatchBasemapInitialized, //
  ] = useState(false);
  useEffect(() => {
    if (!basemapWidget || !readDone || watchBasemapInitialized) {
      return;
    }

    basemapWidget['2d'].watch('activeBasemap.portalItem.id', (newValue) => {
      if (!newValue) return;
      writeToStorage(key, newValue, setOptions);
    });

    setWatchBasemapInitialized(true);
  }, [basemapWidget, readDone, setOptions, watchBasemapInitialized]);
}

// Uses browser storage for holding the currently selected basemap.
function useBasemapStorage3d(dbInitialized: boolean) {
  const key = 'selected_basemap_layer_3d';

  const { setOptions } = useContext(DialogContext);
  const { basemapWidget } = useContext(SketchContext);

  // Retreives the selected basemap from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  const [
    watchHandler,
    setWatchHandler, //
  ] = useState<__esri.WatchHandle | null>(null);
  useEffect(() => {
    if (!dbInitialized || !basemapWidget || watchHandler || readInitialized)
      return;

    setReadInitialized(true);
    readFromStorage(key).then((portalId: string | null | undefined) => {
      if (!portalId) {
        // early return since this field isn't in storage
        setReadDone(true);
        return;
      }

      // create the watch handler for finding the selected basemap
      const newWatchHandle = basemapWidget['3d'].watch(
        'source.basemaps.length',
        (newValue) => {
          // wait for the basemaps to be populated
          if (newValue === 0) return;

          setReadDone(true);

          // Search for the basemap with the matching portal id
          let selectedBasemap: __esri.Basemap | null = null;
          basemapWidget['3d'].source.basemaps.forEach((basemap) => {
            if (basemap.portalItem.id === portalId) selectedBasemap = basemap;
          });

          // Set the activeBasemap to the basemap that was found
          if (selectedBasemap)
            basemapWidget['3d'].activeBasemap = selectedBasemap;
        },
      );

      setWatchHandler(newWatchHandle);
    });
  }, [basemapWidget, dbInitialized, readInitialized, watchHandler]);

  // destroys the watch handler after initialization completes
  useEffect(() => {
    if (!watchHandler || !readDone) return;

    watchHandler.remove();
    setWatchHandler(null);
  }, [readDone, watchHandler]);

  // Saves the selected basemap to browser storage whenever it changes
  const [
    watchBasemapInitialized,
    setWatchBasemapInitialized, //
  ] = useState(false);
  useEffect(() => {
    if (!basemapWidget || !readDone || watchBasemapInitialized) {
      return;
    }

    basemapWidget['3d'].watch('activeBasemap.portalItem.id', (newValue) => {
      if (!newValue) return;
      writeToStorage(key, newValue, setOptions);
    });

    setWatchBasemapInitialized(true);
  }, [basemapWidget, readDone, setOptions, watchBasemapInitialized]);
}

// Uses browser storage for holding the url layers that have been added.
function useUserDefinedSampleOptionsStorage(dbInitialized: boolean) {
  const key = 'user_defined_sample_options';
  const { setOptions } = useContext(DialogContext);
  const { userDefinedOptions, setUserDefinedOptions } =
    useContext(SketchContext);

  // Retreives url layers from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || !setUserDefinedOptions || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then(
      (userDefinedSamples: SampleSelectType[] | null | undefined) => {
        setReadDone(true);
        if (!userDefinedSamples) return;

        setUserDefinedOptions(userDefinedSamples);
      },
    );
  }, [dbInitialized, readInitialized, setUserDefinedOptions]);

  // Saves the url layers to browser storage everytime they change
  useEffect(() => {
    if (!readDone) return;
    writeToStorage(key, userDefinedOptions, setOptions);
  }, [readDone, setOptions, userDefinedOptions]);
}

// Uses browser storage for holding the url layers that have been added.
function useUserDefinedSampleAttributesStorage(dbInitialized: boolean) {
  const key = 'user_defined_sample_attributes';
  const { setOptions } = useContext(DialogContext);
  const { sampleTypes } = useContext(LookupFilesContext);
  const {
    setSampleAttributes,
    setSampleAttributesDecon,
    userDefinedAttributes,
    setUserDefinedAttributes,
  } = useContext(SketchContext);

  // Retreives url layers from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || !setUserDefinedAttributes || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then(
      (userDefinedAttributesObj: UserDefinedAttributes | null | undefined) => {
        setReadDone(true);
        if (!userDefinedAttributesObj) return;

        // set the state
        setUserDefinedAttributes(userDefinedAttributesObj);
      },
    );
  }, [
    dbInitialized,
    readInitialized,
    sampleTypes,
    setSampleAttributes,
    setSampleAttributesDecon,
    setUserDefinedAttributes,
  ]);

  // add the user defined attributes to the global attributes
  useEffect(() => {
    let newSampleAttributes: any = {};

    if (sampleTypes) newSampleAttributes = { ...sampleTypes.sampleAttributes };

    Object.keys(userDefinedAttributes.sampleTypes).forEach((key) => {
      newSampleAttributes[key] =
        userDefinedAttributes.sampleTypes[key].attributes;
    });

    // Update totsSampleAttributes variable on the window object. This is a workaround
    // to an issue where the sampleAttributes state variable is not available within esri
    // event handlers.
    window.totsSampleAttributes = newSampleAttributes;

    setSampleAttributes(newSampleAttributes);
  }, [readDone, sampleTypes, setSampleAttributes, userDefinedAttributes]);

  // add the user defined attributes to the global attributes
  useEffect(() => {
    let newDeconAttributes: any = {};

    if (sampleTypes) newDeconAttributes = { ...sampleTypes.deconAttributes };

    Object.keys(userDefinedAttributes.sampleTypes).forEach((key) => {
      newDeconAttributes[key] =
        userDefinedAttributes.sampleTypes[key].attributes;
    });

    // Update totsDeconAttributes variable on the window object. This is a workaround
    // to an issue where the deconAttributes state variable is not available within esri
    // event handlers.
    window.totsDeconAttributes = newDeconAttributes;

    setSampleAttributesDecon(newDeconAttributes);
  }, [readDone, sampleTypes, setSampleAttributesDecon, userDefinedAttributes]);

  // Saves the url layers to browser storage everytime they change
  useEffect(() => {
    if (!readDone) return;
    writeToStorage(key, userDefinedAttributes, setOptions);
  }, [readDone, setOptions, userDefinedAttributes]);
}

// Uses browser storage for holding the size and expand status of the bottom table.
function useTablePanelStorage(dbInitialized: boolean) {
  const key = 'table_panel';

  const { setOptions } = useContext(DialogContext);
  const {
    tablePanelExpanded,
    setTablePanelExpanded,
    tablePanelHeight,
    setTablePanelHeight,
  } = useContext(NavigationContext);

  // Retreives table info data from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((tablePanel) => {
      setReadDone(true);

      if (!tablePanel) {
        // if no key in browser storage, leave as default and say initialized
        setTablePanelExpanded(false);
        setTablePanelHeight(200);
        return;
      }

      // save table panel info
      setTablePanelExpanded(tablePanel.expanded);
      setTablePanelHeight(tablePanel.height);
    });
  }, [
    dbInitialized,
    readInitialized,
    setTablePanelExpanded,
    setTablePanelHeight,
  ]);

  useEffect(() => {
    if (!readDone) return;

    const tablePanel: object = {
      expanded: tablePanelExpanded,
      height: tablePanelHeight,
    };
    writeToStorage(key, tablePanel, setOptions);
  }, [readDone, setOptions, tablePanelExpanded, tablePanelHeight]);
}

type SampleMetaDataType = {
  publishSampleTableMetaData: ServiceMetaDataType | null;
  sampleTableDescription: string;
  sampleTableName: string;
  selectedService: ServiceMetaDataType | null;
};

// Uses browser storage for holding the currently selected sample layer.
function usePublishStorage(dbInitialized: boolean) {
  const key = 'sample_type_selections';
  const key2 = 'sample_table_metadata';
  const key3 = 'publish_samples_mode';
  const key4 = 'output_settings';

  const { setOptions } = useContext(DialogContext);
  const {
    manualConfigureOutput,
    publishSamplesMode,
    publishSampleTableMetaData,
    sampleTableDescription,
    sampleTableName,
    sampleTypeSelections,
    selectedService,
    setManualConfigureOutput,
    setPublishSamplesMode,
    setPublishSampleTableMetaData,
    setSampleTableDescription,
    setSampleTableName,
    setSampleTypeSelections,
    setSelectedService,
  } = useContext(PublishContext);

  // Retreives the selected sample layer (sketchLayer) from browser storage
  // when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || readInitialized) return;

    setReadInitialized(true);

    Promise.all([
      readFromStorage(key),
      readFromStorage(key2),
      readFromStorage(key3),
      readFromStorage(key4),
    ]).then((records) => {
      setReadDone(true);

      // set the selected scenario first
      if (records.length > 0 && records[0]) {
        setSampleTypeSelections(records[0] as SampleTypeOptions);
      }

      // set the selected scenario first
      if (records.length > 1 && records[1]) {
        const sampleMetaData: SampleMetaDataType = records[1];
        setPublishSampleTableMetaData(
          sampleMetaData.publishSampleTableMetaData,
        );
        setSampleTableDescription(sampleMetaData.sampleTableDescription);
        setSampleTableName(sampleMetaData.sampleTableName);
        setSelectedService(sampleMetaData.selectedService);
      }

      // set the selected scenario first
      if (records.length > 2 && records[2]) {
        setPublishSamplesMode(records[2] as any);
      }

      // set the publish output settings
      if (records.length > 3 && records[3]) {
        const outputSettings: DefaultConfigureOutput = records[3];
        setManualConfigureOutput(outputSettings);
      }
    });
  }, [
    dbInitialized,
    readInitialized,
    setManualConfigureOutput,
    setPublishSamplesMode,
    setPublishSampleTableMetaData,
    setSampleTableDescription,
    setSampleTableName,
    setSampleTypeSelections,
    setSelectedService,
  ]);

  // Saves the selected sample layer (sketchLayer) to browser storage whenever it changes
  useEffect(() => {
    if (!readDone) return;

    writeToStorage(key, sampleTypeSelections, setOptions);
  }, [readDone, sampleTypeSelections, setOptions]);

  // Saves the selected scenario to browser storage whenever it changes
  useEffect(() => {
    if (!readDone) return;

    const data = {
      publishSampleTableMetaData,
      sampleTableDescription,
      sampleTableName,
      selectedService,
    };
    writeToStorage(key2, data, setOptions);
  }, [
    readDone,
    publishSampleTableMetaData,
    sampleTableDescription,
    sampleTableName,
    selectedService,
    setOptions,
  ]);

  // Saves the selected scenario to browser storage whenever it changes
  useEffect(() => {
    if (!readDone) return;

    writeToStorage(key3, publishSamplesMode, setOptions);
  }, [publishSamplesMode, readDone, setOptions]);

  // Saves the publish output settings to browser storage whenever it changes
  useEffect(() => {
    if (!readDone) return;
    writeToStorage(key4, manualConfigureOutput, setOptions);
  }, [manualConfigureOutput, readDone, setOptions]);
}

// Uses browser storage for holding the display mode (points or polygons) selection.
function useDisplayModeStorage(dbInitialized: boolean) {
  const key = 'display_mode';

  const { setOptions } = useContext(DialogContext);
  const {
    displayDimensions,
    setDisplayDimensions,
    displayGeometryType,
    setDisplayGeometryType,
    terrain3dUseElevation,
    setTerrain3dUseElevation,
    terrain3dVisible,
    setTerrain3dVisible,
    viewUnderground3d,
    setViewUnderground3d,
  } = useContext(SketchContext);

  // Retreives display mode data from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((displayMode) => {
      setReadDone(true);

      if (!displayMode) {
        setDisplayDimensions('2d');
        setDisplayGeometryType('points');
        setTerrain3dUseElevation(true);
        setTerrain3dVisible(true);
        setViewUnderground3d(false);
        return;
      }

      setDisplayDimensions(displayMode.dimensions);
      setDisplayGeometryType(displayMode.geometryType);
      setTerrain3dUseElevation(displayMode.terrain3dUseElevation);
      setTerrain3dVisible(displayMode.terrain3dVisible);
      setViewUnderground3d(displayMode.viewUnderground3d);
    });
  }, [
    dbInitialized,
    readInitialized,
    setDisplayDimensions,
    setDisplayGeometryType,
    setTerrain3dUseElevation,
    setTerrain3dVisible,
    setViewUnderground3d,
  ]);

  useEffect(() => {
    if (!readDone) return;

    const displayMode: object = {
      dimensions: displayDimensions,
      geometryType: displayGeometryType,
      terrain3dUseElevation,
      terrain3dVisible,
      viewUnderground3d,
    };
    writeToStorage(key, displayMode, setOptions);
  }, [
    displayDimensions,
    displayGeometryType,
    readDone,
    setOptions,
    terrain3dUseElevation,
    terrain3dVisible,
    viewUnderground3d,
  ]);
}

// Uses browser storage for holding the gsg files.
function useGsgFileStorage(dbInitialized: boolean) {
  const key = 'gsg_files';

  const { setOptions } = useContext(DialogContext);
  const { gsgFiles, setGsgFiles } = useContext(SketchContext);

  // Retreives training mode data from browser storage when the app loads
  const [readInitialized, setReadInitialized] = useState(false);
  const [readDone, setReadDone] = useState(false);
  useEffect(() => {
    if (!dbInitialized || readInitialized) return;

    setReadInitialized(true);
    readFromStorage(key).then((gsgFiles) => {
      setReadDone(true);
      if (!gsgFiles) return;

      setGsgFiles(gsgFiles);
    });
  }, [dbInitialized, readInitialized, setGsgFiles]);

  useEffect(() => {
    if (!readDone) return;
    writeToStorage(key, gsgFiles, setOptions);
  }, [gsgFiles, readDone, setOptions]);
}
