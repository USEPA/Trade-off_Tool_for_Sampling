/** @jsxImportSource @emotion/react */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import Collection from '@arcgis/core/core/Collection';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import Graphic from '@arcgis/core/Graphic';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import ColorPicker from 'components/ColorPicker';
import { EditScenario, EditLayer } from 'components/EditLayerMetaData';
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import NavigationButton from 'components/NavigationButton';
import Select from 'components/Select';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { DialogContext } from 'contexts/Dialog';
import {
  useLayerProps,
  useSampleTypesContext,
  useServicesContext,
} from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { PublishContext } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// types
import { LayerType } from 'types/Layer';
import { EditsType, ScenarioEditsType } from 'types/Edits';
import { ErrorType } from 'types/Misc';
// config
import {
  AttributeItems,
  SampleSelectType,
  PolygonSymbol,
} from 'config/sampleAttributes';
import {
  cantUseWithVspMessage,
  featureNotAvailableMessage,
  generateRandomExceededTransferLimitMessage,
  generateRandomSuccessMessage,
  userDefinedValidationMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
// utils
import { appendEnvironmentObjectParam } from 'utils/arcGisRestUtils';
import { useGeometryTools, useDynamicPopup, useStartOver } from 'utils/hooks';
import {
  convertToPoint,
  createLayer,
  createSampleLayer,
  deepCopyObject,
  findLayerInEdits,
  generateUUID,
  getCurrentDateTime,
  getDefaultSamplingMaskLayer,
  getNextScenarioLayer,
  getPointSymbol,
  getScenarios,
  getSketchableLayers,
  removeZValues,
  setZValues,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { geoprocessorFetch } from 'utils/fetchUtils';
import { createErrorObject, getLayerName, getScenarioName } from 'utils/utils';
// styles
import { reactSelectStyles } from 'styles';

type ShapeTypeSelect = {
  value: string;
  label: string;
};

type EditType = 'create' | 'edit' | 'clone' | 'view';

const sketchSelectedClass = 'sketch-button-selected';

const pointStyles: ShapeTypeSelect[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'cross', label: 'Cross' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'x', label: 'X' },
  {
    value:
      'path|M17.14 3 8.86 3 3 8.86 3 17.14 8.86 23 17.14 23 23 17.14 23 8.86 17.14 3z',
    label: 'Octagon',
  },
];

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
    usedNames.push(sampleType.label);
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
const buttonContainerStyles = css`
  display: flex;
  align-items: end;
`;

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
  color: #0085e3;
`;

// --- components (SketchButton) ---
type SketchButtonProps = {
  value: string;
  label: string;
  iconClass: string;
  layers: LayerType[];
  selectedScenario: ScenarioEditsType | null;
  onClick: () => void;
};

function SketchButton({
  value,
  label,
  iconClass,
  layers,
  selectedScenario,
  onClick,
}: SketchButtonProps) {
  // put an ellipses on the end if the text is to long
  const displayLabel = label.length > 30 ? `${label.substr(0, 30)}...` : label;
  let count = 0;

  layers.forEach((layer) => {
    if (layer.layerType !== 'Samples' && layer.layerType !== 'VSP') return;
    if (layer.sketchLayer.type === 'feature') return;
    if (layer?.parentLayer?.id !== selectedScenario?.layerId) return;

    layer.sketchLayer.graphics.forEach((graphic) => {
      if (graphic.attributes.TYPEUUID === value) count += 1;
    });
  });

  return (
    <button
      id={value}
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
            <Fragment>
              <br />
              <span css={sampleCountStyles}>{count}</span>
            </Fragment>
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
  justify-content: space-evenly;
`;

const headerStyles = css`
  margin: 0;
  padding: 0;
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

const lineSeparatorStyles = css`
  border-bottom: 1px solid #d8dfe2;
`;

const radioLabelStyles = css`
  padding-left: 0.375rem;
`;

const verticalCenterTextStyles = css`
  display: flex;
  align-items: center;
`;

// --- components (LocateSamples) ---
type GenerateRandomType = {
  status: 'none' | 'fetching' | 'success' | 'failure' | 'exceededTransferLimit';
  error?: ErrorType;
  data: __esri.Graphic[];
};

function LocateSamples() {
  const { userInfo } = useContext(AuthenticationContext);
  const { setOptions } = useContext(DialogContext);
  const { setGoTo, setGoToOptions, trainingMode } =
    useContext(NavigationContext);
  const { setSampleTypeSelections } = useContext(PublishContext);
  const {
    defaultSymbols,
    setDefaultSymbolSingle,
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
    displayGeometryType,
    sceneView,
    mapView,
  } = useContext(SketchContext);
  const startOver = useStartOver();
  const { createBuffer } = useGeometryTools();
  const getPopupTemplate = useDynamicPopup();
  const layerProps = useLayerProps();
  const sampleTypeContext = useSampleTypesContext();
  const services = useServicesContext();

  // Sets the sketchLayer to the first layer in the layer selection drop down,
  // if available. If the drop down is empty, an empty sketchLayer will be
  // created.
  const [
    sketchLayerInitialized,
    setSketchLayerInitialized, //
  ] = useState(false);
  useEffect(() => {
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
  useEffect(() => {
    if (!map || !layersInitialized || aoiSketchLayer) return;

    const newAoiSketchLayer = getDefaultSamplingMaskLayer();

    // add the layer to the map
    setLayers((layers) => {
      return [...layers, newAoiSketchLayer];
    });

    // set the active sketch layer
    setAoiSketchLayer(newAoiSketchLayer);
  }, [map, aoiSketchLayer, setAoiSketchLayer, layersInitialized, setLayers]);

  const [numberRandomSamples, setNumberRandomSamples] = useState('33');
  const [
    sampleType,
    setSampleType, //
  ] = useState<SampleSelectType | null>(null);

  // Initialize the selected sample type to the first option
  useEffect(() => {
    if (sampleTypeContext.status !== 'success') return;

    setSampleType(sampleTypeContext.data.sampleSelectOptions[0]);
  }, [sampleTypeContext]);

  // Handle a user clicking one of the sketch buttons
  function sketchButtonClick(label: string) {
    if (!sketchVM || !map || !sketchLayer || !sceneView || !mapView) return;

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

    // update the sketchVM symbol
    let symbolType = 'Samples';
    if (defaultSymbols.symbols.hasOwnProperty(label)) symbolType = label;

    sketchVM.polygonSymbol = defaultSymbols.symbols[symbolType] as any;
    sketchVM.pointSymbol = defaultSymbols.symbols[symbolType] as any;

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
  ] = useState<GenerateRandomType>({
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

    // make the style of the button active
    const wasSet = activateSketchButton('sampling-mask');

    if (wasSet) {
      // let the user draw/place the shape
      aoiSketchVM.create('polygon');
    } else {
      aoiSketchVM.cancel();
    }
  }

  // Handle a user generating random samples
  function randomSamples() {
    if (!map || !sketchLayer || !getGpMaxRecordCount || !sampleType) return;

    activateSketchButton('disable-all-buttons');
    sketchVM?.cancel();
    aoiSketchVM?.cancel();

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
        const originalValuesZ: number[] = [];
        let graphics: __esri.GraphicProperties[] = [];
        if (aoiMaskLayer?.sketchLayer?.type === 'graphics') {
          const fullGraphics = aoiMaskLayer.sketchLayer.graphics.clone();
          fullGraphics.forEach((graphic) => {
            const z = removeZValues(graphic);
            originalValuesZ.push(z);
          });

          graphics = fullGraphics.toArray();
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
        const typeuuid = sampleType.value;
        const sampleTypeFeatureSet = {
          displayFieldName: '',
          geometryType: 'esriGeometryPolygon',
          spatialReference: {
            wkid: 3857,
          },
          fields: layerProps.data.defaultFields,
          features: [
            {
              attributes: sampleAttributes[typeuuid as any],
            },
          ],
        };

        // determine the number of service calls needed to satisfy the request
        const intNumberRandomSamples = parseInt(numberRandomSamples); // 7
        const samplesPerCall = Math.floor(maxRecordCount / graphics.length);
        const iterations = Math.ceil(intNumberRandomSamples / samplesPerCall);

        // fire off the generateRandom requests
        const requests = [];
        let numSamples = 0;
        let numSamplesLeft = intNumberRandomSamples;
        for (let i = 0; i < iterations; i++) {
          // determine the number of samples for this request
          numSamples =
            numSamplesLeft > samplesPerCall ? samplesPerCall : numSamplesLeft;

          const props = {
            f: 'json',
            Number_of_Samples: numSamples,
            Sample_Type: sampleType.label,
            Area_of_Interest_Mask: featureSet.toJSON(),
            Sample_Type_Parameters: sampleTypeFeatureSet,
          };
          appendEnvironmentObjectParam(props);

          const request = geoprocessorFetch({
            url: `${services.data.totsGPServer}/Generate%20Random`,
            inputParameters: props,
          });
          requests.push(request);

          // keep track of the number of remaining samples
          numSamplesLeft = numSamplesLeft - numSamples;
        }
        Promise.all(requests)
          .then(async (responses: any) => {
            let res;
            const timestamp = getCurrentDateTime();
            const popupTemplate = getPopupTemplate('Samples', trainingMode);
            const graphicsToAdd: __esri.Graphic[] = [];
            const pointsToAdd: __esri.Graphic[] = [];
            const numberOfAois = graphics.length;
            for (let i = 0; i < responses.length; i++) {
              res = responses[i];
              if (!res?.results?.[0]?.value) {
                setGenerateRandomResponse({
                  status: 'failure',
                  error: {
                    error: createErrorObject(res),
                    message: 'No data',
                  },
                  data: [],
                });
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

              let originalZIndex = 0;
              const graphicsPerAoi = results.features.length / numberOfAois;

              // build an array of graphics to draw on the map
              let index = 0;
              for (const feature of results.features) {
                if (index !== 0 && index % graphicsPerAoi === 0)
                  originalZIndex += 1;

                const originalZ = originalValuesZ[originalZIndex];
                const poly = new Graphic({
                  attributes: {
                    ...(window as any).totsSampleAttributes[typeuuid],
                    CREATEDDATE: timestamp,
                    DECISIONUNITUUID: sketchLayer.uuid,
                    DECISIONUNIT: sketchLayer.label,
                    DECISIONUNITSORT: 0,
                    OBJECTID: feature.attributes.OBJECTID,
                    GLOBALID: feature.attributes.GLOBALID,
                    PERMANENT_IDENTIFIER:
                      feature.attributes.PERMANENT_IDENTIFIER,
                    UPDATEDDATE: timestamp,
                    USERNAME: userInfo?.username || '',
                    ORGANIZATION: userInfo?.orgId || '',
                  },
                  symbol,
                  geometry: new Polygon({
                    rings: feature.geometry.rings,
                    spatialReference: results.spatialReference,
                  }),
                  popupTemplate,
                });

                await setZValues({
                  map,
                  graphic: poly,
                  zOverride:
                    generateRandomElevationMode === 'aoiElevation'
                      ? originalZ
                      : null,
                });

                graphicsToAdd.push(poly);
                pointsToAdd.push(convertToPoint(poly));

                index += 1;
              }
            }

            // put the graphics on the map
            if (sketchLayer?.sketchLayer?.type === 'graphics') {
              // add the graphics to a collection so it can added to browser storage
              const collection = new Collection<__esri.Graphic>();
              collection.addMany(graphicsToAdd);
              sketchLayer.sketchLayer.graphics.addMany(collection);

              sketchLayer.pointsLayer?.addMany(pointsToAdd);

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
            setGenerateRandomResponse({
              status: 'failure',
              error: {
                error: createErrorObject(err),
                message: err.message,
              },
              data: [],
            });

            window.logErrorToGa(err);
          });
      })
      .catch((err: any) => {
        console.error(err);
        setGenerateRandomResponse({
          status: 'failure',
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          data: [],
        });

        window.logErrorToGa(err);
      });
  }

  const [userDefinedSampleType, setUserDefinedSampleType] =
    useState<SampleSelectType | null>(null);
  const [editingStatus, setEditingStatus] = useState<EditType | null>(null);
  const [sampleTypeName, setSampleTypeName] = useState<string>('');
  const [shapeType, setShapeType] = useState<ShapeTypeSelect | null>(null);
  const [pointStyle, setPointStyle] = useState<ShapeTypeSelect | null>(null);
  const [ttpk, setTtpk] = useState<string | null>('');
  const [ttc, setTtc] = useState<string | null>('');
  const [tta, setTta] = useState<string | null>('');
  const [ttps, setTtps] = useState<string | null>('');
  const [lodp, setLodp] = useState<string | null>('');
  const [lodnon, setLodnon] = useState<string | null>('');
  const [mcps, setMcps] = useState<string | null>('');
  const [tcps, setTcps] = useState<string | null>('');
  const [wvps, setWvps] = useState<string | null>('');
  const [wwps, setWwps] = useState<string | null>('');
  const [sa, setSa] = useState<string | null>('');
  const [alc, setAlc] = useState<string | null>('');
  const [amc, setAmc] = useState<string | null>('');
  const [validationMessage, setValidationMessage] = useState<
    JSX.Element[] | string
  >('');

  // Sets all of the user defined sample type inputs based on
  // which edit type is being used.
  function setSampleTypeInputs(editType: EditType) {
    if (editType === 'create') {
      setEditingStatus(editType);
      setShapeType(null);
      setPointStyle(null);
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
    let sampleTypeUuid = userDefinedSampleType.value;
    let sampleTypeName = userDefinedSampleType.label;
    const attributes = sampleAttributes[sampleTypeUuid as any];
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

    const pointStyle = pointStyles.find(
      (s) => s.value === attributes.POINT_STYLE,
    );
    setPointStyle(pointStyle || null);
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
          <Fragment key={index}>
            {index !== 0 ? <br /> : ''}
            {part}
          </Fragment>
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
      sampleTypeName !== userDefinedSampleType.label
    );
  }

  // Updates the attributes of graphics that have had property changes
  function updateAttributes({
    graphics,
    newAttributes,
    oldType,
    symbol = null,
  }: {
    graphics: __esri.Graphic[];
    newAttributes: any;
    oldType: string;
    symbol?: PolygonSymbol | null;
  }) {
    const editedGraphics: __esri.Graphic[] = [];
    graphics.forEach((graphic: __esri.Graphic) => {
      // update attributes for the edited type
      if (graphic.attributes.TYPEUUID === oldType) {
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
        graphic.attributes.POINT_STYLE = newAttributes.POINT_STYLE;

        // redraw the graphic if the width changed or if the graphic went from a
        // polygon to a point
        if (
          newAttributes.ShapeType === 'point' &&
          (areaChanged || shapeTypeChanged)
        ) {
          // convert the geometry _esriPolygon if it is missing stuff
          createBuffer(graphic as __esri.Graphic);
        }

        // update the point symbol if necessary
        if (graphic.geometry.type === 'point') {
          graphic.symbol = getPointSymbol(graphic, symbol);
        }

        editedGraphics.push(graphic);
      }
    });

    return editedGraphics;
  }

  // Changes the selected layer if the scenario is changed. The first
  // available layer in the scenario will be chosen. If the scenario
  // has no layers, then the first availble unlinked layer is chosen.
  useEffect(() => {
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
  const [addScenarioVisible, setAddScenarioVisible] = useState(false);
  const [editScenarioVisible, setEditScenarioVisible] = useState(false);
  const [addLayerVisible, setAddLayerVisible] = useState(false);
  const [editLayerVisible, setEditLayerVisible] = useState(false);
  const [generateRandomMode, setGenerateRandomMode] = useState<
    'draw' | 'file' | ''
  >('');
  const [generateRandomElevationMode, setGenerateRandomElevationMode] =
    useState<'ground' | 'aoiElevation'>('aoiElevation');
  const [selectedAoiFile, setSelectedAoiFile] = useState<LayerType | null>(
    null,
  );

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

  // Initialize the local user defined type symbol. Also updates this variable
  // when the user changes the user defined sample type selection.
  const [udtSymbol, setUdtSymbol] = useState<PolygonSymbol>(
    defaultSymbols.symbols['Samples'],
  );
  useEffect(() => {
    if (!userDefinedSampleType) return;

    if (defaultSymbols.symbols.hasOwnProperty(userDefinedSampleType.value)) {
      setUdtSymbol(defaultSymbols.symbols[userDefinedSampleType.value]);
    } else {
      setUdtSymbol(defaultSymbols.symbols['Samples']);
    }
  }, [defaultSymbols, userDefinedSampleType]);

  pointStyles.sort((a, b) => a.value.localeCompare(b.value));

  return (
    <div css={panelContainer}>
      <div>
        <div css={sectionContainer}>
          <h2 css={headerStyles}>Create Plan</h2>
          <div css={headerContainer}>
            <button css={deleteButtonStyles} onClick={startOver}>
              <i className="fas fa-redo-alt" />
              <br />
              Start Over
            </button>
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
                (sketchVM.layer as any).parent.layers.forEach((layer: any) => {
                  if (layer.id === sketchVM.layer.id + '-points') {
                    layer.removeAll();
                  }
                });
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
            <Fragment>
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
            </Fragment>
          )}

          {scenarios.length === 0 ? (
            <EditScenario addDefaultSampleLayer={true} />
          ) : (
            <Fragment>
              <div css={iconButtonContainerStyles}>
                <div css={verticalCenterTextStyles}>
                  <label htmlFor="scenario-select-input">Specify Plan</label>
                </div>
                <div>
                  {selectedScenario && (
                    <Fragment>
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

                          // make the new selection visible
                          if (scenarios.length > 0) {
                            const newSelection = map.layers.find(
                              (layer) => layer.id === scenarios[0].layerId,
                            );
                            if (newSelection) newSelection.visible = true;
                          }

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
                        title="Clone Scenario"
                        onClick={(ev) => {
                          if (!map) return;

                          // get the name for the new layer
                          const newScenarioName = getScenarioName(
                            edits,
                            selectedScenario.label,
                          );

                          // get the edits from the selected scenario
                          const selectedScenarioEdits = findLayerInEdits(
                            edits.edits,
                            selectedScenario.layerId,
                          ).editsScenario;
                          if (!selectedScenarioEdits) return;

                          // copy the edits for that scenario
                          const copiedScenario: ScenarioEditsType =
                            deepCopyObject(selectedScenarioEdits);

                          // find the selected group layer
                          const selectedGroupLayer = map.layers.find(
                            (layer) => layer.id === copiedScenario.layerId,
                          );

                          // create a new group layer for the cloned scenario
                          const groupLayer = new GroupLayer({
                            title: newScenarioName,
                            visible: selectedGroupLayer.visible,
                            listMode: selectedGroupLayer.listMode,
                          });

                          // update the name and id for the copied scenario
                          copiedScenario.addedFrom = 'sketch';
                          copiedScenario.editType = 'add';
                          copiedScenario.hasContaminationRan = false;
                          copiedScenario.id = -1;
                          copiedScenario.label = newScenarioName;
                          copiedScenario.layerId = groupLayer.id;
                          copiedScenario.name = newScenarioName;
                          copiedScenario.pointsId = -1;
                          copiedScenario.portalId = '';
                          copiedScenario.scenarioName = newScenarioName;
                          copiedScenario.status = 'added';
                          copiedScenario.value = groupLayer.id;

                          // loop through and generate new uuids for layers/graphics
                          const timestamp = getCurrentDateTime();
                          copiedScenario.layers.forEach((layer) => {
                            // update info for layer
                            const layerUuid = generateUUID();
                            layer.addedFrom = 'sketch';
                            layer.editType = 'add';
                            layer.hasContaminationRan = false;
                            layer.id = -1;
                            layer.layerId = layerUuid;
                            layer.pointsId = -1;
                            layer.portalId = '';
                            layer.status = 'added';
                            layer.uuid = layerUuid;

                            // update info for combine adds, published, and updates
                            const newAdds = [...layer.adds, ...layer.updates];
                            layer.published.forEach((sample) => {
                              const alreadyAdded =
                                newAdds.findIndex(
                                  (addedSample) =>
                                    addedSample.attributes
                                      .PERMANENT_IDENTIFIER ===
                                    sample.attributes.PERMANENT_IDENTIFIER,
                                ) > -1;
                              if (!alreadyAdded) newAdds.push(sample);
                            });
                            layer.adds = newAdds;

                            // update info for adds
                            layer.adds.forEach((sample) => {
                              const sampleUuid = generateUUID();
                              sample.attributes.CREATEDDATE = timestamp;
                              sample.attributes.DECISIONUNITUUID = layerUuid;
                              sample.attributes.GLOBALID = sampleUuid;
                              sample.attributes.OBJECTID = -1;
                              sample.attributes.PERMANENT_IDENTIFIER =
                                sampleUuid;
                              sample.attributes.UPDATEDDATE = timestamp;
                            });

                            // clear out deletes, updates, and published
                            layer.deletes = [];
                            layer.updates = [];
                            layer.published = [];
                          });

                          const newLayers: LayerType[] = [];
                          const scenarioLayers: __esri.GraphicsLayer[] = [];
                          copiedScenario.layers.forEach((layer) => {
                            scenarioLayers.push(
                              ...createLayer({
                                defaultSymbols,
                                editsLayer: layer,
                                getPopupTemplate,
                                newLayers,
                                parentLayer: groupLayer,
                              }),
                            );
                          });
                          groupLayer.addMany(scenarioLayers);
                          map.add(groupLayer);

                          setLayers((layers) => {
                            return [...layers, ...newLayers];
                          });

                          const fullCopyEdits: EditsType =
                            deepCopyObject(edits);
                          fullCopyEdits.edits.push(copiedScenario);

                          setEdits(fullCopyEdits);

                          setSelectedScenario(copiedScenario);
                        }}
                      >
                        <i className="fas fa-clone" />
                        <span className="sr-only">Clone Scenario</span>
                      </button>
                      {selectedScenario.status !== 'published' && (
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
                              editScenarioVisible
                                ? 'fas fa-times'
                                : 'fas fa-edit'
                            }
                          />
                          <span className="sr-only">
                            {editScenarioVisible ? 'Cancel' : 'Edit Plan'}
                          </span>
                        </button>
                      )}
                    </Fragment>
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
                id="scenario-select-input-container"
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
            </Fragment>
          )}

          {selectedScenario && !addScenarioVisible && !editScenarioVisible && (
            <Fragment>
              <div css={iconButtonContainerStyles}>
                <div css={verticalCenterTextStyles}>
                  <label htmlFor="sampling-layer-select-input">
                    Active
                    <br />
                    Sampling Layer
                  </label>
                </div>
                <div css={buttonContainerStyles}>
                  {sketchLayer && (
                    <Fragment>
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
                                if (editsScenario.status === 'published') {
                                  editsScenario.status = 'edited';
                                }

                                return {
                                  count: edits.count + 1,
                                  edits: [
                                    ...edits.edits.slice(0, scenarioIndex),
                                    editsScenario,
                                    ...edits.edits.slice(scenarioIndex + 1),
                                    {
                                      ...editsLayer,
                                      visible: false,
                                    },
                                  ],
                                };
                              }

                              return {
                                count: edits.count + 1,
                                edits: [...edits.edits, editsLayer],
                              };
                            });

                            // remove the layer from the parent group layer and add to map
                            sketchLayer.sketchLayer.visible = false;
                            sketchLayer.parentLayer?.remove(
                              sketchLayer.sketchLayer,
                            );
                            map.add(sketchLayer.sketchLayer);
                            if (sketchLayer.pointsLayer) {
                              sketchLayer.pointsLayer.visible = false;
                              sketchLayer.parentLayer?.remove(
                                sketchLayer.pointsLayer,
                              );
                              map.add(sketchLayer.pointsLayer);
                            }

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
                            if (sketchLayer.pointsLayer) {
                              groupLayer.add(sketchLayer.pointsLayer);
                            }

                            // show the newly added layer
                            if (
                              displayGeometryType === 'points' &&
                              sketchLayer.pointsLayer
                            ) {
                              sketchLayer.pointsLayer.visible = true;
                            } else {
                              sketchLayer.sketchLayer.visible = true;
                            }

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
                              editedScenario.layers =
                                editedScenario.layers.filter(
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

                            if (sketchLayer.sketchLayer)
                              parentLayer.remove(sketchLayer.sketchLayer);
                            if (sketchLayer.pointsLayer)
                              parentLayer.remove(sketchLayer.pointsLayer);
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
                      <button
                        css={iconButtonStyles}
                        title="Clone Layer"
                        onClick={(ev) => {
                          // get the name for the new layer
                          const newLayerName = getLayerName(
                            layers,
                            sketchLayer.label,
                          );

                          // create the layer
                          const tempLayer = createSampleLayer(
                            newLayerName,
                            sketchLayer.parentLayer,
                          );
                          if (
                            !map ||
                            sketchLayer.sketchLayer.type !== 'graphics' ||
                            tempLayer.sketchLayer.type !== 'graphics' ||
                            !tempLayer.pointsLayer ||
                            tempLayer.pointsLayer.type !== 'graphics'
                          )
                            return;

                          const clonedGraphics: __esri.Graphic[] = [];
                          const clonedPointGraphics: __esri.Graphic[] = [];
                          sketchLayer.sketchLayer.graphics.forEach(
                            (graphic) => {
                              const uuid = generateUUID();
                              const clonedGraphic = new Graphic({
                                attributes: {
                                  ...graphic.attributes,
                                  GLOBALID: uuid,
                                  PERMANENT_IDENTIFIER: uuid,
                                  DECISIONUNIT: tempLayer.name,
                                  DECISIONUNITUUID: tempLayer.uuid,
                                },
                                geometry: graphic.geometry,
                                popupTemplate: graphic.popupTemplate,
                                symbol: graphic.symbol,
                              });
                              clonedGraphics.push(clonedGraphic);

                              clonedPointGraphics.push(
                                convertToPoint(clonedGraphic),
                              );
                            },
                          );

                          tempLayer.sketchLayer.addMany(clonedGraphics);
                          tempLayer.pointsLayer.addMany(clonedPointGraphics);

                          // add the new layer to layers
                          setLayers((layers) => {
                            return [...layers, tempLayer];
                          });

                          // clone the active layer in edits
                          // make a copy of the edits context variable
                          let editsCopy = updateLayerEdits({
                            changes: tempLayer.sketchLayer.graphics,
                            edits,
                            scenario: selectedScenario,
                            layer: tempLayer,
                            type: 'add',
                          });
                          setEdits(editsCopy);

                          // add the layer to the scenario's group layer, a scenario is selected
                          const groupLayer = map.layers.find(
                            (layer) => layer.id === selectedScenario?.layerId,
                          );
                          if (groupLayer && groupLayer.type === 'group') {
                            const tempGroupLayer =
                              groupLayer as __esri.GroupLayer;
                            tempGroupLayer.add(tempLayer.sketchLayer);
                            if (tempLayer.pointsLayer) {
                              tempGroupLayer.add(tempLayer.pointsLayer);
                            }
                          }

                          // make the new layer the active sketch layer
                          setSketchLayer(tempLayer);

                          setSelectedScenario((selectedScenario) => {
                            if (!selectedScenario) return selectedScenario;

                            const scenario = editsCopy.edits.find(
                              (edit) =>
                                edit.type === 'scenario' &&
                                edit.layerId === selectedScenario.layerId,
                            ) as ScenarioEditsType;
                            const newLayer = scenario.layers.find(
                              (layer) => layer.layerId === tempLayer.layerId,
                            );

                            if (!newLayer) return selectedScenario;

                            return {
                              ...selectedScenario,
                              layers: [...selectedScenario.layers, newLayer],
                            };
                          });
                        }}
                      >
                        <i className="fas fa-clone" />
                        <span className="sr-only">Clone Layer</span>
                      </button>
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
                    </Fragment>
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
                onChange={(ev) => setSketchLayer(ev as LayerType)}
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
            </Fragment>
          )}
        </div>

        {selectedScenario && (
          <Fragment>
            <div css={sectionContainerWidthOnly}>
              <p>
                In the panels below, add targeted and/ or multiple samples to
                the plan.
              </p>
              <ColorPicker
                title="Default Sample Symbology"
                symbol={defaultSymbols.symbols['Samples']}
                onChange={(symbol: PolygonSymbol) => {
                  setDefaultSymbolSingle('Samples', symbol);
                }}
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
                        <Fragment>
                          {sampleTypeContext.data.sampleSelectOptions.map(
                            (option: any, index: number) => {
                              const sampleTypeUuid = option.value;
                              const sampleType = option.label;

                              if (
                                !sampleAttributes.hasOwnProperty(sampleTypeUuid)
                              ) {
                                return null;
                              }

                              const shapeType =
                                sampleAttributes[sampleTypeUuid].ShapeType;
                              const edited =
                                userDefinedAttributes.sampleTypes.hasOwnProperty(
                                  sampleTypeUuid,
                                );
                              return (
                                <SketchButton
                                  key={index}
                                  layers={layers}
                                  value={sampleTypeUuid}
                                  selectedScenario={selectedScenario}
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
                                  onClick={() =>
                                    sketchButtonClick(sampleTypeUuid)
                                  }
                                />
                              );
                            },
                          )}
                        </Fragment>
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

                          const sampleTypeUuid = option.value;
                          const shapeType =
                            sampleAttributes[sampleTypeUuid as any].ShapeType;
                          return (
                            <SketchButton
                              key={index}
                              value={sampleTypeUuid}
                              label={option.label}
                              layers={layers}
                              selectedScenario={selectedScenario}
                              iconClass={
                                shapeType === 'point'
                                  ? 'fas fa-pen-fancy'
                                  : 'fas fa-draw-polygon'
                              }
                              onClick={() => sketchButtonClick(sampleTypeUuid)}
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
                    <Fragment>
                      {(services.status === 'fetching' ||
                        sampleTypeContext.status === 'fetching' ||
                        layerProps.status === 'fetching') && <LoadingSpinner />}
                      {(services.status === 'failure' ||
                        sampleTypeContext.status === 'failure' ||
                        layerProps.status === 'failure') &&
                        featureNotAvailableMessage(
                          'Add Multiple Random Samples',
                        )}
                      {services.status === 'success' &&
                        sampleTypeContext.status === 'success' &&
                        layerProps.status === 'success' && (
                          <Fragment>
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
                                disabled={
                                  generateRandomResponse.status === 'fetching'
                                }
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

                            {generateRandomMode === 'draw' && (
                              <button
                                id="sampling-mask"
                                title="Draw Sampling Mask"
                                className="sketch-button"
                                disabled={
                                  generateRandomResponse.status === 'fetching'
                                }
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

                            <div>
                              <input
                                id="use-aoi-file"
                                type="radio"
                                name="mode"
                                value="Use Imported Area of Interest"
                                disabled={
                                  generateRandomResponse.status === 'fetching'
                                }
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

                            {generateRandomMode === 'file' && (
                              <Fragment>
                                <label htmlFor="aoi-mask-select-input">
                                  Area of Interest Mask
                                </label>
                                <div css={inlineMenuStyles}>
                                  <Select
                                    id="aoi-mask-select"
                                    inputId="aoi-mask-select-input"
                                    css={inlineSelectStyles}
                                    styles={reactSelectStyles as any}
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
                                    disabled={
                                      generateRandomResponse.status ===
                                      'fetching'
                                    }
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
                              </Fragment>
                            )}
                            {generateRandomMode && (
                              <Fragment>
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

                                <div>
                                  <input
                                    id="use-aoi-elevation"
                                    type="radio"
                                    name="elevation-mode"
                                    value="Use AOI Elevation"
                                    disabled={
                                      generateRandomResponse.status ===
                                      'fetching'
                                    }
                                    checked={
                                      generateRandomElevationMode ===
                                      'aoiElevation'
                                    }
                                    onChange={(ev) => {
                                      setGenerateRandomElevationMode(
                                        'aoiElevation',
                                      );
                                    }}
                                  />
                                  <label
                                    htmlFor="use-aoi-elevation"
                                    css={radioLabelStyles}
                                  >
                                    Use AOI Elevation
                                  </label>
                                </div>
                                <div>
                                  <input
                                    id="snap-to-ground"
                                    type="radio"
                                    name="elevation-mode"
                                    value="Snap to Ground"
                                    disabled={
                                      generateRandomResponse.status ===
                                      'fetching'
                                    }
                                    checked={
                                      generateRandomElevationMode === 'ground'
                                    }
                                    onChange={(ev) => {
                                      setGenerateRandomElevationMode('ground');
                                    }}
                                  />
                                  <label
                                    htmlFor="snap-to-ground"
                                    css={radioLabelStyles}
                                  >
                                    Snap to Ground
                                  </label>
                                </div>

                                {generateRandomResponse.status === 'success' &&
                                  sketchLayer &&
                                  generateRandomSuccessMessage(
                                    generateRandomResponse.data.length,
                                    sketchLayer.label,
                                  )}
                                {generateRandomResponse.status === 'failure' &&
                                  webServiceErrorMessage(
                                    generateRandomResponse.error,
                                  )}
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
                                    disabled={
                                      generateRandomResponse.status ===
                                      'fetching'
                                    }
                                    onClick={randomSamples}
                                  >
                                    {generateRandomResponse.status !==
                                      'fetching' && 'Submit'}
                                    {generateRandomResponse.status ===
                                      'fetching' && (
                                      <Fragment>
                                        <i className="fas fa-spinner fa-pulse" />
                                        &nbsp;&nbsp;Loading...
                                      </Fragment>
                                    )}
                                  </button>
                                )}
                              </Fragment>
                            )}
                          </Fragment>
                        )}
                    </Fragment>
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
                    <label htmlFor="cst-sample-type-select-input">
                      Sample Type
                    </label>
                    <div>
                      {userDefinedSampleType && (
                        <Fragment>
                          {!editingStatus &&
                            !userDefinedSampleType.isPredefined && (
                              <button
                                css={iconButtonStyles}
                                title="Delete Sample Type"
                                onClick={() => {
                                  setValidationMessage('');
                                  const sampleTypeUuid =
                                    userDefinedSampleType.value;

                                  setOptions({
                                    title: 'Would you like to continue?',
                                    ariaLabel: 'Would you like to continue?',
                                    description:
                                      'Sample plans are referencing samples based on one or more of the custom sample types. ' +
                                      'This operation will delete any samples from the sampling plan that are associated ' +
                                      'with these custom sample types that you are attempting to remove.',
                                    onContinue: () => {
                                      setUserDefinedOptions(
                                        userDefinedOptions.filter(
                                          (option) =>
                                            option.value !== sampleTypeUuid,
                                        ),
                                      );
                                      setUserDefinedAttributes(
                                        (userDefined) => {
                                          const newUserDefined = {
                                            ...userDefined,
                                          };

                                          // mark to delete if this is a published sample type
                                          // otherwise just remove it
                                          if (
                                            newUserDefined.sampleTypes[
                                              sampleTypeUuid
                                            ].serviceId
                                          ) {
                                            newUserDefined.sampleTypes[
                                              sampleTypeUuid
                                            ].status = 'delete';
                                          } else {
                                            delete newUserDefined.sampleTypes[
                                              sampleTypeUuid
                                            ];
                                          }

                                          newUserDefined.editCount =
                                            newUserDefined.editCount + 1;
                                          return newUserDefined;
                                        },
                                      );
                                      setSampleTypeSelections([]);

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

                                        const graphicsToRemove: __esri.Graphic[] =
                                          [];
                                        layer.sketchLayer.graphics.forEach(
                                          (graphic) => {
                                            if (
                                              graphic.attributes.TYPEUUID ===
                                              sampleTypeUuid
                                            ) {
                                              graphicsToRemove.push(graphic);
                                            }
                                          },
                                        );
                                        layer.sketchLayer.removeMany(
                                          graphicsToRemove,
                                        );

                                        if (graphicsToRemove.length > 0) {
                                          const collection =
                                            new Collection<__esri.Graphic>();
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
                              setValidationMessage('');
                              if (editingStatus === 'clone') {
                                setEditingStatus(null);
                                if (
                                  userDefinedSampleType &&
                                  defaultSymbols.symbols.hasOwnProperty(
                                    userDefinedSampleType.value,
                                  )
                                ) {
                                  setUdtSymbol(
                                    defaultSymbols.symbols[
                                      userDefinedSampleType.value
                                    ],
                                  );
                                } else {
                                  setUdtSymbol(
                                    defaultSymbols.symbols['Samples'],
                                  );
                                }
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
                                setValidationMessage('');
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
                                setValidationMessage('');
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
                        </Fragment>
                      )}
                      <button
                        css={iconButtonStyles}
                        title={
                          editingStatus === 'create'
                            ? 'Cancel'
                            : 'Create Sample Type'
                        }
                        onClick={(ev) => {
                          setValidationMessage('');
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
                    id="cst-sample-type-select"
                    inputId="cst-sample-type-select-input"
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
                      <ColorPicker
                        symbol={udtSymbol}
                        onChange={(symbol: PolygonSymbol) => {
                          setUdtSymbol(symbol);
                        }}
                      />
                      <label htmlFor="point-style-select-input">
                        Point Style
                      </label>
                      <Select
                        id="point-style-select"
                        inputId="point-style-select-input"
                        css={fullWidthSelectStyles}
                        value={pointStyle}
                        isDisabled={editingStatus === 'view'}
                        onChange={(ev) => setPointStyle(ev as ShapeTypeSelect)}
                        options={pointStyles}
                      />
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
                        {/* <label htmlFor="ttps-input">
                          Total Time per Sample <em>(person hrs/sample)</em>
                        </label>
                        <input
                          id="ttps-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={ttps ? ttps : ''}
                          onChange={(ev) => setTtps(ev.target.value)}
                        /> */}
                        <label htmlFor="lod_p-input">
                          Limit of Detection for Porous Surfaces per Sample
                          (CFU) <em>(only used for reference)</em>
                        </label>
                        <input
                          id="lod_p-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={lodp ? lodp : ''}
                          onChange={(ev) => setLodp(ev.target.value)}
                        />
                        <label htmlFor="lod_non-input">
                          Limit of Detection for Nonporous Surfaces per Sample
                          (CFU) <em>(only used for reference)</em>
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
                        {/* <label htmlFor="tcps-input">
                          Total Cost per Sample{' '}
                          <em>(Labor + Material + Waste)</em>
                        </label>
                        <input
                          id="tcps-input"
                          disabled={editingStatus === 'view'}
                          css={inputStyles}
                          value={tcps ? tcps : ''}
                          onChange={(ev) => setTcps(ev.target.value)}
                        /> */}
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
                            setValidationMessage('');
                          }}
                        >
                          {editingStatus === 'view' ? 'Hide' : 'Cancel'}
                        </button>
                        {(editingStatus !== 'view' ||
                          (editingStatus === 'view' &&
                            udtSymbol &&
                            userDefinedSampleType &&
                            ((defaultSymbols.symbols.hasOwnProperty(
                              userDefinedSampleType.value,
                            ) &&
                              JSON.stringify(udtSymbol) !==
                                JSON.stringify(
                                  defaultSymbols.symbols[
                                    userDefinedSampleType.value
                                  ],
                                )) ||
                              (!defaultSymbols.symbols.hasOwnProperty(
                                userDefinedSampleType.value,
                              ) &&
                                JSON.stringify(udtSymbol) !==
                                  JSON.stringify(
                                    defaultSymbols.symbols['Samples'],
                                  ))))) && (
                          <button
                            css={addButtonStyles}
                            onClick={(ev) => {
                              setValidationMessage('');
                              const typeUuid =
                                (editingStatus === 'edit' ||
                                  editingStatus === 'view') &&
                                userDefinedSampleType?.value
                                  ? userDefinedSampleType.value
                                  : generateUUID();

                              if (udtSymbol) {
                                setDefaultSymbolSingle(typeUuid, udtSymbol);
                              }

                              if (editingStatus === 'view') return;

                              const isValid = validateEdits();
                              const predefinedEdited =
                                editingStatus === 'edit' &&
                                userDefinedSampleType?.isPredefined;
                              if (isValid && sampleTypeName && shapeType) {
                                let newSampleType = {
                                  value: typeUuid,
                                  label: sampleTypeName,
                                  isPredefined: false,
                                };
                                if (predefinedEdited && userDefinedSampleType) {
                                  newSampleType = {
                                    value: userDefinedSampleType.value,
                                    label: `${userDefinedSampleType?.label} (edited)`,
                                    isPredefined:
                                      userDefinedSampleType.isPredefined,
                                  };
                                }

                                // update the sample attributes
                                const newAttributes: AttributeItems = {
                                  OBJECTID: '-1',
                                  PERMANENT_IDENTIFIER: null,
                                  GLOBALID: null,
                                  TYPEUUID: typeUuid,
                                  TYPE: sampleTypeName,
                                  ShapeType: shapeType.value,
                                  POINT_STYLE: pointStyle?.value || 'circle',
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
                                  DECISIONUNITSORT: 0,
                                };
                                if (
                                  userDefinedAttributes.sampleTypes.hasOwnProperty(
                                    typeUuid,
                                  )
                                ) {
                                  const sampleType =
                                    userDefinedAttributes.sampleTypes[typeUuid]
                                      .attributes;
                                  if (sampleType.OBJECTID) {
                                    newAttributes.OBJECTID =
                                      sampleType.OBJECTID;
                                  }
                                  if (sampleType.GLOBALID) {
                                    newAttributes.GLOBALID =
                                      sampleType.GLOBALID;
                                  }
                                }

                                // add/update the sample's attributes
                                sampleAttributes[typeUuid as any] =
                                  newAttributes;
                                setUserDefinedAttributes((item) => {
                                  let status:
                                    | 'add'
                                    | 'edit'
                                    | 'delete'
                                    | 'published' = 'add';
                                  if (
                                    item.sampleTypes[typeUuid]?.status ===
                                    'published'
                                  ) {
                                    status = 'edit';
                                  }
                                  if (
                                    item.sampleTypes[typeUuid]?.status ===
                                    'delete'
                                  ) {
                                    status = 'delete';
                                  }

                                  item.sampleTypes[typeUuid] = {
                                    status,
                                    attributes: newAttributes,
                                    serviceId: item.sampleTypes.hasOwnProperty(
                                      typeUuid,
                                    )
                                      ? item.sampleTypes[typeUuid].serviceId
                                      : '',
                                  };

                                  return {
                                    editCount: item.editCount + 1,
                                    sampleTypes: item.sampleTypes,
                                  };
                                });

                                // add the new option to the dropdown if it doesn't exist
                                if (
                                  editingStatus !== 'edit' ||
                                  (editingStatus === 'edit' &&
                                    !userDefinedSampleType?.isPredefined)
                                ) {
                                  setUserDefinedOptions((options) => {
                                    if (editingStatus !== 'edit') {
                                      return [...options, newSampleType];
                                    }

                                    const newOptions: SampleSelectType[] = [];
                                    options.forEach((option) => {
                                      // if the sampleTypeName changed, replace the option tied to the old name with the new one
                                      if (
                                        didSampleTypeNameChange() &&
                                        option.value ===
                                          userDefinedSampleType?.value
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
                                      graphics:
                                        layer.sketchLayer.graphics.toArray(),
                                      newAttributes,
                                      oldType,
                                    });
                                    if (layer.pointsLayer) {
                                      updateAttributes({
                                        graphics:
                                          layer.pointsLayer.graphics.toArray(),
                                        newAttributes,
                                        oldType,
                                        symbol: udtSymbol,
                                      });
                                    }

                                    if (editedGraphics.length > 0) {
                                      const collection =
                                        new Collection<__esri.Graphic>();
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
          </Fragment>
        )}
      </div>
      <div css={sectionContainer}>
        <NavigationButton goToPanel="calculate" />
      </div>
    </div>
  );
}

export default LocateSamples;
