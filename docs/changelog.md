# Change Log

## 4.0.0 (December 2025)

### Added

- Added the Trade-off Tool for Decontamination Strategies (TODS) tool for designing decontamination strategies, available at https://tots.epa.gov/decon.

- Added "Additional Tools" tab for characterizing area of interest, identifying staging areas and creating custom sample types.

- Added ability to pull in TODS decon plans into TOTS for iterative approach.

- Added ability to add samples via a statistical sampling approach.

- Added a tooltip for training mode selection.

- Added a sitemap.xml file.

### Changed

- Updated app to pull sample type configuration from RADAR.

- Updated basemaps for published output.

- Updated publish logic to include calculation results.

- Updated sample type selection so they are categorized as established and innovative.

- Updated GP server calls and publishing API calls to retry three times.

- Removed locate tab and instead added a locate widget to the map.

- Fixed bug with generic error message returned for trying to publish a custom sample type without providing a name.

- Fixed bug where View Contamination Hits was double counting contamination hits when contamination plumes overlap.

- Fixed issue of FontAwesome icons not always loading.

- Fixed an issue where malicious calls to the proxy could possibly crash the app.

### Chores

- Updated dependencies.

- Updated to NodeJS v24.

- Updated EPA template.

- Switched to Vite from Create React App.

## 3.0.1 (April 2025)

### Changed

- Updated basemaps to US vector basemaps.

## 3.0.0 (March 2024)

### Added

- Added a 3D mode. Users can now sketch samples on 3D terrain and 3D feature layers (i.e., 3D building layers).

- Added a hybrid shape mode to help support 3D mode.

- Added the ability to publish supporting reference layers with a plan.

- Added the ability to publish Web Map/Scene with a plan.

- Added automated integration tests.

- Added a measurement widget to the map for both 2D and 3D modes.

- Added the ability to select multiple samples by drawing a rectangle/polygon on the map. This is only supported in 2D mode or by holding shift/ctrl and clicking on samples.

- Added ability to clone layers and plans.

### Changed

- Updated One EPA template.

- Updated Google Analytics code to work with the new GA4 tags.

- Updated dependencies to the latest versions including: ArcGIS JS API, NodeJS and React.

- Updated file upload to preserve notes in the layer.

- Updated publishing logic to also save the Calculate Resource settings.

- Updated popups such that they are closed when the escape key is clicked.

- Updated file upload logic such that the attribute names are case insensitive.

- Updated "Add Multiple Random Samples" UI such that controls are co-located.

- Updated "Next" buttons such that they scroll the next tab to the top.

- Updated the Generate Random logic to have more robust batching logic.

- Updated login workflow to use popups rather than redirects. This makes the login process faster.

- Fixed issue of "Unsupported browser..." message displaying and disappearing on slow networks.

- Fixed issue of points persisting after deleting the associated polygon version of the sample.

- Fixed issue with publishing edits to custom attributes of an already published plan not working.

- Fixed issue of confusing error being returned when a plan name is already taken.

- Fixed issue of escape key canceling sketch without restarting it. Now hitting the escape key while sketching will cancel the current sketch and start a new one.

- Fixed issue of Resource Tally overflowing the EPA template footer.

- Fixed issue of blank row in coded values causing a blank row in ArcGIS field data collection apps.

## 2.0.0 (August 2022)

### Added

- Added Configure Ouptut tab for Field Maps support.

- Added a tolerance check and data validation for adding sample data (from ArcGIS Online or file).

- Added Google Analytics logging, including exceptions.

- Added the layerProps config file to the S3 bucket.

- Added a status banner to the top of the app, for notifying users about issues.

### Changed

- Updated One EPA template.

- Updated the global website error message to have contact information for the application owner.

- Updated the Add Data panel so that layers are automatically linked to the active sampling plan.

- Updated ArcGIS JS API to the latest version.

- Improved performance of the attributes table.

- Fixed issues with attribute fields not autopopulating.

- Fixed issues with point sample representations not always being synced up with the polygon view.

- Fixed issue with custom sample types being shown twice when bringing layers in from ArcGIS Online (AGO).

- Fixed error handling around loading VSP layer as a Samples layer.

- Fixed issue with publishing duplicate custom sample types.

- Fixed CORS issues related to VSP file upload, generating random samples, and running contamination map.

- Fixed an issue with only the EPA header/footer being visible when going to an invalid TOTS URL.

- Fixed an issue with the color picker, in the Create Custom Sample Types section, causing the app to lockup.

- Fixed issue of not being able to import files with point features.

## 1.0.0 (Released 09-2021)
