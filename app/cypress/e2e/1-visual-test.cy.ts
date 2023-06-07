describe("Visual Testing", () => {
  beforeEach(() => {
    // clear session storage and open the app
    sessionStorage.clear()
  })
  const mapId = "#tots-map-div"

  it("Verify Arc GIS map displays correctly", () => {
    cy.mapLoadDelay()

    cy.get(mapId).matchSnapshot("verify-arc-gis-display")
  })

  it("Verify zoom to Colorado Springs", () => {
    sessionStorage.setItem(
      "tots_map_scene_position",
      JSON.stringify({
        position: {
          spatialReference: { latestWkid: 3857, wkid: 102100 },
          x: -11556344.446372677,
          y: 4649996.548289328,
        },
      })
    )

    sessionStorage.setItem(
      "tots_map_2d_extent",
      JSON.stringify({
        spatialReference: { latestWkid: 3857, wkid: 102100 },
        xmin: -11824332.66754049,
        ymin: 4552921.522367159,
        xmax: -11288356.225204863,
        ymax: 4747071.574211497,
      })
    )

    cy.mapLoadDelay()

    cy.get(mapId).matchSnapshot("verify-zoom-colorado-springs")
  })

  it("Verify sponge", () => {
    sessionStorage.setItem(
      "tots_map_scene_position",
      JSON.stringify({
        fov: 55,
        heading: 0,
        position: {
          spatialReference: {
            latestWkid: 3857,
            wkid: 102100,
          },
          x: -10026763.073358437,
          y: 4649729.018690342,
        },
        tilt: 0,
      })
    )
    sessionStorage.setItem(
      "tots_map_2d_extent",
      JSON.stringify({
        spatialReference: {
          latestWkid: 3857,
          wkid: 102100,
        },
        xmin: -10160757.183942286,
        ymin: 4601191.505729279,
        xmax: -9892768.962774588,
        ymax: 4698266.531651406,
      })
    )

    cy.fixture("sponge.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    })
    cy.mapLoadDelay()

    cy.get(mapId).matchSnapshot("verify-sponge")
  })

  it("Verify Micro Vac", () => {
    sessionStorage.setItem(
      "tots_map_scene_position",
      JSON.stringify({
        position: {
          spatialReference: { latestWkid: 3857, wkid: 102100 },
          x: -10741219.976739783,
          y: 3863306.6531785084,
        },
      })
    )
    sessionStorage.setItem(
      "tots_map_2d_extent",
      JSON.stringify({
        spatialReference: { latestWkid: 3857, wkid: 102100 },
        xmin: -11009208.197907597,
        ymin: 3766231.6272563394,
        xmax: -10473231.755571969,
        ymax: 3960381.6791006774,
      })
    )

    cy.fixture("micro-vac.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    })
    cy.mapLoadDelay()

    cy.get(mapId).matchSnapshot("verify-micro-vac")
  })

  it("Verify Wet Vac", () => {
    sessionStorage.setItem(
      "tots_map_scene_position",
      JSON.stringify({
        position: {
          spatialReference: { latestWkid: 3857, wkid: 102100 },
          x: -7976798.4117788365,
          y: 5165105.681902991,
        },
      })
    )
    sessionStorage.setItem(
      "tots_map_2d_extent",
      JSON.stringify({
        spatialReference: { latestWkid: 3857, wkid: 102100 },
        xmin: -8512774.85411435,
        ymin: 4970955.630058695,
        xmax: -7440821.969443323,
        ymax: 5359255.733747287,
      })
    )

    cy.fixture("wet-vac.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    })
    cy.displayMode("2d", "polygons");
    cy.mapLoadDelay()

    cy.get(mapId).matchSnapshot("verify-wet-vac")
  })

  it("Verify Robot", () => {
    sessionStorage.setItem(
      "tots_map_scene_position",
      JSON.stringify({
        position: {
          spatialReference: { latestWkid: 3857, wkid: 102100 },
          x: -10753385.934498046,
          y: 3871393.215348695,
        },
      })
    )
    sessionStorage.setItem(
      "tots_map_2d_extent",
      JSON.stringify({
        spatialReference: { latestWkid: 3857, wkid: 102100 },
        xmin: -10770135.198321013,
        ymin: 3865326.026228567,
        xmax: -10736636.670675078,
        ymax: 3877460.4044688228,
      })
    )

    cy.fixture("robot.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    })
    cy.displayMode("2d", "polygons");
    cy.mapLoadDelay()

    cy.get(mapId).matchSnapshot("verify-robot")
  })

  it("Verify aggressive-air", () => {
    sessionStorage.setItem(
      "tots_map_scene_position",
      JSON.stringify({
        position: {
          spatialReference: { latestWkid: 3857, wkid: 102100 },
          x: -11556344.446372677,
          y: 4649996.548289328,
        },
      })
    )
    sessionStorage.setItem(
      "tots_map_2d_extent",
      JSON.stringify({
        spatialReference: { latestWkid: 3857, wkid: 102100 },
        xmin: -11824332.66754049,
        ymin: 4552921.522367159,
        xmax: -11288356.225204863,
        ymax: 4747071.574211497,
      })
    )
    cy.displayMode("2d", "polygons");

    cy.fixture("aggressive-air.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    })

    cy.mapLoadDelay()

    cy.get(mapId).matchSnapshot("verify-aggressive-air")
  })

  it("Verify Swab", () => {
    sessionStorage.setItem(
      "tots_map_scene_position",
      JSON.stringify({
        position: {
          spatialReference: { latestWkid: 3857, wkid: 102100 },
          x: -12259106.484426407,
          y: 5028436.275329143,
        },
      })
    )
    sessionStorage.setItem(
      "tots_map_2d_extent",
      JSON.stringify({
        spatialReference: { latestWkid: 3857, wkid: 102100 },
        xmin: -12795082.926761921,
        ymin: 4834286.223484847,
        xmax: -11723130.042090893,
        ymax: 5222586.327173439,
      })
    )

    cy.fixture("swab.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    })

    cy.get(mapId).matchSnapshot("verify-swab")
  })

  it("Verify All established sample types with shape point", () => {
    cy.fixture("all_established_sample_types.json").then((file) => {
      sessionStorage.setItem("tots_edits", JSON.stringify(file))
    })

    cy.mapLoadDelay()
    cy.get(mapId).matchSnapshot("verify-established-sample-types-point")
  })

  it("Verify location from Locate", () => {
    cy.mapLoadDelay()
    cy.findByRole('button', { name: 'Locate' }).click({ force: true })
    cy.get('#esri-search-component').type('dallas{enter}')

    //need for map load from given input
    cy.wait(10000)

    cy.get(mapId).matchSnapshot("verify-location-from-locate")
  })

  it("Verify 3d", () => {
    cy.displayMode("3d", "polygons");

    sessionStorage.setItem("tots_map_3d_extent", JSON.stringify({
      "spatialReference": {
        "latestWkid": 3857,
        "wkid": 102100
      },
      "xmin": -19770869.537082013,
      "ymin": -1230433.3885384633,
      "xmax": 266638.8057068905,
      "ymax": 7268225.16362042
    }))

    sessionStorage.setItem("tots_map_scene_position", JSON.stringify({
      "fov": 55,
      "heading": 359.98720300386617,
      "position": {
        "spatialReference": {
          "latestWkid": 3857,
          "wkid": 102100
        },
        "x": -9752105.039835732,
        "y": 2972737.185802346,
        "z": 18678169.896921813
      },
      "tilt": 0.12728932598295026
    }))
    cy.mapLoadDelay()
    cy.get(mapId).matchSnapshot("verify-3d")
  })

})
