/** @jsx jsx */

import { jsx, css } from '@emotion/core';
import React from 'react';
import Select from 'react-select';
// components
import FilePanel from 'components/FilePanel';
import SearchPanel from 'components/SearchPanel';
import URLPanel from 'components/URLPanel';

// --- styles (AddData) ---
const panelSelectStyles = css`
  margin-bottom: 10px;
`;

const panelContainer = css`
  padding: 20px;
`;

// --- components (AddData) ---
type LocationType = {
  value: string;
  label: string;
};

function AddData() {
  // filters
  const [
    location,
    setLocation, //
  ] = React.useState<LocationType>({
    value: 'search',
    label: 'Search for Layers',
  });

  return (
    <div css={panelContainer}>
      <h2>Add Data</h2>
      <Select
        css={panelSelectStyles}
        data-testid="tots-add-data-select"
        value={location}
        onChange={(ev) => setLocation(ev as LocationType)}
        options={[
          { value: 'search', label: 'Search for Layers' },
          { value: 'url', label: 'Add Layer from Web' },
          { value: 'file', label: 'Add Layer from File' },
        ]}
      />
      {location.value === 'search' && <SearchPanel />}
      {location.value === 'url' && <URLPanel />}
      {location.value === 'file' && <FilePanel />}
    </div>
  );
}

export default AddData;
