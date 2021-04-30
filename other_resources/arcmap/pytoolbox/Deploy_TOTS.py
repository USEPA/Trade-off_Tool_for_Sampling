from __future__ import print_function;

import arcpy
import os,sys
import __builtin__
import xml.dom.minidom as DOM;

#------------------------------------------------------------------------------
#
str_script   = "GP Deployment Script";
num_version  = 3.0;
str_author   = "Paul Dziemiela, Eastern Research Group";
str_last_mod = "August 11, 2017";
#
#------------------------------------------------------------------------------
arcpy.AddMessage(" ");
arcpy.AddMessage(str_script);
arcpy.AddMessage("Version: " + str(num_version));
arcpy.AddMessage(" ");

#------------------------------------------------------------------------------
# Step 10
# Collect AGS catalog connection
#------------------------------------------------------------------------------
catalog = None;

arcpy.AddMessage("Verifying connections...");

if len(sys.argv) > 1:
   catalog = sys.argv[1];

if catalog is None:
   print(" Please provide your ArcCatalog AGS connection as parameter one.");
   print(" ");
   exit(-1);

if catalog[-4:] != ".ags":
   catalog = catalog + ".ags"
   
if catalog[1:2] == ':':
   ags_con = catalog;
else:
   ags_con = "GIS Servers\\" + catalog;

if not arcpy.Exists(ags_con):
   print(" Connection named GIS Servers\\" + catalog + " not found.");
   print(" ");
   exit(-1);
    
arcpy.AddMessage(" Service will be deployed to " + ags_con);
   
###############################################################################
#                                                                             #
#  Set the service parameters                                                 #
#  This section is generally editable                                         #
#                                                                             #
#

draft_service_name   = "TOTS";
draft_folder_name    = "ORD";
draft_summary        = "The TOTS support service provides utility functionality for EPA's Trade-Off Tool for Sampling."
draft_tags           = "EPA";
draft_execution_type = "Synchronous";
draft_max_records    = 100000;
draft_maxUsageTime   = 1200;
draft_maxWaitTime    = 1200;
draft_maxIdleTime    = 1800;
draft_minInstances   = 1;
draft_maxInstances   = 2;
   
draft_copy_data_to_server = True;
draft_result_map_server   = False;

# Hash of any additional general properties to be applied to the sddraft file
ags_properties = {}

# Hash of services to enable or disable
ags_services = {
    'WPSServer': False
}

# Array of Hash of properties to be applied to individual services
ags_service_props = {}

#                                                                             #
# No further changes should be necessary                                      #
###############################################################################

#------------------------------------------------------------------------------
# Step 30
# Import the toolbox
#------------------------------------------------------------------------------
arcpy.AddMessage("Importing the toolbox...");
try:
   tb = arcpy.ImportToolbox(
      sys.path[0] + "\\M_TOTS.tbx"
   );

except Exception as err:
   arcpy.AddError(err)
   exit -1;

#------------------------------------------------------------------------------
#- Step 40
#- Dry Run Individual Services to generate results file
#------------------------------------------------------------------------------
arcpy.AddMessage(" Dry run for SampleData...");
resultSD = tb.SampleData(
   Preset                  = 1
);
Sampling          = str(resultSD.getOutput(0));
ContaminationMask = str(resultSD.getOutput(1));
AreaOfInterest    = str(resultSD.getOutput(2));
VSP               = str(resultSD.getOutput(3));
arcpy.AddMessage(" Success.");

arcpy.AddMessage(" Dry run for GenerateRandom...");
resultGR = tb.GenerateRandom(
    Number_of_Samples      = 30
   ,Sample_Type            = "Micro Vac"
   ,Area_of_Interest_Mask  = AreaOfInterest
);
arcpy.AddMessage(" Success.");

arcpy.AddMessage(" Dry run for VSPImport...");
resultVSP = tb.VSPImport(
    Input_VSP              = VSP
   ,Sample_Type            = "Micro Vac"
);
arcpy.AddMessage(" Success.");

arcpy.AddMessage(" Dry run for ContaminationResults...");
resultCR = tb.ContaminationResults(
    Input_Sampling_Unit    = Sampling
   ,Contamination_Map      = ContaminationMask
);
arcpy.AddMessage(" Success.");

arcpy.AddMessage("Done.");
arcpy.AddMessage(" ");

#------------------------------------------------------------------------------
#- Step 50
#- Create the sddraft file
#------------------------------------------------------------------------------
arcpy.AddMessage("Generating sddraft file...");
try:
   sd = arcpy.CreateScratchName(
       "GeoplatformDrainageAreaDelineation"
      ,".sd"
      ,None
      ,arcpy.env.scratchFolder
   );
   
   sddraft = arcpy.CreateScratchName(
       "GeoplatformDrainageAreaDelineation"
      ,".sddraft"
      ,None
      ,arcpy.env.scratchFolder
   );
   
   arcpy.CreateGPSDDraft(
       result               = [resultGR,resultVSP,resultCR]
      ,out_sddraft          = sddraft
      ,service_name         = draft_service_name
      ,server_type          = "ARCGIS_SERVER"
      ,connection_file_path = ags_con
      ,copy_data_to_server  = draft_copy_data_to_server
      ,folder_name          = draft_folder_name
      ,summary              = draft_summary
      ,tags                 = draft_tags
      ,executionType        = draft_execution_type
      ,resultMapServer      = draft_result_map_server
      ,showMessages         = "INFO"
      ,maximumRecords       = draft_max_records
      ,minInstances         = draft_minInstances
      ,maxInstances         = draft_maxInstances
      ,maxUsageTime         = draft_maxUsageTime
      ,maxWaitTime          = draft_maxWaitTime
      ,maxIdleTime          = draft_maxIdleTime
   );
   
