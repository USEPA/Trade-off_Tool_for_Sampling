/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import Select from 'react-select';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import MessageBox from 'components/MessageBox';
import NavigationButton from 'components/NavigationButton';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { CalculateContext } from 'contexts/Calculate';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
// config
import { freeFormTypes, predefinedBoxTypes } from 'config/sampleAttributes';
import { polygonSymbol } from 'config/symbols';
import { totsGPServer } from 'config/webService';
// utils
import { updateLayerEdits } from 'utils/sketchUtils';
import { fetchPost } from 'utils/fetchUtils';
// styles
import { colors } from 'styles';

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

const contaminationMapSelectStyles = css`
  width: 100%;
`;

const orStyles = css`
  margin: 0 5px;
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

const saveButtonContainerStyles = css`
  display: flex;
  justify-content: flex-end;
`;

const saveButtonStyles = (status: string) => {
  let backgroundColor = '';
  if (status === 'success') {
    backgroundColor = `background-color: ${colors.green()};`;
  }
  if (status === 'failure') {
    backgroundColor = `background-color: ${colors.red()};`;
  }

  return css`
    margin: 5px 0;
    ${backgroundColor}
  `;
};

// --- components (LocateSamples) ---
type GenerateRandomType = {
  status: '' | 'fetching' | 'success' | 'failure';
  data: __esri.Graphic[];
};

type SampleSelectionType = {
  value: string;
  label: string;
};

function LocateSamples() {
  const { setGoTo, setGoToOptions } = React.useContext(NavigationContext);
  const {
    contaminationMap,
    setContaminationMap, //
  } = React.useContext(CalculateContext);
  const {
    edits,
    setEdits,
    layers,
    setLayers,
    map,
    sketchLayer,
    setSketchLayer,
    aoiSketchLayer,
    setAoiSketchLayer,
    sketchVM,
    aoiSketchVM,
  } = React.useContext(SketchContext);
  const {
    Collection,
    FeatureSet,
    Graphic,
    GraphicsLayer,
    Polygon,
  } = useEsriModulesContext();

  // Sets the sketchLayer to the first layer in the layer selection drop down,
  // if available. If the drop down is empty, an empty sketchLayer will be
  // created.
  React.useEffect(() => {
    if (!map || sketchLayer) return;

    // get the first layer that can be used for sketching and return
    const sketchableLayers = getSketchableLayers(layers);
    if (sketchableLayers.length > 0) {
      setSketchLayer(sketchableLayers[0]);
      return;
    }

    // no sketchable layers were available, create one
    const graphicsLayer = new GraphicsLayer({ title: 'Sketch Layer' });

    const tempSketchLayer: LayerType = {
      id: -1,
      layerId: graphicsLayer.id,
      value: 'sketchLayer',
      name: 'Default Sample Layer',
      label: 'Default Sample Layer',
      layerType: 'Samples',
      scenarioName: '',
      scenarioDescription: '',
      defaultVisibility: true,
      geometryType: 'esriGeometryPolygon',
      addedFrom: 'sketch',
      sketchLayer: graphicsLayer,
    };

    // add the sketch layer to the map
    setLayers((layers) => {
      return [...layers, tempSketchLayer];
    });
    map.add(graphicsLayer);
    setSketchLayer(tempSketchLayer);
  }, [GraphicsLayer, map, layers, setLayers, sketchLayer, setSketchLayer]);

  // Initializes the aoi layer for performance reasons
  const [aoiLayerInitialized, setAoiLayerInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!map || aoiLayerInitialized) return;

    // get the first layer that can be used for aoi sketching and return
    const sketchableLayers = getSketchableAoiLayers(layers);
    if (sketchableLayers.length > 0) {
      setAoiSketchLayer(sketchableLayers[0]);
      setAoiLayerInitialized(true);
      return;
    }

    const graphicsLayer = new GraphicsLayer({
      title: 'Sketched Area of Interest',
    });
    const aoiSketchLayer: LayerType = {
      id: -1,
      layerId: graphicsLayer.id,
      value: 'sketchAoi',
      name: 'Sketched Area of Interest',
      label: 'Sketched Area of Interest',
      layerType: 'Area of Interest',
      scenarioName: '',
      scenarioDescription: '',
      defaultVisibility: true,
      geometryType: 'esriGeometryPolygon',
      addedFrom: 'sketch',
      sketchLayer: graphicsLayer,
    };

    // add the layer to the map
    setLayers((layers) => {
      return [...layers, aoiSketchLayer];
    });
    setAoiSketchLayer(aoiSketchLayer);
    map.add(graphicsLayer);

    setAoiLayerInitialized(true);
  }, [
    GraphicsLayer,
    map,
    layers,
    setLayers,
    aoiLayerInitialized,
    setAoiSketchLayer,
  ]);

  const [numberRandomSamples, setNumberRandomSamples] = React.useState('33');
  const [
    sampleType,
    setSampleType, //
  ] = React.useState<SampleSelectionType>({ value: 'Sponge', label: 'Sponge' });

  // Handle a user clicking one of the sketch buttons
  function sketchButtonClick(label: string) {
    if (!sketchVM) return;

    // save changes from other sketchVM
    if (aoiSketchVM) aoiSketchVM.complete();

    // determine whether the sketch button draws points or polygons
    let shapeType;
    if (predefinedBoxTypes.includes(label)) {
      shapeType = 'point';
    }
    if (freeFormTypes.includes(label)) {
      shapeType = 'polygon';
    }

    // catch all for shape types
    if (!shapeType) {
      alert(`The ${label} type is not recognized.`);
      return;
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
    if (!map || !aoiSketchVM) return;

    // save changes from other sketchVM
    if (sketchVM) sketchVM.complete();

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
    status: '',
    data: [],
  });
  function randomSamples() {
    if (!sketchLayer) return;

    setGenerateRandomResponse({ status: 'fetching', data: [] });
    const url = `${totsGPServer}/Generate%20Random/execute`;

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
      ],
      features: graphics,
    });

    const props = {
      f: 'json',
      Number_of_Samples: numberRandomSamples,
      Sample_Type: sampleType.value,
      Area_of_Interest_Mask: featureSet.toJSON(),
    };
    console.log('props: ', JSON.stringify(props));

    fetchPost(url, props)
      .then((res: any) => {
        if (!res || res.results.length === 0 || !res.results[0].value) {
          setGenerateRandomResponse({ status: 'failure', data: [] });
          return;
        }

        // get the results from the response
        const results = res.results[0].value;

        // build an array of graphics to draw on the map
        const graphicsToAdd: __esri.Graphic[] = [];
        results.features.forEach((feature: any) => {
          graphicsToAdd.push(
            new Graphic({
              attributes: feature.attributes,
              symbol: polygonSymbol,
              geometry: new Polygon({
                rings: feature.geometry.rings,
                spatialReference: results.spatialReference,
              }),
            }),
          );
        });

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
        }

        setGenerateRandomResponse({ status: 'success', data: graphicsToAdd });
      })
      .catch((err) => {
        console.error(err);
        setGenerateRandomResponse({ status: 'failure', data: [] });
      });
  }

  const [
    saveStatus,
    setSaveStatus, //
  ] = React.useState<'' | 'changes' | 'success' | 'failure'>('');
  function updateLayersState(sketchLayer: LayerType) {
    // find the layer being edited
    const index = layers.findIndex(
      (layer) => layer.id === sketchLayer.id && layer.name === sketchLayer.name,
    );

    if (index === -1) {
      setSaveStatus('failure');
    } else {
      // make a copy of the edits context variable
      const editsCopy = updateLayerEdits({
        edits,
        layer: sketchLayer,
        type: 'properties',
      });
      setEdits(editsCopy);

      // updated the edited layer
      setLayers([
        ...layers.slice(0, index),
        sketchLayer,
        ...layers.slice(index + 1),
      ]);
      setSaveStatus('success');
    }
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
          <label htmlFor="sampling-layer-select">Specify Sampling Layer</label>
          <Select
            inputId="sampling-layer-select"
            css={layerSelectStyles}
            value={sketchLayer}
            onChange={(ev) => setSketchLayer(ev as LayerType)}
            options={getSketchableLayers(layers)}
          />

          {sketchLayer && (
            <React.Fragment>
              <label htmlFor="scenario-name-input">Scenario Name</label>
              <input
                id="scenario-name-input"
                disabled={!sketchLayer}
                css={inputStyles}
                value={sketchLayer.scenarioName}
                onChange={(ev) => {
                  const newValue = ev.target.value;
                  setSaveStatus('changes');
                  if (sketchLayer) {
                    setSketchLayer((sketchLayer: LayerType | null) => {
                      if (!sketchLayer) return sketchLayer;
                      return { ...sketchLayer, scenarioName: newValue };
                    });
                  }
                }}
              />

              <label htmlFor="scenario-description-input">
                Scenario Description
              </label>
              <input
                id="scenario-description-input"
                disabled={!sketchLayer}
                css={inputStyles}
                value={sketchLayer.scenarioDescription}
                onChange={(ev) => {
                  const newValue = ev.target.value;
                  setSaveStatus('changes');
                  if (sketchLayer) {
                    setSketchLayer((sketchLayer: LayerType | null) => {
                      if (!sketchLayer) return sketchLayer;
                      return { ...sketchLayer, scenarioDescription: newValue };
                    });
                  }
                }}
              />

              <div css={saveButtonContainerStyles}>
                <button
                  css={saveButtonStyles(saveStatus)}
                  disabled={saveStatus !== 'changes'}
                  onClick={(ev) => {
                    if (sketchLayer) updateLayersState(sketchLayer);
                  }}
                >
                  {(!saveStatus || saveStatus === 'changes') && 'Save'}
                  {saveStatus === 'success' && (
                    <React.Fragment>
                      <i className="fas fa-check" /> Saved
                    </React.Fragment>
                  )}
                  {saveStatus === 'failure' && (
                    <React.Fragment>
                      <i className="fas fa-exclamation-triangle" /> Error
                    </React.Fragment>
                  )}
                </button>
              </div>
            </React.Fragment>
          )}
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
              {sketchLayer?.layerType === 'VSP' && (
                <MessageBox
                  severity="warning"
                  title="Cannot Use With VSP"
                  message="Multiple Random Samples cannot be used in combination with VSP-Created Sampling Plans"
                />
              )}
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
                  <label htmlFor="sample-type-select">Sample Type</label>
                  <Select
                    inputId="sample-type-select"
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
                  <label htmlFor="aoi-mask-select">Area of Interest Mask</label>
                  <Select
                    inputId="aoi-mask-select"
                    isClearable={true}
                    value={aoiSketchLayer}
                    onChange={(ev) => setAoiSketchLayer(ev as LayerType)}
                    options={layers.filter(
                      (layer) => layer.layerType === 'Area of Interest',
                    )}
                  />
                  <br />
                  <div css={centerTextStyles}>
                    <em>OR</em>
                  </div>
                  <div css={inlineMenuStyles}>
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
                  {generateRandomResponse.status === 'success' && (
                    <MessageBox
                      severity="info"
                      title="Samples Added"
                      message={`${generateRandomResponse.data.length} samples added to the "${sketchLayer?.name}" layer`}
                    />
                  )}
                  {generateRandomResponse.status === 'failure' && (
                    <MessageBox
                      severity="error"
                      title="Web Service Error"
                      message="An error occurred in the web service"
                    />
                  )}
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
          <AccordionItem title={'Include Contamination Map (Optional)'}>
            <div css={sectionContainer}>
              <label htmlFor="contamination-map-select">
                Contamination map
              </label>
              <div css={inlineMenuStyles}>
                <Select
                  inputId="contamination-map-select"
                  css={contaminationMapSelectStyles}
                  isClearable={true}
                  value={contaminationMap}
                  onChange={(ev) => setContaminationMap(ev as LayerType)}
                  options={layers.filter(
                    (layer: any) => layer.layerType === 'Contamination Map',
                  )}
                />
                <em css={orStyles}>OR</em>
                <button
                  css={addButtonStyles}
                  onClick={(ev) => {
                    setGoTo('addData');
                    setGoToOptions({
                      from: 'file',
                      layerType: 'Contamination Map',
                    });
                  }}
                >
                  Add
                </button>
              </div>
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
