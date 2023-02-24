/** @jsxImportSource @emotion/react */

import { v4 as uuidv4 } from 'uuid';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Polygon from '@arcgis/core/geometry/Polygon';
// types
import {
  EditsType,
  EditType,
  FeatureEditsType,
  LayerEditsType,
  ScenarioEditsType,
} from 'types/Edits';
import { LayerType } from 'types/Layer';
import { DefaultSymbolsType } from 'config/sampleAttributes';
// config
import { PolygonSymbol } from 'config/sampleAttributes';

/**
 * This function performs a deep copy, exluding functions,
 * of an object. This is mainly used for setting the edits
 * context variable.
 *
 * @param obj The object to copy.
 */
export function deepCopyObject(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * This function attempts to find the layer in edits.
 *
 * @param edits All of the sketch edits that have occurred
 * @param layerToFind The layer to find within the edits object
 * @returns the layer that was found in the edits object
 */
export function findLayerInEdits(
  edits: (ScenarioEditsType | LayerEditsType)[],
  layerId: string,
) {
  // find the layer in the edits using it's id and name
  let scenarioIndex = -1;
  let layerIndex = -1;
  edits.forEach((edit, scenarioIdx) => {
    if (edit.type === 'layer' && edit.layerId === layerId) {
      // the desired item is a layer
      layerIndex = scenarioIdx;
    } else if (edit.type === 'scenario' && edit.layerId === layerId) {
      // the desired item is a scenario
      scenarioIndex = scenarioIdx;
    } else if (edit.type === 'scenario') {
      // search for the layer in scenarios
      edit.layers.forEach((layer, layerIdx) => {
        if (layer.layerId === layerId) {
          scenarioIndex = scenarioIdx;
          layerIndex = layerIdx;
        }
      });
    }
  });

  // get the scenario if the index was found
  let editsScenario: ScenarioEditsType | null = null;
  if (scenarioIndex > -1) {
    editsScenario = edits[scenarioIndex] as ScenarioEditsType;
  }

  // get the layer if the index was found
  let editsLayer: LayerEditsType | null = null;
  if (editsScenario && layerIndex > -1) {
    // the layer is nested in a scenario
    editsLayer = editsScenario.layers[layerIndex];
  } else {
    // the layer is unlinked and at the root
    editsLayer = edits[layerIndex] as LayerEditsType;
  }

  return {
    scenarioIndex,
    layerIndex,
    editsScenario,
    editsLayer,
  };
}

/**
 * Creates the edit template for sketchable layers.
 *
 * @param layerToEdit The layer object
 * @returns object representing the layer edit template
 */
export function createLayerEditTemplate(
  layerToEdit: LayerType,
  editType: EditType,
) {
  return {
    type: 'layer',
    id: layerToEdit.id,
    pointsId: layerToEdit.pointsId,
    uuid: layerToEdit.uuid,
    layerId: layerToEdit.sketchLayer.id,
    portalId: layerToEdit.portalId,
    name: layerToEdit.name,
    label: layerToEdit.label,
    layerType: layerToEdit.layerType,
    hasContaminationRan: false,
    addedFrom: layerToEdit.addedFrom,
    status: layerToEdit.status,
    editType,
    visible: layerToEdit.visible,
    listMode: layerToEdit.listMode,
    sort: layerToEdit.sort,
    adds: [],
    updates: [],
    deletes: [],
    published: [],
  } as LayerEditsType;
}

/**
 * Converts an esri graphic object into a simpler object
 * for storing in the user's session storage.
 *
 * @param graphic The esri graphic to be stored
 * @returns simple graphic object with just attributes and geometry
 */
export function convertToSimpleGraphic(graphic: __esri.Graphic) {
  let geometry: __esri.Polygon | object = {};
  if (graphic?.geometry?.type === 'polygon') {
    geometry = graphic.geometry as __esri.Polygon;
  }

  // currently we only have polygons
  // in the future we may need to add code to handle different geometry types
  return {
    attributes: graphic.attributes ? { ...graphic.attributes } : {},
    geometry: geometry,
  };
}

/**
 * Updates the edits object with the provided changes.
 *
 * @param edits The edits object to save the changes to.
 * @param scenario Used for adding a layer to a scenario.
 * @param layer The layer the changes pertain to
 * @param type The type of update being performed (add, update, delete, arcgis, or properties)
 * @param changes An object representing the changes being saved
 * @param hasContaminationRan Keeps track of whether or not contamination has ran for this layer
 */
export function updateLayerEdits({
  edits,
  scenario,
  layer,
  type,
  changes,
  hasContaminationRan = false,
}: {
  edits: EditsType;
  scenario?: ScenarioEditsType | null;
  layer: LayerType;
  type: EditType;
  changes?: __esri.Collection<__esri.Graphic>;
  hasContaminationRan?: boolean;
}) {
  // make a copy of the edits context variable
  const editsCopy = deepCopyObject(edits) as EditsType;

  // find the layer's edit structure
  let { editsScenario, editsLayer } = findLayerInEdits(
    editsCopy.edits,
    layer.layerId,
  );
  if (scenario) {
    // find the provided scenario
    editsScenario = findLayerInEdits(
      editsCopy.edits,
      scenario.layerId,
    ).editsScenario;
  }

  // if it was not found create the edit template for this layer and
  // add it to the copy of edits
  if (!editsLayer) {
    editsLayer = createLayerEditTemplate(layer, type);

    // add the layer to a scenario if a scenario was found,
    // otherwise add the layer to the root of edits.
    if (editsScenario) {
      editsScenario.layers.push(editsLayer);
      if (editsScenario.status === 'published') editsScenario.status = 'edited';
    } else {
      editsCopy.edits.push(editsLayer);
    }
  } else if (scenario && editsScenario && type === 'move') {
    editsLayer.visible = true;
    editsLayer.adds = [...editsLayer.adds, ...editsLayer.updates];
    editsLayer.updates = [];
    editsLayer.published.forEach((edit) => {
      const indx = editsLayer.adds.findIndex(
        (x) =>
          x.attributes.PERMANENT_IDENTIFIER ===
          edit.attributes.PERMANENT_IDENTIFIER,
      );
      if (indx === -1) editsLayer.adds.push(edit);
    });
    editsLayer.published = [];
    editsLayer.deletes = [];
    editsScenario.layers.push(editsLayer);
    if (editsScenario.status === 'published') editsScenario.status = 'edited';
    editsCopy.edits = editsCopy.edits.filter(
      (edit) => edit.layerId !== editsLayer.layerId,
    );
  } else {
    // handle property changes
    if (editsScenario) {
      editsScenario.visible = layer.visible;
      editsScenario.listMode = layer.listMode;
      if (editsScenario.status === 'published') editsScenario.status = 'edited';
    }

    editsLayer.visible = layer.visible;
    editsLayer.listMode = layer.listMode;
    editsLayer.name = layer.name;
    editsLayer.label = layer.name;

    // if the status is published, set the status to edited to allow re-publishing
    if (layer.status === 'published') layer.status = 'edited';
    if (editsLayer.status === 'published') editsLayer.status = 'edited';
  }

  editsLayer.editType = type;

  // set the hasContaminationRan value (default is false)
  if (editsScenario) editsScenario.hasContaminationRan = hasContaminationRan;
  editsLayer.hasContaminationRan = hasContaminationRan;

  if (changes) {
    // Add new graphics
    if (type === 'add') {
      changes.forEach((change) => {
        const formattedChange = convertToSimpleGraphic(change);
        editsLayer.adds.push(formattedChange);
      });
    }

    // Add published graphics from arcgis
    if (type === 'arcgis') {
      changes.forEach((change) => {
        const formattedChange = convertToSimpleGraphic(change);
        editsLayer.published.push(formattedChange);
      });
    }

    // Apply the updates
    if (type === 'update') {
      changes.forEach((change) => {
        // all updates should have a graphicid
        if (!change?.attributes?.PERMANENT_IDENTIFIER) return;

        // attempt to find the graphic in edits.adds
        const addChangeIndex = editsLayer.adds.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );
        if (addChangeIndex > -1) {
          // Update the added item  and exit
          const formattedChange = convertToSimpleGraphic(change);
          editsLayer.adds[addChangeIndex] = formattedChange;

          return; // essentially a break on the forEach loop
        }

        // attempt to find the graphic in edits
        const existingChangeIndex = editsLayer.updates.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );

        // update the existing change, otherwise add the change to the updates
        const formattedChange = convertToSimpleGraphic(change);
        if (existingChangeIndex > -1) {
          editsLayer.updates[existingChangeIndex] = formattedChange;
        } else {
          editsLayer.updates.push(formattedChange);
        }
      });
    }

    // Append any deletes of items that have already been published
    if (type === 'delete') {
      // if this graphic is in the adds array, just delete it from the
      // adds array, since it hasn't been published yet
      changes.forEach((change) => {
        // attempt to find this id in adds
        const addChangeIndex = editsLayer.adds.findIndex(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER ===
            change.attributes.PERMANENT_IDENTIFIER,
        );
        if (addChangeIndex > -1) {
          // remove from adds and don't add to deletes
          editsLayer.adds = editsLayer.adds.filter(
            (graphic) =>
              graphic.attributes.PERMANENT_IDENTIFIER !==
              change.attributes.PERMANENT_IDENTIFIER,
          );

          return; // essentially a break on the forEach loop
        }

        // if the objectid is in the update list, remove it
        // attempt to find the graphic in edits
        editsLayer.updates = editsLayer.updates.filter(
          (graphic) =>
            graphic.attributes.PERMANENT_IDENTIFIER !==
            change.attributes.PERMANENT_IDENTIFIER,
        );

        // add the objectids to delete to the deletes array
        editsLayer.deletes.push({
          PERMANENT_IDENTIFIER: change.attributes.PERMANENT_IDENTIFIER,
          GLOBALID: change.attributes.GLOBALID,
          DECISIONUNITUUID: '',
        });
      });
    }
  }

  editsCopy.count = editsCopy.count + 1;

  return editsCopy;
}

