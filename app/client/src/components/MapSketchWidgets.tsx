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
import Collection from '@arcgis/core/core/Collection';
import Point from '@arcgis/core/geometry/Point';
import PopupTemplate from '@arcgis/core/PopupTemplate';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import Popup from '@arcgis/core/widgets/Popup';
import Sketch from '@arcgis/core/widgets/Sketch';
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel';
// components
import MapPopup from 'components/MapPopup';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { ScenarioEditsType } from 'types/Edits';
import { LayerType, LayerTypeName } from 'types/Layer';
import { AppType } from 'types/Navigation';
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

type SketchWidgetType = {
  '2d': Sketch;
  '3d': Sketch;
};

let terrain3dUseElevationGlobal = true;

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

function setupPopupWatchers(
  view: __esri.MapView | __esri.SceneView,
  sketchVM: SketchViewModel,
  setSamplesToDelete: (value: SetStateAction<__esri.Graphic[] | null>) => void,
  setTablePanelExpanded: (value: SetStateAction<boolean>) => void,
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
        if (
          event.action.id === 'delete-multi' &&
          sketchVM.updateGraphics.length > 0
        ) {
          setSamplesToDelete(sketchVM.updateGraphics.toArray());
        }
        if (['table', 'table-multi'].includes(event.action.id)) {
          setTablePanelExpanded(true);
        }
      });

      view.popup.watch('selectedFeature', (_graphic) => {
        if (view.popup.title !== 'Edit Multiple') {
          const deleteMultiAction = view.popup.actions.find(
            (action) => action.id === 'delete-multi',
          );
          if (deleteMultiAction) view.popup.actions.remove(deleteMultiAction);

          const tableMultiAction = view.popup.actions.find(
            (action) => action.id === 'table-multi',
          );
          if (tableMultiAction) view.popup.actions.remove(tableMultiAction);
        }
      });
    },
  );
}

// --- components (MapSketchWidgets) ---
type Props = {
  appType: AppType;
  mapView: __esri.MapView;
  sceneView: __esri.SceneView;
};

