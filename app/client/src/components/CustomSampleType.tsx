/** @jsxImportSource @emotion/react */

import React, { Fragment, JSX, useContext, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import Collection from '@arcgis/core/core/Collection';
// components
import ColorPicker from 'components/ColorPicker';
import Select from 'components/Select';
// contexts
import { DialogContext } from 'contexts/Dialog';
import { PublishContext } from 'contexts/Publish';
import { SketchContext } from 'contexts/Sketch';
// types
import { EditsType } from 'types/Edits';
import { AppType } from 'types/Navigation';
// config
import {
  AttributeItems,
  SampleSelectType,
  PolygonSymbol,
} from 'config/sampleAttributes';
import { userDefinedValidationMessage } from 'config/errorMessages';
// utils
import { useMemoryState } from 'utils/hooks';
import {
  createBuffer,
  generateUUID,
  getPointSymbol,
  updateLayerEdits,
} from 'utils/sketchUtils';
// styles
import { reactSelectStyles } from 'styles';

type ShapeTypeSelect = {
  value: string;
  label: string;
};

type EditType = 'create' | 'edit' | 'clone' | 'view';

const pointStyles: ShapeTypeSelect[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'cross', label: 'Cross' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'x', label: 'X' },
  {
    value:
      'path|M17.14 3 8.86 3 3 8.86 3 17.14 8.86 23 17.14 23 23 17.14 23 8.86 17.14 3z',
    label: 'Octagon',
  },
];

/**
 * Determines if the desired name has already been used. If it has
 * it appends in index to the end (i.e. '<desiredName> (2)').
 */
function getSampleTypeName(
  sampleTypes: SampleSelectType[],
  desiredName: string,
) {
  // get a list of names in use
  const usedNames: string[] = [];
  sampleTypes.forEach((sampleType) => {
    usedNames.push(sampleType.label);
  });

  // Find a name where there is not a collision.
  // Most of the time this loop will be skipped.
  let duplicateCount = 0;
  let newName = desiredName;
  while (usedNames.includes(newName)) {
    duplicateCount += 1;
    newName = `${desiredName} (${duplicateCount})`;
  }

  return newName;
}

// --- styles (CustomSampleType) ---
const addButtonStyles = css`
  margin: 0;
  height: 38px; /* same height as ReactSelect */
`;

const fullWidthSelectStyles = css`
  width: 100%;
  margin-right: 10px;
  margin-bottom: 10px;
`;

const iconButtonContainerStyles = css`
  display: flex;
  justify-content: space-between;
`;

const iconButtonStyles = css`
  width: 25px;
  margin: 0 2px;
  padding: 0.25em 0;
  color: black;
  background-color: white;
  border-radius: 0;
  line-height: 16px;
  text-decoration-line: none;
  font-weight: bold;

  &:hover {
    background-color: white;
  }
`;