/**
 * Creates a simple popup that contains all of the attributes on the
 * graphic.
 *
 * @param attributes Attributes to be placed in the popup content
 * @returns the json object to pass to the Esri PopupTemplate constructor.
 */
export function getSimplePopupTemplate(attributes: any) {
  return {
    title: '',
    content: [
      {
        type: 'fields',
        fieldInfos: Object.keys(attributes).map((key) => {
          return { fieldName: key, label: key };
        }),
      },
    ],
  };
}

/**
 * Generates a unique identifier (uuid) in uppercase.
 *
 * @returns string - A unique identifier (uuid).
 */
export function generateUUID() {
  return '{' + uuidv4().toUpperCase() + '}';
}

/**
 * Takes the graphics from the provided array of layers and
 * combines them in to a single array of graphics. Helpful
 * for zooming to multiple graphics layers.
 *
 * @param Layers - The layers to get a combined graphics array from.
 * @returns extent - The extent of the graphics layers
 */
export function getGraphicsArray(layers: (LayerType | null)[]) {
  let zoomGraphics: __esri.Graphic[] = [];
  layers.forEach((layer) => {
    if (layer?.sketchLayer?.type === 'graphics') {
      zoomGraphics = zoomGraphics.concat(layer.sketchLayer.graphics.toArray());
    }
  });

  return zoomGraphics;
}

