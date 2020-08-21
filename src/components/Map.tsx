/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import MapWidgets from 'components/MapWidgets';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';
// utils
import { getGraphicsArray } from 'utils/sketchUtils';

// --- styles (Map) ---
const mapStyles = (height: number) => {
  return css`
    height: calc(100% - ${height}px);
    background-color: whitesmoke;
  `;
};

// --- components (Map) ---
type Props = {
  height: number;
};

function Map({ height }: Props) {
  const { EsriMap, MapView, Viewpoint } = useEsriModulesContext();

  const mapRef = React.useRef<HTMLDivElement>(null);

  const {
    autoZoom,
    homeWidget,
    map,
    setMap,
    mapView,
    setMapView,
    sketchLayer,
    aoiSketchLayer,
  } = React.useContext(SketchContext);

  // Creates the map and view
  React.useEffect(() => {
    if (!mapRef.current) return;
    if (mapView) return;

    const newMap = new EsriMap({
      basemap: 'streets',
      layers: [],
    });
    setMap(newMap);

    const view = new MapView({
      container: mapRef.current,
      map: newMap,
      center: [-95, 37],
      zoom: 3,
      popup: {
        defaultPopupTemplateEnabled: true,
      },
      spatialReference: {
        wkid: 3857,
      },
      highlightOptions: {
        color: '#32C5FD',
        fillOpacity: 1,
      },
    });

    setMapView(view);
  }, [EsriMap, MapView, mapView, setMap, setMapView]);

  // Creates a watch event that is used for reordering the layers
  const [watchInitialized, setWatchInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!map || watchInitialized) return;

    // whenever layers are added, reorder them
    map.layers.on('change', ({ added }) => {
      if (added.length === 0) return;

      // gets a layer type value used for sorting
      function getLayerType(layer: __esri.Layer) {
        const imageryTypes = ['imagery', 'tile', 'vector-tile'];
        let type = 'other';

        let groupType = '';
        if (layer.type === 'group') {
          const groupLayer = layer as __esri.GroupLayer;
          groupLayer.layers.forEach((layer, index) => {
            if (groupType === 'combo') return;

            if (index === 0) {
              groupType = layer.type;
              return;
            }

            if (groupType !== layer.type) {
              groupType = 'combo';
            }
          });
        }

        if (layer.type === 'graphics' || groupType === 'graphics') {
          type = 'graphics';
        } else if (layer.type === 'feature' || groupType === 'feature') {
          type = 'feature';
        } else if (
          imageryTypes.includes(type) ||
          imageryTypes.includes(groupType)
        ) {
          type = 'imagery';
        }

        return type;
      }

      // the layers are ordered as follows:
      // graphicsLayers (top)
      // featureLayers
      // otherLayers
      // imageryLayers (bottom)
      const sortBy = ['other', 'imagery', 'feature', 'graphics'];
      map.layers.sort((a: __esri.Layer, b: __esri.Layer) => {
        return (
          sortBy.indexOf(getLayerType(a)) - sortBy.indexOf(getLayerType(b))
        );
      });
    });

    setWatchInitialized(true);
  }, [map, watchInitialized]);

  // Zooms to the graphics whenever the sketchLayer changes
  React.useEffect(() => {
    if (!map || !mapView || !homeWidget || !autoZoom) return;
    if (!sketchLayer?.sketchLayer) return;

    const zoomGraphics = getGraphicsArray([sketchLayer, aoiSketchLayer]);

    if (zoomGraphics.length > 0) {
      mapView.goTo(zoomGraphics).then(() => {
        // set map zoom and home widget's viewpoint
        homeWidget.viewpoint = new Viewpoint({
          targetGeometry: mapView.extent,
        });
      });
    }
  }, [
    autoZoom,
    map,
    mapView,
    aoiSketchLayer,
    sketchLayer,
    homeWidget,
    Viewpoint,
  ]);

  return (
    <div ref={mapRef} css={mapStyles(height)} data-testid="tots-map">
      {mapView && <MapWidgets mapView={mapView} />}
    </div>
  );
}

export default Map;
