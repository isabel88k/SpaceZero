import { regionPolygon, islandTile, pointInRegion } from "./regions";
import type { CityId, GameState } from "./game";
import {
  WORLD,
  structuresForCity,
  project,
  terraceHeight,
  tileIsMars,
  type BuildingId,
  type Point,
  type Structure,
} from "./isometric";
type P = [number, number];
export type WorldFrame = {
  state: GameState;
  position: Point;
  moving: boolean;
  footprints: readonly TrailPoint[];
  direction: number;
  time: number;
  transform: number;
  path: Point[];
  hover: Point | null;
  reduced: boolean;
  cleaning: boolean;
  solarCharge: number;
  active: BuildingId | null;
};
const n = (x: number, y: number) => {
  const a = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return a - Math.floor(a);
};
function box(
  c: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
// Scanline polygons and Bresenham lines deliberately avoid antialiased vector edges.
function poly(c: CanvasRenderingContext2D, color: string, points: P[]) {
  c.fillStyle = color;
  const low = Math.ceil(Math.min(...points.map((p) => p[1]))),
    high = Math.floor(Math.max(...points.map((p) => p[1])));
  for (let y = low; y <= high; y++) {
    const intersections: number[] = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j],
        b = points[i];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
        intersections.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2)
      c.fillRect(
        Math.floor(intersections[i]),
        y,
        Math.ceil(intersections[i + 1]) - Math.floor(intersections[i]),
        1,
      );
  }
}
function line(
  c: CanvasRenderingContext2D,
  color: string,
  a: P,
  b: P,
  width = 1,
) {
  let x = Math.round(a[0]),
    y = Math.round(a[1]);
  const x2 = Math.round(b[0]),
    y2 = Math.round(b[1]),
    dx = Math.abs(x2 - x),
    sx = x < x2 ? 1 : -1,
    dy = -Math.abs(y2 - y),
    sy = y < y2 ? 1 : -1;
  let error = dx + dy;
  c.fillStyle = color;
  for (;;) {
    c.fillRect(x, y, width, width);
    if (x === x2 && y === y2) break;
    const e = 2 * error;
    if (e >= dy) {
      error += dy;
      x += sx;
    }
    if (e <= dx) {
      error += dx;
      y += sy;
    }
  }
}
export type TrailPoint = Point & { born: number };

export function createMotionTrail() {
  const points: TrailPoint[] = [];
  return {
    clear: () => {
      points.length = 0;
    },
    update(position: Point, time: number, moving: boolean, reduced: boolean) {
      if (reduced) points.length = 0;
      while (points.length && time - points[0].born >= 1000) points.shift();
      const previous = points.at(-1);
      if (
        !reduced &&
        moving &&
        (!previous ||
          (time - previous.born >= 85 &&
            Math.hypot(position.x - previous.x, position.y - previous.y) >= 3))
      )
        points.push({ ...position, born: time });
      return points;
    },
  };
}

export function drawMotionTrail(
  c: CanvasRenderingContext2D,
  points: readonly TrailPoint[],
  time: number,
  colors: [string, string],
) {
  c.save();
  points.forEach(({ x, y, born }) => {
    const age = (time - born) / 1000;
    const side = Math.floor(born / 85) % 2 ? 1 : -1;
    c.globalAlpha = (1 - age) * 0.75;
    box(c, colors[0], x + side * 4, y + 3 - age * 5, 3, 2);
    box(c, colors[1], x - side * 3, y + 1 - age * 8, 2, 2);
  });
  c.restore();
}

function q(p: Point, z = 0): P {
  const a = project(p);
  return [a.x, a.y - z];
}
function corners(x: number, y: number, w: number, d: number, z = 0): P[] {
  return [
    q({ x: x - 0.5, y: y - 0.5 }, z),
    q({ x: x + w - 0.5, y: y - 0.5 }, z),
    q({ x: x + w - 0.5, y: y + d - 0.5 }, z),
    q({ x: x - 0.5, y: y + d - 0.5 }, z),
  ];
}
const CLOUDS = [
  { x: 0.09, y: 0.18, width: 0.11, speed: 3.6 },
  { x: 0.28, y: 0.35, width: 0.09, speed: 2.8 },
  { x: 0.49, y: 0.11, width: 0.13, speed: 4.9 },
  { x: 0.71, y: 0.28, width: 0.1, speed: 3.2 },
  { x: 0.89, y: 0.46, width: 0.12, speed: 4.1 },
];
const STARS = Array.from({ length: 41 }, (_, i) => ({
  x: n(i, 22),
  y: n(i, 41) * 0.72,
  phase: n(i, 60) * Math.PI * 2,
  period: 3.8 + n(i, 9) * 5,
  size: i % 9 === 0 ? 2 : 1,
}));

export type SkyWeather =
  "clear" | "magnetic" | "storm" | "solar" | "shield" | "night";

const MARS_SKY = {
  clear: ["#090e23", "#222543", "#765366", "#bd8369"],
  magnetic: ["#150d29", "#372246", "#84566c", "#c2816d"],
  storm: ["#20182d", "#66404b", "#a76a50", "#d29a65"],
  solar: ["#310c23", "#741a38", "#ac373b", "#f88a55"],
  shield: ["#071323", "#12364a", "#325b79", "#81718a"],
  night: ["#090c1b", "#161d38", "#283356", "#49445f"],
};

function skyGlow(c: CanvasRenderingContext2D, color: string, opacity: number) {
  const { width, height } = c.canvas;
  c.save();
  c.globalAlpha = opacity;
  c.translate(width * 0.5, height * 0.51);
  c.scale(width * 0.52, height * 0.44);
  const light = c.createRadialGradient(0, 0, 0.08, 0, 0, 1);
  light.addColorStop(0, color);
  light.addColorStop(0.48, `${color}80`);
  light.addColorStop(1, `${color}00`);
  c.fillStyle = light;
  c.fillRect(-1, -1, 2, 2);
  c.restore();
}

function skyPlanet(c: CanvasRenderingContext2D, weather: SkyWeather) {
  const { width, height } = c.canvas;
  const radius = Math.max(15, Math.round(Math.min(width, height) * 0.083));
  const x = width * 0.82;
  const y = height * 0.31;
  const cold = weather === "shield" || weather === "night";
  const day = cold
    ? ["#b7def6", "#709cbb", "#414e83"]
    : ["#ffd6a3", "#c58383", "#71466c"];
  for (let row = -radius; row < radius; row += 2) {
    const span = Math.round(Math.sqrt(radius * radius - row * row));
    const lit = Math.max(0, Math.round(span * (0.8 - (row / radius) * 0.37)));
    box(c, day[2], x - span, y + row, span * 2, 2);
    const band = Math.sin(row * 0.34) + Math.cos(row * 0.16);
    box(c, band > 0.25 ? day[0] : day[1], x - span, y + row, lit * 1.35, 2);
  }
}

function magneticSky(
  c: CanvasRenderingContext2D,
  strength: number,
  seconds: number,
) {
  const { width, height } = c.canvas;
  const stride = Math.max(3, Math.round(width / 180));
  for (let ribbon = 0; ribbon < 3; ribbon++) {
    for (let x = 0; x < width; x += stride) {
      const u = x / width;
      const angle = u * 8 + ribbon * 1.8 + seconds * 0.85;
      const arc =
        0.22 +
        ribbon * 0.11 +
        Math.sin(angle) * 0.12 +
        Math.cos(u * 17 - seconds) * 0.034;
      const y = Math.round((height * arc) / 2) * 2;
      const lift = height * (0.04 + (1 + Math.sin(angle * 2.4)) * 0.025);
      const fade = Math.sin(u * Math.PI);
      c.globalAlpha =
        strength * fade * (0.25 + (1 + Math.sin(angle * 3.2)) * 0.12);
      box(c, ribbon === 1 ? "#ff70ba" : "#38efd4", x, y - lift, stride, lift);
      c.globalAlpha *= 1.45;
      box(c, ribbon === 1 ? "#ffd18b" : "#d0ffed", x, y - 2, stride, 3);
    }
  }
  c.globalAlpha = 1;
}

function andeanClouds(
  c: CanvasRenderingContext2D,
  daylight: number,
  seconds: number,
) {
  const { width, height } = c.canvas;
  for (let i = 0; i < 4; i++) {
    const spread = Math.round(width * (0.21 + i * 0.021));
    const x =
      ((width * (0.1 + i * 0.28) + seconds * (8 + i)) % (width + spread)) -
      spread / 2;
    const y = height * (0.51 + i * 0.092);
    c.globalAlpha = daylight * (i % 2 ? 0.4 : 0.6);
    box(c, "#cfeefa", x - spread * 0.13, y + 4, spread, 4);
    box(c, "#f6fdff", x, y, spread * 0.72, 4);
    box(c, "#f6fdff", x + spread * 0.28, y - 4, spread * 0.31, 4);
    box(c, "#d4f2ff", x + spread * 0.09, y + 13, spread * 0.58, 2);
  }
  c.globalAlpha = 1;
}