/**
 * Gets a timestamp for the current date time formatted as
 * YYYY/MM/DD hh:mm:ss.s
 *
 * @returns a formatted timestamp of the current date/time
 */
export function getCurrentDateTime() {
  const currentdate = new Date();
  return (
    currentdate.getFullYear() +
    '/' +
    String(currentdate.getMonth() + 1).padStart(2, '0') +
    '/' +
    String(currentdate.getDate()).padStart(2, '0') +
    ' ' +
    String(currentdate.getHours()).padStart(2, '0') +
    ':' +
    String(currentdate.getMinutes()).padStart(2, '0') +
    ':' +
    String(currentdate.getSeconds()).padStart(2, '0') +
    '.' +
    currentdate.getMilliseconds()
  );
}

/**
 * Builds the default sample layer.
 *
 * @param name The name of the new layer
 * @param parentLayer (optional) The parent layer of the new layer
 * @returns LayerType The default sample layer
 */
export function createSampleLayer(
  name: string = 'Default Sample Layer',
  parentLayer: __esri.GroupLayer | null = null,
) {
  const layerUuid = generateUUID();
  const graphicsLayer = new GraphicsLayer({
    id: layerUuid,
    title: name,
  });
  const pointsLayer = new GraphicsLayer({
    id: layerUuid + '-points',
    title: name,
    visible: false,
    listMode: 'hide',
  });

  return {
    id: -1,
    pointsId: -1,
    uuid: layerUuid,
    layerId: graphicsLayer.id,
    portalId: '',
    value: graphicsLayer.id,
    name,
    label: name,
    layerType: 'Samples',
    editType: 'add',
    visible: true,
    listMode: 'show',
    sort: 0,
    geometryType: 'esriGeometryPolygon',
    addedFrom: 'sketch',
    status: 'added',
    sketchLayer: graphicsLayer,
    pointsLayer: pointsLayer,
    parentLayer,
  } as LayerType;
}