function MapSketchWidgets({ appType, mapView, sceneView }: Props) {
  const { userInfo } = useContext(AuthenticationContext);
  const { currentPanel, trainingMode, getTrainingMode } =
    useContext(NavigationContext);
  const {
    defaultSymbols,
    edits,
    setEdits,
    sampleAttributes,
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
    layers,
    setLayers,
    setSelectedSampleIds,
    displayDimensions,
    terrain3dUseElevation,
  } = useContext(SketchContext);
  const { startSketch } = use3dSketch(appType);
  const getPopupTemplate = useDynamicPopup(appType);
  const layerProps = useLookupFiles().data.layerProps;

  // Workaround for esri not recognizing React context.
  // Syncs a global variable with React context.
  useEffect(() => {
    terrain3dUseElevationGlobal = terrain3dUseElevation;
  }, [terrain3dUseElevation]);

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
      window.sampleSketchVmInternalLayerId = tempSvm._internalGraphicsLayer.id;

      const widget = new Sketch({
        availableCreateTools: [],
        layer:
          layer.sketchLayer?.type === 'graphics'
            ? layer.sketchLayer
            : undefined,
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

    const defaultSymbolKey =
      appType === 'decon' ? 'Area of Interest' : 'Samples';

    const svm2d = new SketchViewModel({
      layer:
        sketchLayer.sketchLayer?.type === 'graphics'
          ? sketchLayer.sketchLayer
          : undefined,
      view: mapView,
      polygonSymbol: defaultSymbols.symbols[defaultSymbolKey],
      pointSymbol: defaultSymbols.symbols[defaultSymbolKey] as any,
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
    mapView.ui.add(widget2d, { position: 'top-right', index: 1 });

    const svm3d = new SketchViewModel({
      layer:
        sketchLayer.sketchLayer?.type === 'graphics'
          ? sketchLayer.sketchLayer
          : undefined,
      view: sceneView,
      polygonSymbol: defaultSymbols.symbols[defaultSymbolKey],
      pointSymbol: defaultSymbols.symbols[defaultSymbolKey] as any,
      defaultCreateOptions: {
        hasZ: true,
      },
      defaultUpdateOptions: {
        enableZ: true,
      },
      snappingOptions: {
        featureSources: [
          {
            layer:
              sketchLayer.sketchLayer?.type === 'graphics'
                ? sketchLayer.sketchLayer
                : undefined,
          },
        ],
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
    appType,
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
            appType={appType}
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
            title:
              appType === 'decon'
                ? 'Delete Decon Applications'
                : 'Delete Samples',
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
    appType,
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

  // Creates the SketchViewModel
  useEffect(() => {
    if (!aoiSketchLayer) return;
    if (aoiSketchVM) return;
    const svm = new SketchViewModel({
      layer:
        aoiSketchLayer.sketchLayer?.type === 'graphics'
          ? aoiSketchLayer.sketchLayer
          : undefined,
      view: mapView,
      polygonSymbol: defaultSymbols.symbols['Area of Interest'],
      pointSymbol: defaultSymbols.symbols['Area of Interest'] as any,
    });

    const tempSvm = svm as any;
    window.aoiSketchVmInternalLayerId = tempSvm._internalGraphicsLayer.id;

    setAoiSketchVM(svm);
  }, [defaultSymbols, mapView, aoiSketchVM, setAoiSketchVM, aoiSketchLayer]);

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
    sketchVM['3d'].polygonSymbol = defaultSymbols.symbols['Samples'] as any;

    if (appType === 'sampling') {
      sketchVM['2d'].pointSymbol = {
        ...defaultSymbols.symbols['Samples'],
        type: 'simple-marker',
      } as any;
      sketchVM['3d'].pointSymbol = {
        ...defaultSymbols.symbols['Samples'],
        type: 'simple-marker',
      } as any;
    }

    if (sketchLayer.sketchLayer?.type === 'graphics') {
      sketchLayer.sketchLayer.elevationInfo =
        displayDimensions === '3d'
          ? { mode: 'absolute-height' }
          : (null as any);
    }

    // get the button and it's id
    const button = document.querySelector('.sketch-button-selected');
    const id = (button && button.id)?.replace('draw-sample-', '');
    if (id && Object.prototype.hasOwnProperty.call(sampleAttributes, id)) {
      if (appType === 'decon') {
        sketchVM['2d'].cancel();
        sketchVM['3d'].cancel();
      }

      if (appType === 'sampling') {
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
          const shapeType = attributes.ShapeType;
          startSketch(shapeType);
          setLastDisplayDimensions(displayDimensions);
        }
      }
    }
  }, [
    appType,
    defaultSymbols,
    displayDimensions,
    lastDisplayDimensions,
    mapView,
    sceneView,
    sampleAttributes,
    sketchLayer,
    sketchVM,
    startSketch,
  ]);

  // Updates the selected layer of the aoiSketchViewModel
  useEffect(() => {
    if (!aoiSketchVM) return;

    if (
      ['additionalTools', 'decon', 'locateSamples'].includes(
        currentPanel?.value ?? '',
      ) &&
      aoiSketchLayer?.sketchLayer?.type === 'graphics'
    ) {
      aoiSketchVM.layer = aoiSketchLayer.sketchLayer;

      if (currentPanel?.value === 'locateSamples') {
        aoiSketchVM.polygonSymbol = defaultSymbols.symbols[
          'Area of Interest'
        ] as any;
        aoiSketchVM.pointSymbol = defaultSymbols.symbols[
          'Area of Interest'
        ] as any;
      }

      if (displayDimensions === '2d') {
        aoiSketchVM.view = mapView;
        if (aoiSketchVM.layer) aoiSketchVM.layer.elevationInfo = null as any;
        aoiSketchVM.snappingOptions = {
          featureSources: [],
        } as any;
        aoiSketchVM.defaultCreateOptions = {
          hasZ: false,
        };
        aoiSketchVM.defaultUpdateOptions = {
          enableZ: false,
        };
      } else {
        aoiSketchVM.view = sceneView;
        if (aoiSketchVM.layer) {
          aoiSketchVM.layer.elevationInfo = {
            mode:
              currentPanel?.value === 'additionalTools'
                ? 'on-the-ground'
                : 'absolute-height',
          };
        }

        if (currentPanel?.value === 'locateSamples') {
          aoiSketchVM.snappingOptions = {
            featureSources: [{ layer: aoiSketchVM.layer }],
          } as any;
        }
        aoiSketchVM.defaultCreateOptions = {
          hasZ: true,
        };
        aoiSketchVM.defaultUpdateOptions = {
          enableZ: true,
        };
      }
    } else {
      // disable the sketch vm for any panel other than locateSamples
      aoiSketchVM.layer = null as unknown as __esri.GraphicsLayer;
    }
  }, [
    aoiSketchLayer,
    aoiSketchVM,
    currentPanel,
    defaultSymbols,
    displayDimensions,
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

        if (!firstPoint && graphic.geometry) {
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
          const id = (button && button.id)?.replace('draw-sample-', '');
          if (
            id?.includes('-sampling-mask') ||
            id?.includes('decon-mask') ||
            id?.includes('staging-aoi')
          ) {
            deactivateButtons();
          }

          if (!id) {
            sketchViewModel.cancel();
            return;
          }

          // get the predefined attributes using the id of the clicked button
          const uuid = generateUUID();
          let layerType: LayerTypeName = 'Samples';
          if (
            ['sampling-mask', 'decon-mask'].includes(id) ||
            id.includes('-sampling-mask') ||
            id.includes('decon-mask')
          ) {
            layerType = id.includes('decon-mask')
              ? 'Decon Mask'
              : 'Sampling Mask';
            graphic.attributes = {
              DECISIONUNITUUID: graphic.layer.id,
              DECISIONUNIT: graphic.layer.title,
              DECISIONUNITSORT: 0,
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              OBJECTID: -1,
              TYPE: layerType,
            };
          } else if (id.includes('staging-aoi')) {
            layerType = 'Staging Area Mask';
            graphic.attributes = {
              PERMANENT_IDENTIFIER: uuid,
              GLOBALID: uuid,
              OBJECTID: -1,
              TYPE: layerType,
            };
          } else {
            graphic.attributes = {
              ...window.totsSampleAttributes[id],
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
            getPopupTemplate(
              layerType,
              appType === 'decon' ? true : getTrainingMode(),
            ),
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

          if (!id.includes('-sampling-mask') && !id.includes('decon-mask')) {
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

          if (appType === 'sampling' && !id.includes('-sampling-mask')) {
            // start next graphic
            setTimeout(() => {
              sketchViewModel.create(graphic.attributes.ShapeType);
            }, 100);
          }
          if (appType === 'decon') sketchViewModel.cancel();
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
    [appType, getPopupTemplate, getTrainingMode, userInfo],
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
    setupEvents(aoiSketchVM, setAoiSketchVMActive, setAoiUpdateSketchEvent);

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
      appType,
      edits,
      layer: updateLayer.layer,
      type: updateLayer.eventType,
      changes: updateLayer.eventChanges,
    });

    // update the edits state
    setEdits(editsCopy);

    const newScenario = editsCopy.edits.find(
      (e) =>
        ['scenario', 'scenario-decon'].includes(e.type) &&
        e.layerId === selectedScenario?.layerId,
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
    appType,
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
      aoiSketchVM.layer ||
      aoiSketchLayer?.sketchLayer?.type !== 'graphics' ||
      currentPanel?.value !== 'locateSamples'
    ) {
      return;
    }

    aoiSketchVM.layer = aoiSketchLayer.sketchLayer;
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
      getPopupTemplate('Samples', appType === 'decon' ? true : trainingMode),
    );

    // update the popupTemplate for all Sample/VSP layers
    layers.forEach((layer) => {
      if (layer.layerType === 'Samples' || layer.layerType === 'VSP') {
        if (layer.sketchLayer?.type === 'graphics') {
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
  }, [appType, getPopupTemplate, layers, trainingMode]);

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
        samplesToDelete[0].layer?.id
          .replace('-points', '')
          .replace('-hybrid', ''),
    );
    if (!layer || layer.sketchLayer?.type !== 'graphics') return;

    // make a copy of the edits context variable
    const editsCopy = updateLayerEdits({
      appType,
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
  }, [appType, edits, setEdits, layers, mapView, sceneView, samplesToDelete]);

  const [popupActionsInitialized, setPopupActionsInitialized] = useState(false);
  useEffect(() => {
    if (!mapView || !sceneView || !sketchVM || popupActionsInitialized) return;

    setPopupActionsInitialized(true);

    setupPopupWatchers(
      mapView,
      sketchVM['2d'],
      setSamplesToDelete,
      setTablePanelExpanded,
    );
    setupPopupWatchers(
      sceneView,
      sketchVM['3d'],
      setSamplesToDelete,
      setTablePanelExpanded,
    );
  }, [
    aoiSketchVM,
    mapView,
    popupActionsInitialized,
    sceneView,
    setTablePanelExpanded,
    sketchVM,
  ]);

  const [aoiPopupActionsInitialized, setAoiPopupActionsInitialized] =
    useState(false);
  useEffect(() => {
    if (!mapView || !sceneView || !aoiSketchVM || aoiPopupActionsInitialized)
      return;

    setAoiPopupActionsInitialized(true);

    setupPopupWatchers(
      mapView,
      aoiSketchVM,
      setSamplesToDelete,
      setTablePanelExpanded,
    );
    setupPopupWatchers(
      sceneView,
      aoiSketchVM,
      setSamplesToDelete,
      setTablePanelExpanded,
    );
  }, [
    aoiPopupActionsInitialized,
    aoiSketchVM,
    mapView,
    sceneView,
    setTablePanelExpanded,
  ]);

  return null;
}

export default MapSketchWidgets;