export function renderAtmosphere(
  c: CanvasRenderingContext2D,
  {
    city,
    transform,
    seconds,
    reduced,
    weather,
  }: {
    city: CityId;
    transform: number;
    seconds: number;
    reduced: boolean;
    weather: SkyWeather;
  },
) {
  const { width, height } = c.canvas;
  const daylight = 1 - transform;
  const clock = reduced ? 0 : seconds;
  c.imageSmoothingEnabled = false;
  c.save();
  if (daylight > 0) {
    const sky = c.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, city === "la-paz" ? "#345f9d" : "#529bcc");
    sky.addColorStop(0.54, city === "uyuni" ? "#a2dcea" : "#9ad2ec");
    sky.addColorStop(1, city === "uyuni" ? "#effaff" : "#d9eff4");
    c.fillStyle = sky;
    c.fillRect(0, 0, width, height);
    CLOUDS.forEach((cloud, i) => {
      const unit = Math.max(2, Math.round((width * cloud.width) / 16));
      const length = width + 24 * unit;
      const x = ((width * cloud.x + clock * cloud.speed) % length) - 12 * unit;
      const y = height * cloud.y;
      c.globalAlpha = 0.78 + (i % 3) * 0.08;
      box(c, "#dcebf3", x, y + 3 * unit, 16 * unit, 2 * unit);
      box(c, "#f7fbff", x + unit, y + unit, 14 * unit, 3 * unit);
      box(c, "#ffffff", x + 3 * unit, y, 8 * unit, 3 * unit);
      box(
        c,
        "#ffffff",
        x + 5 * unit,
        y - 2 * unit,
        (i % 2 ? 6 : 4) * unit,
        2 * unit,
      );
      box(c, "#f7fbff", x + 10 * unit, y, 3 * unit, 2 * unit);
    });
    if (city === "la-paz") andeanClouds(c, daylight, clock);
  }
  if (daylight > 0) {
    skyGlow(c, "#e1e894", daylight * 0.54);
    skyGlow(c, "#62cf9c", daylight * 0.37);
  }
  if (transform > 0) {
    c.globalAlpha = transform;
    const sky = c.createLinearGradient(0, 0, 0, height);
    const palette = MARS_SKY[weather];
    [0, 0.47, 0.77, 1].forEach((stop, i) => sky.addColorStop(stop, palette[i]));
    c.fillStyle = sky;
    c.fillRect(0, 0, width, height);
    const glow =
      weather === "storm"
        ? "#e8a15b"
        : weather === "solar"
          ? "#ff634d"
          : weather === "shield"
            ? "#43e6fa"
            : weather === "night"
              ? "#638bd0"
              : "#c08da0";
    skyGlow(c, glow, transform * (weather === "shield" ? 0.61 : 0.43));
    for (const star of STARS) {
      const twinkle = reduced
        ? 0.48
        : 0.48 +
          0.23 * Math.sin((seconds * Math.PI * 2) / star.period + star.phase);
      c.globalAlpha = transform * twinkle;
      box(c, "#fff0d7", star.x * width, star.y * height, star.size, star.size);
    }
  }
  if (transform > 0) {
    c.globalAlpha = transform * 0.7;
    skyPlanet(c, weather);
  }
  if (weather === "magnetic" && daylight > 0) {
    magneticSky(c, (0.35 + daylight * 0.55) * Math.min(1, daylight * 4), clock);
  }
  if (weather === "solar") {
    c.globalAlpha = 1;
    const radius = Math.max(width, height) * 0.48;
    const x = width * 0.23;
    const lamp = c.createRadialGradient(x, 0, 0, x, 0, radius);
    lamp.addColorStop(0, "#ff9b6a99");
    lamp.addColorStop(0.5, "#ff554746");
    lamp.addColorStop(1, "#ff554700");
    c.fillStyle = lamp;
    c.fillRect(0, 0, width, height);
  }
  c.restore();
}

const CONTACT_SHADOW = "rgba(0, 0, 0, 0.32)";
const ISLAND_DEPTH = 34;
const SOIL_DEPTH = 11;
const ISLAND_COLORS = {
  "santa-cruz": ["#79a954", "#4b743b", "#504e50", "#383b42"],
  uyuni: ["#c1c9b7", "#939e96", "#60545b", "#403d48"],
  "la-paz": ["#b3956f", "#80664f", "#574c53", "#3e3642"],
  mars: ["#b76c4c", "#8a4635", "#594148", "#3b303c"],
};

function islandGeometry(city: CityId | null) {
  const polygon = regionPolygon(city);
  const outline = polygon.map((point) => q(point));
  const winding = Math.sign(
    outline.reduce((area, [x, y], i) => {
      const [nextX, nextY] = outline[(i + 1) % outline.length];
      return area + x * nextY - y * nextX;
    }, 0),
  );
  // Only edges facing the viewer need a side wall. Paint the nearest faces last.
  const faces = outline
    .flatMap((a, i) => {
      const j = (i + 1) % outline.length;
      const b = outline[j];
      if ((b[0] - a[0]) * winding >= 0) return [];
      const tile = {
        x: (polygon[i].x + polygon[j].x) / 2,
        y: (polygon[i].y + polygon[j].y) / 2,
      };
      return [{ a, b, tile, dark: (b[1] - a[1]) * winding > 0 }];
    })
    .sort((left, right) => left.a[1] + left.b[1] - right.a[1] - right.b[1]);
  const minX = Math.min(...outline.map(([x]) => x));
  const width = Math.max(...outline.map(([x]) => x)) - minX;
  const front = Math.max(...outline.map(([, y]) => y));
  const fragments = [0.18, 0.37, 0.61, 0.83].map((fraction, i) => {
    const x = minX + width * fraction;
    const edgeY = Math.max(
      ...faces
        .filter(
          ({ a, b }) => x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]),
        )
        .map(({ a, b }) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])),
    );
    return { x, y: edgeY + ISLAND_DEPTH + 13 + (i % 3) * 5 };
  });
  return { outline, faces, minX, width, front, fragments };
}

const ISLAND_GEOMETRY = new Map<
  CityId | null,
  ReturnType<typeof islandGeometry>
>();

function islandBase(
  c: CanvasRenderingContext2D,
  island: ReturnType<typeof islandGeometry>,
  city: CityId | null,
  transform: number,
  time: number,
  reduced: boolean,
) {
  const { faces, minX, width, front, fragments } = island;
  c.save();
  c.translate(minX + width / 2 + 16, front + ISLAND_DEPTH + 11);
  c.scale(width * 0.46, width * 0.072);
  const shade = c.createRadialGradient(0, 0, 0.15, 0, 0, 1);
  shade.addColorStop(0, "rgba(15, 18, 31, 0.30)");
  shade.addColorStop(0.62, "rgba(15, 18, 31, 0.19)");
  shade.addColorStop(1, "rgba(15, 18, 31, 0)");
  c.fillStyle = shade;
  c.fillRect(-1, -1, 2, 2);
  c.restore();

  const colors = ISLAND_COLORS[city ?? "santa-cruz"];
  fragments.forEach(({ x, y }, i) => {
    const angle = time / (950 + i * 170) + i * 1.8;
    const driftX = x + (reduced ? 0 : Math.sin(angle * 0.65) * 2);
    const driftY = y + (reduced ? 0 : Math.sin(angle) * 3);
    const size = [7, 5, 8, 6][i];
    const palette = transform >= 0.6 ? ISLAND_COLORS.mars : colors;
    rock(c, driftX, driftY, size, [palette[0], palette[2], palette[3]]);
  });
  for (const { a, b, tile, dark } of faces) {
    const palette = tileIsMars(tile.x, tile.y, transform)
      ? ISLAND_COLORS.mars
      : colors;
    const side = dark ? 1 : 0;
    const soilA: P = [a[0], a[1] + SOIL_DEPTH];
    const soilB: P = [b[0], b[1] + SOIL_DEPTH];
    poly(c, palette[2 + side], [
      soilA,
      soilB,
      [b[0], b[1] + ISLAND_DEPTH],
      [a[0], a[1] + ISLAND_DEPTH],
    ]);
    poly(c, palette[side], [a, b, soilB, soilA]);
  }
}

