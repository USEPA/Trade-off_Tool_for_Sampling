import { useCallback, useContext, useEffect, useState } from 'react';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import Popup from '@arcgis/core/widgets/Popup';
// contexts
import { SketchContext, SketchViewModelType } from 'contexts/Sketch';
// utils
import { use3dSketch } from 'utils/hooks';
import { deactivateButtons } from 'utils/sketchUtils';
// types
import { AppType } from 'types/Navigation';
// config
import { isDecon } from 'config/navigation';

let ctrl = false;
let shift = false;
let sampleAttributesG: any[] = [];
let sketchVMG: __esri.SketchViewModel | null = null;
let updateGraphics: __esri.Graphic[] = [];

// Gets the graphic from the hittest
function getGraphicFromResponse(res: any) {
  if (!res.results || res.results.length === 0) return null;

  const match = res.results.filter((result: any) => {
    const { attributes: attr } = result.graphic;
    if (!attr?.PERMANENT_IDENTIFIER || (!attr?.DECISIONUNITUUID && !isDecon()))
      return null;

    return result;
  });

  return match[0] ? match[0].graphic : null;
}

// --- components ---
type Props = {
  appType: AppType;
  mapView: __esri.MapView;
  sceneView: __esri.SceneView;
};

function MapMouseEvents({ appType, mapView, sceneView }: Props) {
  const {
    displayDimensions,
    sampleAttributes,
    setSelectedSampleIds,
    sketchVM,
  } = useContext(SketchContext);
  const { startSketch } = use3dSketch(appType);

  const handleMapClick = useCallback(
    (event: any, view: __esri.MapView | __esri.SceneView) => {
      // perform a hittest on the click location
      view
        .hitTest(event)
        .then((res: any) => {
          const graphic = getGraphicFromResponse(res);
          if (!graphic) {
            setSelectedSampleIds([]);
            return;
          }

          const PERMANENT_IDENTIFIER = graphic.attributes.PERMANENT_IDENTIFIER;
          const DECISIONUNITUUID = graphic.attributes.DECISIONUNITUUID;
          setSelectedSampleIds((selectedSampleIds) => {
            if (
              selectedSampleIds.findIndex(
                (item) => item.PERMANENT_IDENTIFIER === PERMANENT_IDENTIFIER,
              ) !== -1
            ) {
              return selectedSampleIds.filter(
                (item) => item.PERMANENT_IDENTIFIER !== PERMANENT_IDENTIFIER,
              );
            }

            return [
              // ...selectedSampleIds, // Uncomment this line to allow multiple selections
              {
                PERMANENT_IDENTIFIER,
                DECISIONUNITUUID,
                selection_method: 'sample-click',
                graphic,
              },
            ];
          });

          // get all of the graphics within the click except for those associated
          // with the sketch tools
          const sketchLayerId = window.sampleSketchVmInternalLayerId;
          const aoiSketchLayerId = window.aoiSketchVmInternalLayerId;
          const popupItems: __esri.Graphic[] = [];
          const newIds: string[] = [];
          res.results.forEach((item: any) => {
            const layerId = item.graphic?.layer?.id;
            if (
              !layerId ||
              layerId === sketchLayerId ||
              layerId === aoiSketchLayerId
            )
              return;

            popupItems.push(item.graphic);

            // get a list of graphic ids
            if (item.graphic.attributes?.PERMANENT_IDENTIFIER) {
              newIds.push(item.graphic.attributes.PERMANENT_IDENTIFIER);
            }
          });

          // get list of graphic ids currently in the popup and sketch widget
          const curIds: string[] = [];
          const popupFeatures: __esri.Graphic[] = view.popup.features;
          updateGraphics.forEach((g) => {
            const popup = popupFeatures?.find(
              (f) =>
                f.layer &&
                f.attributes.PERMANENT_IDENTIFIER ===
                  g.attributes.PERMANENT_IDENTIFIER,
            );

            if (!popup) popupFeatures.push(g);
          });
          popupFeatures?.forEach((feature: any) => {
            const permId = feature.attributes?.PERMANENT_IDENTIFIER;
            if (permId) {
              curIds.push(permId);

              if ((ctrl || shift) && !newIds.includes(permId)) {
                newIds.push(permId);
                popupItems.push(feature);
              }
            }
          });

          // sort the id arrays
          newIds.sort();
          curIds.sort();

          // open the popup
          if (
            popupItems.length > 0 &&
            curIds.toString() !== newIds.toString()
          ) {
            // find these graphics in the sketchLayer and open them
            const sketchPopupItems = sketchVMG?.layer?.graphics?.filter((g) =>
              newIds.includes(g.attributes.PERMANENT_IDENTIFIER),
            );
            if (sketchPopupItems && sketchPopupItems.length > 0)
              sketchVMG?.update(sketchPopupItems.toArray());

            const firstGeometry = popupItems[0].geometry as any;
            view.popup = new Popup({
              location:
                firstGeometry.type === 'point'
                  ? firstGeometry
                  : firstGeometry.centroid,
              features: popupItems,
              visible: true,
            });
          }
        })
        .catch((err: any) => {
          console.error(err);

          window.logErrorToGa(err);
        });
    },
    [setSelectedSampleIds],
  );

  // Sets up the map mouse events when the component initializes
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (initialized) return;

    const handleKeyDown = (event: __esri.ViewKeyDownEvent) => {
      if (event.key === 'Control') ctrl = true;
      else if (event.key === 'Shift') shift = true;

      if (event.key === 'Escape') {
        if (mapView) mapView.closePopup();
        if (sceneView) sceneView.closePopup();

        // re-activate sketch tools if necessary
        // TODO figure out how to get this to work for decon and generate random
        if (appType === 'sampling') {
          const button = document.querySelector('.sketch-button-selected');
          const id = (button?.id ?? '').replace('draw-sample-', '');
          if (button && button.id.includes('draw-sample-') && sketchVMG) {
            // determine whether the sketch button draws points or polygons
            const shapeType = sampleAttributesG[id as any].ShapeType;
            startSketch(shapeType);
          } else {
            deactivateButtons();
          }
        }
        if (appType === 'decon') {
          deactivateButtons();
        }
      }
    };

    const handleKeyUp = (event: __esri.ViewKeyUpEvent) => {
      if (event.key === 'Control') ctrl = false;
      else if (event.key === 'Shift') shift = false;
    };

    // setup the mouse click and mouse over events
    mapView.on('click', (event) => {
      handleMapClick(event, mapView);
    });
    sceneView.on('click', (event) => {
      handleMapClick(event, sceneView);
    });

    mapView.on('key-down', handleKeyDown);
    sceneView.on('key-down', handleKeyDown);
    mapView.on('key-up', handleKeyUp);
    sceneView.on('key-up', handleKeyUp);

    setInitialized(true);
  }, [appType, handleMapClick, initialized, mapView, sceneView, startSketch]);

  // syncs the sampleAttributesG variable with the sampleAttributes context value
  useEffect(() => {
    if (appType === 'sampling') sampleAttributesG = sampleAttributes;
  }, [appType, sampleAttributes]);

  // syncs the sketchVMG variable with the sketchVM context value
  useEffect(() => {
    sketchVMG = !sketchVM ? sketchVM : sketchVM[displayDimensions];
  }, [displayDimensions, sketchVM]);

  // Sets up a watcher to sync the updateGraphics variable with the sketchVM.updateGraphics
  // context value
  const [handler, setHandler] = useState<{
    '2d': IHandle;
    '3d': IHandle;
  } | null>(null);
  useEffect(() => {
    if (!sketchVM || handler) return;

    function setupWatcher(
      sketchVM: SketchViewModelType,
      dimensions: '2d' | '3d',
    ) {
      return reactiveUtils.watch(
        () => sketchVM[dimensions].updateGraphics.length,
        () => {
          const updateGraphicsArray =
            sketchVM[dimensions].updateGraphics.toArray();
          if (
            sketchVM[dimensions].updateGraphics.length === 0 &&
            !ctrl &&
            !shift
          ) {
            updateGraphics = [];
          } else {
            updateGraphicsArray.forEach((g) => {
              const hasGraphic = updateGraphics.find(
                (f) =>
                  f.attributes.PERMANENT_IDENTIFIER ===
                  g.attributes.PERMANENT_IDENTIFIER,
              );

              if (!hasGraphic) updateGraphics.push(g);
            });
          }
        },
      );
    }

    setHandler({
      '2d': setupWatcher(sketchVM, '2d'),
      '3d': setupWatcher(sketchVM, '3d'),
    });
  }, [handler, sketchVM]);

  return null;
}

export default MapMouseEvents;
