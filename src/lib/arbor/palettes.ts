export const PALETTE_IDS = ["dusk", "grove", "autumn", "moon", "ink"] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export type Palette = {
  id: PaletteId;
  name: string;
  night: boolean;
  celestial: "sun" | "moon";
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  celestialColor: string;
  celestialGlow: string;
  hillFar: string;
  hillNear: string;
  mist: string;
  barkBase: string;
  barkTip: string;
  leaf: string;
  leafDeep: string;
  blossom: string;
  blossomCore: string;
  mote: string;
  grass: string;
};

export const PALETTES: Palette[] = [
  {
    id: "dusk",
    name: "Dusk",
    night: false,
    celestial: "sun",
    skyTop: "#141a24",
    skyMid: "#6d4450",
    skyBottom: "#e7a56e",
    celestialColor: "#ffe1b5",
    celestialGlow: "rgba(255, 190, 130, 0.42)",
    hillFar: "#3a2a28",
    hillNear: "#1c1412",
    mist: "rgba(255, 220, 190, 0.16)",
    barkBase: "#2a1810",
    barkTip: "#d7b07a",
    leaf: "#9cbe72",
    leafDeep: "#4f7340",
    blossom: "#f0b2a4",
    blossomCore: "#ffe8c8",
    mote: "#f6d2bf",
    grass: "#3e5340",
  },
  {
    id: "grove",
    name: "Grove",
    night: false,
    celestial: "sun",
    skyTop: "#8ec4e4",
    skyMid: "#d5ead4",
    skyBottom: "#f3f6e4",
    celestialColor: "#fff8dc",
    celestialGlow: "rgba(255, 244, 200, 0.72)",
    hillFar: "#6e9468",
    hillNear: "#234430",
    mist: "rgba(255, 255, 255, 0.32)",
    barkBase: "#3d2918",
    barkTip: "#b08455",
    leaf: "#2f8a45",
    leafDeep: "#1c5c30",
    blossom: "#f3b7c8",
    blossomCore: "#fff5f7",
    mote: "#ffffff",
    grass: "#2a6a38",
  },
  {
    id: "autumn",
    name: "Autumn",
    night: false,
    celestial: "sun",
    skyTop: "#2a2433",
    skyMid: "#a24a3a",
    skyBottom: "#f0a04a",
    celestialColor: "#ffd39a",
    celestialGlow: "rgba(255, 160, 70, 0.4)",
    hillFar: "#5a3024",
    hillNear: "#2a140e",
    mist: "rgba(255, 186, 120, 0.16)",
    barkBase: "#3a1e12",
    barkTip: "#e6b06a",
    leaf: "#e15a2b",
    leafDeep: "#8d2e14",
    blossom: "#f6d7a2",
    blossomCore: "#fff3d8",
    mote: "#f2c27a",
    grass: "#6a3a22",
  },
  {
    id: "moon",
    name: "Moon",
    night: true,
    celestial: "moon",
    skyTop: "#070912",
    skyMid: "#1a2744",
    skyBottom: "#31486a",
    celestialColor: "#f4f7ff",
    celestialGlow: "rgba(200, 214, 255, 0.34)",
    hillFar: "#1a2233",
    hillNear: "#0c1018",
    mist: "rgba(190, 206, 230, 0.12)",
    barkBase: "#141820",
    barkTip: "#b7c3d6",
    leaf: "#9eb8b2",
    leafDeep: "#4e6d68",
    blossom: "#f3e9ff",
    blossomCore: "#fffdf8",
    mote: "#d5e0f5",
    grass: "#243038",
  },
  {
    id: "ink",
    name: "Ink",
    night: true,
    celestial: "sun",
    skyTop: "#0e0e10",
    skyMid: "#1c1914",
    skyBottom: "#3d3428",
    celestialColor: "#f0d7a2",
    celestialGlow: "rgba(224, 184, 96, 0.24)",
    hillFar: "#221c16",
    hillNear: "#0c0b0a",
    mist: "rgba(230, 200, 140, 0.1)",
    barkBase: "#14110e",
    barkTip: "#e6c98a",
    leaf: "#c5d09a",
    leafDeep: "#6d7848",
    blossom: "#f4cbb8",
    blossomCore: "#fff4ea",
    mote: "#ead7b0",
    grass: "#3a4030",
  },
];

export function getPalette(id: string): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0];
}
