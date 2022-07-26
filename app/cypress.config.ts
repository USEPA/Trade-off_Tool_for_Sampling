import { defineConfig } from "cypress";

export default defineConfig({
  defaultCommandTimeout: 8000,
  viewportWidth: 1280,
  viewportHeight: 720,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      require("@cypress/code-coverage/task")(on, config);

      return config;
    },
    baseUrl: "http://localhost:3000",
  },
});
