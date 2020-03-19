/** @jsx jsx */

import React from 'react';
import { jsx, css } from '@emotion/core';
import Select from 'react-select';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import MessageBox from 'components/MessageBox';
import Switch from 'components/Switch';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { useEsriModulesContext } from 'contexts/EsriModules';
import { SketchContext } from 'contexts/Sketch';
// utils
import { escapeForLucene } from 'utils/utils';

// --- styles (SearchPanel) ---
const searchContainerStyles = css`
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const searchInputStyles = css`
  margin: 0;
  padding-left: 8px;
  border: none;
  border-radius: 4px;
  height: 36px;

  /* width = 100% - width of search button  */
  width: calc(100% - 37px);
`;

const searchSeparatorStyles = css`
  align-self: stretch;
  background-color: #ccc;
  margin-bottom: 8px;
  margin-top: 8px;
  padding-right: 1px;
  box-sizing: border-box;
`;

const searchButtonStyles = css`
  margin: 0;
  height: 36px;
  width: 36px;
  padding: 10px;
  background-color: white;
  color: #ccc;
  border: none;
  border-radius: 4px;
`;

const filterContainerStyles = css`
  /* This is disabled and only ever enabled for testing.
   * In development, it is sometimes helpful to re-enable
   * this to test out specific layer types.
   * Use flex for testing otherwise use none */
  display: none;

  > div {
    margin-right: 15px;
    z-index: 99;
  }
`;

const typeSelectStyles = css`
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);

  ul {
    padding: 0.5em;
    list-style-type: none;
  }
`;

const sortContainerStyles = css`
  display: flex;
`;

const sortSelectStyles = css`
  width: calc(100% - 10px);
  padding-right: 10px;
`;

const sortOrderStyles = css`
  color: black;
  width: 10px;
  background-color: white;
  padding: 0;
  margin: 0 5px;

  &:disabled {
    cursor: default;
  }
`;

const footerBar = css`
  display: flex;
  align-items: center;
`;

const pageControlStyles = css`
  color: black;
  background-color: white;
  padding: 0;
  margin: 0 5px;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

const totalStyles = css`
  margin-left: 10px;
`;

// --- components (SearchPanel) ---
type LocationNameType = 'ArcGIS Online' | 'My Content' | 'My Organization';
type LocationType = {
  value: LocationNameType;
  label: LocationNameType;
};

type SortByType = {
  value: '' | 'title' | 'owner' | 'avgrating' | 'numviews' | 'modified';
  label: 'Relevance' | 'Title' | 'Owner' | 'Rating' | 'Views' | 'Date';
  defaultSort: 'asc' | 'desc';
};

type SearchResultsType = {
  status: '' | 'fetching' | 'success' | 'failure' | 'not-logged-in';
  data: __esri.PortalQueryResult | null;
};