except arcpy.ExecuteError:
   print(arcpy.GetMessages(2));
   
arcpy.AddMessage("Done.");
arcpy.AddMessage(" ");

#------------------------------------------------------------------------------
#- Step 60
#- Analyze the SD
#------------------------------------------------------------------------------
arcpy.AddMessage("Analyzing service definition...");
analysis = arcpy.mapping.AnalyzeForSD(sddraft);

if analysis["errors"] != {}:
   print("---- ERRORS ----");
   vars = analysis["errors"]
   for ((message, code), layerlist) in vars.iteritems():
      print("    ", message, ' (CODE %i)' % code);
      if len(layerlist) > 0:
         print("       applies to:");
         for layer in layerlist:
            print(layer.name);
         print(" ");

if analysis["warnings"] != {}:
   print("---- WARNINGS ----");
   vars = analysis["warnings"]
   for ((message, code), layerlist) in vars.iteritems():
      print("    ", message, ' (CODE %i)' % code);
      if len(layerlist) > 0:
         print("       applies to:");
         for layer in layerlist:
            print(layer.name);
         print(" ");
         
if analysis["messages"] != {}:
   print("---- MESSAGES ----");
   vars = analysis["messages"]
   for ((message, code), layerlist) in vars.iteritems():
      print("    ", message, ' (CODE %i)' % code);
      if len(layerlist) > 0:
         print("       applies to:");
         for layer in layerlist:
            print(layer.name);
         print(" ");
         
if analysis['errors'] == {}:
   arcpy.AddMessage(" No errors found.");
else:
   print(" ");
   print(" Service Errors must be corrected. Exiting.");
   exit(-1);

arcpy.AddMessage("Done.");
arcpy.AddMessage(" ");

#------------------------------------------------------------------------------
#- Step 70
#- Alter the sddraft file 
#------------------------------------------------------------------------------
def soe_enable(doc,soe,value):
   typeNames = doc.getElementsByTagName('TypeName');
   
   for typeName in typeNames:
      if typeName.firstChild.data == soe:
         extension = typeName.parentNode
         for extElement in extension.childNodes:
            if extElement.tagName == 'Enabled':
               if value is True:
                  extElement.firstChild.data = 'true';
               else:
                  extElement.firstChild.data = 'false';
                  
   return doc;
   
def srv_property(doc,property,value):
   keys = doc.getElementsByTagName('Key')
   for key in keys:
      if key.hasChildNodes():
         if key.firstChild.data == property:
            if value is True:
               key.nextSibling.firstChild.data = 'true';
            elif value is False:
               key.nextSibling.firstChild.data = 'false';
            else:
               key.nextSibling.firstChild.data = value
   return doc;

def soe_property(doc,soe,soeProperty,soePropertyValue):
   typeNames = doc.getElementsByTagName('TypeName');
   
   for typeName in typeNames:
       if typeName.firstChild.data == soe:
           extension = typeName.parentNode
           for extElement in extension.childNodes:
               if extElement.tagName in ['Props','Info']:
                   for propArray in extElement.childNodes:
                       for propSet in propArray.childNodes:
                           for prop in propSet.childNodes:
                               if prop.tagName == "Key":
                                   if prop.firstChild.data == soeProperty:
                                       if prop.nextSibling.hasChildNodes():
                                           prop.nextSibling.firstChild.data = soePropertyValue
                                       else:
                                           txt = doc.createTextNode(soePropertyValue)
                                           prop.nextSibling.appendChild(txt)
   return doc;
   

arcpy.AddMessage("Altering sddraft as needed...");       
doc = DOM.parse(sddraft)
for k, v in ags_properties.iteritems():
   doc = srv_property(doc,k,v);
for k, v in ags_services.iteritems():
   doc = soe_enable(doc,k,v);
for k, v in ags_service_props.iteritems():
   doc = soe_property(doc,k,v.keys()[0],v.values()[0]);
f = open(sddraft, 'w');
doc.writexml(f);
f.close();

arcpy.AddMessage("Done.");
arcpy.AddMessage(" ");

#------------------------------------------------------------------------------
#- Step 80
#- Generate sd file and deploy the service
#------------------------------------------------------------------------------ 
arcpy.AddMessage("Generating sd file..."); 
arcpy.StageService_server(sddraft,sd);
arcpy.AddMessage("Done.");
arcpy.AddMessage(" ");
    
arcpy.AddMessage("Deploying to ArcGIS Server..."); 
arcpy.UploadServiceDefinition_server(sd,ags_con);
arcpy.AddMessage("Deployment Complete.");
arcpy.AddMessage(" ");


