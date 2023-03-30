/** @jsxImportSource @emotion/react */

import React, { useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import { EditCustomSampleTypesTable } from 'components/EditLayerMetaData';
import InfoIcon from 'components/InfoIcon';
import NavigationButton from 'components/NavigationButton';
import { ReactTable, ReactTableEditable } from 'components/ReactTable';
import Select from 'components/Select';
import ShowLessMore from 'components/ShowLessMore';
import Switch from 'components/Switch';
// contexts
import { AuthenticationContext } from 'contexts/Authentication';
import { PublishContext, defaultPlanAttributes } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// types
import { ScenarioEditsType } from 'types/Edits';
import { ErrorType } from 'types/Misc';
import {
  AttributesType,
  CodedValue,
  Domain,
  ReferenceLayerSelections,
  SampleTypeOptions,
} from 'types/Publish';
// config
import { notLoggedInMessage } from 'config/errorMessages';
// styles
import { colors } from 'styles';

export type SaveStatusType =
  | 'none'
  | 'changes'
  | 'fetching'
  | 'success'
  | 'failure'
  | 'fetch-failure'
  | 'name-not-available';

export type SaveResultsType = {
  status: SaveStatusType;
  error?: ErrorType;
};

let currentAttributeId = 10;

// --- styles (Calculate) ---
const panelContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  padding: 20px 0;
`;

const sectionContainer = css`
  margin-bottom: 10px;
  padding: 0 20px;
`;

const tableContainer = css`
  margin-bottom: 10px;
  padding: 0 5px;
`;

const layerInfo = css`
  padding-bottom: 0.5em;
`;

const radioLabelStyles = css`
  padding-left: 0.375rem;
`;

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
`;

const multiSelectStyles = css`
  ${fullWidthSelectStyles}
  margin-bottom: 10px;
`;

const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const labelStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  font-weight: bold;
  pointer-events: none;

  span {
    margin-left: 0.5em;
  }
`;

const subLabelStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  pointer-events: none;
`;

const switchStyles = css`
  margin-right: 10px;
  pointer-events: all;
  display: flex;
`;

const editColumnContainerStyles = css`
  text-align: center;
`;

const editButtonStyles = css`
  background-color: transparent;
  color: black;
  margin: 0;
  padding: 3px 6px;
  font-size: 16px;
`;

const nextInstructionStyles = css`
  margin-top: 20px;
`;

const infoIconStyles = css`
  margin-left: 10px;
  color: #19a3dd;
  pointer-events: all;
`;

const nestedAccordionStyles = css`
  margin: 20px 20px 10px 20px;
`;

// --- components (ConfigureOutput) ---
function ConfigureOutput() {
  const { signedIn } = useContext(AuthenticationContext);
  const {
    publishSamplesMode,
    setPublishSamplesMode,
    sampleTypeSelections,
    setSampleTypeSelections,
    includePartialPlan,
    setIncludePartialPlan,
    includePartialPlanWebMap,
    setIncludePartialPlanWebMap,
    includePartialPlanWebScene,
    setIncludePartialPlanWebScene,
    includeCustomSampleTypes,
    setIncludeCustomSampleTypes,
    webMapReferenceLayerSelections,
    setWebMapReferenceLayerSelections,
    webSceneReferenceLayerSelections,
    setWebSceneReferenceLayerSelections,
  } = useContext(PublishContext);
  const {
    edits,
    map,
    portalLayers,
    referenceLayers,
    selectedScenario,
    setEdits,
    urlLayers,
    userDefinedAttributes,
  } = useContext(SketchContext);

  const sampleTypeOptions: SampleTypeOptions = Object.values(
    userDefinedAttributes.sampleTypes,
  ).map((type) => {
    return {
      label: `${type.attributes.TYPE}${
        type.status === 'delete' ? ' (deleted)' : ''
      }`,
      value: type.attributes.TYPEUUID,
      serviceId: type.serviceId,
      status: type.status,
    };
  });

  const [editAttributesOpen, setEditAttributesOpen] = useState(false);
  const [attributesIndex, setAttributesIndex] = useState(-1);
  const [isPartialOpen, setIsPartialOpen] = useState(includePartialPlan);
  const [isSampleTypesOpen, setIsSampleTypesOpen] = useState(
    includeCustomSampleTypes,
  );
  const [isIncludeWebMapOpen, setIsIncludeWebMapOpen] = useState(false);
  const [isIncludeWebMapSceneOpen, setIsIncludeWebSceneOpen] = useState(false);

  const webMapIcon = (id: string) => (
    <InfoIcon
      id={id}
      cssStyles={infoIconStyles}
      tooltip="A web map is used with Field Maps and supports field data collection activities."
      place="right"
      type="info"
    />
  );

  const webSceneIcon = (id: string) => (
    <InfoIcon
      id={id}
      cssStyles={infoIconStyles}
      tooltip="A web scene is used for viewing TOTS sampling plans in ArcGIS Online with 3D."
      place="right"
      type="info"
    />
  );

  const [webMapRefOptions, setWebMapRefOptions] = useState<
    ReferenceLayerSelections[]
  >([]);
  const [webSceneRefOptions, setWebSceneRefOptions] = useState<
    ReferenceLayerSelections[]
  >([]);
  useEffect(() => {
    const webMapRefLayers: ReferenceLayerSelections[] = [];
    const webSceneRefLayers: ReferenceLayerSelections[] = [];

    const applicableLayerTypesAgoWebMap = [
      'Feature Service',
      'Image Service',
      'KML',
      'Map Service',
      'Vector Tile Service',
      'WMS',
    ];
    const applicableLayerTypesAgoWebScene = [
      'Feature Service',
      'Image Service',
      'Map Service',
      'Scene Service',
      'Vector Tile Service',
    ];
    portalLayers.forEach((l) => {
      if (l.type === 'tots') return;

      const item: ReferenceLayerSelections = {
        label: window.location.search.includes('devMode=true')
          ? `${l.label} (${l.layerType} | Portal)`
          : l.label,
        id: l.id,
        value: l.url,
        layerType: l.layerType,
        type: 'arcgis',
        onWebMap: 0,
        onWebScene: 0,
      };

      if (applicableLayerTypesAgoWebMap.includes(l.layerType)) {
        item.onWebMap = 1;
        webMapRefLayers.push(item);
      }

      if (applicableLayerTypesAgoWebScene.includes(l.layerType)) {
        item.onWebScene = 1;
        webMapRefLayers.push(item);
      }
    });

    const applicableLayerTypesUrlWebMap = [
      'feature',
      'imagery',
      'imagery-tile',
      'map-image',
      'tile',
    ];
    const applicableUrlTypesUrlWebMap = ['CSV', 'GeoRSS', 'KML', 'WMS'];
    const applicableLayerTypesUrlWebScene = [
      'building-scene',
      'feature',
      'imagery',
      'imagery-tile',
      'integrated-mesh',
      'map-image',
      'point-cloud',
      'scene',
      'tile',
    ];
    const applicableUrlTypesUrlWebScene = ['CSV'];
    urlLayers.forEach((l) => {
      if (l.layerType === 'stream') return;

      const item: ReferenceLayerSelections = {
        label: window.location.search.includes('devMode=true')
          ? `${l.label} (URL | ${l.type} | ${l.layerType})`
          : l.label,
        id: l.layerId,
        value: l.url,
        layerType: l.layerType,
        urlType: l.type,
        type: 'url',
        onWebMap: 0,
        onWebScene: 0,
      };

      if (
        applicableUrlTypesUrlWebMap.includes(l.type) ||
        (l.type === 'ArcGIS' &&
          applicableLayerTypesUrlWebMap.includes(l.layerType))
      ) {
        item.onWebMap = 1;
        webMapRefLayers.push(item);
      }

      if (
        applicableUrlTypesUrlWebScene.includes(l.type) ||
        (l.type === 'ArcGIS' &&
          applicableLayerTypesUrlWebScene.includes(l.layerType))
      ) {
        item.onWebScene = 1;
        webSceneRefLayers.push(item);
      }
    });

    // add in file reference layers
    referenceLayers.forEach((l) => {
      const item: ReferenceLayerSelections = {
        label: window.location.search.includes('devMode=true')
          ? `${l.title} (${l.rawLayer.layerDefinition.type} | File)`
          : l.title,
        id: l.layerId,
        value: l.layerId,
        layer: l,
        type: 'file',
        onWebMap: 1,
        onWebScene: 1,
      };
      webMapRefLayers.push(item);
      webSceneRefLayers.push(item);
    });

    webMapRefLayers.sort((a, b) => a.label.localeCompare(b.label));
    webSceneRefLayers.sort((a, b) => a.label.localeCompare(b.label));

    setWebMapRefOptions(webMapRefLayers);
    setWebSceneRefOptions(webSceneRefLayers);
  }, [portalLayers, referenceLayers, urlLayers]);

  const [initializedRefSelections, setInitializedRefSelections] =
    useState(false);
  useEffect(() => {
    if (!map || initializedRefSelections) return;
    if (webMapRefOptions.length === 0 && webSceneRefOptions.length === 0)
      return;

    const webMapReferenceLayerSelections: ReferenceLayerSelections[] = [];
    const webSceneReferenceLayerSelections: ReferenceLayerSelections[] = [];
    if (
      selectedScenario &&
      selectedScenario.referenceLayersTable.referenceLayers.length > 0
    ) {
      selectedScenario.referenceLayersTable.referenceLayers.forEach((l) => {
        const wmOption = webMapRefOptions.find((o) => o.id === l.layerId);
        const wsOption = webSceneRefOptions.find((o) => o.id === l.layerId);

        if (wmOption && l.onWebMap)
          webMapReferenceLayerSelections.push(wmOption);
        if (wsOption && l.onWebScene)
          webSceneReferenceLayerSelections.push(wsOption);
      });
    } else {
      const findLayer = (layer: any, refLayers: ReferenceLayerSelections[]) => {
        return refLayers.find(
          (o) => o.id === layer.id || o.id === layer?.portalItem?.id,
        );
      };
      map.layers.forEach((l) => {
        if (!l.visible) return;

        const wmOption = findLayer(l, webMapRefOptions);
        const wsOption = findLayer(l, webSceneRefOptions);

        if (wmOption) webMapReferenceLayerSelections.push(wmOption);
        if (wsOption) webSceneReferenceLayerSelections.push(wsOption);
      });
    }

    setWebMapReferenceLayerSelections(webMapReferenceLayerSelections);
    setWebSceneReferenceLayerSelections(webSceneReferenceLayerSelections);
    setInitializedRefSelections(true);
  }, [
    initializedRefSelections,
    map,
    selectedScenario,
    setWebMapReferenceLayerSelections,
    setWebSceneReferenceLayerSelections,
    webMapRefOptions,
    webSceneRefOptions,
  ]);

  return (
    <div css={panelContainer}>
      <div>
        <EditAttributePopup
          isOpen={editAttributesOpen}
          attributes={[
            ...defaultPlanAttributes,
            ...(selectedScenario ? selectedScenario.customAttributes : []),
          ]}
          selectedIndex={attributesIndex}
          onSave={() => setEditAttributesOpen(false)}
          onClose={() => setEditAttributesOpen(false)}
        />
        <div css={sectionContainer}>
          <h2>Configure Output</h2>
          {!signedIn && notLoggedInMessage}
          <div>
            <p>
              Use this tab to configure what TOTS output is published to your
              ArcGIS Online account. Select one or more of the options below.
            </p>
          </div>

          <p css={layerInfo}>
            <strong>Plan Name: </strong>
            {selectedScenario?.scenarioName}
          </p>
          <p css={layerInfo}>
            <strong>Plan Description: </strong>
            <ShowLessMore
              text={selectedScenario?.scenarioDescription}
              charLimit={20}
            />
          </p>
        </div>
        <AccordionList>
          <AccordionItem
            isOpenParam={isPartialOpen}
            onChange={(isOpen) => {
              setIsPartialOpen(!isPartialOpen);
              if (!isOpen) return;

              setIncludePartialPlan(true);
            }}
            title={
              <label css={labelStyles}>
                <strong>
                  Include TOTS Sampling Plan (and optional custom attributes)
                </strong>
                <div css={switchStyles} onClick={(ev) => ev.stopPropagation()}>
                  <Switch
                    checked={includePartialPlan}
                    onChange={() => {
                      setIncludePartialPlan(!includePartialPlan);
                      setIsPartialOpen(!includePartialPlan);
                    }}
                    ariaLabel="Include TOTS Sampling Plan"
                  />
                </div>
              </label>
            }
          >
            <div css={sectionContainer}>
              <p>
                A subset of TOTS output will be published by default. Click Add
                User-Defined Attributes to optionally add additional attributes
                to use with field data collection apps.
              </p>
            </div>
            <div css={nestedAccordionStyles}>
              <AccordionList>
                <AccordionItem
                  isOpenParam={isIncludeWebMapOpen}
                  onChange={(isOpen) => {
                    setIsIncludeWebMapOpen(!isIncludeWebMapOpen);
                    if (!isOpen) return;

                    setIncludePartialPlanWebMap(true);
                  }}
                  title={
                    <label css={subLabelStyles}>
                      <span>
                        Include Web Map
                        {webMapIcon('partial-web-map-icon')}
                      </span>
                      <div
                        css={switchStyles}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Switch
                          checked={includePartialPlanWebMap}
                          onChange={() => {
                            setIsIncludeWebMapOpen(!includePartialPlanWebMap);
                            setIncludePartialPlanWebMap(
                              !includePartialPlanWebMap,
                            );
                          }}
                          ariaLabel="Include Web Map"
                        />
                      </div>
                    </label>
                  }
                >
                  <div>
                    <label htmlFor="webmap-reference-layers-select">
                      Reference Layers to Include with web map
                    </label>
                    <Select
                      inputId="webmap-reference-layers-select"
                      isMulti={true}
                      isSearchable={false}
                      options={webMapRefOptions}
                      value={webMapReferenceLayerSelections}
                      onChange={(ev) =>
                        setWebMapReferenceLayerSelections(ev as any)
                      }
                      css={multiSelectStyles}
                    />
                  </div>
                </AccordionItem>
                <AccordionItem
                  isOpenParam={isIncludeWebMapSceneOpen}
                  onChange={(isOpen) => {
                    setIsIncludeWebSceneOpen(!isIncludeWebMapSceneOpen);
                    if (!isOpen) return;

                    setIncludePartialPlanWebScene(true);
                  }}
                  title={
                    <label css={subLabelStyles}>
                      <span>
                        Include Web Scene
                        {webSceneIcon('partial-web-scene-icon')}
                      </span>
                      <div
                        css={switchStyles}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <Switch
                          checked={includePartialPlanWebScene}
                          onChange={() => {
                            setIsIncludeWebSceneOpen(
                              !includePartialPlanWebScene,
                            );
                            setIncludePartialPlanWebScene(
                              !includePartialPlanWebScene,
                            );
                          }}
                          ariaLabel="Include Web Scene"
                        />
                      </div>
                    </label>
                  }
                >
                  <div>
                    <label htmlFor="webscene-reference-layers-select">
                      Reference Layers to Include with web scene
                    </label>
                    <Select
                      inputId="webscene-reference-layers-select"
                      isMulti={true}
                      isSearchable={false}
                      options={webSceneRefOptions}
                      value={webSceneReferenceLayerSelections}
                      onChange={(ev) =>
                        setWebSceneReferenceLayerSelections(ev as any)
                      }
                      css={multiSelectStyles}
                    />
                  </div>
                </AccordionItem>
                <AccordionItem title="Add User-Defined Attributes">
                  <div css={tableContainer}>
                    <p>
                      Default attributes are shown. Click
                      <strong> Add New Attribute</strong> to add user-defined
                      attributes. A new window will open to assist you with
                      defining the attribute. Click the <strong>Edit</strong> or{' '}
                      <strong>Delete</strong> icons to modify attributes
                      previously added.
                    </p>
                    <button
                      disabled={!selectedScenario}
                      onClick={() => {
                        setAttributesIndex(-1);
                        setEditAttributesOpen(true);
                      }}
                    >
                      Add New Attribute
                    </button>
                    <br />
                    <label htmlFor="">
                      <strong>Attributes to Include:</strong>
                    </label>
                    <ReactTable
                      id="tots-survey123-attributes-table"
                      data={[
                        ...defaultPlanAttributes,
                        ...(selectedScenario
                          ? selectedScenario.customAttributes
                          : []),
                      ]}
                      idColumn={'ID'}
                      striped={true}
                      initialSelectedRowIds={{ ids: [] }}
                      allowHighlight={false}
                      sortBy={[{ id: 'ID', desc: false }]}
                      getColumns={(tableWidth: any) => {
                        return [
                          {
                            Header: 'ID',
                            accessor: 'ID',
                            width: 0,
                            show: false,
                          },
                          {
                            Header: 'Field',
                            accessor: 'label',
                            width: 128,
                          },
                          {
                            Header: 'Type',
                            accessor: 'dataType',
                            width: 50,
                          },
                          {
                            Header: () => null,
                            id: 'edit-column',
                            renderCell: true,
                            width: 34,
                            Cell: ({ row }: { row: any }) => {
                              if (row.index <= 10) return <span></span>;

                              return (
                                <div css={editColumnContainerStyles}>
                                  <button
                                    css={editButtonStyles}
                                    disabled={!selectedScenario}
                                    onClick={(event) => {
                                      setAttributesIndex(row.index);
                                      setEditAttributesOpen(true);
                                    }}
                                  >
                                    <i className="fas fa-edit" />
                                  </button>
                                  <button
                                    css={editButtonStyles}
                                    disabled={!selectedScenario}
                                    onClick={(event) => {
                                      if (!selectedScenario) return;

                                      const index = edits.edits.findIndex(
                                        (item) =>
                                          item.type === 'scenario' &&
                                          item.layerId ===
                                            selectedScenario.layerId,
                                      );
                                      setEdits((edits) => {
                                        const editedScenario = edits.edits[
                                          index
                                        ] as ScenarioEditsType;

                                        editedScenario.customAttributes =
                                          editedScenario.customAttributes.filter(
                                            (x) =>
                                              x.id !== row.original.id ||
                                              x.name !== row.original.name ||
                                              x.label !== row.original.label,
                                          );

                                        return {
                                          count: edits.count + 1,
                                          edits: [
                                            ...edits.edits.slice(0, index),
                                            editedScenario,
                                            ...edits.edits.slice(index + 1),
                                          ],
                                        };
                                      });
                                    }}
                                  >
                                    <i className="fas fa-trash-alt" />
                                  </button>
                                </div>
                              );
                            },
                          },
                        ];
                      }}
                    />
                  </div>
                </AccordionItem>
              </AccordionList>
            </div>
          </AccordionItem>
          <AccordionItem
            isOpenParam={isSampleTypesOpen}
            onChange={(isOpen) => {
              setIsSampleTypesOpen(!isSampleTypesOpen);
              if (!isOpen) return;

              setIncludeCustomSampleTypes(true);
            }}
            title={
              <label css={labelStyles}>
                <strong>Include Custom Sample Types</strong>
                <div css={switchStyles} onClick={(ev) => ev.stopPropagation()}>
                  <Switch
                    checked={includeCustomSampleTypes}
                    onChange={() => {
                      setIsSampleTypesOpen(!includeCustomSampleTypes);
                      setIncludeCustomSampleTypes(!includeCustomSampleTypes);
                    }}
                    ariaLabel="Include Custom Sample Types"
                  />
                </div>
              </label>
            }
          >
            <div css={sectionContainer}>
              <p>
                Publish custom sample types to ArcGIS Online. Select one or more
                custom sample types from the drop-down list and specify whether
                to publish output to a new or existing feature service. If
                appending output to an existing feature service, select the
                feature service from the drop-down list.
              </p>
              <div>
                <label htmlFor="publish-sample-select">
                  Sample Types to Publish
                </label>
                <Select
                  inputId="publish-sample-select"
                  isMulti={true}
                  isSearchable={false}
                  options={sampleTypeOptions}
                  value={sampleTypeSelections}
                  onChange={(ev) => setSampleTypeSelections(ev as any)}
                  css={multiSelectStyles}
                />
              </div>

              <div>
                <input
                  id="publish-sample-types-existing"
                  type="radio"
                  name="mode"
                  value="Publish to Existing Service"
                  checked={publishSamplesMode === 'new'}
                  onChange={(ev) => {
                    setPublishSamplesMode('new');
                  }}
                />
                <label
                  htmlFor="publish-sample-types-existing"
                  css={radioLabelStyles}
                >
                  Publish to new Feature Service
                </label>
              </div>
              <div>
                <input
                  id="publish-sample-types-new"
                  type="radio"
                  name="mode"
                  value="Publish to New Service"
                  checked={publishSamplesMode === 'existing'}
                  onChange={(ev) => {
                    setPublishSamplesMode('existing');
                  }}
                />
                <label
                  htmlFor="publish-sample-types-new"
                  css={radioLabelStyles}
                >
                  Publish to existing Feature Service
                </label>
              </div>

              <EditCustomSampleTypesTable />
            </div>
          </AccordionItem>
        </AccordionList>
      </div>

      <div css={sectionContainer}>
        <p css={nextInstructionStyles}>
          Click <strong>Next</strong> to continue.
        </p>

        <NavigationButton goToPanel="publish" />
      </div>
    </div>
  );
}

// --- styles (GettingStarted) ---

const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 100;
    background-color: ${colors.black(0.75)};
  }
