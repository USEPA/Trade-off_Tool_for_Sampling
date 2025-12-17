# Local Development Environment Setup

- Run `git clone` to clone this repository.
- Install Node.js from https://nodejs.org.
- Create a `.env.local` file inside the `app/client/` folder of the repository, and populate it with the following environment variables (get the value for the VITE_ARCGIS_CLIENT_ID environment variable from the technical lead or project manager):

```
VITE_ARCGIS_CLIENT_ID=""
```

- Navigate to the `app/` folder in the repo using the command line:
  - Run `npm run setup`.
  - Run `npm start` to start a local web server to support development.
