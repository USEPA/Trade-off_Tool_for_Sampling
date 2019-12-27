import arcpy
import pythonaddins
import os
sample_area = 0.0508 #in square meters
sample_area = sample_area/2

sponge_SA = 0.254/2
vac_SA = 0.3048/2
swab_SA = 0.0508/2

def getSearchDistanceInches(scale, selection_tolerance=4):
    """Returns the map distance in inches that corresponds to the input selection
    tolerance in pixels (default 3) at the specified map scale."""
    return scale * selection_tolerance / 96.0 # DPI used by ArcMap when reporting scale

class ToolClass14(object):
    """Micro Vac"""
    def __init__(self):
        self.enabled = True
        self.shape = "NONE" # Can set to "Line", "Circle" or "Rectangle" for interactive shape drawing and to activate the onLine/Polygon/Circle event sinks.
    def onMouseDown(self, x, y, button, shift):
        pass
    def onMouseDownMap(self, x, y, button, shift):
# Create a polygon geometry
        print "Placing sample at coordinates:"
        print x-vac_SA, y-vac_SA
        print x-vac_SA, y+vac_SA
        print x+vac_SA, y+vac_SA
        print x+vac_SA, y-vac_SA
        array = arcpy.Array([arcpy.Point(x-vac_SA, y-vac_SA),
                             arcpy.Point(x-vac_SA, y+vac_SA),
                             arcpy.Point(x+vac_SA, y+vac_SA),
                             arcpy.Point(x+vac_SA, y-vac_SA)
                             ])
        polygon = arcpy.Polygon(array)

# Open an InsertCursor and insert the new geometry

        cursor = arcpy.da.InsertCursor(fc, ['SHAPE@', 'TYPE', 'SA', 'TTPK', 'TTC', 'TTA', 'TTPS', 'LOD_P', 'LOD_NON', 'MCPS', 'TCPS', 'WVPS', 'WWPS', 'ALC', 'AMC'])        
        cursor.insertRow([polygon, "Micro Vac", "144", "0.18", "0.15", "0.8", "1.21", "105", "0", "34.28", "395.84", "0.02", "4.3", "151", "288"])
        del cursor
        arcpy.RefreshActiveView()

class ButtonClass68(object):
    """Delete All"""
    def __init__(self):
        self.enabled = True
        self.checked = False
    def onClick(self):
        delete_warning = pythonaddins.MessageBox('This action will delete all samples. Continue?', 'Warning', 4)
        if delete_warning == "Yes":
            arcpy.SelectLayerByAttribute_management(fc, "NEW_SELECTION", "")
            arcpy.DeleteFeatures_management(fc)
        else:
            pass

class ToolClass17(object):
    """Wet Vac"""
    def __init__(self):
        self.enabled = True  
        self.cursor = 3  
        self.shape = "Line" 

    def onLine(self, line_geometry):  
            array = arcpy.Array()  
            part = line_geometry.getPart(0)  
            for pt in part:  
                print pt.X, pt.Y  
                array.add(pt)  
            array.add(line_geometry.firstPoint)  
            polygon = arcpy.Polygon(array)
            cursor = arcpy.da.InsertCursor(fc, ['SHAPE@', 'TYPE', 'SA', 'TTPK', 'TTC', 'TTA', 'TTPS', 'LOD_P', 'LOD_NON', 'MCPS', 'TCPS', 'WVPS', 'WWPS', 'ALC', 'AMC']) #new
            cursor.insertRow([polygon, "Wet Vac", "28800", "0.33", "0.13", "0.8", "1.07", "105", "40", "167", "220", "5", "28.5", "151", "200"])

            del cursor
            arcpy.RefreshActiveView()

class ToolClass19(object):
    """Robot"""
    def __init__(self):
        self.enabled = True  
        self.cursor = 3  
        self.shape = "Line" 

    def onLine(self, line_geometry):  
            array = arcpy.Array()  
            part = line_geometry.getPart(0)  
            for pt in part:  
                print pt.X, pt.Y  
                array.add(pt)  
            array.add(line_geometry.firstPoint)  
            polygon = arcpy.Polygon(array)
            cursor = arcpy.da.InsertCursor(fc, ['SHAPE@', 'TYPE', 'SA', 'TTPK', 'TTC', 'TTA', 'TTPS', 'LOD_P', 'LOD_NON', 'MCPS', 'TCPS', 'WVPS', 'WWPS', 'ALC', 'AMC']) #new
            cursor.insertRow([polygon, "Robot", "144000", "0.33", "0.3", "0.7", "1.12", "105", "140", "400", "267", "0.5", "10.5", "200", "288"])

            del cursor
            arcpy.RefreshActiveView()

