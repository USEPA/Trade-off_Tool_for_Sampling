# -*- coding: utf-8 -*-
# TOTS 1a 7/18

# Import system modules
import arcpy, os, csv, time, pythonaddins
from arcpy import env
from arcpy.sa import *

# Allow overwrite
arcpy.env.overwriteOutput = True

# Script arguments
Scenario_Name = arcpy.GetParameterAsText(0)
Samples = arcpy.GetParameterAsText(1)
# Get description of Samples shapefile to discover path
desc = arcpy.Describe(Samples)
Root = desc.path
Contamination_Map = arcpy.GetParameterAsText(2)
AOI_Area = arcpy.GetParameterAsText(3)
Available_Teams = arcpy.GetParameterAsText(4)
Personnel = arcpy.GetParameterAsText(5)
Hours_per_Shift = arcpy.GetParameterAsText(6)
Shifts_per_Day = arcpy.GetParameterAsText(7)
Labor_Cost = arcpy.GetParameterAsText(8)
Sampling_Labs = arcpy.GetParameterAsText(9)
Analysis_Hours = arcpy.GetParameterAsText(10)
Filename = "output.dbf"

# Output files
Contamination_Map_Filename = "Contamination_Map_" + Scenario_Name + "_" + time.strftime("%Y%m%d_%H%M%S") + ".shp"
TOTS_Results_Filename = "TOTS_Results_" + Scenario_Name + " " + time.strftime("%Y%m%d_%H%M%S") + ".csv"
Contamination_Output = os.path.join(Root, Contamination_Map_Filename)
arcpy.AddMessage(Contamination_Output)

Output = os.path.join(Root, Filename)

# Set environment settings
env.workspace = "C:/sapyexamples/data"

# Set local variables
inZoneData = Samples
zoneField = "FID"
inValueRaster = Contamination_Map


# Check out the ArcGIS Spatial Analyst extension license
arcpy.CheckOutExtension("Spatial")

# Execute ZonalStatisticsAsTable
# Contaminaton results join
if Contamination_Map:
        arcpy.SpatialJoin_analysis(Samples, Contamination_Map, Contamination_Output)
else:
        pass

#not sure if this is needed, but give a unique count of sample methods...
#row_count = len(list(i for i in arcpy.da.SearchCursor(Samples, 'TYPE', "TYPE = 'Wet Vac'")))
#arcpy.AddMessage(row_count)
#row_count = len(list(i for i in arcpy.da.SearchCursor(Samples, 'TYPE', "TYPE = 'Robot'")))
#arcpy.AddMessage(row_count)
#row_count = len(list(i for i in arcpy.da.SearchCursor(Samples, 'TYPE', "TYPE = 'Aggressive Air'")))
#arcpy.AddMessage(row_count)

# Define actual area
exp = "!SHAPE.AREA@SQUAREINCHES!"
arcpy.CalculateField_management(Samples, "AA", exp, "PYTHON_9.3")

# Count the number of iterations exist in user define samples areas

fields_in_cursor = ["SA","AA","AC"]
with arcpy.da.UpdateCursor(Samples, fields_in_cursor) as cursor:
    for row_field_Name in cursor:
            row_field_Name[2] = row_field_Name[1]/row_field_Name[0]
            if row_field_Name[1] < row_field_Name[0]:
                row_field_Name[2] = 1
            else:
                pass
            cursor.updateRow(row_field_Name)