/**
 * Builds the default sampling mask layer.
 *
 * @returns LayerType The default sampling mask layer
 */
export function getDefaultSamplingMaskLayer() {
  const layerUuid = generateUUID();
  const graphicsLayer = new GraphicsLayer({
    id: layerUuid,
    title: 'Sketched Sampling Mask',
    listMode: 'hide',
  });

  return {
    id: -1,
    pointsId: -1,
    uuid: layerUuid,
    layerId: layerUuid,
    portalId: '',
    value: 'sketchAoi',
    name: 'Sketched Sampling Mask',
    label: 'Sketched Sampling Mask',
    layerType: 'Sampling Mask',
    scenarioName: '',
    scenarioDescription: '',
    editType: 'add',
    visible: true,
    listMode: 'hide',
    sort: 0,
    geometryType: 'esriGeometryPolygon',
    addedFrom: 'sketch',
    status: 'added',
    sketchLayer: graphicsLayer,
    pointsLayer: null,
    parentLayer: null,
  } as LayerType;
}

/**
 * Updates the symbols of all of the graphics within the provided
 * graphics layers with the provided defaultSymbols.
 *
 * @param layers - The layers to update. FeatureLayers will be ignored.
 * @param defaultSymbols - The new default symbols.
 */
export function updatePolygonSymbol(
  layers: LayerType[],
  defaultSymbols: DefaultSymbolsType,
) {
  layers.forEach((layer) => {
    if (layer.sketchLayer.type !== 'graphics') return;

    layer.sketchLayer.graphics.forEach((graphic) => {
      if (graphic.geometry.type !== 'polygon') return;

      let layerType = layer.layerType;
      if (layerType === 'VSP') layerType = 'Samples';
      if (layerType === 'Sampling Mask') layerType = 'Area of Interest';

      // set the symbol based on sample/layer type
      graphic.symbol = defaultSymbols.symbols[layerType] as any;
      if (defaultSymbols.symbols.hasOwnProperty(graphic.attributes.TYPEUUID)) {
        graphic.symbol = defaultSymbols.symbols[
          graphic.attributes.TYPEUUID
        ] as any;
      }
    });
  });
}

/**
 * Updates the symbols of all of the graphics within the provided
 * graphics layers with the provided defaultSymbols.
 *
 * @param layers - The layers to update. FeatureLayers will be ignored.
 * @param defaultSymbols - The new default symbols.
 */
export function updatePointSymbol(
  layers: LayerType[],
  defaultSymbols: DefaultSymbolsType,
) {
  layers.forEach((layer) => {
    if (layer.pointsLayer?.type !== 'graphics') return;

    layer.pointsLayer.graphics.forEach((graphic) => {
      if (graphic.geometry.type !== 'point') return;

      let layerType = layer.layerType;
      if (layerType === 'VSP') layerType = 'Samples';
      if (layerType === 'Sampling Mask') layerType = 'Area of Interest';

      // set the symbol based on sample/layer type
      let udtSymbol: PolygonSymbol | null = null;
      udtSymbol = defaultSymbols.symbols[layerType] as any;
      if (defaultSymbols.symbols.hasOwnProperty(graphic.attributes.TYPEUUID)) {
        udtSymbol = defaultSymbols.symbols[graphic.attributes.TYPEUUID] as any;
      }

      graphic.symbol = getPointSymbol(graphic, udtSymbol);
    });
  });
}

/**
 * Gets an array of layers, included in the provided edits parameter,
 * that can be used with the sketch widget. The search will look in
 * child layers of scenarios as well.
 *
 * @param layers - The layers to search in.
 * @param edits - The edits to search in.
 */
export function getSketchableLayers(
  layers: LayerType[],
  edits: (ScenarioEditsType | LayerEditsType)[],
) {
  return layers.filter(
    (layer) =>
      (layer.layerType === 'Samples' || layer.layerType === 'VSP') &&
      edits &&
      edits.findIndex(
        (editsLayer) =>
          editsLayer.type === 'layer' && editsLayer.layerId === layer.layerId,
      ) > -1,
  ) as LayerType[];
}

/**
 * Searches the edits storage variable to find all available
 * scenarios.
 *
 * @param edits The edits context variable to search through.
 */