const inlineMenuStyles = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const inputStyles = css`
  width: 100%;
  height: 36px;
  margin: 0 0 10px 0;
  padding-left: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

// --- components (CustomSampleType) ---
type CustomSampleTypeProps = {
  appType: AppType;
  id: string;
};

function CustomSampleType({ appType, id }: CustomSampleTypeProps) {
  const { setOptions } = useContext(DialogContext);
  const { setSampleTypeSelections } = useContext(PublishContext);
  const {
    defaultSymbols,
    setDefaultSymbolSingle,
    edits,
    setEdits,
    layers,
    sampleAttributes,
    userDefinedOptions,
    setUserDefinedOptions,
    userDefinedAttributes,
    setUserDefinedAttributes,
    allSampleOptions,
  } = useContext(SketchContext);

  const [userDefinedSampleType, setUserDefinedSampleType] =
    useMemoryState<SampleSelectType | null>(
      `${id}-userDefinedSampleType`,
      null,
    );
  const [editingStatus, setEditingStatus] = useMemoryState<EditType | null>(
    `${id}-editingStatus`,
    null,
  );
  const [sampleTypeName, setSampleTypeName] = useMemoryState<string>(
    `${id}-sampleTypeName`,
    '',
  );
  const [shapeType, setShapeType] = useMemoryState<ShapeTypeSelect | null>(
    `${id}-shapeType`,
    null,
  );
  const [pointStyle, setPointStyle] = useMemoryState<ShapeTypeSelect | null>(
    `${id}-pointStyle`,
    null,
  );
  const [ttpk, setTtpk] = useMemoryState<string | null>(`${id}-ttpk`, '');
  const [ttc, setTtc] = useMemoryState<string | null>(`${id}-ttc`, '');
  const [tta, setTta] = useMemoryState<string | null>(`${id}-tta`, '');
  const [ttps, setTtps] = useMemoryState<string | null>(`${id}-ttps`, '');
  const [lodp, setLodp] = useMemoryState<string | null>(`${id}-lodp`, '');
  const [lodnon, setLodnon] = useMemoryState<string | null>(`${id}-lodnon`, '');
  const [mcps, setMcps] = useMemoryState<string | null>(`${id}-mcps`, '');
  const [tcps, setTcps] = useMemoryState<string | null>(`${id}-tcps`, '');
  const [wvps, setWvps] = useMemoryState<string | null>(`${id}-wvps`, '');
  const [wwps, setWwps] = useMemoryState<string | null>(`${id}-wwps`, '');
  const [sa, setSa] = useMemoryState<string | null>(`${id}-sa`, '');
  const [alc, setAlc] = useMemoryState<string | null>(`${id}-alc`, '');
  const [amc, setAmc] = useMemoryState<string | null>(`${id}-amc`, '');
  const [validationMessage, setValidationMessage] = useMemoryState<
    JSX.Element[] | string
  >(`${id}-validationMessage`, '');

  // Sets all of the user defined sample type inputs based on
  // which edit type is being used.
  function setSampleTypeInputs(editType: EditType) {
    if (editType === 'create') {
      setEditingStatus(editType);
      setShapeType(null);
      setPointStyle(null);
      setTtpk('');
      setTtc('');
      setTta('');
      setTtps('');
      setLodp('');
      setLodnon('');
      setMcps('');
      setTcps('');
      setWvps('');
      setWwps('');
      setSa('');
      setAlc('');
      setAmc('');
      setSampleTypeName('');
      return;
    }

    if (!userDefinedSampleType) return;

    // get the sample type name, for a clone operation
    // add a number to the end of the name.
    const sampleTypeUuid = userDefinedSampleType.value;
    let sampleTypeName = userDefinedSampleType.label;
    const attributes = sampleAttributes[sampleTypeUuid as any];
    if (editType === 'clone') {
      sampleTypeName = getSampleTypeName(allSampleOptions, sampleTypeName);
    }

    const shapeType =
      attributes.ShapeType === 'point'
        ? { value: 'point', label: 'Point' }
        : { value: 'polygon', label: 'Polygon' };

    setEditingStatus(editType);
    setShapeType(shapeType);
    setTtpk(attributes.TTPK ? attributes.TTPK.toString() : null);
    setTtc(attributes.TTC ? attributes.TTC.toString() : null);
    setTta(attributes.TTA ? attributes.TTA.toString() : null);
    setTtps(attributes.TTPS ? attributes.TTPS.toString() : null);
    setLodp(attributes.LOD_P ? attributes.LOD_P.toString() : null);
    setLodnon(attributes.LOD_NON ? attributes.LOD_NON.toString() : null);
    setMcps(attributes.MCPS ? attributes.MCPS.toString() : null);
    setTcps(attributes.TCPS ? attributes.TCPS.toString() : null);
    setWvps(attributes.WVPS ? attributes.WVPS.toString() : null);
    setWwps(attributes.WWPS ? attributes.WWPS.toString() : null);
    setSa(attributes.SA ? attributes.SA.toString() : null);
    setAlc(attributes.ALC ? attributes.ALC.toString() : null);
    setAmc(attributes.AMC ? attributes.AMC.toString() : null);
    setSampleTypeName(sampleTypeName);

    const pointStyle = pointStyles.find(
      (s) => s.value === attributes.POINT_STYLE,
    );
    setPointStyle(pointStyle || null);
  }

  // Validates the user input.
  // TODO: This logic needs to be updated to be more robust. Currently,
  //        this just makes sure that all of the fields have been filled out.
  function validateEdits() {
    let isValid = true;
    const messageParts: string[] = [];

    function isNumberValid(
      numberStr: string | null,
      valueValidation?: '' | 'greaterThan0',
    ) {
      if (numberStr === undefined || numberStr === null || numberStr === '') {
        return;
      }

      const number = Number(numberStr);
      if (isNaN(number)) return false;
      if (!valueValidation) return true;
      if (valueValidation === 'greaterThan0' && number > 0) return true;

      return false;
    }

    // validate any fields that need it
    if (!sampleTypeName) {
      isValid = false;
      messageParts.push('User Defined types must have a sample type name.');
    }
    if (
      Object.prototype.hasOwnProperty.call(sampleAttributes, sampleTypeName) &&
      (editingStatus !== 'edit' ||
        (editingStatus === 'edit' &&
          userDefinedSampleType &&
          userDefinedSampleType.value !== sampleTypeName))
    ) {
      isValid = false;
      messageParts.push(
        `The "${sampleTypeName}" name is already in use. Please rename the sample type and try again.`,
      );
    }
    if (!isNumberValid(ttpk)) {
      isValid = false;
      messageParts.push('Time to Prepare Kits needs a numeric value.');
    }
    if (!isNumberValid(ttc)) {
      isValid = false;
      messageParts.push('Time to Collect needs a numeric value.');
    }
    if (!isNumberValid(tta)) {
      isValid = false;
      messageParts.push('Time to Analyze needs a numeric value.');
    }
    if (!isNumberValid(mcps)) {
      isValid = false;
      messageParts.push('Sampling Material Cost needs a numeric value.');
    }
    if (!isNumberValid(sa, 'greaterThan0')) {
      isValid = false;
      messageParts.push(
        'Reference Surface Area needs a numeric value greater than 0.',
      );
    }
    if (!isNumberValid(alc)) {
      isValid = false;
      messageParts.push('Analysis Labor Cost needs a numeric value.');
    }
    if (!isNumberValid(amc)) {
      isValid = false;
      messageParts.push('Analysis Material Cost needs a numeric value.');
    }

    if (messageParts.length > 0) {
      const message = messageParts.map((part, index) => {
        return (
          <Fragment key={index}>
            {index !== 0 ? <br /> : ''}
            {part}
          </Fragment>
        );
      });
      setValidationMessage(message);
    }

    return isValid;
  }

  // Checks to see if the sample type name changed.
  function didSampleTypeNameChange() {
    return (
      editingStatus === 'edit' &&
      userDefinedSampleType &&
      sampleTypeName !== userDefinedSampleType.label
    );
  }

  // Updates the attributes of graphics that have had property changes
  async function updateAttributes({
    graphics,
    newAttributes,
    oldType,
    symbol = null,
  }: {
    graphics: __esri.Graphic[];
    newAttributes: any;
    oldType: string;
    symbol?: PolygonSymbol | null;
  }) {
    const editedGraphics: __esri.Graphic[] = [];
    for (const graphic of graphics) {
      // update attributes for the edited type
      if (graphic.attributes.TYPEUUID === oldType) {
        const areaChanged = graphic.attributes.SA !== newAttributes.SA;
        const shapeTypeChanged =
          graphic.attributes.ShapeType !== newAttributes.ShapeType;

        graphic.attributes.TYPE = newAttributes.TYPE;
        graphic.attributes.ShapeType = newAttributes.ShapeType;
        graphic.attributes.Width = newAttributes.Width;
        graphic.attributes.SA = newAttributes.SA;
        graphic.attributes.TTPK = newAttributes.TTPK;
        graphic.attributes.TTC = newAttributes.TTC;
        graphic.attributes.TTA = newAttributes.TTA;
        graphic.attributes.TTPS = newAttributes.TTPS;
        graphic.attributes.LOD_P = newAttributes.LOD_P;
        graphic.attributes.LOD_NON = newAttributes.LOD_NON;
        graphic.attributes.MCPS = newAttributes.MCPS;
        graphic.attributes.TCPS = newAttributes.TCPS;
        graphic.attributes.WVPS = newAttributes.WVPS;
        graphic.attributes.WWPS = newAttributes.WWPS;
        graphic.attributes.ALC = newAttributes.ALC;
        graphic.attributes.AMC = newAttributes.AMC;
        graphic.attributes.POINT_STYLE = newAttributes.POINT_STYLE;

        // redraw the graphic if the width changed or if the graphic went from a
        // polygon to a point
        if (
          newAttributes.ShapeType === 'point' &&
          (areaChanged || shapeTypeChanged)
        ) {
          // convert the geometry _esriPolygon if it is missing stuff
          await createBuffer(graphic as __esri.Graphic);
        }

        // update the point symbol if necessary
        if (graphic.geometry.type === 'point') {
          graphic.symbol = getPointSymbol(graphic, symbol);
        }

        editedGraphics.push(graphic);
      }
    }

    return editedGraphics;
  }

  // Initialize the local user defined type symbol. Also updates this variable
  // when the user changes the user defined sample type selection.
  const [udtSymbol, setUdtSymbol] = useState<PolygonSymbol>(
    defaultSymbols.symbols['Samples'],
  );
  useEffect(() => {
    if (!userDefinedSampleType) return;

    if (
      Object.prototype.hasOwnProperty.call(
        defaultSymbols.symbols,
        userDefinedSampleType.value,
      )
    ) {
      setUdtSymbol(defaultSymbols.symbols[userDefinedSampleType.value]);
    } else {
      setUdtSymbol(defaultSymbols.symbols['Samples']);
    }
  }, [defaultSymbols, userDefinedSampleType]);

  pointStyles.sort((a, b) => a.value.localeCompare(b.value));

  return (
    <Fragment>
      <p>
        Choose an existing sample type from the menu or click + to add a new
        sample type from scratch. You have the option to clone or view an
        existing sample type. Populate or edit the parameter fields and click
        Save. Once you have saved a custom sample type you can edit and/or
        delete the parameters using additional controls now available to you.
      </p>
      <div css={iconButtonContainerStyles}>
        <label htmlFor="cst-sample-type-select-input">Sample Type</label>
        <div>
          {userDefinedSampleType && (
            <Fragment>
              {!editingStatus && !userDefinedSampleType.isPredefined && (
                <button
                  css={iconButtonStyles}
                  title="Delete Sample Type"
                  onClick={() => {
                    setValidationMessage('');
                    const sampleTypeUuid = userDefinedSampleType.value;

                    setOptions({
                      title: 'Would you like to continue?',
                      ariaLabel: 'Would you like to continue?',
                      description:
                        'Sample plans are referencing samples based on one or more of the custom sample types. ' +
                        'This operation will delete any samples from the sampling plan that are associated ' +
                        'with these custom sample types that you are attempting to remove.',
                      onContinue: () => {
                        setUserDefinedOptions(
                          userDefinedOptions.filter(
                            (option) => option.value !== sampleTypeUuid,
                          ),
                        );
                        setUserDefinedAttributes((userDefined) => {
                          const newUserDefined = {
                            ...userDefined,
                          };

                          // mark to delete if this is a published sample type
                          // otherwise just remove it
                          if (
                            newUserDefined.sampleTypes[sampleTypeUuid].serviceId
                          ) {
                            newUserDefined.sampleTypes[sampleTypeUuid].status =
                              'delete';
                          } else {
                            delete newUserDefined.sampleTypes[sampleTypeUuid];
                          }

                          newUserDefined.editCount =
                            newUserDefined.editCount + 1;
                          return newUserDefined;
                        });
                        setSampleTypeSelections([]);

                        // Update the attributes of the graphics on the map on edits
                        let editsCopy: EditsType = edits;
                        layers.forEach((layer) => {
                          if (
                            !['Samples', 'VSP'].includes(layer.layerType) ||
                            layer.sketchLayer?.type !== 'graphics'
                          ) {
                            return;
                          }

                          const graphicsToRemove: __esri.Graphic[] = [];
                          layer.sketchLayer.graphics.forEach((graphic) => {
                            if (
                              graphic.attributes.TYPEUUID === sampleTypeUuid
                            ) {
                              graphicsToRemove.push(graphic);
                            }
                          });
                          layer.sketchLayer.removeMany(graphicsToRemove);

                          if (graphicsToRemove.length > 0) {
                            const collection = new Collection<__esri.Graphic>();
                            collection.addMany(graphicsToRemove);
                            editsCopy = updateLayerEdits({
                              appType,
                              edits: editsCopy,
                              layer,
                              type: 'delete',
                              changes: collection,
                            });
                          }
                        });

                        setEdits(editsCopy);

                        setUserDefinedSampleType(null);
                      },
                    });
                  }}
                >
                  <i className="fas fa-trash-alt" />
                  <span className="sr-only">Delete Sample Type</span>
                </button>
              )}
              <button
                css={iconButtonStyles}
                title={
                  editingStatus === 'clone' ? 'Cancel' : 'Clone Sample Type'
                }
                onClick={(_ev) => {
                  setValidationMessage('');
                  if (editingStatus === 'clone') {
                    setEditingStatus(null);
                    if (
                      userDefinedSampleType &&
                      Object.prototype.hasOwnProperty.call(
                        defaultSymbols.symbols,
                        userDefinedSampleType.value,
                      )
                    ) {
                      setUdtSymbol(
                        defaultSymbols.symbols[userDefinedSampleType.value],
                      );
                    } else {
                      setUdtSymbol(defaultSymbols.symbols['Samples']);
                    }
                    return;
                  }

                  setSampleTypeInputs('clone');
                }}
              >
                <i
                  className={
                    editingStatus === 'clone' ? 'fas fa-times' : 'fas fa-clone'
                  }
                />
                <span className="sr-only">
                  {editingStatus === 'clone' ? 'Cancel' : 'Clone Sample Type'}
                </span>
              </button>
              {userDefinedSampleType.isPredefined ? (
                <button
                  css={iconButtonStyles}
                  title={editingStatus === 'view' ? 'Hide' : 'View Sample Type'}
                  onClick={(_ev) => {
                    setValidationMessage('');
                    if (editingStatus === 'view') {
                      setEditingStatus(null);
                      return;
                    }

                    setSampleTypeInputs('view');
                  }}
                >
                  <i
                    className={
                      editingStatus === 'view'
                        ? 'fas fa-times'
                        : 'fas fa-file-alt'
                    }
                  />
                  <span className="sr-only">
                    {editingStatus === 'view' ? 'Hide' : 'View Sample Type'}
                  </span>
                </button>
              ) : (
                <button
                  css={iconButtonStyles}
                  title={
                    editingStatus === 'edit' ? 'Cancel' : 'Edit Sample Type'
                  }
                  onClick={(_ev) => {
                    setValidationMessage('');
                    if (editingStatus === 'edit') {
                      setEditingStatus(null);
                      return;
                    }

                    setSampleTypeInputs('edit');
                  }}
                >
                  <i
                    className={
                      editingStatus === 'edit' ? 'fas fa-times' : 'fas fa-edit'
                    }
                  />
                  <span className="sr-only">
                    {editingStatus === 'edit' ? 'Cancel' : 'Edit Sample Type'}
                  </span>
                </button>
              )}
            </Fragment>
          )}
          <button
            css={iconButtonStyles}
            title={editingStatus === 'create' ? 'Cancel' : 'Create Sample Type'}
            onClick={(_ev) => {
              setValidationMessage('');
              if (editingStatus === 'create') {
                setEditingStatus(null);
                return;
              }

              setSampleTypeInputs('create');
            }}
          >
            <i
              className={
                editingStatus === 'create' ? 'fas fa-times' : 'fas fa-plus'
              }
            />
            <span className="sr-only">
              {editingStatus === 'create' ? 'Cancel' : 'Create Sample Type'}
            </span>
          </button>
        </div>
      </div>
      <Select
        id="cst-sample-type-select"
        inputId="cst-sample-type-select-input"
        css={fullWidthSelectStyles}
        styles={reactSelectStyles as any}
        isDisabled={editingStatus ? true : false}
        value={userDefinedSampleType}
        onChange={(ev) => setUserDefinedSampleType(ev as SampleSelectType)}
        options={allSampleOptions}
      />
      {editingStatus && (
        <div>
          <ColorPicker
            symbol={udtSymbol}
            onChange={(symbol: PolygonSymbol) => {
              setUdtSymbol(symbol);
            }}
          />
          <label htmlFor="point-style-select-input">Point Style</label>
          <Select
            id="point-style-select"
            inputId="point-style-select-input"
            css={fullWidthSelectStyles}
            styles={reactSelectStyles as any}
            value={pointStyle}
            isDisabled={editingStatus === 'view'}
            onChange={(ev) => setPointStyle(ev as ShapeTypeSelect)}
            options={pointStyles}
          />
          <div>
            <label htmlFor="sample-type-name-input">Sample Type Name</label>
            <input
              id="sample-type-name-input"
              disabled={
                editingStatus === 'view' ||
                (editingStatus === 'edit' &&
                  userDefinedSampleType?.isPredefined)
              }
              css={inputStyles}
              value={sampleTypeName}
              onChange={(ev) => setSampleTypeName(ev.target.value)}
            />
            <label htmlFor="sa-input">
              Reference Surface Area <em>(sq inch)</em>
            </label>
            <input
              id="sa-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={sa ? sa : ''}
              onChange={(ev) => setSa(ev.target.value)}
            />
            <label htmlFor="shape-type-select-input">Shape Type</label>
            <Select
              id="shape-type-select"
              inputId="shape-type-select-input"
              css={fullWidthSelectStyles}
              styles={reactSelectStyles as any}
              value={shapeType}
              isDisabled={editingStatus === 'view'}
              onChange={(ev) => setShapeType(ev as ShapeTypeSelect)}
              options={[
                { value: 'point', label: 'Point' },
                { value: 'polygon', label: 'Polygon' },
              ]}
            />
            <label htmlFor="ttpk-input">
              Time to Prepare Kits <em>(person hrs/sample)</em>
            </label>
            <input
              id="ttpk-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={ttpk ? ttpk : ''}
              onChange={(ev) => setTtpk(ev.target.value)}
            />
            <label htmlFor="ttc-input">
              Time to Collect <em>(person hrs/sample)</em>
            </label>
            <input
              id="ttc-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={ttc ? ttc : ''}
              onChange={(ev) => setTtc(ev.target.value)}
            />
            <label htmlFor="tta-input">
              Time to Analyze <em>(person hrs/sample)</em>
            </label>
            <input
              id="tta-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={tta ? tta : ''}
              onChange={(ev) => setTta(ev.target.value)}
            />
            {/* <label htmlFor="ttps-input">
                Total Time per Sample <em>(person hrs/sample)</em>
            </label>
            <input
                id="ttps-input"
                disabled={editingStatus === 'view'}
                css={inputStyles}
                value={ttps ? ttps : ''}
                onChange={(ev) => setTtps(ev.target.value)}
            /> */}
            <label htmlFor="lod_p-input">
              Limit of Detection for Porous Surfaces per Sample (CFU){' '}
              <em>(only used for reference)</em>
            </label>
            <input
              id="lod_p-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={lodp ? lodp : ''}
              onChange={(ev) => setLodp(ev.target.value)}
            />
            <label htmlFor="lod_non-input">
              Limit of Detection for Nonporous Surfaces per Sample (CFU){' '}
              <em>(only used for reference)</em>
            </label>
            <input
              id="lod_non-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={lodnon ? lodnon : ''}
              onChange={(ev) => setLodnon(ev.target.value)}
            />
            <label htmlFor="mcps-input">
              Sampling Material Cost <em>($/sample)</em>
            </label>
            <input
              id="mcps-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={mcps ? mcps : ''}
              onChange={(ev) => setMcps(ev.target.value)}
            />
            {/* <label htmlFor="tcps-input">
                Total Cost per Sample{' '}
                <em>(Labor + Material + Waste)</em>
            </label>
            <input
                id="tcps-input"
                disabled={editingStatus === 'view'}
                css={inputStyles}
                value={tcps ? tcps : ''}
                onChange={(ev) => setTcps(ev.target.value)}
            /> */}
            <label htmlFor="wvps-input">
              Waste Volume <em>(L/sample)</em>
            </label>
            <input
              id="wvps-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={wvps ? wvps : ''}
              onChange={(ev) => setWvps(ev.target.value)}
            />
            <label htmlFor="wwps-input">
              Waste Weight <em>(lbs/sample)</em>
            </label>
            <input
              id="wwps-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={wwps ? wwps : ''}
              onChange={(ev) => setWwps(ev.target.value)}
            />
            <label htmlFor="alc-input">
              Analysis Labor Cost <em>($)</em>
            </label>
            <input
              id="alc-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={alc ? alc : ''}
              onChange={(ev) => setAlc(ev.target.value)}
            />
            <label htmlFor="amc-input">
              Analysis Material Cost <em>($)</em>
            </label>
            <input
              id="amc-input"
              disabled={editingStatus === 'view'}
              css={inputStyles}
              value={amc ? amc : ''}
              onChange={(ev) => setAmc(ev.target.value)}
            />
          </div>
          {validationMessage && userDefinedValidationMessage(validationMessage)}
          <div css={inlineMenuStyles}>
            <button
              css={addButtonStyles}
              onClick={(_ev) => {
                setEditingStatus(null);
                setValidationMessage('');
              }}
            >
              {editingStatus === 'view' ? 'Hide' : 'Cancel'}
            </button>
            {(editingStatus !== 'view' ||
              (editingStatus === 'view' &&
                udtSymbol &&
                userDefinedSampleType &&
                ((Object.prototype.hasOwnProperty.call(
                  defaultSymbols.symbols,
                  userDefinedSampleType.value,
                ) &&
                  JSON.stringify(udtSymbol) !==
                    JSON.stringify(
                      defaultSymbols.symbols[userDefinedSampleType.value],
                    )) ||
                  (!Object.prototype.hasOwnProperty.call(
                    defaultSymbols.symbols,
                    userDefinedSampleType.value,
                  ) &&
                    JSON.stringify(udtSymbol) !==
                      JSON.stringify(defaultSymbols.symbols['Samples']))))) && (
              <button
                css={addButtonStyles}
                onClick={async (_ev) => {
                  setValidationMessage('');
                  const typeUuid =
                    (editingStatus === 'edit' || editingStatus === 'view') &&
                    userDefinedSampleType?.value
                      ? userDefinedSampleType.value
                      : generateUUID();

                  if (udtSymbol) {
                    setDefaultSymbolSingle(typeUuid, udtSymbol);
                  }

                  if (editingStatus === 'view') return;

                  const isValid = validateEdits();
                  const predefinedEdited =
                    editingStatus === 'edit' &&
                    userDefinedSampleType?.isPredefined;
                  if (isValid && sampleTypeName && shapeType) {
                    let newSampleType = {
                      value: typeUuid,
                      label: sampleTypeName,
                      isPredefined: false,
                    };
                    if (predefinedEdited && userDefinedSampleType) {
                      newSampleType = {
                        value: userDefinedSampleType.value,
                        label: `${userDefinedSampleType?.label} (edited)`,
                        isPredefined: userDefinedSampleType.isPredefined,
                      };
                    }

                    // update the sample attributes
                    const newAttributes: AttributeItems = {
                      OBJECTID: '-1',
                      PERMANENT_IDENTIFIER: null,
                      GLOBALID: null,
                      TYPEUUID: typeUuid,
                      TYPE: sampleTypeName,
                      ShapeType: shapeType.value,
                      POINT_STYLE: pointStyle?.value || 'circle',
                      TTPK: ttpk ? Number(ttpk) : null,
                      TTC: ttc ? Number(ttc) : null,
                      TTA: tta ? Number(tta) : null,
                      TTPS: ttps ? Number(ttps) : null,
                      LOD_P: lodp ? Number(lodp) : null,
                      LOD_NON: lodnon ? Number(lodnon) : null,
                      MCPS: mcps ? Number(mcps) : null,
                      TCPS: tcps ? Number(tcps) : null,
                      WVPS: wvps ? Number(wvps) : null,
                      WWPS: wwps ? Number(wwps) : null,
                      SA: sa ? Number(sa) : null,
                      AA: null,
                      ALC: alc ? Number(alc) : null,
                      AMC: amc ? Number(amc) : null,
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
                    };
                    if (
                      Object.prototype.hasOwnProperty.call(
                        userDefinedAttributes.sampleTypes,
                        typeUuid,
                      )
                    ) {
                      const sampleType =
                        userDefinedAttributes.sampleTypes[typeUuid].attributes;
                      if (sampleType.OBJECTID) {
                        newAttributes.OBJECTID = sampleType.OBJECTID;
                      }
                      if (sampleType.GLOBALID) {
                        newAttributes.GLOBALID = sampleType.GLOBALID;
                      }
                    }

                    // add/update the sample's attributes
                    sampleAttributes[typeUuid as any] = newAttributes;
                    setUserDefinedAttributes((item) => {
                      let status: 'add' | 'edit' | 'delete' | 'published' =
                        'add';
                      if (item.sampleTypes[typeUuid]?.status === 'published') {
                        status = 'edit';
                      }
                      if (item.sampleTypes[typeUuid]?.status === 'delete') {
                        status = 'delete';
                      }

                      item.sampleTypes[typeUuid] = {
                        status,
                        attributes: newAttributes,
                        serviceId: Object.prototype.hasOwnProperty.call(
                          item.sampleTypes,
                          typeUuid,
                        )
                          ? item.sampleTypes[typeUuid].serviceId
                          : '',
                      };

                      return {
                        editCount: item.editCount + 1,
                        sampleTypes: item.sampleTypes,
                      };
                    });

                    // add the new option to the dropdown if it doesn't exist
                    if (
                      editingStatus !== 'edit' ||
                      (editingStatus === 'edit' &&
                        !userDefinedSampleType?.isPredefined)
                    ) {
                      setUserDefinedOptions((options) => {
                        if (editingStatus !== 'edit') {
                          return [...options, newSampleType];
                        }

                        const newOptions: SampleSelectType[] = [];
                        options.forEach((option) => {
                          // if the sampleTypeName changed, replace the option tied to the old name with the new one
                          if (
                            didSampleTypeNameChange() &&
                            option.value === userDefinedSampleType?.value
                          ) {
                            newOptions.push(newSampleType);
                            return;
                          }

                          newOptions.push(option);
                        });

                        return newOptions;
                      });
                    }

                    if (editingStatus === 'edit' && userDefinedSampleType) {
                      const oldType = userDefinedSampleType.value;

                      // Update the attributes of the graphics on the map on edits
                      let editsCopy: EditsType = edits;
                      for (const layer of layers) {
                        if (
                          !['Samples', 'VSP'].includes(layer.layerType) ||
                          layer.sketchLayer?.type !== 'graphics'
                        ) {
                          continue;
                        }

                        const editedGraphics = await updateAttributes({
                          graphics: layer.sketchLayer.graphics.toArray(),
                          newAttributes,
                          oldType,
                        });
                        if (layer.pointsLayer) {
                          await updateAttributes({
                            graphics: layer.pointsLayer.graphics.toArray(),
                            newAttributes,
                            oldType,
                            symbol: udtSymbol,
                          });
                        }
                        if (layer.hybridLayer) {
                          await updateAttributes({
                            graphics: layer.hybridLayer.graphics.toArray(),
                            newAttributes,
                            oldType,
                            symbol: udtSymbol,
                          });
                        }

                        if (editedGraphics.length > 0) {
                          const collection = new Collection<__esri.Graphic>();
                          collection.addMany(editedGraphics);
                          editsCopy = updateLayerEdits({
                            appType,
                            edits: editsCopy,
                            layer,
                            type: 'update',
                            changes: collection,
                          });
                        }
                      }

                      setEdits(editsCopy);
                    }

                    // select the new sample type
                    setUserDefinedSampleType(newSampleType);

                    setEditingStatus(null);
                  }
                }}
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}
    </Fragment>
  );
}

export default CustomSampleType;