function clipOutline(c: CanvasRenderingContext2D, outline: P[]) {
  c.beginPath();
  c.moveTo(...outline[0]);
  for (let i = 1; i < outline.length; i++) c.lineTo(...outline[i]);
  c.closePath();
  c.clip();
}

function rock(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  [top, left, right]: [string, string, string],
) {
  const a: P = [x - size, y - size / 2];
  const b: P = [x + size, y - size / 2];
  const front: P = [x + 1, y - 1];
  const tip: P = [x + 1, y + size / 2];
  poly(c, left, [a, front, tip, [x - size + 2, y]]);
  poly(c, right, [front, b, [x + size - 2, y + 1], tip]);
  poly(c, top, [a, [x - 2, y - size], [x + size - 2, y - size + 1], b, front]);
}

function contactShadow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  for (let row = -height; row <= height; row++) {
    const radius = Math.round(
      width * Math.sqrt(1 - (row / (height + 0.5)) ** 2),
    );
    box(c, CONTACT_SHADOW, x + row * 0.5 - radius, y + row, 2 * radius + 1, 1);
  }
}

function prism(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  d: number,
  h: number,
  z: number,
  colors: string[],
) {
  const p = corners(x, y, w, d, z),
    top = p.map(([x, y]) => [x, y - h] as P);
  poly(c, colors[1], [p[3], p[2], top[2], top[3]]);
  poly(c, colors[2], [p[1], p[2], top[2], top[1]]);
  poly(c, colors[0], top);
  line(c, "#fff4dc38", top[0], top[3]);
  return { p, top };
}
function diamond(
  c: CanvasRenderingContext2D,
  color: string,
  p: Point,
  w = 32,
  h = 16,
) {
  poly(c, color, [
    [p.x, p.y - h],
    [p.x + w, p.y],
    [p.x, p.y + h],
    [p.x - w, p.y],
  ]);
}
const between = (a: P, b: P, t: number): P => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

function faceWindow(
  c: CanvasRenderingContext2D,
  left: P,
  right: P,
  t: number,
  z: number,
  width: number,
  height: number,
  color: string,
  reflection = "#c7ded2",
) {
  const start = between(left, right, t);
  const end = between(start, right, width / (right[0] - start[0]));
  start[1] -= z;
  end[1] -= z;
  const [a, b] = start[0] < end[0] ? [start, end] : [end, start];
  poly(c, "#262a36", [a, b, [b[0], b[1] + height], [a[0], a[1] + height]]);
  const innerLeft = between(a, b, 2 / (b[0] - a[0]));
  const innerRight = between(b, a, 2 / (b[0] - a[0]));
  poly(c, color, [
    [innerLeft[0], innerLeft[1] + 2],
    [innerRight[0], innerRight[1] + 2],
    [innerRight[0], innerRight[1] + height - 2],
    [innerLeft[0], innerLeft[1] + height - 2],
  ]);
  line(
    c,
    reflection,
    [innerLeft[0], innerLeft[1] + 2],
    [innerRight[0], innerRight[1] + 2],
  );
}
function palm(c: CanvasRenderingContext2D, x: number, y: number) {
  const crown: P = [x - 3, y - 29];
  line(c, "#5f5340", [x + 2, y], crown, 5);
  line(c, "#ad9360", [x, y], [crown[0] - 1, crown[1]], 2);
  for (const height of [5, 12, 19]) {
    box(c, "#746045", x - (height > 10 ? 3 : 1), y - height, 5, 2);
  }

  const leaf = (shape: P[], color: string) =>
    poly(
      c,
      color,
      shape.map(([dx, dy]) => [crown[0] + dx, crown[1] + dy]),
    );
  leaf(
    [
      [0, 2],
      [4, -8],
      [15, -12],
      [22, -9],
      [28, -1],
      [19, -5],
      [12, -5],
    ],
    "#397442",
  );
  leaf(
    [
      [0, 2],
      [10, -2],
      [19, 0],
      [25, 7],
      [24, 12],
      [17, 7],
      [9, 5],
    ],
    "#397442",
  );
  leaf(
    [
      [0, 2],
      [5, -12],
      [2, -19],
      [-4, -22],
      [-6, -14],
      [-3, -8],
    ],
    "#78ae55",
  );
  leaf(
    [
      [1, 2],
      [-7, -10],
      [-17, -12],
      [-25, -7],
      [-28, 0],
      [-19, -5],
      [-12, -4],
    ],
    "#78ae55",
  );
  leaf(
    [
      [0, 2],
      [-9, -1],
      [-19, 3],
      [-25, 10],
      [-22, 15],
      [-15, 9],
      [-8, 6],
    ],
    "#4d8948",
  );
  line(
    c,
    "#a8cf72",
    [crown[0] - 14, crown[1] - 9],
    [crown[0] - 5, crown[1] - 5],
    2,
  );
  box(c, "#ad8d50", crown[0] - 1, crown[1], 6, 4);
}

function tiledRoof(c: CanvasRenderingContext2D, base: P[], rise: number) {
  const ridge = [
    between(base[0], base[3], 0.5),
    between(base[1], base[2], 0.5),
  ];
  for (const p of ridge) p[1] -= rise;
  poly(c, "#913e34", [base[1], base[2], ridge[1]]);
  poly(c, "#b54d36", [base[0], base[1], ridge[1], ridge[0]]);
  poly(c, "#dd7544", [base[3], base[2], ridge[1], ridge[0]]);
  for (const [start, end, shade, edge] of [
    [base[0], base[1], "#813a35", "#d36f4a"],
    [base[3], base[2], "#a64b35", "#f19158"],
  ] as const) {
    let prev = [start, end];
    for (let row = 1; row <= 4; row++) {
      const t = row / 5;
      const a = between(start, ridge[0], t);
      const b = between(end, ridge[1], t);
      line(c, shade, a, b);
      line(c, edge, [a[0], a[1] - 1], [b[0], b[1] - 1]);
      for (let col = 1; col <= 6; col++) {
        const u = (col - (row % 2 ? 0.5 : 0)) / 7;
        line(c, shade, between(a, b, u), between(prev[0], prev[1], u));
      }
      prev = [a, b];
    }
  }
  line(c, "#f7a067", ridge[0], ridge[1], 2);
  line(c, "#843a32", base[3], base[2], 2);
}
function urban(
  c: CanvasRenderingContext2D,
  b: Structure,
  city: CityId | null,
  z: number,
) {
  const paz = city === "la-paz",
    salt = city === "uyuni";
  const h = b.id === "probe" ? 24 : b.id === "garage" ? 35 : paz ? 50 : 34;
  const a = prism(
    c,
    b.x,
    b.y,
    b.w,
    b.d,
    h,
    z,
    salt
      ? ["#fff0cc", "#c5b896", "#978c7e"]
      : paz
        ? ["#e2a57d", "#a2644e", "#73443c"]
        : ["#ffe0aa", "#ceb590", "#9b896b"],
  );
  tiledRoof(c, a.top, salt ? 12 : 17);
  for (const t of [0.15, 0.6])
    faceWindow(c, a.p[3], a.p[2], t, h - 10, 13, 11, "#6a9695");
  if (paz) {
    const p = between(a.top[0], a.top[3], 0.36);
    box(c, "#b5856d", p[0] - 4, p[1] - 23, 8, 15);
    box(c, "#eac29d", p[0] - 5, p[1] - 24, 10, 3);
  }
  faceWindow(c, a.p[1], a.p[2], 0.7, h - 7, -13, 18, "#495b63");
}
function refuge(
  c: CanvasRenderingContext2D,
  b: Structure,
  z: number,
  time: number,
) {
  prism(c, b.x - 0.08, b.y - 0.08, 2.16, 2.16, 6, z, [
    "#7a8587",
    "#505b61",
    "#363f4b",
  ]);

  const rim = (inset: number, height: number) => {
    const x0 = b.x - 0.5 + inset;
    const x1 = b.x + 1.5 - inset;
    const y0 = b.y - 0.5 + inset;
    const y1 = b.y + 1.5 - inset;
    const bevel = 0.3;
    return [
      q({ x: x0 + bevel, y: y0 }, z + height),
      q({ x: x1 - bevel, y: y0 }, z + height),
      q({ x: x1, y: y0 + bevel }, z + height),
      q({ x: x1, y: y1 - bevel }, z + height),
      q({ x: x1 - bevel, y: y1 }, z + height),
      q({ x: x0 + bevel, y: y1 }, z + height),
      q({ x: x0, y: y1 - bevel }, z + height),
      q({ x: x0, y: y0 + bevel }, z + height),
    ];
  };
  const footing = rim(0.12, 6);
  const belt = rim(0, 13);
  const shoulder = rim(0, 39);
  const roof = rim(0.26, 53);
  const walls = ["#899da5", "#9eaaa9", "#c6c7b6", "#d9d6c4"];
  const cap = ["#a3b2b7", "#c0c8c1", "#e4e3d1", "#f3ead8"];
  for (let i = 2; i <= 5; i++) {
    const j = i + 1;
    poly(c, "#6b777c", [footing[i], footing[j], belt[j], belt[i]]);
    poly(c, walls[i - 2], [belt[i], belt[j], shoulder[j], shoulder[i]]);
    poly(c, cap[i - 2], [shoulder[i], shoulder[j], roof[j], roof[i]]);
    line(c, "#505d65", belt[i], belt[j], 2);
    line(c, "#faf1dc", shoulder[i], shoulder[j]);
  }
  poly(c, "#fff1d6", roof);
  line(c, "#fff9ed", roof[0], roof[7], 2);
  line(
    c,
    "#bdc8c7",
    between(roof[7], roof[6], 0.55),
    between(roof[2], roof[3], 0.55),
    2,
  );

  faceWindow(c, belt[5], belt[4], 0.1, 20, 12, 9, "#ffd172", "#fff5be");
  faceWindow(c, belt[5], belt[4], 0.33, 17, 11, 8, "#ffbe54", "#fff5be");
  faceWindow(c, belt[3], belt[2], 0.15, 18, 15, 9, "#f8be65", "#fff5be");

  const jamb = between(footing[5], footing[4], 0.64);
  const door: P[] = [
    [jamb[0], jamb[1] - 23],
    [jamb[0] + 4, jamb[1] - 25],
    [jamb[0] + 16, jamb[1] - 19],
    [jamb[0] + 19, jamb[1] - 13],
    [jamb[0] + 19, jamb[1] + 9],
    [jamb[0], jamb[1]],
  ];
  poly(c, "#425462", door);
  line(c, "#f0efe0", door[0], door[1], 2);
  line(c, "#c4cdd0", door[1], door[2], 2);
  line(c, "#96a7aa", door[2], door[3], 2);
  line(
    c,
    "#303c47",
    [jamb[0] + 9, jamb[1] - 22],
    [jamb[0] + 9, jamb[1] + 4],
    2,
  );
  box(c, "#f0b664", jamb[0] + 12, jamb[1] - 9, 4, 2);

  const beacon = q({ x: b.x + 0.65, y: b.y + 0.32 }, z + 54);
  box(c, "#798c95", beacon[0] - 6, beacon[1] - 3, 12, 4);
  box(c, "#d1dcd8", beacon[0] - 2, beacon[1] - 13, 4, 10);
  const pulse = (1 + Math.cos((time * Math.PI * 2) / 2300)) / 2;
  box(
    c,
    `rgba(255, 188, 91, ${pulse * 0.2})`,
    beacon[0] - 7,
    beacon[1] - 19,
    14,
    11,
  );
  box(c, "#ba6144", beacon[0] - 4, beacon[1] - 16, 8, 6);
  box(
    c,
    `rgba(255, 220, 128, ${0.35 + pulse * 0.65})`,
    beacon[0] - 4,
    beacon[1] - 16,
    7,
    4,
  );
}

