/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import Select from 'react-select';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { CalculateContext } from 'contexts/Calculate';
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

// --- styles (SketchButton) ---
const panelContainer = css`
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
  activeButton: string;
  onClick: () => void;
};

function SketchButton({
  label,
  iconClass,
  activeButton,
  onClick,
}: SketchButtonProps) {
  return (
    <button
      id={label}
      title={label}
      className={
        activeButton === label ? 'sketch-button-selected' : 'sketch-button'
      }
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
type SampleSelectionType = {
  value: string;
  label: string;
};

function LocateSamples() {
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
    sketchVM,
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
    setLayers([...layers, tempSketchLayer]);
    map.add(graphicsLayer);
    setSketchLayer(tempSketchLayer);
  }, [GraphicsLayer, map, layers, setLayers, sketchLayer, setSketchLayer]);

  const [numberRandomSamples, setNumberRandomSamples] = React.useState('33');
  const [
    sampleType,
    setSampleType, //
  ] = React.useState<SampleSelectionType>({ value: 'Sponge', label: 'Sponge' });
  const activeButton = '';

  // Handle a user clicking one of the sketch buttons
  function sketchButtonClick(label: string) {
    if (!sketchVM) return;

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

  // Handle a user generating random samples
  const [aoiMaskLayer, setAoiMaskLayer] = React.useState<LayerType | null>(
    null,
  );
  function randomSamples() {
    if (!sketchLayer) return;

    const url = `${totsGPServer}/Generate%20Random/execute`;

    let graphics: __esri.GraphicProperties[] = [];
    if (aoiMaskLayer?.sketchLayer?.type === 'graphics') {
      graphics = aoiMaskLayer.sketchLayer.graphics.toArray();
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
        if (!res || res.results.length === 0 || !res.results[0].value) return;

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
      })
      .catch((err) => console.error(err));
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
    <React.Fragment>
      <div css={panelContainer}>
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
      <div css={panelContainer}>
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
        <AccordionItem title={'Draw Sampling Layer'} initiallyExpanded={true}>
          <div css={sketchButtonContainerStyles}>
            <SketchButton
              label="Sponge"
              iconClass="fas fa-pen-fancy"
              activeButton={activeButton}
              onClick={() => sketchButtonClick('Sponge')}
            />
            <SketchButton
              label="Micro Vac"
              iconClass="fas fa-pen-fancy"
              activeButton={activeButton}
              onClick={() => sketchButtonClick('Micro Vac')}
            />
            <SketchButton
              label="Wet Vac"
              iconClass="fas fa-draw-polygon"
              activeButton={activeButton}
              onClick={() => sketchButtonClick('Wet Vac')}
            />
            <SketchButton
              label="Robot"
              iconClass="fas fa-draw-polygon"
              activeButton={activeButton}
              onClick={() => sketchButtonClick('Robot')}
            />
            <SketchButton
              label="Aggressive Air"
              iconClass="fas fa-draw-polygon"
              activeButton={activeButton}
              onClick={() => sketchButtonClick('Aggressive Air')}
            />
            <SketchButton
              label="Swab"
              iconClass="fas fa-pen-fancy"
              activeButton={activeButton}
              onClick={() => sketchButtonClick('Swab')}
            />
          </div>
        </AccordionItem>
        <AccordionItem title={'Add Multiple Random Samples'}>
          <div css={panelContainer}>
            <label htmlFor="number-of-samples-input">Number of Samples</label>
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
            <label htmlFor="aoi-mask-select">AOI Mask</label>
            <Select
              inputId="aoi-mask-select"
              value={aoiMaskLayer}
              onChange={(ev) => setAoiMaskLayer(ev as LayerType)}
              options={layers.filter(
                (layer) => layer.layerType === 'Area of Interest',
              )}
            />
            {numberRandomSamples && aoiMaskLayer && (
              <button css={submitButtonStyles} onClick={randomSamples}>
                Submit
              </button>
            )}
          </div>
        </AccordionItem>
        <AccordionItem title={'Include Contamination Map (Optional)'}>
          <div css={panelContainer}>
            <label htmlFor="contamination-map-select">Contamination map</label>
            <div>
              <Select
                inputId="contamination-map-select"
                value={contaminationMap}
                onChange={(ev) => setContaminationMap(ev as LayerType)}
                options={layers.filter(
                  (layer: any) => layer.layerType === 'Contamination Map',
                )}
              />
            </div>
          </div>
        </AccordionItem>
      </AccordionList>
    </React.Fragment>
  );
}

export default LocateSamples;
