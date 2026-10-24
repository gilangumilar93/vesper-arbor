import { getPalette, type Palette } from "@/lib/arbor/palettes";

export const TRUNK = 200;
const BEND = 0.07;
const UP = -Math.PI / 2;

export type Settings = {
  seed: number;
  angle: number;
  depth: number;
  length: number;
  wind: number;
  leaves: boolean;
  blossoms: boolean;
  paletteId: string;
  bark: string | null;
  leaf: string | null;
  blossom: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  seed: 184729,
  angle: 23,
  depth: 8,
  length: 0.73,
  wind: 0.34,
  leaves: true,
  blossoms: false,
  paletteId: "dusk",
  bark: null,
  leaf: null,
  blossom: null,
};

export type Twig = {
  turn: number;
  scale: number;
  bend: number;
  phase: number;
  decor: number;
  children: Twig[];
};

export type Star = { x: number; y: number; r: number; a: number; phase: number };

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export type TreeModel = {
  seed: number;
  depth: number;
  root: Twig;
  bounds: Bounds;
  stars: Star[];
};

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function settle(parentHeading: number, turn: number, sway: number) {
  const raw = parentHeading + turn + sway;
  const norm = Math.atan2(Math.sin(raw), Math.cos(raw));
  return norm + (UP - norm) * 0.16;
}

function makeTwig(rng: Rng, depthLeft: number, maxDepth: number, angle: number, lengthRatio: number, sign: number | null): Twig {
  const trunk = sign === null;
  const turn = trunk ? (rng() - 0.5) * 0.06 : sign * angle * (0.9 + rng() * 0.2);
  const scale = trunk ? 1 : lengthRatio * (0.94 + rng() * 0.12);
  const twig: Twig = {
    turn,
    scale,
    bend: (rng() - 0.5) * 0.7,
    phase: rng() * Math.PI * 2,
    decor: rng(),
    children: [],
  };

  if (depthLeft <= 0) return twig;

  const outer = depthLeft <= 2 && depthLeft < maxDepth;
  const dropLeft = outer && rng() < 0.18;
  const dropRight = outer && !dropLeft && rng() < 0.18;
  if (!dropLeft) twig.children.push(makeTwig(rng, depthLeft - 1, maxDepth, angle, lengthRatio, -1));
  if (!dropRight) twig.children.push(makeTwig(rng, depthLeft - 1, maxDepth, angle, lengthRatio, 1));
  return twig;
}

function addPoint(bounds: Bounds, x: number, y: number) {
  if (x < bounds.minX) bounds.minX = x;
  if (y < bounds.minY) bounds.minY = y;
  if (x > bounds.maxX) bounds.maxX = x;
  if (y > bounds.maxY) bounds.maxY = y;
}

function measureTwig(twig: Twig, x: number, y: number, heading: number, fullLen: number, bounds: Bounds) {
  const h = settle(heading, twig.turn, 0);
  const x2 = x + Math.cos(h) * fullLen;
  const y2 = y + Math.sin(h) * fullLen;
  const bend = twig.bend * BEND * fullLen;
  const nx = -Math.sin(h);
  const ny = Math.cos(h);
  addPoint(bounds, x, y);
  addPoint(bounds, x2, y2);
  addPoint(bounds, (x + x2) / 2 + nx * bend, (y + y2) / 2 + ny * bend);
  for (const child of twig.children) {
    measureTwig(child, x2, y2, h, fullLen * child.scale, bounds);
  }
}

export function generateTree(seed: number, angleDeg: number, depth: number, lengthRatio: number): TreeModel {
  const rng = mulberry32(seed || 1);
  const angle = (angleDeg * Math.PI) / 180;
  const safeDepth = Math.max(1, Math.round(depth));
  const root = makeTwig(rng, safeDepth, safeDepth, angle, lengthRatio, null);
  const bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  measureTwig(root, 0, 0, -Math.PI / 2, TRUNK, bounds);
  const stars: Star[] = [];
  for (let i = 0; i < 56; i++) {
    stars.push({
      x: rng(),
      y: rng() * 0.62,
      r: 0.4 + rng() * 1.25,
      a: 0.25 + rng() * 0.75,
      phase: rng() * Math.PI * 2,
    });
  }
  return { seed, depth: safeDepth, root, bounds, stars };
}

