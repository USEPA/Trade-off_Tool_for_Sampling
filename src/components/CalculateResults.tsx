/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// contexts
import { CalculateContext } from 'contexts/Calculate';
// utils
import LoadingSpinner from './LoadingSpinner';

// --- styles (LabelValue) ---
const labelValueStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

// --- components (LabelValue) ---
type LabelValueProps = {
  label: string;
  value: string;
};

function LabelValue({ label, value }: LabelValueProps) {
  return (
    <div css={labelValueStyles}>
      <label>{label}: </label>
      {Number(value).toLocaleString()}
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

  return (
    <div css={panelContainer}>
      {calculateResults.status === 'fetching' && <LoadingSpinner />}
      {calculateResults.status === 'failure' && (
        <p>An error occurred while calculating. Please try again.</p>
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
            <hr />
            <LabelValue
              label="Total number of samples"
              value={calculateResults.data['Total Number of Samples']}
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
              label="Time to Analyze (person hours)"
              value={calculateResults.data['Time to Analyze']}
            />
            <LabelValue
              label="Total Time (pesron hours)(kits + collection + analysis + shipping + reporting)"
              value={calculateResults.data['Total Time']}
            />
            <LabelValue
              label="Material Cost"
              value={calculateResults.data['Material Cost']}
            />
            <LabelValue
              label="Waste volume (L)"
              value={calculateResults.data['Waste Volume']}
            />
            <LabelValue
              label="Waste Weight (lbs)"
              value={calculateResults.data['Waste Weight']}
            />

            <br />
            <br />
            <h3>Sampling</h3>
            <hr />
            <LabelValue
              label="User Specified Number of Available Teams for Sampling"
              value={
                calculateResults.data[
                  'User Specified Number of Available Teams for Sampling'
                ]
              }
            />
            <LabelValue
              label="User Specified Personnel per Sampling Team"
              value={
                calculateResults.data[
                  'User Specified Personnel per Sampling Team'
                ]
              }
            />
            <LabelValue
              label="User Specified Sampling Team Hours per Shift"
              value={
                calculateResults.data[
                  'User Specified Sampling Team Hours per Shift'
                ]
              }
            />
            <LabelValue
              label="User Specified Sampling Team Shifts per Day"
              value={
                calculateResults.data[
                  'User Specified Sampling Team Shifts per Day'
                ]
              }
            />
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

            <br />
            <br />
            <h3>Analysis</h3>
            <hr />
            <LabelValue
              label="User Specified Number of Available Labs for Analysis"
              value={
                calculateResults.data[
                  'User Specified Number of Available Labs for Analysis'
                ]
              }
            />
            <LabelValue
              label="User Specified Analysis Lab Hours per Day"
              value={
                calculateResults.data[
                  'User Specified Analysis Lab Hours per Day'
                ]
              }
            />
            <LabelValue
              label="Time to Complete Analyses (days)"
              value={calculateResults.data['Time to Complete Analyses']}
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