fields_in_cursor = ["TTPK","TTC","TTA","TTPS","MCPS","TCPS","WVPS","WWPS", "ALC", "AMC", "AC","ITER"]
with arcpy.da.UpdateCursor(Samples, fields_in_cursor) as cursor:
    for row_field_Name in cursor:
            if row_field_Name[11] == 0:
                    row_field_Name[0] = row_field_Name[0]*row_field_Name[10]
                    row_field_Name[1] = row_field_Name[1]*row_field_Name[10]
                    row_field_Name[2] = row_field_Name[2]*row_field_Name[10]
                    row_field_Name[3] = row_field_Name[3]*row_field_Name[10]
                    row_field_Name[4] = row_field_Name[4]*row_field_Name[10]
                    row_field_Name[5] = row_field_Name[5]*row_field_Name[10]
                    row_field_Name[6] = row_field_Name[6]*row_field_Name[10]
                    row_field_Name[7] = row_field_Name[7]*row_field_Name[10]
                    row_field_Name[8] = row_field_Name[8]*row_field_Name[10]
                    row_field_Name[9] = row_field_Name[9]*row_field_Name[10]                    
                    row_field_Name[11] = row_field_Name[11]+1
            else:
                    pass
            cursor.updateRow(row_field_Name)

# Calculate area total and probability if AOI is > 0
AA_Total = 0
# Convert string to float
AOI_Area = float(AOI_Area)
with arcpy.da.SearchCursor(Samples, "AA") as p:
        for row in p:
                AA_Total = AA_Total + row[0]
# Convert to square feet
AA_Total = AA_Total * 0.00694444
if AOI_Area > 0:
        Prob = float(AA_Total) / float(AOI_Area) * 100
else:
        pass

TTPK_total = 0
TTC_total = 0
TTA_total = 0
TTPS_total = 0
LOD_P_total = 0
LOD_NON_total = 0
MCPS_total = 0
TCPS_total = 0
WVPS_total = 0
WWPS_total = 0
SA_total = 0
ALC_total = 0
AMC_total = 0
AC_total = 0
CFU_count = 0

with arcpy.da.SearchCursor(Samples, "TTPK") as a, arcpy.da.SearchCursor(Samples, "TTC") as b, arcpy.da.SearchCursor(Samples, "TTA") as c, arcpy.da.SearchCursor(Samples, "TTPS") as d, arcpy.da.SearchCursor(Samples, "LOD_P") as e, arcpy.da.SearchCursor(Samples, "LOD_NON") as f, arcpy.da.SearchCursor(Samples, "MCPS") as g, arcpy.da.SearchCursor(Samples, "TCPS") as h, arcpy.da.SearchCursor(Samples, "WVPS") as i, arcpy.da.SearchCursor(Samples, "WWPS") as j, arcpy.da.SearchCursor(Samples, "SA") as k, arcpy.da.SearchCursor(Samples, "ALC") as l, arcpy.da.SearchCursor(Samples, "AMC") as m, arcpy.da.SearchCursor(Samples, "AC") as n:
    for row in a:
        TTPK_total = TTPK_total + row[0]
    for row in b:
        TTC_total = TTC_total + row[0]
    for row in c:
        TTA_total = TTA_total + row[0]
    for row in d:
        TTPS_total = TTPS_total + row[0]
    for row in e:
        LOD_P_total = LOD_P_total + row[0]
    for row in f:
        LOD_NON_total = LOD_NON_total + row[0]
    for row in g:
        MCPS_total = MCPS_total + row[0]
    for row in h:
        TCPS_total = TCPS_total + row[0]
    for row in i:
        WVPS_total = WVPS_total + row[0]
    for row in j:
        WWPS_total = WWPS_total + row[0]
    for row in k:
        SA_total = SA_total + row[0]
    for row in l:
        ALC_total = ALC_total + row[0]
    for row in m:
        AMC_total = AMC_total + row[0]
    for row in n:
        AC_total = AC_total + row[0]

# Contamination results join if contamination map available
#if Contamination_Map:
#        arcpy.AddMessage('Contamination Detected')
#        inFeatures = Samples
#        joinField = "FID"
#        joinField_table = "FID_"
#        joinTable = Output
#        fieldList = ["MEAN"]
#        # Delete MEAN if it exists
#        arcpy.DeleteField_management(inFeatures, "MEAN")
#        # Join MEAN to Sample results
#        arcpy.JoinField_management (inFeatures, joinField, joinTable, joinField_table, fieldList)
#else:
#        pass