class ToolClass21(object):
    """Agressive Air"""
    def __init__(self):
        self.enabled = True  
        self.cursor = 3  
        self.shape = "Line" 

    def onLine(self, line_geometry):  
            array = arcpy.Array()  
            part = line_geometry.getPart(0)  
            for pt in part:  
                print pt.X, pt.Y  
                array.add(pt)  
            array.add(line_geometry.firstPoint)  
            polygon = arcpy.Polygon(array)
            cursor = arcpy.da.InsertCursor(fc, ['SHAPE@', 'TYPE', 'SA', 'TTPK', 'TTC', 'TTA', 'TTPS', 'LOD_P', 'LOD_NON', 'MCPS', 'TCPS', 'WVPS', 'WWPS', 'ALC', 'AMC']) #new
            cursor.insertRow([polygon, "Agressive Air", "12000", "0.33", "0.6", "0.5", "1.12", "105", "140", "207", "267", "0.1", "5", "118", "239"])

            del cursor
            arcpy.RefreshActiveView()

class ToolClass48(object):
    """Swab"""
    def __init__(self):
        self.enabled = True
        self.shape = "NONE" # Can set to "Line", "Circle" or "Rectangle" for interactive shape drawing and to activate the onLine/Polygon/Circle event sinks.
    def onMouseDown(self, x, y, button, shift):
        pass
    def onMouseDownMap(self, x, y, button, shift):
# Create a polygon geometry
        print "Placing sample at coordinates:"
        print x-swab_SA, y-swab_SA
        print x-swab_SA, y+swab_SA
        print x+swab_SA, y+swab_SA
        print x+swab_SA, y-swab_SA
        array = arcpy.Array([arcpy.Point(x-swab_SA, y-swab_SA),
                             arcpy.Point(x-swab_SA, y+swab_SA),
                             arcpy.Point(x+swab_SA, y+swab_SA),
                             arcpy.Point(x+swab_SA, y-swab_SA)
                             ])
        polygon = arcpy.Polygon(array)

# Open an InsertCursor and insert the new geometry

        cursor = arcpy.da.InsertCursor(fc, ['SHAPE@', 'TYPE', 'SA', 'TTPK', 'TTC', 'TTA', 'TTPS', 'LOD_P', 'LOD_NON', 'MCPS', 'TCPS', 'WVPS', 'WWPS', 'ALC', 'AMC'])        
        cursor.insertRow([polygon, "Swab", "4", "0.12", "0.07", "0.7", "0.89", "25", "0", "21", "219", "0.01", "2", "118", "239"])
        del cursor
        arcpy.RefreshActiveView()

class ToolClass9(object):
    """Sponge"""
    def __init__(self):
        self.enabled = True
        self.shape = "NONE" # Can set to "Line", "Circle" or "Rectangle" for interactive shape drawing and to activate the onLine/Polygon/Circle event sinks.
    def onMouseDown(self, x, y, button, shift):
        pass
    def onMouseDownMap(self, x, y, button, shift):
# Create a polygon geometry
        print "Placing sample at coordinates:"
        print x-sponge_SA, y-sponge_SA
        print x-sponge_SA, y+sponge_SA
        print x+sponge_SA, y+sponge_SA
        print x+sponge_SA, y-sponge_SA
        array = arcpy.Array([arcpy.Point(x-sponge_SA, y-sponge_SA),
                             arcpy.Point(x-sponge_SA, y+sponge_SA),
                             arcpy.Point(x+sponge_SA, y+sponge_SA),
                             arcpy.Point(x+sponge_SA, y-sponge_SA)
                             ])
        polygon = arcpy.Polygon(array)

        cursor = arcpy.da.InsertCursor(fc, ['SHAPE@', 'TYPE', 'SA', 'TTPK', 'TTC', 'TTA', 'TTPS', 'LOD_P', 'LOD_NON', 'MCPS', 'TCPS', 'WVPS', 'WWPS', 'ALC', 'AMC'])        
        cursor.insertRow([polygon, "Sponge", "100", "0.12", "0.09", "0.7", "0.99", "14", "0", "46.87", "343.03", "0.1", "4.3", "118", "239"])
        del cursor
        arcpy.RefreshActiveView()