function clamp(v: number, min = 0, max = 1) {
  return v < min ? min : v > max ? max : v;
}

function parseColor(input: string): [number, number, number] {
  if (input.startsWith("#")) {
    const h = input.slice(1);
    const n = Number.parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const match = input.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];
  return [80, 60, 40];
}

export function shade(hex: string, t: number) {
  const [r, g, b] = parseColor(hex);
  if (t >= 0) {
    return `rgb(${Math.round(r + (255 - r) * t)}, ${Math.round(g + (255 - g) * t)}, ${Math.round(b + (255 - b) * t)})`;
  }
  const k = 1 + t;
  return `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
}

function mix(a: string, b: string, t: number) {
  const A = parseColor(a);
  const B = parseColor(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)}, ${Math.round(A[1] + (B[1] - A[1]) * t)}, ${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}

type Colors = {
  barkBase: string;
  barkTip: string;
  leaf: string;
  leafDeep: string;
  blossom: string;
  blossomCore: string;
  highlight: string;
};

function resolveColors(palette: Palette, settings: Settings): Colors {
  const barkTip = settings.bark ?? palette.barkTip;
  const leaf = settings.leaf ?? palette.leaf;
  const blossom = settings.blossom ?? palette.blossom;
  return {
    barkTip,
    barkBase: settings.bark ? shade(settings.bark, -0.48) : palette.barkBase,
    leaf,
    leafDeep: settings.leaf ? shade(settings.leaf, -0.34) : palette.leafDeep,
    blossom,
    blossomCore: settings.blossom ? shade(settings.blossom, 0.58) : palette.blossomCore,
    highlight: shade(barkTip, 0.42),
  };
}

function segmentGrowth(global: number, depth: number, maxDepth: number) {
  const levels = Math.max(1, maxDepth + 1);
  return clamp(global * levels - depth);
}

type DrawCtx = {
  growth: number;
  time: number;
  wind: number;
  maxDepth: number;
  scale: number;
  leaves: boolean;
  blossoms: boolean;
  colors: Colors;
  grass: string;
};

function drawOrnament(
  ctx: CanvasRenderingContext2D,
  twig: Twig,
  x: number,
  y: number,
  heading: number,
  depth: number,
  g: number,
  view: DrawCtx,
) {
  const isTip = twig.children.length === 0;
  const crown = depth >= Math.max(1, view.maxDepth - 2);
  if (!isTip && !crown) return;
  const reveal = clamp((g - 0.55) / 0.45);
  if (reveal <= 0) return;
  if (!view.leaves && !view.blossoms) return;

  const kind: "leaf" | "blossom" =
    view.leaves && view.blossoms ? (twig.decor > 0.62 ? "blossom" : "leaf") : view.blossoms ? "blossom" : "leaf";

  const rustle = Math.sin(view.time * 1.8 + twig.phase) * 0.12 * Math.min(1, view.wind * 4);
  const px = (18 + twig.decor * 12) / view.scale;

  if (kind === "leaf") {
    ctx.globalAlpha = (0.72 + twig.decor * 0.2) * reveal;
    const count = isTip ? 6 : 4;
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.48 + rustle;
      const a = heading + spread;
      const dist = px * (0.25 + (i % 3) * 0.18);
      const rx = px * (0.42 + (i % 2) * 0.08);
      const ry = rx * 0.48;
      ctx.fillStyle = i % 2 === 0 ? view.colors.leaf : view.colors.leafDeep;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * dist, y + Math.sin(a) * dist, rx, ry, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const size = (16 + twig.decor * 8) / view.scale;
    ctx.globalAlpha = 0.92 * reveal;
    ctx.fillStyle = view.colors.blossom;
    const spin = twig.phase + view.time * 0.12 + rustle;
    for (let i = 0; i < 5; i++) {
      const a = spin + (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(a) * size * 0.46,
        y + Math.sin(a) * size * 0.46,
        size * 0.4,
        size * 0.28,
        a,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = view.colors.blossomCore;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTwig(
  ctx: CanvasRenderingContext2D,
  twig: Twig,
  x: number,
  y: number,
  heading: number,
  fullLen: number,
  depth: number,
  view: DrawCtx,
) {
  const g = segmentGrowth(view.growth, depth, view.maxDepth);
  if (g <= 0.001) return;

  const along = (depth + 1) / (view.maxDepth + 1);
  const sway =
    Math.sin(view.time * 0.95 + twig.phase + depth * 0.35) * view.wind * Math.pow(along, 1.15) +
    Math.sin(view.time * 0.38) * view.wind * 0.65 * along;
  const h = settle(heading, twig.turn, sway);
  const shown = fullLen * g;
  const xFull = x + Math.cos(h) * fullLen;
  const yFull = y + Math.sin(h) * fullLen;
  const x2 = x + Math.cos(h) * shown;
  const y2 = y + Math.sin(h) * shown;
  const bend =
    (twig.bend * BEND + Math.sin(view.time * 1.2 + twig.phase) * 0.04 * view.wind) * shown;
  const nx = -Math.sin(h);
  const ny = Math.cos(h);
  const cpx = (x + x2) / 2 + nx * bend;
  const cpy = (y + y2) / 2 + ny * bend;

  const t = view.maxDepth <= 0 ? 1 : depth / view.maxDepth;
  const bark = mix(view.colors.barkBase, view.colors.barkTip, t * 0.92);
  const minW = 0.7 / view.scale;
  const width = Math.max(minW, TRUNK * 0.052 * Math.pow(0.73, depth) * (0.78 + 0.22 * g));

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cpx, cpy, x2, y2);

  if (depth === 0) {
    ctx.strokeStyle = view.colors.barkBase;
    ctx.lineWidth = width * 1.45;
    ctx.stroke();
  }
  ctx.strokeStyle = bark;
  ctx.lineWidth = width;
  ctx.stroke();
  if (depth <= 2) {
    ctx.strokeStyle = view.colors.highlight;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(minW, width * 0.28);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (depth === 0 && g > 0.15) {
    ctx.strokeStyle = view.grass;
    ctx.lineWidth = Math.max(minW, 1.4 / view.scale);
    const blades = 7;
    for (let i = 0; i < blades; i++) {
      const side = i - 3;
      const bx = side * 8;
      const bh = (16 + Math.abs(side) * 3) * Math.min(1, g * 1.4);
      ctx.beginPath();
      ctx.moveTo(bx, 3);
      ctx.quadraticCurveTo(bx + side * 2.2, -bh * 0.45, bx + side * 3.4, -bh);
      ctx.stroke();
    }
  }

  drawOrnament(ctx, twig, x2, y2, h, depth, g, view);

  if (g >= 0.999) {
    for (const child of twig.children) {
      drawTwig(ctx, child, xFull, yFull, h, fullLen * child.scale, depth + 1, view);
    }
  }
}

type Mote = { x: number; y: number; vy: number; r: number; phase: number; petal: boolean };
const motes: Mote[] = [];

function respawn(mote: Mote, width: number, height: number, anywhere: boolean) {
  mote.x = Math.random() * width;
  mote.y = anywhere ? Math.random() * height : -8 - Math.random() * 20;
  mote.vy = 7 + Math.random() * 20;
  mote.r = 0.8 + Math.random() * 2.1;
  mote.phase = Math.random() * Math.PI * 2;
  mote.petal = Math.random() > 0.4;
}

function drawMotes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dt: number,
  time: number,
  wind: number,
  blossoms: boolean,
  color: string,
  alpha: number,
) {
  const count = blossoms ? 34 : 14;
  while (motes.length < count) {
    const mote: Mote = { x: 0, y: 0, vy: 0, r: 1, phase: 0, petal: false };
    respawn(mote, width, height, true);
    motes.push(mote);
  }
  const drift = Math.sin(time * 0.45) * 36 * wind + 12 * wind;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const mote = motes[i];
    mote.x += (drift + Math.sin(time * 1.4 + mote.phase) * 10) * dt;
    mote.y += mote.vy * dt;
    if (mote.y > height + 10 || mote.x < -24 || mote.x > width + 24) respawn(mote, width, height, false);
    ctx.globalAlpha = alpha * (mote.petal && blossoms ? 0.55 : 0.28);
    ctx.beginPath();
    if (blossoms && mote.petal) {
      ctx.ellipse(mote.x, mote.y, mote.r * 1.5, mote.r * 0.7, mote.phase + time * 0.4, 0, Math.PI * 2);
    } else {
      ctx.arc(mote.x, mote.y, mote.r * 0.7, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHill(ctx: CanvasRenderingContext2D, width: number, height: number, y: number, amp: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, y);
  ctx.quadraticCurveTo(width * 0.22, y - amp, width * 0.48, y + amp * 0.15);
  ctx.quadraticCurveTo(width * 0.74, y + amp * 0.85, width, y - amp * 0.25);
  ctx.lineTo(width, height);
  ctx.fill();
}

export type PaintInput = {
  width: number;
  height: number;
  dpr: number;
  time: number;
  dt: number;
  growth: number;
  reduced: boolean;
  settings: Settings;
  model: TreeModel;
};

export function paint(ctx: CanvasRenderingContext2D, input: PaintInput) {
  const { width, height, dpr, model, settings } = input;
  const palette = getPalette(settings.paletteId);
  const colors = resolveColors(palette, settings);
  const wind = (settings.wind * (input.reduced ? 0.08 : 1)) * 0.46;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.55, palette.skyMid);
  sky.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  if (palette.night) {
    for (let i = 0; i < model.stars.length; i++) {
      const star = model.stars[i];
      const twinkle = input.reduced ? 1 : 0.55 + 0.45 * Math.sin(input.time * 1.7 + star.phase);
      ctx.globalAlpha = star.a * twinkle;
      ctx.fillStyle = palette.celestialColor;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height * 0.72, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const bodyX = palette.celestial === "moon" ? width * 0.22 : width * 0.78;
  const bodyY = height * 0.16;
  const bodyR = Math.min(width, height) * (palette.celestial === "moon" ? 0.045 : 0.055);
  const glow = ctx.createRadialGradient(bodyX, bodyY, bodyR * 0.2, bodyX, bodyY, bodyR * 7);
  glow.addColorStop(0, palette.celestialGlow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(bodyX, bodyY, bodyR * 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.celestialColor;
  ctx.beginPath();
  ctx.arc(bodyX, bodyY, bodyR, 0, Math.PI * 2);
  ctx.fill();
  if (palette.celestial === "moon") {
    ctx.fillStyle = palette.skyTop;
    ctx.beginPath();
    ctx.arc(bodyX - bodyR * 0.38, bodyY - bodyR * 0.12, bodyR * 0.82, 0, Math.PI * 2);
    ctx.fill();
  }

  const groundY = height * 0.9;
  drawHill(ctx, width, height, groundY - height * 0.08, height * 0.05, palette.hillFar);
  drawHill(ctx, width, height, groundY + height * 0.01, height * 0.045, palette.hillNear);

  const mist = ctx.createLinearGradient(0, groundY - height * 0.08, 0, groundY + height * 0.04);
  mist.addColorStop(0, "rgba(0,0,0,0)");
  mist.addColorStop(1, palette.mist);
  ctx.fillStyle = mist;
  ctx.fillRect(0, groundY - height * 0.08, width, height * 0.14);

  const b = model.bounds;
  const bw = Math.max(1, b.maxX - b.minX);
  const bh = Math.max(1, b.maxY - b.minY);
  const padX = width * 0.1;
  const padTop = height * 0.06;
  const availH = Math.max(1, groundY - padTop);
  const scale = Math.min((width - padX * 2) / bw, availH / bh) * 0.92;
  const originX = width / 2 - ((b.minX + b.maxX) / 2) * scale;
  const originY = groundY - b.maxY * scale;

  const rootX = originX;
  const rootY = originY;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(
    rootX,
    rootY + 6,
    Math.min(width * 0.16, 36 + bw * scale * 0.05) * (0.4 + 0.6 * input.growth),
    7,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawTwig(ctx, model.root, 0, 0, -Math.PI / 2, TRUNK, 0, {
    growth: input.growth,
    time: input.time,
    wind,
    maxDepth: model.depth,
    scale,
    leaves: settings.leaves,
    blossoms: settings.blossoms,
    colors,
    grass: palette.grass,
  });
  ctx.restore();

  drawMotes(
    ctx,
    width,
    height,
    input.dt,
    input.time,
    Math.max(0.15, settings.wind),
    settings.blossoms,
    palette.mote,
    input.growth * (palette.night ? 0.7 : 1),
  );

  const vignette = ctx.createRadialGradient(width / 2, height * 0.42, height * 0.2, width / 2, height * 0.48, height * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, palette.night ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.16)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