export function getScenarios(edits: EditsType) {
  return edits.edits.filter(
    (item) => item.type === 'scenario',
  ) as ScenarioEditsType[];
}

/**
 *
 * @param edits Edits to search through for scenarios.
 * @param layers Layers to search through if there are no scenarios.
 * @param selectedScenario
 * @param sketchLayer
 */
export function getNextScenarioLayer(
  edits: EditsType,
  layers: LayerType[],
  selectedScenario: ScenarioEditsType | null,
  sketchLayer: LayerType | null,
) {
  let nextScenario: ScenarioEditsType | null = null;
  let nextLayer: LayerType | null = null;

  // determine which scenario to get layers for and
  // select a scenario if necessary
  const scenarios = getScenarios(edits);
  let layerEdits = edits.edits;
  if (selectedScenario) {
    // get the layers for the selected scenario
    layerEdits = selectedScenario.layers;
  }
  if (!selectedScenario && scenarios.length > 0) {
    // select the first availble scenario and get it's layers
    nextScenario = scenarios[0];
    layerEdits = scenarios[0].layers;
  }

  // get the first layer that can be used for sketching and return
  const sketchableLayers = getSketchableLayers(layers, layerEdits);
  if (!sketchLayer && sketchableLayers.length > 0) {
    // select the first availble sample layer. This will be
    // an unlinked layer if there is no selected scenario or
    // the selected scenario has no layers
    nextLayer = sketchableLayers[0];
  }

  const defaultLayerIndex = sketchableLayers.findIndex(
    (layer) => layer.name === 'Default Sample Layer',
  );

  return {
    nextScenario,
    nextLayer,
    defaultLayerIndex,
  };
}

/**
 * Gets the sample columns to include on the expandable table.
 *
 * @param tableWidth Used to determine how wide the columns should be.
 * @param includeContaminationFields Says whether or not to include the contamination columns or not.
 * @param useEqualWidth Forces the table to use equal width columns.
 */
export function getSampleTableColumns({
  tableWidth,
  includeContaminationFields,
  useEqualWidth = false,
}: {
  tableWidth: number;
  includeContaminationFields: boolean;
  useEqualWidth?: boolean;
}) {
  const baseColumnWidth = 100;
  const mediumColumnWidth = 140;
  const largeColumnWidth = 160;

  // add the base columns
  let columns: any[] = [
    {
      Header: 'PERMANENT_IDENTIFIER',
      accessor: 'PERMANENT_IDENTIFIER',
      width: 0,
      show: false,
    },
    {
      Header: 'DECISIONUNITUUID',
      accessor: 'DECISIONUNITUUID',
      width: 0,
      show: false,
    },
    {
      Header: 'Layer',
      accessor: 'DECISIONUNIT',
      width: largeColumnWidth,
    },
    {
      Header: 'Sample Type',
      accessor: 'TYPE',
      width: mediumColumnWidth,
    },
    {
      Header: 'Reference Surface Area (sq inch)',
      accessor: 'SA',
      width: baseColumnWidth,
    },
    {
      Header: 'Actual Surface Area (sq inch)',
      accessor: 'AA',
      width: baseColumnWidth,
    },
    {
      Header: 'Equivalent TOTS Samples',
      accessor: 'AC',
      width: baseColumnWidth,
    },
    // {
    //   Header: 'Total Cost Per Sample (Labor + Material + Waste)',
    //   accessor: 'TCPS',
    //   width: baseColumnWidth,
    // },
    {
      Header: 'Notes',
      accessor: 'Notes',
      width: largeColumnWidth,
    },
    {
      Header: 'Analysis Labor Cost ($)',
      accessor: 'ALC',
      width: baseColumnWidth,
    },
    {
      Header: 'Analysis Material Cost ($)',
      accessor: 'AMC',
      width: baseColumnWidth,
    },
    {
      Header: 'Sampling Material Cost ($/sample)',
      accessor: 'MCPS',
      width: baseColumnWidth,
    },
    {
      Header: 'Time to Prepare Kits (person hrs/sample)',
      accessor: 'TTPK',
      width: baseColumnWidth,
    },
    {
      Header: 'Time to Collect (person hrs/sample)',
      accessor: 'TTC',
      width: baseColumnWidth,
    },
    {
      Header: 'Time to Analyze (person hrs/sample)',
      accessor: 'TTA',
      width: baseColumnWidth,
    },
    // {
    //   Header: 'Total Time per Sample (person hrs/sample)',
    //   accessor: 'TTPS',
    //   width: baseColumnWidth,
    // },
    {
      Header: 'Limit of Detection (CFU) Porous',
      accessor: 'LOD_P',
      width: baseColumnWidth,
    },
    {
      Header: 'Limit of Detection (CFU) Nonporous',
      accessor: 'LOD_NON',
      width: baseColumnWidth,
    },
    {
      Header: 'Waste Volume (L/sample)',
      accessor: 'WVPS',
      width: baseColumnWidth,
    },
    {
      Header: 'Waste Weight (lbs/sample)',
      accessor: 'WWPS',
      width: baseColumnWidth,
    },
  ];

  // add the contamination hits columns, if necessary
  if (includeContaminationFields) {
    columns = [
      ...columns,
      {
        Header: 'Contamination Type',
        accessor: 'CONTAMTYPE',
        width: largeColumnWidth,
      },
      {
        Header: 'Activity',
        accessor: 'CONTAMVAL',
        width: baseColumnWidth,
      },
      {
        Header: 'Unit of Measure',
        accessor: 'CONTAMUNIT',
        width: baseColumnWidth,
      },
    ];
  }

  if (useEqualWidth) {
    // set the column widths
    const numColumns = columns.filter(
      (col) => typeof col.show !== 'boolean' || col.show,
    ).length;
    const columnWidth = tableWidth > 0 ? tableWidth / numColumns - 1 : 0;
    columns = columns.map((col) => {
      return {
        ...col,
        width: col.show === 'boolean' && !col.show ? 0 : columnWidth,
      };
    });
  }

  return columns;
}

