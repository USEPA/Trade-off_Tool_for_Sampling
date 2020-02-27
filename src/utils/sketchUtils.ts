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
export function findLayerInEdits(edits: any[], layerToFind: any) {
  const nameToFind = layerToFind.name ? layerToFind.name : layerToFind.id;

  // find the layer in the edits using it's id and name
  const index = edits.findIndex(
    (layer) => layer.id === layerToFind.id && layer.name === nameToFind,
  );
  const layer = edits[index];

  return layer;
}

/**
 * Creates the edit template for sketchable layers.
 *
 * @param layerToEdit The layer object
 * @returns object representing the layer edit template
 */
export function createLayerEditTemplate(layerToEdit: any) {
  return {
    id: layerToEdit.id,
    layerId: layerToEdit.sketchLayer.id,
    name: layerToEdit.name,
    layerType: layerToEdit.layerType,
    addedFrom: layerToEdit.addedFrom,
    adds: [],
    updates: [],
    deletes: [],
    splits: [],
  };
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
    attributes: graphic.attributes ? graphic.attributes : {},
    geometry: geometry,
  };
}

/**
 * Updates the edits object with the provided changes.
 *
 * @param edits The edits object to save the changes to.
 * @param layer The layer the changes pertain to
 * @param type The type of update being performed (add, update, delete or split)
 * @param changes An object representing the changes being saved
 */
export function updateLayerEdits({
  edits,
  layer,
  type,
  changes,
}: {
  edits: any;
  layer: any;
  type: 'add' | 'update' | 'delete' | 'split';
  changes: __esri.Collection<__esri.Graphic>;
}) {
  // make a copy of the edits context variable
  const editsCopy = deepCopyObject(edits);

  // find the layer's edit structure
  let layerToEdit = findLayerInEdits(editsCopy.edits, layer);

  // if it was not found create the edit template for this layer and
  // add it to the copy of edits
  if (!layerToEdit) {
    layerToEdit = createLayerEditTemplate(layer);
    editsCopy.edits.push(layerToEdit);
  }

  // Add new graphics
  if (type === 'add') {
    changes.forEach((change) => {
      const formattedChange = convertToSimpleGraphic(change);
      layerToEdit.adds.push(formattedChange);
    });
  }

  // Apply the updates
  if (type === 'update') {
    changes.forEach((change) => {
      // all updates should have a graphicid
      if (!change?.attributes?.OBJECTID) return;

      // attempt to find the graphic in edits.adds
      const addChangeIndex = layerToEdit.adds.findIndex(
        (graphic: any) =>
          graphic.attributes.OBJECTID === change.attributes.OBJECTID,
      );
      if (addChangeIndex > -1) {
        // Update the added item  and exit
        const formattedChange = convertToSimpleGraphic(change);
        layerToEdit.adds[addChangeIndex] = formattedChange;

        return; // essentially a break on the forEach loop
      }

      // attempt to find the graphic in edits
      const existingChangeIndex = layerToEdit.updates.findIndex(
        (graphic: any) =>
          graphic.attributes.OBJECTID === change.attributes.OBJECTID,
      );

      // update the existing change, otherwise add the change to the updates
      const formattedChange = convertToSimpleGraphic(change);
      if (existingChangeIndex > -1) {
        layerToEdit.updates[existingChangeIndex] = formattedChange;
      } else {
        layerToEdit.updates.push(formattedChange);
      }
    });
  }

  // Append any deletes of items that have already been published
  if (type === 'delete') {
    // TODO: Fix issue of deleting new graphics, showing up in both
    //  deletes and adds or updates.
    changes.forEach((change) => {
      // attempt to find this id in adds
      const addChangeIndex = layerToEdit.adds.findIndex(
        (graphic: any) =>
          graphic.attributes.OBJECTID === change.attributes.OBJECTID,
      );
      if (addChangeIndex > -1) {
        // remove from adds and don't add to deletes
        layerToEdit.adds = layerToEdit.adds.filter(
          (graphic: any) =>
            graphic.attributes.OBJECTID !== change.attributes.OBJECTID,
        );

        return; // essentially a break on the forEach loop
      }

      // if the objectid is in the update list, remove it
      // attempt to find the graphic in edits
      layerToEdit.updates = layerToEdit.updates.filter(
        (graphic: any) =>
          graphic.attributes.OBJECTID !== change.attributes.OBJECTID,
      );

      // add the objectids to delete to the deletes array
      layerToEdit.deletes.push(change.attributes.OBJECTID);
    });
  }

  // TODO: determine if we need splits and implement if necessary
  // if (type === 'splits') { }

  editsCopy.count = editsCopy.count + 1;

  return editsCopy;
}
