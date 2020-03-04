/** @jsx jsx */

import React, { ReactNode } from 'react';
import { jsx, css } from '@emotion/core';
// components
import ShowLessMore from 'components/ShowLessMore';
// contexts
import { CalculateContext } from 'contexts/Calculate';
import { SketchContext } from 'contexts/Sketch';
// utils
import LoadingSpinner from './LoadingSpinner';

// --- styles (LabelValue) ---
const labelValueStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const valueStyles = css`
  padding-left: 10px;
`;

// --- components (LabelValue) ---
type LabelValueProps = {
  label: ReactNode | string;
  value: string | number | undefined | null;
};

function LabelValue({ label, value }: LabelValueProps) {
  let formattedValue = value;
  if (typeof value === 'number') formattedValue = value.toLocaleString();

  return (
    <div css={labelValueStyles}>
      <label>{label}: </label>
      <span css={valueStyles}>
        <ShowLessMore text={formattedValue} charLimit={20} />
      </span>
    </div>
  );
}

// --- styles (Calculate) ---
const panelContainer = css`
  padding: 20px;
`;

const downloadButtonContainerStyles = css`
  display: flex;
  justify-content: center;
  margin-top: 15px;
`;

// --- components (CalculateResults) ---
function CalculateResults() {
  const { calculateResults } = React.useContext(CalculateContext);
  const { sketchLayer } = React.useContext(SketchContext);

  return (
    <div css={panelContainer}>
      {calculateResults.status === 'fetching' && <LoadingSpinner />}
      {calculateResults.status === 'failure' && (
        <p>An error occurred while calculating. Please try again.</p>
      )}
      {calculateResults.status === 'no-layer' && (
        <p>
          No layer has been selected. Please go to the Create Plan tab, select a
          layer and try again.
        </p>
      )}
      {calculateResults.status === 'no-graphics' && (
        <p>
          There are no samples to run calculations on. Please add samples and
          try again.
        </p>
      )}
      {calculateResults.status === 'success' && calculateResults.data && (
        <React.Fragment>
          <div>
            <h3>Summary</h3>
            <LabelValue
              label="Scenario Name"
              value={sketchLayer?.scenarioName}
            />
            <LabelValue
              label="Scenario Description"
              value={sketchLayer?.scenarioDescription}
            />
            <br />

            <h4>Sampling Plan</h4>
            <LabelValue
              label="Total number of samples"
              value={calculateResults.data['Total Number of Samples']}
            />
            <hr />

            <h4>Sampling Operation</h4>
            <LabelValue
              label="Total Required Sampling Time (team hrs)"
              value="Placeholder..."
            />
            <LabelValue
              label="Time to Complete Sampling (days)"
              value={calculateResults.data['Time to Complete Sampling']}
            />
            <LabelValue
              label="Total Sampling Labor Cost ($)"
              value={calculateResults.data['Total Sampling Labor Cost']}
            />
            <LabelValue
              label="Total Sampling Material Cost ($)"
              value={calculateResults.data['Material Cost']}
            />
            <hr />

            <h4>Analysis Operation</h4>
            <LabelValue
              label="Total Required Analysis Time (lab hrs)"
              value={calculateResults.data['Time to Analyze']}
            />
            <LabelValue
              label="Time to Complete Analyses (days)"
              value={calculateResults.data['Time to Complete Analyses']}
            />
            <LabelValue
              label="Total Analysis Labor Cost ($)"
              value={calculateResults.data['Analysis Labor Cost']}
            />
            <LabelValue
              label="Total Analysis Material Cost ($)"
              value={calculateResults.data['Analysis Material Cost']}
            />
            <br />

            <h3>Details</h3>
            <h4>Spatial Information</h4>
            <LabelValue
              label={
                <React.Fragment>
                  Total Sampled Area (ft<sup>2</sup>)
                </React.Fragment>
              }
              value={calculateResults.data['Total Sampled Area']}
            />
            <LabelValue
              label={
                <React.Fragment>
                  User Specified Total Area of Interest (ft<sup>2</sup>)
                </React.Fragment>
              }
              value={calculateResults.data['User Specified Total AOI']}
            />
            <LabelValue
              label="Percent of Area Sampled"
              value={calculateResults.data['Percent of Area Sampled']}
            />
            <hr />

            <h4>Sampling</h4>
            <LabelValue
              label="Sampling Hours per Day"
              value={calculateResults.data['Sampling Hours per Day']}
            />
            <LabelValue
              label="Sampling Personnel hours per Day"
              value={calculateResults.data['Sampling Personnel hours per Day']}
            />
            <LabelValue
              label="User Specified Sampling Team Labor Cost ($)"
              value={
                calculateResults.data['User Specified Sampling Team Labor Cost']
              }
            />
            <LabelValue
              label="Time to Prepare Kits (person hours)"
              value={calculateResults.data['Time to Prepare Kits']}
            />
            <LabelValue
              label="Time to Collect (person hours)"
              value={calculateResults.data['Time to Collect']}
            />
            <LabelValue
              label="Material Cost"
              value={calculateResults.data['Material Cost']}
            />
            <LabelValue
              label="Sampling Personnel Labor Cost ($)"
              value={calculateResults.data['Sampling Personnel Labor Cost']}
            />
            <LabelValue
              label="Time to Complete Sampling (days)"
              value={calculateResults.data['Time to Complete Sampling']}
            />
            <LabelValue
              label="Total Sampling Labor Cost ($)"
              value={calculateResults.data['Total Sampling Labor Cost']}
            />
            <hr />

            <h4>Analysis</h4>
            <LabelValue
              label="Time to Complete Analyses (days)"
              value={calculateResults.data['Time to Complete Analyses']}
            />
            <LabelValue
              label="Time to Analyze (person hours)"
              value={calculateResults.data['Time to Analyze']}
            />
            <LabelValue
              label="Analysis Labor Cost ($)"
              value={calculateResults.data['Analysis Labor Cost']}
            />
            <LabelValue
              label="Analysis Material Cost ($)"
              value={calculateResults.data['Analysis Material Cost']}
            />
            <LabelValue
              label="Waste volume (L)"
              value={calculateResults.data['Waste Volume']}
            />
            <LabelValue
              label="Waste Weight (lbs)"
              value={calculateResults.data['Waste Weight']}
            />
          </div>
          <div css={downloadButtonContainerStyles}>
            <button onClick={() => alert('Feature coming soon.')}>
              Download
            </button>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

export default CalculateResults;
