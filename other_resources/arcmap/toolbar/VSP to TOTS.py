# Import system modules
import arcpy, os, csv
from arcpy import env
from arcpy.sa import *

# Check out the ArcGIS Spatial Analyst extension license
arcpy.CheckOutExtension("Spatial")

#allow overwrite
arcpy.env.overwriteOutput = True

# Script arguments
VSP_shapefile = arcpy.GetParameterAsText(0)
Sample_type = arcpy.GetParameterAsText(1)
Samples = arcpy.GetParameterAsText(2)
Filename = "VSP_Samples.shp"
desc = arcpy.Describe(Samples)
Root = desc.path
Output = os.path.join(Root, Filename)

# Get description of Samples shapefile to discover path


print Output

# Set environment settings
#env.workspace = ""

# Use the FeatureToPolygon function to form new areas
arcpy.FeatureToPolygon_management(VSP_shapefile, Output, "",
                                  "NO_ATTRIBUTES", "")

fields = [
    ("TYPE","STRING","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("TTPK","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("TTC","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("TTA","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("TTPS","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("LOD_P","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("LOD_NON","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("MCPS","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("TCPS","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("WVPS","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("WWPS","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("SA","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("AA","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("AC","LONG","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("ITER","LONG","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("Notes","STRING","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("ALC","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("AMC","FLOAT","0","0","","","NULLABLE","NON_REQUIRED","")
]
for field in fields:
    arcpy.AddField_management(*(Output,) + field)

fields_in_cursor = ["TYPE","TTPK","TTC","TTA","TTPS","MCPS","TCPS","WVPS","WWPS", "SA", "ALC", "AMC"]
with arcpy.da.UpdateCursor(Output, fields_in_cursor) as cursor:
    for row_field_Name in cursor:
            if Sample_type == 'Micro Vac':
                row_field_Name[0] = "Micro Vac"
                row_field_Name[1] = "0.18"
                row_field_Name[2] = "0.15"
                row_field_Name[3] = "0.8"
                row_field_Name[4] = "1.21"
                row_field_Name[5] = "34.28"
                row_field_Name[6] = "395.84"
                row_field_Name[7] = "0.02"
                row_field_Name[8] = "4.3"
                row_field_Name[9] = "144"
                row_field_Name[10] = "151"
                row_field_Name[11] = "288"
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Wet Vac":
                row_field_Name[0] = "Wet Vac"
                row_field_Name[1] = "0.33"
                row_field_Name[2] = "0.13"
                row_field_Name[3] = "0.8"
                row_field_Name[4] = "1.07"
                row_field_Name[5] = "167"
                row_field_Name[6] = "220"
                row_field_Name[7] = "5"
                row_field_Name[8] = "28.5"
                row_field_Name[9] = "28800"
                row_field_Name[10] = "151"
                row_field_Name[11] = "200"                
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Sponge":
                row_field_Name[0] = "Sponge"
                row_field_Name[1] = "0.12"
                row_field_Name[2] = "0.09"
                row_field_Name[3] = "0.7"
                row_field_Name[4] = "0.99"
                row_field_Name[5] = "46.87"
                row_field_Name[6] = "343.03"
                row_field_Name[7] = "0.1"
                row_field_Name[8] = "4.3"
                row_field_Name[9] = "100"
                row_field_Name[10] = "118"
                row_field_Name[11] = "239"                 
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Robot":
                row_field_Name[0] = "Robot"
                row_field_Name[1] = "0.33"
                row_field_Name[2] = "0.3"
                row_field_Name[3] = "0.7"
                row_field_Name[4] = "1.12"
                row_field_Name[5] = "400"
                row_field_Name[6] = "267"
                row_field_Name[7] = "0.5"
                row_field_Name[8] = "10.5"
                row_field_Name[9] = "144000"
                row_field_Name[10] = "200"
                row_field_Name[11] = "288"                  
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Agressive Air":
                row_field_Name[0] = "Agressive Air"
                row_field_Name[1] = "0.33"
                row_field_Name[2] = "0.6"
                row_field_Name[3] = "0.5"
                row_field_Name[4] = "1.12"
                row_field_Name[5] = "207"
                row_field_Name[6] = "267"
                row_field_Name[7] = "0.1"
                row_field_Name[8] = "5"
                row_field_Name[9] = "12000"
                row_field_Name[10] = "118"
                row_field_Name[11] = "239"                   
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Swab":
                row_field_Name[0] = "Swab"
                row_field_Name[1] = "0.12"
                row_field_Name[2] = "0.07"
                row_field_Name[3] = "0.7"
                row_field_Name[4] = "0.89"
                row_field_Name[5] = "21"
                row_field_Name[6] = "219"
                row_field_Name[7] = "0.01"
                row_field_Name[8] = "2"
                row_field_Name[9] = "4"
                row_field_Name[10] = "118"
                row_field_Name[11] = "239"                  
                cursor.updateRow(row_field_Name)                

# Add VSP out to map

# Get the map document
mxd = arcpy.mapping.MapDocument("CURRENT")

# Get the data frame
df = mxd.activeDataFrame

# Create a new layer
newlayer = arcpy.mapping.Layer(Output)

# Add the layer to the map at the bottom of the TOC in data frame 0
arcpy.mapping.AddLayer(df, newlayer,"TOP")

arcpy.AddMessage("Conversion Complete!")
