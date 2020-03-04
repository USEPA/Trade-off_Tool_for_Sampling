/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { CalculateContext } from 'contexts/Calculate';
import { SketchContext } from 'contexts/Sketch';
// config
import { totsGPServer } from 'config/webService';
// utils
import { fetchPost } from 'utils/fetchUtils';
import { CalculateResultsType } from 'types/CalculateResults';

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
  const { FeatureSet } = useEsriModulesContext();
  const { sketchLayer } = React.useContext(SketchContext);
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
    setNumLabs(inputNumLabs);
    setNumLabHours(inputNumLabHours);
    setNumSamplingHours(inputNumSamplingHours);
    setNumSamplingPersonnel(inputNumSamplingPersonnel);
    setNumSamplingShifts(inputNumSamplingShifts);
    setNumSamplingTeams(inputNumSamplingTeams);
    setSamplingLaborCost(inputSamplingLaborCost);
    setSurfaceArea(inputSurfaceArea);
  }

  function runContaminationCalculation() {
    const url = `${totsGPServer}/Contamination Results/execute`;

    // create a feature set for communicating with the GPServer
    let contamMapSet: __esri.FeatureSet | null = null;
    if (contaminationMap) {
      let graphics: __esri.GraphicProperties[] = [];
      if (contaminationMap?.sketchLayer?.type === 'graphics') {
        graphics = contaminationMap.sketchLayer.graphics.toArray();
      }
      contamMapSet = new FeatureSet({
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
    }

    const sketchedGraphics: __esri.Graphic[] = [];
    if (sketchLayer?.sketchLayer?.type === 'graphics') {
      sketchedGraphics.push(...sketchLayer.sketchLayer.graphics.toArray());
    }

    if (sketchedGraphics.length === 0) {
      setCalculateResults({
        status: 'no-graphics',
        panelOpen: true,
        data: null,
      });
      return;
    }

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
          name: 'GLOBALID',
          type: 'guid',
          alias: 'GlobalID',
          length: 38,
        },
        {
          name: 'TYPE',
          type: 'string',
          alias: 'Type',
          length: 255,
        },
        {
          name: 'TTPK',
          type: 'double',
          alias: 'TTPK',
        },
        {
          name: 'TTC',
          type: 'double',
          alias: 'TTC',
        },
        {
          name: 'TTA',
          type: 'double',
          alias: 'TTA',
        },
        {
          name: 'TTPS',
          type: 'double',
          alias: 'TTPS',
        },
        {
          name: 'LOD_P',
          type: 'double',
          alias: 'LOD_P',
        },
        {
          name: 'LOD_NON',
          type: 'double',
          alias: 'LOD_NON',
        },
        {
          name: 'MCPS',
          type: 'double',
          alias: 'MCPS',
        },
        {
          name: 'TCPS',
          type: 'double',
          alias: 'TCPS',
        },
        {
          name: 'WVPS',
          type: 'double',
          alias: 'WVPS',
        },
        {
          name: 'WWPS',
          type: 'double',
          alias: 'WWPS',
        },
        {
          name: 'SA',
          type: 'double',
          alias: 'SA',
        },
        {
          name: 'AA',
          type: 'double',
          alias: 'AA',
        },
        {
          name: 'AC',
          type: 'integer',
          alias: 'AC',
        },
        {
          name: 'ITER',
          type: 'integer',
          alias: 'ITER',
        },
        {
          name: 'NOTES',
          type: 'string',
          alias: 'Notes',
          length: 2000,
        },
        {
          name: 'ALC',
          type: 'double',
          alias: 'ALC',
        },
        {
          name: 'AMC',
          type: 'double',
          alias: 'AMC',
        },
        {
          name: 'Shape_Length',
          type: 'double',
          alias: 'Shape_Length',
        },
        {
          name: 'Shape_Area',
          type: 'double',
          alias: 'Shape_Area',
        },
      ],
      features: sketchedGraphics,
    });

    const params = {
      f: 'json',
      Input_Sampling_Unit: featureSet,
      Contamination_Map: contamMapSet,
    };

    fetchPost(url, params)
      .then((res: any) => {
        console.log('GPServer contamination res: ', res);
      })
      .catch((err) => {
        console.error(err);
      });

    runCalculation();
  }

  return (
    <div css={panelContainer}>
      <h2>Calculate</h2>

      <div css={sectionContainer}>
        <p css={layerInfo}>
          <strong>Layer Name: </strong>
          {sketchLayer?.name}
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

      <div css={submitButtonContainerStyles}>
        <button css={submitButtonStyles} onClick={runCalculation}>
          View Detailed Results
        </button>
        <button css={submitButtonStyles} onClick={runContaminationCalculation}>
          View Contamination Hits
        </button>
      </div>
    </div>
  );
}

export default Calculate;