#Calculate Sampling Resource Demand
#Available_Teams = arcpy.GetParameterAsText(4)
#Personnel = arcpy.GetParameterAsText(5)
#Hours_per_Shift = arcpy.GetParameterAsText(6)
#Shifts_per_Day = arcpy.GetParameterAsText(7)
#Labor_Cost = arcpy.GetParameterAsText(8)

Sampling_Hours = int(Available_Teams) * int(Hours_per_Shift) * int(Shifts_per_Day)
Sampling_Personnel_Day = int(Sampling_Hours) * int(Personnel)
Sampling_Personnel_Labor_Cost = int(Labor_Cost) / int(Personnel)

#new 10.31.19

Time_Complete_Sampling = (float(TTC_total)+ float(TTPK_total))/float(Sampling_Hours)

Total_Sampling_Labor_Cost = float(Available_Teams) * float(Personnel) * float(Hours_per_Shift) * float(Shifts_per_Day) * float(Sampling_Personnel_Labor_Cost) * float(Time_Complete_Sampling)

# Calculate Lab Throughput
Total_Hours = int(Sampling_Labs)*int(Analysis_Hours)
Throughput_Time = TTA_total/Total_Hours

# Calculate Total Cost and Time
Total_Cost = float(Total_Sampling_Labor_Cost) + float(MCPS_total) + float(ALC_total) + float(AMC_total)

# Calculate total time. Note: Total Time is the greater of sample collection time or Analysis Total Time. If Analysis Time is equal to or greater than Sampling Total Time then the value reported is total Analsysis Time Plus one day. The one day accounts for the time samples get collected and shipped to the lab on day one of the sampling response.

if float(Throughput_Time) < float(Time_Complete_Sampling):
        Total_Time = float(Time_Complete_Sampling)
else:
        Total_Time = float(Throughput_Time) + 1.00

# Total time sum is turned off to account for updated total time method
#Total_Time = float(Time_Complete_Sampling) + float(Throughput_Time)

arcpy.AddMessage(" ")
arcpy.AddMessage("TOTS Results:")
arcpy.AddMessage(" ")
arcpy.AddMessage("--Summary--")
arcpy.AddMessage("Total Number of User-Defined Samples: " + str(arcpy.GetCount_management(Samples).getOutput(0)))
arcpy.AddMessage("Total Number of Samples: " + str(AC_total))
arcpy.AddMessage("Total Cost ($): " + str(Total_Cost))
arcpy.AddMessage("Total Time (days): " + str(Total_Time))
if Time_Complete_Sampling > Throughput_Time:
        arcpy.AddMessage("Limiting Time Factor: Sampling")
elif Time_Complete_Sampling < Throughput_Time:
        arcpy.AddMessage("Limiting Time Factor: Analysis")
else:
        pass
arcpy.AddMessage(" ")
arcpy.AddMessage("--Spatial Information--")
arcpy.AddMessage("Total Sampled Area (feet): " + str(AA_Total))
if AOI_Area > 0:
        arcpy.AddMessage("User Specified Total AOI (feet): " + str(AOI_Area))
        arcpy.AddMessage("Percent of Area Sampled: " + str("{0:.0f}%".format(Prob)))
else:
        pass
