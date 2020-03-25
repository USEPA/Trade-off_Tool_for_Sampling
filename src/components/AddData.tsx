/** @jsx jsx */

import { jsx, css } from '@emotion/core';
import React from 'react';
// components
import FilePanel from 'components/FilePanel';
import SearchPanel from 'components/SearchPanel';
import URLPanel from 'components/URLPanel';
import Select from 'components/Select';
// contexts
import { NavigationContext } from 'contexts/Navigation';

type LocationType =
  | { value: 'search'; label: 'Search for Layers' }
  | { value: 'url'; label: 'Add Layer from Web' }
  | { value: 'file'; label: 'Add Layer from File' };

const addFromOptions: LocationType[] = [
  { value: 'search', label: 'Search for Layers' },
  { value: 'url', label: 'Add Layer from Web' },
  { value: 'file', label: 'Add Layer from File' },
];

// --- styles (AddData) ---
const panelSelectStyles = css`
  margin-bottom: 10px;
`;

const panelContainer = css`
  padding: 20px;
`;

// --- components (AddData) ---
function AddData() {
  const { goToOptions } = React.useContext(NavigationContext);

  // filters
  const [
    location,
    setLocation, //
  ] = React.useState<LocationType>(addFromOptions[0]);

  // Handle navigation options
  React.useEffect(() => {
    if (!goToOptions?.from) return;

    let optionValue: LocationType | null = null;
    addFromOptions.forEach((option) => {
      if (option.value === goToOptions.from) optionValue = option;
    });
    if (optionValue) setLocation(optionValue);
  }, [goToOptions]);

  return (
    <div css={panelContainer}>
      <h2>Add Data</h2>
      <Select
        css={panelSelectStyles}
        data-testid="tots-add-data-select"
        value={location}
        onChange={(ev) => setLocation(ev as LocationType)}
        options={addFromOptions}
      />
      {location.value === 'search' && <SearchPanel />}
      {location.value === 'url' && <URLPanel />}
      {location.value === 'file' && <FilePanel />}
    </div>
  );
}

export default AddData;
