# Local Development Environment Setup

- Run `git clone` to clone this repository.
- Install Node.js from https://nodejs.org.
- Create a `.env.development` file inside the root folder of the repository, and populate it with the following environment variables (get the value for the REACT_APP_ARCGIS_APP_ID environment variable from the technical lead or project manager):

```
REACT_APP_ARCGIS_APP_ID=""
REACT_APP_SERVER_URL="http://localhost:9091"
REACT_APP_PROXY_URL="http://localhost:9091/proxy"
```

- Navigate to the root folder in the repo using the command line:
  - Run `npm run setup`.
  - Run `npm start` to start a local web server to support development.