const DOME_RIB = [0, 0.13, 0.3, 0.5, 0.7, 0.87, 1];

function greenhouse(
  c: CanvasRenderingContext2D,
  b: Structure,
  z: number,
  s: GameState,
  time: number,
) {
  const lit = s.solActual === 1 && s.greenhouse.status === "running";
  const pulse = lit
    ? (0.78 + Math.sin(time / 460) * 0.18) * (0.55 + s.greenhouse.uv / 220)
    : 0;
  if (lit) {
    const [x, y] = q({ x: b.x + 0.5, y: b.y + 0.5 }, z + 8);
    c.save();
    c.translate(x, y);
    c.scale(1, 0.56);
    const lamp = c.createRadialGradient(0, 0, 10, 0, 0, 83);
    lamp.addColorStop(0, "#bb84fb");
    lamp.addColorStop(0.63, "#7948d062");
    lamp.addColorStop(1, "#7948d000");
    c.globalAlpha = pulse * 0.64;
    c.fillStyle = lamp;
    c.fillRect(-83, -83, 166, 166);
    c.restore();
  }
  const { top } = prism(c, b.x, b.y, 2, 2, 8, z, [
    "#b7c4bd",
    "#828f90",
    "#566975",
  ]);
  const rib = (x: number) =>
    DOME_RIB.map((t) =>
      q({ x, y: b.y - 0.5 + t * 2 }, z + 8 + Math.sin(t * Math.PI) * 31),
    );
  const back = rib(b.x - 0.5);
  const middle = rib(b.x + 0.5);
  const front = rib(b.x + 1.5);
  poly(c, "#34889583", back);
  poly(c, "#266f7182", top);
  for (let i = 0; i < 3; i++) {
    for (const y of [b.y - 0.06, b.y + 0.77]) {
      const [x, ground] = q({ x: b.x - 0.07 + i * 0.62, y }, z + 11);
      const alive = s.resources.saludCosecha >= 35;
      const height = 6 + s.greenhouse.growth * 0.09 + (i % 2) * 2;
      const leaf: P = [x, ground - height];
      diamond(c, "#49473d", { x, y: ground }, 9, 5);
      diamond(c, "#886b4a", { x, y: ground - 2 }, 8, 4);
      diamond(c, alive ? "#a4ff602d" : "#bea04c25", { x, y: ground - 4 }, 9, 5);
      line(c, alive ? "#4cde73" : "#977a46", [x, ground - 2], leaf, 2);
      poly(c, alive ? "#6dfa64" : "#b19353", [
        [x, leaf[1] + 5],
        [x - 8, leaf[1] + 2],
        [x - 6, leaf[1] - 1],
        [x - 2, leaf[1]],
      ]);
      poly(c, alive ? "#c3ff79" : "#ceb66b", [
        [x, leaf[1] + 4],
        [x + 3, leaf[1] - 3],
        [x + 8, leaf[1] - 4],
        [x + 6, leaf[1]],
      ]);
    }
  }
  const panes = [
    "#55d8ff32",
    "#a7edff55",
    "#8ddaf44d",
    "#6dcfea42",
    "#3eafc634",
    "#168eac42",
  ];
  for (let i = 0; i < panes.length; i++) {
    const pane = [back[i], back[i + 1], front[i + 1], front[i]];
    poly(c, panes[i], pane);
    if (lit) {
      poly(
        c,
        i < 4
          ? `rgba(166, 74, 255, ${pulse * 0.54})`
          : `rgba(135, 253, 171, ${pulse * 0.5})`,
        pane,
      );
    }
  }
  poly(c, "#5bd8f22c", front);
  poly(c, `rgba(165, 140, 248, ${s.greenhouse.uv / 840})`, top);
  for (let i = 0; i < DOME_RIB.length - 1; i++) {
    for (const [arch, color] of [
      [back, "#b3d5db"],
      [middle, "#e9fbfc"],
      [front, "#f2ffff"],
    ] as const) {
      line(c, color, arch[i], arch[i + 1], 2);
    }
  }
  for (const i of [0, 2, 4, 6]) {
    const color = lit
      ? i < 4
        ? "#f4cbff"
        : "#ccffaf"
      : i < 4
        ? "#ecffff"
        : "#90bbc9";
    line(c, color, back[i], front[i], 2);
  }
  line(
    c,
    "#fdffff",
    between(back[1], middle[1], 0.36),
    between(back[1], middle[1], 0.85),
    2,
  );
  const threshold = between(front[0], front[6], 0.52);
  box(c, "#becdd1", threshold[0] - 4, threshold[1] - 3, 12, 3);
}

