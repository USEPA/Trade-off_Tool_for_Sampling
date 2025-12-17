/** @jsxImportSource @emotion/react */

import { Fragment, useContext, useEffect, useState } from 'react';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import ImageryLayer from '@arcgis/core/layers/ImageryLayer.js';
import TileLayer from '@arcgis/core/layers/TileLayer.js';
import { css } from '@emotion/react';
// components
import AoiSketchButton from 'components/AoiSketchButton';
import ColorPicker from 'components/ColorPicker';
import { EditStagingAreaCharacterization } from 'components/EditLayerMetaData';
import InfoIcon from 'components/InfoIcon';
// config
import { layerTypeOptions } from 'config/navigation';
import { PolygonSymbol } from 'config/sampleAttributes';
// contexts
import { useLookupFiles } from 'contexts/LookupFiles';
import { NavigationContext } from 'contexts/Navigation';
import Select from 'components/Select';
import { SketchContext } from 'contexts/Sketch';
// styles
import { infoIconStyles, reactSelectStyles } from 'styles';
// types
import { EditsType, LayerEditsType } from 'types/Edits';
import { LayerType } from 'types/Layer';
// utils
import {
  calculateArea,
  createLayerEditTemplate,
  generateUUID,
  getDefaultSamplingMaskLayer,
} from 'utils/sketchUtils';

const GOVERNMENT_LANDS_LAYER_ID = generateUUID();
const PARCEL_LAYER_ID = generateUUID();
const SUITABILITY_LAYER_ID = generateUUID();

// --- styles ---

const calculationSectionStyles = css`
  column-gap: 1em;
  display: grid;
  font-size: 0.87em;
  grid-template-columns: 4fr 1fr;
  grid-template-rows: auto;
  padding: 0;
  row-gap: 0.5em;

  & > div {
    &:nth-of-type(odd) {
      font-weight: bold;
    }
  }
`;

const headingStyles = css`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 1rem;

  i {
    color: #005ea2;
    font-size: 1.5rem;
  }
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

const layerButtonContainerStyles = css`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  div {
    display: flex;
    justify-content: flex-end;
  }
`;

const layerItemStyles = css`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 1rem;

  input {
    height: 18px;
    width: 18px;
  }
`;

const layerSectionStyles = css`
  margin-top: 1rem;
`;

const layerSelectStyles = css`
  margin-bottom: 10px;
`;

const verticalCenterTextStyles = css`
  display: flex;
  align-items: center;
