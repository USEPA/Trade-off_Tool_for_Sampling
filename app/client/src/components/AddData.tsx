/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import React, { useContext, useEffect, useState } from 'react';
// components
import FilePanel from 'components/FilePanel';
import SearchPanel from 'components/SearchPanel';
import URLPanel from 'components/URLPanel';
import Select from 'components/Select';
import NavigationButton from 'components/NavigationButton';
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
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  padding: 20px;
`;

// --- components (AddData) ---
function AddData() {
  const { goToOptions } = useContext(NavigationContext);

  // filters
  const [
    location,
    setLocation, //
  ] = useState<LocationType>(addFromOptions[0]);

  // Handle navigation options
  useEffect(() => {
    if (!goToOptions?.from) return;

    let optionValue: LocationType | null = null;
    addFromOptions.forEach((option) => {
      if (option.value === goToOptions.from) optionValue = option;
    });
    if (optionValue) setLocation(optionValue);
  }, [goToOptions]);

  return (
    <div css={panelContainer}>
      <div>
        <h2>Add Data</h2>
        <label htmlFor="add-data-select" className="sr-only">
          From
        </label>
        <Select
          inputId="add-data-select"
          css={panelSelectStyles}
          value={location}
          onChange={(ev) => setLocation(ev as LocationType)}
          options={addFromOptions}
        />
        {location.value === 'search' && <SearchPanel />}
        {location.value === 'url' && <URLPanel />}
        {location.value === 'file' && <FilePanel />}
      </div>
      <NavigationButton goToPanel="locateSamples" />
    </div>
  );
}

export default AddData;