function solar(
  c: CanvasRenderingContext2D,
  b: Structure,
  z: number,
  {
    cleaning,
    dusty,
    charge,
    time,
  }: { cleaning: boolean; dusty: boolean; charge: number; time: number },
) {
  for (let row = 0; row < 2; row++) {
    const panel = (u: number, v: number) =>
      q(
        { x: b.x - 0.49 + 1.96 * u, y: b.y - 0.47 + row + 0.88 * v },
        z + 16 + 12 * (1 - v),
      );
    for (const u of [0.17, 0.82]) {
      const p = panel(u, 0.45);
      const ground = p[1] + 21;
      box(c, "#444e59", p[0] - 5, ground - 2, 12, 4);
      line(c, "#879ca6", [p[0], ground], p, 3);
      line(c, "#b1cacf", [p[0] - 1, ground - 6], [p[0] - 1, p[1]], 1);
    }

    const plate = [panel(0, 0), panel(1, 0), panel(1, 1), panel(0, 1)];
    const lower = plate.map(([x, y]) => [x, y + 3] as P);
    poly(c, "#365370", [plate[3], plate[2], lower[2], lower[3]]);
    poly(c, "#182b40", [plate[1], plate[2], lower[2], lower[1]]);
    poly(c, "#172d54", plate);
    for (let i = 0; i < 6; i++) {
      const u = i / 6;
      const end = (i + 1) / 6;
      poly(c, cleaning ? "#25649a" : i % 2 ? "#193d70" : "#204778", [
        panel(u, 0),
        panel(end, 0),
        panel(end, 1),
        panel(u, 1),
      ]);
    }
    for (let i = 1; i < 6; i++)
      line(c, "#73c5ec", panel(i / 6, 0), panel(i / 6, 1));
    line(c, "#9adcf6", panel(0, 0.5), panel(1, 0.5));

    const sweep = (((time + row * 145) % 3800) - 570) / 850;
    if (!dusty && sweep > -0.24 && sweep < 1.18) {
      const edge = (u: number) => Math.max(0, Math.min(1, u));
      poly(c, "#b8faff60", [
        panel(edge(sweep), 0),
        panel(edge(sweep + 0.14), 0),
        panel(edge(sweep + 0.28), 1),
        panel(edge(sweep + 0.14), 1),
      ]);
      line(
        c,
        "#f0ffffad",
        panel(edge(sweep + 0.05), 0),
        panel(edge(sweep + 0.19), 1),
      );
    }
    if (dusty && !cleaning) {
      poly(c, "#dba15c69", plate);
      for (let i = 0; i < 17; i++) {
        const [x, y] = panel(
          0.05 + n(i, row) * 0.9,
          0.08 + n(i, row + 32) * 0.84,
        );
        box(c, i % 5 ? "#b8794d" : "#ffe0a5b0", x, y, i % 5 ? 3 : 2, 2);
      }
    }
    if (cleaning) {
      for (let i = 0; i < 10; i++) {
        const drift = (time / 940 + i * 0.157 + row * 0.2) % 1;
        const [x, y] = panel(0.14 + n(i, row) * 0.71, 0.5);
        box(
          c,
          `rgba(255, 194, 126, ${0.78 * (1 - drift)})`,
          x + 27 * drift,
          y - 36 * drift,
          2 + (i % 3),
          2,
        );
      }
    }
    if (charge > 0) {
      const [x, y] = panel(0.5, 0.5);
      c.save();
      c.globalAlpha = charge;
      poly(c, "#87f4ff9c", plate);
      box(c, "#defdff", x - 9, y - 1, 19, 3);
      box(c, "#defdff", x - 1, y - 7, 3, 15);
      for (let i = 0; i < 7; i++) {
        const spread = 7 + (1 - charge) * 22;
        box(
          c,
          "#78e7ff",
          x + (n(i, row) - 0.5) * spread * 2.6,
          y - spread * n(i, row + 70),
          3,
          2,
        );
      }
      c.restore();
    }
    for (let i = 0; i < 4; i++) {
      line(
        c,
        charge > 0 ? "#baf6ff" : i === 0 || i === 3 ? "#e2eff3" : "#7199b4",
        plate[i],
        plate[(i + 1) % 4],
        2,
      );
    }
  }
}

function antenna(
  c: CanvasRenderingContext2D,
  b: Structure,
  z: number,
  time: number,
  connected: boolean,
) {
  const [x, y] = q({ x: b.x + 0.5, y: b.y + 0.5 }, z);
  for (const [dx, dy] of [
    [-23, 6],
    [16, -9],
    [24, 12],
  ]) {
    const leg: P = [x + dx, y + dy];
    diamond(c, "#3e4850", { x: leg[0], y: leg[1] }, 7, 3);
    line(c, dx < 0 ? "#c4ceca" : "#8599a3", [x, y - 29], leg, 4);
    line(c, "#4f656c", [x, y - 16], leg, 2);
    box(c, "#a4b8bb", leg[0] - 2, leg[1] - 2, 4, 3);
  }
  box(c, "#e2e4d3", x - 4, y - 50, 9, 31);
  box(c, "#738993", x + 2, y - 50, 3, 31);
  box(c, "#657982", x - 8, y - 49, 16, 7);

  const swing = Math.sin(time / 1100);
  const dish = (dx: number, dy: number): P => [
    x + swing * 3 + dx * (1 - Math.abs(swing) * 0.2),
    y - 53 + dy + swing * dx * 0.24,
  ];
  poly(c, "#a3b4b9", [
    dish(-33, -10),
    dish(-24, -19),
    dish(-7, -22),
    dish(12, -18),
    dish(30, -6),
    dish(28, 5),
    dish(14, 14),
    dish(-1, 17),
    dish(-19, 12),
    dish(-31, 2),
  ]);
  poly(c, "#4a626d", [
    dish(-31, -6),
    dish(-19, 5),
    dish(3, 10),
    dish(20, 7),
    dish(30, -6),
    dish(28, 5),
    dish(14, 14),
    dish(-1, 17),
    dish(-19, 12),
    dish(-31, 2),
  ]);
  poly(c, "#d7e6e4", [
    dish(-31, -10),
    dish(-23, -18),
    dish(-7, -21),
    dish(12, -17),
    dish(29, -6),
    dish(19, 3),
    dish(1, 7),
    dish(-18, 3),
  ]);
  line(c, "#fcf9e6", dish(-23, -17), dish(-7, -20), 2);
  line(c, "#a1bac4", dish(-18, -14), dish(19, 3));
  line(c, "#acc1c7", dish(10, -16), dish(-5, 6));
  line(c, "#9d7054", dish(0, 1), dish(9, -27), 3);
  line(c, "#efe2bd", dish(1, -1), dish(10, -26), 1);
  const feed = dish(9, -27);
  box(c, connected ? "#8cf892" : "#fdb077", feed[0] - 3, feed[1] - 3, 6, 5);
  if (connected) {
    for (let k = 0; k < 3; k++) {
      const d = 12 + k * 8 + (Math.floor(time / 200) % 4);
      line(
        c,
        "#5ce1e650",
        [feed[0] + d / 2, feed[1] - d],
        [feed[0] + d, feed[1] - d + 8],
      );
    }
  }
}
function garage(c: CanvasRenderingContext2D, b: Structure, z: number) {
  prism(c, b.x - 0.1, b.y - 0.1, 2.2, 2.2, 5, z, [
    "#696260",
    "#4a464c",
    "#41404a",
  ]);
  const a = prism(c, b.x, b.y, 2, 2, 37, z + 5, [
    "#c1b89c",
    "#a28771",
    "#8c7466",
  ]);
  prism(c, b.x + 0.1, b.y + 0.1, 1.8, 1.8, 7, z + 42, [
    "#c77553",
    "#a65a46",
    "#8f4e41",
  ]);
  const p = a.p;
  poly(c, "#2b2c35", [
    [p[3][0] + 8, p[3][1] - 27],
    [p[2][0] - 7, p[2][1] - 27],
    [p[2][0] - 7, p[2][1] - 3],
    [p[3][0] + 8, p[3][1] - 3],
  ]);
  line(
    c,
    "#bdc1ac",
    [p[3][0] + 6, p[3][1] - 28],
    [p[2][0] - 6, p[2][1] - 28],
    3,
  );
  const rover = q({ x: b.x + 0.5, y: b.y + 1.4 }, z + 7);
  poly(c, "#c9bea1", [
    [rover[0] - 17, rover[1] - 9],
    [rover[0], rover[1] - 17],
    [rover[0] + 19, rover[1] - 8],
    [rover[0], rover[1] + 1],
  ]);
  box(c, "#242b37", rover[0] - 13, rover[1] - 2, 8, 6);
  box(c, "#242b37", rover[0] + 9, rover[1] - 2, 8, 6);
  box(c, "#779aa4", rover[0] - 3, rover[1] - 14, 11, 5);
  line(
    c,
    "#c9c8b6",
    [rover[0] + 2, rover[1] - 13],
    [rover[0] + 2, rover[1] - 24],
    1,
  );
}
function avatar(c: CanvasRenderingContext2D, frame: WorldFrame) {
  const { position, moving, direction, state } = frame;
  const time = frame.reduced ? 0 : frame.time;
  const mars = tileIsMars(position.x, position.y, frame.transform);
  const elevation = mars
    ? 0
    : terraceHeight(position.x, position.y, state.cityId);
  const p = project(position),
    x = Math.round(p.x),
    y = Math.round(p.y - elevation);
  const step =
    moving && !frame.reduced ? [0, 2, 0, -2][Math.floor(time / 115) % 4] : 0;
  const bob =
    moving && !frame.reduced && Math.floor(time / 115) % 2 === 0 ? 1 : 0;
  const breath =
    mars && !moving && !frame.reduced
      ? Math.round((1 - Math.cos((time * 2 * Math.PI) / 2400)) / 2)
      : 0;
  const suit = mars
    ? "#e9dfc7"
    : state.cityId === "la-paz"
      ? "#c77858"
      : "#e6b25d";
  const shade = mars ? "#acb7b1" : "#8a7560";
  const dy = y - bob - breath;
  box(c, shade, x - 8, dy - 21, 5, 15);
  box(c, suit, x - 5, dy - 22, 12, 16);
  box(c, suit, x - 9, dy - 18 - step, 4, 10);
  box(c, suit, x + 7, dy - 18 + step, 4, 10);
  const bootY = y - bob;
  box(c, shade, x - 5, bootY - 7, 5, 7 + step);
  box(c, suit, x + 3, bootY - 7, 5, 7 - step);
  box(c, "#353942", x - 7, bootY - 1 + step, 8, 3);
  box(c, "#353942", x + 2, bootY - 1 - step, 8, 3);
  if (mars) {
    box(c, "#f3e6c9", x - 5, dy - 32, 11, 3);
    box(c, suit, x - 8, dy - 29, 17, 11);
    const visor = x - 5 + (direction < 0 ? -1 : 1);
    box(c, "#203e56", visor, dy - 28, 11, 7);
    box(c, "#5296a5", visor + 1, dy - 27, 9, 3);
    line(c, "#f5ffff", [visor + 6, dy - 27], [visor + 2, dy - 23]);
    box(c, "#9de2e9", visor + 8, dy - 26, 2, 1);
    box(c, "#c36d53", x + 3, dy - 18, 3, 4);
    box(c, "#879d98", x - 3, dy - 12, 6, 2);
  } else {
    box(c, "#b98e6e", x - 5, dy - 31, 11, 11);
    box(c, "#483c36", x - 6, dy - 32, 13, 5);
    box(c, "#282f36", x + (direction < 0 ? -4 : 3), dy - 25, 2, 2);
  }
  if (frame.cleaning) {
    line(c, "#d1bb86", [x + 8, y - 17], [x + 21, y - 10], 2);
    line(c, "#a59c7f", [x + 21, y - 18], [x + 21, y + 4], 2);
    box(c, "#bdb79a", x + 16, y + 2, 12, 3);
  }
}
const GOAL_HEIGHT: Record<BuildingId, number> = {
  refuge: 70,
  greenhouse: 54,
  solar: 55,
  probe: 80,
  garage: 60,
};
const RING_POINTS = Array.from({ length: 32 }, (_, i): P => {
  const angle = (i * Math.PI) / 16;
  return [Math.cos(angle), Math.sin(angle)];
});

