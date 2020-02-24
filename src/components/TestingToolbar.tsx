/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// import CreatableSelect from 'react-select/creatable';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
// import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';
// config
import { epaMarginOffset } from 'config/appConfig';
// import { polygonSymbol } from 'config/symbols';
// utils
// import { deleteFeatureLayer, getAllFeatures } from 'utils/arcGisRestUtils';

const toolbarStyles = css`
  padding: 8px;
  background-color: lightgray;
  width: calc(100% + ${epaMarginOffset * 2 + 'px'});
  margin-left: -${epaMarginOffset}px;

  button {
    margin-bottom: 5px;
  }
`;

const buttonStyles = css`
  margin-top: 0.25rem;
  margin-right: 0.75rem;
`;

// const deleteButtonStyles = css`
//   background-color: red;
//   ${buttonStyles}
// `;

function TestingToolbar() {
  // const { GraphicsLayer, Polygon } = useEsriModulesContext();
  const { portal } = React.useContext(AuthenticationContext);
  const {
    // featureServiceUrl,
    layers,
    // setLayers,
    map,
    // selectedLayer,
    // setSelectedLayer,
    mapView,
  } = React.useContext(SketchContext);

  /* const removeLayer = (selectedLayer: any) => {
    setLayers(layers.filter((layer: any) => 
      layer.id !== selectedLayer.id || layer.name !== selectedLayer.name
    ));
    setSelectedLayer(null);
  } */

  return (
    <div css={toolbarStyles}>
      {/* <label htmlFor="layer-select">Layers: </label>
      <CreatableSelect
        inputId="layer-select"
        classNamePrefix="Select"
        options={layers}
        value={selectedLayer}
        onChange={(newValue: any, metaData: any) => {

          if(metaData.action === 'select-option') {
            if(!newValue.sketchLayer) {
              newValue.sketchLayer = new GraphicsLayer({title: 'sketchLayer'});
            }
            const sketchLayer = newValue.sketchLayer;

            // get the features on the layer
            if(newValue.queried) {
              setSelectedLayer(newValue);
            }
            else {
              const layerUrl = `${featureServiceUrl}/${newValue.id}`;
              getAllFeatures(portal, layerUrl)
                .then((res: any) => {
                  // build an array of features suitable for being put on a graphics layer
                  const features:any[] = [];
                  const spatialReference = res.spatialReference;
                  res.features.forEach((feature: any) => {
                    features.push({
                      attributes: feature.attributes,
                      geometry: new Polygon({
                        spatialReference,
                        rings: feature.geometry.rings,
                      }),
                      symbol: polygonSymbol,
                    });
                  });

                  // add the features to the graphics layer and set queried to true
                  // to prevent re-querying in the future
                  sketchLayer.graphics.addMany(features);
                  newValue.queried = true;
                  setSelectedLayer(newValue);
                })
                .catch((err) => console.error(err));
            }
          }
          if(metaData.action === 'create-option') {
            const newLayer = { 
              // select items
              value: `-1 - ${newValue.value}`,
              label: newValue.value,

              // TOTS items
              queried: true,
              sketchLayer: new GraphicsLayer({title: 'sketchLayer'}),

              // esri items
              id: -1,
              name: newValue.value,
              parentLayerId: -1,
              subLayerIds: null,
              minScale: 0,
              maxScale: 0,
              geometryType: 'esriGeometryPolygon',
            };

            setLayers([...layers, newLayer]);
            setSelectedLayer(newLayer);
          }
        }}
      />
      
      {selectedLayer && (
        <button 
          css={deleteButtonStyles}
          onClick={() => {
            // just remove the layer if it hasn't been published yet
            if(selectedLayer.id === -1) {
              removeLayer(selectedLayer);
              return;
            }

            // delete the layer from ArcGIS Online and remove it locally
            deleteFeatureLayer(portal, featureServiceUrl, selectedLayer.id)
              .then((res: any) => {
                if(res && res.success) removeLayer(selectedLayer);
              });
          }}
        >
          Delete Layer
        </button>
      )} */}
      <button
        css={buttonStyles}
        onClick={() => console.log('portal: ', portal)}
      >
        Log Portal
      </button>
      <button css={buttonStyles} onClick={() => console.log('map: ', map)}>
        Log Map
      </button>
      <button css={buttonStyles} onClick={() => console.log('view: ', mapView)}>
        Log View
      </button>
      <button
        css={buttonStyles}
        onClick={() => console.log('layers: ', layers)}
      >
        Log Layers
      </button>
      {/* <button css={buttonStyles} onClick={() => console.log('selectedLayer: ', selectedLayer)}>Log Selected Layer</button> */}
      <button
        css={buttonStyles}
        onClick={() => {
          sessionStorage.clear();
        }}
      >
        Clear Session Data
      </button>
    </div>
  );
}

export default TestingToolbar;
