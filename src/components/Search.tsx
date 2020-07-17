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
  width: 100% !important;

  .esri-search__container {
    border: 1px solid rgb(211, 211, 211);
    border-radius: 4px;
  }

  .esri-search__input {
    height: 36px;
    border-radius: 4px;
    padding: 1px 2px 1px 8px;
    color: black;
    font-family: 'Source Sans Pro', 'Helvetica Neue', 'Helvetica', 'Roboto',
      'Arial', sans-serif;
    font-size: 16px;
  }

  .esri-search__clear-button {
    height: 36px;
    width: 36px;
  }

  .esri-search__submit-button {
    height: 36px;
    width: 36px;
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

  .esri-icon-search::before {
    content: '\f002';
    font-family: 'Font Awesome 5 Free', sans-serif;
    color: rgb(204, 204, 204);
    font-weight: 900;
  }
`;

const srOnlyStyles = css`
  position: absolute;
  left: -10000px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
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
      label: 'Search',
    });

    setSearchInitialized(true);
  }, [Search, mapView, searchInitialized]);

  // Starts a poll which eventually sets the id of the esri search input.
  // This code is needed to work aroudn a 508 compliance issue. Adding the
  // id to the Search constructor (above) does not add an id to the DOM element.
  const [pollInitialized, setPollInitialized] = React.useState(false);
  React.useEffect(() => {
    if (pollInitialized) return;

    setPollInitialized(true);

    // polls the dom, based on provided timeout, until the esri search input
    // is added. Once the input is added this sets the id attribute and stops
    // the polling.
    function poll(timeout: number) {
      const searchInput = document.getElementsByClassName('esri-search__input');
      if (searchInput.length === 0) {
        setTimeout(poll, timeout);
      } else {
        searchInput[0].setAttribute('id', 'esri-search-component');
      }
    }

    poll(250);
  }, [pollInitialized]);

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
        <label htmlFor="esri-search-component" css={srOnlyStyles}>
          Find address or place
        </label>
        <div id="search-container" css={searchBoxStyles} />
      </div>
      <NavigationButton goToPanel="addData" />
    </div>
  );
}

export default Search;