function SearchPanel() {
  const { portal } = React.useContext(AuthenticationContext);
  const { mapView } = React.useContext(SketchContext);
  const { Portal, watchUtils } = useEsriModulesContext();

  // filters
  const [
    location,
    setLocation, //
  ] = React.useState<LocationType>({
    value: 'ArcGIS Online',
    label: 'ArcGIS Online',
  });
  const [search, setSearch] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const [withinMap, setWithinMap] = React.useState(false);
  const [mapService, setMapService] = React.useState(false);
  const [featureService, setFeatureService] = React.useState(false);
  const [imageService, setImageService] = React.useState(false);
  const [vectorTileService, setVectorTileService] = React.useState(false);
  const [kml, setKml] = React.useState(false);
  const [wms, setWms] = React.useState(false);

  const [
    searchResults,
    setSearchResults, //
  ] = React.useState<SearchResultsType>({ status: '', data: null });
  const [
    currentExtent,
    setCurrentExtent,
  ] = React.useState<__esri.Extent | null>(null);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<SortByType>({
    value: '',
    label: 'Relevance',
    defaultSort: 'desc',
  });
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Builds and executes the search query on search button click
  React.useEffect(() => {
    setSearchResults({ status: 'fetching', data: null });

    const tmpPortal = portal ? portal : new Portal();

    function appendToQuery(
      query: string,
      part: string,
      separator: string = 'AND',
    ) {
      // nothing to append
      if (part.length === 0) return query;

      // append the query part
      if (query.length > 0) return `${query} ${separator} (${part})`;
      else return `(${part})`;
    }

    let query = '';
    // search box
    if (search) {
      query = appendToQuery(query, search);
    }

    // where to search ArcGISOnline is the default
    if (location.value === 'My Content') {
      if (!tmpPortal?.user?.username) {
        setSearchResults({ status: 'not-logged-in', data: null });
        return;
      }
      query = appendToQuery(
        query,
        `owner:${escapeForLucene(tmpPortal.user.username)}`,
      );
    }
    if (location.value === 'My Organization') {
      if (!tmpPortal?.user?.username) {
        setSearchResults({ status: 'not-logged-in', data: null });
        return;
      }
      query = appendToQuery(
        query,
        `owner:${escapeForLucene(tmpPortal.user.orgId)}`,
      );
    }

    // type selection
    let typePart = '';
    const defaultTypePart =
      'type:"Map Service" OR type:"Feature Service" OR type:"Image Service" ' +
      'OR type:"Vector Tile Service" OR type:"KML" OR type:"WMS"';
    if (mapService) {
      typePart = appendToQuery(typePart, 'type:"Map Service"', 'OR');
    }
    if (featureService) {
      typePart = appendToQuery(typePart, 'type:"Feature Service"', 'OR');
    }
    if (imageService) {
      typePart = appendToQuery(typePart, 'type:"Image Service"', 'OR');
    }
    if (vectorTileService) {
      typePart = appendToQuery(typePart, 'type:"Vector Tile Service"', 'OR');
    }
    if (kml) {
      typePart = appendToQuery(typePart, 'type:"KML"', 'OR');
    }
    if (wms) {
      typePart = appendToQuery(typePart, 'type:"WMS"', 'OR');
    }

    // add the type selection to the query, use all types if all types are set to false
    if (typePart.length > 0) query = appendToQuery(query, typePart);
    else query = appendToQuery(query, defaultTypePart);

    // build the query parameters
    let queryParams = {
      query,
      sortOrder,
    } as __esri.PortalQueryParams;

    if (withinMap && currentExtent) queryParams.extent = currentExtent;

    // if a sort by (other than relevance) is selected, add it to the query params
    if (sortBy.value) {
      queryParams.sortField = sortBy.value as any;
    } else {
      if (!withinMap) {
        queryParams.sortField = 'num-views';
      }
    }

    // perform the query
    tmpPortal
      .queryItems(queryParams)
      .then((res: __esri.PortalQueryResult) => {
        if (res.total > 0) {
          setSearchResults({ status: 'success', data: res });
          setPageNumber(1);
        } else {
          setSearchResults({ status: 'success', data: null });
          setPageNumber(1);
        }
      })
      .catch((err) => {
        console.error(err);
        setSearchResults({ status: 'failure', data: null });
      });
  }, [
    currentExtent,
    Portal,
    portal,
    location,
    search,
    setSearchResults,
    withinMap,
    mapService,
    featureService,
    imageService,
    vectorTileService,
    kml,
    wms,
    sortBy,
    sortOrder,
  ]);

  // Runs the query for changing pages of the result set
  const [lastPageNumber, setLastPageNumber] = React.useState(1);
  React.useEffect(() => {
    if (!searchResults.data || pageNumber === lastPageNumber) return;

    // prevent running the same query multiple times
    setLastPageNumber(pageNumber);

    // get the query
    let queryParams = searchResults.data.queryParams;
    if (pageNumber === 1) {
      // going to first page
      queryParams.start = 1;
    }
    if (pageNumber > lastPageNumber) {
      // going to next page
      queryParams = searchResults.data.nextQueryParams;
    }
    if (pageNumber < lastPageNumber) {
      // going to previous page
      queryParams.start = queryParams.start - queryParams.num;
    }

    // perform the query
    const tmpPortal = portal ? portal : new Portal();
    tmpPortal
      .queryItems(queryParams)
      .then((res) => {
        setSearchResults({ status: 'success', data: res });
      })
      .catch((err) => {
        console.error(err);
        setSearchResults({ status: 'failure', data: null });
      });
  }, [Portal, pageNumber, lastPageNumber, portal, searchResults]);

  // Defines a watch event for filtering results based on the map extent
  const [watchViewInitialized, setWatchViewInitialized] = React.useState(false);
  React.useEffect(() => {
    if (!mapView || watchViewInitialized) return;

    const watchEvent = watchUtils.whenTrue(mapView, 'stationary', () => {
      setCurrentExtent(mapView.extent);
    });

    setWatchViewInitialized(true);

    // remove watch event to prevent it from running after component unmounts
    return function cleanup() {
      watchEvent.remove();
    };
  }, [mapView, watchUtils, watchViewInitialized]);

  const [showFilterOptions, setShowFilterOptions] = React.useState(false);

  return (
    <React.Fragment>
      <label htmlFor="locations-select">Data Location</label>
      <Select
        inputId="locations-select"
        value={location}
        onChange={(ev) => setLocation(ev as LocationType)}
        options={[
          { value: 'ArcGIS Online', label: 'ArcGIS Online' },
          { value: 'My Content', label: 'My Content' },
          { value: 'My Organization', label: 'My Organization' },
        ]}
      />
      <label htmlFor="search-input">Search</label>
      <div css={searchContainerStyles}>
        <input
          id="search-input"
          css={searchInputStyles}
          value={searchText}
          placeholder={'Search...'}
          onChange={(ev) => setSearchText(ev.target.value)}
        />
        <span css={searchSeparatorStyles} />
        <button
          css={searchButtonStyles}
          onClick={(ev) => setSearch(searchText)}
        >
          <i className="fas fa-search"></i>
        </button>
      </div>
      <div css={filterContainerStyles}>
        <div>
          <Switch
            checked={withinMap}
            onChange={(ev) => setWithinMap(!withinMap)}
          />{' '}
          <label htmlFor="within_map_filter">Within map...</label>
        </div>
        <div>
          <span onClick={() => setShowFilterOptions(!showFilterOptions)}>
            Type <i className="fas fa-caret-down"></i>
          </span>
          {showFilterOptions && (
            <div css={typeSelectStyles}>
              <ul>
                <li>
                  <input
                    id="map_service_filter"
                    type="checkbox"
                    checked={mapService}
                    onChange={(ev) => setMapService(!mapService)}
                  />
                  <label htmlFor="map_service_filter">Map Service</label>
                </li>

                <li>
                  <input
                    id="feature_service_filter"
                    type="checkbox"
                    checked={featureService}
                    onChange={(ev) => setFeatureService(!featureService)}
                  />
                  <label htmlFor="feature_service_filter">
                    Feature Service
                  </label>
                </li>

                <li>
                  <input
                    id="image_service_filter"
                    type="checkbox"
                    checked={imageService}
                    onChange={(ev) => setImageService(!imageService)}
                  />
                  <label htmlFor="image_service_filter">Image Service</label>
                </li>

                <li>
                  <input
                    id="vector_tile_service_filter"
                    type="checkbox"
                    checked={vectorTileService}
                    onChange={(ev) => setVectorTileService(!vectorTileService)}
                  />
                  <label htmlFor="vector_tile_service_filter">
                    Vector Tile Service
                  </label>
                </li>

                <li>
                  <input
                    id="kml_filter"
                    type="checkbox"
                    checked={kml}
                    onChange={(ev) => setKml(!kml)}
                  />
                  <label htmlFor="kml_filter">KML</label>
                </li>

                <li>
                  <input
                    id="wms_filter"
                    type="checkbox"
                    checked={wms}
                    onChange={(ev) => setWms(!wms)}
                  />
                  <label htmlFor="wms_filter">WMS</label>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <label htmlFor="sort-by-select">Sort By</label>
      <div css={sortContainerStyles}>
        <Select
          inputId="sort-by-select"
          css={sortSelectStyles}
          value={sortBy}
          onChange={(ev) => {
            const evTyped = ev as SortByType;
            setSortBy(evTyped);
            setSortOrder(evTyped.defaultSort);
          }}
          options={[
            { value: '', label: 'Relevance', defaultSort: 'desc' },
            { value: 'title', label: 'Title', defaultSort: 'asc' },
            { value: 'owner', label: 'Owner', defaultSort: 'asc' },
            { value: 'avgrating', label: 'Rating', defaultSort: 'desc' },
            { value: 'numviews', label: 'Views', defaultSort: 'desc' },
            { value: 'modified', label: 'Date', defaultSort: 'desc' },
          ]}
        />
        <button
          css={sortOrderStyles}
          disabled={sortBy.value ? false : true}
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
        >
          {sortBy.value && (
            <i
              className={`fas fa-long-arrow-alt-${
                sortOrder === 'desc' ? 'up' : 'down'
              }`}
            ></i>
          )}
        </button>
      </div>
      <hr />
      <div>
        {searchResults.status === 'fetching' && <LoadingSpinner />}
        {searchResults.status === 'not-logged-in' && (
          <MessageBox
            severity="warning"
            title="Not Logged In"
            message="Please login to use this feature"
          />
        )}
        {searchResults.status === 'failure' && (
          <MessageBox
            severity="error"
            title="Web Service Error"
            message="An error occurred in the web service"
          />
        )}
        {searchResults.status === 'success' && (
          <React.Fragment>
            <div>
              {searchResults.data?.results.map((result, index) => {
                return (
                  <React.Fragment key={index}>
                    <ResultCard result={result} />
                    <hr />
                  </React.Fragment>
                );
              })}
            </div>
            {!searchResults.data && (
              <div>No items for this search criteria.</div>
            )}
            {searchResults.data && (
              <div css={footerBar}>
                <div>
                  <button
                    css={pageControlStyles}
                    disabled={pageNumber === 1}
                    onClick={() => setPageNumber(1)}
                  >
                    <i className="fas fa-angle-double-left"></i>
                  </button>
                  <button
                    css={pageControlStyles}
                    disabled={pageNumber === 1}
                    onClick={() => setPageNumber(pageNumber - 1)}
                  >
                    <i className="fas fa-angle-left"></i>
                  </button>
                  <span>{pageNumber}</span>
                  <button
                    css={pageControlStyles}
                    disabled={searchResults.data.nextQueryParams.start === -1}
                    onClick={() => setPageNumber(pageNumber + 1)}
                  >
                    <i className="fas fa-angle-right"></i>
                  </button>
                  <span css={totalStyles}>
                    {searchResults.data.total.toLocaleString()} Items
                  </span>
                </div>
              </div>
            )}
          </React.Fragment>
        )}
      </div>
    </React.Fragment>
  );
}

// --- styles (ResultCard) ---
const cardThumbnailStyles = css`
  float: left;
  margin-right: 10px;
  height: 60px;
  width: 90px;
`;

const cardTitleStyles = css`
  margin: 0 5px;
  padding: 0;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const cardInfoStyles = css`
  font-size: 10px;
  color: #898989;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-top: 3px;
`;

const cardButtonContainerStyles = css`
  text-align: right;
`;

const cardMessageStyles = css`
  font-size: 10px;
  font-style: italic;
  margin-left: 4px;
  margin-right: 4px;
`;

const cardButtonStyles = css`
  display: inline-block;
  font-size: 11px;
  padding: 5px;
  margin: 0 5px 0 0;

  &:disabled {
    cursor: default;
  }
`;

// --- components (ResultCard) ---
type ResultCardProps = {
  result: any;
};

function ResultCard({ result }: ResultCardProps) {
  const {
    map,
    portalLayers,
    setPortalLayers, //
  } = React.useContext(SketchContext);
  const { Layer, PortalItem, watchUtils } = useEsriModulesContext();

  // Used to determine if the layer for this card has been added or not
  const [added, setAdded] = React.useState(false);
  React.useEffect(() => {
    const added =
      portalLayers.findIndex((portalId) => portalId === result.id) !== -1;
    setAdded(added);
  }, [portalLayers, result]);

  // removes the esri watch handle when the card is removed from the DOM.
  const [status, setStatus] = React.useState('');
  const [watcher, setWatcher] = React.useState<__esri.WatchHandle | null>(null);
  React.useEffect(() => {
    return function cleanup() {
      if (watcher) watcher.remove();
    };
  }, [watcher]);

  return (
    <div>
      <img
        css={cardThumbnailStyles}
        src={result.thumbnailUrl}
        alt={result.title}
      />
      <h4 css={cardTitleStyles}>{result.title}</h4>
      <span css={cardInfoStyles}>
        {result.type} by {result.owner}
      </span>
      <br />
      <div css={cardButtonContainerStyles}>
        <span css={cardMessageStyles}>
          {status === 'loading' && 'Adding...'}
          {status === 'error' && 'Add Failed'}
        </span>
        {map && (
          <React.Fragment>
            {!added && (
              <button
                css={cardButtonStyles}
                disabled={status === 'loading'}
                onClick={() => {
                  setStatus('loading');

                  // get the layer from the portal item
                  Layer.fromPortalItem({
                    portalItem: new PortalItem({
                      id: result.id,
                    }),
                  })
                    .then((layer) => {
                      // setup the watch event to see when the layer finishes loading
                      const watcher = watchUtils.watch(
                        layer,
                        'loadStatus',
                        (loadStatus: string) => {
                          // set the status based on the load status
                          if (loadStatus === 'loaded') {
                            setPortalLayers((portalLayers: string[]) => [
                              ...portalLayers,
                              result.id,
                            ]);
                            setStatus('');
                          } else if (loadStatus === 'failed') {
                            setStatus('error');
                          }
                        },
                      );

                      setWatcher(watcher);

                      // add the layer to the map
                      map.add(layer);
                    })
                    .catch((err) => {
                      console.error(err);
                      setStatus('error');
                    });
                }}
              >
                Add
              </button>
            )}
            {added && !status && (
              <button
                css={cardButtonStyles}
                onClick={() => {
                  // get the layers to be removed
                  const layersToRemove = map.allLayers.filter((layer: any) => {
                    // had to use any, since some layer types don't have portalItem
                    if (
                      layer &&
                      layer.portalItem &&
                      layer.portalItem.id === result.id
                    ) {
                      return true;
                    } else {
                      return false;
                    }
                  });

                  // remove the layers from the map and session storage.
                  if (layersToRemove.length > 0) {
                    map.removeMany(layersToRemove.toArray());
                    setPortalLayers((portalLayers: string[]) =>
                      portalLayers.filter((portalId) => portalId !== result.id),
                    );
                  }
                }}
              >
                Remove
              </button>
            )}
          </React.Fragment>
        )}
        <a
          css={cardButtonStyles}
          href={`https://arcgis.com/home/item.html?id=${result.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Details
        </a>
      </div>
    </div>
  );
}

export default SearchPanel;