`;

const dialogStyles = css`
  color: ${colors.black()};
  background-color: ${colors.white()};
  max-height: 80vh;
  overflow: auto;

  &[data-reach-dialog-content] {
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 26rem;
  }

  p,
  li {
    font-size: 0.875rem;
    line-height: 1.375;
  }
`;

const headingStyles = css`
  font-size: 117.6471%;
  text-align: center;
`;

const layerSelectStyles = css`
  margin-bottom: 10px;
`;

const saveAttributesButtonStyles = css`
  background-color: #0071bc;
  border: 0;
  color: #fff;
  font-weight: bold;
  line-height: 1;
  margin: 0 0.5em 1.5em 0;
  padding: 0.5882em 1.1765em;
  font-size: 16px;
`;

const rangeContainerStyles = css`
  display: flex;
  justify-content: space-between;
`;

const codedContainerStyles = css`
  margin-bottom: 10px;
`;

// This is a workaround for an issue where react-select does not
// allow the required attribute to be passed in.
const hiddenInput = css`
  opacity: 0;
  width: 100%;
  height: 0;
  position: absolute;
  margin-top: -15px;
`;

// --- components (GettingStarted) ---
type Props = {
  isOpen: boolean;
  attributes: AttributesType[];
  onClose: Function;
  onSave: Function;
  selectedIndex: number;
};

function EditAttributePopup({
  isOpen,
  attributes,
  onClose,
  onSave,
  selectedIndex,
}: Props) {
  type DataType = {
    value: string;
    label: string;
  };
  const { edits, setEdits, selectedScenario } = useContext(SketchContext);

  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [dataType, setDataType] = useState<DataType | null>(null);
  const [length, setLength] = useState(256);
  const [domainType, setDomainType] = useState<DataType | null>(null);
  const [domainTypeOptions, setDomainTypeOptions] = useState<DataType[]>([]);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const [codes, setCodes] = useState<CodedValue[]>([
    { id: -1, label: '', value: '' },
  ]);

  useEffect(() => {
    if (selectedIndex === -1 || attributes.length <= selectedIndex) {
      setName('');
      setLabel('');
      setDataType(null);
      setLength(256);
      setDomainType(null);
      setMin(0);
      setMax(0);
      setCodes([{ id: -1, label: '', value: '' }]);
      return;
    }

    const thisAttributes = attributes[selectedIndex];

    setName(thisAttributes.name);
    setLabel(thisAttributes.label);
    setDataType({
      label: thisAttributes.dataType,
      value: thisAttributes.dataType.toLowerCase(),
    });
    setLength(thisAttributes.length || 0);

    if (thisAttributes.domain) {
      if (thisAttributes.domain.type === 'coded') {
        setDomainType({ label: 'Coded Values', value: 'coded' });
        setMin(0);
        setMax(0);

        if (thisAttributes.domain?.codedValues) {
          setCodes(thisAttributes.domain.codedValues);
        }
      }
      if (thisAttributes.domain.type === 'range') {
        setDomainType({ label: 'Range', value: 'range' });
        setMin(thisAttributes.domain.range?.min || 0);
        setMax(thisAttributes.domain.range?.max || 0);
      }
    } else {
      setDomainType(null);
      setMin(0);
      setMax(0);
      setCodes([{ id: -1, label: '', value: '' }]);
    }
  }, [attributes, selectedIndex]);

  const onDataChange = (rowIndex: any, columnId: any, value: any) => {
    // We also turn on the flag to not reset the page
    // setSkipPageReset(true);
    setCodes((old) => {
      let newTable = old.map((row: any, index) => {
        // update the row if it is the row in focus and the data has changed
        if (index === rowIndex && row[columnId] !== value) {
          return {
            ...old[rowIndex],
            id: index + 1,
            [columnId]: value,
          };
        }
        return row;
      });

      // determine if there is already a row with an id of -1
      const hasNeg1 = newTable.findIndex((row) => row.id === -1) > -1;

      // add a new blank row if there isn't one already
      if (value && !hasNeg1) newTable.push({ id: -1, label: '', value: '' });
      else {
        // remove any extra blank rows
        newTable = newTable.filter(
          (row) => row.id === -1 || (row.id > -1 && (row.label || row.value)),
        );
      }

      return newTable;
    });
  };

  useEffect(() => {
    if (!dataType) {
      setDomainTypeOptions([]);
      return;
    }

    let newOptions: DataType[] = [];
    if (dataType.value === 'double' || dataType.value === 'integer') {
      newOptions.push(
        ...[
          { label: 'None', value: 'none' },
          { label: 'Coded Values', value: 'coded' },
          { label: 'Range', value: 'range' },
        ],
      );
    }
    if (dataType.value === 'string') {
      newOptions.push(
        ...[
          { label: 'None', value: 'none' },
          { label: 'Coded Values', value: 'coded' },
        ],
      );
    }

    setDomainTypeOptions(newOptions);
  }, [dataType]);

  return (
    <DialogOverlay
      css={overlayStyles}
      isOpen={isOpen}
      data-testid="tots-getting-started"
    >
      <DialogContent css={dialogStyles} aria-label="Edit Attribute">
        <form
          onSubmit={() => {
            if (!dataType || !selectedScenario) return;

            let domain: null | Domain = null;
            if (
              domainType &&
              (dataType.value === 'double' ||
                dataType.value === 'integer' ||
                dataType.value === 'string')
            ) {
              if (domainType.value === 'range') {
                domain = {
                  type: 'range',
                  range: {
                    min,
                    max,
                  },
                  codedValues: null,
                };
              } else if (domainType.value === 'coded') {
                domain = {
                  type: 'coded',
                  range: null,
                  codedValues: codes,
                };
              } else {
                domain = {
                  type: 'none',
                  range: null,
                  codedValues: null,
                };
              }
            }

            const id =
              selectedIndex === -1 ? currentAttributeId : selectedIndex;
            if (selectedIndex === -1) currentAttributeId += 1;

            const newAttribute: AttributesType = {
              id,
              name,
              label,
              dataType: dataType.value as any,
              length: dataType.value === 'string' ? length : null,
              domain,
            };

            const index = edits.edits.findIndex(
              (item) =>
                item.type === 'scenario' &&
                item.layerId === selectedScenario.layerId,
            );
            setEdits((edits) => {
              const editedScenario = edits.edits[index] as ScenarioEditsType;

              let newAttributes = editedScenario.customAttributes.map(
                (attribute, index) => {
                  if (index === selectedIndex) {
                    return newAttribute;
                  }
                  return attribute;
                },
              );

              if (selectedIndex === -1) {
                newAttributes.push(newAttribute);
              }

              editedScenario.customAttributes = newAttributes;

              return {
                count: edits.count + 1,
                edits: [
                  ...edits.edits.slice(0, index),
                  editedScenario,
                  ...edits.edits.slice(index + 1),
                ],
              };
            });

            onSave();
          }}
        >
          <h1 css={headingStyles}>Edit Attribute</h1>
          <p>
            Create or Edit an attribute that will make up the structure for
            storing data in ArcGIS Online. The settings below will also drive
            what UI options are available when creating surveys in Esri Field
            Maps, such as text input, numeric input, drop down, etc.
          </p>

          <div>
            <label htmlFor="attribute-name-input">Enter Field Name:</label>
            <InfoIcon
              id="field-name-input-icon"
              cssStyles={infoIconStyles}
              tooltip="Field names should not contain special characters, such as spaces, hyphens, parentheses, brackets, or characters such as $, %, and #."
              place="right"
              type="info"
            />
            <input
              id="attribute-name-input"
              type="text"
              pattern="[a-zA-Z0-9_]+"
              css={inputStyles}
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
            />

            <label htmlFor="attribute-label-input">Enter Display Name:</label>
            <InfoIcon
              id="display-name-input-icon"
              cssStyles={infoIconStyles}
              tooltip="An alternative name or alias for a field that is more descriptive and user-friendly than the name."
              place="right"
              type="info"
            />
            <input
              id="attribute-label-input"
              type="text"
              css={inputStyles}
              value={label}
              onChange={(ev) => setLabel(ev.target.value)}
              required
            />
          </div>

          <label htmlFor="data-type-select-input">Choose Data Type:</label>
          <Select
            id="data-type-select"
            inputId="data-type-select-input"
            css={layerSelectStyles}
            value={dataType}
            onChange={(ev) => setDataType(ev as DataType)}
            options={[
              { label: 'Date', value: 'date' },
              { label: 'Double', value: 'double' },
              { label: 'Integer', value: 'integer' },
              { label: 'String', value: 'string' },
            ]}
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
            menuPortalTarget={document.body}
            menuPosition={'fixed'}
            menuPlacement={'bottom'}
          />
          {/* This is a workaround for an issue where react-select does not
            allow the required attribute to be passed in. */}
          <input
            css={hiddenInput}
            aria-hidden="true"
            value={dataType?.label}
            required
          />

          {dataType && dataType.value === 'string' && (
            <div>
              <label htmlFor="length-input">Length:</label>
              <input
                id="length-input"
                type="number"
                min="1"
                css={inputStyles}
                value={length}
                onChange={(ev) => setLength(Number(ev.target.value))}
              />
            </div>
          )}

          {dataType && dataType.value !== 'date' && (
            <div>
              <label htmlFor="domain-type-select-input">
                Field Input Limitations:
              </label>
              <InfoIcon
                id="domain-type-input-icon"
                cssStyles={infoIconStyles}
                tooltip="Used for limiting the values users can input into this field. This can either be a predefined list of values (Coded Values) or a numerical range (Range). The Coded Values option allows for drop-down, radio button, and switch options when creating surveys in Esri Field Maps."
                place="right"
                type="info"
              />
              <Select
                id="domain-type-select"
                inputId="domain-type-select-input"
                css={layerSelectStyles}
                value={domainType}
                onChange={(ev) => setDomainType(ev as DataType)}
                options={domainTypeOptions}
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                menuPortalTarget={document.body}
                menuPosition={'fixed'}
                menuPlacement={'bottom'}
              />

              {domainType?.value === 'range' && (
                <div css={rangeContainerStyles}>
                  <div>
                    <label htmlFor="min-input">Min:</label>
                    <input
                      id="min-input"
                      type="text"
                      pattern="[0-9]*"
                      css={inputStyles}
                      value={min}
                      onChange={(ev) => setMin(Number(ev.target.value))}
                    />
                  </div>
                  <div>
                    <label htmlFor="max-input">Max:</label>
                    <input
                      id="max-input"
                      type="text"
                      pattern="[0-9]*"
                      css={inputStyles}
                      value={max}
                      onChange={(ev) => setMax(Number(ev.target.value))}
                    />
                  </div>
                </div>
              )}

              {domainType?.value === 'coded' && (
                <div css={codedContainerStyles}>
                  <label>Coded Values:</label>
                  <ReactTableEditable
                    id="tots-survey123-attributes-table"
                    data={codes}
                    idColumn={'ID'}
                    striped={true}
                    hideHeader={false}
                    onDataChange={onDataChange}
                    getColumns={(tableWidth: any) => {
                      return [
                        {
                          Header: 'ID',
                          accessor: 'ID',
                          width: 0,
                          show: false,
                        },
                        {
                          Header: 'Label',
                          accessor: 'label',
                          width: 181,
                        },
                        {
                          Header: 'Value',
                          accessor: 'value',
                          width: 181,
                        },
                      ];
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <button css={saveAttributesButtonStyles} type="submit">
            Save
          </button>
          <button
            css={saveAttributesButtonStyles}
            onClick={() => {
              onClose();
            }}
          >
            Close
          </button>

          <p>
            View documentation on{' '}
            <a
              href="https://doc.arcgis.com/en/field-maps/android/help/configure-the-form.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              working with fields
            </a>
            .{' '}
            <a
              className="exit-disclaimer"
              href="https://www.epa.gov/home/exit-epa"
              target="_blank"
              rel="noopener noreferrer"
            >
              EXIT
            </a>
          </p>
        </form>
      </DialogContent>
    </DialogOverlay>
  );
}

export default ConfigureOutput;
