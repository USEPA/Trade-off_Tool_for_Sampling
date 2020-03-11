/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import Select from 'react-select';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { CalculateContext } from 'contexts/Calculate';
import { SketchContext } from 'contexts/Sketch';
// config
import { totsGPServer } from 'config/webService';
// types
import { LayerType } from 'types/Layer';
// utils
import { fetchPost } from 'utils/fetchUtils';

// --- styles (Calculate) ---
const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const submitButtonStyles = css`
  margin-top: 10px;
`;

const panelContainer = css`
  padding: 20px;
`;

// --- components (Calculate) ---
function Calculate() {
  const { FeatureSet } = useEsriModulesContext();
  const { layers } = React.useContext(SketchContext);
  const {
    calculateResults,
    setCalculateResults, //
  } = React.useContext(CalculateContext);

  const [surfaceArea, setSurfaceArea] = React.useState('7400');
  const [numSamplingTeams, setNumSamplingTeams] = React.useState('1');
  const [numSamplingPersonnel, setNumSamplingPersonnel] = React.useState('3');
  const [numSamplingHours, setNumSamplingHours] = React.useState('5');
  const [numSamplingShifts, setNumSamplingShifts] = React.useState('1');
  const [samplingLaborCost, setSamplingLaborCost] = React.useState('420');
  const [numLabs, setNumLabs] = React.useState('1');
  const [numLabHours, setNumLabHours] = React.useState('24');

  const [
    contaminationMap,
    setContaminationMap,
  ] = React.useState<LayerType | null>(null);
  function runCalculation() {
    const sampleLayers = layers.filter(
      (layer) => layer.layerType === 'Samples' || layer.layerType === 'VSP',
    );
    if (sampleLayers.length === 0) return;

    setCalculateResults({
      status: 'fetching',
      data: null,
    });

    const url = `${totsGPServer}/Main/execute`;

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
          wkid: 102100,
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
    sampleLayers.forEach((layer) => {
      if (layer?.sketchLayer?.type === 'graphics') {
        sketchedGraphics.push(...layer.sketchLayer.graphics.toArray());
      }
    });

    if (sketchedGraphics.length === 0) {
      setCalculateResults({ status: 'no-graphics', data: null });
      return;
    }

    const featureSet = new FeatureSet({
      displayFieldName: '',
      geometryType: 'polygon',
      spatialReference: {
        wkid: 102100,
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
      Scenario_Name: 'Test Scenario',
      Input_Sampling_Unit: featureSet,
      Contamination_Map: contamMapSet,
      Surface_Area__ft2_: surfaceArea,
      Number_of_Available_Teams_for_Sampling: numSamplingTeams,
      Personnel_per_Sampling_Team: numSamplingPersonnel,
      Sampling_Team_Hours_per_Shift: numSamplingHours,
      Sampling_Team_Shifts_per_Day: numSamplingShifts,
      Sampling_Team_Labor_Cost: samplingLaborCost,
      Number_of_Available_Labs_for_Analysis: numLabs,
      Analysis_Lab_Hours_per_Day: numLabHours,
    };

    fetchPost(url, params)
      .then((res: any) => {
        console.log('GPServer calculate res: ', res);
        if (
          !res.results ||
          res.results.length === 0 ||
          !res.results[0].value ||
          !res.results[0].value.features
        ) {
          setCalculateResults({
            status: 'failure',
            data: null,
          });
          return;
        }

        const resultObject: any = {};
        res.results[0].value.features.forEach((item: any) => {
          const attributes = item.attributes;

          // Get the value for this item. The value
          // could be a string, long or doule.
          let value = null;
          if (attributes.value_str) {
            value = attributes.value_str;
          } else if (attributes.value_long) {
            value = attributes.value_long;
          } else if (attributes.value_double) {
            value = attributes.value_double;
          }

          // insert this key value pair into the result object
          resultObject[attributes.key] = value;
        });

        console.log('resultObject: ', resultObject);

        setCalculateResults({
          status: 'success',
          data: resultObject,
        });
      })
      .catch((err) => {
        console.error(err);
        setCalculateResults({
          status: 'failure',
          data: null,
        });
      });
  }

  return (
    <div css={panelContainer}>
      <h2>Calculate</h2>
      <label htmlFor="contamination-map-select">Contamination map</label>
      <div>
        <Select
          inputId="contamination-map-select"
          value={contaminationMap}
          onChange={(ev) => setContaminationMap(ev as LayerType)}
          options={layers.filter(
            (layer) => layer.layerType === 'Contamination Map',
          )}
        />
      </div>

      <label htmlFor="number-teams-input">
        Number of Available Teams for Sampling
      </label>
      <input
        id="number-teams-input"
        css={inputStyles}
        value={numSamplingTeams}
        onChange={(ev) => setNumSamplingTeams(ev.target.value)}
      />

      <label htmlFor="personnel-per-team-input">
        Personnel per Sampling Team
      </label>
      <input
        id="personnel-per-team-input"
        css={inputStyles}
        value={numSamplingPersonnel}
        onChange={(ev) => setNumSamplingPersonnel(ev.target.value)}
      />

      <label htmlFor="sampling-hours-input">
        Sampling Team Hours per Shift
      </label>
      <input
        id="sampling-hours-input"
        css={inputStyles}
        value={numSamplingHours}
        onChange={(ev) => setNumSamplingHours(ev.target.value)}
      />

      <label htmlFor="shifts-per-input">Sampling Team Shifts per Day</label>
      <input
        id="shifts-per-input"
        css={inputStyles}
        value={numSamplingShifts}
        onChange={(ev) => setNumSamplingShifts(ev.target.value)}
      />

      <label htmlFor="labor-cost-input">Sampling Team Labor Cost ($)</label>
      <input
        id="labor-cost-input"
        css={inputStyles}
        value={samplingLaborCost}
        onChange={(ev) => setSamplingLaborCost(ev.target.value)}
      />

      <label htmlFor="number-of-labs-input">
        Number of Available Labs for Analysis
      </label>
      <input
        id="number-of-labs-input"
        css={inputStyles}
        value={numLabs}
        onChange={(ev) => setNumLabs(ev.target.value)}
      />

      <label htmlFor="lab-hours-input">Analysis Lab Hours per Day</label>
      <input
        id="lab-hours-input"
        css={inputStyles}
        value={numLabHours}
        onChange={(ev) => setNumLabHours(ev.target.value)}
      />

      <label htmlFor="surface-area-input">
        Surface Area (ft<sup>2</sup>) (optional)
      </label>
      <input
        id="surface-area-input"
        css={inputStyles}
        value={surfaceArea}
        onChange={(ev) => setSurfaceArea(ev.target.value)}
      />

      <button css={submitButtonStyles} onClick={runCalculation}>
        {calculateResults.status === 'fetching' ? (
          <React.Fragment>
            <i className="fas fa-spinner fa-pulse" />
            &nbsp;&nbsp;Calculating...
          </React.Fragment>
        ) : (
          <React.Fragment>Calculate</React.Fragment>
        )}
      </button>
    </div>
  );
}

export default Calculate;
