/** @jsxImportSource @emotion/react */

import React from 'react';
import { css } from '@emotion/react';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import Select from 'components/Select';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { DialogContext } from 'contexts/Dialog';
import { useEsriModulesContext } from 'contexts/EsriModules';
import { useSampleTypesContext } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { PublishContext } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// utils
import {
  getAllFeatures,
  getFeatureLayer,
  getFeatureLayers,
  getFeatureTables,
} from 'utils/arcGisRestUtils';
import { useDynamicPopup, useGeometryTools } from 'utils/hooks';
import {
  convertToPoint,
  deepCopyObject,
  generateUUID,
  getNextScenarioLayer,
  getSimplePopupTemplate,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { createErrorObject, escapeForLucene } from 'utils/utils';
// types
import { LayerType } from 'types/Layer';
import { EditsType, ScenarioEditsType } from 'types/Edits';
import { ErrorType } from 'types/Misc';
import {
  Attributes,
  DefaultSymbolsType,
  SampleSelectType,
} from 'config/sampleAttributes';
// config
import {
  notLoggedInMessage,
  sampleIssuesPopupMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';

type LayerGraphics = {
  [key: string]: __esri.Graphic[];
};

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

const buttonHiddenTextStyles = css`
  font: 0/0 a, sans-serif;
  text-indent: -999em;
`;

const filterContainerStyles = css`
  /* This is disabled and only ever enabled for testing.
   * In development, it is sometimes helpful enable
   * this to test out specific layer types.
   * Add "?devMode=true" to the end of the url to enable. */
  display: ${window.location.search.includes('devMode=true')
    ? 'block'
    : 'none'};

  > div {
    margin-right: 15px;
  }
`;

const typeSelectStyles = css`
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  border-radius: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  z-index: 2;

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

const exitDisclaimerStyles = css`
  margin: 1.5em 0;
  padding: 0.75em 0.5em;
  text-align: center;

  a {
    margin: 0 0 0 0.3333333333em;
  }
`;

// --- components (SearchPanel) ---
type LocationType =
  | { value: 'ArcGIS Online'; label: 'ArcGIS Online' }
  | { value: 'My Content'; label: 'My Content' }
  | { value: 'My Organization'; label: 'My Organization' }
  | { value: 'My Groups'; label: 'My Groups' };

type LayerTypeFilter =
  | { value: 'All'; label: 'All' }
  | { value: 'Sampling Plans'; label: 'TOTS Sampling Plans' }
  | { value: 'Custom Sample Types'; label: 'TOTS Custom Sample Types' };

type GroupType = {
  value: string;
  label: string;
};

type SortByType = {
  value: 'none' | 'title' | 'owner' | 'avgrating' | 'numviews' | 'modified';
  label: 'Relevance' | 'Title' | 'Owner' | 'Rating' | 'Views' | 'Date';
  defaultSort: 'asc' | 'desc';
};

type SearchResultsType = {
  status: 'none' | 'fetching' | 'success' | 'failure' | 'not-logged-in';
  error?: ErrorType;
  data: __esri.PortalQueryResult | null;
};

function SearchPanel() {
  const { portal, userInfo } = React.useContext(AuthenticationContext);
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
  const [
    layerTypeFilter,
    setLayerTypeFilter, //
  ] = React.useState<LayerTypeFilter>({
    value: 'All',
    label: 'All',
  });
  const [group, setGroup] = React.useState<GroupType | null>(null);
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
  ] = React.useState<SearchResultsType>({ status: 'none', data: null });
  const [
    currentExtent,
    setCurrentExtent,
  ] = React.useState<__esri.Extent | null>(null);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<SortByType>({
    value: 'none',
    label: 'Relevance',
    defaultSort: 'desc',
  });
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Initializes the group selection
  React.useEffect(() => {
    if (group || !userInfo?.groups || userInfo.groups.length === 0) return;

    const firstGroup = userInfo.groups.sort((a: any, b: any) =>
      a.title.localeCompare(b.title),
    )[0];

    setGroup({
      value: firstGroup.id,
      label: firstGroup.title,
    });
  }, [group, userInfo]);

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
    if (location.value === 'My Groups') {
      if (!group) {
        setSearchResults({ status: 'success', data: null });
        return;
      }

      query = appendToQuery(query, `group:${escapeForLucene(group.value)}`);
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

    const categories: string[] = [];
    if (layerTypeFilter.value === 'Custom Sample Types') {
      categories.push('contains-epa-tots-user-defined-sample-types');
    }
    if (layerTypeFilter.value === 'Sampling Plans') {
      categories.push('contains-epa-tots-sample-layer');
    }

    // build the query parameters
    let queryParams = {
      query,
      sortOrder,
      categories,
    } as __esri.PortalQueryParams;

    if (withinMap && currentExtent) queryParams.extent = currentExtent;

    // if a sort by (other than relevance) is selected, add it to the query params
    if (sortBy.value !== 'none') {
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
        setSearchResults({
          status: 'failure',
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          data: null,
        });

        window.logErrorToGa(err);
      });
  }, [
    currentExtent,
    group,
    Portal,
    portal,
    layerTypeFilter,
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
    userInfo,
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
        setSearchResults({
          status: 'failure',
          error: {
            error: createErrorObject(err),
            message: err.message,
          },
          data: null,
        });

        window.logErrorToGa(err);
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
          { value: 'My Groups', label: 'My Groups' },
        ]}
      />
      {location.value === 'My Groups' && (
        <React.Fragment>
          <label htmlFor="group-select">Group</label>
          <Select
            inputId="group-select"
            value={group}
            onChange={(ev) => setGroup(ev as GroupType)}
            options={
              userInfo?.groups?.length > 0
                ? userInfo.groups
                    .sort((a: any, b: any) => a.title.localeCompare(b.title))
                    .map((group: any) => {
                      return {
                        value: group.id,
                        label: group.title,
                      };
                    })
                : []
            }
          />
        </React.Fragment>
      )}
      <label htmlFor="layer-type-select">Type</label>
      <Select
        inputId="layer-type-select"
        value={layerTypeFilter}
        onChange={(ev) => setLayerTypeFilter(ev as LayerTypeFilter)}
        options={[
          { value: 'All', label: 'All' },
          { value: 'Sampling Plans', label: 'TOTS Sampling Plans' },
          { value: 'Custom Sample Types', label: 'TOTS Custom Sample Types' },
        ]}
      />
      <label htmlFor="search-input">Search</label>
      <form
        css={searchContainerStyles}
        onSubmit={(ev) => {
          ev.preventDefault();
        }}
      >
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
          type="submit"
          onClick={(ev) => setSearch(searchText)}
        >
          <i className="fas fa-search"></i>
          <span css={buttonHiddenTextStyles}>Search</span>
        </button>
      </form>
      <div css={filterContainerStyles}>
        <div>
          <input
            id="within_map_filter"
            type="checkbox"
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
          options={
            [
              { value: 'none', label: 'Relevance', defaultSort: 'desc' },
              { value: 'title', label: 'Title', defaultSort: 'asc' },
              { value: 'owner', label: 'Owner', defaultSort: 'asc' },
              { value: 'avgrating', label: 'Rating', defaultSort: 'desc' },
              { value: 'numviews', label: 'Views', defaultSort: 'desc' },
              { value: 'modified', label: 'Date', defaultSort: 'desc' },
            ] as SortByType[]
          }
        />
        {sortBy.value !== 'none' && (
          <button
            css={sortOrderStyles}
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            <i
              className={`fas fa-long-arrow-alt-${
                sortOrder === 'desc' ? 'up' : 'down'
              }`}
            ></i>
            <span css={buttonHiddenTextStyles}>
              {sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
            </span>
          </button>
        )}
      </div>
      {searchResults?.data?.results && searchResults.data.results.length > 0 && (
        <span className="disclaimer" css={exitDisclaimerStyles}>
          The following links exit the site{' '}
          <a
            className="exit-disclaimer"
            href="https://www.epa.gov/home/exit-epa"
            target="_blank"
            rel="noopener noreferrer"
          >
            Exit
          </a>
        </span>
      )}
      <hr />
      <div>
        {searchResults.status === 'fetching' && <LoadingSpinner />}
        {searchResults.status === 'not-logged-in' && notLoggedInMessage}
        {searchResults.status === 'failure' &&
          webServiceErrorMessage(searchResults.error)}
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
                    <span css={buttonHiddenTextStyles}>Go to first page</span>
                  </button>
                  <button
                    css={pageControlStyles}
                    disabled={pageNumber === 1}
                    onClick={() => setPageNumber(pageNumber - 1)}
                  >
                    <i className="fas fa-angle-left"></i>
                    <span css={buttonHiddenTextStyles}>Previous</span>
                  </button>
                  <span>{pageNumber}</span>
                  <button
                    css={pageControlStyles}
                    disabled={searchResults.data.nextQueryParams.start === -1}
                    onClick={() => setPageNumber(pageNumber + 1)}
                  >
                    <i className="fas fa-angle-right"></i>
                    <span css={buttonHiddenTextStyles}>Next</span>
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
  line-height: 1.3;
`;

const cardInfoStyles = css`
  font-size: 11px;
  color: #545454;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  padding-top: 3px;
`;

const cardButtonContainerStyles = css`
  text-align: right;
`;

const cardMessageStyles = css`
  font-size: 11px;
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
  const { portal } = React.useContext(AuthenticationContext);
  const { setOptions } = React.useContext(DialogContext);
  const { trainingMode } = React.useContext(NavigationContext);
  const { setSampleTypeSelections } = React.useContext(PublishContext);
  const sampleTypeContext = useSampleTypesContext();
  const {
    Collection,
    FeatureLayer,
    Field,
    Graphic,
    GraphicsLayer,
    GroupLayer,
    Layer,
    PortalItem,
    rendererJsonUtils,
    watchUtils,
  } = useEsriModulesContext();
  const {
    defaultSymbols,
    setDefaultSymbols,
    edits,
    setEdits,
    layers,
    setLayers,
    map,
    mapView,
    portalLayers,
    setPortalLayers,
    setReferenceLayers,
    sampleAttributes,
    setSelectedScenario,
    setSketchLayer,
    userDefinedOptions,
    setUserDefinedOptions,
    userDefinedAttributes,
    setUserDefinedAttributes,
  } = React.useContext(SketchContext);
  const getPopupTemplate = useDynamicPopup();
  const { sampleValidation } = useGeometryTools();

  // Used to determine if the layer for this card has been added or not
  const [added, setAdded] = React.useState(false);
  React.useEffect(() => {
    let added =
      portalLayers.findIndex((portalLayer) => portalLayer.id === result.id) !==
      -1;

    // check if result was added as a user defined sample type
    Object.values(userDefinedAttributes.sampleTypes).forEach((sample) => {
      if (sample.serviceId === result.id) added = true;
    });

    setAdded(added);
  }, [portalLayers, result, userDefinedAttributes]);

  // removes the esri watch handle when the card is removed from the DOM.
  const [status, setStatus] = React.useState('');
  const [watcher, setWatcher] = React.useState<__esri.WatchHandle | null>(null);
  React.useEffect(() => {
    return function cleanup() {
      if (watcher) watcher.remove();
    };
  }, [watcher]);

  /**
   * Adds layers, published through TOTS, such that the sample layer is
   * editable in TOTS. Any non-sample layers will just be added
   * as reference layers, though this could change in the future.
   */
  function addTotsLayer() {
    if (!map || !portal) return;
    if (sampleTypeContext.status === 'failure') {
      setStatus('error');
      return;
    }

    setStatus('loading');

    const tempPortal = portal as any;
    const token = tempPortal.credential.token;
    let addedSampleTypesViaTable = false;

    function getAddedSampleTypesViaTable() {
      return addedSampleTypesViaTable;
    }

    // get the list of feature layers in this feature server
    getFeatureLayers(result.url, token)
      .then((res: any) => {
        // fire off requests to get the details and features for each layer
        const layerPromises: Promise<any>[] = [];

        // ensure -points layer calls are done last
        const resPolys: any[] = [];
        const resPoints: any[] = [];
        res.layers.forEach((layer: any) => {
          if (layer.geometryType === 'esriGeometryPoint') {
            resPoints.push(layer);
          } else {
            resPolys.push(layer);
          }
        });

        const resSampleTypes: any[] = [];
        res.tables.forEach((table: any) => {
          if (table.name.endsWith('-sample-types')) {
            resSampleTypes.push(table);
          }
        });

        // fire off the calls with the points layers last
        const resCombined = [...resSampleTypes, ...resPolys, ...resPoints];
        resCombined.forEach((layer: any) => {
          const id = layer.id;

          // get the layer details promise
          const layerCall = getFeatureLayer(result.url, token, id);
          layerPromises.push(layerCall);

          // get the layer features promise
          const featuresCall = getAllFeatures(portal, result.url + '/' + id);
          layerPromises.push(featuresCall);
        });

        // wait for all of the promises to resolve
        // promises are ordered as: [{layer1 details}, {layer1 features}, ..., {layerX details}, {layerx features}]
        Promise.all(layerPromises)
          .then((responses) => {
            // define items used for updating states
            let editsCopy: EditsType = deepCopyObject(edits);
            const mapLayersToAdd: __esri.Layer[] = [];
            const newAttributes: Attributes = {};
            const newUserSampleTypes: SampleSelectType[] = [];
            const layersToAdd: LayerType[] = [];
            const refLayersToAdd: any[] = [];
            const zoomToGraphics: __esri.Graphic[] = [];
            let table: any = {};

            // function used for finalizing the adding of layers. This function is needed
            // for displaying a popup mesage if there is an issue with any of the samples
            function finalizeLayerAdd() {
              if (!map) return;

              // replace sample attributes the correct ones
              mapLayersToAdd.forEach((parentLayer) => {
                if (parentLayer.type !== 'group') return;

                const tempParentLayer = parentLayer as __esri.GroupLayer;
                tempParentLayer.layers.forEach((layer) => {
                  const tempLayer = layer as __esri.GraphicsLayer;

                  tempLayer.graphics.forEach((graphic) => {
                    if (
                      !sampleAttributes.hasOwnProperty(
                        graphic.attributes.TYPEUUID,
                      )
                    )
                      return;

                    const predefinedAttributes: any =
                      sampleAttributes[graphic.attributes.TYPEUUID];
                    Object.keys(predefinedAttributes).forEach((key) => {
                      if (
                        !sampleTypeContext.data.attributesToCheck.includes(key)
                      ) {
                        return;
                      }

                      graphic.attributes[key] = predefinedAttributes[key];
                    });
                  });
                });
              });

              // add custom sample types to browser storage
              if (newUserSampleTypes.length > 0) {
                setUserDefinedAttributes((item) => {
                  Object.keys(newAttributes).forEach((key) => {
                    const attributes = newAttributes[key];
                    sampleAttributes[attributes.attributes.TYPEUUID as any] =
                      attributes.attributes;
                    item.sampleTypes[
                      attributes.attributes.TYPEUUID as any
                    ] = attributes;
                  });

                  return {
                    editCount: item.editCount + 1,
                    sampleTypes: item.sampleTypes,
                  };
                });

                setUserDefinedOptions((options) => {
                  return [...options, ...newUserSampleTypes];
                });
              }

              // add all of the layers to the map
              map.addMany(mapLayersToAdd);

              // zoom to the graphics layer
              if (zoomToGraphics.length > 0 && mapView) {
                mapView.goTo(zoomToGraphics);
              }

              // set the state for session storage
              setEdits(editsCopy);
              setLayers((layers) => [...layers, ...layersToAdd]);
              setReferenceLayers((layers: any) => [
                ...layers,
                ...refLayersToAdd,
              ]);

              // set the sketchLayer to the first tots sample layer
              if (layersToAdd.length > -1) setSketchLayer(layersToAdd[0]);

              // add the portal id to portal layers. This needed so the card on
              // the search panel shows up as the layer having been added.
              setPortalLayers((portalLayers) => [
                ...portalLayers,
                { id: result.id, type: 'tots' },
              ]);

              // reset the status
              setStatus('');
            }

            // Updates the pointIds on the layers and edits objects
            function updatePointIds(layerFeatures: any, layerDetails: any) {
              // get the layer uuid from the first feature
              layerFeatures.features.forEach((feature: any) => {
                const uuid = feature.attributes?.DECISIONUNITUUID;
                if (!uuid) return;

                // find the layer in layersToAdd and update the id
                const layer = layersToAdd.find((l) => l.layerId === uuid);
                if (layer) layer.pointsId = layerDetails.id;

                // find the layer in editsCopy and update the id
                const editsLayer = editsCopy.edits.find(
                  (l) => l.portalId === layerDetails.serviceItemId,
                );
                if (editsLayer) {
                  editsLayer.pointsId = layerDetails.id;

                  const editsLayerTemp = editsLayer as ScenarioEditsType;
                  if (editsLayerTemp?.layers) {
                    const sublayer = editsLayerTemp.layers.find(
                      (s) => s.uuid === uuid,
                    );
                    if (sublayer) sublayer.pointsId = layerDetails.id;
                  }
                }
              });
            }

            function addUserDefinedType(graphic: any) {
              // get the type uuid or generate it if necessary
              const attributes = graphic.attributes;
              let typeUuid = attributes.TYPEUUID;
              if (!typeUuid) {
                const keysToCheck = [
                  'TYPE',
                  'ShapeType',
                  'TTPK',
                  'TTC',
                  'TTA',
                  'TTPS',
                  'LOD_P',
                  'LOD_NON',
                  'MCPS',
                  'TCPS',
                  'WVPS',
                  'WWPS',
                  'SA',
                  'ALC',
                  'AMC',
                ];
                // check if the udt has already been added
                Object.values(userDefinedAttributes.sampleTypes).forEach(
                  (udt: any) => {
                    const tempUdt: any = {};
                    const tempAtt: any = {};
                    keysToCheck.forEach((key) => {
                      tempUdt[key] = udt[key];
                      tempAtt[key] = attributes[key];
                    });

                    if (JSON.stringify(tempUdt) === JSON.stringify(tempAtt)) {
                      typeUuid = udt.TYPEUUID;
                    }
                  },
                );

                if (!typeUuid) {
                  if (
                    sampleTypeContext.data.sampleAttributes.hasOwnProperty(
                      attributes.TYPE,
                    )
                  ) {
                    typeUuid = attributes.TYPE;
                  } else {
                    typeUuid = generateUUID();
                  }
                }

                graphic.attributes['TYPEUUID'] = typeUuid;
              }

              if (
                !sampleAttributes.hasOwnProperty(attributes.TYPEUUID) &&
                !newAttributes.hasOwnProperty(attributes.TYPEUUID)
              ) {
                newUserSampleTypes.push({
                  value: attributes.TYPEUUID,
                  label: attributes.TYPE,
                  isPredefined: false,
                });
                newAttributes[attributes.TYPEUUID] = {
                  status: newAttributes[attributes.TYPEUUID]?.status
                    ? newAttributes[attributes.TYPEUUID].status
                    : 'add',
                  serviceId: '',
                  attributes: {
                    OBJECTID: '-1',
                    PERMANENT_IDENTIFIER: null,
                    GLOBALID: null,
                    TYPEUUID: attributes.TYPEUUID,
                    TYPE: attributes.TYPE,
                    ShapeType: attributes.ShapeType,
                    POINT_STYLE: attributes.POINT_STYLE || 'circle',
                    TTPK: attributes.TTPK ? Number(attributes.TTPK) : null,
                    TTC: attributes.TTC ? Number(attributes.TTC) : null,
                    TTA: attributes.TTA ? Number(attributes.TTA) : null,
                    TTPS: attributes.TTPS ? Number(attributes.TTPS) : null,
                    LOD_P: attributes.LOD_P ? Number(attributes.LOD_P) : null,
                    LOD_NON: attributes.LOD_NON
                      ? Number(attributes.LOD_NON)
                      : null,
                    MCPS: attributes.MCPS ? Number(attributes.MCPS) : null,
                    TCPS: attributes.TCPS ? Number(attributes.TCPS) : null,
                    WVPS: attributes.WVPS ? Number(attributes.WVPS) : null,
                    WWPS: attributes.WWPS ? Number(attributes.WWPS) : null,
                    SA: attributes.SA ? Number(attributes.SA) : null,
                    AA: null,
                    ALC: attributes.ALC ? Number(attributes.ALC) : null,
                    AMC: attributes.AMC ? Number(attributes.AMC) : null,
                    Notes: '',
                    CONTAMTYPE: null,
                    CONTAMVAL: null,
                    CONTAMUNIT: null,
                    CREATEDDATE: null,
                    UPDATEDDATE: null,
                    USERNAME: null,
                    ORGANIZATION: null,
                    DECISIONUNITUUID: null,
                    DECISIONUNIT: null,
                    DECISIONUNITSORT: 0,
                  },
                };
              }
            }

            let isSampleLayer = false;
            let isVspLayer = false;
            let isPointsSampleLayer = false;
            let isVspPointsSampleLayer = false;
            const typesLoop = (type: __esri.FeatureType) => {
              if (type.id === 'epa-tots-vsp-layer') isVspLayer = true;
              if (type.id === 'epa-tots-sample-layer') isSampleLayer = true;
              if (type.id === 'epa-tots-sample-points-layer')
                isPointsSampleLayer = true;
              if (type.id === 'epa-tots-vsp-points-layer')
                isVspPointsSampleLayer = true;
            };

            let fields: __esri.Field[] = [];
            const fieldsLoop = (field: __esri.Field) => {
              fields.push(Field.fromJSON(field));
            };

            // get the popup template
            const popupTemplate = getPopupTemplate('Samples', trainingMode);

            // create the layers to be added to the map
            for (let i = 0; i < responses.length; ) {
              const layerDetails = responses[i];
              const layerFeatures = responses[i + 1];
              const scenarioName = layerDetails.name;

              // figure out if this layer is a sample layer or not
              isSampleLayer = false;
              isVspLayer = false;
              if (layerDetails?.types) {
                layerDetails.types.forEach(typesLoop);
              }

              // add sample layers as graphics layers
              if (layerDetails.type === 'Table') {
                table.id = layerDetails.id;
                table.sampleTypes = {};

                layerFeatures.features.forEach((feature: any) => {
                  addUserDefinedType(feature);
                  table.sampleTypes[feature.attributes.TYPEUUID] =
                    feature.attributes;
                });

                addedSampleTypesViaTable = true;
              } else if (isPointsSampleLayer || isVspPointsSampleLayer) {
                if (layerFeatures.features?.length > 0) {
                  updatePointIds(layerFeatures, layerDetails);
                }
              } else if (isSampleLayer || isVspLayer) {
                let newSymbolsAdded = false;
                let newDefaultSymbols: DefaultSymbolsType = {
                  editCount: defaultSymbols.editCount + 1,
                  symbols: { ...defaultSymbols.symbols },
                };

                // add symbol styles if necessary
                const uniqueValueInfos =
                  layerDetails?.drawingInfo?.renderer?.uniqueValueInfos;
                if (uniqueValueInfos) {
                  uniqueValueInfos.forEach((value: any) => {
                    // exit if value exists already
                    if (defaultSymbols.symbols.hasOwnProperty(value.value)) {
                      return;
                    }

                    newSymbolsAdded = true;

                    newDefaultSymbols.symbols[value.value] = {
                      type: 'simple-fill',
                      color: [
                        value.symbol.color[0],
                        value.symbol.color[1],
                        value.symbol.color[2],
                        value.symbol.color[3] / 255,
                      ],
                      outline: {
                        color: [
                          value.symbol.outline.color[0],
                          value.symbol.outline.color[1],
                          value.symbol.outline.color[2],
                          value.symbol.outline.color[3] / 255,
                        ],
                        width: value.symbol.outline.width,
                      },
                    };
                  });

                  if (newSymbolsAdded) setDefaultSymbols(newDefaultSymbols);
                }

                // get the graphics from the layer
                const graphics: LayerGraphics = {};
                layerFeatures.features.forEach((feature: any) => {
                  const graphic: any = Graphic.fromJSON(feature);
                  graphic.geometry.spatialReference = {
                    wkid: 3857,
                  };
                  graphic.popupTemplate = popupTemplate;

                  const newGraphic: any = {
                    // attributes: { ...graphic.attributes },
                    geometry: graphic.geometry,
                    symbol: graphic.symbol,
                    popupTemplate: graphic.popupTemplate,
                  };

                  // Add the user defined type if it does not exist
                  if (!getAddedSampleTypesViaTable()) {
                    newGraphic.attributes = { ...graphic.attributes };
                    addUserDefinedType(graphic);
                  } else {
                    const typeUuid = graphic.attributes.TYPEUUID;
                    let customAttributes = {};
                    if (newAttributes.hasOwnProperty(typeUuid)) {
                      customAttributes = newAttributes[typeUuid].attributes;
                    } else if (sampleAttributes.hasOwnProperty(typeUuid)) {
                      customAttributes = sampleAttributes[typeUuid];
                    }

                    newGraphic.attributes = {
                      ...customAttributes,
                      ...graphic.attributes,
                    };
                  }

                  newGraphic.symbol = newDefaultSymbols.symbols['Samples'];
                  if (
                    newDefaultSymbols.symbols.hasOwnProperty(
                      feature.attributes.TYPEUUID,
                    )
                  ) {
                    graphic.symbol =
                      newDefaultSymbols.symbols[feature.attributes.TYPEUUID];
                  }

                  zoomToGraphics.push(graphic);

                  // add the graphic to the correct layer uuid
                  const decisionUuid = newGraphic.attributes.DECISIONUNITUUID;
                  if (graphics.hasOwnProperty(decisionUuid)) {
                    graphics[decisionUuid].push(newGraphic);
                  } else {
                    graphics[decisionUuid] = [newGraphic];
                  }
                });

                // need to build the scenario and group layer here
                const groupLayer = new GroupLayer({
                  title: scenarioName,
                });

                const newScenario: ScenarioEditsType = {
                  type: 'scenario',
                  id: layerDetails.id,
                  pointsId: -1,
                  layerId: groupLayer.id,
                  portalId: result.id,
                  name: scenarioName,
                  label: scenarioName,
                  value: groupLayer.id,
                  layerType: isVspLayer ? 'VSP' : 'Samples',
                  addedFrom: 'tots',
                  hasContaminationRan: false,
                  status: 'published',
                  editType: 'add',
                  visible: true,
                  listMode: 'show',
                  scenarioName: scenarioName,
                  scenarioDescription: layerDetails.description,
                  layers: [],
                  table,
                };

                // make a copy of the edits context variable
                editsCopy = {
                  count: editsCopy.count + 1,
                  edits: [...editsCopy.edits, newScenario],
                };

                // loop through the graphics uuids and add the necessary
                // layers to the scenario along with the graphics
                const keys = Object.keys(graphics);
                for (let j = 0; j < keys.length; j++) {
                  const uuid = keys[j];
                  const graphicsList = graphics[uuid];
                  const firstAttributes = graphicsList[0].attributes;
                  const layerName = firstAttributes.DECISIONUNIT
                    ? firstAttributes.DECISIONUNIT
                    : scenarioName;

                  // build the graphics layer
                  const graphicsLayer = new GraphicsLayer({
                    id: firstAttributes.DECISIONUNITUUID,
                    graphics: graphicsList,
                    title: layerName,
                  });

                  // convert the polygon graphics into points
                  let pointGraphics: __esri.Graphic[] = [];
                  graphicsList.forEach((graphic) => {
                    pointGraphics.push(convertToPoint(Graphic, graphic));
                  });

                  const pointsLayer = new GraphicsLayer({
                    id: firstAttributes.DECISIONUNITUUID + '-points',
                    graphics: pointGraphics,
                    title: layerName,
                    visible: false,
                    listMode: 'hide',
                  });
                  groupLayer.addMany([graphicsLayer, pointsLayer]);

                  // build the layer
                  const layerToAdd: LayerType = {
                    id: layerDetails.id,
                    pointsId: -1,
                    uuid: firstAttributes.DECISIONUNITUUID,
                    layerId: graphicsLayer.id,
                    portalId: result.id,
                    value: layerName,
                    name: layerName,
                    label: layerName,
                    layerType: isVspLayer ? 'VSP' : 'Samples',
                    editType: 'add',
                    visible: true,
                    listMode: 'show',
                    sort: firstAttributes.DECISIONUNITSORT,
                    geometryType: layerDetails.geometryType,
                    addedFrom: 'tots',
                    status: 'published',
                    sketchLayer: graphicsLayer,
                    pointsLayer,
                    parentLayer: groupLayer,
                  };
                  layersToAdd.push(layerToAdd);

                  // make a copy of the edits context variable
                  editsCopy = updateLayerEdits({
                    edits: editsCopy,
                    scenario: newScenario,
                    layer: layerToAdd,
                    type: 'arcgis',
                    changes: graphicsLayer.graphics,
                  });
                }

                mapLayersToAdd.push(groupLayer); // replace with group layer
              } else {
                // add non-sample layers as feature layers
                fields = [];
                layerFeatures.fields.forEach(fieldsLoop);

                const source: __esri.Graphic[] = [];
                layerFeatures.features.forEach((feature: any) => {
                  const graphic = Graphic.fromJSON(feature);
                  graphic.geometry.spatialReference =
                    layerFeatures.spatialReference;
                  source.push(graphic);
                });

                // use jsonUtils to convert the REST API renderer to an ArcGIS JS renderer
                const renderer: __esri.Renderer = rendererJsonUtils.fromJSON(
                  layerDetails.drawingInfo.renderer,
                );

                // create the popup template if popup information was provided
                let popupTemplate;
                if (layerDetails.popupInfo) {
                  popupTemplate = {
                    title: layerDetails.popupInfo.title,
                    content: layerDetails.popupInfo.description,
                  };
                }
                // if no popup template, then make the template all of the attributes
                if (!layerDetails.popupInfo && source.length > -1) {
                  popupTemplate = getSimplePopupTemplate(source[0].attributes);
                }

                // add the feature layer
                const layerProps: __esri.FeatureLayerProperties = {
                  fields,
                  source,
                  objectIdField: layerFeatures.objectIdFieldName,
                  outFields: ['*'],
                  title: layerDetails.name,
                  renderer,
                  popupTemplate,
                };
                const featureLayer = new FeatureLayer(layerProps);
                mapLayersToAdd.push(featureLayer);

                // add the layer to referenceLayers with the layer id
                refLayersToAdd.push({
                  ...layerProps,
                  layerId: featureLayer.id,
                  portalId: result.id,
                });
              }

              i += 2;
            }

            // get the age of the layer in seconds
            const created: number = new Date(result.created).getTime();
            const curTime: number = Date.now();
            const duration = (curTime - created) / 1000;

            // validate the area and attributes of features of the uploads. If there is an
            // issue, display a popup asking the user if they would like the samples to be updated.
            if (zoomToGraphics.length > 0) {
              const output = sampleValidation(zoomToGraphics, true);

              if (output?.areaOutOfTolerance || output?.attributeMismatch) {
                setOptions({
                  title: 'Sample Issues',
                  ariaLabel: 'Sample Issues',
                  description: sampleIssuesPopupMessage(
                    output,
                    sampleTypeContext.data.areaTolerance,
                  ),
                  onContinue: () => finalizeLayerAdd(),
                  onCancel: () => setStatus('canceled'),
                });
              } else {
                finalizeLayerAdd();
              }
            } else if (zoomToGraphics.length === 0 && duration < 300) {
              // display a message if the layer is empty and the layer is less
              // than 5 minutes old
              setOptions({
                title: 'No Data',
                ariaLabel: 'No Data',
                description: `The "${result.title}" layer was recently added and currently does not have any data. This could be due to a delay in processing the new data. Please try again later.`,
                onCancel: () => setStatus('no-data'),
              });
            } else {
              finalizeLayerAdd();
            }
          })
          .catch((err) => {
            console.error(err);
            setStatus('error');

            window.logErrorToGa(err);
          });
      })
      .catch((err) => {
        console.error(err);
        setStatus('error');

        window.logErrorToGa(err);
      });
  }

  /**
   * Adds user defined sample types that were published through TOTS.
   */
  function addTotsSampleType() {
    if (!portal) return;
    if (sampleTypeContext.status === 'failure') {
      setStatus('error');
      return;
    }

    setStatus('loading');

    const tempPortal = portal as any;
    const token = tempPortal.credential.token;

    // get the list of feature layers in this feature server
    getFeatureTables(result.url, token)
      .then((res: any) => {
        // fire off requests to get the details and features for each layer
        const layerPromises: Promise<any>[] = [];
        res.forEach((layer: any) => {
          // get the layer features promise
          const featuresCall = getAllFeatures(
            portal,
            result.url + '/' + layer.id,
          );
          layerPromises.push(featuresCall);
        });

        // wait for all of the promises to resolve
        Promise.all(layerPromises)
          .then((responses) => {
            // define items used for updating states
            const newAttributes: Attributes = {};
            const newUserSampleTypes: SampleSelectType[] = [];

            // create the user defined sample types to be added to TOTS
            responses.forEach((layerFeatures) => {
              // get the graphics from the layer
              layerFeatures.features.forEach((feature: any) => {
                const graphic: any = Graphic.fromJSON(feature);

                // get the type uuid or generate it if necessary
                const attributes = graphic.attributes;
                let typeUuid = attributes.TYPEUUID;
                if (!typeUuid) {
                  const keysToCheck = [
                    'TYPE',
                    'ShapeType',
                    'TTPK',
                    'TTC',
                    'TTA',
                    'TTPS',
                    'LOD_P',
                    'LOD_NON',
                    'MCPS',
                    'TCPS',
                    'WVPS',
                    'WWPS',
                    'SA',
                    'ALC',
                    'AMC',
                  ];
                  // check if the udt has already been added
                  Object.values(userDefinedAttributes.sampleTypes).forEach(
                    (udt: any) => {
                      const tempUdt: any = {};
                      const tempAtt: any = {};
                      keysToCheck.forEach((key) => {
                        tempUdt[key] = udt[key];
                        tempAtt[key] = attributes[key];
                      });

                      if (JSON.stringify(tempUdt) === JSON.stringify(tempAtt)) {
                        typeUuid = udt.TYPEUUID;
                      }
                    },
                  );

                  if (!typeUuid) {
                    if (
                      sampleTypeContext.data.sampleAttributes.hasOwnProperty(
                        attributes.TYPE,
                      )
                    ) {
                      typeUuid = attributes.TYPE;
                    } else {
                      typeUuid = generateUUID();
                    }
                  }

                  graphic.attributes['TYPEUUID'] = typeUuid;
                }

                // Add the user defined type if it does not exist
                if (
                  !sampleAttributes.hasOwnProperty(graphic.attributes.TYPEUUID)
                ) {
                  newUserSampleTypes.push({
                    value: typeUuid,
                    label: attributes.TYPE,
                    isPredefined: false,
                  });
                  newAttributes[attributes.TYPEUUID] = {
                    status: newAttributes[attributes.TYPEUUID]?.status
                      ? newAttributes[attributes.TYPEUUID].status
                      : 'published',
                    serviceId: result.id,
                    attributes: {
                      OBJECTID: attributes.OBJECTID,
                      PERMANENT_IDENTIFIER: null,
                      GLOBALID: attributes.GLOBALID,
                      TYPEUUID: attributes.TYPEUUID,
                      TYPE: attributes.TYPE,
                      ShapeType: attributes.ShapeType,
                      POINT_STYLE: attributes.POINT_STYLE || 'circle',
                      TTPK: attributes.TTPK ? Number(attributes.TTPK) : null,
                      TTC: attributes.TTC ? Number(attributes.TTC) : null,
                      TTA: attributes.TTA ? Number(attributes.TTA) : null,
                      TTPS: attributes.TTPS ? Number(attributes.TTPS) : null,
                      LOD_P: attributes.LOD_P ? Number(attributes.LOD_P) : null,
                      LOD_NON: attributes.LOD_NON
                        ? Number(attributes.LOD_NON)
                        : null,
                      MCPS: attributes.MCPS ? Number(attributes.MCPS) : null,
                      TCPS: attributes.TCPS ? Number(attributes.TCPS) : null,
                      WVPS: attributes.WVPS ? Number(attributes.WVPS) : null,
                      WWPS: attributes.WWPS ? Number(attributes.WWPS) : null,
                      SA: attributes.SA ? Number(attributes.SA) : null,
                      AA: null,
                      ALC: attributes.ALC ? Number(attributes.ALC) : null,
                      AMC: attributes.AMC ? Number(attributes.AMC) : null,
                      Notes: '',
                      CONTAMTYPE: null,
                      CONTAMVAL: null,
                      CONTAMUNIT: null,
                      CREATEDDATE: null,
                      UPDATEDDATE: null,
                      USERNAME: null,
                      ORGANIZATION: null,
                      DECISIONUNITUUID: null,
                      DECISIONUNIT: null,
                      DECISIONUNITSORT: 0,
                    },
                  };
                }
              });
            });

            // add custom sample types to browser storage
            if (newUserSampleTypes.length > 0) {
              setUserDefinedAttributes((item) => {
                Object.keys(newAttributes).forEach((key) => {
                  const attributes = newAttributes[key];
                  sampleAttributes[attributes.attributes.TYPEUUID as any] =
                    attributes.attributes;
                  item.sampleTypes[
                    attributes.attributes.TYPEUUID as any
                  ] = attributes;
                });

                return {
                  editCount: item.editCount + 1,
                  sampleTypes: item.sampleTypes,
                };
              });

              setUserDefinedOptions((options) => {
                return [...options, ...newUserSampleTypes];
              });
            }

            // reset the status
            setStatus('');
          })
          .catch((err) => {
            console.error(err);
            setStatus('error');
          });
      })
      .catch((err) => {
        console.error(err);
        setStatus('error');
      });
  }

  /**
   * Adds non-tots layers as reference portal layers.
   */
  function addRefLayer() {
    if (!map) return;

    setStatus('loading');

    Layer.fromPortalItem({
      portalItem: new PortalItem({
        id: result.id,
      }),
    }).then((layer) => {
      // setup the watch event to see when the layer finishes loading
      const watcher = watchUtils.watch(
        layer,
        'loadStatus',
        (loadStatus: string) => {
          // set the status based on the load status
          if (loadStatus === 'loaded') {
            setPortalLayers((portalLayers) => [
              ...portalLayers,
              { id: result.id, type: 'arcgis' },
            ]);
            setStatus('');

            // set the min/max scale for tile layers
            if (layer.type === 'tile') {
              const tileLayer = layer as __esri.TileLayer;
              tileLayer.minScale = 0;
              tileLayer.maxScale = 0;
            }

            if (mapView) {
              layer.visible = true;

              // zoom to the layer if it has an extent
              if (layer.fullExtent) {
                mapView.goTo(layer.fullExtent);
              }
            }
          } else if (loadStatus === 'failed') {
            setStatus('error');
          }
        },
      );

      setWatcher(watcher);

      // add the layer to the map
      map.add(layer);
    });
  }

  /**
   * Removes layers that were published through TOTS. These are more complicated
   * because the layer is a hybrid between a portal layer and an editable sketch layer.
   */
  function removeTotsLayer() {
    if (!map) return;

    setLayers((layers) => {
      // remove the layers from the map and set the next sketchLayer
      const mapLayersToRemove: __esri.Layer[] = [];
      let newSketchLayer: LayerType | null = null;
      const parentLayerIds: string[] = [];
      layers.forEach((layer) => {
        if (layer.portalId === result.id) {
          if (!layer.parentLayer) {
            mapLayersToRemove.push(layer.sketchLayer);
            return;
          }

          if (parentLayerIds.includes(layer.parentLayer.id)) return;

          mapLayersToRemove.push(layer.parentLayer);
          parentLayerIds.push(layer.parentLayer.id);
        } else {
          if (
            !newSketchLayer &&
            (layer.layerType === 'Samples' || layer.layerType === 'VSP')
          ) {
            newSketchLayer = layer;
          }
        }
      });

      // select the next scenario and active sampling layer
      const { nextScenario, nextLayer } = getNextScenarioLayer(
        edits,
        layers,
        null,
        null,
      );
      if (nextScenario) setSelectedScenario(nextScenario);
      if (nextLayer) setSketchLayer(nextLayer);

      map.removeMany(mapLayersToRemove);

      // set the state
      return layers.filter((layer) => layer.portalId !== result.id);
    });

    setReferenceLayers((layers) => {
      // find the feature layer ids to remove using the portal id
      const idsToRemove: string[] = [];
      layers.forEach((layer) => {
        if (layer.portalId === result.id) idsToRemove.push(layer.layerId);
      });

      // remove the map layers to remove using the list of layer ids from the
      // previous step
      const mapLayersToRemove: __esri.Layer[] = [];
      map.allLayers.forEach((layer) => {
        if (idsToRemove.includes(layer.id)) mapLayersToRemove.push(layer);
      });
      map.removeMany(mapLayersToRemove);

      // set the state
      return layers.filter((layer) => layer.portalId !== result.id);
    });

    // remove the layer from edits
    setEdits({
      count: edits.count + 1,
      edits: edits.edits.filter((layer) => layer.portalId !== result.id),
    });

    // remove the layer from portal layers
    setPortalLayers((portalLayers) =>
      portalLayers.filter((portalLayer) => portalLayer.id !== result.id),
    );
  }

  /**
   * Removes user defined sample types that were published through TOTS.
   */
  function removeTotsSampleType() {
    // Build list of sample types that need to be removed
    const typesToRemove: string[] = [];
    Object.values(userDefinedAttributes.sampleTypes).forEach((type) => {
      if (type.serviceId === result.id && type?.attributes?.TYPEUUID) {
        typesToRemove.push(type.attributes.TYPEUUID);
      }
    });

    type RemovalObject = {
      layer: LayerType;
      graphics: __esri.Graphic[];
    };
    const removalObject: RemovalObject[] = [];

    // check if any of these sample types have been used
    layers.forEach((layer) => {
      if (
        !['Samples', 'VSP'].includes(layer.layerType) ||
        layer.sketchLayer.type !== 'graphics'
      ) {
        return;
      }

      const graphicsToRemove: __esri.Graphic[] = [];
      layer.sketchLayer.graphics.forEach((graphic) => {
        if (typesToRemove.includes(graphic.attributes.TYPEUUID)) {
          graphicsToRemove.push(graphic);
        }
      });

      if (graphicsToRemove.length > 0) {
        removalObject.push({
          layer: layer,
          graphics: graphicsToRemove,
        });
      }
    });

    function removeFromUdtOptions() {
      setSampleTypeSelections([]);
      setUserDefinedOptions(
        userDefinedOptions.filter(
          (option) => !typesToRemove.includes(option.value),
        ),
      );
      setUserDefinedAttributes((userDefined) => {
        const newUserDefined = {
          ...userDefined,
        };

        typesToRemove.forEach((typeUuid) => {
          delete newUserDefined.sampleTypes[typeUuid];
        });
        newUserDefined.editCount = newUserDefined.editCount + 1;

        return newUserDefined;
      });
    }

    // no related samples have been added, delete the sample
    // types associated with result.id (i.e. serviceId === result.id)
    if (removalObject.length === 0) {
      removeFromUdtOptions();
      return;
    }

    // some samples have been placed using these sample types
    // ask the user if they would like to continue with deleting
    setOptions({
      title: 'Would you like to continue?',
      ariaLabel: 'Would you like to continue?',
      description:
        'Samples using one or more of these sample types have been placed on the map. This operation will delete any samples associated with these sample types.',
      onContinue: () => {
        // Update the attributes of the graphics on the map on edits
        let editsCopy: EditsType = edits;
        removalObject.forEach((object) => {
          if (object.layer.sketchLayer.type === 'graphics') {
            object.layer.sketchLayer.removeMany(object.graphics);

            const collection = new Collection<__esri.Graphic>();
            collection.addMany(object.graphics);
            editsCopy = updateLayerEdits({
              edits: editsCopy,
              layer: object.layer,
              type: 'delete',
              changes: collection,
            });
          }
        });

        setEdits(editsCopy);
        removeFromUdtOptions();
      },
    });
  }

  /**
   * Removes the reference portal layers.
   */
  function removeRefLayer() {
    if (!map) return;

    // get the layers to be removed
    const layersToRemove = map.allLayers.filter((layer: any) => {
      // had to use any, since some layer types don't have portalItem
      if (layer?.portalItem?.id === result.id) {
        return true;
      } else {
        return false;
      }
    });

    // remove the layers from the map and session storage.
    if (layersToRemove.length > 0) {
      map.removeMany(layersToRemove.toArray());
      setPortalLayers((portalLayers) =>
        portalLayers.filter((portalLayer) => portalLayer.id !== result.id),
      );
    }
  }

  let type = result.type;
  if (
    result?.categories?.includes('contains-epa-tots-user-defined-sample-types')
  ) {
    type = 'Sample Types';
  }

  return (
    <div>
      <img
        css={cardThumbnailStyles}
        src={result.thumbnailUrl}
        alt={`${result.title} Thumbnail`}
      />
      <h3 css={cardTitleStyles}>{result.title}</h3>
      <span css={cardInfoStyles}>
        {type} by {result.owner}
      </span>
      <br />
      <div css={cardButtonContainerStyles}>
        <span css={cardMessageStyles}>
          {status === 'loading' && 'Adding...'}
          {status === 'error' && 'Add Failed'}
          {status === 'canceled' && 'Canceled'}
          {status === 'no-data' && 'No Data'}
        </span>
        {map && (
          <React.Fragment>
            {!added && (
              <button
                css={cardButtonStyles}
                disabled={status === 'loading'}
                onClick={() => {
                  // determine whether the layer has a tots sample layer or not
                  // and add the layer accordingly
                  const categories = result?.categories;
                  if (categories?.includes('contains-epa-tots-sample-layer')) {
                    addTotsLayer();
                  } else if (
                    categories?.includes(
                      'contains-epa-tots-user-defined-sample-types',
                    )
                  ) {
                    addTotsSampleType();
                  } else {
                    addRefLayer();
                  }
                }}
              >
                Add
              </button>
            )}
            {added && !status && (
              <button
                css={cardButtonStyles}
                onClick={() => {
                  // determine whether the layer has a tots sample layer or not
                  // and add the layer accordingly
                  const categories = result?.categories;
                  if (categories?.includes('contains-epa-tots-sample-layer')) {
                    removeTotsLayer();
                  } else if (
                    categories?.includes(
                      'contains-epa-tots-user-defined-sample-types',
                    )
                  ) {
                    removeTotsSampleType();
                  } else {
                    removeRefLayer();
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
          Layer Details
        </a>
      </div>
    </div>
  );
}

export default SearchPanel;