`;

// --- components ---

function StagingAreas() {
  const { setGoTo, setGoToOptions } = useContext(NavigationContext);
  const {
    aoiSketchVM,
    defaultSymbols,
    edits,
    governmentLandsLayerVisible,
    layers,
    layersInitialized,
    map,
    parcelLayerVisible,
    setAoiSketchLayer,
    setDefaultSymbolSingle,
    setEdits,
    setGovernmentLandsLayerVisible,
    setLayers,
    setParcelLayerVisible,
    setSuitabilityLayerVisible,
    setStagingAreaLayer,
    stagingAreaLayer,
    suitabilityLayerVisible,
  } = useContext(SketchContext);

  useSuitabilityLayer();
  useGovernmentLandsLayer();
  useParcelLayer();

  const [addScenarioVisible, setAddScenarioVisible] = useState(false);
  const [editScenarioVisible, setEditScenarioVisible] = useState(false);
  const [stagingLayers, setStagingLayers] = useState<LayerType[]>([]);
  const [calcsVisible, setCalcsVisible] = useState(false);
  const [lastStagingAreaLayer, setLastStagingAreaLayer] =
    useState<LayerType | null>(null);

  useEffect(() => {
    if (!stagingAreaLayer) {
      setEditScenarioVisible(false);
      return;
    }

    const hasAoiGraphics =
      stagingAreaLayer?.sketchLayer?.type === 'graphics' &&
      stagingAreaLayer.sketchLayer.graphics.length > 0;
    if (!hasAoiGraphics) setEditScenarioVisible(true);
  }, [stagingAreaLayer]);

  const [lastAoiSketchLayer, setLastAoiSketchLayer] =
    useState<__esri.GraphicsLayer | null>(null);
  useEffect(() => {
    if (!aoiSketchVM) return;

    aoiSketchVM.polygonSymbol = defaultSymbols.symbols[
      'Staging Area Mask'
    ] as any;

    const stagingLayer = edits.edits.find(
      (item) =>
        item.type === 'layer' &&
        item.layerType === 'Staging Area Mask' &&
        item.layerId === stagingAreaLayer?.layerId,
    ) as LayerEditsType | undefined;
    if (!stagingLayer) return;

    const sketchLayer = layers.find(
      (l) =>
        l.layerType === 'Staging Area Mask' &&
        l.layerId === stagingLayer.layerId,
    );
    if (
      sketchLayer &&
      sketchLayer?.sketchLayer?.id !== aoiSketchVM?.layer?.id
    ) {
      setLastAoiSketchLayer(aoiSketchVM.layer);
      aoiSketchVM.layer = sketchLayer.sketchLayer as __esri.GraphicsLayer;
      aoiSketchVM.layer.elevationInfo = { mode: 'on-the-ground' };
    }

    return function cleanup() {
      if (lastAoiSketchLayer) aoiSketchVM.layer = lastAoiSketchLayer;
    };
  }, [
    aoiSketchVM,
    defaultSymbols,
    edits,
    lastAoiSketchLayer,
    layers,
    stagingAreaLayer,
  ]);

  const [initializedLayers, setInitializedLayers] = useState(false);
  useEffect(() => {
    if (!layersInitialized) return;

    const newLayers: LayerType[] = [];
    layers.forEach((layer) => {
      if (layer.layerType === 'Staging Area Mask') newLayers.push(layer);
    });
    setStagingLayers(newLayers);
    setInitializedLayers(true);
  }, [edits, layers, layersInitialized]);

  const [initializedLayer, setInitializedDeconLayer] = useState(false);
  useEffect(() => {
    if (
      stagingAreaLayer ||
      initializedLayer ||
      !initializedLayers ||
      !layersInitialized ||
      !map
    )
      return;

    setInitializedDeconLayer(true);

    if (stagingLayers.length > 0) {
      setStagingAreaLayer(stagingLayers[0]);
    } else {
      const newAoiSketchLayer = getDefaultSamplingMaskLayer(
        '',
        'Staging Area Mask',
        'Staging Area Mask',
        true,
      );
      const newAoiEdits = createLayerEditTemplate(newAoiSketchLayer, 'add');
      newAoiEdits.description = '';

      // make a copy of the edits context variable
      setEdits((edits) => {
        return {
          count: edits.count + 1,
          edits: [...edits.edits, newAoiEdits],
        };
      });

      setStagingAreaLayer(newAoiSketchLayer);

      const tLayers = [...layers, newAoiSketchLayer];

      // update layers (set parent layer)
      window.totsLayers = tLayers;
      setLayers(tLayers);

      // add the scenario group layer to the map
      if (newAoiSketchLayer.sketchLayer) map.add(newAoiSketchLayer.sketchLayer);
    }
  }, [
    initializedLayer,
    initializedLayers,
    layers,
    layersInitialized,
    map,
    setEdits,
    setLayers,
    setStagingAreaLayer,
    stagingAreaLayer,
    stagingLayers,
  ]);

  useEffect(() => {
    const sketchLayer = stagingAreaLayer?.sketchLayer;
    setCalcsVisible(
      !addScenarioVisible &&
        sketchLayer?.type === 'graphics' &&
        sketchLayer.graphics.length > 0,
    );
  }, [addScenarioVisible, stagingAreaLayer]);

  useEffect(() => {
    setAoiSketchLayer(stagingAreaLayer);
  }, [stagingAreaLayer, setAoiSketchLayer]);

  function handleAdd() {
    if (!map) return;

    const newAoiSketchLayer = getDefaultSamplingMaskLayer(
      '',
      'Staging Area Mask',
      'Staging Area Mask',
      true,
    );
    const newAoiEdits = createLayerEditTemplate(newAoiSketchLayer, 'add');
    newAoiEdits.description = '';

    // make a copy of the edits context variable
    setEdits((edits) => {
      return {
        count: edits.count + 1,
        edits: [...edits.edits, newAoiEdits],
      };
    });

    setLastStagingAreaLayer(stagingAreaLayer);
    setStagingAreaLayer(newAoiSketchLayer);

    const tLayers = [...layers];
    if (newAoiSketchLayer) tLayers.push(newAoiSketchLayer);

    // update layers (set parent layer)
    window.totsLayers = tLayers;
    setLayers(tLayers);

    // add the layer to the map
    if (newAoiSketchLayer.sketchLayer) map.add(newAoiSketchLayer.sketchLayer);
  }

  function handleDelete(lastDeconSketchLayer?: LayerType | null) {
    if (!stagingAreaLayer) return;

    const idsToDelete: string[] = [stagingAreaLayer.layerId];

    const newLayers = stagingLayers.filter(
      (layer) => stagingAreaLayer.layerId !== layer.layerId,
    );
    setStagingLayers(newLayers);
    if (lastDeconSketchLayer) setStagingAreaLayer(lastDeconSketchLayer);
    else setStagingAreaLayer(newLayers.length > 0 ? newLayers[0] : null);

    // remove all of the child layers
    setLayers((layers) => {
      return layers.filter((layer) => !idsToDelete.includes(layer.layerId));
    });

    // remove the scenario from edits
    const newEdits: EditsType = {
      count: edits.count + 1,
      edits: edits.edits.filter(
        (item) => item.layerId !== stagingAreaLayer.layerId,
      ),
    };
    setEdits(newEdits);

    if (!map) return;

    // remove the scenario from the map
    const mapLayer = map.layers.find(
      (layer) => layer.id === stagingAreaLayer?.layerId,
    );
    if (mapLayer) map.remove(mapLayer);
  }

  const stagingAreaEdits = edits.edits.find(
    (edit) =>
      edit.type === 'layer' &&
      edit.layerType === 'Staging Area Mask' &&
      edit.layerId === stagingAreaLayer?.layerId,
  ) as LayerEditsType | undefined;

  return (
    <div>
      <p>
        EPA’s suitability feature layer and other relevant boundary layers are
        enabled. Use map features to zoom to a location of interest to assess
        reference layers. Use the Legend to control visibility of the layers or
        click Add Data to incorporate additional layers.
      </p>
      <h3 css={headingStyles}>
        <i className="fas fa-layer-group" />
        Add Layers
      </h3>
      <label css={layerItemStyles}>
        <input
          type="checkbox"
          checked={suitabilityLayerVisible}
          onChange={(ev) => setSuitabilityLayerVisible(ev.target.checked)}
        />
        <span>Staging Suitability Analysis</span>
        <InfoIcon
          id={'suitability-analysis-layer-info-icon'}
          cssStyles={infoIconStyles}
          tooltip="A national-level suitability map layer to inform waste<br/>staging/storage location selection based on suitability factors<br/>such as soil type, land cover, topography, ease of transportation,<br/>and proximity to surface waters. Suitability values range from<br/>0 to 500 where higher values (green) are more suitable. You<br/>can use this layer in conjunction with other parcel data to identify<br/>a candidate staging area."
        />
      </label>
      <label css={layerItemStyles}>
        <input
          type="checkbox"
          checked={parcelLayerVisible}
          onChange={(ev) => setParcelLayerVisible(ev.target.checked)}
        />
        <span>Local Parcel Information</span>
      </label>
      <label css={layerItemStyles}>
        <input
          type="checkbox"
          checked={governmentLandsLayerVisible}
          onChange={(ev) => setGovernmentLandsLayerVisible(ev.target.checked)}
        />
        <span>Government-Owned Lands</span>
      </label>

      <div css={layerSectionStyles}>
        <button
          onClick={(_ev) => {
            const layerType = layerTypeOptions.find(
              (o) => o.value === 'contains-epa-tots-aoi-characterization',
            );
            setGoTo('addData');
            setGoToOptions({
              from: 'search',
              layerTypesAgo: layerType ? [layerType] : undefined,
            });
          }}
        >
          Add Data
        </button>

        <ColorPicker
          title="Default Staging Area Symbology"
          symbol={defaultSymbols.symbols['Staging Area Mask']}
          onChange={(symbol: PolygonSymbol) => {
            setDefaultSymbolSingle('Staging Area Mask', symbol);
          }}
        />

        <p>
          Edit the staging area name and add a description. Select "Draw Staging
          Area" to designate the staging area boundary. Click Save to view
          estimated solid and aqueous waste capacity. Click + to add an
          additional staging area.
        </p>

        <div css={iconButtonContainerStyles}>
          <div css={verticalCenterTextStyles}>
            <label htmlFor="suitability-aoi-select-input">
              Active Staging Area Layer
            </label>
          </div>
          <div css={layerButtonContainerStyles}>
            <div>
              {stagingAreaLayer && (
                <Fragment>
                  <button
                    css={iconButtonStyles}
                    title="Delete Layer"
                    onClick={() => handleDelete()}
                  >
                    <i className="fas fa-trash-alt" />
                    <span className="sr-only">Delete Layer</span>
                  </button>

                  {stagingAreaLayer.status !== 'published' && (
                    <button
                      css={iconButtonStyles}
                      title={editScenarioVisible ? 'Cancel' : 'Edit Layer'}
                      onClick={() => {
                        setAddScenarioVisible(false);
                        setEditScenarioVisible(!editScenarioVisible);
                      }}
                    >
                      <i
                        className={
                          editScenarioVisible ? 'fas fa-times' : 'fas fa-edit'
                        }
                      />
                      <span className="sr-only">
                        {editScenarioVisible ? 'Cancel' : 'Edit Layer'}
                      </span>
                    </button>
                  )}
                </Fragment>
              )}
              <button
                css={iconButtonStyles}
                title={addScenarioVisible ? 'Cancel' : 'Add Layer'}
                onClick={() => {
                  setEditScenarioVisible(false);
                  setAddScenarioVisible(!addScenarioVisible);

                  if (!addScenarioVisible) {
                    handleAdd();
                  } else {
                    // delete the newly added layer
                    handleDelete(lastStagingAreaLayer);
                  }
                }}
              >
                <i
                  className={
                    addScenarioVisible ? 'fas fa-times' : 'fas fa-plus'
                  }
                />
                <span className="sr-only">
                  {addScenarioVisible ? 'Cancel' : 'Add Layer'}
                </span>
              </button>
            </div>
          </div>
        </div>
        <Select
          id="suitability-aoi-select-input-container"
          inputId="suitability-aoi-select-input"
          css={layerSelectStyles}
          styles={reactSelectStyles as any}
          isDisabled={addScenarioVisible || editScenarioVisible}
          options={stagingLayers}
          value={stagingAreaLayer}
          onChange={(ev) => setStagingAreaLayer(ev as LayerType)}
        />
      </div>

      {stagingAreaEdits && (
        <EditStagingAreaCharacterization
          aoiLayer={stagingAreaEdits}
          disabled={
            stagingAreaLayer?.sketchLayer?.type === 'graphics' &&
            stagingAreaLayer.sketchLayer.graphics.length === 0
          }
          editVisible={addScenarioVisible || editScenarioVisible}
          onSave={(saveResults) => {
            if (saveResults?.status !== 'success') return;
            setAddScenarioVisible(false);
            setEditScenarioVisible(false);
            setCalcsVisible(true);
          }}
        >
          <AoiSketchButton
            className="margin-top-1"
            onContinue={() => setCalcsVisible(false)}
            replaceGraphics={true}
            sketchLayer={stagingAreaLayer?.sketchLayer}
          />
        </EditStagingAreaCharacterization>
      )}

      <CalculationResults calcsVisible={calcsVisible} />
    </div>
  );
}

function CalculationResults({ calcsVisible }: { calcsVisible: boolean }) {
  const { stagingAreaLayer } = useContext(SketchContext);

  const { totalArea, totalSolidWasteCapacity, totalLiquidWasteCapacity } =
    useAoiCalculations(stagingAreaLayer);

  const formatNumber = (value: number) =>
    value.toLocaleString('en-US', { maximumFractionDigits: 2 });

  const rows = {
    Area: { value: totalArea, unit: 'm²' },
    'Solid Waste Capacity': { value: totalSolidWasteCapacity, unit: 'm³' },
    'Aqueous Waste Capacity': { value: totalLiquidWasteCapacity, unit: 'm³' },
  };

  const sketchLayer = stagingAreaLayer?.sketchLayer;

  return calcsVisible &&
    sketchLayer instanceof GraphicsLayer &&
    sketchLayer.graphics.length ? (
    <>
      <h3>AOI Calculation Results</h3>
      <section css={calculationSectionStyles}>
        {Object.entries(rows).map(([label, { value, unit }]) => (
          <Fragment key={label}>
            <div>
              {label} ({unit}):{' '}
            </div>
            <div>{formatNumber(value)}</div>
          </Fragment>
        ))}
      </section>
    </>
  ) : null;
}

// --- custom hooks ---

function useAoiCalculations(aoiLayer?: LayerType | null) {
  const { aoiSketchLayer, aoiSketchVM, defaultSymbols, sceneViewForArea } =
    useContext(SketchContext);

  const targetLayer = aoiLayer ?? aoiSketchLayer;
  const sketchLayer =
    targetLayer?.sketchLayer instanceof GraphicsLayer
      ? targetLayer.sketchLayer
      : null;

  const calculateSolidWasteCapacity = (areaSqM: number) => {
    return (areaSqM * 0.4) / 0.3284;
  };
  const calculateLiquidWasteCapacity = (areaSqM: number) => {
    return (areaSqM * 0.4) / 0.0020975 / 1000;
  };
  const sumValues = (key: string) => {
    return (sketchLayer?.graphics ?? []).reduce((total, graphic) => {
      return total + (graphic.attributes[key] ?? 0);
    }, 0);
  };

  // Add a calculations to the graphics in the sketch layer when they are created, and configure the graphic's popup.
  useEffect(() => {
    if (!aoiSketchVM) return;

    const handle = aoiSketchVM.on('create', async ({ graphic, state }) => {
      if (state !== 'complete') return;
      if (aoiSketchVM.layer !== sketchLayer) return;

      const areaSqM = await calculateArea(
        graphic,
        sceneViewForArea,
        'sqmeters',
      );

      if (typeof areaSqM === 'number') {
        graphic.attributes = {
          ...graphic.attributes,
          AREA: areaSqM,
          SOLID_WASTE_CAPACITY: calculateSolidWasteCapacity(areaSqM),
          LIQUID_WASTE_CAPACITY: calculateLiquidWasteCapacity(areaSqM),
          LATITUDE:
            (graphic.geometry as __esri.Polygon)?.centroid?.latitude ?? 0,
          LONGITUDE:
            (graphic.geometry as __esri.Polygon)?.centroid?.longitude ?? 0,
        };
      }
    });

    return function cleanup() {
      handle.remove();
    };
  }, [aoiSketchVM, defaultSymbols, sceneViewForArea, sketchLayer]);

  return {
    totalArea: sumValues('AREA'),
    totalSolidWasteCapacity: sumValues('SOLID_WASTE_CAPACITY'),
    totalLiquidWasteCapacity: sumValues('LIQUID_WASTE_CAPACITY'),
  };
}

function useGovernmentLandsLayer() {
  const { services } = useLookupFiles().data;
  const { map, governmentLandsLayerVisible } = useContext(SketchContext);

  const governmentLandsLayer = (() => {
    if (!map) return;
    return (
      map.findLayerById(GOVERNMENT_LANDS_LAYER_ID) ??
      new FeatureLayer({
        id: GOVERNMENT_LANDS_LAYER_ID,
        listMode: 'show',
        title: 'Government-Owned Lands',
        url: services.governmentLands,
      })
    );
  })();

  if (governmentLandsLayer) {
    if (map && !map.allLayers.includes(governmentLandsLayer)) {
      map.add(governmentLandsLayer);
    }
    if (governmentLandsLayer.visible !== governmentLandsLayerVisible) {
      governmentLandsLayer.visible = governmentLandsLayerVisible;
    }
  }

  // Hide the government lands layer when the component unmounts.
  useEffect(() => {
    return function cleanup() {
      if (governmentLandsLayer) governmentLandsLayer.visible = false;
    };
  }, [governmentLandsLayer]);

  return governmentLandsLayer;
}

function useParcelLayer() {
  const { services } = useLookupFiles().data;
  const { map, parcelLayerVisible } = useContext(SketchContext);

  const parcelLayer = (() => {
    if (!map) return;
    return (
      map.findLayerById(PARCEL_LAYER_ID) ??
      new TileLayer({
        id: PARCEL_LAYER_ID,
        listMode: 'show',
        title: 'Local Parcel Information',
        url: services.parcel,
      })
    );
  })();

  if (parcelLayer) {
    if (map && !map.allLayers.includes(parcelLayer)) {
      map.add(parcelLayer);
    }
    if (parcelLayer.visible !== parcelLayerVisible) {
      parcelLayer.visible = parcelLayerVisible;
    }
  }

  // Hide the parcel layer when the component unmounts.
  useEffect(() => {
    return function cleanup() {
      if (parcelLayer) parcelLayer.visible = false;
    };
  }, [parcelLayer]);

  return parcelLayer;
}

function useSuitabilityLayer() {
  const { services } = useLookupFiles().data;
  const { map, suitabilityLayerVisible } = useContext(SketchContext);

  const suitabilityLayer = (() => {
    if (!map) return;
    return (
      map.findLayerById(SUITABILITY_LAYER_ID) ??
      new ImageryLayer({
        id: SUITABILITY_LAYER_ID,
        listMode: 'show',
        title: 'Staging Suitability Analysis',
        url: services.suitability,
      })
    );
  })();

  if (suitabilityLayer) {
    if (map && !map.allLayers.includes(suitabilityLayer)) {
      map.add(suitabilityLayer);
    }
    if (suitabilityLayer.visible !== suitabilityLayerVisible) {
      suitabilityLayer.visible = suitabilityLayerVisible;
    }
  }

  // Hide the suitability layer when the component unmounts.
  useEffect(() => {
    return function cleanup() {
      if (suitabilityLayer) suitabilityLayer.visible = false;
    };
  }, [suitabilityLayer]);

  return suitabilityLayer;
}

export default StagingAreas;
