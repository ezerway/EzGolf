import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";

export const streetMapStyle = "https://tiles.openfreemap.org/styles/liberty";

export const satelliteMapStyle = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
    },
  ],
} satisfies StyleSpecification;

export type AppMapStyle = typeof streetMapStyle | typeof satelliteMapStyle;
