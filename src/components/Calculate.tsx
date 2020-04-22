/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import ShowLessMore from 'components/ShowLessMore';
import NavigationButton from 'components/NavigationButton';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { CalculateContext } from 'contexts/Calculate';
import { SketchContext } from 'contexts/Sketch';
// config
import { totsGPServer } from 'config/webService';
// utils
import { geoprocessorFetch } from 'utils/fetchUtils';
import { CalculateResultsType } from 'types/CalculateResults';
import { getPopupTemplate, updateLayerEdits } from 'utils/sketchUtils';

type ContaminationResultsType = {
  status:
    | 'none'
    | 'no-layer'
    | 'no-map'
    | 'no-contamination-graphics'
    | 'no-graphics'
    | 'fetching'
    | 'success'
    | 'failure';
  data: any[] | null;
};

// --- styles (Calculate) ---
const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const submitButtonContainerStyles = css`
  margin-top: 10px;
`;

const submitButtonStyles = css`
  margin: 10px 0;
  width: 100%;
`;

const panelContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  padding: 20px;
`;

const sectionContainer = css`
  margin-bottom: 10px;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

// --- components (Calculate) ---
function Calculate() {
  const { FeatureSet, Geoprocessor, PopupTemplate } = useEsriModulesContext();
  const { edits, setEdits, sketchLayer } = React.useContext(SketchContext);
  const {
    contaminationMap,
    calculateResults,
    setCalculateResults,
    numLabs,
    setNumLabs,
    numLabHours,
    setNumLabHours,
    numSamplingHours,
    setNumSamplingHours,
    numSamplingPersonnel,
    setNumSamplingPersonnel,
    numSamplingShifts,
    setNumSamplingShifts,
    numSamplingTeams,
    setNumSamplingTeams,
    samplingLaborCost,
    setSamplingLaborCost,
    surfaceArea,
    setSurfaceArea,
  } = React.useContext(CalculateContext);

  // callback for closing the results panel when leaving this tab
  const closePanel = React.useCallback(() => {
    setCalculateResults((calculateResults: CalculateResultsType) => {
      return {
        ...calculateResults,
        panelOpen: false,
      };
    });
  }, [setCalculateResults]);

  // Cleanup useEffect for closing the results panel when leaving
  // this tab
  React.useEffect(() => {
    return function cleanup() {
      closePanel();
    };
  }, [closePanel]);

  // input states
  const [inputNumLabs, setInputNumLabs] = React.useState(numLabs);
  const [inputNumLabHours, setInputNumLabHours] = React.useState(numLabHours);
  const [inputSurfaceArea, setInputSurfaceArea] = React.useState(surfaceArea);
  const [
    inputNumSamplingHours,
    setInputNumSamplingHours, //
  ] = React.useState(numSamplingHours);
  const [
    inputNumSamplingPersonnel,
    setInputNumSamplingPersonnel,
  ] = React.useState(numSamplingPersonnel);
  const [
    inputNumSamplingShifts,
    setInputNumSamplingShifts, //
  ] = React.useState(numSamplingShifts);
  const [
    inputNumSamplingTeams,
    setInputNumSamplingTeams, //
  ] = React.useState(numSamplingTeams);
  const [
    inputSamplingLaborCost,
    setInputSamplingLaborCost, //
  ] = React.useState(samplingLaborCost);

  // updates the calculate context with the user input values
  function updateContextValues() {
    setNumLabs(inputNumLabs);
    setNumLabHours(inputNumLabHours);
    setNumSamplingHours(inputNumSamplingHours);
    setNumSamplingPersonnel(inputNumSamplingPersonnel);
    setNumSamplingShifts(inputNumSamplingShifts);
    setNumSamplingTeams(inputNumSamplingTeams);
    setSamplingLaborCost(inputSamplingLaborCost);
    setSurfaceArea(inputSurfaceArea);
  }

  // updates context to run the calculations
  function runCalculation() {
    // set the no layer status
    if (
      !sketchLayer?.sketchLayer ||
      sketchLayer.sketchLayer.type !== 'graphics'
    ) {
      setCalculateResults({ status: 'no-layer', panelOpen: true, data: null });
      return;
    }

    // set the no graphics status
    if (sketchLayer.sketchLayer.graphics.length === 0) {
      setCalculateResults({
        status: 'no-graphics',
        panelOpen: true,
        data: null,
      });
      return;
    }

    // if the inputs are the same as context
    // fake a loading spinner and open the panel
    if (
      calculateResults.status === 'success' &&
      numLabs === inputNumLabs &&
      numLabHours === inputNumLabHours &&
      numSamplingHours === inputNumSamplingHours &&
      numSamplingPersonnel === inputNumSamplingPersonnel &&
      numSamplingTeams === inputNumSamplingTeams &&
      samplingLaborCost === inputSamplingLaborCost &&
      surfaceArea === inputSurfaceArea
    ) {
      // display the loading spinner for 1 second
      setCalculateResults({
        status: 'fetching',
        panelOpen: true,
        data: calculateResults.data,
      });
      setTimeout(() => {
        setCalculateResults({
          status: 'success',
          panelOpen: true,
          data: calculateResults.data,
        });
      }, 1000);
      return;
    }

    // open the panel and update context to run calculations
    setCalculateResults({ status: 'fetching', panelOpen: true, data: null });
    updateContextValues();
  }

  const [
    contaminationResults,
    setContaminationResults, //
  ] = React.useState<ContaminationResultsType>({ status: 'none', data: null });

  // Call the GP Server to run calculations against the contamination
  // map.
  function runContaminationCalculation() {
    // set the no layer status
    if (
      !sketchLayer?.sketchLayer ||
      sketchLayer.sketchLayer.type !== 'graphics'
    ) {
      setContaminationResults({ status: 'no-layer', data: null });
      return;
    }

    // set the no contamination map status
    if (!contaminationMap) {
      setContaminationResults({ status: 'no-map', data: null });
      return;
    }

    let contamMapSet: __esri.FeatureSet | null = null;
    let graphics: __esri.GraphicProperties[] = [];
    if (contaminationMap?.sketchLayer?.type === 'graphics') {
      graphics = contaminationMap.sketchLayer.graphics.toArray();
    }
    if (graphics.length === 0) {
      // display the no graphics on contamination map warning
      setContaminationResults({
        status: 'no-contamination-graphics',
        data: null,
      });
      return;
    }

    // create a feature set for communicating with the GPServer
    // this one is for the contamination map input
    contamMapSet = new FeatureSet({
      displayFieldName: '',
      geometryType: 'polygon',
      features: graphics,
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
          name: 'GLOBALID',
          type: 'guid',
          alias: 'GlobalID',
        },
        {
          name: 'PERMANENT_IDENTIFIER',
          type: 'guid',
          alias: 'Permanent Identifier',
        },
        {
          name: 'CONTAMTYPE',
          type: 'string',
          alias: 'Contamination Type',
        },
        {
          name: 'CONTAMVAL',
          type: 'double',
          alias: 'Contamination Value',
        },
        {
          name: 'CONTAMUNIT',
          type: 'string',
          alias: 'Contamination Unit',
        },
        {
          name: 'Notes',
          type: 'string',
          alias: 'Notes',
        },
      ],
    });

    const sketchedGraphics: __esri.Graphic[] = [];
    sketchedGraphics.push(...sketchLayer.sketchLayer.graphics.toArray());
    if (sketchedGraphics.length === 0) {
      // display the no-graphics warning
      setContaminationResults({
        status: 'no-graphics',
        data: null,
      });
      return;
    }

    // display the loading spinner
    setContaminationResults({
      status: 'fetching',
      data: null,
    });

    // create a feature set for communicating with the GPServer
    // this one is for the samples input
    const featureSet = new FeatureSet({
      displayFieldName: '',
      geometryType: 'polygon',
      features: sketchedGraphics,
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
          name: 'GLOBALID',
          type: 'guid',
          alias: 'GlobalID',
        },
        {
          name: 'PERMANENT_IDENTIFIER',
          type: 'guid',
          alias: 'Permanent Identifier',
        },
        {
          name: 'TYPE',
          type: 'string',
          alias: 'Sampling Method Type',
        },
        {
          name: 'TTPK',
          type: 'double',
          alias: 'Time to Prepare Kits',
        },
        {
          name: 'TTC',
          type: 'double',
          alias: 'Time to Collect',
        },
        {
          name: 'TTA',
          type: 'double',
          alias: 'Time to Analyze',
        },
        {
          name: 'TTPS',
          type: 'double',
          alias: 'Total Time per Sample',
        },
        {
          name: 'LOD_P',
          type: 'double',
          alias: 'Limit of Detection Porous',
        },
        {
          name: 'LOD_NON',
          type: 'double',
          alias: 'Limit of Detection Nonporous',
        },
        {
          name: 'MCPS',
          type: 'double',
          alias: 'Material Cost per Sample',
        },
        {
          name: 'TCPS',
          type: 'double',
          alias: 'Total Cost Per Sample',
        },
        {
          name: 'WVPS',
          type: 'double',
          alias: 'Waste Volume per Sample',
        },
        {
          name: 'WWPS',
          type: 'double',
          alias: 'Waste Weight per Sample',
        },
        {
          name: 'SA',
          type: 'double',
          alias: 'Sampling Surface Area',
        },
        {
          name: 'Notes',
          type: 'string',
          alias: 'Notes',
        },
        {
          name: 'ALC',
          type: 'double',
          alias: 'Analysis Labor Cost',
        },
        {
          name: 'AMC',
          type: 'double',
          alias: 'Analysis Material Cost',
        },
        {
          name: 'CONTAMTYPE',
          type: 'string',
          alias: 'Contamination Type',
        },
        {
          name: 'CONTAMVAL',
          type: 'double',
          alias: 'Contamination Value',
        },
        {
          name: 'CONTAMUNIT',
          type: 'string',
          alias: 'Contamination Unit',
        },
      ],
    });

    // call the GP Server
    const params = {
      f: 'json',
      Input_Sampling_Unit: featureSet,
      Contamination_Map: contamMapSet,
    };
    geoprocessorFetch({
      Geoprocessor,
      url: `${totsGPServer}/Contamination Results`,
      inputParameters: params,
      outputParameter: 'Output_TOTS_Results',
    })
      .then((res: any) => {
        console.log('GPServer contamination res: ', res);

        // perform calculations to update talley in nav bar
        updateContextValues();

        // catch an error in the response of the successful fetch
        if (res.error) {
          console.error(res.error);
          setContaminationResults({
            status: 'failure',
            data: null,
          });
          return;
        }

        // save the data to state, use an empty array if there is no data
        if (res?.value?.features) {
          const popupTemplate = new PopupTemplate(
            getPopupTemplate(sketchLayer.layerType, true),
          );
          const layer = sketchLayer.sketchLayer as __esri.GraphicsLayer;
          // update the contam value attribute of the graphics
          const resFeatures = res.value.features;
          layer.graphics.forEach((graphic) => {
            const resFeature = resFeatures.find(
              (feature: any) =>
                graphic.attributes.PERMANENT_IDENTIFIER ===
                feature.attributes.PERMANENT_IDENTIFIER,
            );

            // if the graphic was not found in the response, set contam value to null,
            // otherwise use the contam value value found in the response.
            let contamValue = null;
            let contamType = graphic.attributes.CONTAMTYPE;
            let contamUnit = graphic.attributes.CONTAMUNIT;
            if (resFeature) {
              contamValue = resFeature.attributes.CONTAMVAL;
              contamType = resFeature.attributes.CONTAMTYPE;
              contamUnit = resFeature.attributes.CONTAMUNIT;
            }
            graphic.attributes.CONTAMVAL = contamValue;
            graphic.attributes.CONTAMTYPE = contamType;
            graphic.attributes.CONTAMUNIT = contamUnit;
            graphic.popupTemplate = popupTemplate;
          });

          // make a copy of the edits context variable
          const editsCopy = updateLayerEdits({
            edits,
            layer: sketchLayer,
            type: 'update',
            changes: layer.graphics,
          });

          setEdits(editsCopy);

          setContaminationResults({
            status: 'success',
            data: res.value.features,
          });
        } else {
          setContaminationResults({
            status: 'success',
            data: [],
          });
        }
      })
      .catch((err) => {
        console.error(err);

        // perform calculations to update talley in nav bar
        updateContextValues();

        setContaminationResults({
          status: 'failure',
          data: null,
        });
      });
  }

  return (
    <div css={panelContainer}>
      <div>
        <h2>Calculate</h2>

        <div css={sectionContainer}>
          <p css={layerInfo}>
            <strong>Layer Name: </strong>
            {sketchLayer?.label}
          </p>
          <p css={layerInfo}>
            <strong>Scenario Name: </strong>
            {sketchLayer?.scenarioName}
          </p>
          <p css={layerInfo}>
            <strong>Scenario Description: </strong>
            <ShowLessMore
              text={sketchLayer?.scenarioDescription}
              charLimit={20}
            />
          </p>
        </div>

        <div css={sectionContainer}>
          <label htmlFor="number-teams-input">
            Number of Available Teams for Sampling
          </label>
          <input
            id="number-teams-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumSamplingTeams}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumSamplingTeams(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="personnel-per-team-input">
            Personnel per Sampling Team
          </label>
          <input
            id="personnel-per-team-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumSamplingPersonnel}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumSamplingPersonnel(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="sampling-hours-input">
            Sampling Team Hours per Shift
          </label>
          <input
            id="sampling-hours-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumSamplingHours}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumSamplingHours(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="shifts-per-input">Sampling Team Shifts per Day</label>
          <input
            id="shifts-per-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumSamplingShifts}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumSamplingShifts(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="labor-cost-input">Sampling Team Labor Cost ($)</label>
          <input
            id="labor-cost-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputSamplingLaborCost}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputSamplingLaborCost(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="number-of-labs-input">
            Number of Available Labs for Analysis
          </label>
          <input
            id="number-of-labs-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumLabs}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumLabs(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="lab-hours-input">Analysis Lab Hours per Day</label>
          <input
            id="lab-hours-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputNumLabHours}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputNumLabHours(Number(ev.target.value));
              }
            }}
          />

          <label htmlFor="surface-area-input">
            Surface Area (ft<sup>2</sup>) (optional)
          </label>
          <input
            id="surface-area-input"
            type="text"
            pattern="[0-9]*"
            css={inputStyles}
            value={inputSurfaceArea}
            onChange={(ev) => {
              if (ev.target.validity.valid) {
                setInputSurfaceArea(Number(ev.target.value));
              }
            }}
          />
        </div>

        {contaminationResults.status === 'fetching' && <LoadingSpinner />}
        {contaminationResults.status === 'failure' && (
          <MessageBox
            severity="error"
            title="Web Service Error"
            message="An error occurred in the web service"
          />
        )}
        {contaminationResults.status === 'no-map' && (
          <MessageBox
            severity="error"
            title="No Contamination Map Found"
            message="Return to Create Plan and add and/or select a contamination map"
          />
        )}
        {contaminationResults.status === 'no-layer' && (
          <MessageBox
            severity="error"
            title="No Samples"
            message="No sample layer has been selected. Please go to the Create Plan tab, select a layer and try again."
          />
        )}
        {contaminationResults.status === 'no-graphics' && (
          <MessageBox
            severity="error"
            title="No Samples"
            message="There are no samples to run calculations on"
          />
        )}
        {contaminationResults.status === 'no-contamination-graphics' && (
          <MessageBox
            severity="error"
            title="No Features In Contamination Map"
            message="There are no features in the contamination map to run calculations on"
          />
        )}
        {contaminationResults.status === 'success' && (
          <MessageBox
            severity="info"
            title="Contamination Hits"
            message={`${contaminationResults.data?.length} sample(s) placed in contaminated areas`}
          />
        )}

        <div css={submitButtonContainerStyles}>
          <button css={submitButtonStyles} onClick={runCalculation}>
            View Detailed Results
          </button>
          <button
            css={submitButtonStyles}
            onClick={runContaminationCalculation}
          >
            View Contamination Hits
          </button>
        </div>
      </div>
      <NavigationButton goToPanel="publish" />
    </div>
  );
}

export default Calculate;
