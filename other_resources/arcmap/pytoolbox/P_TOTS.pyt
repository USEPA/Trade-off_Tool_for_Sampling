import arcpy
import sys,os
import uuid

###############################################################################
class Toolbox(object):

   def __init__(self):

      self.label = "Toolbox";
      self.alias = "TOTS_Toolbox";

      self.tools = [];
      self.tools.append(GenerateRandom);
      self.tools.append(VSPImport);
      self.tools.append(ContaminationResults);
      self.tools.append(SampleData);
      self.tools.append(Debug);

###############################################################################
class GenerateRandom(object):

   #...........................................................................
   def __init__(self):

      self.label = "Generate Random"
      self.name  = "GenerateRandom"
      self.description = "Generate random samples"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "Number of Samples"
         ,name          = "Number_of_Samples"
         ,datatype      = "GPLong"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param1 = arcpy.Parameter(
          displayName   = "Sample Type"
         ,name          = "Sample_Type"
         ,datatype      = "GPString"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );
      param1.filter.type = "ValueList";
      param1.filter.list = ["Micro Vac","Wet Vac","Sponge","Robot","Aggressive Air","Swab"];

      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "Area of Interest Mask"
         ,name          = "Area_of_Interest_Mask"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );
      
      #########################################################################
      param3 = arcpy.Parameter(
          displayName   = "Output Sampling Unit"
         ,name          = "Output_Sampling_Unit"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Derived"
         ,direction     = "Output"
      );

      params = [
          param0
         ,param1
         ,param2
         ,param3
      ];

      return params;

   #...........................................................................
   def isLicensed(self):

      return True;

   #...........................................................................
   def updateParameters(self,parameters):

      return;

   #...........................................................................
   def updateMessages(self,parameters):

      return;

   #...........................................................................
   def execute(self,parameters,messages):

      #########################################################################
      int_number_samples = parameters[0].value;
      str_sample_type    = parameters[1].valueAsText;
      fc_aoi_mask        = parameters[2].value;

      #########################################################################
      scratch_full_p = arcpy.CreateScratchName(
          prefix    = "Point"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_p,scratch_name_p = os.path.split(scratch_full_p);
      
      scratch_full_b = arcpy.CreateScratchName(
          prefix    = "Buffer"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_b,scratch_name_b = os.path.split(scratch_full_b);
      
      scratch_full_r = arcpy.CreateScratchName(
          prefix    = "GenerateRandom"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_r,scratch_name_r = os.path.split(scratch_full_r);
      
      #########################################################################
      sr = arcpy.Describe(fc_aoi_mask).spatialReference.factoryCode;
      
      if sr != 3857:
      
         scratch_full_mask = arcpy.CreateScratchName(
             prefix    = "TOTS_MASK"
            ,suffix    = ""
            ,data_type = "FeatureClass"
            ,workspace = arcpy.env.scratchGDB
         );
         
         arcpy.Project_management(
             in_dataset      = fc_aoi_mask
            ,out_dataset     = scratch_full_mask
            ,out_coor_system = arcpy.SpatialReference(3857)
         )
            
         fc_aoi_mask = scratch_full_mask;
      
      #########################################################################
      # Licensing information
      # Basic: Requires 3D Analyst or Spatial Analyst
      # Standard: Requires 3D Analyst or Spatial Analyst
      # Advanced: Yes
      arcpy.AddMessage("Generating Points...");
      arcpy.CreateRandomPoints_management(
          out_path                   = scratch_path_p
         ,out_name                   = scratch_name_p
         ,constraining_feature_class = fc_aoi_mask 
         ,number_of_points_or_field  = int_number_samples
         ,minimum_allowed_distance   = "0 Meters"
         ,create_multipoint_output   = "POINT"
         ,multipoint_size            = "0"
      );

      #########################################################################
      if str_sample_type == "Micro Vac":
         str_buffer_distance = "6 Inches";

      elif str_sample_type == "Wet Vac":
         str_buffer_distance = "84.85 Inches";

      elif str_sample_type == "Sponge":
         str_buffer_distance = "5 Inches";

      elif str_sample_type == "Robot":
         str_buffer_distance = "189.73 Inches";

      elif str_sample_type == "Aggressive Air":
         str_buffer_distance = "54.77 Inches";

      elif str_sample_type == "Swab":
         str_buffer_distance = "1 Inches";

      #########################################################################
      arcpy.AddMessage("Creating Features...");
      arcpy.Buffer_analysis(
          in_features              = scratch_full_p
         ,out_feature_class        = scratch_full_b
         ,buffer_distance_or_field = str_buffer_distance
         ,line_side                = "FULL"
         ,line_end_type            = "ROUND"
         ,dissolve_option          = "NONE"
         ,dissolve_field           = ""
         ,method                   = "PLANAR"
      );
      
      #########################################################################
      arcpy.MinimumBoundingGeometry_management(
          in_features       = scratch_full_b
         ,out_feature_class = scratch_full_r
         ,geometry_type     = "ENVELOPE"
         ,group_option      = "NONE"
         ,group_field       = ""
         ,mbg_fields_option = "NO_MBG_FIELDS"
      );
      
      #########################################################################
      (a,b,scratch_full_o) = sampling_scratch_fc(None);
      
      arcpy.Append_management(
          inputs      = scratch_full_r
         ,target      = scratch_full_o
         ,schema_type = "NO_TEST"
      );

      #########################################################################
      arcpy.AddMessage("Populating Sampling Metrics...");
      fields = [
          "GLOBALID"
         ,"TYPE"
         ,"TTPK"
         ,"TTC"
         ,"TTA"
         ,"TTPS"
         ,"MCPS"
         ,"TCPS"
         ,"WVPS"
         ,"WWPS"
         ,"SA"
         ,"ALC"
         ,"AMC"
      ];

      with arcpy.da.UpdateCursor(scratch_full_o,fields) as cursor:

         for row in cursor:

            if str_sample_type == 'Micro Vac':
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Micro Vac";
               row[2]  = 0.18;
               row[3]  = 0.15;
               row[4]  = 0.8;
               row[5]  = 1.21;
               row[6]  = 34.28;
               row[7]  = 395.84;
               row[8]  = 0.02;
               row[9]  = 4.3;
               row[10] = 144;
               row[11] = 151;
               row[12] = 288;
               
            elif str_sample_type == "Wet Vac":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Wet Vac";
               row[2]  = 0.33;
               row[3]  = 0.13;
               row[4]  = 0.8;
               row[5]  = 1.07;
               row[6]  = 167;
               row[7]  = 220;
               row[8]  = 5;
               row[9]  = 28.5;
               row[10] = 28800;
               row[11] = 151;
               row[12] = 200;
               
            elif str_sample_type == "Sponge":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Sponge";
               row[2]  = 0.12;
               row[3]  = 0.09;
               row[4]  = 0.7;
               row[5]  = 0.99;
               row[6]  = 46.87;
               row[7]  = 343.03;
               row[8]  = 0.1;
               row[9]  = 4.3;
               row[10] = 100;
               row[11] = 118;
               row[12] = 239;
               
            elif str_sample_type == "Robot":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Robot";
               row[2]  = 0.33;
               row[3]  = 0.3;
               row[4]  = 0.7;
               row[5]  = 1.12;
               row[6]  = 400;
               row[7]  = 267;
               row[8]  = 0.5;
               row[9]  = 10.5;
               row[10] = 144000;
               row[11] = 200;
               row[12] = 288;
               
            elif str_sample_type == "Aggressive Air":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Aggressive Air";
               row[2]  = 0.33;
               row[3]  = 0.6;
               row[4]  = 0.5;
               row[5]  = 1.12;
               row[6]  = 207;
               row[7]  = 267;
               row[8]  = 0.1;
               row[9]  = 5;
               row[10] = 12000;
               row[11] = 118;
               row[12] = 239;
               
            elif str_sample_type == "Swab":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Swab";
               row[2]  = 0.12;
               row[3]  = 0.07;
               row[4]  = 0.7;
               row[5]  = 0.89;
               row[6]  = 21;
               row[7]  = 219;
               row[8]  = 0.01;
               row[9]  = 2;
               row[10] = 4;
               row[11] = 118;
               row[12] = 239;
            
            cursor.updateRow(row);

      #########################################################################
      arcpy.SetParameterAsText(3,scratch_full_o); 

      arcpy.AddMessage("Random Samples Complete!");
      
###############################################################################
class VSPImport(object):

   #...........................................................................
   def __init__(self):

      self.label = "VSP Import"
      self.name  = "VSPImport"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "Input VSP"
         ,name          = "Input_VSP"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param1 = arcpy.Parameter(
          displayName   = "Sample Type"
         ,name          = "Sample_Type"
         ,datatype      = "GPString"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );
      param1.filter.type = "ValueList";
      param1.filter.list = ["Micro Vac","Wet Vac","Sponge","Robot","Aggressive Air","Swab"];

      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "Output Sampling Unit"
         ,name          = "Output_Sampling_Unit"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Derived"
         ,direction     = "Output"
      );

      params = [
          param0
         ,param1
         ,param2
      ];

      return params;

   #...........................................................................
   def isLicensed(self):

      return True;

   #...........................................................................
   def updateParameters(self,parameters):

      return;

   #...........................................................................
   def updateMessages(self,parameters):

      return;

   #...........................................................................
   def execute(self,parameters,messages):

      #########################################################################
      fc_vsp            = parameters[0].value;
      str_sample_type   = parameters[1].valueAsText;
      
      cnt = int(arcpy.GetCount_management(fc_vsp).getOutput(0));
      
      if cnt == 0:
         arcpy.AddError("No input VSP records found.");
      else:
         arcpy.AddMessage("Processing " + str(cnt) + " incoming records.");       
         
      #########################################################################
      scratch_full_fp = arcpy.CreateScratchName(
          prefix    = "VSPImport"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_fp,scratch_name_fp = os.path.split(scratch_full_fp);
      
      #########################################################################
      # Use the FeatureToPolygon function to form new areas
      arcpy.FeatureToPolygon_management(
          in_features       = fc_vsp
         ,out_feature_class = scratch_full_fp
         ,attributes        = "NO_ATTRIBUTES"
      );
      
      cnt = int(arcpy.GetCount_management(scratch_full_fp).getOutput(0));
      arcpy.AddMessage("Built " + str(cnt) + " polygons from VSP input");
      
      #########################################################################
      (a,b,scratch_full_o) = sampling_scratch_fc(None);
      
      arcpy.Append_management(
          inputs      = scratch_full_fp
         ,target      = scratch_full_o
         ,schema_type = "NO_TEST"
      );

      #########################################################################
      fields = ["GLOBALID","TYPE","TTPK","TTC","TTA","TTPS","MCPS","TCPS","WVPS","WWPS","SA","ALC","AMC"];

      with arcpy.da.UpdateCursor(scratch_full_o,fields) as cursor:

         for row in cursor:

            if str_sample_type == 'Micro Vac':
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Micro Vac";
               row[2]  = 0.18;
               row[3]  = 0.15;
               row[4]  = 0.8;
               row[5]  = 1.21;
               row[6]  = 34.28;
               row[7]  = 395.84;
               row[8]  = 0.02;
               row[9]  = 4.3;
               row[10] = 144;
               row[11] = 151;
               row[12] = 288;

            elif str_sample_type == "Wet Vac":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Wet Vac";
               row[2]  = 0.33;
               row[3]  = 0.13;
               row[4]  = 0.8;
               row[5]  = 1.07;
               row[6]  = 167;
               row[7]  = 220;
               row[8]  = 5;
               row[9]  = 28.5;
               row[10] = 28800;
               row[11] = 151;
               row[12] = 200;
               
            elif str_sample_type == "Sponge":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Sponge";
               row[2]  = 0.12;
               row[3]  = 0.09;
               row[4]  = 0.7;
               row[5]  = 0.99;
               row[6]  = 46.87;
               row[7]  = 343.03;
               row[8]  = 0.1;
               row[9]  = 4.3;
               row[10] = 100;
               row[11] = 118;
               row[12] = 239;
               
            elif str_sample_type == "Robot":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Robot";
               row[2]  = 0.33;
               row[3]  = 0.3;
               row[4]  = 0.7;
               row[5]  = 1.12;
               row[6]  = 400;
               row[7]  = 267;
               row[8]  = 0.5;
               row[9]  = 10.5;
               row[10] = 144000;
               row[11] = 200;
               row[12] = 288;
               
            elif str_sample_type == "Aggressive Air":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Aggressive Air";
               row[2]  = 0.33;
               row[3]  = 0.6;
               row[4]  = 0.5;
               row[5]  = 1.12;
               row[6]  = 207;
               row[7]  = 267;
               row[8]  = 0.1;
               row[9]  = 5;
               row[10] = 12000;
               row[11] = 118;
               row[12] = 239;
               
            elif str_sample_type == "Swab":
               row[0]  = '{' + str(uuid.uuid4()) + '}';
               row[1]  = "Swab";
               row[2]  = 0.12;
               row[3]  = 0.07;
               row[4]  = 0.7;
               row[5]  = 0.89;
               row[6]  = 21;
               row[7]  = 219;
               row[8]  = 0.01;
               row[9]  = 2;
               row[10] = 4;
               row[11] = 118;
               row[12] = 239;
            
            cursor.updateRow(row);

      #########################################################################
      arcpy.SetParameterAsText(2,scratch_full_o);

      arcpy.AddMessage("Conversion Complete!");

###############################################################################
class ContaminationResults(object):

   #...........................................................................
   def __init__(self):

      self.label = "Contamination Results"
      self.name  = "ContaminationResults"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "Input Sampling Unit"
         ,name          = "Input_Sampling_Unit"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param1 = arcpy.Parameter(
          displayName   = "Contamination Map"
         ,name          = "Contamination_Map"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "Output TOTS Results"
         ,name          = "Output_TOTS_Results"
         ,datatype      = "GPTableView"
         ,parameterType = "Derived"
         ,direction     = "Output"
      );

      params = [
          param0
         ,param1
         ,param2
      ];

      return params;

   #...........................................................................
   def isLicensed(self):

      return True;

   #...........................................................................
   def updateParameters(self,parameters):

      return;

   #...........................................................................
   def updateMessages(self,parameters):

      return;

   #...........................................................................
   def execute(self,parameters,messages):

      #########################################################################
      fc_samples_in        = parameters[0].value;
      fc_contamination_map = parameters[1].value;
      
      #########################################################################
      sr = arcpy.Describe(fc_samples_in).spatialReference.factoryCode;
      
      if sr != 3857:
      
         scratch_full_samp = arcpy.CreateScratchName(
             prefix    = "TOTS_SAMP"
            ,suffix    = ""
            ,data_type = "FeatureClass"
            ,workspace = arcpy.env.scratchGDB
         );
         
         arcpy.Project_management(
             in_dataset      = fc_samples_in
            ,out_dataset     = scratch_full_samp
            ,out_coor_system = arcpy.SpatialReference(3857)
         )
            
         fc_samples_in = scratch_full_samp;
         
      #########################################################################
      sr = arcpy.Describe(fc_contamination_map).spatialReference.factoryCode;
      
      if sr != 3857:
      
         scratch_full_mask = arcpy.CreateScratchName(
             prefix    = "TOTS_MASK"
            ,suffix    = ""
            ,data_type = "FeatureClass"
            ,workspace = arcpy.env.scratchGDB
         );
         
         arcpy.Project_management(
             in_dataset      = fc_contamination_map
            ,out_dataset     = scratch_full_mask
            ,out_coor_system = arcpy.SpatialReference(3857)
         )
            
         fc_contamination_map = scratch_full_mask;
      
      #########################################################################
      scratch_full_o = arcpy.CreateScratchName(
          prefix    = "TOTSResults"
         ,suffix    = ""
         ,data_type = "Dataset"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
      
      arcpy.CreateTable_management(
          out_path       = scratch_path_o
         ,out_name       = scratch_name_o
         ,config_keyword = None
      );
      
      dz_addfields(
          in_table = scratch_full_o
         ,field_description = [
             ['GLOBALID'           ,'TEXT'  ,'GlobalID'         ,40  ,None,'']
            ,['TYPE'               ,'TEXT'  ,'Type'             ,255 ,None,'']
            ,['CFU'                ,'LONG'  ,'CFU'              ,None,None,'']
            ,['Notes'              ,'TEXT'  ,'Notes'            ,255 ,None,'']
          ]
      );

      #########################################################################
      # Contamination results join
      scratch_full_c = arcpy.CreateScratchName(
          prefix    = "Contamination"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_c,scratch_name_c = os.path.split(scratch_full_c);
      
      arcpy.SpatialJoin_analysis(
          target_features   = fc_samples_in
         ,join_features     = fc_contamination_map
         ,out_feature_class = scratch_full_c
      );

      #########################################################################
      # Sampling Results
      flds = ['GLOBALID','TYPE','CFU','Notes'];
      
      with arcpy.da.InsertCursor(
          in_table    = scratch_full_o
         ,field_names = flds
      ) as insert_curs:
      
         with arcpy.da.SearchCursor(
             in_table    = scratch_full_c
            ,field_names = flds
         ) as search_curs:
         
            for row in search_curs:
            
               insert_curs.insertRow((
                   row[0]
                  ,row[1]
                  ,row[2]
                  ,row[3]
               ));
                  
      #########################################################################
      arcpy.SetParameterAsText(2,scratch_full_o);
      
###############################################################################
class SampleData(object):

   #...........................................................................
   def __init__(self):

      self.label = "Sample Data"
      self.name  = "SampleData"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "Preset"
         ,name          = "Preset"
         ,datatype      = "GPLong"
         ,parameterType = "Optional"
         ,direction     = "Input"
         ,enabled       = True
      );
      
      #########################################################################
      param1 = arcpy.Parameter(
          displayName   = "Sampling"
         ,name          = "Sampling"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Derived"
         ,direction     = "Output"
      );
      
      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "ContaminationMask"
         ,name          = "ContaminationMask"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Derived"
         ,direction     = "Output"
      );
      
      #########################################################################
      param3 = arcpy.Parameter(
          displayName   = "AreaOfInterest"
         ,name          = "AreaOfInterest"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Derived"
         ,direction     = "Output"
      );
      
      #########################################################################
      param4 = arcpy.Parameter(
          displayName   = "VSP"
         ,name          = "VSP"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Derived"
         ,direction     = "Output"
      );
      
      params = [
          param0
         ,param1
         ,param2
         ,param3
         ,param4
      ];

      return params;

   #...........................................................................
   def isLicensed(self):

      return True;

   #...........................................................................
   def updateParameters(self,parameters):

      return;

   #...........................................................................
   def updateMessages(self,parameters):

      return;

   #...........................................................................
   def execute(self,parameters,messages):

      #########################################################################
      int_preset = parameters[0].value;
      
      #########################################################################
      arcpy.AddMessage("  Building Sampling Feature Class");
      (a,b,scratch_full_sam) = sampling_scratch_fc(int_preset);
      arcpy.AddMessage("  Building Contamination Map Feature Class");
      (a,b,scratch_full_con) = contamination_scratch_fc(int_preset);
      arcpy.AddMessage("  Building Area of Interest Feature Class");
      (a,b,scratch_full_aoi) = aoi_scratch_fc(int_preset);
      arcpy.AddMessage("  Building VSP Feature Class");
      (a,b,scratch_full_vsp) = vsp_scratch_fc(int_preset);

      #########################################################################
      arcpy.SetParameterAsText(1,scratch_full_sam);
      arcpy.SetParameterAsText(2,scratch_full_con);
      arcpy.SetParameterAsText(3,scratch_full_aoi);
      arcpy.SetParameterAsText(4,scratch_full_vsp);
      
###############################################################################
class Debug(object):

   #...........................................................................
   def __init__(self):

      self.label = "Debug"
      self.name  = "Debug"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "Preset"
         ,name          = "Preset"
         ,datatype      = "GPLong"
         ,parameterType = "Optional"
         ,direction     = "Input"
         ,enabled       = True
      );
      
      #########################################################################
      param1 = arcpy.Parameter(
          displayName   = "Precluded"
         ,name          = "Precluded"
         ,datatype      = "GPString"
         ,parameterType = "Derived"
         ,direction     = "Output"
      );
      
      params = [
          param0
         ,param1
      ];

      return params;

   #...........................................................................
   def isLicensed(self):

      return True;

   #...........................................................................
   def updateParameters(self,parameters):

      return;

   #...........................................................................
   def updateMessages(self,parameters):

      return;

   #...........................................................................
   def execute(self,parameters,messages):

      #########################################################################
      int_preset = parameters[0].value;
      
      #########################################################################
      environments = arcpy.ListEnvironments();
      
      str_dump = "";
      for environment in environments:
         str_dump = str_dump + environment + ": " + str(arcpy.env[environment]) + " | ";
         arcpy.AddMessage(environment + ": " + str(arcpy.env[environment]));

      #########################################################################
      arcpy.SetParameter(1,str_dump);


###############################################################################
def sampling_scratch_fc(p_preset):

   scratch_full_o = arcpy.CreateScratchName(
       prefix    = "TOTS_Sampling"
      ,suffix    = ""
      ,data_type = "FeatureClass"
      ,workspace = arcpy.env.scratchGDB
   );
   scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
   
   arcpy.CreateFeatureclass_management(
       out_path          = scratch_path_o
      ,out_name          = scratch_name_o
      ,geometry_type     = "POLYGON"
      ,spatial_reference = arcpy.SpatialReference(3857)
      ,config_keyword    = None
   );
   
   dz_addfields(
       in_table = scratch_full_o
      ,field_description = [
          ['GLOBALID'           ,'TEXT'  ,'GlobalID'                    ,40  ,None,'']
         ,['TYPE'               ,'TEXT'  ,'Sampling Method Type'        ,255 ,None,'']
         ,['TTPK'               ,'DOUBLE','Time to Prepare Kits'        ,None,None,'']
         ,['TTC'                ,'DOUBLE','Time to Collect'             ,None,None,'']
         ,['TTA'                ,'DOUBLE','Time to Analyze'             ,None,None,'']
         ,['TTPS'               ,'DOUBLE','Total Time per Sample'       ,None,None,'']
         ,['LOD_P'              ,'DOUBLE','Limit of Detection Porous'   ,None,None,'']
         ,['LOD_NON'            ,'DOUBLE','Limit of Detection Nonporous',None,None,'']
         ,['MCPS'               ,'DOUBLE','Material Cost per Sample'    ,None,None,'']
         ,['TCPS'               ,'DOUBLE','Total Cost Per Sample'       ,None,None,'']
         ,['WVPS'               ,'DOUBLE','Waste Volume per Sample'     ,None,None,'']
         ,['WWPS'               ,'DOUBLE','Waste Weight per Sample'     ,None,None,'']
         ,['SA'                 ,'DOUBLE','Sampling Surface Area'       ,None,None,'']
         ,['AA'                 ,'DOUBLE','AA'                          ,None,None,'']
         ,['AC'                 ,'LONG'  ,'AC'                          ,None,None,'']
         ,['ITER'               ,'LONG'  ,'ITER'                        ,None,None,'']
         ,['Notes'              ,'TEXT'  ,'Notes'                       ,2000,None,'']
         ,['ALC'                ,'DOUBLE','Analysis Labor Cost'         ,None,None,'']
         ,['AMC'                ,'DOUBLE','Analysis Material Cost'      ,None,None,'']
         ,['SCENARIONAME'       ,'TEXT'  ,'Scenario Name'               ,255 ,None,'']
         ,['CREATEDDATE'        ,'DATE'  ,'Created Date'                ,None,None,'']
         ,['UPDATEDDATE'        ,'DATE'  ,'Updated Date'                ,None,None,'']
         ,['USERNAME'           ,'TEXT'  ,'Username'                    ,255 ,None,'']
         ,['ORGANIZATION'       ,'TEXT'  ,'Organization'                ,255 ,None,'']
         ,['SURFACEAREAUNIT'    ,'TEXT'  ,'Surface Area Unit'           ,255 ,None,'']
         ,['ELEVATIONSERIES'    ,'TEXT'  ,'Elevation Series'            ,255 ,None,'']
       ]
   );
   
   if p_preset is not None:
      jfile = "SAMP" + str(p_preset) + ".json";
      json_file = arcpy.env.packageWorkspace + os.sep + ".." + os.sep + "cd" + os.sep + "pytoolbox" + os.sep + jfile;
      
      if arcpy.Exists(json_file):
         dz_appendjson(
             in_json_file = json_file
            ,out_features = scratch_full_o
         );
         
      else:      
         pathname = os.path.dirname(os.path.realpath(__file__));
         json_file = pathname + os.sep + jfile;

         if arcpy.Exists(json_file):
            dz_appendjson(
                in_json_file = json_file
               ,out_features = scratch_full_o
            );
   
   return (scratch_path_o,scratch_name_o,scratch_full_o);
   
###############################################################################
def contamination_scratch_fc(p_preset):

   scratch_full_o = arcpy.CreateScratchName(
       prefix    = "TOTS_Contamination"
      ,suffix    = ""
      ,data_type = "FeatureClass"
      ,workspace = arcpy.env.scratchGDB
   );
   scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
   
   arcpy.CreateFeatureclass_management(
       out_path          = scratch_path_o
      ,out_name          = scratch_name_o
      ,geometry_type     = "POLYGON"
      ,spatial_reference = arcpy.SpatialReference(3857)
      ,config_keyword    = None
   );
   
   dz_addfields(
       in_table = scratch_full_o
      ,field_description = [
          ['GLOBALID'           ,'TEXT'  ,'GlobalID'                    ,40  ,None,'']
         ,['SCENARIONAME'       ,'TEXT'  ,'Scenario Name'               ,255 ,None,'']
         ,['CFU'                ,'DOUBLE','CFU'                         ,255 ,None,'']
         ,['NOTES'              ,'TEXT'  ,'Notes'                       ,255 ,None,'']
       ]
   );
   
   if p_preset is not None:
      jfile = "CMAP" + str(p_preset) + ".json";
      json_file = arcpy.env.packageWorkspace + os.sep + ".." + os.sep + "cd" + os.sep + "pytoolbox" + os.sep + jfile;
      
      if arcpy.Exists(json_file):
         dz_appendjson(
             in_json_file = json_file
            ,out_features = scratch_full_o
         );
         
      else:      
         pathname = os.path.dirname(os.path.realpath(__file__));
         json_file = pathname + os.sep + jfile;
         
         if arcpy.Exists(json_file):
            dz_appendjson(
                in_json_file = json_file
               ,out_features = scratch_full_o
            );
   
   return (scratch_path_o,scratch_name_o,scratch_full_o);
   
###############################################################################
def aoi_scratch_fc(p_preset):

   scratch_full_o = arcpy.CreateScratchName(
       prefix    = "TOTS_AOI"
      ,suffix    = ""
      ,data_type = "FeatureClass"
      ,workspace = arcpy.env.scratchGDB
   );
   scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
   
   arcpy.CreateFeatureclass_management(
       out_path          = scratch_path_o
      ,out_name          = scratch_name_o
      ,geometry_type     = "POLYGON"
      ,spatial_reference = arcpy.SpatialReference(3857)
      ,config_keyword    = None
   );
   
   dz_addfields(
       in_table = scratch_full_o
      ,field_description = [
          ['GLOBALID'           ,'TEXT'  ,'GlobalID'                    ,40  ,None,'']
         ,['SCENARIONAME'       ,'TEXT'  ,'Scenario Name'               ,255 ,None,'']
         ,['NOTES'              ,'TEXT'  ,'Notes'                       ,255 ,None,'']
       ]
   );
   
   if p_preset is not None:
      jfile = "AOI" + str(p_preset) + ".json";
      json_file = arcpy.env.packageWorkspace + os.sep + ".." + os.sep + "cd" + os.sep + "pytoolbox" + os.sep + jfile;
      
      if arcpy.Exists(json_file):
         dz_appendjson(
             in_json_file = json_file
            ,out_features = scratch_full_o
         );
         
      else:      
         pathname = os.path.dirname(os.path.realpath(__file__));
         json_file = pathname + os.sep + jfile;
         
         if arcpy.Exists(json_file):
            dz_appendjson(
                in_json_file = json_file
               ,out_features = scratch_full_o
            );

   return (scratch_path_o,scratch_name_o,scratch_full_o);
   
###############################################################################
def vsp_scratch_fc(p_preset):

   scratch_full_o = arcpy.CreateScratchName(
       prefix    = "TOTS_VSP"
      ,suffix    = ""
      ,data_type = "FeatureClass"
      ,workspace = arcpy.env.scratchGDB
   );
   scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
   
   arcpy.CreateFeatureclass_management(
       out_path          = scratch_path_o
      ,out_name          = scratch_name_o
      ,geometry_type     = "POLYLINE"
      ,spatial_reference = arcpy.SpatialReference(3857)
      ,config_keyword    = None
   );
   
   dz_addfields(
       in_table = scratch_full_o
      ,field_description = [
          ['ID'                 ,'LONG'  ,'ID'                          ,None,None,'']
         ,['AREA_ID'            ,'LONG'  ,'Area_ID'                     ,None,None,'']
         ,['X'                  ,'DOUBLE','X'                           ,None,None,'']
         ,['Y'                  ,'DOUBLE','Y'                           ,None,None,'']
         ,['Z'                  ,'DOUBLE','Z'                           ,None,None,'']
         ,['LX'                 ,'DOUBLE','LX'                          ,None,None,'']
         ,['LY'                 ,'DOUBLE','LY'                          ,None,None,'']
         ,['SURFACE'            ,'TEXT'  ,'Surface'                     ,32  ,None,'']
         ,['ROW'                ,'SHORT' ,'Row'                         ,None,None,'']
         ,['COLUMN'             ,'SHORT' ,'Column'                      ,None,None,'']
         ,['NETWORK'            ,'SHORT' ,'Network'                     ,None,None,'']
         ,['ITERATION'          ,'SHORT' ,'Iteration'                   ,None,None,'']
         ,['LABEL'              ,'TEXT'  ,'Label'                       ,40  ,None,'']
         ,['VALUE'              ,'TEXT'  ,'Value'                       ,14  ,None,'']
       ]
   );
   
   if p_preset is not None:
      jfile = "VSP" + str(p_preset) + ".json";
      json_file = arcpy.env.packageWorkspace + os.sep + ".." + os.sep + "cd" + os.sep + "pytoolbox" + os.sep + jfile;
      
      if arcpy.Exists(json_file):
         dz_appendjson(
             in_json_file = json_file
            ,out_features = scratch_full_o
         );
         
      else:      
         pathname = os.path.dirname(os.path.realpath(__file__));
         json_file = pathname + os.sep + jfile;
         
         if arcpy.Exists(json_file):
            dz_appendjson(
                in_json_file = json_file
               ,out_features = scratch_full_o
            );      

   return (scratch_path_o,scratch_name_o,scratch_full_o);

###############################################################################
def dz_addfields(in_table,field_description):

   if (sys.version_info > (3,0)):
      arcpy.management.AddFields(
          in_table = in_table
         ,field_description = field_description
      );
   
   else:
      for fld in field_description:      
         arcpy.AddField_management(
             in_table     = in_table
            ,field_name   = fld[0]
            ,field_type   = fld[1]
            ,field_alias  = fld[2]
            ,field_length = fld[3]
            ,field_domain = fld[5]
         );
   
###############################################################################
def dz_appendjson(in_json_file,out_features):

   scratch_full_o = arcpy.CreateScratchName(
       prefix    = "TOTS_APPEND"
      ,suffix    = ""
      ,data_type = "FeatureClass"
      ,workspace = arcpy.env.scratchGDB
   );
   scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);

   arcpy.JSONToFeatures_conversion(
       in_json_file = in_json_file
      ,out_features = scratch_full_o
   );
   
   arcpy.Append_management(
       inputs = scratch_full_o
      ,target = out_features
   );
   
   
   
   
   
   
   
   
   
   