function goalRing(c: CanvasRenderingContext2D, p: Point, wave: number) {
  const ring = RING_POINTS.map(([x, y]): P => [
    p.x + x * (51 + wave * 5),
    p.y + y * (29 + wave * 3),
  ]);
  c.save();
  c.globalAlpha = 0.74 + wave * 0.26;
  for (let i = 0; i < ring.length; i++) {
    line(c, "#694331", ring[i], ring[(i + 1) % ring.length], 3);
  }
  for (let i = 0; i < ring.length; i++) {
    line(c, "#ffe267", ring[i], ring[(i + 1) % ring.length], 2);
  }
  c.restore();
}

function goalArrow(c: CanvasRenderingContext2D, x: number, y: number) {
  const arrow: P[] = [
    [x - 5, y - 22],
    [x + 5, y - 22],
    [x + 5, y - 12],
    [x + 13, y - 12],
    [x + 13, y - 8],
    [x, y + 3],
    [x - 13, y - 8],
    [x - 13, y - 12],
    [x - 5, y - 12],
  ];
  poly(c, "#ffe14e", arrow);
  for (let i = 0; i < arrow.length; i++) {
    line(c, "#5c411e", arrow[i], arrow[(i + 1) % arrow.length], 2);
  }
  box(c, "#fff4ab", x - 2, y - 19, 3, 8);
}

function martianDust(
  c: CanvasRenderingContext2D,
  time: number,
  storm: boolean,
) {
  const travel = storm ? 4.2 : 1;
  for (let i = 0; i < 14; i++) {
    const speed = 0.012 + (i % 4) * 0.003;
    const x = ((i * 173 + time * speed * travel) % (WORLD.width + 12)) - 6;
    const y =
      ((i * 73 + 42 + (storm ? time * speed * 1.2 : 0)) % WORLD.height) +
      Math.sin(time / 1500 + i) * 4;
    if (storm) {
      const length = 20 + (i % 5) * 12;
      line(
        c,
        i % 3 ? "#ffc88f72" : "#ffe1ac9c",
        [x, y],
        [x + length, y + length * 0.29],
        i % 4 ? 1 : 2,
      );
    }
    box(
      c,
      storm ? "#f2a9676b" : "#efa05c47",
      x,
      y,
      storm ? 4 + (i % 3) : 2 + (i % 2),
      i % 4 === 0 ? 2 : 1,
    );
  }
}

type ChargedTile = { center: Point; vertices: P[]; age: number };

function shockwave(c: CanvasRenderingContext2D, tiles: ChargedTile[]) {
  for (const { center, vertices, age } of tiles) {
    c.save();
    const strength = Math.max(0, 1 - Math.abs(age) / 0.09);
    c.globalAlpha = 0.18 + strength * 0.65;
    const tint = age >= 0 ? "#ff6b4b" : "#5ce1e6";
    diamond(c, age >= 0 ? "#ff772d38" : "#65eee82e", center, 30, 15);
    for (const i of [1, 2]) {
      line(c, tint, vertices[i], vertices[i + 1], 3);
      line(c, i === 1 ? "#ffd09c" : "#ffc2ec", vertices[i], vertices[i + 1]);
    }
    c.restore();
  }
}

function risingPixels(c: CanvasRenderingContext2D, tiles: ChargedTile[]) {
  for (const { center, age } of tiles) {
    if (age < 0) continue;
    for (let i = 0; i < 5; i++) {
      const t = age * (8 + i * 2);
      const seed = n(center.x, i);
      const x = center.x + (seed - 0.5) * (48 + t * 20);
      const y = center.y - t * (28 + seed * 35) - i * 2;
      c.globalAlpha = 0.85 * Math.max(0, 1 - t * 0.78);
      box(
        c,
        i % 3 === 0 ? "#5ce1e6" : i % 3 === 1 ? "#ff6b4b" : "#ffbadb",
        x,
        y,
        i % 2 ? 2 : 4,
        i % 2 ? 2 : 3,
      );
    }
  }
  c.globalAlpha = 1;
}

const foliage = new Map<
  CityId | null,
  { common: Point[]; regional: Point[] }
>();

function decorationsFor(city: CityId | null, structures: Structure[]) {
  const cached = foliage.get(city);
  if (cached) return cached;

  const common: Point[] = [];
  const regional: Point[] = [];
  for (let x = 0; x < WORLD.size; x++) {
    for (let y = 0; y < WORLD.size; y++) {
      const p = { x: x + 0.25, y: y + 0.25 };
      if (
        !pointInRegion(p, city) ||
        structures.some((b) => Math.hypot(b.x - p.x, b.y - p.y) <= 1.4)
      )
        continue;

      const seed = n(x, y);
      if (seed > 0.86) {
        common.push(p);
      } else if (city === "santa-cruz" && seed > 0.64 && x !== 5 && y !== 5) {
        const palm = { x: x + 0.44, y: y + 0.14 };
        if (pointInRegion(palm, city)) regional.push(palm);
      } else if (
        city === "la-paz" &&
        seed > 0.42 &&
        ((terraceHeight(p.x, p.y, city) >= 5 && !islandTile(p, city)) ||
          !islandTile({ x: p.x, y: p.y - 0.65 }, city))
      ) {
        regional.push(p);
      }
    }
  }

  const points = { common, regional };
  foliage.set(city, points);
  return points;
}

