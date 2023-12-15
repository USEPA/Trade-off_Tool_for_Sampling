/** @jsxImportSource @emotion/react */

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { createRoot } from 'react-dom/client';
import { css } from '@emotion/react';
import Collection from '@arcgis/core/core/Collection';
import Handles from '@arcgis/core/core/Handles';
import Home from '@arcgis/core/widgets/Home';
import Locate from '@arcgis/core/widgets/Locate';
import Measurement from '@arcgis/core/widgets/Measurement';
import Point from '@arcgis/core/geometry/Point';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import Popup from '@arcgis/core/widgets/Popup';
import ScaleBar from '@arcgis/core/widgets/ScaleBar';
import Sketch from '@arcgis/core/widgets/Sketch';
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel';
// components
import MapPopup from 'components/MapPopup';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { useLayerProps } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType, LayerTypeName } from 'types/Layer';
import { PolygonSymbol, SelectedSampleType } from 'config/sampleAttributes';
// utils
import { use3dSketch, useDynamicPopup } from 'utils/hooks';
import {
  convertToPoint,
  createBuffer,
  deactivateButtons,
  generateUUID,
  getCurrentDateTime,
  getPointSymbol,
  handlePopupClick,
  setZValues,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { ScenarioEditsType } from 'types/Edits';

type SketchWidgetType = {
  '2d': Sketch;
  '3d': Sketch;
};

let terrain3dUseElevationGlobal = true;

// Replaces the prevClassName with nextClassName for all elements with
// prevClassName on the DOM.
function replaceClassName(prevClassName: string, nextClassName: string) {
  // timeout is necessary to handle race condition of loading indicator classname vs prevClassName
  setTimeout(() => {
    // get all elements with prevClassName and replace it with nextClassName
    const elms: HTMLCollectionOf<Element> =
      document.getElementsByClassName(prevClassName);
    for (let i = 0; i < elms.length; i++) {
      const el = elms[i];
      el.className = el.className.replace(prevClassName, nextClassName);
    }
  }, 100);
}

// Finds the layer being updated and its index within the layers variable.
// Also returns the eventType (add, update, etc.) and event changes.
function getUpdateEventInfo(
  layers: LayerType[],
  event: any,
  setter: Dispatch<SetStateAction<LayerType | null>> | null,
) {
  // get type and changes
  const type = event.type === 'create' ? 'add' : event.type;
  const changes = type === 'add' ? [event.graphic] : event.graphics;

  // Get the layer from the event. It's better to get the layer from the graphics
  // since that will persist when changing tabs. For delete events we have to get
  // the layer from the target, since delete events never have the layer on the graphic.
  const eventLayer = type === 'delete' ? event.target?.layer : changes[0].layer;

  // look up the layer for this event
  let updateLayer: LayerType | null = null;
  let updateLayerIndex = -1;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (
      (eventLayer && layer.layerId === eventLayer.id) ||
      (!eventLayer && layer.layerId === changes[0].attributes?.DECISIONUNITUUID)
    ) {
      updateLayer = layer;
      updateLayerIndex = i;
      break;
    }
  }

  return {
    eventType: type,
    eventChanges: changes,
    layer: updateLayer,
    layerIndex: updateLayerIndex,
    setter,
  };
}

const buttonSharedStyles = css`
  margin: 8.5px;
  font-size: 15px;
  text-align: center;
  vertical-align: middle;
`;

const buttonStyle = css`
  ${buttonSharedStyles}
  background-color: white;
  color: #6e6e6e;
`;

const buttonActiveStyle = css`
  ${buttonSharedStyles}
  background-color: #999696;
  color: black;
`;

const buttonHoverStyle = css`
  ${buttonSharedStyles}
  background-color: #f0f0f0;
  color: black;
  cursor: pointer;
`;

const divSharedStyles = css`
  height: 32px;
  width: 32px;
`;

const divStyle = css`
  ${divSharedStyles}
  background-color: white;
`;

const divActiveStyle = css`
  ${divSharedStyles}
  background-color: #999696;
  color: black;
`;

const divHoverStyle = css`
  ${divSharedStyles}
  background-color: #f0f0f0;
  cursor: pointer;
`;

const measurementContainerStyles = css`
  display: flex;
  gap: 5px;
`;

// --- components (MapWidgets) ---
type Props = {
  mapView: __esri.MapView;
  sceneView: __esri.SceneView;
};

