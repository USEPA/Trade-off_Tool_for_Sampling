/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import ColorPicker from 'components/ColorPicker';
import { EditScenario, EditLayer } from 'components/EditLayerMetaData';
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import NavigationButton from 'components/NavigationButton';
import Select from 'components/Select';
// contexts
import { DialogContext } from 'contexts/Dialog';
import { useEsriModulesContext } from 'contexts/EsriModules';
import {
  useSampleTypesContext,
  useServicesContext,
} from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
import { EditsType, ScenarioEditsType } from 'types/Edits';
// config
import { defaultLayerProps } from 'config/layerProps';
import { SampleSelectType, PolygonSymbol } from 'config/sampleAttributes';
import {
  cantUseWithVspMessage,
  featureNotAvailableMessage,
  generateRandomExceededTransferLimitMessage,
  generateRandomSuccessMessage,
  userDefinedValidationMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
// utils
import { useGeometryTools, useDynamicPopup, useStartOver } from 'utils/hooks';
import {
  findLayerInEdits,
  getCurrentDateTime,
  getDefaultSamplingMaskLayer,
  getNextScenarioLayer,
  getScenarios,
  getSketchableLayers,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { geoprocessorFetch } from 'utils/fetchUtils';
// styles
import { reactSelectStyles } from 'styles';

type ShapeTypeSelect = {
  value: string;
  label: string;
};

type EditType = 'create' | 'edit' | 'clone' | 'view';

const sketchSelectedClass = 'sketch-button-selected';

/**
 * Determines if the desired name has already been used. If it has
 * it appends in index to the end (i.e. '<desiredName> (2)').
 */
function getSampleTypeName(
  sampleTypes: SampleSelectType[],
  desiredName: string,
) {
  // get a list of names in use
  let usedNames: string[] = [];
  sampleTypes.forEach((sampleType) => {
    usedNames.push(sampleType.value);
  });

  // Find a name where there is not a collision.
  // Most of the time this loop will be skipped.
  let duplicateCount = 0;
  let newName = desiredName;
  while (usedNames.includes(newName)) {
    duplicateCount += 1;
    newName = `${desiredName} (${duplicateCount})`;
  }

  return newName;
}

function activateSketchButton(id: string) {
  let wasSet = false;
  const sketchButtons = document.getElementsByClassName('sketch-button');
  for (let i = 0; i < sketchButtons.length; i++) {
    const sketchButton = sketchButtons[i];

    // make the button active if the id matches the provided id
    if (sketchButton.id === id) {
      // make the style of the button active
      if (!sketchButton.classList.contains(sketchSelectedClass)) {
        sketchButton.classList.add(sketchSelectedClass);
        wasSet = true;
      } else {
        // toggle the button off
        sketchButton.classList.remove(sketchSelectedClass);
        const activeElm = document?.activeElement as any;
        activeElm?.blur();
      }
      continue;
    }

    // remove the selected class from all other buttons
    if (sketchButton.classList.contains(sketchSelectedClass)) {
      sketchButton.classList.remove(sketchSelectedClass);
    }
  }

  return wasSet;
}

// --- styles (SketchButton) ---
const panelContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;

  .sketch-button-selected {
    background-color: #e7f6f8;
  }

  .sketch-button-selected > div {
    border: 2px solid #01bde3;
  }
`;

const sectionContainer = css`
  padding: 20px;
`;

const sectionContainerWidthOnly = css`
  padding: 0 20px;
`;

const layerSelectStyles = css`
  margin-bottom: 10px;
`;

const sketchButtonContainerStyles = css`
  margin-left: 1px;
  margin-top: 1px;
`;

const sketchButtonStyles = css`
  position: relative;
  height: 90px;
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
    background-color: #e7f6f8;
    cursor: pointer;
  }
`;

const textContainerStyles = css`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const textStyles = css`
  max-height: 85px;
  word-break: break-word;
`;

const sketchAoiButtonStyles = css`
  background-color: white;
  color: black;

  &:hover,
  &:focus {
    background-color: #e7f6f8;
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
  margin-bottom: 10px;
`;

const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const inlineSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

const submitButtonStyles = css`
  margin-top: 10px;
`;

const sampleCountStyles = css`
  font-size: 26px;
  color: #00bde3;
`;

// --- components (SketchButton) ---
type SketchButtonProps = {
  label: string;
  iconClass: string;
  layers: LayerType[];
  onClick: () => void;
};

function SketchButton({
  label,
  iconClass,
  layers,
  onClick,
}: SketchButtonProps) {
  // put an ellipses on the end if the text is to long
  const displayLabel = label.length > 30 ? `${label.substr(0, 30)}...` : label;
  let count = 0;

  layers.forEach((layer) => {
    if (layer.layerType !== 'Samples' && layer.layerType !== 'VSP') return;
    if (layer.sketchLayer.type === 'feature') return;

    layer.sketchLayer.graphics.forEach((graphic) => {
      if (graphic.attributes.TYPE === label) count += 1;
    });
  });

  return (
    <button
      id={label}
      title={`Draw a ${label}: ${count}`}
      className="sketch-button"
      onClick={() => onClick()}
      css={sketchButtonStyles}
    >
      <div css={textContainerStyles}>
        <div css={textStyles}>
          <i className={iconClass} />
          <br />
          {displayLabel}
          {count > 0 && (
            <React.Fragment>
              <br />
              <span css={sampleCountStyles}>{count}</span>
            </React.Fragment>
          )}
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

  h2 {
    margin: 0;
    padding: 0;
  }
`;

const iconButtonContainerStyles = css`
  display: flex;
  justify-content: space-between;
`;

const iconButtonStyles = css`
  width: 25px;
  margin: 0 2px;
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

const trainingStyles = css`
  margin-left: 25px;
  font-size: 0.875rem;

  input {
    margin-right: 5px;
  }
`;

const lineSeparatorStyles = css`
  border-bottom: 1px solid #d8dfe2;
`;

const radioLabelStyles = css`
  padding-left: 0.375rem;
`;

// --- components (LocateSamples) ---
type GenerateRandomType = {
  status: 'none' | 'fetching' | 'success' | 'failure' | 'exceededTransferLimit';
  data: __esri.Graphic[];
};

function LocateSamples() {
  const { setOptions } = React.useContext(DialogContext);
  const {
    setGoTo,
    setGoToOptions,
    trainingMode,
    setTrainingMode,
  } = React.useContext(NavigationContext);
  const {
    autoZoom,
    setAutoZoom,
    defaultSymbols,
    edits,
    setEdits,
    layersInitialized,
    layers,
    setLayers,
    map,
    selectedScenario,
    setSelectedScenario,
    sketchLayer,
    setSketchLayer,
    aoiSketchLayer,
    setAoiSketchLayer,
    sketchVM,
    aoiSketchVM,
    getGpMaxRecordCount,
    sampleAttributes,
    userDefinedOptions,
    setUserDefinedOptions,
    userDefinedAttributes,
    setUserDefinedAttributes,
    allSampleOptions,
  } = React.useContext(SketchContext);
  const {
    Collection,
    FeatureSet,
    Geoprocessor,
    Graphic,
    GraphicsLayer,
    Polygon,
  } = useEsriModulesContext();
  const startOver = useStartOver();
  const { createBuffer } = useGeometryTools();
  const getPopupTemplate = useDynamicPopup();
  const sampleTypeContext = useSampleTypesContext();
  const services = useServicesContext();

  // Sets the sketchLayer to the first layer in the layer selection drop down,
  // if available. If the drop down is empty, an empty sketchLayer will be
  // created.
  const [
    sketchLayerInitialized,
    setSketchLayerInitialized, //
  ] = React.useState(false);
  React.useEffect(() => {
    if (!map || !layersInitialized || sketchLayerInitialized) return;

    setSketchLayerInitialized(true);

    const { nextScenario, nextLayer } = getNextScenarioLayer(
      edits,
      layers,
      selectedScenario,
      sketchLayer,
    );

    if (nextScenario) setSelectedScenario(nextScenario);
    if (nextLayer) setSketchLayer(nextLayer);
  }, [
    GraphicsLayer,
    edits,
    layersInitialized,
    layers,
    setLayers,
    map,
    selectedScenario,
    setSelectedScenario,
    sketchLayer,
    setSketchLayer,
    sketchLayerInitialized,
  ]);

  // Initializes the aoi layer for performance reasons
  React.useEffect(() => {
    if (!map || !layersInitialized || aoiSketchLayer) return;

    const newAoiSketchLayer = getDefaultSamplingMaskLayer(GraphicsLayer);

    // add the layer to the map
    setLayers((layers) => {
      return [...layers, newAoiSketchLayer];
    });

    // set the active sketch layer
    setAoiSketchLayer(newAoiSketchLayer);
  }, [
    GraphicsLayer,
    map,
    aoiSketchLayer,
    setAoiSketchLayer,
    layersInitialized,
    setLayers,
  ]);

  const [numberRandomSamples, setNumberRandomSamples] = React.useState('33');
  const [
    sampleType,
    setSampleType, //
  ] = React.useState<SampleSelectType | null>(null);

  // Initialize the selected sample type to the first option
  React.useEffect(() => {
    if (sampleTypeContext.status !== 'success') return;

    setSampleType(sampleTypeContext.data.sampleSelectOptions[0]);
  }, [sampleTypeContext]);

  // Handle a user clicking one of the sketch buttons
  function sketchButtonClick(label: string) {
    if (!sketchVM || !map || !sketchLayer) return;

    // put the sketch layer on the map, if it isn't there already and
    // is not part of a group layer
    const layerIndex = map.layers.findIndex(
      (layer) => layer.id === sketchLayer.layerId,
    );
    if (layerIndex === -1 && !sketchLayer.parentLayer) {
      map.add(sketchLayer.sketchLayer);
    }

    // save changes from other sketchVM and disable to prevent
    // interference
    if (aoiSketchVM) {
      aoiSketchVM.cancel();
    }

    // determine whether the sketch button draws points or polygons
    let shapeType = sampleAttributes[label as any].ShapeType;

    // make the style of the button active
    const wasSet = activateSketchButton(label);

    if (wasSet) {
      // let the user draw/place the shape
      sketchVM.create(shapeType);
    } else {
      sketchVM.cancel();
    }
  }

  // Handle a user clicking the sketch AOI button. If an AOI is not selected from the
  // dropdown this will create an AOI layer. This also sets the sketchVM to use the
  // selected AOI and triggers a React useEffect to allow the user to sketch on the map.
  const [
    generateRandomResponse,
    setGenerateRandomResponse, //
  ] = React.useState<GenerateRandomType>({
    status: 'none',
    data: [],
  });
  function sketchAoiButtonClick() {
    if (!map || !aoiSketchVM || !aoiSketchLayer) return;

    setGenerateRandomResponse({
      status: 'none',
      data: [],
    });

    // put the sketch layer on the map, if it isn't there already
    const layerIndex = map.layers.findIndex(
      (layer) => layer.id === aoiSketchLayer.layerId,
    );
    if (layerIndex === -1) map.add(aoiSketchLayer.sketchLayer);

    // save changes from other sketchVM and disable to prevent
    // interference
    if (sketchVM) {
      sketchVM.cancel();
    }

    // activate the sketch tool
    aoiSketchVM.create('polygon');

    // make the style of the button active
    activateSketchButton('sampling-mask');
  }

  // Handle a user generating random samples
  function randomSamples() {
    if (!map || !sketchLayer || !getGpMaxRecordCount || !sampleType) return;

    const aoiMaskLayer: LayerType | null =
      generateRandomMode === 'draw'
        ? aoiSketchLayer
        : generateRandomMode === 'file'
        ? selectedAoiFile
        : null;
    if (!aoiMaskLayer) return;

    setGenerateRandomResponse({ status: 'fetching', data: [] });

    getGpMaxRecordCount()
      .then((maxRecordCount) => {
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
            {
              name: 'PERMANENT_IDENTIFIER',
              type: 'guid',
              alias: 'PERMANENT_IDENTIFIER',
            },
          ],
          features: graphics,
        });

        // get the sample type definition (can be established or custom)
        const sampleTypeFeatureSet = {
          displayFieldName: '',
          geometryType: 'esriGeometryPolygon',
          spatialReference: {
            wkid: 3857,
          },
          fields: defaultLayerProps.fields,
          features: [
            {
              attributes: sampleAttributes[sampleType.value as any],
            },
          ],
        };

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
            Sample_Type_Parameters: sampleTypeFeatureSet,
          };
          const request = geoprocessorFetch({
            Geoprocessor,
            url: `${services.data.totsGPServer}/Generate%20Random`,
            inputParameters: props,
          });
          requests.push(request);

          // keep track of the number of remaining samples
          numSamplesLeft = numSamplesLeft - numSamples;
        }
        Promise.all(requests)
          .then((responses: any) => {
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

              // get the results from the response
              const results = res.results[0].value;

              // set the sample styles
              let symbol: PolygonSymbol = defaultSymbols.symbols['Samples'];
              if (defaultSymbols.symbols.hasOwnProperty(sampleType.value)) {
                symbol = defaultSymbols.symbols[sampleType.value];
              }

              // build an array of graphics to draw on the map
              results.features.forEach((feature: any) => {
                graphicsToAdd.push(
                  new Graphic({
                    attributes: {
                      ...feature.attributes,
                      CREATEDDATE: timestamp,
                      DECISIONUNITUUID: sketchLayer.uuid,
                      DECISIONUNIT: sketchLayer.label,
                    },
                    symbol,
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

              let editsCopy = updateLayerEdits({
                edits,
                layer: sketchLayer,
                type: 'add',
                changes: collection,
              });

              if (generateRandomMode === 'draw') {
                // remove the graphics from the generate random mask
                if (
                  aoiMaskLayer &&
                  aoiMaskLayer.sketchLayer.type === 'graphics'
                ) {
                  editsCopy = updateLayerEdits({
                    edits: editsCopy,
                    layer: aoiMaskLayer,
                    type: 'delete',
                    changes: aoiMaskLayer.sketchLayer.graphics,
                  });

                  aoiMaskLayer.sketchLayer.removeAll();
                }
              }

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

            if (generateRandomMode === 'draw') {
              if (
                aoiMaskLayer &&
                aoiMaskLayer.sketchLayer.type === 'graphics'
              ) {
                aoiMaskLayer.sketchLayer.removeAll();
              }
            }
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

  const [
    userDefinedSampleType,
    setUserDefinedSampleType,
  ] = React.useState<SampleSelectType | null>(null);
  const [editingStatus, setEditingStatus] = React.useState<EditType | null>(
    null,
  );
  const [sampleTypeName, setSampleTypeName] = React.useState<string>('');
  const [shapeType, setShapeType] = React.useState<ShapeTypeSelect | null>(
    null,
  );
  const [ttpk, setTtpk] = React.useState<string | null>('');
  const [ttc, setTtc] = React.useState<string | null>('');
  const [tta, setTta] = React.useState<string | null>('');
  const [ttps, setTtps] = React.useState<string | null>('');
  const [lodp, setLodp] = React.useState<string | null>('');
  const [lodnon, setLodnon] = React.useState<string | null>('');
  const [mcps, setMcps] = React.useState<string | null>('');
  const [tcps, setTcps] = React.useState<string | null>('');
  const [wvps, setWvps] = React.useState<string | null>('');
  const [wwps, setWwps] = React.useState<string | null>('');
  const [sa, setSa] = React.useState<string | null>('');
  const [alc, setAlc] = React.useState<string | null>('');
  const [amc, setAmc] = React.useState<string | null>('');
  const [validationMessage, setValidationMessage] = React.useState<
    JSX.Element[] | string
  >('');

  // Sets all of the user defined sample type inputs based on
  // which edit type is being used.
  function setSampleTypeInputs(editType: EditType) {
    if (editType === 'create') {
      setEditingStatus(editType);
      setShapeType(null);
      setTtpk('');
      setTtc('');
      setTta('');
      setTtps('');
      setLodp('');
      setLodnon('');
      setMcps('');
      setTcps('');
      setWvps('');
      setWwps('');
      setSa('');
      setAlc('');
      setAmc('');
      setSampleTypeName('');
      return;
    }

    if (!userDefinedSampleType) return;

    // get the sample type name, for a clone operation
    // add a number to the end of the name.
    let sampleTypeName = userDefinedSampleType.value;
    const attributes = sampleAttributes[sampleTypeName as any];
    if (editType === 'clone') {
      sampleTypeName = getSampleTypeName(allSampleOptions, sampleTypeName);
    }

    const shapeType =
      attributes.ShapeType === 'point'
        ? { value: 'point', label: 'Point' }
        : { value: 'polygon', label: 'Polygon' };

    setEditingStatus(editType);
    setShapeType(shapeType);
    setTtpk(attributes.TTPK ? attributes.TTPK.toString() : null);
    setTtc(attributes.TTC ? attributes.TTC.toString() : null);
    setTta(attributes.TTA ? attributes.TTA.toString() : null);
    setTtps(attributes.TTPS ? attributes.TTPS.toString() : null);
    setLodp(attributes.LOD_P ? attributes.LOD_P.toString() : null);
    setLodnon(attributes.LOD_NON ? attributes.LOD_NON.toString() : null);
    setMcps(attributes.MCPS ? attributes.MCPS.toString() : null);
    setTcps(attributes.TCPS ? attributes.TCPS.toString() : null);
    setWvps(attributes.WVPS ? attributes.WVPS.toString() : null);
    setWwps(attributes.WWPS ? attributes.WWPS.toString() : null);
    setSa(attributes.SA ? attributes.SA.toString() : null);
    setAlc(attributes.ALC ? attributes.ALC.toString() : null);
    setAmc(attributes.AMC ? attributes.AMC.toString() : null);
    setSampleTypeName(sampleTypeName);
  }

  // Validates the user input.
  // TODO: This logic needs to be updated to be more robust. Currently,
  //        this just makes sure that all of the fields have been filled out.
  function validateEdits() {
    let isValid = true;
    const messageParts: string[] = [];

    function isNumberValid(
      numberStr: string | null,
      valueValidation?: '' | 'greaterThan0',
    ) {
      if (numberStr === undefined || numberStr === null || numberStr === '') {
        return;
      }

      const number = Number(numberStr);
      if (isNaN(number)) return false;
      if (!valueValidation) return true;
      if (valueValidation === 'greaterThan0' && number > 0) return true;

      return false;
    }

    // validate any fields that need it
    if (!sampleTypeName) {
      isValid = false;
      messageParts.push('User Defined types must have a sample type name.');
    }
    if (
      sampleAttributes.hasOwnProperty(sampleTypeName) &&
      (editingStatus !== 'edit' ||
        (editingStatus === 'edit' &&
          userDefinedSampleType &&
          userDefinedSampleType.value !== sampleTypeName))
    ) {
      isValid = false;
      messageParts.push(
        `The "${sampleTypeName}" name is already in use. Please rename the sample type and try again.`,
      );
    }
    if (!isNumberValid(ttpk)) {
      isValid = false;
      messageParts.push('Time to Prepare Kits needs a numeric value.');
    }
    if (!isNumberValid(ttc)) {
      isValid = false;
      messageParts.push('Time to Collect needs a numeric value.');
    }
    if (!isNumberValid(tta)) {
      isValid = false;
      messageParts.push('Time to Analyze needs a numeric value.');
    }
    if (!isNumberValid(mcps)) {
      isValid = false;
      messageParts.push('Sampling Material Cost needs a numeric value.');
    }
    if (!isNumberValid(sa, 'greaterThan0')) {
      isValid = false;
      messageParts.push(
        'Reference Surface Area needs a numeric value greater than 0.',
      );
    }
    if (!isNumberValid(alc)) {
      isValid = false;
      messageParts.push('Analysis Labor Cost needs a numeric value.');
    }
    if (!isNumberValid(amc)) {
      isValid = false;
      messageParts.push('Analysis Material Cost needs a numeric value.');
    }

    if (messageParts.length > 0) {
      const message = messageParts.map((part, index) => {
        return (
          <React.Fragment key={index}>
            {index !== 0 ? <br /> : ''}
            {part}
          </React.Fragment>
        );
      });
      setValidationMessage(message);
    }

    return isValid;
  }

  // Checks to see if the sample type name changed.
  function didSampleTypeNameChange() {
    return (
      editingStatus === 'edit' &&
      userDefinedSampleType &&
      sampleTypeName !== userDefinedSampleType.value
    );
  }

  // Updates the attributes of graphics that have had property changes
  function updateAttributes({
    graphics,
    newAttributes,
    oldType,
  }: {
    graphics: __esri.Graphic[];
    newAttributes: any;
    oldType: string;
  }) {
    const editedGraphics: __esri.Graphic[] = [];
    graphics.forEach((graphic: __esri.Graphic) => {
      // update attributes for the edited type
      if (graphic.attributes.TYPE === oldType) {
        const areaChanged = graphic.attributes.SA !== newAttributes.SA;
        const shapeTypeChanged =
          graphic.attributes.ShapeType !== newAttributes.ShapeType;

        graphic.attributes.TYPE = newAttributes.TYPE;
        graphic.attributes.ShapeType = newAttributes.ShapeType;
        graphic.attributes.Width = newAttributes.Width;
        graphic.attributes.SA = newAttributes.SA;
        graphic.attributes.TTPK = newAttributes.TTPK;
        graphic.attributes.TTC = newAttributes.TTC;
        graphic.attributes.TTA = newAttributes.TTA;
        graphic.attributes.TTPS = newAttributes.TTPS;
        graphic.attributes.LOD_P = newAttributes.LOD_P;
        graphic.attributes.LOD_NON = newAttributes.LOD_NON;
        graphic.attributes.MCPS = newAttributes.MCPS;
        graphic.attributes.TCPS = newAttributes.TCPS;
        graphic.attributes.WVPS = newAttributes.WVPS;
        graphic.attributes.WWPS = newAttributes.WWPS;
        graphic.attributes.ALC = newAttributes.ALC;
        graphic.attributes.AMC = newAttributes.AMC;

        // redraw the graphic if the width changed or if the graphic went from a
        // polygon to a point
        if (
          newAttributes.ShapeType === 'point' &&
          (areaChanged || shapeTypeChanged)
        ) {
          // convert the geometry _esriPolygon if it is missing stuff
          createBuffer(graphic as __esri.Graphic);
        }

        editedGraphics.push(graphic);
      }
    });

    return editedGraphics;
  }

  // Changes the selected layer if the scenario is changed. The first
  // available layer in the scenario will be chosen. If the scenario
  // has no layers, then the first availble unlinked layer is chosen.
  React.useEffect(() => {
    if (!selectedScenario) return;
    if (
      sketchLayer &&
      (!sketchLayer.parentLayer ||
        sketchLayer.parentLayer.id === selectedScenario.layerId)
    ) {
      return;
    }

    // select the first layer within the selected scenario
    if (selectedScenario.layers.length > 0) {
      const newSketchLayer = layers.find(
        (layer) => layer.layerId === selectedScenario.layers[0].layerId,
      );
      if (newSketchLayer) {
        setSketchLayer(newSketchLayer);
        return;
      }
    }

    // select the first unlinked layer
    const newSketchLayer = layers.find(
      (layer) =>
        (layer.layerType === 'Samples' || layer.layerType === 'VSP') &&
        !layer.parentLayer,
    );
    if (newSketchLayer) setSketchLayer(newSketchLayer);
    else setSketchLayer(null);
  }, [layers, selectedScenario, sketchLayer, setSketchLayer]);

  // scenario and layer edit UI visibility controls
  const [addScenarioVisible, setAddScenarioVisible] = React.useState(false);
  const [editScenarioVisible, setEditScenarioVisible] = React.useState(false);
  const [addLayerVisible, setAddLayerVisible] = React.useState(false);
  const [editLayerVisible, setEditLayerVisible] = React.useState(false);
  const [generateRandomMode, setGenerateRandomMode] = React.useState<
    'draw' | 'file' | ''
  >('');
  const [
    selectedAoiFile,
    setSelectedAoiFile,
  ] = React.useState<LayerType | null>(null);

  // get a list of scenarios from edits
  const scenarios = getScenarios(edits);

  // build the list of layers to be displayed in the sample layer dropdown
  const sampleLayers: { label: string; options: LayerType[] }[] = [];
  if (selectedScenario && selectedScenario.layers.length > 0) {
    // get layers for the selected scenario
    sampleLayers.push({
      label: selectedScenario.label,
      options: getSketchableLayers(layers, selectedScenario.layers),
    });
  }

  // get unlinked layers
  sampleLayers.push({
    label: 'Unlinked Layers',
    options: getSketchableLayers(layers, edits.edits),
  });

  return (
    <div css={panelContainer}>
      <div>
        <div css={sectionContainer}>
          <div css={headerContainer}>
            <h2>Create Plan</h2>
            <button css={deleteButtonStyles} onClick={startOver}>
              <i className="fas fa-redo-alt" />
              <br />
              Start Over
            </button>
          </div>
          <div css={headerContainer}>
            <div css={trainingStyles}>
              <input
                id="training-mode-toggle"
                type="checkbox"
                checked={trainingMode}
                onChange={(ev) => setTrainingMode(!trainingMode)}
              />
              <label htmlFor="training-mode-toggle">Training Mode</label>
              <br />
              <input
                id="auto-zoom-toggle"
                type="checkbox"
                checked={autoZoom}
                onChange={(ev) => setAutoZoom(!autoZoom)}
              />
              <label htmlFor="auto-zoom-toggle">Auto Zoom</label>
            </div>
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
          {selectedScenario ? (
            <p>
              An empty sample layer is loaded by default. Use the "Active
              Sampling Layer" controls to link, add, modify, and/or delete the
              sampling layer associated with the active plan. You may associate
              multiple layers with a plan by selecting sampling layers from the
              menu and clicking the link icon. The menu will display linked
              layers and indicate other layers available for linking. Use the
              “unlink” control to remove a layer from a plan.
            </p>
          ) : (
            <React.Fragment>
              <p>
                Create a sampling plan with one or more layers. Layers can
                represent unique areas of interest or decision units that are
                differentiated by the user-defined descriptions (e.g., Floor 1,
                East Stairwell, Team 1, etc.). Enter a plan name and description
                and click Save.
              </p>
              <MessageBox
                severity="warning"
                title=""
                message="Note: Your work in TOTS only persists as long as your current browser session. Be sure to download results and/or publish your plan to retain a copy of your work."
              />
            </React.Fragment>
          )}

          {scenarios.length === 0 ? (
            <EditScenario addDefaultSampleLayer={true} />
          ) : (
            <React.Fragment>
              <div css={iconButtonContainerStyles}>
                <label htmlFor="scenario-select-input">Specify Plan</label>
                <div>
                  {selectedScenario && (
                    <React.Fragment>
                      <button
                        css={iconButtonStyles}
                        title="Delete Plan"
                        onClick={() => {
                          // remove all of the child layers
                          setLayers((layers) => {
                            return layers.filter(
                              (layer) =>
                                selectedScenario.layers.findIndex(
                                  (scenarioLayer) =>
                                    scenarioLayer.layerId === layer.layerId,
                                ) === -1,
                            );
                          });

                          // remove the scenario from edits
                          const newEdits: EditsType = {
                            count: edits.count + 1,
                            edits: edits.edits.filter(
                              (item) =>
                                item.layerId !== selectedScenario.layerId,
                            ),
                          };
                          setEdits(newEdits);

                          // select the next available scenario
                          const scenarios = getScenarios(newEdits);
                          setSelectedScenario(
                            scenarios.length > 0 ? scenarios[0] : null,
                          );

                          if (!map) return;

                          // remove the scenario from the map
                          const mapLayer = map.layers.find(
                            (layer) => layer.id === selectedScenario.layerId,
                          );
                          map.remove(mapLayer);
                        }}
                      >
                        <i className="fas fa-trash-alt" />
                        <span className="sr-only">Delete Plan</span>
                      </button>
                      <button
                        css={iconButtonStyles}
                        title={editScenarioVisible ? 'Cancel' : 'Edit Plan'}
                        onClick={() => {
                          setAddScenarioVisible(false);
                          setEditScenarioVisible(!editScenarioVisible);
                        }}
                      >
                        <i
                          className={
                            editScenarioVisible ? 'fas fa-times' : 'fas fa-edit'
                          }
                        />
                        <span className="sr-only">
                          {editScenarioVisible ? 'Cancel' : 'Edit Plan'}
                        </span>
                      </button>
                    </React.Fragment>
                  )}
                  <button
                    css={iconButtonStyles}
                    title={addScenarioVisible ? 'Cancel' : 'Add Plan'}
                    onClick={() => {
                      setEditScenarioVisible(false);
                      setAddScenarioVisible(!addScenarioVisible);
                    }}
                  >
                    <i
                      className={
                        addScenarioVisible ? 'fas fa-times' : 'fas fa-plus'
                      }
                    />
                    <span className="sr-only">
                      {addScenarioVisible ? 'Cancel' : 'Add Plan'}
                    </span>
                  </button>
                </div>
              </div>
              <Select
                id="scenario-select-input"
                inputId="scenario-select-input"
                css={layerSelectStyles}
                isDisabled={addScenarioVisible || editScenarioVisible}
                value={selectedScenario}
                onChange={(ev) => {
                  const newScenario = ev as ScenarioEditsType;
                  setSelectedScenario(newScenario);

                  // update the visiblity of layers
                  layers.forEach((layer) => {
                    if (layer.parentLayer) {
                      layer.parentLayer.visible =
                        layer.parentLayer.id === newScenario.layerId
                          ? true
                          : false;
                      return;
                    }

                    if (
                      layer.layerType === 'Samples' ||
                      layer.layerType === 'VSP'
                    ) {
                      layer.sketchLayer.visible = false;
                    }
                  });

                  setEdits((edits) => ({
                    count: edits.count + 1,
                    edits: edits.edits.map((edit) => {
                      let visible = edit.visible;

                      if (edit.type === 'scenario') {
                        visible =
                          edit.layerId === newScenario.layerId ? true : false;
                      }
                      if (edit.type === 'layer') {
                        if (
                          edit.layerType === 'Samples' ||
                          edit.layerType === 'VSP'
                        ) {
                          visible = false;
                        }
                      }

                      return {
                        ...edit,
                        visible,
                      };
                    }),
                  }));
                }}
                options={scenarios}
              />
              {addScenarioVisible && (
                <EditScenario onSave={() => setAddScenarioVisible(false)} />
              )}
              {editScenarioVisible && (
                <EditScenario
                  initialScenario={selectedScenario}
                  onSave={() => setEditScenarioVisible(false)}
                />
              )}
            </React.Fragment>
          )}

          {selectedScenario && !addScenarioVisible && !editScenarioVisible && (
            <React.Fragment>
              <div css={iconButtonContainerStyles}>
                <label htmlFor="sampling-layer-select-input">
                  Active Sampling Layer
                </label>
                <div>
                  {sketchLayer && (
                    <React.Fragment>
                      <button
                        css={iconButtonStyles}
                        title="Delete Layer"
                        onClick={() => {
                          // remove the layer from layers
                          setLayers((layers) => {
                            return layers.filter(
                              (layer) => layer.layerId !== sketchLayer.layerId,
                            );
                          });

                          const parentLayer = sketchLayer.parentLayer;
                          if (parentLayer) {
                            // remove the scenario from edits
                            setEdits((edits) => {
                              const index = edits.edits.findIndex(
                                (edit) => edit.layerId === parentLayer.id,
                              );

                              const editedScenario = edits.edits[
                                index
                              ] as ScenarioEditsType;
                              editedScenario.layers = editedScenario.layers.filter(
                                (layer) =>
                                  layer.layerId !== sketchLayer.layerId,
                              );

                              return {
                                count: edits.count + 1,
                                edits: [
                                  ...edits.edits.slice(0, index),
                                  editedScenario,
                                  ...edits.edits.slice(index + 1),
                                ],
                              };
                            });
                          } else {
                            // remove the scenario from edits
                            setEdits((edits) => {
                              return {
                                count: edits.count + 1,
                                edits: edits.edits.filter(
                                  (item) =>
                                    item.layerId !== sketchLayer.layerId,
                                ),
                              };
                            });
                          }

                          // select the next available layer
                          let newSketchLayerIndex: number = -1;

                          // check in the selected scenario first, then in the root of edits
                          if (selectedScenario) {
                            const index = selectedScenario.layers.findIndex(
                              (layer) => layer.layerId !== sketchLayer.layerId,
                            );
                            if (index > -1) {
                              newSketchLayerIndex = layers.findIndex(
                                (layer) =>
                                  layer.layerId ===
                                  selectedScenario.layers[index].layerId,
                              );
                            }
                          }
                          if (newSketchLayerIndex === -1) {
                            const index = edits.edits.findIndex(
                              (layer) =>
                                layer.type === 'layer' &&
                                (layer.layerType === 'Samples' ||
                                  layer.layerType === 'VSP') &&
                                layer.layerId !== sketchLayer.layerId,
                            );
                            if (index > -1) {
                              newSketchLayerIndex = layers.findIndex(
                                (layer) =>
                                  layer.layerId === edits.edits[index].layerId,
                              );
                            }
                          }

                          setSketchLayer(
                            newSketchLayerIndex > -1
                              ? layers[newSketchLayerIndex]
                              : null,
                          );

                          // remove the scenario from the map
                          const parent = parentLayer
                            ? parentLayer
                            : map
                            ? map
                            : null;
                          if (parent) parent.remove(sketchLayer.sketchLayer);
                        }}
                      >
                        <i className="fas fa-trash-alt" />
                        <span className="sr-only">Delete Layer</span>
                      </button>
                      {sketchLayer.parentLayer ? (
                        <button
                          css={iconButtonStyles}
                          title="Unlink Layer"
                          onClick={() => {
                            if (!map) return;

                            // update edits (move the layer to the root)
                            setEdits((edits) => {
                              const {
                                scenarioIndex,
                                layerIndex,
                                editsScenario,
                                editsLayer,
                              } = findLayerInEdits(
                                edits.edits,
                                sketchLayer.layerId,
                              );

                              if (editsScenario) {
                                editsScenario.layers = [
                                  ...editsScenario.layers.slice(0, layerIndex),
                                  ...editsScenario.layers.slice(layerIndex + 1),
                                ];

                                return {
                                  count: edits.count + 1,
                                  edits: [
                                    ...edits.edits.slice(0, scenarioIndex),
                                    editsScenario,
                                    ...edits.edits.slice(scenarioIndex + 1),
                                    editsLayer,
                                  ],
                                };
                              }

                              return {
                                count: edits.count + 1,
                                edits: [...edits.edits, editsLayer],
                              };
                            });

                            // remove the layer from the parent group layer and add to map
                            sketchLayer.parentLayer?.remove(
                              sketchLayer.sketchLayer,
                            );
                            map.add(sketchLayer.sketchLayer);

                            // update layers (clear parent layer)
                            setLayers((layers) => {
                              const layerIndex = layers.findIndex(
                                (layer) =>
                                  layer.layerId === sketchLayer.layerId,
                              );

                              if (layerIndex === -1) return layers;

                              const layer = layers[layerIndex];
                              layer.parentLayer = null;

                              return [
                                ...layers.slice(0, layerIndex),
                                layer,
                                ...layers.slice(layerIndex + 1),
                              ];
                            });

                            // update sketchLayer (clear parent layer)
                            setSketchLayer((sketchLayer) => {
                              if (!sketchLayer) return sketchLayer;

                              return {
                                ...sketchLayer,
                                parentLayer: null,
                              };
                            });

                            // update the selected scenario
                            setSelectedScenario((selectedScenario) => {
                              if (!selectedScenario) return selectedScenario;

                              return {
                                ...selectedScenario,
                                layers: selectedScenario.layers.filter(
                                  (layer) =>
                                    layer.layerId !== sketchLayer.layerId,
                                ),
                              };
                            });
                          }}
                        >
                          <i className="fas fa-unlink" />
                          <span className="sr-only">Unlink Layer</span>
                        </button>
                      ) : (
                        <button
                          css={iconButtonStyles}
                          title="Link Layer"
                          onClick={() => {
                            if (!map || !selectedScenario) return;

                            // update edits (move the layer to the selected scenario)
                            const editsCopy = updateLayerEdits({
                              edits,
                              scenario: selectedScenario,
                              layer: sketchLayer,
                              type: 'move',
                            });
                            setEdits(editsCopy);

                            // find the new parent layer
                            const groupLayer = map.layers.find(
                              (layer) => layer.id === selectedScenario.layerId,
                            ) as __esri.GroupLayer;
                            if (!groupLayer) return;

                            // add the layer to the parent group layer
                            groupLayer.add(sketchLayer.sketchLayer);

                            // update layers (set parent layer)
                            setLayers((layers) => {
                              const layerIndex = layers.findIndex(
                                (layer) =>
                                  layer.layerId === sketchLayer.layerId,
                              );

                              if (layerIndex === -1) return layers;

                              const layer = layers[layerIndex];
                              layer.parentLayer = groupLayer;

                              return [
                                ...layers.slice(0, layerIndex),
                                layer,
                                ...layers.slice(layerIndex + 1),
                              ];
                            });

                            // update sketchLayer (clear parent layer)
                            setSketchLayer((sketchLayer) => {
                              if (!sketchLayer) return sketchLayer;

                              return {
                                ...sketchLayer,
                                parentLayer: groupLayer,
                              };
                            });

                            // update the selectedScenario to keep the active layer dropdown
                            // synced up
                            const scenario = editsCopy.edits.find(
                              (edit) =>
                                edit.type === 'scenario' &&
                                edit.layerId === selectedScenario.layerId,
                            );
                            if (scenario)
                              setSelectedScenario(
                                scenario as ScenarioEditsType,
                              );
                          }}
                        >
                          <i className="fas fa-link" />
                          <span className="sr-only">Link Layer</span>
                        </button>
                      )}
                      <button
                        css={iconButtonStyles}
                        title={editLayerVisible ? 'Cancel' : 'Edit Layer'}
                        onClick={() => {
                          setAddLayerVisible(false);
                          setEditLayerVisible(!editLayerVisible);
                        }}
                      >
                        <i
                          className={
                            editLayerVisible ? 'fas fa-times' : 'fas fa-edit'
                          }
                        />
                        <span className="sr-only">
                          {editLayerVisible ? 'Cancel' : 'Edit Layer'}
                        </span>
                      </button>
                    </React.Fragment>
                  )}
                  <button
                    css={iconButtonStyles}
                    title={addLayerVisible ? 'Cancel' : 'Add Layer'}
                    onClick={() => {
                      setEditLayerVisible(false);
                      setAddLayerVisible(!addLayerVisible);
                    }}
                  >
                    <i
                      className={
                        addLayerVisible ? 'fas fa-times' : 'fas fa-plus'
                      }
                    />
                    <span className="sr-only">
                      {addLayerVisible ? 'Cancel' : 'Add Layer'}
                    </span>
                  </button>
                </div>
              </div>
              <Select
                id="sampling-layer-select"
                inputId="sampling-layer-select-input"
                css={layerSelectStyles}
                isDisabled={addLayerVisible || editLayerVisible}
                value={sketchLayer}
                onChange={(ev) => {
                  const newLayer = ev as LayerType;

                  // set visibility
                  let visibilityChange = false;
                  if (sketchLayer && !sketchLayer.parentLayer) {
                    sketchLayer.sketchLayer.visible = false;
                    visibilityChange = true;
                  }
                  if (!newLayer.parentLayer) {
                    newLayer.sketchLayer.visible = true;
                    visibilityChange = true;
                  }
                  if (visibilityChange) {
                    setEdits((edits) => ({
                      count: edits.count + 1,
                      edits: edits.edits.map((edit) => {
                        if (edit.type === 'scenario') return edit;

                        let visible = edit.visible;
                        if (edit.layerId === sketchLayer?.layerId)
                          visible = false;
                        if (edit.layerId === newLayer.layerId) visible = true;

                        return {
                          ...edit,
                          visible,
                        };
                      }),
                    }));
                  }

                  setSketchLayer(newLayer);
                }}
                options={sampleLayers}
              />
              {addLayerVisible && (
                <EditLayer onSave={() => setAddLayerVisible(false)} />
              )}
              {editLayerVisible && (
                <EditLayer
                  initialLayer={sketchLayer}
                  onSave={() => setEditLayerVisible(false)}
                />
              )}
            </React.Fragment>
          )}
        </div>

        {selectedScenario && (
          <React.Fragment>
            <div css={sectionContainerWidthOnly}>
              <p>
                In the panels below, add targeted and/ or multiple samples to
                the plan.
              </p>
              <ColorPicker
                symbolType="Samples"
                title="Default Sample Symbology"
              />
            </div>
            <AccordionList>
              <AccordionItem
                title={'Add Targeted Samples'}
                initiallyExpanded={true}
              >
                <div css={sectionContainer}>
                  <p>
                    Click on a sample type to enable TOTS drawing mode. Click on
                    the map layer to draw a sample point. Optionally, add any
                    relevant notes. Click Save. Repeat these steps to continue
                    adding targeted samples. Use the "Add Multiple Random
                    Samples" feature below to add more than one sample point at
                    a time.
                  </p>
                  <div>
                    <h3>Established Sample Types</h3>
                    <div css={sketchButtonContainerStyles}>
                      {sampleTypeContext.status === 'fetching' && (
                        <LoadingSpinner />
                      )}
                      {sampleTypeContext.status === 'failure' &&
                        featureNotAvailableMessage('Established Sample Types')}
                      {sampleTypeContext.status === 'success' && (
                        <React.Fragment>
                          {sampleTypeContext.data.sampleSelectOptions.map(
                            (option: any, index: number) => {
                              const sampleType = option.value;

                              if (
                                !sampleAttributes.hasOwnProperty(sampleType)
                              ) {
                                return null;
                              }

                              const shapeType =
                                sampleAttributes[sampleType].ShapeType;
                              const edited = userDefinedAttributes.attributes.hasOwnProperty(
                                sampleType,
                              );
                              return (
                                <SketchButton
                                  key={index}
                                  layers={layers}
                                  label={
                                    edited
                                      ? `${sampleType} (edited)`
                                      : sampleType
                                  }
                                  iconClass={
                                    shapeType === 'point'
                                      ? 'fas fa-pen-fancy'
                                      : 'fas fa-draw-polygon'
                                  }
                                  onClick={() => sketchButtonClick(sampleType)}
                                />
                              );
                            },
                          )}
                        </React.Fragment>
                      )}
                    </div>
                  </div>
                  {userDefinedOptions.length > 0 && (
                    <div>
                      <br />
                      <h3>Custom Sample Types</h3>
                      <div css={sketchButtonContainerStyles}>
                        {userDefinedOptions.map((option, index) => {
                          if (option.isPredefined) return null;

                          const sampleType = option.value;
                          const shapeType =
                            sampleAttributes[sampleType as any].ShapeType;
                          return (
                            <SketchButton
                              key={index}
                              label={sampleType}
                              layers={layers}
                              iconClass={
                                shapeType === 'point'
                                  ? 'fas fa-pen-fancy'
                                  : 'fas fa-draw-polygon'
                              }
                              onClick={() => sketchButtonClick(sampleType)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionItem>
              <AccordionItem title={'Add Multiple Random Samples'}>
                <div css={sectionContainer}>
                  {sketchLayer?.layerType === 'VSP' && cantUseWithVspMessage}
                  {sketchLayer?.layerType !== 'VSP' && (
                    <React.Fragment>
                      {(services.status === 'fetching' ||
                        sampleTypeContext.status === 'fetching') && (
                        <LoadingSpinner />
                      )}
                      {(services.status === 'failure' ||
                        sampleTypeContext.status === 'failure') &&
                        featureNotAvailableMessage(
                          'Add Multiple Random Samples',
                        )}
                      {services.status === 'success' &&
                        sampleTypeContext.status === 'success' && (
                          <React.Fragment>
                            <p>
                              Select "Draw Sampling Mask" to draw a boundary on
                              your map for placing samples or select "Use
                              Imported Area of Interest" to use an Area of
                              Interest file to place samples. Select a Sample
                              Type from the menu and specify the number of
                              samples to add. Click Submit to add samples.
                            </p>
                            <div>
                              <input
                                id="draw-aoi"
                                type="radio"
                                name="mode"
                                value="Draw area of Interest"
                                checked={generateRandomMode === 'draw'}
                                onChange={(ev) => {
                                  setGenerateRandomMode('draw');

                                  const maskLayers = layers.filter(
                                    (layer) =>
                                      layer.layerType === 'Sampling Mask',
                                  );
                                  setAoiSketchLayer(maskLayers[0]);
                                }}
                              />
                              <label htmlFor="draw-aoi" css={radioLabelStyles}>
                                Draw Sampling Mask
                              </label>
                            </div>
                            <div>
                              <input
                                id="use-aoi-file"
                                type="radio"
                                name="mode"
                                value="Use Imported Area of Interest"
                                checked={generateRandomMode === 'file'}
                                onChange={(ev) => {
                                  setGenerateRandomMode('file');

                                  setAoiSketchLayer(null);

                                  if (!selectedAoiFile) {
                                    const aoiLayers = layers.filter(
                                      (layer) =>
                                        layer.layerType === 'Area of Interest',
                                    );
                                    setSelectedAoiFile(aoiLayers[0]);
                                  }
                                }}
                              />
                              <label
                                htmlFor="use-aoi-file"
                                css={radioLabelStyles}
                              >
                                Use Imported Area of Interest
                              </label>
                            </div>

                            {generateRandomMode === 'draw' && (
                              <button
                                id="sampling-mask"
                                title="Draw Sampling Mask"
                                className="sketch-button"
                                onClick={() => {
                                  if (!aoiSketchLayer) return;

                                  sketchAoiButtonClick();
                                }}
                                css={sketchAoiButtonStyles}
                              >
                                <span css={sketchAoiTextStyles}>
                                  <i className="fas fa-draw-polygon" />{' '}
                                  <span>Draw Sampling Mask</span>
                                </span>
                              </button>
                            )}
                            {generateRandomMode === 'file' && (
                              <React.Fragment>
                                <label htmlFor="aoi-mask-select-input">
                                  Area of Interest Mask
                                </label>
                                <div css={inlineMenuStyles}>
                                  <Select
                                    id="aoi-mask-select"
                                    inputId="aoi-mask-select-input"
                                    css={inlineSelectStyles}
                                    styles={reactSelectStyles}
                                    isClearable={true}
                                    value={selectedAoiFile}
                                    onChange={(ev) =>
                                      setSelectedAoiFile(ev as LayerType)
                                    }
                                    options={layers.filter(
                                      (layer) =>
                                        layer.layerType === 'Area of Interest',
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
                              </React.Fragment>
                            )}
                            {generateRandomMode && (
                              <React.Fragment>
                                <br />
                                <label htmlFor="sample-type-select-input">
                                  Sample Type
                                </label>
                                <Select
                                  id="sample-type-select"
                                  inputId="sample-type-select-input"
                                  css={fullWidthSelectStyles}
                                  value={sampleType}
                                  onChange={(ev) =>
                                    setSampleType(ev as SampleSelectType)
                                  }
                                  options={allSampleOptions}
                                />
                                <label htmlFor="number-of-samples-input">
                                  Number of Samples
                                </label>
                                <input
                                  id="number-of-samples-input"
                                  css={inputStyles}
                                  value={numberRandomSamples}
                                  onChange={(ev) =>
                                    setNumberRandomSamples(ev.target.value)
                                  }
                                />
                                {generateRandomResponse.status === 'success' &&
                                  sketchLayer &&
                                  generateRandomSuccessMessage(
                                    generateRandomResponse.data.length,
                                    sketchLayer.label,
                                  )}
                                {generateRandomResponse.status === 'failure' &&
                                  webServiceErrorMessage}
                                {generateRandomResponse.status ===
                                  'exceededTransferLimit' &&
                                  generateRandomExceededTransferLimitMessage}
                                {((generateRandomMode === 'draw' &&
                                  numberRandomSamples &&
                                  aoiSketchLayer?.sketchLayer.type ===
                                    'graphics' &&
                                  aoiSketchLayer.sketchLayer.graphics.length >
                                    0) ||
                                  (generateRandomMode === 'file' &&
                                    selectedAoiFile?.sketchLayer.type ===
                                      'graphics' &&
                                    selectedAoiFile.sketchLayer.graphics
                                      .length > 0)) && (
                                  <button
                                    css={submitButtonStyles}
                                    onClick={randomSamples}
                                  >
                                    {generateRandomResponse.status !==
                                      'fetching' && 'Submit'}
                                    {generateRandomResponse.status ===
                                      'fetching' && (
                                      <React.Fragment>
                                        <i className="fas fa-spinner fa-pulse" />
                                        &nbsp;&nbsp;Loading...
                                      </React.Fragment>
                                    )}
                                  </button>
                                )}
                              </React.Fragment>
                            )}
                          </React.Fragment>
                        )}
                    </React.Fragment>
                  )}
                </div>
              </AccordionItem>
              <AccordionItem title={'Create Custom Sample Types'}>
                <div css={sectionContainer}>
                  <p>
                    Choose an existing sample type from the menu or click + to
                    add a new sample type from scratch. You have the option
                    clone or view an existing sample type. Populate or edit the
                    parameter fields and click Save. Once you have saved a
                    custom sample type you can edit and/or delete the parameters
                    using additional controls now available to you.
                  </p>
                  <div css={iconButtonContainerStyles}>
                    <label htmlFor="sample-type-select-input">
                      Sample Type
                    </label>
                    <div>
                      {userDefinedSampleType && (
                        <React.Fragment>
                          {!editingStatus &&
                            !userDefinedSampleType.isPredefined && (
                              <button
                                css={iconButtonStyles}
                                title="Delete Sample Type"
                                onClick={() => {
                                  const sampleTypeName =
                                    userDefinedSampleType.value;

                                  setOptions({
                                    title: 'Would you like to continue?',
                                    ariaLabel: 'Would you like to continue?',
                                    description:
                                      'This operation will delete the sample type and any associated samples.',
                                    onContinue: () => {
                                      setUserDefinedOptions(
                                        userDefinedOptions.filter(
                                          (option) =>
                                            option.value !== sampleTypeName,
                                        ),
                                      );
                                      setUserDefinedAttributes(
                                        (userDefined) => {
                                          delete userDefined.attributes[
                                            sampleTypeName
                                          ];
                                          userDefined.editCount += 1;
                                          return userDefined;
                                        },
                                      );

                                      // Update the attributes of the graphics on the map on edits
                                      let editsCopy: EditsType = edits;
                                      layers.forEach((layer) => {
                                        if (
                                          !['Samples', 'VSP'].includes(
                                            layer.layerType,
                                          ) ||
                                          layer.sketchLayer.type !== 'graphics'
                                        ) {
                                          return;
                                        }

                                        const graphicsToRemove: __esri.Graphic[] = [];
                                        layer.sketchLayer.graphics.forEach(
                                          (graphic) => {
                                            if (
                                              graphic.attributes.TYPE ===
                                              sampleTypeName
                                            ) {
                                              graphicsToRemove.push(graphic);
                                            }
                                          },
                                        );
                                        layer.sketchLayer.removeMany(
                                          graphicsToRemove,
                                        );

                                        if (graphicsToRemove.length > 0) {
                                          const collection = new Collection<
                                            __esri.Graphic
                                          >();
                                          collection.addMany(graphicsToRemove);
                                          editsCopy = updateLayerEdits({
                                            edits: editsCopy,
                                            layer,
                                            type: 'delete',
                                            changes: collection,
                                          });
                                        }
                                      });

                                      setEdits(editsCopy);

                                      // TODO: Add code for deleteing the user defined type
                                      //       from ArcGIS Online.

                                      setUserDefinedSampleType(null);
                                    },
                                  });
                                }}
                              >
                                <i className="fas fa-trash-alt" />
                                <span className="sr-only">
                                  Delete Sample Type
                                </span>
                              </button>
                            )}
                          <button
                            css={iconButtonStyles}
                            title={
                              editingStatus === 'clone'
                                ? 'Cancel'
                                : 'Clone Sample Type'
                            }
                            onClick={(ev) => {
                              if (editingStatus === 'clone') {
                                setEditingStatus(null);
                                return;
                              }

                              setSampleTypeInputs('clone');
                            }}
                          >
                            <i
                              className={
                                editingStatus === 'clone'
                                  ? 'fas fa-times'
                                  : 'fas fa-clone'
                              }
                            />
                            <span className="sr-only">
                              {editingStatus === 'clone'
                                ? 'Cancel'
                                : 'Clone Sample Type'}
                            </span>
                          </button>
                          {userDefinedSampleType.isPredefined ? (
                            <button
                              css={iconButtonStyles}
                              title={
                                editingStatus === 'view'
                                  ? 'Hide'
                                  : 'View Sample Type'
                              }
                              onClick={(ev) => {
                                if (editingStatus === 'view') {
                                  setEditingStatus(null);
                                  return;
                                }

                                setSampleTypeInputs('view');
                              }}
                            >
                              <i
                                className={
                                  editingStatus === 'view'
                                    ? 'fas fa-times'
                                    : 'fas fa-file-alt'
                                }
                              />
                              <span className="sr-only">
                                {editingStatus === 'view'
                                  ? 'Hide'
                                  : 'View Sample Type'}
                              </span>
                            </button>
                          ) : (
                            <button
                              css={iconButtonStyles}
                              title={
                                editingStatus === 'edit'
                                  ? 'Cancel'
                                  : 'Edit Sample Type'
                              }
                              onClick={(ev) => {
                                if (editingStatus === 'edit') {
                                  setEditingStatus(null);
                                  return;
                                }

                                setSampleTypeInputs('edit');
                              }}
                            >
                              <i
                                className={
                                  editingStatus === 'edit'
                                    ? 'fas fa-times'
                                    : 'fas fa-edit'
                                }
                              />
                              <span className="sr-only">
                                {editingStatus === 'edit'
                                  ? 'Cancel'
                                  : 'Edit Sample Type'}
                              </span>
                            </button>
                          )}
                        </React.Fragment>
                      )}
                      <button
                        css={iconButtonStyles}
                        title={
                          editingStatus === 'create'
                            ? 'Cancel'
                            : 'Create Sample Type'
                        }
                        onClick={(ev) => {
                          if (editingStatus === 'create') {
                            setEditingStatus(null);
                            return;
                          }

                          setSampleTypeInputs('create');
                        }}
                      >
                        <i
                          className={
                            editingStatus === 'create'
                              ? 'fas fa-times'
                              : 'fas fa-plus'
                          }
                        />
                        <span className="sr-only">
                          {editingStatus === 'create'
                            ? 'Cancel'
                            : 'Create Sample Type'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <Select
                    id="sample-type-select"
                    inputId="sample-type-select-input"
                    css={fullWidthSelectStyles}
                    isDisabled={editingStatus ? true : false}
                    value={userDefinedSampleType}
                    onChange={(ev) =>
                      setUserDefinedSampleType(ev as SampleSelectType)
                    }
                    options={allSampleOptions}
                  />
                  {editingStatus && (
                    <div>
                      {userDefinedSampleType && (
                        <ColorPicker
                          symbolType={userDefinedSampleType.value}
                          backupType="Samples"
                        />
                      )}
                      <div>
                        <label htmlFor="sample-type-name-input">
                          Sample Type Name
                        </label>
                        <input
                          id="sample-type-name-input"
                          disabled={
                            editingStatus === 'view' ||
                            (editingStatus === 'edit' &&
                              userDefinedSampleType?.isPredefined)
                          }
                          css={inputStyles}
                          value={sampleTypeName}
                          onChange={(ev) => setSampleTypeName(ev.target.value)}
                        />
                        <label htmlFor="sa-input">
                          Reference Surface Area <em>(sq inch)</em>
                        </label>
                        <input
                          id="sa-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={sa ? sa : ''}
                          onChange={(ev) => setSa(ev.target.value)}
                        />
                        <label htmlFor="shape-type-select-input">
                          Shape Type
                        </label>
                        <Select
                          id="shape-type-select"
                          inputId="shape-type-select-input"
                          css={fullWidthSelectStyles}
                          value={shapeType}
                          isDisabled={editingStatus === 'view'}
                          onChange={(ev) => setShapeType(ev as ShapeTypeSelect)}
                          options={[
                            { value: 'point', label: 'Point' },
                            { value: 'polygon', label: 'Polygon' },
                          ]}
                        />
                        <label htmlFor="ttpk-input">
                          Time to Prepare Kits <em>(person hrs/sample)</em>
                        </label>
                        <input
                          id="ttpk-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={ttpk ? ttpk : ''}
                          onChange={(ev) => setTtpk(ev.target.value)}
                        />
                        <label htmlFor="ttc-input">
                          Time to Collect <em>(person hrs/sample)</em>
                        </label>
                        <input
                          id="ttc-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={ttc ? ttc : ''}
                          onChange={(ev) => setTtc(ev.target.value)}
                        />
                        <label htmlFor="tta-input">
                          Time to Analyze <em>(person hrs/sample)</em>
                        </label>
                        <input
                          id="tta-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={tta ? tta : ''}
                          onChange={(ev) => setTta(ev.target.value)}
                        />
                        <label htmlFor="ttps-input">
                          Total Time per Sample <em>(person hrs/sample)</em>
                        </label>
                        <input
                          id="ttps-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={ttps ? ttps : ''}
                          onChange={(ev) => setTtps(ev.target.value)}
                        />
                        <label htmlFor="lod_p-input">
                          Limit of Detection (CFU) Porous{' '}
                          <em>(only used for reference)</em>
                        </label>
                        <input
                          id="lod_p-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={lodp ? lodp : ''}
                          onChange={(ev) => setLodp(ev.target.value)}
                        />
                        <label htmlFor="lod_non-input">
                          Limit of Detection (CFU) Nonporous{' '}
                          <em>(only used for reference)</em>
                        </label>
                        <input
                          id="lod_non-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={lodnon ? lodnon : ''}
                          onChange={(ev) => setLodnon(ev.target.value)}
                        />
                        <label htmlFor="mcps-input">
                          Sampling Material Cost <em>($/sample)</em>
                        </label>
                        <input
                          id="mcps-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={mcps ? mcps : ''}
                          onChange={(ev) => setMcps(ev.target.value)}
                        />
                        <label htmlFor="tcps-input">
                          Total Cost per Sample{' '}
                          <em>(Labor + Material + Waste)</em>
                        </label>
                        <input
                          id="tcps-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={tcps ? tcps : ''}
                          onChange={(ev) => setTcps(ev.target.value)}
                        />
                        <label htmlFor="wvps-input">
                          Waste Volume <em>(L/sample)</em>
                        </label>
                        <input
                          id="wvps-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={wvps ? wvps : ''}
                          onChange={(ev) => setWvps(ev.target.value)}
                        />
                        <label htmlFor="wwps-input">
                          Waste Weight <em>(lbs/sample)</em>
                        </label>
                        <input
                          id="wwps-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={wwps ? wwps : ''}
                          onChange={(ev) => setWwps(ev.target.value)}
                        />
                        <label htmlFor="alc-input">
                          Analysis Labor Cost <em>($)</em>
                        </label>
                        <input
                          id="alc-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={alc ? alc : ''}
                          onChange={(ev) => setAlc(ev.target.value)}
                        />
                        <label htmlFor="amc-input">
                          Analysis Material Cost <em>($)</em>
                        </label>
                        <input
                          id="amc-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={amc ? amc : ''}
                          onChange={(ev) => setAmc(ev.target.value)}
                        />
                      </div>
                      {validationMessage &&
                        userDefinedValidationMessage(validationMessage)}
                      <div css={inlineMenuStyles}>
                        <button
                          css={addButtonStyles}
                          onClick={(ev) => {
                            setEditingStatus(null);
                          }}
                        >
                          {editingStatus === 'view' ? 'Hide' : 'Cancel'}
                        </button>
                        {editingStatus !== 'view' && (
                          <button
                            css={addButtonStyles}
                            onClick={(ev) => {
                              const isValid = validateEdits();
                              const predefinedEdited =
                                editingStatus === 'edit' &&
                                userDefinedSampleType?.isPredefined;
                              if (isValid && sampleTypeName && shapeType) {
                                let newSampleType = {
                                  value: sampleTypeName,
                                  label: sampleTypeName,
                                  isPredefined: false,
                                };
                                if (predefinedEdited && userDefinedSampleType) {
                                  newSampleType = {
                                    value: userDefinedSampleType.value,
                                    label: `${userDefinedSampleType?.value} (edited)`,
                                    isPredefined:
                                      userDefinedSampleType.isPredefined,
                                  };
                                }

                                // update the sample attributes
                                const newAttributes = {
                                  OBJECTID: '-1',
                                  PERMANENT_IDENTIFIER: null,
                                  GLOBALID: null,
                                  TYPE: sampleTypeName,
                                  ShapeType: shapeType.value,
                                  TTPK: ttpk ? Number(ttpk) : null,
                                  TTC: ttc ? Number(ttc) : null,
                                  TTA: tta ? Number(tta) : null,
                                  TTPS: ttps ? Number(ttps) : null,
                                  LOD_P: lodp ? Number(lodp) : null,
                                  LOD_NON: lodnon ? Number(lodnon) : null,
                                  MCPS: mcps ? Number(mcps) : null,
                                  TCPS: tcps ? Number(tcps) : null,
                                  WVPS: wvps ? Number(wvps) : null,
                                  WWPS: wwps ? Number(wwps) : null,
                                  SA: sa ? Number(sa) : null,
                                  AA: null,
                                  ALC: alc ? Number(alc) : null,
                                  AMC: amc ? Number(amc) : null,
                                  Notes: '',
                                  CONTAMTYPE: null,
                                  CONTAMVAL: null,
                                  CONTAMUNIT: null,
                                  CREATEDDATE: null,
                                  UPDATEDDATE: null,
                                  USERNAME: null,
                                  ORGANIZATION: null,
                                  DECISIONUNITUUID: null,
                                  DECISIONUNIT: null,
                                  DECISIONUNITSORT: null,
                                };

                                // add/update the sample's attributes
                                sampleAttributes[
                                  sampleTypeName as any
                                ] = newAttributes;
                                setUserDefinedAttributes((item) => {
                                  item.attributes[
                                    sampleTypeName
                                  ] = newAttributes;

                                  // if the sampleTypeName changed, remove the attributes tied to the old name
                                  if (
                                    didSampleTypeNameChange() &&
                                    userDefinedSampleType
                                  ) {
                                    delete item.attributes[
                                      userDefinedSampleType.value
                                    ];
                                  }

                                  return {
                                    editCount: item.editCount + 1,
                                    attributes: item.attributes,
                                  };
                                });

                                // add the new option to the dropdown if it doesn't exist
                                const hasSample =
                                  userDefinedOptions.findIndex(
                                    (option) => option.value === sampleTypeName,
                                  ) > -1;
                                if (
                                  !hasSample &&
                                  userDefinedSampleType &&
                                  (editingStatus !== 'edit' ||
                                    (editingStatus === 'edit' &&
                                      !userDefinedSampleType.isPredefined))
                                ) {
                                  setUserDefinedOptions((options) => {
                                    if (!didSampleTypeNameChange()) {
                                      return [...options, newSampleType];
                                    }

                                    const newOptions: SampleSelectType[] = [];
                                    options.forEach((option) => {
                                      // if the sampleTypeName changed, replace the option tied to the old name with the new one
                                      if (
                                        didSampleTypeNameChange() &&
                                        option.value ===
                                          userDefinedSampleType.value
                                      ) {
                                        newOptions.push(newSampleType);
                                        return;
                                      }

                                      newOptions.push(option);
                                    });

                                    return newOptions;
                                  });
                                }

                                if (
                                  editingStatus === 'edit' &&
                                  userDefinedSampleType
                                ) {
                                  const oldType = userDefinedSampleType.value;

                                  // Update the attributes of the graphics on the map on edits
                                  let editsCopy: EditsType = edits;
                                  layers.forEach((layer) => {
                                    if (
                                      !['Samples', 'VSP'].includes(
                                        layer.layerType,
                                      ) ||
                                      layer.sketchLayer.type !== 'graphics'
                                    ) {
                                      return;
                                    }

                                    const editedGraphics = updateAttributes({
                                      graphics: layer.sketchLayer.graphics.toArray(),
                                      newAttributes,
                                      oldType,
                                    });

                                    if (editedGraphics.length > 0) {
                                      const collection = new Collection<
                                        __esri.Graphic
                                      >();
                                      collection.addMany(editedGraphics);
                                      editsCopy = updateLayerEdits({
                                        edits: editsCopy,
                                        layer,
                                        type: 'update',
                                        changes: collection,
                                      });
                                    }
                                  });

                                  setEdits(editsCopy);
                                }

                                // select the new sample type
                                setUserDefinedSampleType(newSampleType);

                                setEditingStatus(null);
                              }
                            }}
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionItem>
            </AccordionList>
          </React.Fragment>
        )}
      </div>
      <div css={sectionContainer}>
        <NavigationButton goToPanel="calculate" />
      </div>
    </div>
  );
}

export default LocateSamples;