/**
 * Gets a point symbol representation of the provided polygon for 2d.
 *
 * @param polygon The polygon to be converted
 * @returns A point symbol representation of the provided polygon
 */
function getPointSymbol2d(
  polygon: __esri.Graphic,
  symbolColor: PolygonSymbol | null = null,
) {
  // get the point shape style (i.e. circle, triangle, etc.)
  let style = 'circle';
  let path = null;
  if (polygon.attributes?.POINT_STYLE) {
    // custom shape type
    if (polygon.attributes.POINT_STYLE.includes('path|')) {
      style = 'path';
      path = polygon.attributes.POINT_STYLE.split('|')[1];
    } else {
      style = polygon.attributes.POINT_STYLE;
    }
  }

  // build the symbol
  const symbol: any = {
    type: 'simple-marker',
    color: symbolColor ? symbolColor.color : polygon.symbol.color,
    outline: symbolColor
      ? symbolColor.outline
      : (polygon.symbol as any).outline,
    style: style,
  };
  if (path) symbol.path = path;

  return symbol;
}

/**
 * Gets a point symbol representation of the provided polygon for 3d.
 *
 * @param polygon The polygon to be converted
 * @returns A point symbol representation of the provided polygon
 */
function getPointSymbol3d(
  polygon: __esri.Graphic,
  symbolColor: PolygonSymbol | null = null,
) {
  // mapping 2d builtin shapes to 3d builtin shapes
  const shapeMapping: any = {
    circle: 'circle',
    cross: 'cross',
    diamond: 'kite',
    square: 'square',
    triangle: 'triangle',
    x: 'x',
  };

  // get the point shape style (i.e. circle, triangle, etc.)
  let style = 'circle';
  let path = null;
  if (polygon.attributes?.POINT_STYLE) {
    // custom shape type
    if (polygon.attributes.POINT_STYLE.includes('path|')) {
      style = 'path';

      // TODO need to figure out how to handle this
      path = polygon.attributes.POINT_STYLE.split('|')[1];
    } else {
      style = shapeMapping[polygon.attributes.POINT_STYLE];
    }
  }

  // build the symbol
  const symbol: any = {
    type: 'point-3d',
    symbolLayers: [
      {
        type: 'icon',
        // size:
        material: {
          color: symbolColor
            ? symbolColor.color
            : (polygon.symbol as any).symbolLayers.items[0].material.color,
        },
        outline: symbolColor
          ? {
              ...symbolColor.outline,
              size: symbolColor.outline.width,
            }
          : (polygon.symbol as any).symbolLayers.items[0].outline,
      },
    ],
  };

  if (path) symbol.path = path;
  else symbol.symbolLayers[0].resource = { primitive: style };

  return symbol;
}