function MapWidgets({ mapView, sceneView }: Props) {
  const { userInfo } = useContext(AuthenticationContext);
  const { currentPanel, trainingMode, getTrainingMode } =
    useContext(NavigationContext);
  const {
    defaultSymbols,
    edits,
    setEdits,
    homeWidget,
    setHomeWidget,
    sampleAttributes,
    selectedSampleIds,
    sketchVM,
    setSketchVM,
    aoiSketchVM,
    setAoiSketchVM,
    sketchLayer,
    setSketchLayer,
    aoiSketchLayer,
    setAoiSketchLayer,
    selectedScenario,
    setSelectedScenario,
    displayGeometryType,
    layers,
    setLayers,
    map,
    setSelectedSampleIds,
    displayDimensions,
    terrain3dUseElevation,
  } = useContext(SketchContext);
  const samplesSketch = use3dSketch(sketchVM, sketchLayer);
  const aoiSketch = use3dSketch(aoiSketchVM, aoiSketchLayer);
  const getPopupTemplate = useDynamicPopup();
  const layerProps = useLayerProps();

  // Workaround for esri not recognizing React context.
  // Syncs a global variable with React context.
  useEffect(() => {
    terrain3dUseElevationGlobal = terrain3dUseElevation;
  }, [terrain3dUseElevation]);

  // Creates and adds the home widget to the map.
  // Also moves the zoom widget to the top-right
  useEffect(() => {
    if (!mapView || !sceneView || !setHomeWidget || homeWidget) return;

    const widget2d = new Home({ view: mapView });
    mapView.ui.add(widget2d, { position: 'top-right', index: 1 });

    const widget3d = new Home({ view: sceneView });
    sceneView.ui.add(widget3d, { position: 'top-right', index: 1 });

    setHomeWidget({
      '2d': widget2d,
      '3d': widget3d,
    });
  }, [mapView, homeWidget, setHomeWidget, sceneView]);

  // Initialize the measurement widget
  const [measurementWidget, setMeasurementWidget] =
    useState<Measurement | null>(null);
  useEffect(() => {
    if (!mapView || !sceneView || measurementWidget) return;

    const widget = new Measurement({
      areaUnit: 'imperial',
      linearUnit: 'imperial',
      view: mapView,
    });

    setMeasurementWidget(widget);
  }, [displayDimensions, mapView, measurementWidget, sceneView]);

  // Display the measurement widget on the screen
  useEffect(() => {
    if (!mapView || !sceneView || !measurementWidget) return;

    // sync the measurement widget settings to 2d/3d
    measurementWidget.clear();
    measurementWidget.view = displayDimensions === '3d' ? sceneView : mapView;
    if (displayDimensions === '3d') {
      mapView.ui.remove(measurementWidget);
      sceneView.ui.add(measurementWidget, {
        position: 'bottom-right',
        index: 0,
      });
    } else {
      sceneView.ui.remove(measurementWidget);
      mapView.ui.add(measurementWidget, { position: 'bottom-right', index: 0 });
    }

    // add measurement widget to 2d view
    const node2d = document.createElement('div');
    mapView.ui.add(node2d, { position: 'top-right', index: 0 });
    createRoot(node2d).render(
      <CustomMeasurementWidget
        displayDimensions={displayDimensions}
        measurementWidget={measurementWidget}
      />,
    );

    // add measurement widget to 3d view
    const node3d = document.createElement('div');
    sceneView.ui.add(node3d, { position: 'top-right', index: 0 });
    createRoot(node3d).render(
      <CustomMeasurementWidget
        displayDimensions={displayDimensions}
        measurementWidget={measurementWidget}
      />,
    );

    return function cleanup() {
      mapView?.ui.remove(node2d);
      sceneView?.ui.remove(node3d);
    };
  }, [displayDimensions, mapView, measurementWidget, sceneView]);

  // Creates the sketch widget used for selecting/moving/deleting samples
  // Also creates an event handler for keeping track of changes
  const [sketchWidget, setSketchWidget] = useState<SketchWidgetType | null>(
    null,
  );
  const [updateGraphics, setUpdateGraphics] = useState<__esri.Graphic[]>([]);
  useEffect(() => {
    if (!mapView || !sketchLayer || sketchWidget) return;

    function buildWidget(
      view: __esri.MapView | __esri.SceneView,
      layer: LayerType,
      svm: __esri.SketchViewModel,
    ) {
      const tempSvm = svm as any;
      const tempWindow = window as any;
      tempWindow.sampleSketchVmInternalLayerId =
        tempSvm._internalGraphicsLayer.id;

      const widget = new Sketch({
        availableCreateTools: [],
        layer: layer.sketchLayer,
        view,
        viewModel: svm as any,
        visibleElements: {
          duplicateButton: false,
          settingsMenu: false,
          undoRedoMenu: false,
        },
      });

      reactiveUtils.watch(
        () => widget.updateGraphics.length,
        () => {
          setUpdateGraphics(widget.updateGraphics.toArray());
        },
      );

      return widget;
    }

    const svm2d = new SketchViewModel({
      layer: sketchLayer.sketchLayer,
      view: mapView,
      polygonSymbol: defaultSymbols.symbols['Samples'],
      pointSymbol: defaultSymbols.symbols['Samples'] as any,
      defaultCreateOptions: {
        hasZ: false,
      },
      defaultUpdateOptions: {
        enableZ: false,
      },
      snappingOptions: {
        featureSources: [],
      },
    });
    const widget2d = buildWidget(mapView, sketchLayer, svm2d);
    mapView.ui.add(widget2d, { position: 'top-right', index: 0 });

    const svm3d = new SketchViewModel({
      layer: sketchLayer.sketchLayer,
      view: sceneView,
      polygonSymbol: defaultSymbols.symbols['Samples'],
      pointSymbol: defaultSymbols.symbols['Samples'] as any,
      defaultCreateOptions: {
        hasZ: true,
      },
      defaultUpdateOptions: {
        enableZ: true,
      },
      snappingOptions: {
        featureSources: [{ layer: sketchLayer.sketchLayer }],
      },
    });
    const widget3d = buildWidget(sceneView, sketchLayer, svm3d);

    setSketchVM({
      '2d': svm2d,
      '3d': svm3d,
    });
    setSketchWidget({
      '2d': widget2d,
      '3d': widget3d,
    });
  }, [
    defaultSymbols,
    mapView,
    sceneView,
    sketchLayer,
    setSketchVM,
    sketchWidget,
  ]);

  // Opens a popup for when multiple samples are selected at once
  useEffect(() => {
    if (!mapView || !sceneView || !sketchLayer || !sketchWidget) return;
    if (layerProps.status !== 'success') return;

    const sketchWidgetLocal = sketchWidget[displayDimensions];

    const newSelectedSampleIds = updateGraphics.map((feature) => {
      return {
        PERMANENT_IDENTIFIER: feature.attributes.PERMANENT_IDENTIFIER,
        DECISIONUNITUUID: feature.attributes.DECISIONUNITUUID,
        selection_method: 'sample-click',
      } as SelectedSampleType;
    });
    setSelectedSampleIds(newSelectedSampleIds);

    // get all of the graphics within the click except for those associated
    // with the sketch tools
    const popupItems: __esri.Graphic[] = [];
    const newIds: string[] = [];
    sketchWidgetLocal.updateGraphics.forEach((graphic: any) => {
      popupItems.push(graphic);

      // get a list of graphic ids
      if (graphic.attributes?.PERMANENT_IDENTIFIER) {
        newIds.push(graphic.attributes.PERMANENT_IDENTIFIER);
      }
    });

    const view = displayDimensions === '2d' ? mapView : sceneView;

    // get list of graphic ids currently in the popup
    const curIds: string[] = [];
    view.popup?.features?.forEach((feature: any) => {
      if (feature.attributes?.PERMANENT_IDENTIFIER) {
        curIds.push(feature.attributes.PERMANENT_IDENTIFIER);
      }
    });

    // sort the id arrays
    newIds.sort();
    curIds.sort();

    // open the popup
    if (popupItems.length > 0 && curIds.toString() !== newIds.toString()) {
      const firstGeometry = popupItems[0].geometry as any;
      if (popupItems.length === 1) {
        const popupProps = {
          location:
            firstGeometry.type === 'point'
              ? firstGeometry
              : firstGeometry.centroid,
          features: popupItems,
          visible: true,
        };
        view.popup = new Popup(popupProps);
      } else {
        const content = (
          <MapPopup
            features={popupItems.map((item) => {
              return {
                graphic: item,
              };
            })}
            edits={edits}
            setEdits={setEdits}
            layers={layers}
            fieldInfos={[]}
            layerProps={layerProps}
            onClick={handlePopupClick}
          />
        );

        // wrap the content for esri
        const contentContainer = document.createElement('div');
        createRoot(contentContainer).render(content);

        view.popup = new Popup({
          location:
            firstGeometry.type === 'point'
              ? firstGeometry
              : firstGeometry.centroid,
          content: contentContainer,
          title: 'Edit Multiple',
          visible: true,
        });

        const deleteMultiAction = view.popup.actions.find(
          (action) => action.id === 'delete-multi',
        );
        if (!deleteMultiAction) {
          view.popup.actions.add({
            title: 'Delete Samples',
            id: 'delete-multi',
            className: 'esri-icon-trash',
          } as __esri.ActionButton);
        }

        const tableMultiAction = view.popup.actions.find(
          (action) => action.id === 'table-multi',
        );
        if (!tableMultiAction) {
          view.popup.actions.add({
            title: 'View In Table',
            id: 'table-multi',
            className: 'esri-icon-table',
          } as __esri.ActionButton);
        }
      }
    }
  }, [
    displayDimensions,
    edits,
    layerProps,
    layers,
    mapView,
    sceneView,
    setEdits,
    setSelectedSampleIds,
    sketchLayer,
    sketchWidget,
    updateGraphics,
  ]);

  // Creates and adds the scale bar widget to the map
  const [scaleBar, setScaleBar] = useState<__esri.ScaleBar | null>(null);
  useEffect(() => {
    if (!mapView || scaleBar) return;

    const newScaleBar = new ScaleBar({
      view: mapView,
      unit: 'dual',
    });
    mapView.ui.add(newScaleBar, { position: 'bottom-right', index: 1 });
    setScaleBar(newScaleBar);
  }, [mapView, scaleBar]);

  // Creates and adds the locate widget to the map.
  const [
    locateWidget,
    setLocateWidget, //
  ] = useState<__esri.Locate | null>(null);
  useEffect(() => {
    if (!mapView || locateWidget) return;

    function buildWidget(view: __esri.MapView | __esri.SceneView) {
      const widget = new Locate({ view });

      // show the locate icon on success
      widget.on('locate', (event) => {
        replaceClassName('esri-icon-error2', 'esri-icon-locate');
      });

      // show the error icon on failure
      widget.on('locate-error', (event) => {
        replaceClassName('esri-icon-locate', 'esri-icon-error2');
      });

      return widget;
    }

    const widget2d = buildWidget(mapView);
    mapView.ui.add(widget2d, { position: 'top-right', index: 2 });
    mapView.ui.move('zoom', { position: 'top-right', index: 3 });

    const widget3d = buildWidget(sceneView);
    sceneView.ui.add(widget3d, { position: 'top-right', index: 2 });
    sceneView.ui.move('zoom', { position: 'top-right', index: 3 });
    sceneView.ui.move('navigation-toggle', { position: 'top-right', index: 4 });
    sceneView.ui.move('compass', { position: 'top-right', index: 5 });

    setLocateWidget(widget2d);
  }, [mapView, sceneView, locateWidget]);

  // Creates the SketchViewModel
  useEffect(() => {
    if (!aoiSketchLayer) return;
    if (aoiSketchVM) return;

    const svm2d = new SketchViewModel({
      layer: aoiSketchLayer.sketchLayer,
      view: mapView,
      polygonSymbol: defaultSymbols.symbols['Area of Interest'],
      pointSymbol: defaultSymbols.symbols['Area of Interest'] as any,
      defaultCreateOptions: {
        hasZ: false,
      },
      defaultUpdateOptions: {
        enableZ: false,
      },
      snappingOptions: {
        featureSources: [],
      },
    });

    const svm3d = new SketchViewModel({
      layer: aoiSketchLayer.sketchLayer,
      view: sceneView,
      polygonSymbol: defaultSymbols.symbols['Area of Interest'],
      pointSymbol: defaultSymbols.symbols['Area of Interest'] as any,
      defaultCreateOptions: {
        hasZ: true,
      },
      defaultUpdateOptions: {
        enableZ: true,
      },
      snappingOptions: {
        featureSources: [{ layer: aoiSketchLayer.sketchLayer }],
      },
    });

    const tempWindow = window as any;
    const tempSvm = svm2d as any;
    tempWindow.aoiSketchVmInternalLayerId = tempSvm._internalGraphicsLayer.id;

    setAoiSketchVM({
      '2d': svm2d,
      '3d': svm3d,
    });
  }, [
    defaultSymbols,
    mapView,
    aoiSketchVM,
    setAoiSketchVM,
    aoiSketchLayer,
    sceneView,
  ]);

  // Updates the selected layer of the sketchViewModel
  useEffect(() => {
    if (!sketchVM) return;

    if (
      currentPanel?.value === 'locateSamples' &&
      sketchLayer?.sketchLayer?.type === 'graphics'
    ) {
      sketchVM['2d'].layer = sketchLayer.sketchLayer;
      sketchVM['3d'].layer = sketchLayer.sketchLayer;
      if (sketchWidget) sketchWidget['2d'].layer = sketchLayer.sketchLayer;
      if (sketchWidget) sketchWidget['3d'].layer = sketchLayer.sketchLayer;
    } else {
      // disable the sketch vm for any panel other than locateSamples
      sketchVM['2d'].layer = null as unknown as __esri.GraphicsLayer;
      sketchVM['3d'].layer = null as unknown as __esri.GraphicsLayer;
    }
  }, [currentPanel, defaultSymbols, sketchWidget, sketchVM, sketchLayer]);

  // Updates the selected layer of the sketchViewModel
  const [lastDisplayDimensions, setLastDisplayDimensions] =
    useState(displayDimensions);
  useEffect(() => {
    if (!sketchVM || !sketchLayer?.sketchLayer || !mapView || !sceneView)
      return;

    sketchVM['2d'].polygonSymbol = defaultSymbols.symbols['Samples'] as any;
    sketchVM['2d'].pointSymbol = {
      ...defaultSymbols.symbols['Samples'],
      type: 'simple-marker',
    } as any;
    sketchVM['3d'].polygonSymbol = defaultSymbols.symbols['Samples'] as any;
    sketchVM['3d'].pointSymbol = {
      ...defaultSymbols.symbols['Samples'],
      type: 'simple-marker',
    } as any;

    sketchLayer.sketchLayer.elevationInfo =
      displayDimensions === '3d' ? { mode: 'absolute-height' } : (null as any);

    // get the button and it's id
    const button = document.querySelector('.sketch-button-selected');
    const id = button && button.id;
    if (id && sampleAttributes.hasOwnProperty(id)) {
      // determine whether the sketch button draws points or polygons
      const attributes = sampleAttributes[id as any];
      if (attributes.POINT_STYLE.includes('path|')) {
        (sketchVM['2d'].pointSymbol as any).style = 'path';
        (sketchVM['2d'].pointSymbol as any).path =
          attributes.POINT_STYLE.replace('path|', '');
        (sketchVM['3d'].pointSymbol as any).style = 'path';
        (sketchVM['3d'].pointSymbol as any).path =
          attributes.POINT_STYLE.replace('path|', '');
      } else {
        (sketchVM['2d'].pointSymbol as any).style = attributes.POINT_STYLE;
        (sketchVM['3d'].pointSymbol as any).style = attributes.POINT_STYLE;
      }

      if (displayDimensions !== lastDisplayDimensions) {
        let shapeType = attributes.ShapeType;
        samplesSketch.startSketch(shapeType);
        setLastDisplayDimensions(displayDimensions);
      }
    }
  }, [
    defaultSymbols,
    displayDimensions,
    lastDisplayDimensions,
    mapView,
    sceneView,
    sampleAttributes,
    samplesSketch,
    sketchLayer,
    sketchVM,
  ]);

  // Updates the selected layer of the aoiSketchViewModel
  useEffect(() => {
    if (!aoiSketchVM) return;

    if (
      currentPanel?.value === 'locateSamples' &&
      aoiSketchLayer?.sketchLayer?.type === 'graphics'
    ) {
      aoiSketchVM['2d'].layer = aoiSketchLayer.sketchLayer;
      aoiSketchVM['3d'].layer = aoiSketchLayer.sketchLayer;

      aoiSketchVM['2d'].polygonSymbol = defaultSymbols.symbols[
        'Area of Interest'
      ] as any;
      aoiSketchVM['2d'].pointSymbol = defaultSymbols.symbols[
        'Area of Interest'
      ] as any;
      aoiSketchVM['3d'].polygonSymbol = defaultSymbols.symbols[
        'Area of Interest'
      ] as any;
      aoiSketchVM['3d'].pointSymbol = defaultSymbols.symbols[
        'Area of Interest'
      ] as any;

      aoiSketchLayer.sketchLayer.elevationInfo =
        displayDimensions === '3d'
          ? { mode: 'absolute-height' }
          : (null as any);

      // get the button and it's id
      const button = document.querySelector('.sketch-button-selected');
      const id = button && button.id;
      if (id === 'sampling-mask') {
        if (displayDimensions !== lastDisplayDimensions) {
          aoiSketch.startSketch('polygon');
          setLastDisplayDimensions(displayDimensions);
        }
      }
    } else {
      // disable the sketch vm for any panel other than locateSamples
      aoiSketchVM['2d'].layer = null as unknown as __esri.GraphicsLayer;
      aoiSketchVM['3d'].layer = null as unknown as __esri.GraphicsLayer;
    }
  }, [
    aoiSketch,
    aoiSketchLayer,
    aoiSketchVM,
    currentPanel,
    defaultSymbols,
    displayDimensions,
    lastDisplayDimensions,
    mapView,
    sceneView,
  ]);

  // Creates the sketchVM events for placing the graphic on the map
  const setupEvents = useCallback(
    (
      sketchViewModel: __esri.SketchViewModel,
      setter: Dispatch<SetStateAction<boolean>>,
      sketchEventSetter: Dispatch<any>,
    ) => {
      let firstPoint: __esri.Point | null = null;

      sketchViewModel.on('create', (event) => {
        const { graphic } = event;
        if (!graphic) return;

        if (!firstPoint) {
          if (graphic.geometry.type === 'point') {
            firstPoint = graphic.geometry as __esri.Point;
          }
          if (graphic.geometry.type === 'polygon') {
            const poly = graphic.geometry as __esri.Polygon;
            const firstCoordinate = poly.rings?.[0]?.[0];
            firstPoint = new Point({
              x: firstCoordinate[0],
              y: firstCoordinate[1],
              spatialReference: {
                wkid: poly.spatialReference.wkid,
              },
            });
          }
        }

        async function processSketchEvent() {
          // get the button and it's id
          const button = document.querySelector('.sketch-button-selected');
          const id = button && button.id;
          if (id === 'sampling-mask') {
            deactivateButtons();
          }

          if (!id) {
            sketchViewModel.cancel();
            return;
          }

          // get the predefined attributes using the id of the clicked button
          const uuid = generateUUID();
          let layerType: LayerTypeName = 'Samples';
          if (id === 'sampling-mask') {
            layerType = 'Sampling Mask';
            graphic.attributes = {
              DECISIONUNITUUID: graphic.layer.id,
              DECISIONUNIT: graphic.layer.title,
              DECISIONUNITSORT: 0,
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              OBJECTID: -1,
              TYPE: layerType,
            };
          } else {
            graphic.attributes = {
              ...(window as any).totsSampleAttributes[id],
              DECISIONUNITUUID: graphic.layer.id,
              DECISIONUNIT: graphic.layer.title,
              DECISIONUNITSORT: 0,
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              OBJECTID: -1,
              Notes: '',
              CREATEDDATE: getCurrentDateTime(),
              UPDATEDDATE: getCurrentDateTime(),
              USERNAME: userInfo?.username || '',
              ORGANIZATION: userInfo?.orgId || '',
            };
          }

          // add a popup template to the graphic
          graphic.popupTemplate = new PopupTemplate(
            getPopupTemplate(layerType, getTrainingMode()),
          );

          // update the z values
          await setZValues({
            map: sketchViewModel.view.map,
            graphic,
            zRefParam: firstPoint,
            zOverride: terrain3dUseElevationGlobal ? null : 0,
          });

          // predefined boxes (sponge, micro vac and swab) need to be
          // converted to a box of a specific size.
          if (graphic.attributes.ShapeType === 'point') {
            await createBuffer(graphic);
          }

          graphic.symbol = sketchViewModel.polygonSymbol;

          if (id !== 'sampling-mask') {
            // find the points version of the layer
            const layerId = graphic.layer.id;
            const pointLayer = (graphic.layer as any).parent.layers.find(
              (layer: any) => `${layerId}-points` === layer.id,
            );
            if (pointLayer) {
              pointLayer.add(convertToPoint(graphic));
            }

            const hybridLayer = (graphic.layer as any).parent.layers.find(
              (layer: any) => `${layerId}-hybrid` === layer.id,
            );
            if (hybridLayer) {
              hybridLayer.add(
                graphic.attributes.ShapeType === 'point'
                  ? convertToPoint(graphic)
                  : graphic.clone(),
              );
            }
          }

          // save the graphic
          sketchEventSetter(event);

          firstPoint = null;

          if (id !== 'sampling-mask') {
            // start next graphic
            setTimeout(() => {
              sketchViewModel.create(graphic.attributes.ShapeType);
            }, 100);
          }
        }

        // place the graphic on the map when the drawing is complete
        if (event.state === 'complete') {
          sketchViewModel.complete();
          processSketchEvent();
        }
      });

      sketchViewModel.on('update', (event) => {
        // dock the popup when sketch tools are active
        sketchViewModel.view.popup.dockEnabled =
          event.state === 'complete' ? false : true;

        let isActive = event.state === 'complete' ? false : true;
        // the updates have completed add them to the edits variable
        if (event.state === 'complete' && !event.aborted) {
          // fire the update event if event.state is complete.
          if (event.state === 'complete') {
            event.graphics.forEach((graphic) => {
              graphic.attributes.UPDATEDDATE = getCurrentDateTime();
              graphic.attributes.USERNAME = userInfo?.username || '';
              graphic.attributes.ORGANIZATION = userInfo?.orgId || '';
            });
            sketchEventSetter(event);
          }

          isActive = false;
        }

        if (event.state === 'active') {
          // find the points version of the layer
          event.graphics.forEach((graphic) => {
            const layerId = graphic.layer?.id;
            const pointLayer: __esri.GraphicsLayer = (
              graphic.layer as any
            )?.parent?.layers?.find(
              (layer: __esri.GraphicsLayer) => `${layerId}-points` === layer.id,
            );
            if (pointLayer) {
              // Find the original point graphic and remove it
              const graphicsToRemove: __esri.Graphic[] = [];
              pointLayer.graphics.forEach((pointVersion) => {
                if (
                  graphic.attributes.PERMANENT_IDENTIFIER ===
                  pointVersion.attributes.PERMANENT_IDENTIFIER
                ) {
                  graphicsToRemove.push(pointVersion);
                }
              });
              pointLayer.removeMany(graphicsToRemove);

              // Re-add the point version of the graphic
              const symbol = graphic.symbol as any as PolygonSymbol;
              (pointLayer as any).add({
                attributes: graphic.attributes,
                geometry: (graphic.geometry as __esri.Polygon).centroid,
                popupTemplate: graphic.popupTemplate,
                symbol: getPointSymbol(graphic, symbol),
              });
            }

            const hybridLayer: __esri.GraphicsLayer = (
              graphic.layer as any
            )?.parent?.layers?.find(
              (layer: __esri.GraphicsLayer) => `${layerId}-hybrid` === layer.id,
            );
            if (hybridLayer) {
              // Find the original point graphic and remove it
              const graphicsToRemove: __esri.Graphic[] = [];
              hybridLayer.graphics.forEach((hybridVersion) => {
                if (
                  graphic.attributes.PERMANENT_IDENTIFIER ===
                  hybridVersion.attributes.PERMANENT_IDENTIFIER
                ) {
                  graphicsToRemove.push(hybridVersion);
                }
              });
              hybridLayer.removeMany(graphicsToRemove);

              // Re-add the point version of the graphic
              const symbol = graphic.symbol as any as PolygonSymbol;
              if (graphic.attributes.ShapeType === 'point') {
                (hybridLayer as any).add({
                  attributes: graphic.attributes,
                  geometry: (graphic.geometry as __esri.Polygon).centroid,
                  popupTemplate: graphic.popupTemplate,
                  symbol: getPointSymbol(graphic, symbol),
                });
              } else {
                (hybridLayer as any).add(graphic.clone());
              }
            }
          });
        }

        const isShapeChange =
          event.toolEventInfo &&
          (event.toolEventInfo.type.includes('reshape') ||
            event.toolEventInfo.type.includes('scale'));

        let hasPredefinedBoxes = false;
        event.graphics.forEach((graphic) => {
          if (graphic.attributes?.ShapeType === 'point') {
            hasPredefinedBoxes = true;
          }
        });

        // prevent scale and reshape changes on the predefined graphics
        // allow moves and rotates
        if (isShapeChange && hasPredefinedBoxes) {
          sketchViewModel.undo();
        }

        setter(isActive);
      });

      // handles deleting when the delete key is pressed
      // Workaround for an error that said Argument of type '"delete"' is
      // not assignable to parameter of type '"undo"'.
      // This issue looks like the types haven't been updated, because delete
      // is now an option.
      const tempSketchVM = sketchViewModel as any;
      tempSketchVM.on('delete', (event: any) => {
        // find the points version of the layer
        event.graphics.forEach((graphic: any) => {
          const layerId = tempSketchVM.layer?.id;
          const pointLayer: __esri.GraphicsLayer = (
            tempSketchVM.layer as any
          ).parent.layers.find(
            (layer: __esri.GraphicsLayer) => `${layerId}-points` === layer.id,
          );
          if (pointLayer) {
            // Find the original point graphic and remove it
            const graphicsToRemove: __esri.Graphic[] = [];
            pointLayer.graphics.forEach((pointVersion) => {
              if (
                graphic.attributes.PERMANENT_IDENTIFIER ===
                pointVersion.attributes.PERMANENT_IDENTIFIER
              ) {
                graphicsToRemove.push(pointVersion);
              }
            });
            pointLayer.removeMany(graphicsToRemove);
          }

          const hybridLayer: __esri.GraphicsLayer = (
            tempSketchVM.layer as any
          ).parent.layers.find(
            (layer: __esri.GraphicsLayer) => `${layerId}-hybrid` === layer.id,
          );
          if (hybridLayer) {
            // Find the original point graphic and remove it
            const graphicsToRemove: __esri.Graphic[] = [];
            hybridLayer.graphics.forEach((hybridVersion) => {
              if (
                graphic.attributes.PERMANENT_IDENTIFIER ===
                hybridVersion.attributes.PERMANENT_IDENTIFIER
              ) {
                graphicsToRemove.push(hybridVersion);
              }
            });
            hybridLayer.removeMany(graphicsToRemove);
          }
        });

        sketchEventSetter(event);
      });
    },
    [getPopupTemplate, getTrainingMode, userInfo],
  );

  // Setup the sketch view model events for the base sketchVM
  const [sketchVMActive, setSketchVMActive] = useState(false);
  const [
    sketchEventsInitialized,
    setSketchEventsInitialized, //
  ] = useState(false);
  const [updateSketchEvent, setUpdateSketchEvent] = useState<any>(null);
  useEffect(() => {
    if (!sketchVM || sketchEventsInitialized) return;
    setupEvents(sketchVM['2d'], setSketchVMActive, setUpdateSketchEvent);
    setupEvents(sketchVM['3d'], setSketchVMActive, setUpdateSketchEvent);

    setSketchEventsInitialized(true);
  }, [
    sketchVM,
    setupEvents,
    sketchEventsInitialized,
    setSketchEventsInitialized,
  ]);

  // Setup the sketch view model events for the Sampling Mask sketchVM
  const [aoiSketchVMActive, setAoiSketchVMActive] = useState(false);
  const [
    aoiSketchEventsInitialized,
    setAoiSketchEventsInitialized, //
  ] = useState(false);
  const [
    aoiUpdateSketchEvent,
    setAoiUpdateSketchEvent, //
  ] = useState<any>(null);
  useEffect(() => {
    if (!aoiSketchVM || aoiSketchEventsInitialized) return;
    setupEvents(
      aoiSketchVM['2d'],
      setAoiSketchVMActive,
      setAoiUpdateSketchEvent,
    );
    setupEvents(
      aoiSketchVM['3d'],
      setAoiSketchVMActive,
      setAoiUpdateSketchEvent,
    );

    setAoiSketchEventsInitialized(true);
  }, [
    aoiSketchVM,
    setupEvents,
    aoiSketchEventsInitialized,
    setAoiSketchEventsInitialized,
  ]);

  // Get the active sketchVM
  type SketchVMName = '' | 'sketchVM' | 'aoiSketchVM';
  const [
    targetSketchVM,
    setTargetSketchVM, //
  ] = useState<SketchVMName>('');
  const [bothEqualSet, setBothEqualSet] = useState(false);
  useEffect(() => {
    let newTarget: SketchVMName = '';
    let newBothEqualSet = bothEqualSet;

    // determine what the current sketchVM is
    if (sketchVMActive && aoiSketchVMActive) {
      // switch to the latest sketchVM
      if (targetSketchVM === 'sketchVM') newTarget = 'aoiSketchVM';
      if (targetSketchVM === 'aoiSketchVM') newTarget = 'sketchVM';
      newBothEqualSet = true;
    } else if (sketchVMActive) {
      newTarget = 'sketchVM';
      newBothEqualSet = false;
    } else if (aoiSketchVMActive) {
      newTarget = 'aoiSketchVM';
      newBothEqualSet = false;
    } else {
      newTarget = '';
      newBothEqualSet = false;
    }

    // When both sketchVMs are active only change the targetVM once.
    if (newBothEqualSet && bothEqualSet) return;

    // set state if it changed
    if (newTarget !== targetSketchVM) setTargetSketchVM(newTarget);
    if (newBothEqualSet !== bothEqualSet) setBothEqualSet(newBothEqualSet);
  }, [sketchVMActive, aoiSketchVMActive, targetSketchVM, bothEqualSet]);

  type UpdateLayerEventType = {
    eventType: any;
    eventChanges: any;
    layer: LayerType | null;
    layerIndex: number;
    setter: Dispatch<SetStateAction<LayerType | null>> | null;
  };
  const [updateLayer, setUpdateLayer] = useState<UpdateLayerEventType>({
    eventType: null,
    eventChanges: null,
    layer: null,
    layerIndex: -1,
    setter: null,
  });

  // set the updateLayer for the updateSketchEvent
  useEffect(() => {
    if (layers.length === 0 || !updateSketchEvent) return;
    setUpdateSketchEvent(null);

    setUpdateLayer(
      getUpdateEventInfo(layers, updateSketchEvent, setSketchLayer),
    );
  }, [updateSketchEvent, layers, setSketchLayer]);

  // set the updateLayer for the aoiUpdateSketchEvent
  useEffect(() => {
    if (layers.length === 0 || !aoiUpdateSketchEvent) return;
    setAoiUpdateSketchEvent(null);

    setUpdateLayer(
      getUpdateEventInfo(layers, aoiUpdateSketchEvent, setAoiSketchLayer),
    );
  }, [aoiUpdateSketchEvent, layers, setAoiSketchLayer]);

  // save the updated graphic to the edits data structure for later publishing
  useEffect(() => {
    if (!updateLayer.layer) return;
    setUpdateLayer({
      eventType: null,
      eventChanges: null,
      layer: null,
      layerIndex: -1,
      setter: null,
    });

    // save the layer changes
    // make a copy of the edits context variable
    const editsCopy = updateLayerEdits({
      edits,
      layer: updateLayer.layer,
      type: updateLayer.eventType,
      changes: updateLayer.eventChanges,
    });

    // update the edits state
    setEdits(editsCopy);

    const newScenario = editsCopy.edits.find(
      (e) => e.type === 'scenario' && e.layerId === selectedScenario?.layerId,
    ) as ScenarioEditsType;
    if (newScenario) setSelectedScenario(newScenario);

    // updated the edited layer
    setLayers([
      ...layers.slice(0, updateLayer.layerIndex),
      updateLayer.layer,
      ...layers.slice(updateLayer.layerIndex + 1),
    ]);

    // update sketchVM event
    if (updateLayer.setter) {
      updateLayer.setter((layer) => {
        return layer ? { ...layer, editType: updateLayer.eventType } : null;
      });
    }
  }, [
    edits,
    setEdits,
    updateLayer,
    layers,
    setLayers,
    selectedScenario,
    setSelectedScenario,
  ]);

  // Reactivate aoiSketchVM after the updateSketchEvent is null
  useEffect(() => {
    if (
      updateSketchEvent ||
      !aoiSketchVM ||
      aoiSketchVM['2d'].layer ||
      aoiSketchVM['3d'].layer ||
      aoiSketchLayer?.sketchLayer?.type !== 'graphics' ||
      currentPanel?.value !== 'locateSamples'
    ) {
      return;
    }

    aoiSketchVM['2d'].layer = aoiSketchLayer.sketchLayer;
    aoiSketchVM['3d'].layer = aoiSketchLayer.sketchLayer;
  }, [currentPanel, updateSketchEvent, aoiSketchVM, aoiSketchLayer]);

  // Reactivate sketchVM after the aoiUpdateSketchEvent is null
  useEffect(() => {
    if (
      aoiUpdateSketchEvent ||
      !sketchVM ||
      sketchVM['2d'].layer ||
      sketchVM['3d'].layer ||
      sketchLayer?.sketchLayer?.type !== 'graphics' ||
      currentPanel?.value !== 'locateSamples'
    ) {
      return;
    }

    sketchVM['2d'].layer = sketchLayer.sketchLayer;
    sketchVM['3d'].layer = sketchLayer.sketchLayer;
    if (sketchWidget) sketchWidget['2d'].layer = sketchLayer.sketchLayer;
    if (sketchWidget) sketchWidget['3d'].layer = sketchLayer.sketchLayer;
  }, [currentPanel, aoiUpdateSketchEvent, sketchVM, sketchLayer, sketchWidget]);

  // Updates the popupTemplates when trainingMode is toggled on/off
  useEffect(() => {
    // get the popupTemplate
    const popupTemplate = new PopupTemplate(
      getPopupTemplate('Samples', trainingMode),
    );

    // update the popupTemplate for all Sample/VSP layers
    layers.forEach((layer) => {
      if (layer.layerType === 'Samples' || layer.layerType === 'VSP') {
        if (layer.sketchLayer.type === 'graphics') {
          layer.sketchLayer.graphics.forEach((graphic) => {
            graphic.popupTemplate = popupTemplate;
          });
        }
        if (layer.pointsLayer?.type === 'graphics') {
          layer.pointsLayer.graphics.forEach((graphic) => {
            graphic.popupTemplate = popupTemplate;
          });
        }
        if (layer.hybridLayer?.type === 'graphics') {
          layer.hybridLayer.graphics.forEach((graphic) => {
            graphic.popupTemplate = popupTemplate;
          });
        }
      }
    });
  }, [getPopupTemplate, trainingMode, layers]);

  // Gets the graphics to be highlighted and highlights them
  const [handles] = useState(new Handles());
  useEffect(() => {
    if (!map || !selectedScenario || selectedScenario.layers.length === 0) {
      return;
    }

    const group = 'contamination-highlights-group';
    try {
      handles.remove(group);
    } catch (e) {}

    // find the group layer
    const groupLayer = map.findLayerById(
      selectedScenario.layerId,
    ) as __esri.GroupLayer;

    // Get any graphics that have a contam value
    if (trainingMode && groupLayer) {
      groupLayer.layers.forEach((layer) => {
        if (layer.type !== 'graphics') return;

        const highlightGraphics: __esri.Graphic[] = [];
        const tempLayer = layer as __esri.GraphicsLayer;
        tempLayer.graphics.forEach((graphic) => {
          if (graphic.attributes.CONTAMVAL) {
            highlightGraphics.push(graphic);
          }
        });

        // Highlight the graphics with a contam value
        if (highlightGraphics.length === 0) return;

        const view = displayDimensions === '3d' ? sceneView : mapView;
        view.whenLayerView(tempLayer).then((layerView) => {
          const handle = layerView.highlight(highlightGraphics);
          handles.add(handle, group);
        });
      });
    }
  }, [
    displayDimensions,
    map,
    handles,
    edits,
    selectedScenario,
    mapView,
    sceneView,
    trainingMode,
  ]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const group = 'highlights-group';
    try {
      handles.remove(group);
    } catch (e) {}

    // Highlights graphics on the provided layer that matches the provided
    // list of uuids.
    function highlightGraphics(
      layer: __esri.GraphicsLayer | __esri.FeatureLayer | null,
      uuids: any,
    ) {
      if (!layer) return;

      const itemsToHighlight: __esri.Graphic[] = [];
      const tempLayer = layer as __esri.GraphicsLayer;
      tempLayer.graphics.forEach((graphic) => {
        if (uuids.includes(graphic.attributes.PERMANENT_IDENTIFIER)) {
          itemsToHighlight.push(graphic);
        }
      });

      // Highlight the graphics with a contam value
      if (itemsToHighlight.length === 0) return;

      const view = displayDimensions === '3d' ? sceneView : mapView;
      view
        .whenLayerView(tempLayer)
        .then((layerView) => {
          const handle = layerView.highlight(itemsToHighlight);
          handles.add(handle, group);
        })
        .catch((err) => console.error(err));
    }

    const samples: any = {};
    selectedSampleIds.forEach((sample) => {
      if (!samples.hasOwnProperty(sample.DECISIONUNITUUID)) {
        samples[sample.DECISIONUNITUUID] = [sample.PERMANENT_IDENTIFIER];
      } else {
        samples[sample.DECISIONUNITUUID].push(sample.PERMANENT_IDENTIFIER);
      }
    });

    Object.keys(samples).forEach((layerUuid) => {
      // find the layer
      const sampleUuids = samples[layerUuid];
      const layer = layers.find((layer) => layer.uuid === layerUuid);

      if (!layer) return;

      highlightGraphics(layer.sketchLayer, sampleUuids);
      highlightGraphics(layer.pointsLayer, sampleUuids);
      highlightGraphics(layer.hybridLayer, sampleUuids);
    });
  }, [
    map,
    handles,
    layers,
    mapView,
    sceneView,
    selectedSampleIds,
    displayDimensions,
    displayGeometryType,
  ]);

  const { setTablePanelExpanded } = useContext(NavigationContext);

  const [samplesToDelete, setSamplesToDelete] = useState<
    __esri.Graphic[] | null
  >(null);
  useEffect(() => {
    if (!samplesToDelete || samplesToDelete.length === 0) return;

    const changes = new Collection<__esri.Graphic>();
    changes.addMany(samplesToDelete);

    // find the layer
    const layer = layers.find(
      (layer) =>
        layer.layerId ===
        samplesToDelete[0].layer.id
          .replace('-points', '')
          .replace('-hybrid', ''),
    );
    if (!layer || layer.sketchLayer.type !== 'graphics') return;

    // make a copy of the edits context variable
    const editsCopy = updateLayerEdits({
      edits,
      layer,
      type: 'delete',
      changes,
    });

    setEdits(editsCopy);

    const idsToDelete = samplesToDelete.map(
      (sample) => sample.attributes.PERMANENT_IDENTIFIER,
    );

    // Find the original point graphic and remove it
    let graphicsToRemove: __esri.Graphic[] = [];
    layer.sketchLayer.graphics.forEach((polygonVersion) => {
      if (
        idsToDelete.includes(polygonVersion.attributes.PERMANENT_IDENTIFIER)
      ) {
        graphicsToRemove.push(polygonVersion);
      }
    });
    layer.sketchLayer.removeMany(graphicsToRemove);

    if (!layer.pointsLayer || !layer.hybridLayer) return;

    // Find the original point graphic and remove it
    graphicsToRemove = [];
    layer.pointsLayer.graphics.forEach((pointVersion) => {
      if (idsToDelete.includes(pointVersion.attributes.PERMANENT_IDENTIFIER)) {
        graphicsToRemove.push(pointVersion);
      }
    });
    layer.pointsLayer.removeMany(graphicsToRemove);

    layer.hybridLayer.graphics.forEach((hybridVersion) => {
      if (idsToDelete.includes(hybridVersion.attributes.PERMANENT_IDENTIFIER)) {
        graphicsToRemove.push(hybridVersion);
      }
    });
    layer.hybridLayer.removeMany(graphicsToRemove);

    // close the popup
    if (mapView) mapView.closePopup();
    if (sceneView) sceneView.closePopup();

    setSamplesToDelete(null);
  }, [edits, setEdits, layers, mapView, sceneView, samplesToDelete]);

  const [popupActionsInitialized, setPopupActionsInitialized] = useState(false);
  useEffect(() => {
    if (!mapView || !sceneView || !sketchVM || popupActionsInitialized) return;

    setPopupActionsInitialized(true);

    function setupPopupWatchers(
      view: __esri.MapView | __esri.SceneView,
      sketchVM: SketchViewModel,
    ) {
      const tempMapView = view as any;
      tempMapView.popup._displayActionTextLimit = 1;

      reactiveUtils.watch(
        () => view.popup,
        () => {
          view.popup.on('trigger-action', (event) => {
            // Workaround for target not being on the PopupTriggerActionEvent
            if (event.action.id === 'delete' && view?.popup?.selectedFeature) {
              setSamplesToDelete([view.popup.selectedFeature]);
            }
            if (event.action.id === 'delete-multi') {
              setSamplesToDelete(sketchVM.updateGraphics.toArray());
            }
            if (['table', 'table-multi'].includes(event.action.id)) {
              setTablePanelExpanded(true);
            }
          });

          view.popup.watch('selectedFeature', (graphic) => {
            if (view.popup.title !== 'Edit Multiple') {
              const deleteMultiAction = view.popup.actions.find(
                (action) => action.id === 'delete-multi',
              );
              if (deleteMultiAction)
                view.popup.actions.remove(deleteMultiAction);

              const tableMultiAction = view.popup.actions.find(
                (action) => action.id === 'table-multi',
              );
              if (tableMultiAction) view.popup.actions.remove(tableMultiAction);
            }
          });
        },
      );
    }

    setupPopupWatchers(mapView, sketchVM['2d']);
    setupPopupWatchers(sceneView, sketchVM['3d']);
  }, [
    mapView,
    popupActionsInitialized,
    sceneView,
    setTablePanelExpanded,
    sketchVM,
  ]);

  return null;
}

