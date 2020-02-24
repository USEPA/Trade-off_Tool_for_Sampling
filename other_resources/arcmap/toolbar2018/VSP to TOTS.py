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
Root = arcpy.GetParameterAsText(2)
Filename = "VSP_Samples_Ploy.shp"

Output = os.path.join(Root, Filename)

print Output

# Set environment settings
#env.workspace = "C:/sapyexamples/data"

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
    ("AC","FLOAT","0","0","","","NULLABLE","NON_REQUIRED",""),
    ("ITER","FLOAT","0","0","","","NULLABLE","NON_REQUIRED","")
]
for field in fields:
    arcpy.AddField_management(*(Output,) + field)

fields_in_cursor = ["TYPE","TTPK","TTC","TTA","TTPS","MCPS","TCPS","WVPS","WWPS", "SA"]
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
                row_field_Name[7] = "0"
                row_field_Name[8] = "4.3"
                row_field_Name[9] = "144"
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Wet Vac":
                row_field_Name[0] = "Wet Vac"
                row_field_Name[1] = "0.33"
                row_field_Name[2] = "0.13"
                row_field_Name[3] = "0.5"
                row_field_Name[4] = "1.07"
                row_field_Name[5] = "167"
                row_field_Name[6] = "220"
                row_field_Name[7] = "5"
                row_field_Name[8] = "28.5"
                row_field_Name[9] = "28800"
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Sponge":
                row_field_Name[0] = "Sponge"
                row_field_Name[1] = "0.12"
                row_field_Name[2] = "0.09"
                row_field_Name[3] = "0.7"
                row_field_Name[4] = "0.99"
                row_field_Name[5] = "46.87"
                row_field_Name[6] = "343.03"
                row_field_Name[7] = "0"
                row_field_Name[8] = "4.3"
                row_field_Name[9] = "100"
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Robot":
                row_field_Name[0] = "Robot"
                row_field_Name[1] = "0.17"
                row_field_Name[2] = "0.6"
                row_field_Name[3] = "0.5"
                row_field_Name[4] = "1.12"
                row_field_Name[5] = "207"
                row_field_Name[6] = "267"
                row_field_Name[7] = "0.5"
                row_field_Name[8] = "10.5"
                row_field_Name[9] = "144000"
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Agressive Air":
                row_field_Name[0] = "Agressive Air"
                row_field_Name[1] = "0.17"
                row_field_Name[2] = "0.6"
                row_field_Name[3] = "0.5"
                row_field_Name[4] = "1.12"
                row_field_Name[5] = "207"
                row_field_Name[6] = "267"
                row_field_Name[7] = "0.5"
                row_field_Name[8] = "10.5"
                row_field_Name[9] = "144000"
                cursor.updateRow(row_field_Name)
            elif Sample_type == "Swab":
                row_field_Name[0] = "Swab"
                row_field_Name[1] = "0.12"
                row_field_Name[2] = "0.07"
                row_field_Name[3] = "0.7"
                row_field_Name[4] = "0.89"
                row_field_Name[5] = "21"
                row_field_Name[6] = "219"
                row_field_Name[7] = "0"
                row_field_Name[8] = "0"
                row_field_Name[9] = "4"
                cursor.updateRow(row_field_Name)                

arcpy.AddMessage("Conversion Complete!")                
        
