/** @jsxImportSource @emotion/react */

import React, { Fragment, useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import Collection from '@arcgis/core/core/Collection';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Field from '@arcgis/core/layers/support/Field';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import GroupLayer from '@arcgis/core/layers/GroupLayer';
import Layer from '@arcgis/core/layers/Layer';
import Portal from '@arcgis/core/portal/Portal';
import PortalItem from '@arcgis/core/portal/PortalItem';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import * as rendererJsonUtils from '@arcgis/core/renderers/support/jsonUtils';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
// components
import LoadingSpinner from 'components/LoadingSpinner';
import Select from 'components/Select';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { CalculateContext, settingDefaults } from 'contexts/Calculate';
import { DialogContext } from 'contexts/Dialog';
import { LookupFilesContext, useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import { PublishContext } from 'contexts/Publish';
import { PlanGraphics, SketchContext } from 'contexts/Sketch';
// utils
import {
  buildCustomAttributeFromField,
  getAllFeatures,
  getFeatureLayer,
  getFeatureLayers,
  getFeatureTables,
} from 'utils/arcGisRestUtils';
import {
  backupImagerySymbol,
  buildingCalculations,
  buildingColors,
  imageAnalysisSymbols,
  mediaToBeepEnum,
  outsideMedia,
  processScenario,
  useDynamicPopup,
} from 'utils/hooks';
import {
  applyRendererForTotsLayer,
  convertToPoint,
  convertToSimpleGraphic,
  createLayerEditTemplate,
  deepCopyObject,
  generateUUID,
  getNextScenarioLayer,
  getSimplePopupTemplate,
  sampleValidation,
  updateLayerEdits,
} from 'utils/sketchUtils';
import { createErrorObject, escapeForLucene, sentenceJoin } from 'utils/utils';
// types
import { CalculateResultsDataType } from 'types/CalculateResults';
import {
  CalculateSettingsBaseType,
  EditsType,
  LayerAoiAnalysisEditsType,
  LayerDeconEditsType,
  LayerEditsType,
  ReferenceLayersTableType,
  ReferenceLayerTableType,
  ScenarioDeconEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import {
  LayerType,
  LayerTypeName,
  PortalLayerType,
  UrlLayerType,
} from 'types/Layer';
import { ErrorType } from 'types/Misc';
import { AppType, LayerTypeOption } from 'types/Navigation';
import { AttributesType } from 'types/Publish';
// config
import {
  notLoggedInMessage,
  sampleIssuesPopupMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
import { layerTypeOptions } from 'config/navigation';
import {
  Attributes,
  DefaultSymbolsType,
  SampleSelectType,
} from 'config/sampleAttributes';
// styles
import { reactSelectStyles } from 'styles';

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

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

const multiSelectStyles = css`
  ${fullWidthSelectStyles}
  margin-bottom: 10px;
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

const highContrastSpan = css`
  color: black;
  background-color: white;
`;

// --- components (SearchPanel) ---
type LocationType =
  | { value: 'ArcGIS Online'; label: 'ArcGIS Online' }
  | { value: 'My Content'; label: 'My Content' }
  | { value: 'My Organization'; label: 'My Organization' }
  | { value: 'My Groups'; label: 'My Groups' };

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

type Props = {
  appType: AppType;
};

function SearchPanel({ appType }: Props) {
  const { portal, userInfo } = useContext(AuthenticationContext);
  const { goToOptions, setGoToOptions } = useContext(NavigationContext);
  const { mapView, sceneView } = useContext(SketchContext);

  // filters
  const [
    location,
    setLocation, //
  ] = useState<LocationType>({
    value: 'ArcGIS Online',
    label: 'ArcGIS Online',
  });
  const [group, setGroup] = useState<GroupType | null>(null);
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  const [withinMap, setWithinMap] = useState(false);

  const [
    searchResults,
    setSearchResults, //
  ] = useState<SearchResultsType>({ status: 'none', data: null });
  const [currentExtent, setCurrentExtent] = useState<__esri.Extent | null>(
    null,
  );
  const [pageNumber, setPageNumber] = useState(1);
  const [sortBy, setSortBy] = useState<SortByType>({
    value: 'none',
    label: 'Relevance',
    defaultSort: 'desc',
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [layerTypeSelections, setLayerTypeSelections] = useState<
    LayerTypeOption[] | null
  >(null);

  // Handle navigation options
  useEffect(() => {
    if (goToOptions?.from !== 'search') return;
    if (goToOptions.layerTypesAgo)
      setLayerTypeSelections(goToOptions.layerTypesAgo);
    setGoToOptions(null);
  }, [goToOptions, setGoToOptions]);

  // Initializes the group selection
  useEffect(() => {
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
  useEffect(() => {
    if (goToOptions) return;

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
        `orgid:${escapeForLucene(tmpPortal.user.orgId)}`,
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
    const categories: string[] = [];
    let typePart = '';
    const defaultTypePart =
      'type:"Map Service" OR type:"Feature Service" OR type:"Image Service" ' +
      'OR type:"Vector Tile Service" OR type:"KML" OR type:"WMS" OR type:"Scene Service"';
    layerTypeSelections?.forEach((layerType) => {
      if (layerType?.type === 'category') {
        categories.push(layerType.value);
      } else {
        typePart = appendToQuery(typePart, `type:"${layerType.value}"`, 'OR');
      }
    });

    // add the type selection to the query, use all types if all types are set to false
    if (typePart.length > 0) query = appendToQuery(query, typePart);
    else query = appendToQuery(query, defaultTypePart);

    // build the query parameters
    const queryParams = {
      query,
      sortOrder,
      categories: [categories],
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
    goToOptions,
    group,
    layerTypeSelections,
    location,
    portal,
    search,
    setSearchResults,
    sortBy,
    sortOrder,
    userInfo,
    withinMap,
  ]);

  // Runs the query for changing pages of the result set
  const [lastPageNumber, setLastPageNumber] = useState(1);
  useEffect(() => {
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
  }, [pageNumber, lastPageNumber, portal, searchResults]);

  // Defines a watch event for filtering results based on the map extent
  const [watchViewInitialized, setWatchViewInitialized] = useState(false);
  useEffect(() => {
    if (!mapView || !sceneView || watchViewInitialized) return;

    const watchEvent2d = reactiveUtils.when(
      () => mapView.stationary,
      () => {
        if (mapView.stationary) setCurrentExtent(mapView.extent);
      },
    );

    const watchEvent3d = reactiveUtils.when(
      () => sceneView.stationary,
      () => {
        if (sceneView.stationary) setCurrentExtent(sceneView.extent);
      },
    );

    setWatchViewInitialized(true);

    // remove watch event to prevent it from running after component unmounts
    return function cleanup() {
      watchEvent2d.remove();
      watchEvent3d.remove();
    };
  }, [mapView, sceneView, watchViewInitialized]);

  return (
    <Fragment>
      <label htmlFor="locations-select">Data Location</label>
      <Select
        inputId="locations-select"
        value={location}
        styles={reactSelectStyles as any}
        onChange={(ev) => setLocation(ev as LocationType)}
        options={[
          { value: 'ArcGIS Online', label: 'ArcGIS Online' },
          { value: 'My Content', label: 'My Content' },
          { value: 'My Organization', label: 'My Organization' },
          { value: 'My Groups', label: 'My Groups' },
        ]}
      />
      {location.value === 'My Groups' && (
        <Fragment>
          <label htmlFor="group-select">Group</label>
          <Select
            inputId="group-select"
            value={group}
            styles={reactSelectStyles as any}
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
        </Fragment>
      )}
      <div css={filterContainerStyles}>
        <div>
          <input
            id="within_map_filter"
            type="checkbox"
            checked={withinMap}
            onChange={(_ev) => setWithinMap(!withinMap)}
          />{' '}
          <label htmlFor="within_map_filter">Within map...</label>
        </div>
      </div>
      <div>
        <label htmlFor="layer-type-select">Layer Type</label>
        <Select
          inputId="layer-type-select"
          isMulti={true}
          isSearchable={false}
          options={layerTypeOptions}
          value={layerTypeSelections}
          onChange={(ev) => setLayerTypeSelections(ev as any)}
          css={multiSelectStyles}
          styles={reactSelectStyles as any}
        />
      </div>
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
          onClick={(_ev) => setSearch(searchText)}
        >
          <i className="fas fa-search"></i>
          <span className="sr-only" css={highContrastSpan}>
            Search
          </span>
        </button>
      </form>
      <label htmlFor="sort-by-select">Sort By</label>
      <div css={sortContainerStyles}>
        <Select
          inputId="sort-by-select"
          css={sortSelectStyles}
          styles={reactSelectStyles as any}
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
            <span className="sr-only">
              {sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
            </span>
          </button>
        )}
      </div>
      {searchResults?.data?.results &&
        searchResults.data.results.length > 0 && (
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
          <Fragment>
            <div>
              {searchResults.data?.results.map((result, index) => {
                return (
                  <Fragment key={index}>
                    <ResultCard result={result} appType={appType} />
                    <hr />
                  </Fragment>
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
                    <span className="sr-only">Go to first page</span>
                  </button>
                  <button
                    css={pageControlStyles}
                    disabled={pageNumber === 1}
                    onClick={() => setPageNumber(pageNumber - 1)}
                  >
                    <i className="fas fa-angle-left"></i>
                    <span className="sr-only">Previous</span>
                  </button>
                  <span>{pageNumber}</span>
                  <button
                    css={pageControlStyles}
                    disabled={searchResults.data.nextQueryParams.start === -1}
                    onClick={() => setPageNumber(pageNumber + 1)}
                  >
                    <i className="fas fa-angle-right"></i>
                    <span className="sr-only">Next</span>
                  </button>
                  <span css={totalStyles}>
                    {searchResults.data.total.toLocaleString()} Items
                  </span>
                </div>
              </div>
            )}
          </Fragment>
        )}
      </div>
    </Fragment>
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
  appType: AppType;
  result: any;
};

function ResultCard({ appType, result }: ResultCardProps) {
  const { portal } = useContext(AuthenticationContext);
  const { contaminationMap, setContaminationMap } =
    useContext(CalculateContext);
  const { setOptions } = useContext(DialogContext);
  const { sampleTypes } = useContext(LookupFilesContext);
  const { trainingMode } = useContext(NavigationContext);
  const { setSampleTypeSelections } = useContext(PublishContext);
  const {
    defaultDeconSelections,
    defaultSymbols,
    setDefaultSymbols,
    displayDimensions,
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
    sceneView,
    sceneViewForArea,
    setSelectedScenario,
    setSketchLayer,
    setUrlLayers,
    userDefinedOptions,
    setUserDefinedOptions,
    userDefinedAttributes,
    setUserDefinedAttributes,
  } = useContext(SketchContext);
  const getPopupTemplate = useDynamicPopup(appType);
  const layerProps = useLookupFiles().data.layerProps;
  const technologyTypes = useLookupFiles().data.technologyTypes;

  // Used to determine if the layer for this card has been added or not
  const [added, setAdded] = useState(false);
  useEffect(() => {
    let added =
      portalLayers.findIndex((portalLayer) => portalLayer.id === result.id) !==
      -1;

    // check if result was added as a user defined sample type
    Object.values(userDefinedAttributes.sampleTypes).forEach((sample) => {
      if (sample.serviceId === result.id && sample.status === 'published-ago')
        added = true;
    });

    setAdded(added);
  }, [portalLayers, result, userDefinedAttributes]);

  // removes the esri watch handle when the card is removed from the DOM.
  const [status, setStatus] = useState('');
  const [watcher, setWatcher] = useState<IHandle | null>(null);
  useEffect(() => {
    return function cleanup() {
      if (watcher) watcher.remove();
    };
  }, [watcher]);

  /**
   * Adds layers, published through TOTS, such that the sample layer is
   * editable in TOTS. Any non-sample layers will just be added
   * as reference layers, though this could change in the future.
   */
  async function addTotsLayer() {
    if (!map || !portal) return;

    setStatus('loading');

    const tempPortal = portal as any;
    const token = tempPortal.credential.token;
    let addedSampleTypesViaTable = false;

    function getAddedSampleTypesViaTable() {
      return addedSampleTypesViaTable;
    }

    // function used for finalizing the adding of layers. This function is needed
    // for displaying a popup mesage if there is an issue with any of the samples
    function finalizeLayerAdd({
      mapLayersToAdd,
      newUserSampleTypes,
      newAttributes,
      zoomToGraphics,
      editsCopy,
      layersToAdd,
      refLayersToAdd,
      newScenario,
    }: {
      mapLayersToAdd: __esri.Layer[];
      newUserSampleTypes: SampleSelectType[];
      newAttributes: Attributes;
      zoomToGraphics: __esri.Graphic[];
      editsCopy: EditsType;
      layersToAdd: LayerType[];
      refLayersToAdd: any[];
      newScenario: ScenarioEditsType | null;
    }) {
      if (!map) return;

      // replace sample attributes the correct ones
      mapLayersToAdd.forEach((parentLayer) => {
        if (parentLayer.type !== 'group') return;

        const tempParentLayer = parentLayer as __esri.GroupLayer;
        tempParentLayer.layers.forEach((layer) => {
          const tempLayer = layer as __esri.GraphicsLayer;

          tempLayer.graphics.forEach((graphic) => {
            if (
              !Object.prototype.hasOwnProperty.call(
                sampleAttributes,
                graphic.attributes.TYPEUUID,
              )
            )
              return;

            const predefinedAttributes: any =
              sampleAttributes[graphic.attributes.TYPEUUID];
            Object.keys(predefinedAttributes).forEach((key) => {
              if (!sampleTypes?.attributesToCheck.includes(key)) {
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
            item.sampleTypes[attributes.attributes.TYPEUUID as any] =
              attributes;
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
      if (zoomToGraphics.length > 0) {
        if (mapView && displayDimensions === '2d') mapView.goTo(zoomToGraphics);
        if (sceneView && displayDimensions === '3d')
          sceneView.goTo(zoomToGraphics);
      }

      // set the state for session storage
      setEdits(editsCopy);
      window.totsLayers = [...layers, ...layersToAdd];
      setLayers((layers) => [...layers, ...layersToAdd]);
      setReferenceLayers((layers: any) => [...layers, ...refLayersToAdd]);

      if (newScenario) {
        setSelectedScenario((scenario) => {
          if (scenario) return scenario;
          else return newScenario;
        });
      }

      // set the sketchLayer to the first tots sample layer
      if (layersToAdd.length > -1) setSketchLayer(layersToAdd[0]);

      // set the contamination map if one hasn't already been selected
      const contamMap = layersToAdd.find(
        (l) => l.layerType === 'Contamination Map',
      );
      if (contamMap && !contaminationMap) setContaminationMap(contamMap);

      // add the portal id to portal layers. This needed so the card on
      // the search panel shows up as the layer having been added.
      setPortalLayers((portalLayers) => [
        ...portalLayers,
        {
          categories: result.categories,
          id: result.id,
          label: result.title,
          layerType: 'Feature Service',
          type: 'tots',
          url: result.url,
        },
      ]);

      // reset the status
      setStatus('');
    }

    // Updates the pointIds on the layers and edits objects
    function updatePointIds(
      layerFeatures: any,
      layerDetails: any,
      layersToAdd: LayerType[],
      editsCopy: EditsType,
    ) {
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
        ) as ScenarioEditsType;
        if (editsLayer) {
          editsLayer.pointsId = layerDetails.id;

          const editsLayerTemp = editsLayer as ScenarioEditsType;
          if (editsLayerTemp?.layers) {
            const sublayer = editsLayerTemp.layers.find((s) => s.uuid === uuid);
            if (sublayer) sublayer.pointsId = layerDetails.id;
          }
        }
      });
    }

    function addUserDefinedType(
      graphic: any,
      newUserSampleTypes: SampleSelectType[],
      newAttributes: Attributes,
    ) {
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
        Object.values(userDefinedAttributes.sampleTypes).forEach((udt: any) => {
          const tempUdt: any = {};
          const tempAtt: any = {};
          keysToCheck.forEach((key) => {
            tempUdt[key] = udt[key];
            tempAtt[key] = attributes[key];
          });

          if (JSON.stringify(tempUdt) === JSON.stringify(tempAtt)) {
            typeUuid = udt.TYPEUUID;
          }
        });

        if (!typeUuid) {
          if (
            Object.prototype.hasOwnProperty.call(
              sampleTypes?.sampleAttributes,
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
        !Object.prototype.hasOwnProperty.call(
          sampleAttributes,
          attributes.TYPEUUID,
        ) &&
        !Object.prototype.hasOwnProperty.call(
          newAttributes,
          attributes.TYPEUUID,
        )
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
            LOD_NON: attributes.LOD_NON ? Number(attributes.LOD_NON) : null,
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

    try {
      // get the list of feature layers in this feature server
      const featureLayersRes: any = await getFeatureLayers(result.url, token);

      // fire off requests to get the details and features for each layer
      const layerPromises: Promise<any>[] = [];

      // ensure -points layer calls are done last
      const resPolys: any[] = [];
      const resPoints: any[] = [];
      featureLayersRes.layers.forEach((layer: any) => {
        if (layer.geometryType === 'esriGeometryPoint') {
          resPoints.push(layer);
        } else {
          resPolys.push(layer);
        }
      });

      const resSampleTypes: any[] = [];
      const resRefLayersTypes: any[] = [];
      const resCalculateSettings: any[] = [];
      const resCalculateResults: any[] = [];
      featureLayersRes.tables.forEach((table: any) => {
        if (table.name.endsWith('-sample-types')) {
          resSampleTypes.push(table);
        }
        if (table.name.endsWith('-reference-layers')) {
          resRefLayersTypes.push(table);
        }
        if (table.name.endsWith('-calculate-settings')) {
          resCalculateSettings.push(table);
        }
        if (table.name.endsWith('-calculate-results')) {
          resCalculateResults.push(table);
        }
      });

      // fire off the calls with the points layers last
      const resCombined = [
        ...resCalculateResults,
        ...resCalculateSettings,
        ...resRefLayersTypes,
        ...resSampleTypes,
        ...resPolys,
        ...resPoints,
      ];
      resCombined.forEach((layer: any) => {
        // get the layer details promise
        const layerCall = getFeatureLayer(result.url, token, layer.id);
        layerPromises.push(layerCall);
      });

      // wait for layer detail promises to resolve
      const layerDetailResponses = await Promise.all(layerPromises);

      // fire off requests for features of each layer using the objectIdField
      const featurePromises: any[] = [];
      layerDetailResponses.forEach((layerDetails: any) => {
        // get the layer features promise
        const featuresCall = getAllFeatures(
          portal,
          result.url + '/' + layerDetails.id,
          layerDetails.objectIdField,
        );
        featurePromises.push(featuresCall);
      });

      // wait for feature promises to resolve
      const featureResponses = await Promise.all(featurePromises);

      // define items used for updating states
      let editsCopy: EditsType = deepCopyObject(edits);
      let calcSettings: CalculateSettingsBaseType | null = null;
      let calcResults: CalculateResultsDataType | null = null;
      const mapLayersToAdd: __esri.Layer[] = [];
      const newAttributes: Attributes = {};
      const newCustomAttributes: AttributesType[] = [];
      const newUserSampleTypes: SampleSelectType[] = [];
      const layersToAdd: LayerType[] = [];
      const refLayersToAdd: any[] = [];
      const zoomToGraphics: __esri.Graphic[] = [];
      const table: any = {};
      let referenceLayersTable: ReferenceLayersTableType = {
        id: -1,
        referenceLayers: [],
      };

      let isSampleLayer = false;
      let isVspLayer = false;
      let isPointsSampleLayer = false;
      let isVspPointsSampleLayer = false;
      let isContamMapLayer = false;
      const typesLoop = (type: __esri.FeatureType) => {
        if (type.id === 'epa-tots-vsp-layer') isVspLayer = true;
        if (type.id === 'epa-tots-sample-layer') isSampleLayer = true;
        if (type.id === 'epa-tots-sample-points-layer')
          isPointsSampleLayer = true;
        if (type.id === 'epa-tots-vsp-points-layer')
          isVspPointsSampleLayer = true;
        if (type.id === 'epa-tots-contamination-map-layer')
          isContamMapLayer = true;
      };

      let fields: __esri.Field[] = [];
      const fieldsLoop = (field: __esri.Field) => {
        fields.push(Field.fromJSON(field));
      };

      // get the popup template
      const popupTemplate = getPopupTemplate('Samples', trainingMode);

      // create the layers to be added to the map
      let scenarioId: string | null = null;
      for (let i = 0; i < layerDetailResponses.length; i++) {
        const layerDetails = layerDetailResponses[i];
        const layerFeatures = featureResponses[i];
        const scenarioName = layerDetails.name;

        // figure out if this layer is a sample layer or not
        isSampleLayer = false;
        isVspLayer = false;
        isContamMapLayer = false;
        if (layerDetails?.types) {
          layerDetails.types.forEach(typesLoop);
        }

        // add sample layers as graphics layers
        if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-sample-types')
        ) {
          table.id = layerDetails.id;
          table.sampleTypes = {};

          layerFeatures.features.forEach((feature: any) => {
            addUserDefinedType(feature, newUserSampleTypes, newAttributes);
            table.sampleTypes[feature.attributes.TYPEUUID] = feature.attributes;
          });

          addedSampleTypesViaTable = true;
        } else if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-reference-layers')
        ) {
          const newUrlLayers: UrlLayerType[] = [];
          const newPortalLayers: PortalLayerType[] = [];
          const referenceLayers: ReferenceLayerTableType[] = [];
          for (const f of layerFeatures.features) {
            if (f.attributes.TYPE === 'arcgis') {
              newPortalLayers.push({
                categories: [],
                id: f.attributes.LAYERID,
                label: f.attributes.LABEL,
                layerType: f.attributes.LAYERTYPE,
                type: f.attributes.TYPE,
                url: f.attributes.URL,
              });
            }
            if (f.attributes.TYPE === 'url') {
              newUrlLayers.push({
                layerId: f.attributes.LAYERID,
                label: f.attributes.LABEL,
                layerType: f.attributes.LAYERTYPE,
                type: f.attributes.URLTYPE,
                url: f.attributes.URL,
              });
            }
            if (f.attributes.TYPE === 'tots' && f.attributes.TOTSLAYERID) {
              const output = await addAoiCharacterizationLayer(
                {
                  categories: ['contains-epa-tots-aoi-characterization'],
                  id: f.attributes.LAYERID,
                  title: f.attributes.LABEL,
                  url: f.attributes.URL,
                  created: '',
                  description: '',
                },
                editsCopy,
                false,
              );
              if (output?.zoomToGraphics)
                zoomToGraphics.push(...output.zoomToGraphics);
              if (output?.editsCopy) editsCopy = output.editsCopy;
            }

            referenceLayers.push({
              globalId: f.attributes.GLOBALID,
              layerId: f.attributes.LAYERID,
              label: f.attributes.LABEL,
              layerType: f.attributes.LAYERTYPE,
              objectId: f.attributes.OBJECTID,
              onWebMap: f.attributes.ONWEBMAP,
              onWebScene: f.attributes.ONWEBSCENE,
              type: f.attributes.TYPE,
              url: f.attributes.URL,
              urlType: f.attributes.URLTYPE,
            });
          }
          referenceLayersTable = {
            id: layerDetails.id,
            referenceLayers,
          };

          if (newPortalLayers.length > 0) {
            setPortalLayers(newPortalLayers);
          }
          if (newUrlLayers.length > 0) setUrlLayers(newUrlLayers);
        } else if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-calculate-settings')
        ) {
          if (layerFeatures.features.length > 0) {
            calcSettings = {
              ...layerFeatures.features[0].attributes,
            };
          }
        } else if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-calculate-results')
        ) {
          if (layerFeatures.features.length > 0) {
            calcResults = {
              ...layerFeatures.features[0].attributes,
            };
          }
        } else if (isPointsSampleLayer || isVspPointsSampleLayer) {
          if (layerFeatures.features?.length > 0) {
            updatePointIds(layerFeatures, layerDetails, layersToAdd, editsCopy);
          }
        } else if (isSampleLayer || isVspLayer) {
          let newSymbolsAdded = false;
          const newDefaultSymbols: DefaultSymbolsType = {
            editCount: defaultSymbols.editCount + 1,
            symbols: { ...defaultSymbols.symbols },
          };

          // add symbol styles if necessary
          const uniqueValueInfos =
            layerDetails?.drawingInfo?.renderer?.uniqueValueInfos;
          if (uniqueValueInfos) {
            uniqueValueInfos.forEach((value: any) => {
              // exit if value exists already
              if (
                Object.prototype.hasOwnProperty.call(
                  defaultSymbols.symbols,
                  value.value,
                )
              ) {
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
              geometry: graphic.geometry,
              symbol: graphic.symbol,
              popupTemplate: graphic.popupTemplate,
            };

            // Add the user defined type if it does not exist
            if (!getAddedSampleTypesViaTable()) {
              newGraphic.attributes = { ...graphic.attributes };
              addUserDefinedType(graphic, newUserSampleTypes, newAttributes);
            } else {
              const typeUuid = graphic.attributes.TYPEUUID;
              let customAttributes = {};
              if (
                Object.prototype.hasOwnProperty.call(newAttributes, typeUuid)
              ) {
                customAttributes = newAttributes[typeUuid].attributes;
              } else if (
                Object.prototype.hasOwnProperty.call(sampleAttributes, typeUuid)
              ) {
                customAttributes = sampleAttributes[typeUuid];
              }
              newGraphic.attributes = {
                ...customAttributes,
                ...graphic.attributes,
              };
            }

            const typeUuid = feature.attributes.TYPEUUID;
            newGraphic.symbol =
              newDefaultSymbols.symbols[
                Object.prototype.hasOwnProperty.call(
                  newDefaultSymbols.symbols,
                  typeUuid,
                )
                  ? typeUuid
                  : 'Samples'
              ];
            if (
              Object.prototype.hasOwnProperty.call(
                newDefaultSymbols.symbols,
                typeUuid,
              )
            ) {
              graphic.symbol = newDefaultSymbols.symbols[typeUuid];
            }

            zoomToGraphics.push(graphic);

            // add the graphic to the correct layer uuid
            const decisionUuid = newGraphic.attributes.DECISIONUNITUUID;
            if (Object.prototype.hasOwnProperty.call(graphics, decisionUuid)) {
              graphics[decisionUuid].push(newGraphic);
            } else {
              graphics[decisionUuid] = [newGraphic];
            }
          });

          // need to build the scenario and group layer here
          const groupLayer = new GroupLayer({
            title: scenarioName,
          });

          const defaultFields = layerProps.defaultFields;
          layerDetails.fields.forEach((field: any, index: number) => {
            if (['Shape__Area', 'Shape__Length'].includes(field.name)) return;

            const wasAlreadyAdded =
              newCustomAttributes.findIndex((f: any) => f.name === field.name) >
              -1;
            if (wasAlreadyAdded) return;

            const isDefaultField =
              defaultFields.findIndex((f: any) => f.name === field.name) > -1;
            if (isDefaultField) return;

            newCustomAttributes.push(
              buildCustomAttributeFromField(field, index),
            );
          });

          scenarioId = groupLayer.id;
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
            referenceLayersTable,
            customAttributes: newCustomAttributes,
            calculateSettings: {
              current: calcSettings || settingDefaults,
              published: calcSettings || undefined,
            },
            calculateResultsPublished: calcResults,
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
            const pointGraphics: __esri.Graphic[] = [];
            const hybridGraphics: __esri.Graphic[] = [];
            graphicsList.forEach((graphicParams) => {
              const graphic = new Graphic(graphicParams);
              pointGraphics.push(convertToPoint(graphic));
              hybridGraphics.push(
                graphic.attributes.ShapeType === 'point'
                  ? convertToPoint(graphic)
                  : graphic.clone(),
              );
            });

            const pointsLayer = new GraphicsLayer({
              id: firstAttributes.DECISIONUNITUUID + '-points',
              graphics: pointGraphics,
              title: layerName,
              visible: false,
              listMode: 'hide',
            });

            const hybridLayer = new GraphicsLayer({
              id: firstAttributes.DECISIONUNITUUID + '-hybrid',
              graphics: hybridGraphics,
              title: layerName,
              visible: false,
              listMode: 'hide',
            });

            groupLayer.addMany([graphicsLayer, pointsLayer, hybridLayer]);

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
              hybridLayer,
              parentLayer: groupLayer,
            };
            layersToAdd.push(layerToAdd);

            // make a copy of the edits context variable
            editsCopy = updateLayerEdits({
              appType,
              edits: editsCopy,
              scenario: newScenario,
              layer: layerToAdd,
              type: 'arcgis',
              changes: graphicsLayer.graphics,
            });
          }

          mapLayersToAdd.push(groupLayer); // replace with group layer
        } else if (isContamMapLayer) {
          const layerType: LayerTypeName = 'Contamination Map';
          const symbol = SimpleFillSymbol.fromJSON(
            layerDetails.drawingInfo.renderer.symbol,
          );

          // get the graphics from the layer
          const graphics: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            graphic.geometry.spatialReference = {
              wkid: 3857,
            };
            graphic.popupTemplate = getPopupTemplate(layerType, false);
            graphic.symbol = symbol;
            graphics.push(graphic);
          });

          const name = layerDetails.name.replace(
            '-contamination-map',
            ' Contamination Map',
          );
          const sketchLayer = new GraphicsLayer({
            id: generateUUID(),
            listMode: 'hide',
            title: name,
            visible: false,
            graphics,
          });
          mapLayersToAdd.push(sketchLayer);

          const layerContamMap: LayerEditsType = {
            type: 'layer',
            id: layerDetails.id,
            layerId: sketchLayer.id,
            portalId: result.id,
            name,
            label: name,
            layerType: 'Contamination Map',
            addedFrom: 'tots',
            status: 'published',
            editType: 'add',
            visible: sketchLayer.visible,
            listMode: sketchLayer.listMode,
            pointsId: -1,
            uuid: sketchLayer.id,
            hasContaminationRan: true,
            sort: 0,
            adds: sketchLayer.graphics
              .toArray()
              .map((graphic) => convertToSimpleGraphic(graphic)),
            updates: [],
            deletes: [],
            published: [],
          };
          // make a copy of the edits context variable
          editsCopy = {
            count: editsCopy.count + 1,
            edits: [...editsCopy.edits, layerContamMap],
          };

          layersToAdd.push({
            addedFrom: layerContamMap.addedFrom,
            editType: layerContamMap.editType,
            geometryType: 'esriGeometryPolygon',
            hybridLayer: null,
            id: layerContamMap.id,
            label: layerContamMap.label,
            layerId: layerContamMap.layerId,
            layerType: layerContamMap.layerType,
            listMode: layerContamMap.listMode,
            name: layerContamMap.label,
            parentLayer: null,
            pointsId: layerContamMap.pointsId,
            pointsLayer: null,
            portalId: layerContamMap.portalId,
            sketchLayer: sketchLayer,
            sort: layerContamMap.sort,
            status: layerContamMap.status,
            uuid: layerContamMap.layerId,
            value: layerContamMap.layerId,
            visible: layerContamMap.visible,
          });
        } else {
          // add non-sample layers as feature layers
          fields = [];
          layerDetails.fields.forEach(fieldsLoop);

          const source: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            if (graphic.geometry) {
              graphic.geometry.spatialReference = {
                wkid: 3857,
              };
            }
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
          if (!layerDetails.popupInfo && source.length > 0) {
            popupTemplate = getSimplePopupTemplate(source[0].attributes);
          }

          // add the feature layer
          const featureLayerProps: __esri.FeatureLayerProperties = {
            fields,
            source,
            objectIdField: layerFeatures.objectIdFieldName,
            outFields: ['*'],
            title: layerDetails.name,
            renderer,
            popupTemplate,
          };
          const featureLayer = new FeatureLayer(featureLayerProps);
          mapLayersToAdd.push(featureLayer);

          // add the layer to referenceLayers with the layer id
          refLayersToAdd.push({
            ...featureLayerProps,
            layerId: featureLayer.id,
            portalId: result.id,
          });
        }
      }

      const newScenario =
        (editsCopy.edits.find(
          (e) => e.type === 'scenario' && e.layerId === scenarioId,
        ) as ScenarioEditsType | undefined) ?? null;

      // get the age of the layer in seconds
      const created: number = new Date(result.created).getTime();
      const curTime: number = Date.now();
      const duration = (curTime - created) / 1000;

      // validate the area and attributes of features of the uploads. If there is an
      // issue, display a popup asking the user if they would like the samples to be updated.
      if (zoomToGraphics.length > 0) {
        const output = await sampleValidation(
          sampleTypes,
          sceneViewForArea,
          zoomToGraphics,
          true,
          false,
        );

        if (output?.areaOutOfTolerance || output?.attributeMismatch) {
          setOptions({
            title: 'Sample Issues',
            ariaLabel: 'Sample Issues',
            description: sampleIssuesPopupMessage(
              output,
              sampleTypes?.areaTolerance ?? 1,
            ),
            onContinue: () =>
              finalizeLayerAdd({
                mapLayersToAdd,
                newUserSampleTypes,
                newAttributes,
                zoomToGraphics,
                editsCopy,
                layersToAdd,
                refLayersToAdd,
                newScenario,
              }),
            onCancel: () => setStatus('canceled'),
          });
        } else {
          finalizeLayerAdd({
            mapLayersToAdd,
            newUserSampleTypes,
            newAttributes,
            zoomToGraphics,
            editsCopy,
            layersToAdd,
            refLayersToAdd,
            newScenario,
          });
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
        finalizeLayerAdd({
          mapLayersToAdd,
          newUserSampleTypes,
          newAttributes,
          zoomToGraphics,
          editsCopy,
          layersToAdd,
          refLayersToAdd,
          newScenario,
        });
      }
    } catch (err) {
      console.error(err);
      setStatus('error');

      window.logErrorToGa(err);
    }
  }

  /**
   * Adds user defined sample types that were published through TOTS.
   */
  function addTotsSampleType() {
    if (!portal) return;

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
            const newDefaultSymbols: DefaultSymbolsType = {
              editCount: defaultSymbols.editCount + 1,
              symbols: { ...defaultSymbols.symbols },
            };

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
                      Object.prototype.hasOwnProperty.call(
                        sampleTypes?.sampleAttributes,
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
                  !Object.prototype.hasOwnProperty.call(
                    sampleAttributes,
                    graphic.attributes.TYPEUUID,
                  )
                ) {
                  newUserSampleTypes.push({
                    value: typeUuid,
                    label: attributes.TYPE,
                    isPredefined: false,
                  });
                  newAttributes[attributes.TYPEUUID] = {
                    status: newAttributes[attributes.TYPEUUID]?.status
                      ? newAttributes[attributes.TYPEUUID].status
                      : 'published-ago',
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

                // Add the symbol symbology
                if (
                  attributes.SYMBOLTYPE &&
                  attributes.SYMBOLCOLOR &&
                  attributes.SYMBOLOUTLINE
                ) {
                  newDefaultSymbols.symbols[attributes.TYPEUUID] = {
                    type: attributes.SYMBOLTYPE,
                    color: JSON.parse(attributes.SYMBOLCOLOR),
                    outline: JSON.parse(attributes.SYMBOLOUTLINE),
                  };
                }
              });
            });

            // add custom sample types to browser storage
            if (newUserSampleTypes.length > 0) {
              setUserDefinedAttributes((item) => {
                Object.keys(newAttributes).forEach((key) => {
                  const attributes = newAttributes[key];
                  attributes.status = 'published-ago';
                  sampleAttributes[attributes.attributes.TYPEUUID as any] =
                    attributes.attributes;
                  item.sampleTypes[attributes.attributes.TYPEUUID as any] =
                    attributes;
                });

                return {
                  editCount: item.editCount + 1,
                  sampleTypes: item.sampleTypes,
                };
              });

              setUserDefinedOptions((options) => {
                return [...options, ...newUserSampleTypes];
              });
            } else {
              setUserDefinedAttributes((item) => {
                Object.keys(item.sampleTypes).forEach((key) => {
                  const attributes = item.sampleTypes[key];
                  if (attributes?.serviceId === result.id) {
                    attributes.status = 'published-ago';
                  }
                });

                return {
                  editCount: item.editCount + 1,
                  sampleTypes: item.sampleTypes,
                };
              });
            }

            setDefaultSymbols(newDefaultSymbols);

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

  async function addTotsLayerForTods() {
    if (!map || !portal) return;

    setStatus('loading');

    const tempPortal = portal as any;
    const token = tempPortal.credential.token;
    const mapLayersToAdd: __esri.Layer[] = [];

    const layer = await Layer.fromPortalItem({
      portalItem: new PortalItem({
        id: result.id,
      }),
    });
    await layer.load();
    mapLayersToAdd.push(layer);

    // function used for finalizing the adding of layers. This function is needed
    // for displaying a popup mesage if there is an issue with any of the samples
    function finalizeLayerAdd({
      mapLayersToAdd,
      editsCopy,
      layersToAdd,
      linkedLayerIds,
    }: {
      mapLayersToAdd: __esri.Layer[];
      editsCopy: EditsType;
      layersToAdd: LayerType[];
      linkedLayerIds: string[];
    }) {
      if (!map) return;

      // add all of the layers to the map
      map.addMany(mapLayersToAdd);
      applyRendererForTotsLayer(layer, technologyTypes);

      // zoom to the layer if it has an extent
      if (layer.fullExtent) {
        if (mapView && displayDimensions === '2d')
          mapView.goTo(layer.fullExtent);
        if (sceneView && displayDimensions === '3d')
          sceneView.goTo(layer.fullExtent);
      }

      // set the state for session storage
      setEdits(editsCopy);
      window.totsLayers = [...layers, ...layersToAdd];
      setLayers((layers) => [...layers, ...layersToAdd]);

      // set the contamination map if one hasn't already been selected
      const contamMap = layersToAdd.find(
        (l) => l.layerType === 'Contamination Map',
      );
      if (contamMap && !contaminationMap) setContaminationMap(contamMap);

      // add the portal id to portal layers. This needed so the card on
      // the search panel shows up as the layer having been added.
      setPortalLayers((portalLayers) => [
        ...portalLayers,
        {
          categories: result.categories,
          id: result.id,
          label: result.title,
          layerType: 'Feature Service',
          type: 'tots',
          url: result.url,
          linkedIds: linkedLayerIds,
        },
      ]);

      // reset the status
      setStatus('');
    }

    try {
      // get the list of feature layers in this feature server
      const featureLayersRes: any = await getFeatureLayers(result.url, token);

      // fire off requests to get the details and features for each layer
      const layerPromises: Promise<any>[] = [];

      const resLayers: any[] = [];
      featureLayersRes.layers.forEach((layer: any) => {
        resLayers.push(layer);
      });

      const resRefLayersTypes: any[] = [];
      featureLayersRes.tables.forEach((table: any) => {
        if (table.name.endsWith('-reference-layers')) {
          resRefLayersTypes.push(table);
        }
      });

      // fire off the calls with the points layers last
      const resCombined = [...resRefLayersTypes, ...resLayers];
      resCombined.forEach((layer: any) => {
        // get the layer details promise
        const layerCall = getFeatureLayer(result.url, token, layer.id);
        layerPromises.push(layerCall);
      });

      // wait for layer detail promises to resolve
      const layerDetailResponses = await Promise.all(layerPromises);

      // fire off requests for features of each layer using the objectIdField
      const featurePromises: any[] = [];
      layerDetailResponses.forEach((layerDetails: any) => {
        // get the layer features promise
        const featuresCall = getAllFeatures(
          portal,
          result.url + '/' + layerDetails.id,
          layerDetails.objectIdField,
        );
        featurePromises.push(featuresCall);
      });

      // wait for feature promises to resolve
      const featureResponses = await Promise.all(featurePromises);

      // define items used for updating states
      let editsCopy: EditsType = deepCopyObject(edits);
      const layersToAdd: LayerType[] = [];

      let isContamMapLayer = false;
      const typesLoop = (type: __esri.FeatureType) => {
        if (type.id === 'epa-tots-contamination-map-layer')
          isContamMapLayer = true;
      };

      // create the layers to be added to the map
      const linkedLayerIds: string[] = [];
      for (let i = 0; i < layerDetailResponses.length; i++) {
        const layerDetails = layerDetailResponses[i];
        const layerFeatures = featureResponses[i];

        // figure out if this layer is a sample layer or not
        isContamMapLayer = false;
        if (layerDetails?.types) {
          layerDetails.types.forEach(typesLoop);
        }

        // add staging area layers as graphics layers
        if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-reference-layers')
        ) {
          const newUrlLayers: UrlLayerType[] = [];
          const newPortalLayers: PortalLayerType[] = [];
          for (const f of layerFeatures.features) {
            if (f.attributes.TYPE === 'arcgis') {
              newPortalLayers.push({
                categories: [],
                id: f.attributes.LAYERID,
                label: f.attributes.LABEL,
                layerType: f.attributes.LAYERTYPE,
                type: f.attributes.TYPE,
                url: f.attributes.URL,
              });
            }
            if (f.attributes.TYPE === 'url') {
              newUrlLayers.push({
                layerId: f.attributes.LAYERID,
                label: f.attributes.LABEL,
                layerType: f.attributes.LAYERTYPE,
                type: f.attributes.URLTYPE,
                url: f.attributes.URL,
              });
            }
            if (f.attributes.TYPE === 'tots' && f.attributes.TOTSLAYERID) {
              const id = f.attributes.LAYERID;
              if (id && !linkedLayerIds.includes(id)) linkedLayerIds.push(id);
              const output = await addAoiCharacterizationLayer(
                {
                  categories: ['contains-epa-tots-aoi-characterization'],
                  id,
                  title: f.attributes.LABEL,
                  url: f.attributes.URL,
                  created: '',
                  description: '',
                },
                editsCopy,
                false,
              );
              if (output?.editsCopy) editsCopy = output.editsCopy;
            }
          }

          if (newPortalLayers.length > 0) setPortalLayers(newPortalLayers);
          if (newUrlLayers.length > 0) setUrlLayers(newUrlLayers);
        } else if (isContamMapLayer) {
          const layerType: LayerTypeName = 'Contamination Map';
          const symbol = SimpleFillSymbol.fromJSON(
            layerDetails.drawingInfo.renderer.symbol,
          );

          // get the graphics from the layer
          const graphics: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            graphic.geometry.spatialReference = {
              wkid: 3857,
            };
            graphic.popupTemplate = getPopupTemplate(layerType, false);
            graphic.symbol = symbol;
            graphics.push(graphic);
          });

          const name = layerDetails.name.replace(
            '-contamination-map',
            ' Contamination Map',
          );
          const sketchLayer = new GraphicsLayer({
            id: generateUUID(),
            listMode: 'hide',
            title: name,
            visible: false,
            graphics,
          });
          mapLayersToAdd.push(sketchLayer);

          const layerContamMap: LayerEditsType = {
            type: 'layer',
            id: layerDetails.id,
            layerId: sketchLayer.id,
            portalId: result.id,
            name,
            label: name,
            layerType: 'Contamination Map',
            addedFrom: 'tots',
            status: 'published',
            editType: 'add',
            visible: sketchLayer.visible,
            listMode: sketchLayer.listMode,
            pointsId: -1,
            uuid: sketchLayer.id,
            hasContaminationRan: true,
            sort: 0,
            adds: sketchLayer.graphics
              .toArray()
              .map((graphic) => convertToSimpleGraphic(graphic)),
            updates: [],
            deletes: [],
            published: [],
          };
          // make a copy of the edits context variable
          editsCopy = {
            count: editsCopy.count + 1,
            edits: [...editsCopy.edits, layerContamMap],
          };

          layersToAdd.push({
            addedFrom: layerContamMap.addedFrom,
            editType: layerContamMap.editType,
            geometryType: 'esriGeometryPolygon',
            hybridLayer: null,
            id: layerContamMap.id,
            label: layerContamMap.label,
            layerId: layerContamMap.layerId,
            layerType: layerContamMap.layerType,
            listMode: layerContamMap.listMode,
            name: layerContamMap.label,
            parentLayer: null,
            pointsId: layerContamMap.pointsId,
            pointsLayer: null,
            portalId: layerContamMap.portalId,
            sketchLayer: sketchLayer,
            sort: layerContamMap.sort,
            status: layerContamMap.status,
            uuid: layerContamMap.layerId,
            value: layerContamMap.layerId,
            visible: layerContamMap.visible,
          });
        }
      }

      finalizeLayerAdd({
        mapLayersToAdd,
        editsCopy,
        layersToAdd,
        linkedLayerIds,
      });
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  /**
   * Adds the AOI characterization layer to the map.
   */
  async function addAoiCharacterizationLayer(
    result: {
      categories: string[];
      created: string;
      description: string;
      id: string;
      title: string;
      url: string;
    },
    editsCopyParam: EditsType | null = null,
    zoomToLayer: boolean = true,
  ) {
    if (!map || !portal) return;

    setStatus('loading');

    const tempPortal = portal as any;
    const token = tempPortal.credential.token;

    // function used for finalizing the adding of layers. This function is needed
    // for displaying a popup mesage if there is an issue with any of the samples
    function finalizeLayerAdd({
      mapLayersToAdd,
      zoomToGraphics,
      editsCopy,
      layersToAdd,
      refLayersToAdd,
    }: {
      mapLayersToAdd: __esri.Layer[];
      zoomToGraphics: __esri.Graphic[];
      editsCopy: EditsType;
      layersToAdd: LayerType[];
      refLayersToAdd: any[];
    }) {
      if (!map) return;

      // add all of the layers to the map
      map.addMany(mapLayersToAdd);

      // zoom to the graphics layer
      if (zoomToGraphics.length > 0 && zoomToLayer) {
        if (mapView && displayDimensions === '2d') mapView.goTo(zoomToGraphics);
        if (sceneView && displayDimensions === '3d')
          sceneView.goTo(zoomToGraphics);
      }

      // set the state for session storage
      if (!editsCopyParam) setEdits(editsCopy);
      window.totsLayers = [...layers, ...layersToAdd];
      setLayers((layers) => [...layers, ...layersToAdd]);
      setReferenceLayers((layers: any) => [...layers, ...refLayersToAdd]);

      // add the portal id to portal layers. This needed so the card on
      // the search panel shows up as the layer having been added.
      setPortalLayers((portalLayers) => [
        ...portalLayers,
        {
          categories: result.categories,
          id: result.id,
          label: result.title,
          layerType: 'Feature Service',
          type: 'tots',
          url: result.url,
        },
      ]);

      // reset the status
      setStatus('');
    }

    try {
      // get the list of feature layers in this feature server
      const featureLayersRes: any = await getFeatureLayers(result.url, token);

      // fire off requests to get the details and features for each layer
      const layerPromises: Promise<any>[] = [];

      const resLayers: any[] = [];
      featureLayersRes.layers.forEach((layer: any) => {
        resLayers.push(layer);
      });

      const resAoiInfo: any[] = [];
      featureLayersRes.tables.forEach((table: any) => {
        if (table.name.endsWith('-aoi-info')) {
          resAoiInfo.push(table);
        }
      });

      const resCombined = [...resAoiInfo, ...resLayers];

      resCombined.forEach((layer: any) => {
        // get the layer details promise
        const layerCall = getFeatureLayer(result.url, token, layer.id);
        layerPromises.push(layerCall);
      });

      // wait for layer detail promises to resolve
      const layerDetailResponses = await Promise.all(layerPromises);

      // fire off requests for features of each layer using the objectIdField
      const featurePromises: any[] = [];
      layerDetailResponses.forEach((layerDetails: any) => {
        // get the layer features promise
        const featuresCall = getAllFeatures(
          portal,
          result.url + '/' + layerDetails.id,
          layerDetails.objectIdField,
        );
        featurePromises.push(featuresCall);
      });

      // wait for feature promises to resolve
      const featureResponses = await Promise.all(featurePromises);

      // define items used for updating states
      let editsCopy: EditsType = editsCopyParam ?? deepCopyObject(edits);
      let aoiInfo: any | null = null;
      let numAois = 0;
      const mapLayersToAdd: __esri.Layer[] = [];
      const layersToAdd: LayerType[] = [];
      const refLayersToAdd: any[] = [];
      const zoomToGraphics: __esri.Graphic[] = [];
      const aoiCharLayers: LayerEditsType[] = [];

      let isImageryLayer = false;
      let isBuildingLayer = false;
      let isAoiLayer = false;
      const typesLoop = (type: __esri.FeatureType) => {
        if (type.id === 'epa-tods-imagery-analysis-layer')
          isImageryLayer = true;
        if (type.id === 'epa-tods-building-layer') isBuildingLayer = true;
        if (type.id === 'epa-tods-aoi-layer') isAoiLayer = true;
      };

      let fields: __esri.Field[] = [];
      const fieldsLoop = (field: __esri.Field) => {
        fields.push(Field.fromJSON(field));
      };

      const groupLayer = new GroupLayer({
        id: generateUUID(),
        title: result.title,
      });

      // create the layers to be added to the map
      const planGraphics: PlanGraphics = {};
      for (let i = 0; i < layerDetailResponses.length; i++) {
        const layerDetails = layerDetailResponses[i];
        const layerFeatures = featureResponses[i];

        // figure out if this layer is a sample layer or not
        isImageryLayer = false;
        isBuildingLayer = false;
        isAoiLayer = false;
        if (layerDetails?.types) {
          layerDetails.types.forEach(typesLoop);
        }

        // add sample layers as graphics layers
        if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-aoi-info')
        ) {
          if (layerFeatures.features.length > 0) {
            aoiInfo = {
              ...layerFeatures.features[0].attributes,
            };
            if (aoiInfo.AOI_LAYER_ID) groupLayer.id = aoiInfo.AOI_LAYER_ID;
          }
        } else if (isAoiLayer || isBuildingLayer || isImageryLayer) {
          let layerType: LayerTypeName = 'Decon Mask';
          let symbol: __esri.SimpleFillSymbol = new SimpleFillSymbol({
            color: [150, 150, 150, 0.2],
            outline: {
              color: [50, 50, 50],
              width: 2,
            },
          });
          let title = '';
          let value = '';
          if (isAoiLayer) {
            layerType = 'Decon Mask';
            title = 'Area of Interest';
            value = generateUUID();
          }
          if (isBuildingLayer) {
            layerType = 'AOI Assessed';
            title = 'AOI Assessment';
            value = 'aoiAssessed';
          }
          if (isImageryLayer) {
            layerType = 'Image Analysis';
            title = 'Imagery Analysis Results';
            value = 'aoiAssessed';
          }

          // get the graphics from the layer
          const graphics: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            graphic.geometry.spatialReference = {
              wkid: 3857,
            };
            graphic.popupTemplate = getPopupTemplate(layerType, false);

            // set the symbol styles based on sample/layer type
            if (layerType === 'AOI Assessed') {
              const occCls = graphic.attributes.OCC_CLS;
              symbol = new SimpleFillSymbol({
                color: Object.prototype.hasOwnProperty.call(
                  buildingColors,
                  occCls,
                )
                  ? buildingColors[occCls]
                  : buildingColors['Other'],
                outline: {
                  color: [153, 153, 153, 64],
                  width: 0.84,
                },
              });
            }
            if (layerType === 'Image Analysis') {
              const category = graphic.attributes.category;
              symbol = Object.prototype.hasOwnProperty.call(
                imageAnalysisSymbols,
                category,
              )
                ? (imageAnalysisSymbols as any)[category]
                : backupImagerySymbol;
            }

            graphic.symbol = symbol;
            zoomToGraphics.push(graphic);
            graphics.push(graphic);
          });

          if (isBuildingLayer) {
            planGraphics[groupLayer.id] = {
              graphics,
              imageGraphics: [],
              aoiArea: 0,
              buildingFootprint: 0,
              summary: {
                areaByMedia: [],
                totalAoiSqM: 0,
                totalBuildingExtSqM: 0,
                totalBuildingIntSqM: 0,
                totalBuildingVolumeCubM: 0,
                totalBuildingVolumeContentsCubM: 0,
                totalBuildingFootprintSqM: 0,
                totalBuildingFloorsSqM: 0,
                totalBuildingSqM: 0,
                totalBuildingExtWallsSqM: 0,
                totalBuildingIntWallsSqM: 0,
                totalBuildingRoofSqM: 0,
                totalBuildingCeilingsSqM: 0,
              },
              aoiPercentages: {
                numAois: 0,
                asphalt: 0,
                asphaltSqM: 0,
                concrete: 0,
                concreteSqM: 0,
                soil: 0,
                soilSqM: 0,
              },
            };
          }

          const layerUuid = generateUUID();
          const graphicsLayer = new GraphicsLayer({
            id: layerUuid,
            title,
            listMode: 'show',
            visible: !isAoiLayer,
            graphics,
          });

          const tempLayer: LayerType = {
            id: layerDetails.id,
            pointsId: -1,
            uuid: layerUuid,
            layerId: layerUuid,
            portalId: result.id,
            value,
            name: title,
            label: title,
            layerType,
            editType: 'add',
            visible: true,
            listMode: 'show',
            sort: 0,
            geometryType: 'esriGeometryPolygon',
            addedFrom: 'tots',
            status: 'published',
            sketchLayer: graphicsLayer,
            pointsLayer: null,
            hybridLayer: null,
            parentLayer: groupLayer,
          } as LayerType;
          layersToAdd.push(tempLayer);

          const editsLayer = createLayerEditTemplate(tempLayer, 'add');
          editsLayer.adds = graphics.map((graphic) =>
            convertToSimpleGraphic(graphic),
          );
          aoiCharLayers.push(editsLayer);
          groupLayer.add(graphicsLayer);
          if (isAoiLayer) numAois = graphics.length;
        } else {
          // add non-sample layers as feature layers
          fields = [];
          layerDetails.fields.forEach(fieldsLoop);

          const source: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            if (graphic.geometry) {
              graphic.geometry.spatialReference = {
                wkid: 3857,
              };
            }
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
          if (!layerDetails.popupInfo && source.length > 0) {
            popupTemplate = getSimplePopupTemplate(source[0].attributes);
          }

          // add the feature layer
          const featureLayerProps: __esri.FeatureLayerProperties = {
            fields,
            source,
            objectIdField: layerFeatures.objectIdFieldName,
            outFields: ['*'],
            title: layerDetails.name,
            renderer,
            popupTemplate,
          };
          const featureLayer = new FeatureLayer(featureLayerProps);
          mapLayersToAdd.push(featureLayer);

          // add the layer to referenceLayers with the layer id
          refLayersToAdd.push({
            ...featureLayerProps,
            layerId: featureLayer.id,
            portalId: result.id,
          });
        }
      }

      buildingCalculations(planGraphics);

      const aoiPercentages = {
        asphalt: aoiInfo?.GROUND_PCT_ASPHALT ?? 0,
        asphaltSqM: aoiInfo?.GROUND_AREA_ASPHALT ?? 0,
        concrete: aoiInfo?.GROUND_PCT_CONCRETE ?? 0,
        concreteSqM: aoiInfo?.GROUND_AREA_CONCRETE ?? 0,
        numAois,
        soil: aoiInfo?.GROUND_PCT_SOIL ?? 0,
        soilSqM: aoiInfo?.GROUND_AREA_SOIL ?? 0,
      };
      planGraphics[groupLayer.id].aoiPercentages = aoiPercentages;
      planGraphics[groupLayer.id].aoiArea = aoiInfo?.AOI_AREA ?? 0;
      planGraphics[groupLayer.id].summary = {
        areaByMedia: planGraphics[groupLayer.id].summary.areaByMedia,
        totalAoiSqM: aoiInfo?.AOI_AREA ?? 0,
        totalBuildingExtSqM: aoiInfo?.BUILDING_AREA_EXTERIOR ?? 0,
        totalBuildingIntSqM: aoiInfo?.BUILDING_AREA_INTERIOR ?? 0,
        totalBuildingVolumeCubM: aoiInfo?.BUILDING_VOLUME ?? 0,
        totalBuildingVolumeContentsCubM: aoiInfo?.BUILDING_VOLUME_CONTENTS ?? 0,
        totalBuildingExtWallsSqM: aoiInfo?.BUILDING_AREA_EXTERIOR_WALLS ?? 0,
        totalBuildingFloorsSqM: aoiInfo?.BUILDING_AREA_FLOORS ?? 0,
        totalBuildingFootprintSqM: aoiInfo?.BUILDING_AREA_FOOTPRINT ?? 0,
        totalBuildingIntWallsSqM: aoiInfo?.BUILDING_AREA_INTERIOR_WALLS ?? 0,
        totalBuildingRoofSqM: aoiInfo?.BUILDING_AREA_ROOFS ?? 0,
        totalBuildingCeilingsSqM: aoiInfo?.BUILDING_AREA_CEILINGS ?? 0,
        totalBuildingSqM: aoiInfo?.BUILDING_AREA_TOTAL ?? 0,
      };

      const newDeconTechSelections = processScenario(
        groupLayer.id,
        {
          status: 'success',
          planGraphics,
        },
        {},
        {},
        defaultDeconSelections.map((tech) => {
          if (!outsideMedia.includes(tech.media)) return tech;

          const pcts: any = aoiPercentages;
          const prop = (mediaToBeepEnum as any)[tech.media];
          return {
            ...tech,
            pctAoi: pcts[prop],
            surfaceArea: pcts[`${prop}SqM`],
            volume: pcts[`${prop}SqM`],
          };
        }),
      );

      mapLayersToAdd.push(groupLayer);
      const layerAoiAnalysis: LayerAoiAnalysisEditsType = {
        type: 'layer-aoi-analysis',
        id: 0,
        version: aoiInfo?.AOI_VERSION ?? 1,
        layerId: groupLayer.id,
        portalId: result.id,
        name: result.title,
        description: result.description,
        label: result.title,
        value: groupLayer.id,
        layerType: 'AOI Analysis',
        addedFrom: 'tots',
        status: 'published',
        editType: 'add',
        visible: true,
        listMode: 'show',
        layers: aoiCharLayers,
        importedAoiLayer: null,
        aoiLayerMode: 'draw',
        aoiPercentages,
        aoiSummary: planGraphics[groupLayer.id].summary,
        deconTechSelections: newDeconTechSelections.map((tech) => ({
          ...tech,
          id: generateUUID(),
        })),
        gsgFile: null,
      };
      // make a copy of the edits context variable
      editsCopy = {
        count: editsCopy.count + 1,
        edits: [...editsCopy.edits, layerAoiAnalysis],
      };

      layersToAdd.push({
        addedFrom: 'tots',
        editType: 'add',
        geometryType: 'esriGeometryPolygon',
        hybridLayer: null,
        id: 0,
        label: layerAoiAnalysis.label,
        layerId: layerAoiAnalysis.layerId,
        layerType: 'AOI Analysis',
        listMode: 'show',
        name: layerAoiAnalysis.label,
        parentLayer: null,
        pointsId: -1,
        pointsLayer: null,
        portalId: layerAoiAnalysis.portalId,
        sketchLayer: groupLayer,
        sort: 0,
        status: 'published',
        uuid: layerAoiAnalysis.layerId,
        value: layerAoiAnalysis.layerId,
        visible: true,
      });

      const layerIdsAlreadyAdded = edits.edits
        .filter((e) => e.type === 'layer-aoi-analysis')
        .map((e) => e.layerId);
      if (layerIdsAlreadyAdded.includes(groupLayer.id)) {
        // already added bail early
        return;
      }

      // get the age of the layer in seconds
      const created: number = new Date(result.created).getTime();
      const curTime: number = Date.now();
      const duration = (curTime - created) / 1000;

      if (zoomToGraphics.length > 0) {
        finalizeLayerAdd({
          mapLayersToAdd,
          zoomToGraphics,
          editsCopy,
          layersToAdd,
          refLayersToAdd,
        });
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
        finalizeLayerAdd({
          mapLayersToAdd,
          zoomToGraphics,
          editsCopy,
          layersToAdd,
          refLayersToAdd,
        });
      }

      return {
        editsCopy,
        zoomToGraphics,
      };
    } catch (err) {
      console.error(err);
      setStatus('error');
      window.logErrorToGa(err);
    }
  }

  /**
   * Adds the staging area layer to the map.
   */
  async function addStagingAreaLayer() {
    if (!map || !portal) return;

    setStatus('loading');

    const tempPortal = portal as any;
    const token = tempPortal.credential.token;

    // function used for finalizing the adding of layers. This function is needed
    // for displaying a popup mesage if there is an issue with any of the samples
    function finalizeLayerAdd({
      mapLayersToAdd,
      zoomToGraphics,
      editsCopy,
      layersToAdd,
      refLayersToAdd,
    }: {
      mapLayersToAdd: __esri.Layer[];
      zoomToGraphics: __esri.Graphic[];
      editsCopy: EditsType;
      layersToAdd: LayerType[];
      refLayersToAdd: any[];
    }) {
      if (!map) return;

      // add all of the layers to the map
      map.addMany(mapLayersToAdd);

      // zoom to the graphics layer
      if (zoomToGraphics.length > 0) {
        if (mapView && displayDimensions === '2d') mapView.goTo(zoomToGraphics);
        if (sceneView && displayDimensions === '3d')
          sceneView.goTo(zoomToGraphics);
      }

      // set the state for session storage
      setEdits(editsCopy);
      window.totsLayers = [...layers, ...layersToAdd];
      setLayers((layers) => [...layers, ...layersToAdd]);
      setReferenceLayers((layers: any) => [...layers, ...refLayersToAdd]);

      // add the portal id to portal layers. This needed so the card on
      // the search panel shows up as the layer having been added.
      setPortalLayers((portalLayers) => [
        ...portalLayers,
        {
          categories: result.categories,
          id: result.id,
          label: result.title,
          layerType: 'Feature Service',
          type: 'tots',
          url: result.url,
        },
      ]);

      // reset the status
      setStatus('');
    }

    try {
      // get the list of feature layers in this feature server
      const featureLayersRes: any = await getFeatureLayers(result.url, token);

      // fire off requests to get the details and features for each layer
      const layerPromises: Promise<any>[] = [];

      featureLayersRes.layers.forEach((layer: any) => {
        // get the layer details promise
        const layerCall = getFeatureLayer(result.url, token, layer.id);
        layerPromises.push(layerCall);
      });

      // wait for layer detail promises to resolve
      const layerDetailResponses = await Promise.all(layerPromises);

      // fire off requests for features of each layer using the objectIdField
      const featurePromises: any[] = [];
      layerDetailResponses.forEach((layerDetails: any) => {
        // get the layer features promise
        const featuresCall = getAllFeatures(
          portal,
          result.url + '/' + layerDetails.id,
          layerDetails.objectIdField,
        );
        featurePromises.push(featuresCall);
      });

      // wait for feature promises to resolve
      const featureResponses = await Promise.all(featurePromises);

      // define items used for updating states
      let editsCopy: EditsType = deepCopyObject(edits);
      const mapLayersToAdd: __esri.Layer[] = [];
      const layersToAdd: LayerType[] = [];
      const refLayersToAdd: any[] = [];
      const zoomToGraphics: __esri.Graphic[] = [];

      let isStagingAreaLayer = false;
      const typesLoop = (type: __esri.FeatureType) => {
        if (type.id === 'epa-tods-staging-area-layer')
          isStagingAreaLayer = true;
      };

      let fields: __esri.Field[] = [];
      const fieldsLoop = (field: __esri.Field) => {
        fields.push(Field.fromJSON(field));
      };

      const sketchLayer = new GraphicsLayer({
        id: generateUUID(),
        listMode: 'show',
        title: result.title,
      });

      // create the layers to be added to the map
      for (let i = 0; i < layerDetailResponses.length; i++) {
        const layerDetails = layerDetailResponses[i];
        const layerFeatures = featureResponses[i];

        // figure out if this layer is a sample layer or not
        isStagingAreaLayer = false;
        if (layerDetails?.types) {
          layerDetails.types.forEach(typesLoop);
        }

        // add staging area layers as graphics layers
        if (isStagingAreaLayer) {
          const layerType: LayerTypeName = 'Staging Area Mask';
          const symbol = SimpleFillSymbol.fromJSON(
            layerDetails.drawingInfo.renderer.symbol,
          );

          // get the graphics from the layer
          const graphics: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            graphic.geometry.spatialReference = {
              wkid: 3857,
            };
            graphic.popupTemplate = getPopupTemplate(layerType, false);

            if (!graphic.attributes.LATITUDE || !graphic.attributes.LONGITUDE) {
              graphic.attributes.LATITUDE =
                (graphic.geometry as __esri.Polygon)?.centroid?.latitude ?? 0;
              graphic.attributes.LONGITUDE =
                (graphic.geometry as __esri.Polygon)?.centroid?.longitude ?? 0;
            }

            graphic.symbol = symbol;
            zoomToGraphics.push(graphic);
            graphics.push(graphic);
          });

          sketchLayer.graphics.addMany(graphics);
        } else {
          // add non-sample layers as feature layers
          fields = [];
          layerDetails.fields.forEach(fieldsLoop);

          const source: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            if (graphic.geometry) {
              graphic.geometry.spatialReference = {
                wkid: 3857,
              };
            }
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
          if (!layerDetails.popupInfo && source.length > 0) {
            popupTemplate = getSimplePopupTemplate(source[0].attributes);
          }

          // add the feature layer
          const featureLayerProps: __esri.FeatureLayerProperties = {
            fields,
            source,
            objectIdField: layerFeatures.objectIdFieldName,
            outFields: ['*'],
            title: layerDetails.name,
            renderer,
            popupTemplate,
          };
          const featureLayer = new FeatureLayer(featureLayerProps);
          mapLayersToAdd.push(featureLayer);

          // add the layer to referenceLayers with the layer id
          refLayersToAdd.push({
            ...featureLayerProps,
            layerId: featureLayer.id,
            portalId: result.id,
          });
        }
      }

      mapLayersToAdd.push(sketchLayer);
      const layerStagingArea: LayerEditsType = {
        type: 'layer',
        id: 0,
        layerId: sketchLayer.id,
        portalId: result.id,
        name: result.title,
        description: result.description,
        label: result.title,
        layerType: 'Staging Area Mask',
        addedFrom: 'tots',
        status: 'published',
        editType: 'add',
        visible: true,
        listMode: 'show',
        pointsId: -1,
        uuid: sketchLayer.id,
        hasContaminationRan: false,
        sort: 0,
        adds: sketchLayer.graphics
          .toArray()
          .map((graphic) => convertToSimpleGraphic(graphic)),
        updates: [],
        deletes: [],
        published: [],
      };
      // make a copy of the edits context variable
      editsCopy = {
        count: editsCopy.count + 1,
        edits: [...editsCopy.edits, layerStagingArea],
      };

      layersToAdd.push({
        addedFrom: layerStagingArea.addedFrom,
        editType: layerStagingArea.editType,
        geometryType: 'esriGeometryPolygon',
        hybridLayer: null,
        id: layerStagingArea.id,
        label: layerStagingArea.label,
        layerId: layerStagingArea.layerId,
        layerType: layerStagingArea.layerType,
        listMode: layerStagingArea.listMode,
        name: layerStagingArea.label,
        parentLayer: null,
        pointsId: layerStagingArea.pointsId,
        pointsLayer: null,
        portalId: layerStagingArea.portalId,
        sketchLayer: sketchLayer,
        sort: layerStagingArea.sort,
        status: layerStagingArea.status,
        uuid: layerStagingArea.layerId,
        value: layerStagingArea.layerId,
        visible: layerStagingArea.visible,
      });

      // get the age of the layer in seconds
      const created: number = new Date(result.created).getTime();
      const curTime: number = Date.now();
      const duration = (curTime - created) / 1000;

      if (zoomToGraphics.length > 0) {
        finalizeLayerAdd({
          mapLayersToAdd,
          zoomToGraphics,
          editsCopy,
          layersToAdd,
          refLayersToAdd,
        });
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
        finalizeLayerAdd({
          mapLayersToAdd,
          zoomToGraphics,
          editsCopy,
          layersToAdd,
          refLayersToAdd,
        });
      }

      return {
        editsCopy,
        zoomToGraphics,
      };
    } catch (err) {
      console.error(err);
      setStatus('error');
      window.logErrorToGa(err);
    }
  }

  /**
   * Adds layers, published through TODS, such that the sample layer is
   * editable in TODS. Any non-sample layers will just be added
   * as reference layers, though this could change in the future.
   */
  async function addTodsLayer() {
    if (!map || !portal) return;

    setStatus('loading');

    const tempPortal = portal as any;
    const token = tempPortal.credential.token;

    // function used for finalizing the adding of layers. This function is needed
    // for displaying a popup mesage if there is an issue with any of the samples
    function finalizeLayerAdd({
      mapLayersToAdd,
      zoomToGraphics,
      editsCopy,
      layersToAdd,
      refLayersToAdd,
      newScenario,
    }: {
      mapLayersToAdd: __esri.Layer[];
      zoomToGraphics: __esri.Graphic[];
      editsCopy: EditsType;
      layersToAdd: LayerType[];
      refLayersToAdd: any[];
      newScenario: ScenarioDeconEditsType;
    }) {
      if (!map) return;

      // add all of the layers to the map
      map.addMany(mapLayersToAdd);

      // zoom to the graphics layer
      if (zoomToGraphics.length > 0) {
        if (mapView && displayDimensions === '2d') mapView.goTo(zoomToGraphics);
        if (sceneView && displayDimensions === '3d')
          sceneView.goTo(zoomToGraphics);
      }

      // set the state for session storage
      setEdits(editsCopy);
      window.totsLayers = [...layers, ...layersToAdd];
      setLayers((layers) => [...layers, ...layersToAdd]);
      setReferenceLayers((layers: any) => [...layers, ...refLayersToAdd]);

      if (appType === 'decon') {
        setSelectedScenario((scenario) => {
          if (scenario) return scenario;
          else return newScenario;
        });
      }

      // set the contamination map if one hasn't already been selected
      const contamMap = layersToAdd.find(
        (l) => l.layerType === 'Contamination Map',
      );
      if (contamMap && !contaminationMap) setContaminationMap(contamMap);

      // add the portal id to portal layers. This needed so the card on
      // the search panel shows up as the layer having been added.
      setPortalLayers((portalLayers) => [
        ...portalLayers,
        {
          categories: result.categories,
          id: result.id,
          label: result.title,
          layerType: 'Feature Service',
          type: 'tots',
          url: result.url,
        },
      ]);

      // reset the status
      setStatus('');
    }

    try {
      // get the list of feature layers in this feature server
      const featureLayersRes: any = await getFeatureLayers(result.url, token);

      // fire off requests to get the details and features for each layer
      const layerPromises: Promise<any>[] = [];

      // ensure -points layer calls are done last
      const resLayers: any[] = [];
      featureLayersRes.layers.forEach((layer: any) => {
        resLayers.push(layer);
      });

      const resOperationSettings: any[] = [];
      const resOperationDetails: any[] = [];
      const resCalculationResults: any[] = [];
      // const resDeconTypes: any[] = [];
      const resRefLayersTypes: any[] = [];
      featureLayersRes.tables.forEach((table: any) => {
        if (table.name.endsWith('-operation-settings')) {
          resOperationSettings.push(table);
        }
        if (table.name.endsWith('-operation-details')) {
          resOperationDetails.push(table);
        }
        if (table.name.endsWith('-reference-layers')) {
          resRefLayersTypes.push(table);
        }
        if (table.name.endsWith('-calculation-results')) {
          resCalculationResults.push(table);
        }
      });

      // fire off the calls with the points layers last
      const resCombined = [
        ...resRefLayersTypes,
        ...resOperationSettings,
        ...resOperationDetails,
        ...resCalculationResults,
        // ...resDeconTypes,
        ...resLayers,
      ];
      resCombined.forEach((layer: any) => {
        // get the layer details promise
        const layerCall = getFeatureLayer(result.url, token, layer.id);
        layerPromises.push(layerCall);
      });

      // wait for layer detail promises to resolve
      const layerDetailResponses = await Promise.all(layerPromises);

      // fire off requests for features of each layer using the objectIdField
      const featurePromises: any[] = [];
      layerDetailResponses.forEach((layerDetails: any) => {
        // get the layer features promise
        const featuresCall = getAllFeatures(
          portal,
          result.url + '/' + layerDetails.id,
          layerDetails.objectIdField,
        );
        featurePromises.push(featuresCall);
      });

      // wait for feature promises to resolve
      const featureResponses = await Promise.all(featurePromises);

      // define items used for updating states
      let editsCopy: EditsType = deepCopyObject(edits);
      let operationSettings: any[] | null = null;
      let operationDetails: any[] | null = null;
      let calculationResults: any[] | null = null;
      const mapLayersToAdd: __esri.Layer[] = [];
      const layersToAdd: LayerType[] = [];
      const refLayersToAdd: any[] = [];
      const zoomToGraphics: __esri.Graphic[] = [];
      const linkedLayerIds: string[] = [];
      const deconTechRemoved: string[] = [];
      let referenceLayersTable: ReferenceLayersTableType = {
        id: -1,
        referenceLayers: [],
      };

      let isContamMapLayer = false;
      const typesLoop = (type: __esri.FeatureType) => {
        if (type.id === 'epa-tots-contamination-map-layer')
          isContamMapLayer = true;
      };

      let fields: __esri.Field[] = [];
      const fieldsLoop = (field: __esri.Field) => {
        fields.push(Field.fromJSON(field));
      };

      // create the layers to be added to the map
      for (let i = 0; i < layerDetailResponses.length; i++) {
        const layerDetails = layerDetailResponses[i];
        const layerFeatures = featureResponses[i];

        // figure out if this layer is a sample layer or not
        isContamMapLayer = false;
        if (layerDetails?.types) {
          layerDetails.types.forEach(typesLoop);
        }

        // add sample layers as graphics layers
        if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-reference-layers')
        ) {
          const newUrlLayers: UrlLayerType[] = [];
          const newPortalLayers: PortalLayerType[] = [];
          const referenceLayers: ReferenceLayerTableType[] = [];
          for (const f of layerFeatures.features) {
            if (f.attributes.TYPE === 'arcgis') {
              newPortalLayers.push({
                categories: [],
                id: f.attributes.LAYERID,
                label: f.attributes.LABEL,
                layerType: f.attributes.LAYERTYPE,
                type: f.attributes.TYPE,
                url: f.attributes.URL,
              });
            }
            if (f.attributes.TYPE === 'url') {
              newUrlLayers.push({
                layerId: f.attributes.LAYERID,
                label: f.attributes.LABEL,
                layerType: f.attributes.LAYERTYPE,
                type: f.attributes.URLTYPE,
                url: f.attributes.URL,
              });
            }
            if (f.attributes.TYPE === 'tots' && f.attributes.TOTSLAYERID) {
              const output = await addAoiCharacterizationLayer(
                {
                  categories: ['contains-epa-tots-aoi-characterization'],
                  id: f.attributes.LAYERID,
                  title: f.attributes.LABEL,
                  url: f.attributes.URL,
                  created: '',
                  description: '',
                },
                editsCopy,
                false,
              );
              if (output?.zoomToGraphics)
                zoomToGraphics.push(...output.zoomToGraphics);
              if (output?.editsCopy) editsCopy = output.editsCopy;
            }

            referenceLayers.push({
              globalId: f.attributes.GLOBALID,
              layerId: f.attributes.LAYERID,
              totsLayerId: f.attributes.TOTSLAYERID,
              label: f.attributes.LABEL,
              layerType: f.attributes.LAYERTYPE,
              objectId: f.attributes.OBJECTID,
              onWebMap: f.attributes.ONWEBMAP,
              onWebScene: f.attributes.ONWEBSCENE,
              type: f.attributes.TYPE,
              url: f.attributes.URL,
              urlType: f.attributes.URLTYPE,
            });
          }
          referenceLayersTable = {
            id: layerDetails.id,
            referenceLayers,
          };

          if (newPortalLayers.length > 0) setPortalLayers(newPortalLayers);
          if (newUrlLayers.length > 0) setUrlLayers(newUrlLayers);
        } else if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-operation-settings')
        ) {
          if (layerFeatures.features.length > 0) {
            operationSettings = layerFeatures.features.map(
              (f: any) => f.attributes,
            );
          }
        } else if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-operation-details')
        ) {
          if (layerFeatures.features.length > 0) {
            operationDetails = layerFeatures.features.map((f: any) => {
              const hasDeconTech =
                !f.attributes.DECON_TECH_UUID ||
                ['multiple', 'none'].includes(f.attributes.DECON_TECH_UUID) ||
                Object.prototype.hasOwnProperty.call(
                  technologyTypes.deconAttributes,
                  f.attributes.DECON_TECH_UUID,
                );
              if (!hasDeconTech) deconTechRemoved.push(f.attributes.DECON_TECH);
              return {
                ...f.attributes,
                DECON_TECH_UUID: hasDeconTech
                  ? f.attributes.DECON_TECH_UUID
                  : 'none',
                DECON_TECH: hasDeconTech ? f.attributes.DECON_TECH : 'None',
              };
            });
          }
        } else if (
          layerDetails.type === 'Table' &&
          layerDetails.name.endsWith('-calculation-results')
        ) {
          if (layerFeatures.features.length > 0) {
            calculationResults = layerFeatures.features.map(
              (f: any) => f.attributes,
            );
          }
        } else if (isContamMapLayer) {
          const layerType: LayerTypeName = 'Contamination Map';
          const symbol = SimpleFillSymbol.fromJSON(
            layerDetails.drawingInfo.renderer.symbol,
          );

          // get the graphics from the layer
          const graphics: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            if (!graphic.geometry) return;
            graphic.geometry.spatialReference = {
              wkid: 3857,
            };
            graphic.popupTemplate = getPopupTemplate(layerType, false);
            graphic.symbol = symbol;
            graphics.push(graphic);
          });

          const name = layerDetails.name.replace(
            '-contamination-map',
            ' Contamination Map',
          );
          const sketchLayer = new GraphicsLayer({
            id: generateUUID(),
            listMode: 'hide',
            title: name,
            visible: false,
            graphics,
          });
          mapLayersToAdd.push(sketchLayer);

          const layerContamMap: LayerEditsType = {
            type: 'layer',
            id: layerDetails.id,
            layerId: sketchLayer.id,
            portalId: result.id,
            name,
            label: name,
            layerType: 'Contamination Map',
            addedFrom: 'tots',
            status: 'published',
            editType: 'add',
            visible: sketchLayer.visible,
            listMode: sketchLayer.listMode,
            pointsId: -1,
            uuid: sketchLayer.id,
            hasContaminationRan: true,
            sort: 0,
            adds: sketchLayer.graphics
              .toArray()
              .map((graphic) => convertToSimpleGraphic(graphic)),
            updates: [],
            deletes: [],
            published: [],
          };
          // make a copy of the edits context variable
          editsCopy = {
            count: editsCopy.count + 1,
            edits: [...editsCopy.edits, layerContamMap],
          };

          layersToAdd.push({
            addedFrom: layerContamMap.addedFrom,
            editType: layerContamMap.editType,
            geometryType: 'esriGeometryPolygon',
            hybridLayer: null,
            id: layerContamMap.id,
            label: layerContamMap.label,
            layerId: layerContamMap.layerId,
            layerType: layerContamMap.layerType,
            listMode: layerContamMap.listMode,
            name: layerContamMap.label,
            parentLayer: null,
            pointsId: layerContamMap.pointsId,
            pointsLayer: null,
            portalId: layerContamMap.portalId,
            sketchLayer: sketchLayer,
            sort: layerContamMap.sort,
            status: layerContamMap.status,
            uuid: layerContamMap.layerId,
            value: layerContamMap.layerId,
            visible: layerContamMap.visible,
          });
        } else {
          // add non-sample layers as feature layers
          fields = [];
          layerDetails.fields.forEach(fieldsLoop);

          const source: __esri.Graphic[] = [];
          layerFeatures.features.forEach((feature: any) => {
            const graphic: any = Graphic.fromJSON(feature);
            graphic.geometry.spatialReference = {
              wkid: 3857,
            };
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
          if (!layerDetails.popupInfo && source.length > 0) {
            popupTemplate = getSimplePopupTemplate(source[0].attributes);
          }

          // add the feature layer
          const featureLayerProps: __esri.FeatureLayerProperties = {
            fields,
            source,
            objectIdField: layerFeatures.objectIdFieldName,
            outFields: ['*'],
            title: layerDetails.name,
            renderer,
            popupTemplate,
          };
          const featureLayer = new FeatureLayer(featureLayerProps);
          mapLayersToAdd.push(featureLayer);

          // add the layer to referenceLayers with the layer id
          refLayersToAdd.push({
            ...featureLayerProps,
            layerId: featureLayer.id,
            portalId: result.id,
          });
        }
      }

      const deconOperations: LayerDeconEditsType[] = [];
      operationSettings?.forEach((setting: any) => {
        linkedLayerIds.push(setting.OPERATION_UUID);

        const operationDetailsFiltered =
          operationDetails?.filter(
            (detail: any) => detail.OPERATION_UUID === setting.OPERATION_UUID,
          ) ?? [];

        const calcResultsFiltered =
          calculationResults?.filter(
            (detail: any) => detail.OPERATION_UUID === setting.OPERATION_UUID,
          ) ?? [];

        const opResults = calcResultsFiltered.find(
          (c) => c.AGGREGATION_LEVEL === 'SUMMARY',
        );

        const deconTechSelections: any[] = [];
        operationDetailsFiltered.forEach((tech) => {
          const newRecord = {
            aboveDetectionLimit: false,
            avgCfu: 0,
            avgFinalContamination: 0,
            deconTech: tech.DECON_TECH_UUID
              ? {
                  isPredefined: true,
                  label: tech.DECON_TECH,
                  value: tech.DECON_TECH_UUID,
                }
              : null,
            id: tech.SURFACE_UUID,
            isHazardous: { label: 'Non-Hazardous', value: 'non-hazardous' },
            media: tech.PARENT_SURFACE_UUID
              ? tech.SURFACE_SUB_CATEGORY
              : tech.SURFACE,
            numIterativeApplications: tech.NUM_ITERATIVE_APPLICATIONS ?? 1,
            numTeams: tech.NUM_TEAMS ?? 1,
            pctAoi: tech.PCT_AOI ?? 0,
            pctDeconed: tech.PCT_DECONED ?? 0,
            removeContents: tech.REMOVE_BLDG_CONTENTS === 1 ? true : false,
            surfaceArea: tech.SURFACE_AREA ?? 0,
            volume: tech.VOLUME ?? 0,
            volumeContents: tech.VOLUME_CONTENTS ?? 0,
          };

          if (tech.PARENT_SURFACE_UUID) {
            const parentTech = deconTechSelections.find(
              (parent) => parent.id === tech.PARENT_SURFACE_UUID,
            );
            if (parentTech) {
              if (!Object.prototype.hasOwnProperty.call(parentTech, 'subRows'))
                parentTech.subRows = [];
              parentTech.subRows.push(newRecord);
            }
          } else {
            deconTechSelections.push(newRecord);
          }
        });

        deconOperations.push({
          type: 'layer-decon',
          analysisLayerId: setting.AOI_LAYER_ID,
          approach: setting.DECON_EST_APPROACH,
          buildingApproach: setting.DECON_BLDG_EST_APPROACH,
          deconLayerResults: {
            cost: opResults.COST,
            resultsTable: [],
            time: opResults.TIME,
            wasteMass: opResults.SOLID_WASTE_MASS,
            wasteVolume: opResults.SOLID_WASTE_M3,
          },
          deconSummaryResults: {},
          deconTechSelections,
          editType: 'add',
          id: 0,
          label: setting.OPERATION_NAME,
          layerId: setting.OPERATION_UUID,
          layerType: 'Decon',
          listMode: 'show',
          name: setting.OPERATION_NAME,
          portalId: result.id,
          status: 'published',
          value: setting.OPERATION_UUID,
          visible: true,
        });
        layersToAdd.push({
          addedFrom: 'tots',
          editType: 'add',
          geometryType: 'esriGeometryPolygon',
          hybridLayer: null,
          id: 0,
          label: setting.OPERATION_NAME,
          layerId: setting.OPERATION_UUID,
          layerType: 'Decon',
          listMode: 'show',
          name: setting.OPERATION_NAME,
          parentLayer: null,
          pointsId: -1,
          pointsLayer: null,
          portalId: result.id,
          sketchLayer: null,
          sort: 0,
          status: 'published',
          uuid: setting.OPERATION_UUID,
          value: setting.OPERATION_UUID,
          visible: true,
        });
      });

      const newScenario: ScenarioDeconEditsType = {
        type: 'scenario-decon',
        id: 0,
        layerId: result.id,
        portalId: result.id,
        name: result.title,
        label: result.title,
        value: result.id,
        layerType: 'Decon Scenario',
        addedFrom: 'tots',
        status: 'published',
        editType: 'add',
        visible: true,
        listMode: 'show',
        scenarioName: result.title,
        scenarioDescription: result.description,
        linkedLayerIds,
        table: null,
        referenceLayersTable,
      };

      // make a copy of the edits context variable
      editsCopy = {
        count: editsCopy.count + 1,
        edits: [...editsCopy.edits, newScenario, ...deconOperations],
      };

      // get the age of the layer in seconds
      const created: number = new Date(result.created).getTime();
      const curTime: number = Date.now();
      const duration = (curTime - created) / 1000;

      // aoi version number check
      const aoisWithMismatch: string[] = [];
      operationSettings?.forEach((op) => {
        // find the associated aoi
        const aoiLayer = editsCopy.edits.find(
          (edit) =>
            edit.type === 'layer-aoi-analysis' &&
            edit.layerId === op.AOI_LAYER_ID,
        ) as LayerAoiAnalysisEditsType;
        if (aoiLayer && aoiLayer.version !== op.AOI_VERSION) {
          aoisWithMismatch.push(aoiLayer.label);
        }
      });

      // validate the area and attributes of features of the uploads. If there is an
      // issue, display a popup asking the user if they would like the samples to be updated.
      if (zoomToGraphics.length === 0 && duration < 300) {
        // display a message if the layer is empty and the layer is less
        // than 5 minutes old
        setOptions({
          title: 'No Data',
          ariaLabel: 'No Data',
          description: `The "${result.title}" layer was recently added and currently does not have any data. This could be due to a delay in processing the new data. Please try again later.`,
          onCancel: () => setStatus('no-data'),
        });
      } else if (aoisWithMismatch.length > 0 || deconTechRemoved.length > 0) {
        const titles: string[] = [];
        const descriptions: string[] = [];
        if (aoisWithMismatch.length > 0) {
          titles.push('AOI Version Mismatch');
          descriptions.push(
            `The following AOI Characterization layers have a version mismatch: ${sentenceJoin(aoisWithMismatch)}. The AOI Characterization data may have changed, including AOI location.`,
          );
        }
        if (deconTechRemoved.length > 0) {
          titles.push('Decon Technology Does Not Exist');
          descriptions.push(
            `The following Decon Technologies do not exist: ${sentenceJoin(deconTechRemoved)}. These decon technologies have been replaced with None.`,
          );
        }

        const title = sentenceJoin(titles);
        descriptions.push('Calculations will be re-ran.');
        setOptions({
          title,
          ariaLabel: title,
          description: descriptions.join(' '),
          onCancel: () => {
            editsCopy.count += 1;
            editsCopy.edits = editsCopy.edits.map((edit) => {
              if (
                edit.type === 'layer-decon' &&
                linkedLayerIds.includes(edit.layerId)
              ) {
                // find the aoi layer
                const aoiChar = editsCopy.edits.find(
                  (e) => e.layerId === edit.analysisLayerId,
                ) as LayerAoiAnalysisEditsType | undefined;
                if (!aoiChar) return edit;

                return {
                  ...edit,
                  deconTechSelections: aoiChar.deconTechSelections.map(
                    (tech) => {
                      const editTech = edit.deconTechSelections.find(
                        (e) => e.media === tech.media,
                      );
                      return {
                        ...tech,
                        deconTech: editTech?.deconTech ?? tech.deconTech,
                        numIterativeApplications:
                          editTech?.numIterativeApplications ??
                          tech.numIterativeApplications,
                        numTeams: editTech?.numTeams ?? tech.numTeams,
                        removeContents:
                          editTech?.removeContents ?? tech.removeContents,
                        subRows:
                          editTech?.subRows?.map((subTech: any) => {
                            const subEditTech = editTech
                              ? editTech.subRows.find(
                                  (e: any) => e.media === tech.media,
                                )
                              : null;

                            return {
                              ...subTech,
                              deconTech:
                                subEditTech?.deconTech ?? subTech.deconTech,
                              numIterativeApplications:
                                subEditTech?.numIterativeApplications ??
                                subTech.numIterativeApplications,
                              numTeams:
                                subEditTech?.numTeams ?? subTech.numTeams,
                              removeContents:
                                subEditTech?.removeContents ??
                                subTech.removeContents,
                            };
                          }) ?? tech.subRows,
                      };
                    },
                  ),
                };
              }

              return edit;
            });

            finalizeLayerAdd({
              mapLayersToAdd,
              zoomToGraphics,
              editsCopy,
              layersToAdd,
              refLayersToAdd,
              newScenario,
            });
          },
        });
      } else {
        finalizeLayerAdd({
          mapLayersToAdd,
          zoomToGraphics,
          editsCopy,
          layersToAdd,
          refLayersToAdd,
          newScenario,
        });
      }
    } catch (err) {
      console.error(err);
      setStatus('error');

      window.logErrorToGa(err);
    }
  }

  /**
   * Adds user defined sample types that were published through TODS.
   */
  function addTodsDeconType() {
    if (!portal) return;
    // if (sampleTypeContext.status === 'failure') {
    //   setStatus('error');
    //   return;
    // }

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
            const newDefaultSymbols: DefaultSymbolsType = {
              editCount: defaultSymbols.editCount + 1,
              symbols: { ...defaultSymbols.symbols },
            };

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
                      Object.prototype.hasOwnProperty.call(
                        technologyTypes.deconAttributes,
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
                  !Object.prototype.hasOwnProperty.call(
                    sampleAttributes,
                    graphic.attributes.TYPEUUID,
                  )
                ) {
                  newUserSampleTypes.push({
                    value: typeUuid,
                    label: attributes.TYPE,
                    isPredefined: false,
                  });
                  newAttributes[attributes.TYPEUUID] = {
                    status: newAttributes[attributes.TYPEUUID]?.status
                      ? newAttributes[attributes.TYPEUUID].status
                      : 'published-ago',
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

                // Add the symbol symbology
                if (
                  attributes.SYMBOLTYPE &&
                  attributes.SYMBOLCOLOR &&
                  attributes.SYMBOLOUTLINE
                ) {
                  newDefaultSymbols.symbols[attributes.TYPEUUID] = {
                    type: attributes.SYMBOLTYPE,
                    color: JSON.parse(attributes.SYMBOLCOLOR),
                    outline: JSON.parse(attributes.SYMBOLOUTLINE),
                  };
                }
              });
            });

            // add custom sample types to browser storage
            if (newUserSampleTypes.length > 0) {
              setUserDefinedAttributes((item) => {
                Object.keys(newAttributes).forEach((key) => {
                  const attributes = newAttributes[key];
                  attributes.status = 'published-ago';
                  sampleAttributes[attributes.attributes.TYPEUUID as any] =
                    attributes.attributes;
                  item.sampleTypes[attributes.attributes.TYPEUUID as any] =
                    attributes;
                });

                return {
                  editCount: item.editCount + 1,
                  sampleTypes: item.sampleTypes,
                };
              });

              setUserDefinedOptions((options) => {
                return [...options, ...newUserSampleTypes];
              });
            } else {
              setUserDefinedAttributes((item) => {
                Object.keys(item.sampleTypes).forEach((key) => {
                  const attributes = item.sampleTypes[key];
                  if (attributes?.serviceId === result.id) {
                    attributes.status = 'published-ago';
                  }
                });

                return {
                  editCount: item.editCount + 1,
                  sampleTypes: item.sampleTypes,
                };
              });
            }

            setDefaultSymbols(newDefaultSymbols);

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
      const watcher = reactiveUtils.watch(
        () => layer.loadStatus,
        () => {
          // set the status based on the load status
          if (layer.loadStatus === 'loaded') {
            setPortalLayers((portalLayers) => [
              ...portalLayers,
              {
                categories: [],
                id: result.id,
                label: result.title,
                layerType: result.type,
                type: 'arcgis',
                url: result.url,
              },
            ]);
            setStatus('');

            // set the min/max scale for tile layers
            if (layer.type === 'tile') {
              const tileLayer = layer as __esri.TileLayer;
              tileLayer.minScale = 0;
              tileLayer.maxScale = 0;
            }

            layer.visible = true;

            // zoom to the layer if it has an extent
            if (layer.fullExtent) {
              if (mapView && displayDimensions === '2d')
                mapView.goTo(layer.fullExtent);
              if (sceneView && displayDimensions === '3d')
                sceneView.goTo(layer.fullExtent);
            }
          } else if (layer.loadStatus === 'failed') {
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

    // get portal ids of analysis layers to remove
    const planLayer = edits.edits.find(
      (l) => l.portalId === result.id && l.type === 'scenario',
    ) as ScenarioEditsType | undefined;
    const portalIdsToRemove: string[] = [];
    planLayer?.referenceLayersTable.referenceLayers.forEach((l) => {
      if (l.type !== 'tots' || !l.layerId) return;
      portalIdsToRemove.push(l.layerId);
    });

    const newEdits = {
      count: edits.count + 1,
      edits: edits.edits.filter(
        (layer) =>
          layer.portalId !== result.id &&
          !portalIdsToRemove.includes(layer.portalId),
      ),
    };

    setLayers((layers) => {
      // remove the layers from the map and set the next sketchLayer
      const mapLayersToRemove: __esri.Layer[] = [];
      let newSketchLayer: LayerType | null = null;
      const parentLayerIds: string[] = [];
      layers.forEach((layer) => {
        if (
          layer.portalId === result.id ||
          portalIdsToRemove.includes(layer.portalId)
        ) {
          if (!layer.parentLayer && layer.sketchLayer) {
            mapLayersToRemove.push(layer.sketchLayer);
            return;
          }

          if (
            !layer.parentLayer ||
            parentLayerIds.includes(layer.parentLayer.id)
          )
            return;

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

      const newLayers = layers.filter(
        (layer) =>
          layer.portalId !== result.id &&
          !portalIdsToRemove.includes(layer.portalId),
      );

      // select the next scenario and active sampling layer
      const { nextScenario, nextLayer } = getNextScenarioLayer(
        newEdits,
        newLayers,
        null,
        null,
      );

      if (nextScenario) setSelectedScenario(nextScenario);
      else setSelectedScenario(null);

      if (nextLayer) setSketchLayer(nextLayer);
      else setSketchLayer(null);

      map.removeMany(mapLayersToRemove);

      // set the state
      return newLayers;
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
    setEdits(newEdits);

    // remove the layer from portal layers
    setPortalLayers((portalLayers) =>
      portalLayers.filter(
        (portalLayer) =>
          portalLayer.id !== result.id &&
          !portalIdsToRemove.includes(portalLayer.id),
      ),
    );
  }

  function removeTotsLayerForTods() {
    if (!map) return;

    // get analysis layers linked to sample plan
    const portalLayer = portalLayers.find((l) => l.id === result.id);
    const portalIds = portalLayer?.linkedIds ?? [];
    const analysisLayers = edits.edits.filter(
      (e) => e.type === 'layer-aoi-analysis' && portalIds.includes(e.portalId),
    );
    const analysisLayerIds = analysisLayers.map((l) => {
      return {
        layerId: l.layerId,
        portalId: l.portalId,
      };
    });

    // get analysis layer ids of layers that aren't in use elswhere
    const analysisLayerIdsToRemove: string[] = [];
    const analysisPortalIdsToRemove: string[] = [];
    analysisLayerIds.forEach((ids) => {
      const inUse =
        edits.edits.findIndex(
          (e) => e.type === 'layer-decon' && e.analysisLayerId === ids.layerId,
        ) !== -1;
      if (inUse) return;

      analysisLayerIdsToRemove.push(ids.layerId);
      if (ids.portalId) analysisPortalIdsToRemove.push(ids.portalId);
    });

    // get the layers to be removed
    const layersToRemove = map.allLayers.filter((layer: any) => {
      // had to use any, since some layer types don't have portalItem
      if (
        layer?.portalItem?.id === result.id ||
        analysisLayerIdsToRemove.includes(layer?.id)
      ) {
        return true;
      } else {
        return false;
      }
    });

    setEdits((edits) => {
      return {
        count: edits.count + 1,
        edits: edits.edits.filter(
          (l) => !analysisLayerIdsToRemove.includes(l.layerId),
        ),
      };
    });

    setLayers((layers) => {
      // remove the layers from the map and set the next sketchLayer
      const mapLayersToRemove: __esri.Layer[] = [];
      const parentLayerIds: string[] = [];
      layers.forEach((layer) => {
        if (
          layer.portalId === result.id ||
          analysisPortalIdsToRemove.includes(layer.portalId)
        ) {
          if (!layer.parentLayer && layer.sketchLayer) {
            mapLayersToRemove.push(layer.sketchLayer);
            return;
          }

          if (
            !layer.parentLayer ||
            parentLayerIds.includes(layer.parentLayer.id)
          )
            return;

          mapLayersToRemove.push(layer.parentLayer);
          parentLayerIds.push(layer.parentLayer.id);
        }
      });

      const newLayers = layers.filter(
        (layer) =>
          layer.portalId !== result.id &&
          !analysisPortalIdsToRemove.includes(layer.portalId),
      );

      map.removeMany(mapLayersToRemove);

      // set the state
      return newLayers;
    });

    // remove the layers from the map and session storage.
    if (layersToRemove.length > 0) {
      map.removeMany(layersToRemove.toArray());
      setPortalLayers((portalLayers) =>
        portalLayers.filter(
          (portalLayer) =>
            portalLayer.id !== result.id &&
            !analysisPortalIdsToRemove.includes(portalLayer.id),
        ),
      );
    }
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
      pointsGraphics: __esri.Graphic[];
      hybridGraphics: __esri.Graphic[];
    };
    const removalObject: RemovalObject[] = [];

    // check if any of these sample types have been used
    layers.forEach((layer) => {
      if (
        !['Samples', 'VSP'].includes(layer.layerType) ||
        !layer.sketchLayer ||
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

      const pointsGraphicsToRemove: __esri.Graphic[] = [];
      if (layer.pointsLayer) {
        layer.pointsLayer.graphics.forEach((graphic) => {
          if (typesToRemove.includes(graphic.attributes.TYPEUUID)) {
            pointsGraphicsToRemove.push(graphic);
          }
        });
      }

      const hybridGraphicsToRemove: __esri.Graphic[] = [];
      if (layer.hybridLayer) {
        layer.hybridLayer.graphics.forEach((graphic) => {
          if (typesToRemove.includes(graphic.attributes.TYPEUUID)) {
            hybridGraphicsToRemove.push(graphic);
          }
        });
      }

      if (
        graphicsToRemove.length > 0 ||
        pointsGraphicsToRemove.length > 0 ||
        hybridGraphicsToRemove.length > 0
      ) {
        removalObject.push({
          layer: layer,
          graphics: graphicsToRemove,
          pointsGraphics: pointsGraphicsToRemove,
          hybridGraphics: hybridGraphicsToRemove,
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
          if (object.layer.sketchLayer?.type === 'graphics') {
            object.layer.sketchLayer.removeMany(object.graphics);
            if (object.layer.pointsLayer)
              object.layer.pointsLayer.removeMany(object.pointsGraphics);
            if (object.layer.hybridLayer)
              object.layer.hybridLayer.removeMany(object.hybridGraphics);

            const collection = new Collection<__esri.Graphic>();
            collection.addMany(object.graphics);
            editsCopy = updateLayerEdits({
              appType,
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
   * Removes layers that were published through TOTS. These are more complicated
   * because the layer is a hybrid between a portal layer and an editable sketch layer.
   */
  function removeTodsLayer() {
    if (!map) return;

    // figure out what aoi characterizations are linked to the plan
    const linkedDeconLayers = edits.edits.filter(
      (l) => l.portalId === result.id && l.type === 'layer-decon',
    ) as LayerDeconEditsType[];
    const linkedAnalysisLayerIds = linkedDeconLayers.map(
      (l: LayerDeconEditsType) => {
        const analysisLayer = edits.edits.find(
          (e) =>
            e.type === 'layer-aoi-analysis' && e.layerId === l.analysisLayerId,
        ) as LayerAoiAnalysisEditsType | undefined;
        return {
          layerId: l.analysisLayerId,
          portalId: analysisLayer?.portalId,
        };
      },
    );

    // remove the plan and linked decon operations from edits
    const newEdits = {
      count: edits.count + 1,
      edits: edits.edits.filter((layer) => layer.portalId !== result.id),
    };

    const analysisLayerIdsToRemove: string[] = [];
    const analysisPortalIdsToRemove: string[] = [];
    linkedAnalysisLayerIds.forEach((ids) => {
      const inUse =
        newEdits.edits.findIndex(
          (e) => e.type === 'layer-decon' && e.analysisLayerId === ids.layerId,
        ) !== -1;
      if (inUse) return;

      analysisLayerIdsToRemove.push(ids.layerId);
      if (ids.portalId) analysisPortalIdsToRemove.push(ids.portalId);
    });

    // remove analysis layers that are linked to this plan but not other plans
    newEdits.edits = newEdits.edits.filter(
      (l) => !analysisLayerIdsToRemove.includes(l.layerId),
    );

    setLayers((layers) => {
      // remove the layers from the map and set the next sketchLayer
      const mapLayersToRemove: __esri.Layer[] = [];
      let newSketchLayer: LayerType | null = null;
      const parentLayerIds: string[] = [];
      layers.forEach((layer) => {
        if (
          layer.portalId === result.id ||
          analysisPortalIdsToRemove.includes(layer.portalId)
        ) {
          if (!layer.parentLayer && layer.sketchLayer) {
            mapLayersToRemove.push(layer.sketchLayer);
            return;
          }

          if (
            !layer.parentLayer ||
            parentLayerIds.includes(layer.parentLayer.id)
          )
            return;

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

      const newLayers = layers.filter(
        (layer) =>
          layer.portalId !== result.id &&
          !analysisPortalIdsToRemove.includes(layer.portalId),
      );

      // select the next scenario and active sampling layer
      const { nextScenario, nextLayer } = getNextScenarioLayer(
        newEdits,
        newLayers,
        null,
        null,
      );

      if (nextScenario) setSelectedScenario(nextScenario);
      else setSelectedScenario(null);

      if (nextLayer) setSketchLayer(nextLayer);
      else setSketchLayer(null);

      map.removeMany(mapLayersToRemove);

      // set the state
      return newLayers;
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
    setEdits(newEdits);

    // remove the layer from portal layers
    setPortalLayers((portalLayers) =>
      portalLayers.filter(
        (portalLayer) =>
          portalLayer.id !== result.id &&
          !analysisPortalIdsToRemove.includes(portalLayer.id),
      ),
    );
  }

  /**
   * Removes user defined sample types that were published through TOTS.
   */
  function removeTodsDeconType() {
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
      pointsGraphics: __esri.Graphic[];
      hybridGraphics: __esri.Graphic[];
    };
    const removalObject: RemovalObject[] = [];

    // check if any of these sample types have been used
    layers.forEach((layer) => {
      if (
        !['Samples', 'VSP'].includes(layer.layerType) ||
        layer.sketchLayer?.type !== 'graphics'
      ) {
        return;
      }

      const graphicsToRemove: __esri.Graphic[] = [];
      layer.sketchLayer.graphics.forEach((graphic) => {
        if (typesToRemove.includes(graphic.attributes.TYPEUUID)) {
          graphicsToRemove.push(graphic);
        }
      });

      const pointsGraphicsToRemove: __esri.Graphic[] = [];
      if (layer.pointsLayer) {
        layer.pointsLayer.graphics.forEach((graphic) => {
          if (typesToRemove.includes(graphic.attributes.TYPEUUID)) {
            pointsGraphicsToRemove.push(graphic);
          }
        });
      }

      const hybridGraphicsToRemove: __esri.Graphic[] = [];
      if (layer.hybridLayer) {
        layer.hybridLayer.graphics.forEach((graphic) => {
          if (typesToRemove.includes(graphic.attributes.TYPEUUID)) {
            hybridGraphicsToRemove.push(graphic);
          }
        });
      }

      if (
        graphicsToRemove.length > 0 ||
        pointsGraphicsToRemove.length > 0 ||
        hybridGraphicsToRemove.length > 0
      ) {
        removalObject.push({
          layer: layer,
          graphics: graphicsToRemove,
          pointsGraphics: pointsGraphicsToRemove,
          hybridGraphics: hybridGraphicsToRemove,
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
        'Decon Applications using one or more of these decon technologies have been placed on the map. This operation will delete any decon technologies associated with these decon technologies.',
      onContinue: () => {
        // Update the attributes of the graphics on the map on edits
        let editsCopy: EditsType = edits;
        removalObject.forEach((object) => {
          if (object.layer.sketchLayer?.type === 'graphics') {
            object.layer.sketchLayer.removeMany(object.graphics);
            if (object.layer.pointsLayer)
              object.layer.pointsLayer.removeMany(object.pointsGraphics);
            if (object.layer.hybridLayer)
              object.layer.hybridLayer.removeMany(object.hybridGraphics);

            const collection = new Collection<__esri.Graphic>();
            collection.addMany(object.graphics);
            editsCopy = updateLayerEdits({
              appType,
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
   * Removes the aoi characterization layer.
   */
  function removeAoiCharacterizationLayer() {
    if (!map) return;

    // prevent removal if it is linked to something
    const aoiEditId = edits.edits.find(
      (e) => e.type === 'layer-aoi-analysis' && e.portalId === result.id,
    )?.layerId;
    const linkedAoiLayers = edits.edits.filter(
      (e) => e.type === 'layer-decon' && e.analysisLayerId === aoiEditId,
    );

    if (linkedAoiLayers.length > 0) {
      setOptions({
        title: 'Cannot Remove',
        ariaLabel: 'Cannot Remove',
        description: `Cannot remove the "${result.title}" layer since it is linked to at least one decon operation. Please unlink the layer and try again.`,
        onCancel: () => {},
      });
      return;
    }

    const newEdits = {
      count: edits.count + 1,
      edits: edits.edits.filter((layer) => layer.portalId !== result.id),
    };

    setLayers((layers) => {
      // remove the layers from the map and set the next sketchLayer
      const mapLayersToRemove: __esri.Layer[] = [];
      let newSketchLayer: LayerType | null = null;
      const parentLayerIds: string[] = [];
      layers.forEach((layer) => {
        if (layer.portalId === result.id) {
          if (!layer.parentLayer && layer.sketchLayer) {
            mapLayersToRemove.push(layer.sketchLayer);
            return;
          }

          if (
            !layer.parentLayer ||
            parentLayerIds.includes(layer.parentLayer.id)
          )
            return;

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

      const newLayers = layers.filter((layer) => layer.portalId !== result.id);
      map.removeMany(mapLayersToRemove);

      // set the state
      return newLayers;
    });

    // remove the layer from edits
    setEdits(newEdits);

    // remove the layer from portal layers
    setPortalLayers((portalLayers) =>
      portalLayers.filter((portalLayer) => portalLayer.id !== result.id),
    );
  }

  /**
   * Removes the staging area layer.
   */
  function removeStagingAreaLayer() {
    if (!map) return;

    const newEdits = {
      count: edits.count + 1,
      edits: edits.edits.filter((layer) => layer.portalId !== result.id),
    };

    setLayers((layers) => {
      // remove the layers from the map and set the next sketchLayer
      const mapLayersToRemove: __esri.Layer[] = [];
      const parentLayerIds: string[] = [];
      layers.forEach((layer) => {
        if (layer.portalId === result.id) {
          if (!layer.parentLayer && layer.sketchLayer) {
            mapLayersToRemove.push(layer.sketchLayer);
            return;
          }

          if (
            !layer.parentLayer ||
            parentLayerIds.includes(layer.parentLayer.id)
          )
            return;

          mapLayersToRemove.push(layer.parentLayer);
          parentLayerIds.push(layer.parentLayer.id);
        }
      });

      const newLayers = layers.filter((layer) => layer.portalId !== result.id);
      map.removeMany(mapLayersToRemove);

      // set the state
      return newLayers;
    });

    // remove the layer from edits
    setEdits(newEdits);

    // remove the layer from portal layers
    setPortalLayers((portalLayers) =>
      portalLayers.filter((portalLayer) => portalLayer.id !== result.id),
    );
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

  let resultType = result.type;
  if (
    result?.categories?.includes('contains-epa-tots-user-defined-sample-types')
  ) {
    resultType = 'Sample Types';
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
        {resultType} by {result.owner}
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
          <Fragment>
            {!added && (
              <button
                css={cardButtonStyles}
                disabled={status === 'loading'}
                onClick={() => {
                  // determine whether the layer has a tots sample layer or not
                  // and add the layer accordingly
                  const categories = result?.categories;
                  if (categories?.includes('contains-epa-tots-sample-layer')) {
                    if (appType === 'sampling') addTotsLayer();
                    if (appType === 'decon') addTotsLayerForTods();
                  } else if (
                    categories?.includes(
                      'contains-epa-tots-user-defined-sample-types',
                    )
                  ) {
                    addTotsSampleType();
                  } else if (
                    categories?.includes('contains-epa-tods-decon-layer')
                  ) {
                    addTodsLayer();
                  } else if (
                    categories?.includes(
                      'contains-epa-tots-aoi-characterization',
                    )
                  ) {
                    addAoiCharacterizationLayer({
                      categories: result.categories,
                      created: result.created,
                      description: result.description,
                      id: result.id,
                      title: result.title,
                      url: result.url,
                    });
                  } else if (
                    categories?.includes('contains-epa-tots-staging-area')
                  ) {
                    addStagingAreaLayer();
                  } else if (
                    categories?.includes(
                      'contains-epa-tods-user-defined-decon-tech',
                    )
                  ) {
                    addTodsDeconType();
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
                    if (appType === 'sampling') removeTotsLayer();
                    if (appType === 'decon') removeTotsLayerForTods();
                  } else if (
                    categories?.includes(
                      'contains-epa-tots-user-defined-sample-types',
                    )
                  ) {
                    removeTotsSampleType();
                  } else if (
                    categories?.includes('contains-epa-tods-decon-layer')
                  ) {
                    removeTodsLayer();
                  } else if (
                    categories?.includes(
                      'contains-epa-tots-aoi-characterization',
                    )
                  ) {
                    removeAoiCharacterizationLayer();
                  } else if (
                    categories?.includes('contains-epa-tots-staging-area')
                  ) {
                    removeStagingAreaLayer();
                  } else if (
                    categories?.includes(
                      'contains-epa-tods-user-defined-decon-tech',
                    )
                  ) {
                    removeTodsDeconType();
                  } else {
                    removeRefLayer();
                  }
                }}
              >
                Remove
              </button>
            )}
          </Fragment>
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