/**
 * Gets a point symbol representation of the provided polygon.
 *
 * @param polygon The polygon to be converted
 * @returns A point symbol representation of the provided polygon
 */
export function getPointSymbol(
  polygon: __esri.Graphic,
  symbolColor: PolygonSymbol | null = null,
) {
  let point;
  if (polygon.symbol.type.includes('-3d')) {
    point = getPointSymbol3d(polygon, symbolColor);
  } else {
    point = getPointSymbol2d(polygon, symbolColor);
  }

  return point;
}

/**
 * Converts a polygon graphic to a point graphic.
 *
 * @param polygon The polygon to be converted
 * @returns A point graphic representation of the provided polygon
 */
export function convertToPoint(polygon: __esri.Graphic) {
  const symbol = getPointSymbol(polygon);

  // build the graphic
  return new Graphic({
    attributes: polygon.attributes,
    geometry: (polygon.geometry as any).centroid,
    popupTemplate: polygon.popupTemplate,
    symbol,
  });
}

/**
 * Makes all sketch buttons no longer active by removing
 * the sketch-button-selected class.
 */
export function deactivateButtons() {
  const buttons = document.querySelectorAll('.sketch-button');

  for (let i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove('sketch-button-selected');
  }
}

/**
 * Creates GraphicsLayers from the provided editsLayer. Layers
 * will be added to the newLayers. Layers will be added to the
 * parentLayer, if a parentLayer is provided.
 *
 * @param defaultSymbols Symbols for each sample type
 * @param editsLayer Edits Layer to create graphics layers from
 * @param getPopupTemplate Function for building popup templates
 * @param newLayers Array of layers to add the new layer to
 * @param parentLayer (Optional) The parent layer of the new layers
 * @returns
 */
export function createLayer({
  defaultSymbols,
  editsLayer,
  getPopupTemplate,
  newLayers,
  parentLayer = null,
}: {
  defaultSymbols: DefaultSymbolsType;
  editsLayer: LayerEditsType;
  getPopupTemplate: Function;
  newLayers: LayerType[];
  parentLayer?: __esri.GroupLayer | null;
}) {
  const sketchLayer = new GraphicsLayer({
    title: editsLayer.label,
    id: editsLayer.uuid,
    visible: editsLayer.visible,
    listMode: editsLayer.listMode,
  });
  const pointsLayer = new GraphicsLayer({
    title: editsLayer.label,
    id: editsLayer.uuid + '-points',
    visible: false,
    listMode: 'hide',
  });

  const popupTemplate = getPopupTemplate(
    editsLayer.layerType,
    editsLayer.hasContaminationRan,
  );
  const polyFeatures: __esri.Graphic[] = [];
  const pointFeatures: __esri.Graphic[] = [];
  const idsUsed: string[] = [];
  const displayedFeatures: FeatureEditsType[] = [];

  // push the items from the adds array
  editsLayer.adds.forEach((item) => {
    displayedFeatures.push(item);
    idsUsed.push(item.attributes['PERMANENT_IDENTIFIER']);
  });

  // push the items from the updates array
  editsLayer.updates.forEach((item) => {
    displayedFeatures.push(item);
    idsUsed.push(item.attributes['PERMANENT_IDENTIFIER']);
  });

  // only push the ids of the deletes array to prevent drawing deleted items
  editsLayer.deletes.forEach((item) => {
    idsUsed.push(item.PERMANENT_IDENTIFIER);
  });

  // add graphics from AGOL that haven't been changed
  editsLayer.published.forEach((item) => {
    // don't re-add graphics that have already been added above
    if (idsUsed.includes(item.attributes['PERMANENT_IDENTIFIER'])) return;

    displayedFeatures.push(item);
  });

  // add graphics to the map
  displayedFeatures.forEach((graphic) => {
    let layerType = editsLayer.layerType;
    if (layerType === 'VSP') layerType = 'Samples';
    if (layerType === 'Sampling Mask') layerType = 'Area of Interest';

    // set the symbol styles based on sample/layer type
    let symbol = defaultSymbols.symbols[layerType] as any;
    if (defaultSymbols.symbols.hasOwnProperty(graphic.attributes.TYPEUUID)) {
      symbol = defaultSymbols.symbols[graphic.attributes.TYPEUUID];
    }

    const poly = new Graphic({
      attributes: { ...graphic.attributes },
      popupTemplate,
      symbol,
      geometry: new Polygon({
        spatialReference: {
          wkid: 3857,
        },
        rings: graphic.geometry.rings,
      }),
    });

    polyFeatures.push(poly);
    pointFeatures.push(convertToPoint(poly));
  });
  sketchLayer.addMany(polyFeatures);
  if (editsLayer.layerType === 'Samples' || editsLayer.layerType === 'VSP') {
    pointsLayer.addMany(pointFeatures);
  }

  newLayers.push({
    id: editsLayer.id,
    pointsId: editsLayer.pointsId,
    uuid: editsLayer.uuid,
    layerId: editsLayer.layerId,
    portalId: editsLayer.portalId,
    value: editsLayer.label,
    name: editsLayer.name,
    label: editsLayer.label,
    layerType: editsLayer.layerType,
    editType: 'add',
    addedFrom: editsLayer.addedFrom,
    status: editsLayer.status,
    visible: editsLayer.visible,
    listMode: editsLayer.listMode,
    sort: editsLayer.sort,
    geometryType: 'esriGeometryPolygon',
    sketchLayer,
    pointsLayer:
      editsLayer.layerType === 'Samples' || editsLayer.layerType === 'VSP'
        ? pointsLayer
        : null,
    parentLayer,
  });

  return [sketchLayer, pointsLayer];
}