#arcpy.AddMessage("Sampled Area (inch): " + str(SA_total))
arcpy.AddMessage(" ")
#arcpy.AddMessage("Total Time(person hours)(kits + collection + analysis + shipping + reporting): " + str(TTPS_total))
#arcpy.AddMessage("Limit of Detection (CFU) Porous: " + str(LOD_P_total))
#arcpy.AddMessage("Limit of Detection (CFU) Nonporous: " + str(LOD_NON_total))
#arcpy.AddMessage("Total Cost(Labor + Material + Waste): " + str(TCPS_total))
arcpy.AddMessage("-- Sampling --")
arcpy.AddMessage("User Specified Number of Available Teams for Sampling: " + str(Available_Teams))
arcpy.AddMessage("User Specified Personnel per Sampling Team: " + str(Personnel))
arcpy.AddMessage("User Specified Sampling Team Hours per Shift: " + str(Hours_per_Shift))
arcpy.AddMessage("User Specified Sampling Team Shifts per Day: " + str(Shifts_per_Day))
arcpy.AddMessage("Sampling Hours per Day: " + str(Sampling_Hours))
arcpy.AddMessage("Sampling Personnel hours per Day: " + str(Sampling_Personnel_Day))
arcpy.AddMessage("User Specified Sampling Team Labor Cost ($): " + str(Labor_Cost))
arcpy.AddMessage("Time to Prepare Kits (person hours): " + str(TTPK_total))
arcpy.AddMessage("Time to Collect (person hours): " + str(TTC_total))
arcpy.AddMessage("Material Cost: " + str(MCPS_total))
arcpy.AddMessage("Sampling Personnel Labor Cost ($): " + str(Sampling_Personnel_Labor_Cost))
arcpy.AddMessage("Time to Complete Sampling (days): " + str(Time_Complete_Sampling))
arcpy.AddMessage("Total Sampling Labor Cost ($): " + str(Total_Sampling_Labor_Cost))
arcpy.AddMessage(" ")
arcpy.AddMessage("-- Analysis --")
arcpy.AddMessage("User Specified Number of Available Labs for Analysis: " + str(Sampling_Labs))
arcpy.AddMessage("User Specified Analysis Lab Hours per Day: " + str(Analysis_Hours))
arcpy.AddMessage("Time to Complete Analyses (days): " + str(Throughput_Time))
arcpy.AddMessage("Time to Analyze (person hours): " + str(TTA_total))
arcpy.AddMessage("Analysis Labor Cost ($): " + str(ALC_total))
arcpy.AddMessage("Analysis Material Cost ($): " + str(AMC_total))
arcpy.AddMessage("Waste volume (L): " + str(WVPS_total))
arcpy.AddMessage("Waste Weight (lbs): " + str(WWPS_total))
arcpy.AddMessage(" ")

# Write to spreadsheet
with open(os.path.join(Root, TOTS_Results_Filename),'w+') as csvfile:  
        csvwriter = csv.writer(csvfile, delimiter=',', lineterminator='\n')
        csvwriter.writerow(["Summary"])
        csvwriter.writerow([""])        
        csvwriter.writerow(['Total Number of User-Defined Samples: '] + [arcpy.GetCount_management(Samples).getOutput(0)])
        csvwriter.writerow(['Total Number of Samples: '] + [str(AC_total)])
        csvwriter.writerow(["Total Cost ($): "] + [str(Total_Cost)])
        csvwriter.writerow(["Total Time (days): "] + [str(Total_Time)])
        if Time_Complete_Sampling > Throughput_Time:
                csvwriter.writerow(["Limiting Time Factor: "] + ["Sampling"])
        elif Time_Complete_Sampling < Throughput_Time:
                csvwriter.writerow(["Limiting Time Factor: "] + ["Analysis"])
        else:
                pass
        csvwriter.writerow([""])
        csvwriter.writerow(["Spatial Information"])
        csvwriter.writerow(["Total Sampled Area (feet): "] + [str(AA_Total)])        
        if AOI_Area > 0:
                csvwriter.writerow(["User Specified Total AOI (feet): "] + [str(AOI_Area)])
                csvwriter.writerow(["Percent of Area Sampled: "] + [str("{0:.0f}%".format(Prob))])
        else:
                pass
