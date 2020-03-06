/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
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
import { updateLayerEdits } from 'utils/sketchUtils';

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

    const url = `${totsGPServer}/Contamination Results/execute`;

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
          name: 'FID',
          type: 'oid',
          alias: 'FID',
        },
        {
          name: 'Id',
          type: 'integer',
          alias: 'Id',
        },
        {
          name: 'CFU',
          type: 'double',
          alias: 'CFU',
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
    });

    // call the GP Server
    const params = {
      f: 'json',
      Input_Sampling_Unit: featureSet,
      Contamination_Map: contamMapSet,
    };
    fetchPost(url, params)
      .then((res: any) => {
        console.log('GPServer contamination res: ', res);

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
        if (res?.results?.[0]?.value?.features) {
          const layer = sketchLayer.sketchLayer as __esri.GraphicsLayer;
          // update the cfu attribute of the graphics
          res.results[0].value.features.forEach((resFeature: any) => {
            const feature = layer.graphics.find(
              (graphic) =>
                String(graphic.attributes.OBJECTID) ===
                  String(resFeature.attributes.OBJECTID) &&
                String(graphic.attributes.GLOBALID) ===
                  String(resFeature.attributes.GLOBALID),
            );

            if (feature) {
              const cfu =
                resFeature.attributes.OBJECTID === 1
                  ? 1
                  : resFeature.attributes.CFU;
              feature.attributes.CFU = cfu;
            }
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
            data: res.results[0].value.features,
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
        setContaminationResults({
          status: 'failure',
          data: null,
        });
      });
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
        <button css={submitButtonStyles} onClick={runContaminationCalculation}>
          View Contamination Hits
        </button>
      </div>
    </div>
  );
}

export default Calculate;