function andeanPeak(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const tip: P = [x - 3, y - size];
  const left: P = [x - size * 0.54, y - 3];
  const right: P = [x + size * 0.53, y - 2];
  const near: P = [x + 2, y + 5];
  poly(c, "#7d87a1", [left, tip, near]);
  poly(c, "#505b79", [tip, right, near]);
  poly(c, "#effaff", [
    tip,
    [x + size * 0.24, y - size * 0.58],
    [x + 3, y - size * 0.66],
    [x + 1, y - size * 0.51],
    [x - 8, y - size * 0.64],
    [x - size * 0.25, y - size * 0.59],
  ]);
  line(c, "#a9d0e2", [x + 1, y - size * 0.51], [x + 3, y + 1], 2);
}

function tropicalPollen(
  c: CanvasRenderingContext2D,
  p: P,
  time: number,
  seed: number,
) {
  for (let i = 0; i < 3; i++) {
    const phase = (time / 4100 + seed + i / 3) % 1;
    const x = p[0] - 17 + phase * 42;
    const y = p[1] - 33 - phase * 18 + Math.sin(phase * 7 + i) * 7;
    box(c, i === 0 ? "#c3f078be" : "#fff2a7a6", x, y, i === 0 ? 3 : 2, 2);
  }
}

function saltGlint(
  c: CanvasRenderingContext2D,
  p: Point,
  x: number,
  y: number,
  time: number,
) {
  const seed = n(x, y);
  if (seed < 0.6) return;
  const shine = (1 + Math.sin(time / 510 + seed * 22)) / 2;
  c.globalAlpha = 0.28 + shine * 0.72;
  const px = p.x - 13 + n(x, y + 90) * 26;
  const py = p.y - 5 + seed * 8;
  const radius = 2 + Math.round(shine * 3);
  box(c, "#36b8df67", px - radius - 1, py + 1, radius * 2 + 3, 2);
  box(c, "#ffffff", px - radius, py, radius * 2 + 1, 1);
  box(c, "#ffffff", px, py - radius, 1, radius * 2 + 1);
  box(c, "#effdff", px, py, 2, 2);
  c.globalAlpha = 1;
}

function tintScene(c: CanvasRenderingContext2D, color: string) {
  c.save();
  c.globalCompositeOperation = "source-atop";
  box(c, color, 0, 0, WORLD.width, WORLD.height);
  c.restore();
}

function shieldDome(
  c: CanvasRenderingContext2D,
  island: ReturnType<typeof islandGeometry>,
  time: number,
) {
  const { outline, minX, width, front } = island;
  const x = minX + width / 2;
  const half = width / 2 + 37;
  const top = Math.max(9, Math.min(...outline.map(([, y]) => y)) - 68);
  const base = front + 17;
  const h = base - top;
  const shell: P[] = [
    [x - half, base - h * 0.24],
    [x - half * 0.97, top + h * 0.32],
    [x - half * 0.64, top + h * 0.11],
    [x - half * 0.28, top],
    [x + half * 0.28, top],
    [x + half * 0.64, top + h * 0.11],
    [x + half * 0.97, top + h * 0.32],
    [x + half, base - h * 0.24],
    [x + half * 0.64, base - h * 0.08],
    [x + half * 0.29, base],
    [x - half * 0.29, base],
    [x - half * 0.64, base - h * 0.08],
  ];
  poly(c, "#5ce1e620", shell);
  c.save();
  clipOutline(c, shell);
  const light = c.createLinearGradient(0, top, 0, base);
  light.addColorStop(0, "#5ce1e68a");
  light.addColorStop(0.52, "#5ce1e613");
  light.addColorStop(1, "#5ce1e65b");
  c.beginPath();
  for (let col = 0; col <= (half * 2) / 24; col++) {
    const cx = x - half + col * 24;
    for (let cy = top + (col % 2) * 13; cy <= base + 13; cy += 26) {
      c.moveTo(cx - 16, cy);
      c.lineTo(cx - 8, cy - 13);
      c.lineTo(cx + 8, cy - 13);
      c.lineTo(cx + 16, cy);
      c.lineTo(cx + 8, cy + 13);
      c.lineTo(cx - 8, cy + 13);
      c.closePath();
    }
  }
  c.strokeStyle = light;
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();
  c.save();
  c.globalAlpha = 0.66 + Math.sin(time / 710) * 0.19;
  for (let i = 0; i < shell.length; i++) {
    line(c, "#276782ae", shell[i], shell[(i + 1) % shell.length], 4);
    line(c, "#5ce1e6", shell[i], shell[(i + 1) % shell.length], 2);
  }
  c.restore();
}