/**
 * Gets the elevation layer from the map. This can be
 * used for querying the elevation of points on the map.
 *
 * @param map The map object
 * @returns Elevation layer
 */
export function getElevationLayer(map: __esri.Map) {
  return map.ground.layers.find((l) => l.id === 'worldElevation');
}

/**
 * Adds z value to every coordinate in a polygon, if necessary.
 *
 * @param poly Polygon to add z value to
 * @param z The value for z
 */
function setPolygonZValues(poly: __esri.Polygon, z: number) {
  const newRings: number[][][] = [];
  poly.rings.forEach((ring) => {
    const newCoords: number[][] = [];
    ring.forEach((coord) => {
      if (coord.length === 2) {
        newCoords.push([...coord, z]);
      } else if (coord.length === 3 && !coord[2]) {
        newCoords.push([coord[0], coord[1], z]);
      } else {
        newCoords.push(coord);
      }
    });
    newRings.push(newCoords);
  });
  poly.rings = newRings;
  poly.hasZ = true;
}

/**
 * Sets the z values for a point or polygon. If the zRefParam
 * is provided the z value will be the elevation at that coordinate,
 * otherwise the z value will be the centroid of the geometry.
 *
 * @param map Map used for getting the elevation of a coordinate
 * @param graphic Graphic to add z value to
 * @param zRefParam (Optional) Point to use for getting the z value from
 * @param elevationSampler (Optional) Elevation sampler
 */
export async function setZValues({
  map,
  graphic,
  zRefParam = null,
  elevationSampler = null,
}: {
  map: __esri.Map;
  graphic: __esri.Graphic;
  zRefParam?: __esri.Point | null;
  elevationSampler?: __esri.ElevationSampler | null;
}) {
  // get the elevation layer
  const elevationLayer = getElevationLayer(map);

  async function getZAtPoint(point: __esri.Point) {
    if (!elevationLayer && !elevationSampler) return 0;

    let geometry: __esri.Geometry;
    if (elevationSampler) {
      geometry = elevationSampler.queryElevation(point);
    } else {
      geometry = (await elevationLayer.queryElevation(point)).geometry;
    }

    return (geometry as __esri.Point).z;
  }

  // update the z value of the point if necessary
  const point = graphic.geometry as __esri.Point;
  if (graphic.geometry.type === 'point' && !point.z) {
    point.z = await getZAtPoint(point);
    return;
  }

  if (graphic.geometry.type !== 'polygon') return;
  const poly = graphic.geometry as __esri.Polygon;

  const zRef: __esri.Point = zRefParam ? zRefParam : poly.centroid;

  // update the z value of the polygon if necessary
  const firstCoordinate = poly.rings?.[0]?.[0];
  if (
    graphic.geometry.type === 'polygon' &&
    zRef &&
    (!poly.hasZ || firstCoordinate?.length === 2)
  ) {
    if (elevationLayer && firstCoordinate.length === 2) {
      const z = await getZAtPoint(point);
      setPolygonZValues(poly, z);
    } else if (firstCoordinate?.length === 3) {
      poly.hasZ = true;
    } else {
      setPolygonZValues(poly, 0);
    }
  }
}
