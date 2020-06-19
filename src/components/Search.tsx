/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
// components
import NavigationButton from 'components/NavigationButton';
// contexts
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';

// --- styles (Search) ---
const panelContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  padding: 20px;
`;

const searchBoxStyles = css`
  margin-bottom: 10px;
  width: 100%;

  .esri-search__container {
    border: 1px solid rgb(211, 211, 211);
    border-radius: 4px;
  }

  .esri-search__input {
    height: 36px;
    border-radius: 4px;
  }

  .esri-search__clear-button {
    height: 36px;
  }

  .esri-search__submit-button {
    height: 36px;
    border-left: 1px solid rgb(211, 211, 211);
    border-radius: 4px;
    border-image: linear-gradient(
      to bottom,
      rgba(211, 211, 211, 0) 8px,
      rgba(211, 211, 211, 1) 8px,
      rgba(211, 211, 211, 1) 28px,
      rgba(211, 211, 211, 0) 28px
    );
    border-image-slice: 1;
  }
`;

// --- components (Search) ---
function Search() {
  const { Search } = useEsriModulesContext();
  const { mapView } = React.useContext(SketchContext);

  const [searchInitialized, setSearchInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!mapView || searchInitialized) return;

    new Search({
      view: mapView,
      container: 'search-container',
      locationEnabled: false,
    });

    setSearchInitialized(true);
  }, [Search, mapView, searchInitialized]);

  return (
    <div css={panelContainer}>
      <div>
        <h2>Locate</h2>
        <p>
          Start here to zoom to a location on the map to create a sampling
          design for an outdoor area. Otherwise, proceed to the{' '}
          <strong>Add Data</strong> step if you have existing sampling designs
          that you would like to add to the tool or have indoor environment
          representations to add to support designing a plan for an indoor
          environment.
        </p>
        <div id="search-container" css={searchBoxStyles} />
      </div>
      <NavigationButton goToPanel="addData" />
    </div>
  );
}

export default Search;
