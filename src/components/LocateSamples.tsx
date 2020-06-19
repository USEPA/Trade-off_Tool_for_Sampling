/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import EditLayerMetaData from 'components/EditLayerMetaData';
import Select from 'components/Select';
import NavigationButton from 'components/NavigationButton';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
// config
import { predefinedBoxTypes } from 'config/sampleAttributes';
import { polygonSymbol } from 'config/symbols';
import { totsGPServer } from 'config/webService';
import {
  cantUseWithVspMessage,
  generateRandomExceededTransferLimitMessage,
  generateRandomSuccessMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
// utils
import {
  getCurrentDateTime,
  getPopupTemplate,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { geoprocessorFetch } from 'utils/fetchUtils';

// gets an array of layers that can be used with the sketch widget.
function getSketchableLayers(layers: LayerType[]) {
  return layers.filter(
    (layer) => layer.layerType === 'Samples' || layer.layerType === 'VSP',
  );
}

// gets an array of layers that can be used with the aoi sketch widget.
function getSketchableAoiLayers(layers: LayerType[]) {
  return layers.filter((layer) => layer.layerType === 'Area of Interest');
}

// --- styles (SketchButton) ---
const panelContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
`;

const sectionContainer = css`
  padding: 20px;
`;

const layerSelectStyles = css`
  margin-bottom: 10px;
`;

const sketchButtonContainerStyles = css`
  padding: 20px;
  margin-left: 1px;
  margin-top: 1px;

  .sketch-button-selected {
    background-color: #f0f0f0;
  }
`;

const sketchButtonStyles = css`
  position: relative;
  width: 33.33%;
  background-color: white;
  color: black;
  border: 1px solid #ccc;
  border-radius: 0;
  margin: 0 0 -1px -1px;

  &::before,
  &::after {
    content: '';
    display: block;
    padding-top: 50%;
  }

  &:hover,
  &:focus {
    background-color: #f0f0f0;
    cursor: pointer;
  }
`;

const textStyles = css`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  line-height: 100%;
  height: 100%;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const centerTextStyles = css`
  text-align: center;
`;

const sketchAoiButtonStyles = css`
  background-color: white;
  color: black;
  margin: 0 5px 0 0;

  &:hover,
  &:focus {
    background-color: #f0f0f0;
    cursor: pointer;
  }
`;

const sketchAoiTextStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;

  i {
    font-size: 20px;
    margin-right: 5px;
  }
`;

const inlineMenuStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const addButtonStyles = css`
  margin: 0;
  height: 38px; /* same height as ReactSelect */
`;

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const submitButtonStyles = css`
  margin-top: 10px;
`;

// --- components (SketchButton) ---
type SketchButtonProps = {
  label: string;
  iconClass: string;
  onClick: () => void;
};

function SketchButton({ label, iconClass, onClick }: SketchButtonProps) {
  return (
    <button
      id={label}
      title={label}
      className="sketch-button"
      onClick={() => onClick()}
      css={sketchButtonStyles}
    >
      <div css={textStyles}>
        <div>
          <i className={iconClass} />
          <br />
          {label}
        </div>
      </div>
    </button>
  );
}

// --- styles (LocateSamples) ---
const headerContainer = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const deleteButtonStyles = css`
  width: 75px;
  margin-bottom: 0;
  padding: 0.25em 0;
  color: black;
  background-color: white;
  border-radius: 0;
  line-height: 16px;
  text-decoration-line: none;
  font-weight: bold;

  &:hover {
    background-color: white;
  }
`;

const lineSeparatorStyles = css`
  border-bottom: 1px solid #d8dfe2;
`;

// --- components (LocateSamples) ---
type GenerateRandomType = {
  status: 'none' | 'fetching' | 'success' | 'failure' | 'exceededTransferLimit';
  data: __esri.Graphic[];
};

type SampleSelectionType = {
  value: string;
  label: string;
};

function LocateSamples() {
  const { setGoTo, setGoToOptions, trainingMode } = React.useContext(
    NavigationContext,
  );
  const {
    edits,
    setEdits,
    layersInitialized,
    layers,
    setLayers,
    map,
    sketchLayer,
    setSketchLayer,
    aoiSketchLayer,
    setAoiSketchLayer,
    sketchVM,
    aoiSketchVM,
    getGpMaxRecordCount,
  } = React.useContext(SketchContext);
  const {
    Collection,
    FeatureSet,
    Geoprocessor,
    Graphic,
    GraphicsLayer,
    Polygon,
  } = useEsriModulesContext();

  // Sets the sketchLayer to the first layer in the layer selection drop down,
  // if available. If the drop down is empty, an empty sketchLayer will be
  // created.
  const [
    sketchLayerInitialized,
    setSketchLayerInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (!map || !layersInitialized || sketchLayerInitialized) return;

    // get the first layer that can be used for sketching and return
    const sketchableLayers = getSketchableLayers(layers);
    if (!sketchLayer && sketchableLayers.length > 0) {
      setSketchLayer(sketchableLayers[0]);
    }

    setSketchLayerInitialized(true);

    // check if the default sketch layer has been added already or not
    const defaultIndex = sketchableLayers.findIndex(
      (layer) => layer.name === 'Default Sample Layer',
    );
    if (defaultIndex > -1) return;

    // no sketchable layers were available, create one
    const graphicsLayer = new GraphicsLayer({ title: 'Default Sample Layer' });

    const tempSketchLayer: LayerType = {
      id: -1,
      layerId: graphicsLayer.id,
      portalId: '',
      value: 'sketchLayer',
      name: 'Default Sample Layer',
      label: 'Default Sample Layer',
      layerType: 'Samples',
      scenarioName: '',
      scenarioDescription: '',
      editType: 'add',
      defaultVisibility: true,
      geometryType: 'esriGeometryPolygon',
      addedFrom: 'sketch',
      status: 'added',
      sketchLayer: graphicsLayer,
    };

    // add the sketch layer to the map
    setLayers((layers) => {
      return [...layers, tempSketchLayer];
    });

    // if the sketch layer wasn't set above, set it now
    if (!sketchLayer && sketchableLayers.length === 0) {
      setSketchLayer(tempSketchLayer);
    }
  }, [
    GraphicsLayer,
    map,
    layersInitialized,
    layers,
    setLayers,
    sketchLayer,
    setSketchLayer,
    sketchLayerInitialized,
  ]);

  // Initializes the aoi layer for performance reasons
  const [aoiLayerInitialized, setAoiLayerInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!map || !layersInitialized || aoiLayerInitialized) return;

    // get the first layer that can be used for aoi sketching and return
    const sketchableLayers = getSketchableAoiLayers(layers);
    if (!aoiSketchLayer && sketchableLayers.length > 0) {
      setAoiSketchLayer(sketchableLayers[0]);
    }

    setAoiLayerInitialized(true);

    // check if the default sketch layer has been added already or not
    const defaultIndex = sketchableLayers.findIndex(
      (layer) => layer.name === 'Sketched Area of Interest',
    );
    if (defaultIndex > -1) return;

    const graphicsLayer = new GraphicsLayer({
      title: 'Sketched Area of Interest',
    });
    const newAoiSketchLayer: LayerType = {
      id: -1,
      layerId: graphicsLayer.id,
      portalId: '',
      value: 'sketchAoi',
      name: 'Sketched Area of Interest',
      label: 'Sketched Area of Interest',
      layerType: 'Area of Interest',
      scenarioName: '',
      scenarioDescription: '',
      editType: 'add',
      defaultVisibility: true,
      geometryType: 'esriGeometryPolygon',
      addedFrom: 'sketch',
      status: 'added',
      sketchLayer: graphicsLayer,
    };

    // add the layer to the map
    setLayers((layers) => {
      return [...layers, newAoiSketchLayer];
    });

    // set the active sketch layer
    if (!aoiSketchLayer && sketchableLayers.length === 0) {
      setAoiSketchLayer(newAoiSketchLayer);
    }
  }, [
    GraphicsLayer,
    map,
    layersInitialized,
    layers,
    setLayers,
    aoiLayerInitialized,
    aoiSketchLayer,
    setAoiSketchLayer,
  ]);

  const [numberRandomSamples, setNumberRandomSamples] = React.useState('33');
  const [
    sampleType,
    setSampleType, //
  ] = React.useState<SampleSelectionType>({ value: 'Sponge', label: 'Sponge' });

  // Handle a user clicking one of the sketch buttons
  function sketchButtonClick(label: string) {
    if (!sketchVM || !map || !sketchLayer) return;

    // put the sketch layer on the map, if it isn't there already
    const layerIndex = map.layers.findIndex(
      (layer) => layer.id === sketchLayer.layerId,
    );
    if (layerIndex === -1) map.add(sketchLayer.sketchLayer);

    // save changes from other sketchVM and disable to prevent
    // interference
    if (aoiSketchVM) {
      aoiSketchVM.complete();
      aoiSketchVM.layer = (null as unknown) as __esri.GraphicsLayer;
    }

    // determine whether the sketch button draws points or polygons
    let shapeType = 'polygon';
    if (predefinedBoxTypes.includes(label)) {
      shapeType = 'point';
    }

    // disable popups for the active sketch layer, so the user doesn't
    // get shape edit controls and a popup at the same time.
    if (map) {
      map.layers.forEach((layer: any) => {
        // had to use any, since some layer types don't have popupEnabled
        if (layer.popupEnabled) layer.popupEnabled = false;
      });
    }

    // let the user draw/place the shape
    sketchVM.create(shapeType);

    // make the style of the button active
    const elem = document.getElementById(label);
    if (elem) elem.classList.add('sketch-button-selected');
  }

  // Handle a user clicking the sketch AOI button. If an AOI is not selected from the
  // dropdown this will create an AOI layer. This also sets the sketchVM to use the
  // selected AOI and triggers a React useEffect to allow the user to sketch on the map.
  function sketchAoiButtonClick() {
    if (!map || !aoiSketchVM || !aoiSketchLayer) return;

    // put the sketch layer on the map, if it isn't there already
    const layerIndex = map.layers.findIndex(
      (layer) => layer.id === aoiSketchLayer.layerId,
    );
    if (layerIndex === -1) map.add(aoiSketchLayer.sketchLayer);

    // save changes from other sketchVM and disable to prevent
    // interference
    if (sketchVM) {
      sketchVM.complete();
      sketchVM.layer = (null as unknown) as __esri.GraphicsLayer;
    }

    // activate the sketch tool
    aoiSketchVM.create('polygon');

    // disable popups for the active sketch layer, so the user doesn't
    // get shape edit controls and a popup at the same time.
    if (map) {
      map.layers.forEach((layer: any) => {
        // had to use any, since some layer types don't have popupEnabled
        if (layer.popupEnabled) layer.popupEnabled = false;
      });
    }

    // make the style of the button active
    const elem = document.getElementById('aoi');
    if (elem) elem.classList.add('sketch-button-selected');
  }

  // Handle a user generating random samples
  const [
    generateRandomResponse,
    setGenerateRandomResponse, //
  ] = React.useState<GenerateRandomType>({
    status: 'none',
    data: [],
  });
  function randomSamples() {
    if (!map || !sketchLayer || !getGpMaxRecordCount) return;

    getGpMaxRecordCount()
      .then((maxRecordCount) => {
        setGenerateRandomResponse({ status: 'fetching', data: [] });
        let graphics: __esri.GraphicProperties[] = [];
        if (aoiSketchLayer?.sketchLayer?.type === 'graphics') {
          graphics = aoiSketchLayer.sketchLayer.graphics.toArray();
        }

        // create a feature set for communicating with the GPServer
        const featureSet = new FeatureSet({
          displayFieldName: '',
          geometryType: 'polygon',
          spatialReference: {
            wkid: 3857,
          },
          fields: [
            {
              name: 'OBJECTID',
              type: 'oid',
              alias: 'OBJECTID',
            },
            {
              name: 'PERMANENT_IDENTIFIER',
              type: 'guid',
              alias: 'PERMANENT_IDENTIFIER',
            },
          ],
          features: graphics,
        });

        // determine the number of service calls needed to satisfy the request
        const intNumberRandomSamples = parseInt(numberRandomSamples);
        const iterations = Math.ceil(intNumberRandomSamples / maxRecordCount);

        // fire off the generateRandom requests
        const requests = [];
        let numSamples = 0;
        let numSamplesLeft = intNumberRandomSamples;
        for (let i = 0; i < iterations; i++) {
          // determine the number of samples for this request
          numSamples =
            numSamplesLeft > maxRecordCount ? maxRecordCount : numSamplesLeft;

          const props = {
            f: 'json',
            Number_of_Samples: numSamples,
            Sample_Type: sampleType.value,
            Area_of_Interest_Mask: featureSet.toJSON(),
          };
          const request = geoprocessorFetch({
            Geoprocessor,
            url: `${totsGPServer}/Generate%20Random`,
            inputParameters: props,
            useProxy: true,
          });
          requests.push(request);

          // keep track of the number of remaining samples
          numSamplesLeft = numSamplesLeft - numSamples;
        }
        Promise.all(requests)
          .then((responses: any) => {
            console.log('generateRandom responses: ', responses);
            let res;
            const timestamp = getCurrentDateTime();
            const popupTemplate = getPopupTemplate('Samples', trainingMode);
            const graphicsToAdd: __esri.Graphic[] = [];
            for (let i = 0; i < responses.length; i++) {
              res = responses[i];
              if (!res?.results?.[0]?.value) {
                setGenerateRandomResponse({ status: 'failure', data: [] });
                return;
              }

              if (res.results[0].value.exceededTransferLimit) {
                setGenerateRandomResponse({
                  status: 'exceededTransferLimit',
                  data: [],
                });
                return;
              }

              // put the sketch layer on the map, if it isn't there already
              const layerIndex = map.layers.findIndex(
                (layer) => layer.id === sketchLayer.layerId,
              );
              if (layerIndex === -1) map.add(sketchLayer.sketchLayer);

              // get the results from the response
              const results = res.results[0].value;

              // build an array of graphics to draw on the map
              results.features.forEach((feature: any) => {
                graphicsToAdd.push(
                  new Graphic({
                    attributes: {
                      ...feature.attributes,
                      CREATEDDATE: timestamp,
                    },
                    symbol: polygonSymbol,
                    geometry: new Polygon({
                      rings: feature.geometry.rings,
                      spatialReference: results.spatialReference,
                    }),
                    popupTemplate,
                  }),
                );
              });
            }

            // put the graphics on the map
            if (sketchLayer?.sketchLayer?.type === 'graphics') {
              // add the graphics to a collection so it can added to browser storage
              const collection = new Collection<__esri.Graphic>();
              collection.addMany(graphicsToAdd);
              sketchLayer.sketchLayer.graphics.addMany(collection);

              const editsCopy = updateLayerEdits({
                edits,
                layer: sketchLayer,
                type: 'add',
                changes: collection,
              });

              // update the edits state
              setEdits(editsCopy);

              // update the editType of the sketchLayer
              setSketchLayer((sketchLayer: LayerType | null) => {
                if (!sketchLayer) return sketchLayer;
                return {
                  ...sketchLayer,
                  editType: 'add',
                };
              });
            }

            setGenerateRandomResponse({
              status: 'success',
              data: graphicsToAdd,
            });
          })
          .catch((err) => {
            console.error(err);
            setGenerateRandomResponse({ status: 'failure', data: [] });
          });
      })
      .catch((err: any) => {
        console.error(err);
        setGenerateRandomResponse({ status: 'failure', data: [] });
      });
  }

  return (
    <div css={panelContainer}>
      <div>
        <div css={sectionContainer}>
          <div css={headerContainer}>
            <h2>Create Plan</h2>
            <button
              css={deleteButtonStyles}
              onClick={() => {
                if (!sketchVM || !sketchLayer) return;

                // make a copy of the edits context variable
                const editsCopy = updateLayerEdits({
                  edits,
                  layer: sketchLayer,
                  type: 'delete',
                  changes: sketchVM.layer.graphics,
                });

                setEdits(editsCopy);

                sketchVM.layer.removeAll();
              }}
            >
              <i className="fas fa-trash-alt" />
              <br />
              Delete All Samples
            </button>
          </div>
        </div>
        <div css={lineSeparatorStyles} />
        <div css={sectionContainer}>
          <p>
            Specify a sampling layer for your project and enter a scenario name
            and description for the plan. The scenario name will become the
            feature layer name if published to your ArcGIS Online account in the{' '}
            <strong>Publish Plan</strong> step.
          </p>
          <label htmlFor="sampling-layer-select-input">
            Specify Sampling Layer
          </label>
          <Select
            id="sampling-layer-select"
            inputId="sampling-layer-select-input"
            css={layerSelectStyles}
            value={sketchLayer}
            onChange={(ev) => setSketchLayer(ev as LayerType)}
            options={getSketchableLayers(layers)}
          />

          <EditLayerMetaData />
        </div>
        <div css={sectionContainer}>
          <p>
            In the panels below, add targeted and/ or multiple samples to the
            plan.
          </p>
        </div>
        <AccordionList>
          <AccordionItem
            title={'Add Targeted Samples'}
            initiallyExpanded={true}
          >
            <div css={sketchButtonContainerStyles}>
              <SketchButton
                label="Sponge"
                iconClass="fas fa-pen-fancy"
                onClick={() => sketchButtonClick('Sponge')}
              />
              <SketchButton
                label="Micro Vac"
                iconClass="fas fa-pen-fancy"
                onClick={() => sketchButtonClick('Micro Vac')}
              />
              <SketchButton
                label="Wet Vac"
                iconClass="fas fa-draw-polygon"
                onClick={() => sketchButtonClick('Wet Vac')}
              />
              <SketchButton
                label="Robot"
                iconClass="fas fa-draw-polygon"
                onClick={() => sketchButtonClick('Robot')}
              />
              <SketchButton
                label="Aggressive Air"
                iconClass="fas fa-draw-polygon"
                onClick={() => sketchButtonClick('Aggressive Air')}
              />
              <SketchButton
                label="Swab"
                iconClass="fas fa-pen-fancy"
                onClick={() => sketchButtonClick('Swab')}
              />
            </div>
          </AccordionItem>
          <AccordionItem title={'Add Multiple Random Samples'}>
            <div css={sectionContainer}>
              {sketchLayer?.layerType === 'VSP' && cantUseWithVspMessage}
              {sketchLayer?.layerType !== 'VSP' && (
                <React.Fragment>
                  <label htmlFor="number-of-samples-input">
                    Number of Samples
                  </label>
                  <input
                    id="number-of-samples-input"
                    css={inputStyles}
                    value={numberRandomSamples}
                    onChange={(ev) => setNumberRandomSamples(ev.target.value)}
                  />
                  <label htmlFor="sample-type-select-input">Sample Type</label>
                  <Select
                    id="sample-type-select"
                    inputId="sample-type-select-input"
                    value={sampleType}
                    onChange={(ev) => setSampleType(ev as SampleSelectionType)}
                    options={[
                      { value: 'Sponge', label: 'Sponge' },
                      { value: 'Micro Vac', label: 'Micro Vac' },
                      { value: 'Wet Vac', label: 'Wet Vac' },
                      { value: 'Robot', label: 'Robot' },
                      { value: 'Aggressive Air', label: 'Aggressive Air' },
                      { value: 'Swab', label: 'Swab' },
                    ]}
                  />
                  <label htmlFor="aoi-mask-select-input">
                    Area of Interest Mask
                  </label>
                  <div css={inlineMenuStyles}>
                    <Select
                      id="aoi-mask-select"
                      inputId="aoi-mask-select-input"
                      css={fullWidthSelectStyles}
                      isClearable={true}
                      value={aoiSketchLayer}
                      onChange={(ev) => setAoiSketchLayer(ev as LayerType)}
                      options={layers.filter(
                        (layer) => layer.layerType === 'Area of Interest',
                      )}
                    />
                    <button
                      css={addButtonStyles}
                      onClick={(ev) => {
                        setGoTo('addData');
                        setGoToOptions({
                          from: 'file',
                          layerType: 'Area of Interest',
                        });
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <br />
                  <div css={centerTextStyles}>
                    <em>OR</em>
                  </div>
                  <button
                    id="aoi"
                    title="Draw Area of Interest Mask"
                    className="sketch-button"
                    onClick={sketchAoiButtonClick}
                    css={sketchAoiButtonStyles}
                  >
                    <span css={sketchAoiTextStyles}>
                      <i className="fas fa-draw-polygon" />{' '}
                      <span>Draw Area of Interest Mask</span>
                    </span>
                  </button>
                  {generateRandomResponse.status === 'success' &&
                    sketchLayer &&
                    generateRandomSuccessMessage(
                      generateRandomResponse.data.length,
                      sketchLayer.label,
                    )}
                  {generateRandomResponse.status === 'failure' &&
                    webServiceErrorMessage}
                  {generateRandomResponse.status === 'exceededTransferLimit' &&
                    generateRandomExceededTransferLimitMessage}
                  {numberRandomSamples &&
                    aoiSketchLayer?.sketchLayer.type === 'graphics' &&
                    aoiSketchLayer.sketchLayer.graphics.length > 0 && (
                      <button css={submitButtonStyles} onClick={randomSamples}>
                        {generateRandomResponse.status !== 'fetching' &&
                          'Submit'}
                        {generateRandomResponse.status === 'fetching' && (
                          <React.Fragment>
                            <i className="fas fa-spinner fa-pulse" />
                            &nbsp;&nbsp;Loading...
                          </React.Fragment>
                        )}
                      </button>
                    )}
                </React.Fragment>
              )}
            </div>
          </AccordionItem>
        </AccordionList>
      </div>
      <div css={sectionContainer}>
        <NavigationButton goToPanel="calculate" />
      </div>
    </div>
  );
}

export default LocateSamples;
