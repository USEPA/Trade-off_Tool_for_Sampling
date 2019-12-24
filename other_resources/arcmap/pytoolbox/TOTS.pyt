import arcpy
from arcpy.sa import *
import sys,os

###############################################################################
class Toolbox(object):

   def __init__(self):

      self.label = "Toolbox";
      self.alias = "AllHazardsWasteLogisticsTool";

      self.tools = [];
      self.tools.append(Notes);
      self.tools.append(Random_TOTS);
      self.tools.append(TOTS);
      self.tools.append(VSP_to_TOTS);

###############################################################################
class Notes(object):

   #...........................................................................
   def __init__(self):

      self.label = "Notes"
      self.name  = "Notes"
      self.description = "Add notes to sample locations"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "Sampling Layer"
         ,name          = "Sampling_Layer"
         ,datatype      = "GPFeatureLayer"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param1 = arcpy.Parameter(
          displayName   = "Notes"
         ,name          = "Notes"
         ,datatype      = "GPString"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
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
      s_layer = parameters[0].value;
      notes   = parameters[1].valueAsText;

      #########################################################################
      arcpy.AddField_management(
          s_layer
         ,"Notes"
         ,"TEXT"
         ,""
         ,""
         ,"200"
      );

      #########################################################################
      arcpy.CalculateField_management(
          in_table        = s_layer
         ,field           = "Notes"
         ,expression      = "'" + notes + "'"
         ,expression_type = "PYTHON_9.3"
         ,code_block      = ""
      );

      arcpy.AddMessage('Note recorded.');

      #########################################################################
      arcpy.SelectLayerByAttribute_management(
          s_layer
         ,"CLEAR_SELECTION"
      );

###############################################################################
class Random_TOTS(object):

   #...........................................................................
   def __init__(self):

      self.label = "Random TOTS"
      self.name  = "Random_TOTS"
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

      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "Sampling Layer"
         ,name          = "Sampling_Layer"
         ,datatype      = "GPFeatureLayer"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param3 = arcpy.Parameter(
          displayName   = "AOI Mask"
         ,name          = "AOI_Mask"
         ,datatype      = "GPFeatureLayer"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
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
      Number_samples  = parameters[0].value;
      Sample_type     = parameters[1].valueAsText;
      Samples         = parameters[2].value;
      Mask            = parameters[3].value;

      Filename        = "Random_Samples.shp";
      desc            = arcpy.Describe(Samples);
      Root            = desc.path;
      Output          = os.path.join(Root,Filename);
      Buffer_Distance = "";

      #########################################################################
      arcpy.Delete_management("in_memory");
      arcpy.AddMessage("Rolling the Dice...");

      #########################################################################
      arcpy.CreateRandomPoints_management(
          out_path                   = "in_memory"
         ,out_name                   = "points"
         ,constraining_feature_class = Mask
         ,constraining_extent        = ""
         ,number_of_points_or_field  = Number_samples
         ,minimum_allowed_distance   = "0 Meters"
         ,create_multipoint_output   = "POINT"
         ,multipoint_size            = "0"
      );

      #########################################################################
      if Sample_type == "Micro Vac":
         Buffer_Distance = "6 Inches";

      elif Sample_type == "Wet Vac":
         Buffer_Distance = "84.85 Inches";

      elif Sample_type == "Sponge":
         Buffer_Distance = "5 Inches";

      elif Sample_type == "Robot":
         Buffer_Distance = "189.73 Inches";

      elif Sample_type == "Agressive Air":
         Buffer_Distance = "54.77 Inches";

      elif Sample_type == "Swab":
         Buffer_Distance = "1 Inches";

      #########################################################################
      arcpy.AddMessage("Creating Features...");
      arcpy.Buffer_analysis(
          in_features              = "in_memory/points"
         ,out_feature_class        = "in_memory/buffer"
         ,buffer_distance_or_field = Buffer_Distance
         ,line_side                = "FULL"
         ,line_end_type            = "ROUND"
         ,dissolve_option          = "NONE"
         ,dissolve_field           = ""
         ,method                   = "PLANAR"
      );

      #########################################################################
      arcpy.MinimumBoundingGeometry_management(
          in_features       = "in_memory/buffer"
         ,out_feature_class = Output
         ,geometry_type     = "ENVELOPE"
         ,group_option      = "NONE"
         ,group_field       = ""
         ,mbg_fields_option = "NO_MBG_FIELDS"
      );

      #########################################################################
      arcpy.AddMessage("Populating Sampling Metrics...");

      fields = [
          ("TYPE"   ,"STRING","0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TTPK"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TTC"    ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TTA"    ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TTPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("LOD_P"  ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("LOD_NON","FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("MCPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TCPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("WVPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("WWPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("SA"     ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("AA"     ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("AC"     ,"LONG"  ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("ITER"   ,"LONG"  ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("Notes"  ,"STRING","0","0","","","NULLABLE","NON_REQUIRED","")
         ,("ALC"    ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("AMC"    ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
      ];

      for field in fields:
         arcpy.AddField_management(*(Output,) + field);

      fields_in_cursor = ["TYPE","TTPK","TTC","TTA","TTPS","MCPS","TCPS","WVPS","WWPS","SA","ALC","AMC"];

      with arcpy.da.UpdateCursor(Output,fields_in_cursor) as cursor:

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
               cursor.updateRow(row_field_Name);

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
               cursor.updateRow(row_field_Name);

      #########################################################################
      mxd = arcpy.mapping.MapDocument("CURRENT")

      # Get the data frame
      df = mxd.activeDataFrame

      # Create a new layer
      newlayer = arcpy.mapping.Layer(Output)

      # Add the layer to the map at the bottom of the TOC in data frame 0
      arcpy.mapping.AddLayer(df, newlayer,"TOP")

      arcpy.AddMessage("Random Samples Complete!");

###############################################################################
class TOTS(object):

   #...........................................................................
   def __init__(self):

      self.label = "TOTS"
      self.name  = "TOTS"
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
          displayName   = "Samples"
         ,name          = "Samples"
         ,datatype      = "GPFeatureLayer"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
      );

      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "Contamination Map"
         ,name          = "Contamination_Map"
         ,datatype      = "GPFeatureLayer"
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
         ,datatype      = "GPLong"
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
          displayName   = "Number_of_Available_Labs_for_Analysis"
         ,name          = "Number of Available Labs for Analysis"
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
      Scenario_Name     = parameters[0].valueAsText;
      Samples           = parameters[1].value;
      # Get description of Samples shapefile to discover path
      desc              = arcpy.Describe(Samples);
      Root              = desc.path;
      Contamination_Map = parameters[2].value;
      AOI_Area          = parameters[3].value;
      Available_Teams   = parameters[4].value;
      Personnel         = parameters[5].value;
      Hours_per_Shift   = parameters[6].value;
      Shifts_per_Day    = parameters[7].value;
      Labor_Cost        = parameters[8].value;
      Sampling_Labs     = parameters[9].value;
      Analysis_Hours    = parameters[10].value;
      Filename          = "output.dbf";

      #########################################################################
      Contamination_Map_Filename = "Contamination_Map_" + Scenario_Name + "_" + time.strftime("%Y%m%d_%H%M%S") + ".shp";
      TOTS_Results_Filename      = "TOTS_Results_" + Scenario_Name + " " + time.strftime("%Y%m%d_%H%M%S") + ".csv";
      Contamination_Output       = os.path.join(Root,Contamination_Map_Filename);
      Output                     = os.path.join(Root,Filename)
      arcpy.AddMessage(Contamination_Output);

      #########################################################################
      env.workspace = "C:/sapyexamples/data";

      # Set local variables
      inZoneData    = Samples;
      zoneField     = "FID";
      inValueRaster = Contamination_Map;

      # Check out the ArcGIS Spatial Analyst extension license
      arcpy.CheckOutExtension("Spatial");

      #########################################################################
      # Execute ZonalStatisticsAsTable
      # Contaminaton results join
      if Contamination_Map:
         arcpy.SpatialJoin_analysis(
             Samples
            ,Contamination_Map
            ,Contamination_Output
         );

      else:
         pass

      #########################################################################
      # Define actual area
      exp = "!SHAPE.AREA@SQUAREINCHES!";
      arcpy.CalculateField_management(
          Samples
         ,"AA"
         ,exp
         ,"PYTHON_9.3"
      );

      #########################################################################
      # Count the number of iterations exist in user define samples areas
      fields_in_cursor = ["SA","AA","AC"];

      with arcpy.da.UpdateCursor(Samples,fields_in_cursor) as cursor:

         for row_field_Name in cursor:

            row_field_Name[2] = row_field_Name[1]/row_field_Name[0];

            if row_field_Name[1] < row_field_Name[0]:
               row_field_Name[2] = 1;

            else:
               pass;

            cursor.updateRow(row_field_Name);

      #########################################################################
      fields_in_cursor = ["TTPK","TTC","TTA","TTPS","MCPS","TCPS","WVPS","WWPS", "ALC", "AMC", "AC","ITER"];

      with arcpy.da.UpdateCursor(Samples,fields_in_cursor) as cursor:

         for row_field_Name in cursor:

            if row_field_Name[11] == 0:
               row_field_Name[0]  = row_field_Name[0] * row_field_Name[10];
               row_field_Name[1]  = row_field_Name[1] * row_field_Name[10];
               row_field_Name[2]  = row_field_Name[2] * row_field_Name[10];
               row_field_Name[3]  = row_field_Name[3] * row_field_Name[10];
               row_field_Name[4]  = row_field_Name[4] * row_field_Name[10];
               row_field_Name[5]  = row_field_Name[5] * row_field_Name[10];
               row_field_Name[6]  = row_field_Name[6] * row_field_Name[10];
               row_field_Name[7]  = row_field_Name[7] * row_field_Name[10];
               row_field_Name[8]  = row_field_Name[8] * row_field_Name[10];
               row_field_Name[9]  = row_field_Name[9] * row_field_Name[10];
               row_field_Name[11] = row_field_Name[11] + 1;

            else:
               pass;

            cursor.updateRow(row_field_Name);

      #########################################################################
      # Calculate area total and probability if AOI is > 0
      AA_Total = 0;
      # Convert string to float
      AOI_Area = float(AOI_Area);

      with arcpy.da.SearchCursor(Samples,"AA") as p:
         for row in p:
            AA_Total = AA_Total + row[0];

      #########################################################################
      # Convert to square feet
      AA_Total = AA_Total * 0.00694444;

      if AOI_Area > 0:
         Prob = float(AA_Total) / float(AOI_Area) * 100;

      else:
         pass;

      #########################################################################
      TTPK_total    = 0;
      TTC_total     = 0;
      TTA_total     = 0;
      TTPS_total    = 0;
      LOD_P_total   = 0;
      LOD_NON_total = 0;
      MCPS_total    = 0;
      TCPS_total    = 0;
      WVPS_total    = 0;
      WWPS_total    = 0;
      SA_total      = 0;
      ALC_total     = 0;
      AMC_total     = 0;
      AC_total      = 0;
      CFU_count     = 0;

      with arcpy.da.SearchCursor(Samples,"TTPK")    as a  \
          ,arcpy.da.SearchCursor(Samples,"TTC")     as b  \
          ,arcpy.da.SearchCursor(Samples,"TTA")     as c  \
          ,arcpy.da.SearchCursor(Samples,"TTPS")    as d  \
          ,arcpy.da.SearchCursor(Samples,"LOD_P")   as e  \
          ,arcpy.da.SearchCursor(Samples,"LOD_NON") as f  \
          ,arcpy.da.SearchCursor(Samples,"MCPS")    as g  \
          ,arcpy.da.SearchCursor(Samples,"TCPS")    as h  \
          ,arcpy.da.SearchCursor(Samples,"WVPS")    as i  \
          ,arcpy.da.SearchCursor(Samples,"WWPS")    as j  \
          ,arcpy.da.SearchCursor(Samples,"SA")      as k  \
          ,arcpy.da.SearchCursor(Samples,"ALC")     as l  \
          ,arcpy.da.SearchCursor(Samples,"AMC")     as m  \
          ,arcpy.da.SearchCursor(Samples,"AC")      as n:

         for row in a:
            TTPK_total = TTPK_total + row[0];

         for row in b:
            TTC_total = TTC_total + row[0];

         for row in c:
            TTA_total = TTA_total + row[0];

         for row in d:
            TTPS_total = TTPS_total + row[0];

         for row in e:
            LOD_P_total = LOD_P_total + row[0];

         for row in f:
            LOD_NON_total = LOD_NON_total + row[0];

         for row in g:
            MCPS_total = MCPS_total + row[0];

         for row in h:
            TCPS_total = TCPS_total + row[0];

         for row in i:
            WVPS_total = WVPS_total + row[0];

         for row in j:
            WWPS_total = WWPS_total + row[0];

         for row in k:
            SA_total = SA_total + row[0];

         for row in l:
            ALC_total = ALC_total + row[0];

         for row in m:
            AMC_total = AMC_total + row[0];

         for row in n:
            AC_total = AC_total + row[0];

      #########################################################################
      Sampling_Hours                = int(Available_Teams) * int(Hours_per_Shift) * int(Shifts_per_Day);
      Sampling_Personnel_Day        = int(Sampling_Hours) * int(Personnel);
      Sampling_Personnel_Labor_Cost = int(Labor_Cost) / int(Personnel);

      #new 10.31.19
      Time_Complete_Sampling        = (float(TTC_total) + float(TTPK_total)) / float(Sampling_Hours);
      Total_Sampling_Labor_Cost     = float(Available_Teams) * float(Personnel) * float(Hours_per_Shift) * float(Shifts_per_Day) * float(Sampling_Personnel_Labor_Cost) * float(Time_Complete_Sampling);

      # Calculate Lab Throughput
      Total_Hours                   = int(Sampling_Labs) * int(Analysis_Hours);
      Throughput_Time               = TTA_total / Total_Hours;

      # Calculate Total Cost and Time
      Total_Cost                    = float(Total_Sampling_Labor_Cost) + float(MCPS_total) + float(ALC_total) + float(AMC_total);

      # Calculate total time. Note: Total Time is the greater of sample collection time or Analysis Total Time.
      # If Analysis Time is equal to or greater than Sampling Total Time then the value reported is total Analysis Time Plus one day.
      # The one day accounts for the time samples get collected and shipped to the lab on day one of the sampling response.
      if float(Throughput_Time) < float(Time_Complete_Sampling):
         Total_Time = float(Time_Complete_Sampling);

      else:
         Total_Time = float(Throughput_Time) + 1.00;

      arcpy.AddMessage(" ");
      arcpy.AddMessage("TOTS Results:");
      arcpy.AddMessage(" ");
      arcpy.AddMessage("--Summary--");
      arcpy.AddMessage("Total Number of User-Defined Samples: " + str(arcpy.GetCount_management(Samples).getOutput(0)));
      arcpy.AddMessage("Total Number of Samples: " + str(AC_total));
      arcpy.AddMessage("Total Cost ($): " + str(Total_Cost));
      arcpy.AddMessage("Total Time (days): " + str(Total_Time));

      if Time_Complete_Sampling > Throughput_Time:
         arcpy.AddMessage("Limiting Time Factor: Sampling");

      elif Time_Complete_Sampling < Throughput_Time:
         arcpy.AddMessage("Limiting Time Factor: Analysis");

      else:
         pass;

      arcpy.AddMessage(" ");
      arcpy.AddMessage("--Spatial Information--");
      arcpy.AddMessage("Total Sampled Area (feet): " + str(AA_Total));

      if AOI_Area > 0:
         arcpy.AddMessage("User Specified Total AOI (feet): " + str(AOI_Area));
         arcpy.AddMessage("Percent of Area Sampled: " + str("{0:.0f}%".format(Prob)));

      else:
         pass

      arcpy.AddMessage(" ");
      arcpy.AddMessage("-- Sampling --");
      arcpy.AddMessage("User Specified Number of Available Teams for Sampling: " + str(Available_Teams));
      arcpy.AddMessage("User Specified Personnel per Sampling Team: " + str(Personnel));
      arcpy.AddMessage("User Specified Sampling Team Hours per Shift: " + str(Hours_per_Shift));
      arcpy.AddMessage("User Specified Sampling Team Shifts per Day: " + str(Shifts_per_Day));
      arcpy.AddMessage("Sampling Hours per Day: " + str(Sampling_Hours));
      arcpy.AddMessage("Sampling Personnel hours per Day: " + str(Sampling_Personnel_Day));
      arcpy.AddMessage("User Specified Sampling Team Labor Cost ($): " + str(Labor_Cost));
      arcpy.AddMessage("Time to Prepare Kits (person hours): " + str(TTPK_total));
      arcpy.AddMessage("Time to Collect (person hours): " + str(TTC_total));
      arcpy.AddMessage("Material Cost: " + str(MCPS_total));
      arcpy.AddMessage("Sampling Personnel Labor Cost ($): " + str(Sampling_Personnel_Labor_Cost));
      arcpy.AddMessage("Time to Complete Sampling (days): " + str(Time_Complete_Sampling));
      arcpy.AddMessage("Total Sampling Labor Cost ($): " + str(Total_Sampling_Labor_Cost));
      arcpy.AddMessage(" ");
      arcpy.AddMessage("-- Analysis --");
      arcpy.AddMessage("User Specified Number of Available Labs for Analysis: " + str(Sampling_Labs));
      arcpy.AddMessage("User Specified Analysis Lab Hours per Day: " + str(Analysis_Hours));
      arcpy.AddMessage("Time to Complete Analyses (days): " + str(Throughput_Time));
      arcpy.AddMessage("Time to Analyze (person hours): " + str(TTA_total));
      arcpy.AddMessage("Analysis Labor Cost ($): " + str(ALC_total));
      arcpy.AddMessage("Analysis Material Cost ($): " + str(AMC_total));
      arcpy.AddMessage("Waste volume (L): " + str(WVPS_total));
      arcpy.AddMessage("Waste Weight (lbs): " + str(WWPS_total));
      arcpy.AddMessage(" ");

      #########################################################################
      # Write to spreadsheet
      with open(os.path.join(Root,TOTS_Results_Filename),'w+') as csvfile:

         csvwriter = csv.writer(csvfile, delimiter=',', lineterminator='\n');
         csvwriter.writerow(["Summary"]);
         csvwriter.writerow([""]);
         csvwriter.writerow(['Total Number of User-Defined Samples: '] + [arcpy.GetCount_management(Samples).getOutput(0)]);
         csvwriter.writerow(['Total Number of Samples: '] + [str(AC_total)]);
         csvwriter.writerow(["Total Cost ($): "] + [str(Total_Cost)]);
         csvwriter.writerow(["Total Time (days): "] + [str(Total_Time)]);

         if Time_Complete_Sampling > Throughput_Time:
            csvwriter.writerow(["Limiting Time Factor: "] + ["Sampling"]);

         elif Time_Complete_Sampling < Throughput_Time:
            csvwriter.writerow(["Limiting Time Factor: "] + ["Analysis"]);

         else:
            pass;

         csvwriter.writerow([""])
         csvwriter.writerow(["Spatial Information"])
         csvwriter.writerow(["Total Sampled Area (feet): "] + [str(AA_Total)])

         if AOI_Area > 0:
            csvwriter.writerow(["User Specified Total AOI (feet): "] + [str(AOI_Area)]);
            csvwriter.writerow(["Percent of Area Sampled: "] + [str("{0:.0f}%".format(Prob))]);

         else:
            pass;

         csvwriter.writerow([""]);
         csvwriter.writerow(["Sampling"]);
         csvwriter.writerow(["User Specified Number of Available Teams for Sampling: "] + [str(Available_Teams)]);
         csvwriter.writerow(["User Specified Personnel per Sampling Team: "] + [str(Personnel)]);
         csvwriter.writerow(["User Specified Sampling Team Hours per Shift: "] + [str(Hours_per_Shift)]);
         csvwriter.writerow(["User Specified Sampling Team Shifts per Day: "] + [str(Shifts_per_Day)]);
         csvwriter.writerow(["Sampling Hours per Day: "] + [str(Sampling_Hours)]);
         csvwriter.writerow(["Sampling Personnel hours per Day: "] + [str(Sampling_Personnel_Day)]);
         csvwriter.writerow(["User Specified Sampling Team Labor Cost ($): "] + [str(Labor_Cost)]);
         csvwriter.writerow(['Time to Prepare Kits (person hours): '] + [str(TTPK_total)]);
         csvwriter.writerow(["Time to Collect (person hours): "] + [str(TTC_total)]);
         csvwriter.writerow(["Material Cost: "] + [str(MCPS_total)]);
         csvwriter.writerow(["Sampling Personnel Labor Cost ($): "] + [str(Sampling_Personnel_Labor_Cost)]);
         csvwriter.writerow(["Time to Complete Sampling (days): "] + [str(Time_Complete_Sampling)]);
         csvwriter.writerow(["Total Sampling Labor Cost ($): "] + [str(Total_Sampling_Labor_Cost)]);
         csvwriter.writerow([""]);
         csvwriter.writerow(["Analysis"]);
         csvwriter.writerow(["User Specified Number of Available Labs for Analysis: "] + [str(Sampling_Labs)]);
         csvwriter.writerow(["User Specified Analysis Lab Hours per Day: "] + [str(Analysis_Hours)]);
         csvwriter.writerow(["Time to Complete Analyses (days)"] + [str(Throughput_Time)]);
         csvwriter.writerow(["Time to Analyze (person hours): "] + [str(TTA_total)]);
         csvwriter.writerow(["Analysis Labor Cost ($): "] + [str(ALC_total)]);
         csvwriter.writerow(["Analysis Material Cost ($): "] + [str(AMC_total)]);
         csvwriter.writerow(["Waste volume (L): "] + [str(WVPS_total)]);
         csvwriter.writerow(["Waste Weight (lbs): "] + [str(WWPS_total)]);
         csvwriter.writerow([""]);

         ######################################################################
         # Contamination results join
         # Write data depending on availability of contamination map
         if Contamination_Map:
            fields = ['FID','TYPE','CFU','Notes'];

            arcpy.AddMessage("-- Sampling Results --");
            with arcpy.da.SearchCursor(Contamination_Output,fields) as q:

               for row in q:

                  if row[2] > 0:
                     CFU_count += 1;
                     arcpy.AddMessage("Sample ID: " + str(row[0]) + ", Sample Type: " + str(row[1]) + ", CFU: " + str(row[2]));

                  else:
                     pass;

            arcpy.AddMessage(" ");
            arcpy.AddMessage(str(CFU_count) + " of " + str(arcpy.GetCount_management(Samples).getOutput(0)) + " Samples Were Positive Detects");

            fields_com = ['Sample ID','Sample Type','CFU','Notes']
            csvwriter.writerow(fields_com)

            with arcpy.da.SearchCursor(Contamination_Output,fields) as s_cursor:

               for row in s_cursor:
                  csvwriter.writerow(row)

               else:
                  fields = ['FID','Notes'];
                  fields_com = ['Sample ID','Notes'];
                  csvwriter.writerow(fields_com);

                  with arcpy.da.SearchCursor(Samples, fields) as s_cursor:

                     for row in s_cursor:
                        csvwriter.writerow(row);

###############################################################################
class VSP_to_TOTS(object):

   #...........................................................................
   def __init__(self):

      self.label = "VSP to TOTS"
      self.name  = "VSP_to_TOTS"
      self.canRunInBackground = False;

   #...........................................................................
   def getParameterInfo(self):

      #########################################################################
      param0 = arcpy.Parameter(
          displayName   = "VSP Shapefile"
         ,name          = "VSP_Shapefile"
         ,datatype      = "GPFeatureLayer"
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

      #########################################################################
      param2 = arcpy.Parameter(
          displayName   = "Sampling Layer"
         ,name          = "Sampling_Layer"
         ,datatype      = "GPFeatureLayer"
         ,parameterType = "Required"
         ,direction     = "Input"
         ,enabled       = True
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
      VSP_shapefile     = parameters[0].value;
      Sample_type       = parameters[1].valueAsText;
      Samples           = parameters[2].value;
      desc              = arcpy.Describe(Samples);
      Root              = desc.path;
      Output            = os.path.join(Root,Filename);

      #########################################################################
      # Use the FeatureToPolygon function to form new areas
      arcpy.FeatureToPolygon_management(
          VSP_shapefile
         ,Output
         ,""
         ,"NO_ATTRIBUTES"
         ,""
      );

      #########################################################################
      fields = [
          ("TYPE"   ,"STRING","0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TTPK"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TTC"    ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TTA"    ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TTPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("LOD_P"  ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("LOD_NON","FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("MCPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("TCPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("WVPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("WWPS"   ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("SA"     ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("AA"     ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("AC"     ,"LONG"  ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("ITER"   ,"LONG"  ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("Notes"  ,"STRING","0","0","","","NULLABLE","NON_REQUIRED","")
         ,("ALC"    ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
         ,("AMC"    ,"FLOAT" ,"0","0","","","NULLABLE","NON_REQUIRED","")
      ];

      for field in fields:
         arcpy.AddField_management(*(Output,) + field);

      #########################################################################
      fields_in_cursor = ["TYPE","TTPK","TTC","TTA","TTPS","MCPS","TCPS","WVPS","WWPS","SA","ALC","AMC"];

      with arcpy.da.UpdateCursor(Output,fields_in_cursor) as cursor:

         for row_field_Name in cursor:

            if Sample_type == 'Micro Vac':
               row_field_Name[0] = "Micro Vac";
               row_field_Name[1] = "0.18";
               row_field_Name[2] = "0.15";
               row_field_Name[3] = "0.8";
               row_field_Name[4] = "1.21";
               row_field_Name[5] = "34.28";
               row_field_Name[6] = "395.84";
               row_field_Name[7] = "0.02";
               row_field_Name[8] = "4.3";
               row_field_Name[9] = "144";
               row_field_Name[10] = "151";
               row_field_Name[11] = "288";
               cursor.updateRow(row_field_Name);

            elif Sample_type == "Wet Vac":
               row_field_Name[0] = "Wet Vac";
               row_field_Name[1] = "0.33";
               row_field_Name[2] = "0.13";
               row_field_Name[3] = "0.8";
               row_field_Name[4] = "1.07";
               row_field_Name[5] = "167";
               row_field_Name[6] = "220";
               row_field_Name[7] = "5";
               row_field_Name[8] = "28.5";
               row_field_Name[9] = "28800";
               row_field_Name[10] = "151";
               row_field_Name[11] = "200";
               cursor.updateRow(row_field_Name);

            elif Sample_type == "Sponge":
               row_field_Name[0] = "Sponge";
               row_field_Name[1] = "0.12";
               row_field_Name[2] = "0.09";
               row_field_Name[3] = "0.7";
               row_field_Name[4] = "0.99";
               row_field_Name[5] = "46.87";
               row_field_Name[6] = "343.03";
               row_field_Name[7] = "0.1";
               row_field_Name[8] = "4.3";
               row_field_Name[9] = "100";
               row_field_Name[10] = "118";
               row_field_Name[11] = "239";
               cursor.updateRow(row_field_Name);

            elif Sample_type == "Robot":
               row_field_Name[0] = "Robot";
               row_field_Name[1] = "0.33";
               row_field_Name[2] = "0.3";
               row_field_Name[3] = "0.7";
               row_field_Name[4] = "1.12";
               row_field_Name[5] = "400";
               row_field_Name[6] = "267";
               row_field_Name[7] = "0.5";
               row_field_Name[8] = "10.5";
               row_field_Name[9] = "144000";
               row_field_Name[10] = "200";
               row_field_Name[11] = "288";
               cursor.updateRow(row_field_Name);

            elif Sample_type == "Agressive Air":
               row_field_Name[0] = "Agressive Air";
               row_field_Name[1] = "0.33";
               row_field_Name[2] = "0.6";
               row_field_Name[3] = "0.5";
               row_field_Name[4] = "1.12";
               row_field_Name[5] = "207";
               row_field_Name[6] = "267";
               row_field_Name[7] = "0.1";
               row_field_Name[8] = "5";
               row_field_Name[9] = "12000";
               row_field_Name[10] = "118";
               row_field_Name[11] = "239";
               cursor.updateRow(row_field_Name);

            elif Sample_type == "Swab":
               row_field_Name[0] = "Swab";
               row_field_Name[1] = "0.12";
               row_field_Name[2] = "0.07";
               row_field_Name[3] = "0.7";
               row_field_Name[4] = "0.89";
               row_field_Name[5] = "21";
               row_field_Name[6] = "219";
               row_field_Name[7] = "0.01";
               row_field_Name[8] = "2";
               row_field_Name[9] = "4";
               row_field_Name[10] = "118";
               row_field_Name[11] = "239";
               cursor.updateRow(row_field_Name);

      #########################################################################
      # Add VSP out to map

      # Get the map document
      mxd = arcpy.mapping.MapDocument("CURRENT");

      # Get the data frame
      df = mxd.activeDataFrame;

      # Create a new layer
      newlayer = arcpy.mapping.Layer(Output);

      # Add the layer to the map at the bottom of the TOC in data frame 0
      arcpy.mapping.AddLayer(df, newlayer,"TOP");

      arcpy.AddMessage("Conversion Complete!");