export function renderWorld(c: CanvasRenderingContext2D, f: WorldFrame) {
  const { state, transform, time, path, hover } = f;
  const motionTime = f.reduced ? 0 : time;
  const goalWave = (1 - Math.cos((motionTime * 2 * Math.PI) / 1400)) / 2;
  let goal: { id: BuildingId; position: Point } | undefined;
  const city = state.cityId;
  const storm = state.solActual === 8;
  const mars = transform >= 1;
  const changing = state.solActual === 0 && transform > 0 && !mars;
  const charged: ChargedTile[] = [];
  const p = project;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, WORLD.width, WORLD.height);
  let island = ISLAND_GEOMETRY.get(city);
  if (!island) {
    island = islandGeometry(city);
    ISLAND_GEOMETRY.set(city, island);
  }
  const { outline } = island;
  islandBase(c, island, city, transform, time, f.reduced);
  poly(
    c,
    mars
      ? "#ec865e"
      : city === "uyuni"
        ? "#effaff"
        : city === "la-paz"
          ? "#c8ac88"
          : "#75cd6a",
    outline,
  );
  for (let i = 0; i < outline.length; i++)
    line(
      c,
      mars ? "#ffb47b" : "#b9ffe1",
      outline[i],
      outline[(i + 1) % outline.length],
      2,
    );
  c.save();
  clipOutline(c, outline);
  for (let sum = 0; sum < 19; sum++)
    for (let x = 0; x < 10; x++) {
      const y = sum - x;
      if (y < 0 || y >= 10) continue;
      const isMars = tileIsMars(x, y, transform);
      const z = isMars ? 0 : terraceHeight(x, y, city);
      const pt = p({ x, y });
      pt.y -= z;
      const road = x === 5 || y === 5 || (x === 2 && y >= 5);
      const ring =
        city === "santa-cruz" &&
        Math.abs(Math.hypot(x - 4.5, y - 4.5) - 3) < 0.52;
      const color = isMars
        ? road
          ? "#b28268"
          : "#ce9274"
        : city === "uyuni"
          ? road
            ? "#c5d6d5"
            : "#e7f1ef"
          : city === "la-paz"
            ? road
              ? "#b6aa94"
              : "#aaa28d"
            : road || ring
              ? "#c4bc94"
              : n(x, y) > 0.47
                ? "#78bd70"
                : "#88c979";
      const vertices: P[] = [
        [pt.x, pt.y - 16],
        [pt.x + 32, pt.y],
        [pt.x, pt.y + 16],
        [pt.x - 32, pt.y],
      ];
      if (!isMars && city === "la-paz") {
        const dropX = z - terraceHeight(x + 1, y, city),
          dropY = z - terraceHeight(x, y + 1, city);
        if (dropY > 0)
          poly(c, "#786c55", [
            [pt.x - 32, pt.y],
            [pt.x, pt.y + 16],
            [pt.x, pt.y + 16 + dropY],
            [pt.x - 32, pt.y + dropY],
          ]);
        if (dropX > 0)
          poly(c, "#575044", [
            [pt.x + 32, pt.y],
            [pt.x, pt.y + 16],
            [pt.x, pt.y + 16 + dropX],
            [pt.x + 32, pt.y + dropX],
          ]);
      }
      diamond(c, color, pt);
      line(c, isMars ? "#dec0aa25" : "#eff5dc18", vertices[0], vertices[1]);
      line(c, isMars ? "#825e4c25" : "#4b6c5425", vertices[1], vertices[2]);
      if (!isMars && city === "uyuni") {
        const h: P[] = [
          [pt.x - 25, pt.y],
          [pt.x - 12, pt.y - 9],
          [pt.x + 12, pt.y - 9],
          [pt.x + 25, pt.y],
          [pt.x + 12, pt.y + 9],
          [pt.x - 12, pt.y + 9],
        ];
        poly(c, road ? "#eaf8f6" : "#f9ffff", h);
        poly(c, "#c6e8f2b8", [
          h[0],
          h[1],
          h[2],
          [pt.x + 6, pt.y - 2],
          [pt.x - 15, pt.y + 3],
        ]);
        for (let i = 0; i < h.length; i++) {
          line(c, i < 3 ? "#faffff" : "#93c6d5", h[i], h[(i + 1) % h.length]);
        }
        const reflection =
          (1 + Math.sin(motionTime / 1400 - (x + y) * 0.57)) / 2;
        c.globalAlpha = 0.21 + reflection * 0.43;
        poly(c, "#ffffff", [
          h[1],
          [pt.x - 3, pt.y - 9],
          [pt.x + 16, pt.y + 5],
          h[4],
          [pt.x + 4, pt.y + 9],
        ]);
        c.globalAlpha = 1;
        saltGlint(c, pt, x, y, motionTime);
      }
      if (road && isMars && x % 2 === 0 && y % 2 === 1)
        box(c, "#e5b07977", pt.x - 4, pt.y - 1, 8, 2);
      if (changing) {
        const age = transform - sum / 20;
        if (age > -0.032 && age < 0.084 && pointInRegion({ x, y }, city)) {
          charged.push({ center: pt, vertices, age });
        }
      }
    }
  shockwave(c, charged);
  c.restore();
  const items: { depth: number; drawShadow: () => void; draw: () => void }[] =
    [];
  const structures = structuresForCity(city);
  for (const site of structures) {
    const b = { ...site, x: site.x - 0.5, y: site.y - 0.5, w: 2, d: 2 };
    const bm = tileIsMars(b.x + (b.w - 1) / 2, b.y + (b.d - 1) / 2, transform);
    const z = bm ? 0 : terraceHeight(b.x, b.y, city);
    const center = project(site);
    const groundY = center.y - z * 0.9;
    if (site.id === f.active && bm) {
      goal = { id: site.id, position: { x: center.x, y: groundY } };
    }
    items.push({
      depth: b.x + b.y + b.w + b.d - 2,
      drawShadow: () => {
        const { x } = center;
        poly(c, CONTACT_SHADOW, [
          [x - 46, groundY],
          [x, groundY - 29],
          [x + 46, groundY],
          [x + 63, groundY + 9],
          [x + 17, groundY + 38],
          [x, groundY + 29],
        ]);
      },
      draw: () => {
        c.save();
        c.translate(center.x, center.y);
        c.scale(0.72, 0.9);
        c.translate(-center.x, -center.y);
        if (!bm) {
          urban(c, b, city, z);
          c.restore();
          return;
        }
        switch (b.id) {
          case "refuge":
            refuge(c, b, z, motionTime);
            break;
          case "greenhouse":
            greenhouse(c, b, z, state, motionTime);
            break;
          case "solar":
            solar(c, b, z, {
              cleaning: f.cleaning,
              dusty: storm && state.storm.recovered === 0,
              charge: f.reduced && f.solarCharge > 0 ? 0.7 : f.solarCharge,
              time: motionTime,
            });
            break;
          case "probe":
            antenna(
              c,
              b,
              z,
              motionTime,
              ["connected", "alert", "complete"].includes(state.rescue.status),
            );
            break;
          case "garage":
            garage(c, b, z);
            break;
        }
        c.restore();
      },
    });
  }
  const { common, regional } = decorationsFor(city, structures);
  const nearHero = (a: Point) =>
    Math.hypot(f.position.x - a.x, f.position.y - a.y) <= 1;
  const decorations = common.filter((a) => !nearHero(a)).slice(0, 7);
  if (!mars) {
    decorations.push(
      ...regional
        .filter((a) => !nearHero(a) && !tileIsMars(a.x, a.y, transform))
        .slice(0, city === "santa-cruz" ? 9 : 5),
    );
  }
  for (const a of decorations) {
    const mm = tileIsMars(a.x, a.y, transform);
    const pt = p(a);
    const z = mm ? 0 : terraceHeight(a.x, a.y, city);
    const groundY = pt.y - z;
    items.push({
      depth: a.x + a.y,
      drawShadow: () => {
        const wide = !mm && city === "la-paz";
        contactShadow(
          c,
          pt.x + (wide ? 10 : 5),
          groundY + 2,
          wide ? 23 : 13,
          wide ? 7 : 4,
        );
      },
      draw: () => {
        if (mm) {
          rock(c, pt.x, groundY - 1, 7, ["#dfaa7e", "#9b654e", "#643f39"]);
          if (a.x === 9) {
            const post = pt;
            box(c, "#c5bc9f", post.x, post.y - 21, 2, 21);
            box(c, "#c25b44", post.x + 2, post.y - 21, 11, 3);
            box(c, "#c5a24d", post.x + 2, post.y - 18, 11, 3);
            box(c, "#6c8c57", post.x + 2, post.y - 15, 11, 3);
          }
        } else if (city === "la-paz") {
          andeanPeak(c, pt.x, groundY, 43 + n(a.x, a.y) * 17);
        } else if (city !== "uyuni") {
          palm(c, pt.x, groundY);
          tropicalPollen(c, [pt.x, groundY], motionTime, n(a.x, a.y));
        } else {
          poly(c, "#b8e3e3", [
            [pt.x - 10, pt.y - z],
            [pt.x - 10, pt.y - z - 17],
            [pt.x - 4, pt.y - z - 26],
            [pt.x + 2, pt.y - z - 16],
            [pt.x + 2, pt.y - z + 2],
          ]);
          poly(c, "#689cae", [
            [pt.x - 4, groundY - 26],
            [pt.x + 4, groundY - 22],
            [pt.x + 7, groundY - 2],
            [pt.x + 2, groundY + 2],
            [pt.x + 2, groundY - 16],
          ]);
          poly(c, "#f2ffff", [
            [pt.x - 10, groundY - 17],
            [pt.x - 4, groundY - 26],
            [pt.x + 4, groundY - 22],
            [pt.x + 2, groundY - 16],
          ]);
          box(c, "#eef0d5", pt.x - 5, pt.y - z - 4, 11, 4);
          box(c, "#aab8aa", pt.x - 6, pt.y - z, 14, 2);
        }
      },
    });
  }
  const foot = project(f.position);
  const footElevation = tileIsMars(f.position.x, f.position.y, transform)
    ? 0
    : terraceHeight(f.position.x, f.position.y, city);
  items.push({
    depth: f.position.x + f.position.y + 0.15,
    drawShadow: () =>
      contactShadow(c, foot.x + 5, foot.y - footElevation * 1.15 + 2, 15, 4),
    draw: () => {
      c.save();
      c.translate(foot.x, foot.y);
      c.scale(1.15, 1.15);
      c.translate(-foot.x, -foot.y);
      avatar(c, f);
      c.restore();
    },
  });
  c.save();
  clipOutline(c, outline);
  items.forEach((item) => item.drawShadow());
  if (!f.reduced)
    drawMotionTrail(
      c,
      f.footprints,
      time,
      mars ? ["#eb8f5a", "#ffd5a3"] : ["#e6d998", "#edffc8"],
    );
  if (goal) goalRing(c, goal.position, goalWave);
  c.restore();
  // Keep navigation markers above the ground shadows.
  for (const tile of path) {
    const pt = p(tile);
    pt.y -= tileIsMars(tile.x, tile.y, transform)
      ? 0
      : terraceHeight(tile.x, tile.y, city);
    diamond(c, "#ffeb82", pt, 6, 4);
    box(c, "#fff5b7", pt.x - 1, pt.y - 1, 2, 2);
  }
  if (
    hover &&
    islandTile(hover, city) &&
    hover.x >= 0 &&
    hover.y >= 0 &&
    hover.x < 10 &&
    hover.y < 10
  ) {
    const pt = p(hover);
    pt.y -= tileIsMars(hover.x, hover.y, transform)
      ? 0
      : terraceHeight(hover.x, hover.y, city);
    const vv: P[] = [
      [pt.x, pt.y - 15],
      [pt.x + 30, pt.y],
      [pt.x, pt.y + 15],
      [pt.x - 30, pt.y],
    ];
    for (let i = 0; i < 4; i++) line(c, "#ead1a399", vv[i], vv[(i + 1) % 4]);
  }
  items.sort((a, b) => a.depth - b.depth);
  items.forEach((item) => item.draw());
  if (storm) tintScene(c, "#ce793d2d");
  if (state.solActual === 18 && state.rescue.status === "alert") {
    tintScene(c, "#ef453b48");
  }
  if (mars) martianDust(c, motionTime, storm);
  if (!f.reduced && changing) risingPixels(c, charged);
  if (state.rescue.status === "complete") shieldDome(c, island, motionTime);
  if (goal) {
    goalArrow(
      c,
      goal.position.x,
      goal.position.y - GOAL_HEIGHT[goal.id] - 5 - goalWave * 6,
    );
  }
}

export {
  box as pixelBox,
  poly as pixelPolygon,
  line as pixelLine,
  corners as isoCorners,
  prism as isoPrism,
};