class ButtonClass52(object):
    """Convert VSP (Button)"""
    def __init__(self):
        self.enabled = True
        self.checked = False
    def onClick(self):
        toolboxName = "TOTS Toolbox"
    # name of tool to be executed
        toolName = "VSPTOTS"
    # create string with path to toolbox
        toolboxPath = os.path.join(os.path.dirname(__file__), toolboxName + ".tbx")
    # call geoprocessing tool
        pythonaddins.GPToolDialog(toolboxPath, toolName)

mxd = arcpy.mapping.MapDocument("CURRENT")

class ToolClass23(object):
    """Delete"""
    def __init__(self):
        self.enabled = True
        self.shape = "NONE" # Can set to "Line", "Circle" or "Rectangle" for interactive shape drawing and to activate the onLine/Polygon/Circle event sinks.
    def onMouseDown(self, x, y, button, shift):
        pass
    def onMouseDownMap(self, x, y, button, shift):
        mxd = arcpy.mapping.MapDocument("CURRENT")
        pointGeom = arcpy.PointGeometry(arcpy.Point(x, y), mxd.activeDataFrame.spatialReference)
        searchdistance = getSearchDistanceInches(mxd.activeDataFrame.scale)
        lyr = arcpy.mapping.ListLayers(mxd,fc)[0]
        arcpy.SelectLayerByLocation_management(lyr, "INTERSECT", pointGeom, "{0} INCHES".format(searchdistance))
        result = arcpy.GetCount_management(lyr)
        count = int(result.getOutput(0))
        arcpy.DeleteFeatures_management(lyr)

class ButtonClass53(object):
    """Run (Button)"""
    def __init__(self):
        self.enabled = True
        self.checked = False
    def onClick(self):
        toolboxName = "TOTS Toolbox"
    # name of tool to be executed
        toolName = "SampleThis"
    # create string with path to toolbox
        toolboxPath = os.path.join(os.path.dirname(__file__), toolboxName + ".tbx")
    # call geoprocessing tool
        pythonaddins.GPToolDialog(toolboxPath, toolName)

class ComboBoxClass57(object):
    """Select Feature Combo Box"""
    def __init__(self):
        #self.items = ["Option 1", "Option 2"]
        self.editable = True
        self.enabled = True
        self.dropdownWidth = 'WWWWWWWWWWWWWWWW'
        self.width = 'WWWWWWWWWWWWWWWW'
    def onSelChange(self, selection):
        global fc
        fc = arcpy.mapping.ListLayers(self.mxd, selection)[0]
        print fc
    def onEditChange(self, text):
        pass
    def onFocus(self, focused):
        # When focused, update the combo box with the list of layer names.
        if focused:
            self.mxd = arcpy.mapping.MapDocument('current')
            layers = arcpy.mapping.ListLayers(self.mxd)
            self.items = []
            for layer in layers:
                self.items.append(layer.name)
    def onEnter(self):
        pass
    def refresh(self):
        pass

class ToolClass66(object):
    """Notes"""
    def __init__(self):
        self.enabled = True
        self.shape = "NONE" # Can set to "Line", "Circle" or "Rectangle" for interactive shape drawing and to activate the onLine/Polygon/Circle event sinks.
    def onMouseDown(self, x, y, button, shift):
        pass
    def onMouseDownMap(self, x, y, button, shift):
        mxd = arcpy.mapping.MapDocument("CURRENT")
        pointGeom = arcpy.PointGeometry(arcpy.Point(x, y), mxd.activeDataFrame.spatialReference)
        searchdistance = getSearchDistanceInches(mxd.activeDataFrame.scale)
        lyr = arcpy.mapping.ListLayers(mxd,fc)[0]
        arcpy.SelectLayerByLocation_management(lyr, "INTERSECT", pointGeom, "{0} INCHES".format(searchdistance))
        result = arcpy.GetCount_management(lyr)
        count = int(result.getOutput(0))
        arcpy.AddField_management(fc, "Notes", "TEXT", field_length = 200)
        note_text = arcpy.da.SearchCursor(fc, "Notes").next()[0]  
        check_notes = pythonaddins.MessageBox('Note reads: ' + str(note_text) + '\n \n' + 'Would you like to modify this note?', 'Notes', 4)
        if check_notes == "Yes":
            toolboxName = "TOTS Toolbox"
            # name of tool to be executed
            toolName = "Notes"
            # create string with path to toolbox
            toolboxPath = os.path.join(os.path.dirname(__file__), toolboxName + ".tbx")
            # call geoprocessing tool
            pythonaddins.GPToolDialog(toolboxPath, toolName)
        else:
            arcpy.SelectLayerByAttribute_management(fc, "CLEAR_SELECTION")
            pass
