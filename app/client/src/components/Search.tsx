/** @jsxImportSource @emotion/react */

import React, { useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import EsriSearch from '@arcgis/core/widgets/Search';
// components
import NavigationButton from 'components/NavigationButton';
// contexts
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

// --- components (Search) ---
function Search() {
  const { mapView } = useContext(SketchContext);

  const [searchInitialized, setSearchInitialized] = useState(false);
  useEffect(() => {
    if (!mapView || searchInitialized) return;

    new EsriSearch({
      view: mapView,
      container: 'search-container',
      locationEnabled: false,
      label: 'Search',
      popupEnabled: false,
    });

    setSearchInitialized(true);
  }, [mapView, searchInitialized]);

  // Starts a poll which eventually sets the id of the esri search input.
  // This code is needed to work aroudn a 508 compliance issue. Adding the
  // id to the Search constructor (above) does not add an id to the DOM element.
  const [pollInitialized, setPollInitialized] = useState(false);
  useEffect(() => {
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
        <label htmlFor="esri-search-component" className="sr-only">
          Find address or place
        </label>
        <div id="search-container" css={searchBoxStyles} />
      </div>
      <NavigationButton goToPanel="addData" />
    </div>
  );
}

export default Search;
