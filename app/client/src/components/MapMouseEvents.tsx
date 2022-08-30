import { useCallback, useContext, useEffect, useState } from 'react';
import Collection from '@arcgis/core/core/Collection';
// contexts
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// utils
import { updateLayerEdits } from 'utils/sketchUtils';

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
};

function MapMouseEvents({ mapView }: Props) {
  const { setTablePanelExpanded } = useContext(NavigationContext);
  const { edits, setEdits, layers, setSelectedSampleIds } =
    useContext(SketchContext);

  const handleMapClick = useCallback(
    (event: any, mapView: __esri.MapView) => {
      // perform a hittest on the click location
      mapView
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

          // get list of graphic ids currently in the popup
          const curIds: string[] = [];
          mapView.popup.features.forEach((feature: any) => {
            if (feature.attributes?.PERMANENT_IDENTIFIER) {
              curIds.push(feature.attributes.PERMANENT_IDENTIFIER);
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
            const firstGeometry = popupItems[0].geometry as any;
            mapView.popup.open({
              location:
                firstGeometry.type === 'point'
                  ? firstGeometry
                  : firstGeometry.centroid,
              features: popupItems,
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

    // setup the mouse click and mouse over events
    mapView.on('click', (event) => {
      handleMapClick(event, mapView);
    });

    setInitialized(true);
  }, [mapView, handleMapClick, initialized]);

  const [sampleToDelete, setSampleToDelete] = useState<__esri.Graphic | null>(
    null,
  );
  useEffect(() => {
    if (!sampleToDelete) return;

    const changes = new Collection<__esri.Graphic>();
    changes.add(sampleToDelete);

    // find the layer
    const layer = layers.find(
      (layer) =>
        layer.layerId === sampleToDelete.layer.id.replace('-points', ''),
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

    // Find the original point graphic and remove it
    let graphicsToRemove: __esri.Graphic[] = [];
    layer.sketchLayer.graphics.forEach((polygonVersion) => {
      if (
        sampleToDelete.attributes.PERMANENT_IDENTIFIER ===
        polygonVersion.attributes.PERMANENT_IDENTIFIER
      ) {
        graphicsToRemove.push(polygonVersion);
      }
    });
    layer.sketchLayer.removeMany(graphicsToRemove);

    if (!layer.pointsLayer) return;

    // Find the original point graphic and remove it
    graphicsToRemove = [];
    layer.pointsLayer.graphics.forEach((pointVersion) => {
      if (
        sampleToDelete.attributes.PERMANENT_IDENTIFIER ===
        pointVersion.attributes.PERMANENT_IDENTIFIER
      ) {
        graphicsToRemove.push(pointVersion);
      }
    });
    layer.pointsLayer.removeMany(graphicsToRemove);

    // close the popup
    mapView?.popup.close();

    setSampleToDelete(null);
  }, [edits, setEdits, layers, mapView, sampleToDelete]);

  const [popupActionsInitialized, setPopupActionsInitialized] = useState(false);
  useEffect(() => {
    if (!mapView || popupActionsInitialized) return;

    setPopupActionsInitialized(true);

    const tempMapView = mapView as any;
    tempMapView.popup._displayActionTextLimit = 1;

    mapView.popup.on('trigger-action', (event) => {
      // Workaround for target not being on the PopupTriggerActionEvent
      if (event.action.id === 'delete' && mapView?.popup?.selectedFeature) {
        setSampleToDelete(mapView.popup.selectedFeature);
      }
      if (event.action.id === 'table') {
        setTablePanelExpanded(true);
      }
    });
  }, [popupActionsInitialized, mapView, setTablePanelExpanded]);

  return null;
}

export default MapMouseEvents;
