/** @jsxImportSource @emotion/react */

import React from 'react';
import { css } from '@emotion/react';
import { DialogOverlay, DialogContent } from '@reach/dialog';
// components
import { AccordionList, AccordionItem } from 'components/Accordion';
import { EditCustomSampleTypesTable } from 'components/EditLayerMetaData';
import NavigationButton from 'components/NavigationButton';
import { ReactTable, ReactTableEditable } from 'components/ReactTable';
import Select from 'components/Select';
import ShowLessMore from 'components/ShowLessMore';
import Switch from 'components/Switch';
// contexts
import { PublishContext } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// types
import { ErrorType } from 'types/Misc';
import {
  AttributesType,
  CodedValue,
  Domain,
  SampleTypeOptions,
} from 'types/Publish';
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

const checkboxStyles = css`
  margin-right: 5px;
`;

// --- components (ConfigureOutput) ---
function ConfigureOutput() {
  const {
    publishSamplesMode,
    setPublishSamplesMode,
    sampleTypeSelections,
    setSampleTypeSelections,
    includeFullPlan,
    setIncludeFullPlan,
    includeFullPlanWebMap,
    setIncludeFullPlanWebMap,
    includePartialPlan,
    setIncludePartialPlan,
    includePartialPlanWebMap,
    setIncludePartialPlanWebMap,
    includeCustomSampleTypes,
    setIncludeCustomSampleTypes,
    partialPlanAttributes,
    setPartialPlanAttributes,
  } = React.useContext(PublishContext);
  const { selectedScenario, userDefinedAttributes } = React.useContext(
    SketchContext,
  );

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

  const [editAttributesOpen, setEditAttributesOpen] = React.useState(false);
  const [attributesIndex, setAttributesIndex] = React.useState(-1);
  const [isFullOpen, setIsFullOpen] = React.useState(includeFullPlan);
  const [isPartialOpen, setIsPartialOpen] = React.useState(includePartialPlan);
  const [isSampleTypesOpen, setIsSampleTypesOpen] = React.useState(includeCustomSampleTypes);

  return (
    <div css={panelContainer}>
      <EditAttributePopup
        isOpen={editAttributesOpen}
        attributes={partialPlanAttributes}
        setAttributes={setPartialPlanAttributes}
        selectedIndex={attributesIndex}
        onSave={() => setEditAttributesOpen(false)}
        onClose={() => setEditAttributesOpen(false)}
      />
      <div css={sectionContainer}>
        <h2>Configure Output</h2>
        <div>
          <p>
            Use this tab to configure what TOTS output is published to your
            ArcGIS Online account. Three options are available:
          </p>
          <ol>
            <li>
              Choose Include Full Plan to publish a complete set of output that
              can be imported back into TOTS in the future.
            </li>
            <li>
              Choose Include Partial Plan to publish user-defined attributes
              along with a subset of TOTS attributes to use with field data
              collection apps.
            </li>
            <li>
              Choose Include Custom Sample Types to publish and share custom
              sample types for future use in TOTS.
            </li>
          </ol>
          <p>
            Click <strong>Next</strong> to publish the selected TOTS output.
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
          isOpenParam={isFullOpen}
          onChange={(isOpen) => {
            setIsFullOpen(!isFullOpen);
            if (!isOpen) return;

            setIncludeFullPlan(true);
          }}
          title={
            <label css={labelStyles}>
              <strong>Include TOTS Full Reference File</strong>
              <div css={switchStyles} onClick={(ev) => ev.stopPropagation()}>
                <Switch
                  checked={includeFullPlan}
                  onChange={() => {
                    setIncludeFullPlan(!includeFullPlan);
                    setIsFullOpen(!includeFullPlan);
                  }}
                  ariaLabel="Include TOTS Full Reference File"
                />
              </div>
            </label>
          }
        >
          <div css={sectionContainer}>
            <p>This allows pulling back into TOTS for later modification.</p>
            <div>
              <input
                id="include-web-map-toggle"
                type="checkbox"
                css={checkboxStyles}
                checked={includeFullPlanWebMap}
                onChange={(ev) =>
                  setIncludeFullPlanWebMap(!includeFullPlanWebMap)
                }
              />
              <label htmlFor="include-web-map-toggle">
                Include web map in output
              </label>
            </div>
          </div>
        </AccordionItem>
        <AccordionItem
          isOpenParam={isPartialOpen}
          onChange={(isOpen) => {
            setIsPartialOpen(!isPartialOpen);
            if (!isOpen) return;

            setIncludePartialPlan(true);
          }}
          title={
            <label css={labelStyles}>
              <strong>Include TOTS Partial Reference File</strong>
              <div css={switchStyles} onClick={(ev) => ev.stopPropagation()}>
                <Switch
                  checked={includePartialPlan}
                  onChange={() => {
                    setIncludePartialPlan(!includePartialPlan);
                    setIsPartialOpen(!includePartialPlan);
                  }}
                  ariaLabel="Include TOTS Partial Reference File"
                />
              </div>
            </label>
          }
        >
          <div css={sectionContainer}>
            <p>
              Define user-defined attributes to use with field data collection
              apps. A subset of TOTS output will be published by default as
              shown below. Click the <strong>Add New Attribute</strong> button
              to add an additional attribute. A new window will open to assist
              you with defining the attribute. Click the <strong>Edit</strong>{' '}
              or <strong>Delete</strong> icons to modify attributes previously
              added.
            </p>
          </div>
          <div css={sectionContainer}>
            <input
              id="include-partial-web-map-toggle"
              type="checkbox"
              css={checkboxStyles}
              checked={includePartialPlanWebMap}
              onChange={(ev) =>
                setIncludePartialPlanWebMap(!includePartialPlanWebMap)
              }
            />
            <label htmlFor="include-partial-web-map-toggle">
              Include web map in output
            </label>
          </div>
          <div css={tableContainer}>
            <button
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
              data={partialPlanAttributes}
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
                            onClick={(event) => {
                              setAttributesIndex(row.index);
                              setEditAttributesOpen(true);
                            }}
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            css={editButtonStyles}
                            onClick={(event) => {
                              setPartialPlanAttributes((attr) => {
                                return attr.filter(
                                  (x) =>
                                    x.id !== row.original.id ||
                                    x.name !== row.original.name ||
                                    x.label !== row.original.label,
                                );
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
                  ariaLabel="Watershed Health Scores"
                />
              </div>
            </label>
          }
        >
          <div css={sectionContainer}>
            <p>
              Publish user defined sample types to ArcGIS Online. Select the
              user defined sample types you would like to publish. Then select
              whether you would like to publish to a new or existing feature
              service.
            </p>
            <div>
              <label htmlFor="publish-sample-select">
                Sample Types to Publish
              </label>
              <Select
                inputId="publish-sample-select"
                isMulti={true as any}
                isSearchable={false}
                options={sampleTypeOptions as any}
                value={sampleTypeSelections as any}
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
              <label htmlFor="publish-sample-types-new" css={radioLabelStyles}>
                Publish to existing Feature Service
              </label>
            </div>

            <EditCustomSampleTypesTable />
          </div>
        </AccordionItem>
      </AccordionList>

      <div css={sectionContainer}>
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

// --- components (GettingStarted) ---
type Props = {
  isOpen: boolean;
  attributes: AttributesType[];
  setAttributes: React.Dispatch<React.SetStateAction<AttributesType[]>>;
  onClose: Function;
  onSave: Function;
  selectedIndex: number;
};

function EditAttributePopup({
  isOpen,
  attributes,
  setAttributes,
  onClose,
  onSave,
  selectedIndex,
}: Props) {
  type DataType = {
    value: string;
    label: string;
  };

  const [name, setName] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [dataType, setDataType] = React.useState<DataType | null>(null);
  const [length, setLength] = React.useState(256);
  const [domainType, setDomainType] = React.useState<DataType | null>(null);
  const [domainTypeOptions, setDomainTypeOptions] = React.useState<DataType[]>(
    [],
  );
  const [min, setMin] = React.useState(0);
  const [max, setMax] = React.useState(0);
  const [codes, setCodes] = React.useState<CodedValue[]>([
    { id: -1, label: '', value: '' },
  ]);

  React.useEffect(() => {
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

  React.useEffect(() => {
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
        <h1 css={headingStyles}>Edit Attribute</h1>

        <div>
          <label htmlFor="attribute-name-input">Name:</label>
          <input
            id="attribute-name-input"
            type="text"
            css={inputStyles}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />

          <label htmlFor="attribute-label-input">Label:</label>
          <input
            id="attribute-label-input"
            type="text"
            css={inputStyles}
            value={label}
            onChange={(ev) => setLabel(ev.target.value)}
          />
        </div>

        <label htmlFor="data-type-select-input">Data Type:</label>
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

        {dataType && dataType.value === 'string' && (
          <div>
            <label htmlFor="length-input">Length:</label>
            <input
              id="length-input"
              type="text"
              pattern="[0-9]*"
              css={inputStyles}
              value={length}
              onChange={(ev) => setLength(Number(ev.target.value))}
            />
          </div>
        )}

        {dataType && dataType.value !== 'date' && (
          <div>
            <label htmlFor="domain-type-select-input">Domain Type:</label>
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
                <label>Domain Values:</label>
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

        <button
          css={saveAttributesButtonStyles}
          onClick={() => {
            if (!dataType) return;

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

            setAttributes((attributes) => {
              let newAttributes = attributes.map((attribute, index) => {
                if (index === selectedIndex) {
                  return newAttribute;
                }
                return attribute;
              });

              if (selectedIndex === -1) {
                newAttributes.push(newAttribute);
              }

              return newAttributes;
            });

            onSave();
          }}
        >
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
      </DialogContent>
    </DialogOverlay>
  );
}

export default ConfigureOutput;
