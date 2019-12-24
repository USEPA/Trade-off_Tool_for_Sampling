import arcpy
arcpy.env.workspace = ""

s_layer = arcpy.GetParameterAsText(0)
notes = arcpy.GetParameterAsText(1)

arcpy.AddField_management(s_layer, "Notes", "TEXT", "", "", "200")
#arcpy.CalculateField_management(s_layer, "Notes", 
#                                "notes", "PYTHON3")
arcpy.CalculateField_management(in_table=s_layer, field="Notes", expression= "'" + notes + "'", expression_type="PYTHON_9.3", code_block="")

arcpy.AddMessage(' ')
arcpy.AddMessage(' ')
arcpy.AddMessage(' ')
arcpy.AddMessage(' ')
arcpy.AddMessage(' ')
arcpy.AddMessage('Note recorded. Press Close to continue')
arcpy.AddMessage(' ')
arcpy.AddMessage(' ')
arcpy.AddMessage(' ')
arcpy.AddMessage(' ')
arcpy.AddMessage(' ')

arcpy.SelectLayerByAttribute_management(s_layer, "CLEAR_SELECTION")
