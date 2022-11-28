import { useCallback, useContext, useEffect, useState } from 'react';
// contexts
import { SketchContext } from 'contexts/Sketch';

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
  const { setSelectedSampleIds } = useContext(SketchContext);

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

  return null;
}

export default MapMouseEvents;
