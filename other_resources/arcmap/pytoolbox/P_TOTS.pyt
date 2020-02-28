import arcpy
import sys,os
import uuid

###############################################################################
class Toolbox(object):

   def __init__(self):

      self.label = "Toolbox";
      self.alias = "TOTS_Toolbox";

      self.tools = [];
      self.tools.append(AddNotes);
      self.tools.append(GenerateRandom);
      self.tools.append(VSPImport);
      self.tools.append(Main);
      self.tools.append(ContaminationResults);

###############################################################################
class AddNotes(object):

   #...........................................................................
   def __init__(self):

      self.label = "Add Notes"
      self.name  = "AddNotes"
      self.description = "Add notes to sample locations"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "Input Sampling Layer"
         ,name          = "Input_Sampling_Layer"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );
      
      #########################################################################
      param1 = arcpy.Parameter(
          displayName   = "Target ObjectID"
         ,name          = "Target_ObjectID"
         ,datatype      = "GPString"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "Notes"
         ,name          = "Notes"
         ,datatype      = "GPString"
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
      fc_sampling = parameters[0].value;
      str_oid     = parameters[1].valueAsText;
      str_notes   = parameters[2].valueAsText;
      
      ary_oid = [int(n) for n in str_oid.split(',')];
      
      #########################################################################
      scratch_full_o = arcpy.CreateScratchName(
          prefix    = "AddNotes"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
      
      arcpy.FeatureClassToFeatureClass_conversion(
          in_features = fc_sampling
         ,out_path    = scratch_path_o
         ,out_name    = scratch_name_o
      );
      
      #########################################################################
      int_cnt = 0;
      with arcpy.da.UpdateCursor(
          in_table    = scratch_full_o
         ,field_names = ["OID@","NOTES"]
      ) as cursor:
      
         for row in cursor:
         
            if row[0] in ary_oid:
               row[1] = str_notes;
               int_cnt += 1;
               
               cursor.updateRow(row);
      
      arcpy.AddMessage("Note recorded on " + str(int_cnt) + " record(s).");

      #########################################################################
      arcpy.SetParameterAsText(3,scratch_full_o);         

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
      
      scratch_full_o = arcpy.CreateScratchName(
          prefix    = "GenerateRandom"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
      
      #########################################################################
      sr = arcpy.Describe(fc_aoi_mask).spatialReference;
      
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
         ,out_feature_class = scratch_full_o
         ,geometry_type     = "ENVELOPE"
         ,group_option      = "NONE"
         ,group_field       = ""
         ,mbg_fields_option = "NO_MBG_FIELDS"
      );
      
      #########################################################################
      flds = arcpy.ListFields(scratch_full_o);
      fldnms = [];
      
      for field in flds:
         if not field.required:
            fldnms.append(field.name);
      
      arcpy.DeleteField_management(scratch_full_o,fldnms);

      #########################################################################
      arcpy.AddMessage("Populating Sampling Metrics...");
      dz_addfields(
          in_table = scratch_full_o
         ,field_description = [
             ["GLOBALID","GUID"    ,"GlobalID",None,None,'']
            ,["TYPE"    ,"TEXT"    ,"Type"    ,255 ,None,'']
            ,["TTPK"    ,"DOUBLE"  ,"TTPK"    ,None,None,'']
            ,["TTC"     ,"DOUBLE"  ,"TTC"     ,None,None,'']
            ,["TTA"     ,"DOUBLE"  ,"TTA"     ,None,None,'']
            ,["TTPS"    ,"DOUBLE"  ,"TTPS"    ,None,None,'']
            ,["LOD_P"   ,"DOUBLE"  ,"LOD_P"   ,None,None,'']
            ,["LOD_NON" ,"DOUBLE"  ,"LOD_NON" ,None,None,'']
            ,["MCPS"    ,"DOUBLE"  ,"MCPS"    ,None,None,'']
            ,["TCPS"    ,"DOUBLE"  ,"TCPS"    ,None,None,'']
            ,["WVPS"    ,"DOUBLE"  ,"WVPS"    ,None,None,'']
            ,["WWPS"    ,"DOUBLE"  ,"WWPS"    ,None,None,'']
            ,["SA"      ,"DOUBLE"  ,"SA"      ,None,None,'']
            ,["AA"      ,"DOUBLE"  ,"AA"      ,None,None,'']
            ,["AC"      ,"LONG"    ,"AC"      ,None,None,'']
            ,["ITER"    ,"LONG"    ,"ITER"    ,None,None,'']
            ,["NOTES"   ,"TEXT"    ,"Notes"   ,2000,None,'']
            ,["ALC"     ,"DOUBLE"  ,"ALC"     ,None,None,'']
            ,["AMC"     ,"DOUBLE"  ,"AMC"     ,None,None,'']
         ]
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
      
      #########################################################################
      scratch_full_o = arcpy.CreateScratchName(
          prefix    = "VSPImport"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
      
      #########################################################################
      # Use the FeatureToPolygon function to form new areas
      arcpy.FeatureToPolygon_management(
          in_features       = fc_vsp
         ,out_feature_class = scratch_full_o
         ,attributes        = "NO_ATTRIBUTES"
      );
      
      cnt = arcpy.GetCount_management(scratch_full_o).getOutput(0);
      arcpy.AddMessage("Created " + str(cnt) + " records from VSP input");
      
      #########################################################################
      flds = arcpy.ListFields(scratch_full_o);
      fldnms = [];
      
      for field in flds:
         if not field.required:
            fldnms.append(field.name);
      
      if len(fldnms) > 0:
         arcpy.DeleteField_management(scratch_full_o,fldnms);

      #########################################################################
      dz_addfields(
          in_table = scratch_full_o
         ,field_description = [
             ["GLOBALID","GUID"    ,"GlobalID",None,None,'']
            ,["TYPE"    ,"TEXT"    ,"Type"    ,255 ,None,'']
            ,["TTPK"    ,"DOUBLE"  ,"TTPK"    ,None,None,'']
            ,["TTC"     ,"DOUBLE"  ,"TTC"     ,None,None,'']
            ,["TTA"     ,"DOUBLE"  ,"TTA"     ,None,None,'']
            ,["TTPS"    ,"DOUBLE"  ,"TTPS"    ,None,None,'']
            ,["LOD_P"   ,"DOUBLE"  ,"LOD_P"   ,None,None,'']
            ,["LOD_NON" ,"DOUBLE"  ,"LOD_NON" ,None,None,'']
            ,["MCPS"    ,"DOUBLE"  ,"MCPS"    ,None,None,'']
            ,["TCPS"    ,"DOUBLE"  ,"TCPS"    ,None,None,'']
            ,["WVPS"    ,"DOUBLE"  ,"WVPS"    ,None,None,'']
            ,["WWPS"    ,"DOUBLE"  ,"WWPS"    ,None,None,'']
            ,["SA"      ,"DOUBLE"  ,"SA"      ,None,None,'']
            ,["AA"      ,"DOUBLE"  ,"AA"      ,None,None,'']
            ,["AC"      ,"LONG"    ,"AC"      ,None,None,'']
            ,["ITER"    ,"LONG"    ,"ITER"    ,None,None,'']
            ,["NOTES"   ,"TEXT"    ,"Notes"   ,2000,None,'']
            ,["ALC"     ,"DOUBLE"  ,"ALC"     ,None,None,'']
            ,["AMC"     ,"DOUBLE"  ,"AMC"     ,None,None,'']
         ]
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
class Main(object):

   #...........................................................................
   def __init__(self):

      self.label = "Main"
      self.name  = "Main"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "Scenario Name"
         ,name          = "Scenario_Name"
         ,datatype      = "GPString"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param1 = arcpy.Parameter(
          displayName   = "Input Sampling Unit"
         ,name          = "Input_Sampling_Unit"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "Contamination Map"
         ,name          = "Contamination_Map"
         ,datatype      = "DEFeatureClass"
         ,parameterType = "Optional"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param3 = arcpy.Parameter(
          displayName   = "Surface Area (ft2)"
         ,name          = "Surface_Area_ft2"
         ,datatype      = "GPDouble"
         ,parameterType = "Optional"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param4 = arcpy.Parameter(
          displayName   = "Number of Available Teams for Sampling"
         ,name          = "Number_of_Available_Teams_for_Sampling"
         ,datatype      = "GPLong"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param5 = arcpy.Parameter(
          displayName   = "Personnel per Sampling Team"
         ,name          = "Personnel_per_Sampling_Team"
         ,datatype      = "GPLong"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param6 = arcpy.Parameter(
          displayName   = "Sampling Team Hours per Shift"
         ,name          = "Sampling_Team_Hours_per_Shift"
         ,datatype      = "GPDouble"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param7 = arcpy.Parameter(
          displayName   = "Sampling Team Shifts per Day"
         ,name          = "Sampling_Team_Shifts_per_Day"
         ,datatype      = "GPDouble"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param8 = arcpy.Parameter(
          displayName   = "Sampling Team Labor Cost"
         ,name          = "Sampling_Team_Labor_Cost"
         ,datatype      = "GPDouble"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param9 = arcpy.Parameter(
          displayName   = "Number of Available Labs for Analysis"
         ,name          = "Number_of_Available_Labs_for_Analysis"
         ,datatype      = "GPLong"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param10 = arcpy.Parameter(
          displayName   = "Analysis Lab Hours per Day"
         ,name          = "Analysis_Lab_Hours_per_Day"
         ,datatype      = "GPDouble"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );
      
      #########################################################################
      param11 = arcpy.Parameter(
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
         ,param3
         ,param4
         ,param5
         ,param6
         ,param7
         ,param8
         ,param9
         ,param10
         ,param11
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
      str_scenario_name    = parameters[0].valueAsText;
      fc_samples_in        = parameters[1].value;
      fc_contamination_map = parameters[2].value;
      num_aoi_area         = parameters[3].value;
      int_available_teams  = parameters[4].value;
      int_personnel        = parameters[5].value;
      num_hours_per_shift  = parameters[6].value;
      num_shifts_per_day   = parameters[7].value;
      num_labor_cost       = parameters[8].value;
      int_sampling_labs    = parameters[9].value;
      num_analysis_hours   = parameters[10].value;
      
      #########################################################################
      scratch_full_c = arcpy.CreateScratchName(
          prefix    = "Contamination"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_c,scratch_name_c = os.path.split(scratch_full_c);
      
      scratch_full_o = arcpy.CreateScratchName(
          prefix    = "TOTSResults"
         ,suffix    = ""
         ,data_type = "Dataset"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_o,scratch_name_o = os.path.split(scratch_full_o);
      
      arcpy.CreateTable_management(
          out_path          = scratch_path_o
         ,out_name          = scratch_name_o
         ,config_keyword    = None
      );
      
      dz_addfields(
          scratch_full_o
         ,[
             ['key'                       ,'TEXT'  ,'Key'                     ,255 ,None,'']
            ,['value_str'                 ,'TEXT'  ,'Value_Str'               ,2000,None,'']
            ,['value_long'                ,'LONG'  ,'Value_Long'              ,None,None,'']
            ,['value_double'              ,'DOUBLE','Value_Double'            ,None,None,'']
            ,['unit'                      ,'TEXT'  ,'Unit'                    ,255 ,None,'']
          ]
      );

      #########################################################################
      # Contaminaton results join
      if fc_contamination_map:
      
         arcpy.SpatialJoin_analysis(
             target_features   = fc_samples_in
            ,join_features     = fc_contamination_map
            ,out_feature_class = scratch_full_c
         );

      #########################################################################
      # Define actual area
      arcpy.CalculateField_management(
          in_table        = fc_samples_in
         ,field           = "AA"
         ,expression      = "!SHAPE.AREA@SQUAREINCHES!"
         ,expression_type = "PYTHON_9.3"
      );

      #########################################################################
      # Count the number of iterations exist in user define samples areas
      fields = ["SA","AA","AC"];

      with arcpy.da.UpdateCursor(fc_samples_in,fields) as cursor:

         for row in cursor:

            row[2] = row[1] / row[0];

            if row[1] < row[0]:
               row[2] = 1;

            cursor.updateRow(row);

      #########################################################################
      fields = ["TTPK","TTC","TTA","TTPS","MCPS","TCPS","WVPS","WWPS","ALC","AMC","AC","ITER"];

      with arcpy.da.UpdateCursor(fc_samples_in,fields) as cursor:

         for row in cursor:

            if row[11] == 0:
               row[0]  = row[0] * row[10];
               row[1]  = row[1] * row[10];
               row[2]  = row[2] * row[10];
               row[3]  = row[3] * row[10];
               row[4]  = row[4] * row[10];
               row[5]  = row[5] * row[10];
               row[6]  = row[6] * row[10];
               row[7]  = row[7] * row[10];
               row[8]  = row[8] * row[10];
               row[9]  = row[9] * row[10];
               row[11] = row[11] + 1;

               cursor.updateRow(row);

      #########################################################################
      # Calculate area total and probability if AOI is > 0
      num_aa_total = 0.00;

      with arcpy.da.SearchCursor(fc_samples_in,"AA") as p:
         for row in p:
            num_aa_total = num_aa_total + row[0];

      #########################################################################
      # Convert to square feet
      num_aa_total = num_aa_total * 0.00694444;

      if num_aoi_area > 0:
         num_prob = float(num_aa_total) / float(num_aoi_area) * 100;

      #########################################################################
      num_ttpk_total    = 0;
      num_ttc_total     = 0;
      num_tta_total     = 0;
      num_ttps_total    = 0;
      num_lod_p_total   = 0;
      num_lod_non_total = 0;
      num_mcps_total    = 0;
      num_tcps_total    = 0;
      num_wvps_total    = 0;
      num_wwps_total    = 0;
      num_sa_total      = 0;
      num_alc_total     = 0;
      num_amc_total     = 0;
      num_ac_total      = 0;
      num_cfu_count     = 0;
      
      fields = ["TTPK","TTC","TTA","TTPS","LOD_P","LOD_NON","MCPS","TCPS","WVPS","WWPS","SA","ALC","AMC","AC"];

      with arcpy.da.SearchCursor(fc_samples_in,fields) as cursor:

         for row in cursor:
            if row[0] is not None:
               num_ttpk_total    += row[0];
            
            if row[1] is not None:
               num_ttc_total     += row[1];
            
            if row[2] is not None:
               num_tta_total     += row[2];
            
            if row[3] is not None:
               num_ttps_total    += row[3];
            
            if row[4] is not None:
               num_lod_p_total   += row[4];
            
            if row[5] is not None:
               num_lod_non_total += row[5];
            
            if row[6] is not None:
               num_mcps_total    += row[6];
            
            if row[7] is not None:
               num_tcps_total    += row[7];
            
            if row[8] is not None:
               num_wvps_total    += row[8];
            
            if row[9] is not None:
               num_wwps_total    += row[9];
            
            if row[10] is not None:
               num_sa_total      += row[10];
            
            if row[11] is not None:
               num_alc_total     += row[11];
            
            if row[12] is not None:
               num_amc_total     += row[12];
            
            if row[13] is not None:
               num_ac_total      += row[13];

      #########################################################################
      int_sampling_hours                = int(int_available_teams) * int(num_hours_per_shift) * int(num_shifts_per_day);
      int_sampling_personnel_day        = int(int_sampling_hours) * int(int_personnel);
      num_sampling_personnel_labor_cost = int(num_labor_cost) / int(int_personnel);

      #new 10.31.19
      num_time_complete_sampling        = (float(num_ttc_total) + float(num_ttpk_total)) / float(int_sampling_hours);
      num_total_sampling_num_labor_cost = float(int_available_teams) * float(int_personnel) * float(num_hours_per_shift) * float(num_shifts_per_day) * float(num_sampling_personnel_labor_cost) * float(num_time_complete_sampling);

      # Calculate Lab Throughput
      num_total_hours                   = int(int_sampling_labs) * int(num_analysis_hours);
      num_throughput_time               = num_tta_total / num_total_hours;

      # Calculate Total Cost and Time
      num_total_cost                    = float(num_total_sampling_num_labor_cost) + float(num_mcps_total) + float(num_alc_total) + float(num_amc_total);

      # Calculate total time. Note: Total Time is the greater of sample collection time or Analysis Total Time.
      # If Analysis Time is equal to or greater than Sampling Total Time then the value reported is total Analysis Time Plus one day.
      # The one day accounts for the time samples get collected and shipped to the lab on day one of the sampling response.
      if float(num_throughput_time) < float(num_time_complete_sampling):
         num_total_time = float(num_time_complete_sampling);

      else:
         num_total_time = float(num_throughput_time) + 1.00;

      arcpy.AddMessage(" ");
      arcpy.AddMessage("TOTS Results:");
      arcpy.AddMessage(" ");
      arcpy.AddMessage("--Summary--");
      arcpy.AddMessage("Total Number of User-Defined Samples: " + str(arcpy.GetCount_management(fc_samples_in).getOutput(0)));
      arcpy.AddMessage("Total Number of Samples: " + str(num_ac_total));
      arcpy.AddMessage("Total Cost ($): " + str(num_total_cost));
      arcpy.AddMessage("Total Time (days): " + str(num_total_time));

      if num_time_complete_sampling > num_throughput_time:
         arcpy.AddMessage("Limiting Time Factor: Sampling");

      elif num_time_complete_sampling < num_throughput_time:
         arcpy.AddMessage("Limiting Time Factor: Analysis");

      arcpy.AddMessage(" ");
      arcpy.AddMessage("--Spatial Information--");
      arcpy.AddMessage("Total Sampled Area (feet): "                                    + str(num_aa_total));

      if num_aoi_area > 0:
         arcpy.AddMessage("User Specified Total AOI (feet): "                           + str(num_aoi_area));
         arcpy.AddMessage("Percent of Area Sampled: "                                   + str("{0:.0f}%".format(num_prob)));

      arcpy.AddMessage(" ");
      arcpy.AddMessage("-- Sampling --");
      arcpy.AddMessage("User Specified Number of Available Teams for Sampling: "        + str(int_available_teams));
      arcpy.AddMessage("User Specified Personnel per Sampling Team: "               + str(int_personnel));
      arcpy.AddMessage("User Specified Sampling Team Hours per Shift: "                 + str(num_hours_per_shift));
      arcpy.AddMessage("User Specified Sampling Team Shifts per Day: "                  + str(num_shifts_per_day));
      arcpy.AddMessage("Sampling Hours per Day: "                                       + str(int_sampling_hours));
      arcpy.AddMessage("Sampling Personnel hours per Day: "                         + str(int_sampling_personnel_day));
      arcpy.AddMessage("User Specified Sampling Team Labor Cost ($): "                  + str(num_labor_cost));
      arcpy.AddMessage("Time to Prepare Kits (person hours): "                          + str(num_ttpk_total));
      arcpy.AddMessage("Time to Collect (person hours): "                               + str(num_ttc_total));
      arcpy.AddMessage("Material Cost: "                                                + str(num_mcps_total));
      arcpy.AddMessage("Sampling Personnel Labor Cost ($): "                        + str(num_sampling_personnel_labor_cost));
      arcpy.AddMessage("Time to Complete Sampling (days): "                             + str(num_time_complete_sampling));
      arcpy.AddMessage("Total Sampling Labor Cost ($): "                                + str(num_total_sampling_num_labor_cost));
      arcpy.AddMessage(" ");
      arcpy.AddMessage("-- Analysis --");
      arcpy.AddMessage("User Specified Number of Available Labs for Analysis: "         + str(int_sampling_labs));
      arcpy.AddMessage("User Specified Analysis Lab Hours per Day: "                    + str(num_analysis_hours));
      arcpy.AddMessage("Time to Complete Analyses (days): "                             + str(num_throughput_time));
      arcpy.AddMessage("Time to Analyze (person hours): "                               + str(num_tta_total));
      arcpy.AddMessage("Analysis Labor Cost ($): "                                      + str(num_alc_total));
      arcpy.AddMessage("Analysis Material Cost ($): "                                   + str(num_amc_total));
      arcpy.AddMessage("Waste volume (L): "                                             + str(num_wvps_total));
      arcpy.AddMessage("Waste Weight (lbs): "                                           + str(num_wwps_total));
      arcpy.AddMessage(" ");

      #########################################################################
      # Write to key/value table
      fields = ["key","value_str","value_long","value_double","unit"];

      with arcpy.da.InsertCursor(scratch_full_o,fields) as cursor:
      
         cursor.insertRow((
             'Total Number of User-Defined Samples'
            ,None
            ,None
            ,arcpy.GetCount_management(fc_samples_in).getOutput(0)
            ,None
         ));
         
         cursor.insertRow((
             'Total Number of Samples'
            ,None
            ,None
            ,num_ac_total
            ,None
         ));
         
         cursor.insertRow((
             'Total Cost'
            ,None
            ,None
            ,num_total_cost
            ,'USD'
         ));
         
         cursor.insertRow((
             'Total Time'
            ,None
            ,None
            ,num_total_time
            ,'Day'
         ));
         
         if num_time_complete_sampling > num_throughput_time:
            ltf = "Sampling";

         elif num_time_complete_sampling < num_throughput_time:
            ltf = "Analysis";
         
         cursor.insertRow((
             'Limiting Time Factor'
            ,ltf
            ,None
            ,None
            ,None
         ));
         
         # Spatial Information
         cursor.insertRow((
             'Total Sampled Area'
            ,None
            ,None
            ,num_aa_total
            ,'sq ft'
         ));

         if num_aoi_area > 0:
         
            cursor.insertRow((
                'User Specified Total AOI'
               ,None
               ,None
               ,num_aoi_area
               ,'sq ft'
            ));
            
            cursor.insertRow((
                'Percent of Area Sampled'
               ,None
               ,None
               ,num_prob
               ,'%'
            ));

         # Sampling
         cursor.insertRow((
             'User Specified Number of Available Teams for Sampling'
            ,None
            ,int_available_teams
            ,None
            ,None
         ));

         cursor.insertRow((
             'User Specified Personnel per Sampling Team'
            ,None
            ,int_personnel
            ,None
            ,None
         ));
        
         cursor.insertRow((
             'User Specified Sampling Team Hours per Shift'
            ,None
            ,None
            ,num_hours_per_shift
            ,None
         ));
         
         cursor.insertRow((
             'User Specified Sampling Team Shifts per Day'
            ,None
            ,None
            ,num_shifts_per_day
            ,None
         ));
         
         cursor.insertRow((
             'Sampling Hours per Day'
            ,None
            ,int_sampling_hours
            ,None
            ,None
         ));
         
         cursor.insertRow((
             'Sampling Personnel hours per Day'
            ,None
            ,int_sampling_personnel_day
            ,None
            ,None
         ));
        
         cursor.insertRow((
             'User Specified Sampling Team Labor Cost'
            ,None
            ,None
            ,num_labor_cost
            ,'USD'
         ));
         
         cursor.insertRow((
             'Time to Prepare Kits'
            ,None
            ,None
            ,num_ttpk_total
            ,'Person Hours'
         ));
         
         cursor.insertRow((
             'Time to Collect'
            ,None
            ,None
            ,num_ttc_total
            ,'Person Hours'
         ));
         
         # Material Cost
         cursor.insertRow((
             'Material Cost'
            ,None
            ,None
            ,num_mcps_total
            ,'USD'
         ));
         
         cursor.insertRow((
             'Sampling Personnel Labor Cost'
            ,None
            ,None
            ,num_sampling_personnel_labor_cost
            ,'USD'
         ));
         
         cursor.insertRow((
             'Time to Complete Sampling'
            ,None
            ,None
            ,num_time_complete_sampling
            ,'Day'
         ));
         
         cursor.insertRow((
             'Total Sampling Labor Cost'
            ,None
            ,None
            ,num_total_sampling_num_labor_cost
            ,'USD'
         ));
      
         # Analysis
         cursor.insertRow((
             'User Specified Number of Available Labs for Analysis'
            ,None
            ,int_sampling_labs
            ,None
            ,None
         ));
         
         cursor.insertRow((
             'User Specified Analysis Lab Hours per Day'
            ,None
            ,None
            ,num_analysis_hours
            ,None
         ));
         
         cursor.insertRow((
             'Time to Complete Analyses'
            ,None
            ,None
            ,num_throughput_time
            ,'Day'
         ));
         
         cursor.insertRow((
             'Time to Analyze'
            ,None
            ,None
            ,num_tta_total
            ,'Person Hours'
         ));
         
         cursor.insertRow((
             'Analysis Labor Cost'
            ,None
            ,None
            ,num_alc_total
            ,'USD'
         ));
         
         cursor.insertRow((
             'Analysis Material Cost'
            ,None
            ,None
            ,num_amc_total
            ,'USD'
         ));
         
         cursor.insertRow((
             'Waste Volume'
            ,None
            ,None
            ,num_wvps_total
            ,'L'
         ));
         
         cursor.insertRow((
             'Waste Weight'
            ,None
            ,None
            ,num_wwps_total
            ,'lbs'
         ));
                  
      #########################################################################
      arcpy.SetParameterAsText(11,scratch_full_o);
      
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
      scratch_full_c = arcpy.CreateScratchName(
          prefix    = "Contamination"
         ,suffix    = ""
         ,data_type = "FeatureClass"
         ,workspace = arcpy.env.scratchGDB
      );
      scratch_path_c,scratch_name_c = os.path.split(scratch_full_c);
      
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
   