#        csvwriter.writerow(["Total Time(person hours)(kits + collection + analysis + shipping + reporting): "] + [str(TTPS_total)])
#        csvwriter.writerow(["Total Cost (Labor + Material + Waste): "] + [str(TCPS_total)])
#        csvwriter.writerow(["Sampled Area (inch): "] + [str(SA_total)])
        csvwriter.writerow([""])        
        csvwriter.writerow(["Sampling"])
        csvwriter.writerow(["User Specified Number of Available Teams for Sampling: "] + [str(Available_Teams)])
        csvwriter.writerow(["User Specified Personnel per Sampling Team: "] + [str(Personnel)])
        csvwriter.writerow(["User Specified Sampling Team Hours per Shift: "] + [str(Hours_per_Shift)])
        csvwriter.writerow(["User Specified Sampling Team Shifts per Day: "] + [str(Shifts_per_Day)])
        csvwriter.writerow(["Sampling Hours per Day: "] + [str(Sampling_Hours)])
        csvwriter.writerow(["Sampling Personnel hours per Day: "] + [str(Sampling_Personnel_Day)])
        csvwriter.writerow(["User Specified Sampling Team Labor Cost ($): "] + [str(Labor_Cost)])
        csvwriter.writerow(['Time to Prepare Kits (person hours): '] + [str(TTPK_total)])
        csvwriter.writerow(["Time to Collect (person hours): "] + [str(TTC_total)])
        csvwriter.writerow(["Material Cost: "] + [str(MCPS_total)])        
        csvwriter.writerow(["Sampling Personnel Labor Cost ($): "] + [str(Sampling_Personnel_Labor_Cost)])
        csvwriter.writerow(["Time to Complete Sampling (days): "] + [str(Time_Complete_Sampling)])
        csvwriter.writerow(["Total Sampling Labor Cost ($): "] + [str(Total_Sampling_Labor_Cost)])
        csvwriter.writerow([""])        
        csvwriter.writerow(["Analysis"])        
        csvwriter.writerow(["User Specified Number of Available Labs for Analysis: "] + [str(Sampling_Labs)])
        csvwriter.writerow(["User Specified Analysis Lab Hours per Day: "] + [str(Analysis_Hours)])
        csvwriter.writerow(["Time to Complete Analyses (days)"] + [str(Throughput_Time)])
        csvwriter.writerow(["Time to Analyze (person hours): "] + [str(TTA_total)])        
        csvwriter.writerow(["Analysis Labor Cost ($): "] + [str(ALC_total)])
        csvwriter.writerow(["Analysis Material Cost ($): "] + [str(AMC_total)])
        csvwriter.writerow(["Waste volume (L): "] + [str(WVPS_total)])
        csvwriter.writerow(["Waste Weight (lbs): "] + [str(WWPS_total)])
        csvwriter.writerow([""])
        # Contamination results join
        ## Write data depending on availability of contamination map 
        if Contamination_Map:
                fields = ['FID', 'TYPE', 'CFU', 'Notes']
                arcpy.AddMessage("-- Sampling Results --")
                with arcpy.da.SearchCursor(Contamination_Output, fields) as q:
                        for row in q:
                                if row[2] > 0:
                                        CFU_count += 1
                                        arcpy.AddMessage("Sample ID: " + str(row[0]) + ", Sample Type: " + str(row[1]) + ", CFU: " + str(row[2]))
                                else:
                                        pass
                arcpy.AddMessage(" ")
                arcpy.AddMessage(str(CFU_count) + " of " + str(arcpy.GetCount_management(Samples).getOutput(0)) + " Samples Were Positive Detects")
                
#                fields = ['FID','CFU','Notes']
                fields_com = ['Sample ID','Sample Type','CFU','Notes']         
                csvwriter.writerow(fields_com)       
                with arcpy.da.SearchCursor(Contamination_Output, fields) as s_cursor:  
                        for row in s_cursor:  
                                csvwriter.writerow(row)
        else:
                fields = ['FID','Notes']
                fields_com = ['Sample ID','Notes']
                csvwriter.writerow(fields_com)                
                with arcpy.da.SearchCursor(Samples, fields) as s_cursor:  
                        for row in s_cursor:  
                                csvwriter.writerow(row)                
