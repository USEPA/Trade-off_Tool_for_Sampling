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