type CustomWidgetButtonProps = {
  active: boolean;
  iconClass: string;
  onClick: Function;
  title: string;
};

function CustomWidgetButton({
  active,
  iconClass,
  onClick,
  title,
}: CustomWidgetButtonProps) {
  const [hover, setHover] = useState(false);

  return (
    <div
      title={title}
      css={active ? divActiveStyle : hover ? divHoverStyle : divStyle}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      onClick={() => onClick()}
      onKeyDown={() => onClick()}
      role="button"
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        className={iconClass}
        css={
          active ? buttonActiveStyle : hover ? buttonHoverStyle : buttonStyle
        }
      />
    </div>
  );
}

type CustomMeasurementWidgetProps = {
  displayDimensions: '2d' | '3d';
  measurementWidget: Measurement;
};

function CustomMeasurementWidget({
  displayDimensions,
  measurementWidget,
}: CustomMeasurementWidgetProps) {
  const [activeTool, setActiveTool] = useState<'area' | 'distance' | null>(
    null,
  );

  return (
    <div css={measurementContainerStyles}>
      <CustomWidgetButton
        active={activeTool === 'distance'}
        iconClass="esri-icon esri-icon-measure-line"
        title="Distance Measurement Tool"
        onClick={() => {
          setActiveTool('distance');

          measurementWidget.activeTool =
            displayDimensions === '2d' ? 'distance' : 'direct-line';
        }}
      />
      <CustomWidgetButton
        active={activeTool === 'area'}
        iconClass="esri-icon esri-icon-measure-area"
        title="Area Measurement Tool"
        onClick={() => {
          setActiveTool('area');
          measurementWidget.activeTool = 'area';
        }}
      />
      <CustomWidgetButton
        active={false}
        iconClass="esri-icon esri-icon-close"
        title="Clear Measurements"
        onClick={() => {
          setActiveTool(null);
          measurementWidget.clear();
        }}
      />
    </div>
  );
}

export default MapWidgets;
