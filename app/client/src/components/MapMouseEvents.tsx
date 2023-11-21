import { useCallback, useContext, useEffect, useState } from 'react';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import Popup from '@arcgis/core/widgets/Popup';
// contexts
import { SketchContext, SketchViewModelType } from 'contexts/Sketch';
// utils
import { use3dSketch } from 'utils/hooks';

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
    if (!attr?.PERMANENT_IDENTIFIER || !attr?.DECISIONUNITUUID) return null;

    return result;
  });

  return match[0] ? match[0].graphic : null;
}

// --- components ---
type Props = {
  mapView: __esri.MapView;
  sceneView: __esri.SceneView;
};

function MapMouseEvents({ mapView, sceneView }: Props) {
  const {
    displayDimensions,
    sampleAttributes,
    setSelectedSampleIds,
    sketchVM,
  } = useContext(SketchContext);
  const { startSketch } = use3dSketch();

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
              },
            ];
          });

          // get all of the graphics within the click except for those associated
          // with the sketch tools
          const tempWindow = window as any;
          const sketchLayerId = tempWindow.sampleSketchVmInternalLayerId;
          const aoiSketchLayerId = tempWindow.aoiSketchVmInternalLayerId;
          const popupItems: __esri.Graphic[] = [];
          const newIds: string[] = [];
          res.results.forEach((item: any) => {
            const layerId = item.graphic?.layer?.id;
            if (layerId === sketchLayerId || layerId === aoiSketchLayerId)
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
                f.attributes.PERMANENT_IDENTIFIER ===
                g.attributes.PERMANENT_IDENTIFIER,
            );

            if (!popup) popupFeatures.push(g);
          });
          popupFeatures.forEach((feature: any) => {
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
            const sketchPopupItems = sketchVMG?.layer.graphics.filter((g) =>
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
        const button = document.querySelector('.sketch-button-selected');
        if (button?.id && sketchVMG) {
          const id = button.id;

          // determine whether the sketch button draws points or polygons
          let shapeType = sampleAttributesG[id as any].ShapeType;
          startSketch(shapeType);
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
  }, [handleMapClick, initialized, mapView, sceneView, startSketch]);

  // syncs the sampleAttributesG variable with the sampleAttributes context value
  useEffect(() => {
    sampleAttributesG = sampleAttributes;
  }, [sampleAttributes]);

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
