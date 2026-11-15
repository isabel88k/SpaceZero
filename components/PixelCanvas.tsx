"use client";
import { useEffect, useRef } from "react";
import { useGame, useTranslate } from "./GameProvider";
function noise(x: number, y: number, seed = 1) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}
function rect(
  ctx: CanvasRenderingContext2D,
  c: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}
function polygon(ctx: CanvasRenderingContext2D, c: string, points: number[][]) {
  ctx.fillStyle = c;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  mars: boolean,
  city: string | null,
) {
  const w = 640,
    h = 350;
  rect(ctx, mars ? "#211b2b" : "#202c38", 0, 0, w, h);
  for (let y = 0; y < 175; y += 3)
    for (let x = 0; x < w; x += 3) {
      const t = y / 175;
      const d = noise(x, y) * 4;
      rect(
        ctx,
        mars
          ? `rgb(${32 + t * 66 + d},${25 + t * 22},${42 + t * 20})`
          : `rgb(${30 + t * 55},${42 + t * 54},${59 + t * 63})`,
        x,
        y,
        3,
        3,
      );
    }
  for (let i = 0; i < 65; i++) {
    const x = Math.floor(noise(i, 1) * w),
      y = Math.floor(noise(i, 2) * 143);
    rect(
      ctx,
      i % 4 === 0 ? "#d8b4a5" : "#847b91",
      x,
      y,
      i % 12 === 0 ? 2 : 1,
      1,
    );
  }
  // A stepped sun, all scenery is rendered in a low-resolution pixel grid.
  const sun = mars ? "#e7b99c" : "#f1cfab";
  rect(ctx, sun, 467, 59, 35, 25);
  rect(ctx, sun, 462, 64, 45, 15);
  rect(ctx, sun, 472, 54, 25, 35);
  rect(ctx, mars ? "#d59782" : "#dbb69b", 467, 80, 35, 4);
  polygon(ctx, mars ? "#49303d" : "#475663", [
    [0, 162],
    [28, 141],
    [44, 142],
    [73, 116],
    [88, 116],
    [110, 138],
    [129, 133],
    [150, 151],
    [174, 122],
    [197, 126],
    [220, 158],
    [242, 144],
    [271, 149],
    [296, 129],
    [328, 136],
    [362, 163],
    [394, 151],
    [418, 137],
    [448, 150],
    [470, 124],
    [492, 127],
    [524, 156],
    [546, 148],
    [581, 165],
    [608, 142],
    [640, 154],
    [640, 240],
    [0, 240],
  ]);
  polygon(ctx, mars ? "#70404a" : "#5f6f67", [
    [0, 210],
    [24, 185],
    [58, 186],
    [84, 167],
    [112, 171],
    [130, 156],
    [154, 159],
    [177, 180],
    [200, 181],
    [228, 200],
    [265, 182],
    [286, 186],
    [316, 167],
    [348, 169],
    [375, 190],
    [409, 187],
    [443, 167],
    [469, 170],
    [495, 196],
    [526, 186],
    [556, 207],
    [586, 191],
    [612, 194],
    [640, 175],
    [640, 270],
    [0, 270],
  ]);
  polygon(ctx, mars ? "#a65349" : "#697c67", [
    [0, 230],
    [32, 227],
    [61, 239],
    [88, 226],
    [125, 228],
    [160, 209],
    [191, 214],
    [223, 232],
    [265, 217],
    [299, 223],
    [330, 206],
    [359, 214],
    [387, 230],
    [420, 211],
    [460, 221],
    [485, 211],
    [527, 230],
    [563, 217],
    [600, 224],
    [640, 210],
    [640, 350],
    [0, 350],
  ]);
  for (let y = 227; y < h; y += 3)
    for (let x = 0; x < w; x += 3) {
      const n = noise(x, y);
      if (n > 0.48)
        rect(
          ctx,
          mars
            ? n > 0.92
              ? "#e58d63"
              : n > 0.8
                ? "#b9634c"
                : n > 0.65
                  ? "#a45546"
                  : "#954d46"
            : city === "uyuni"
              ? n > 0.7
                ? "#c3b6a3"
                : "#9b9f95"
              : n > 0.8
                ? "#a4a17b"
                : n > 0.65
                  ? "#717d57"
                  : "#576e54",
          x,
          y,
          n > 0.94 ? 6 : 3,
          3,
        );
    }
  polygon(ctx, mars ? "#6f3940" : "#455749", [
    [0, 298],
    [56, 284],
    [100, 290],
    [142, 277],
    [189, 290],
    [221, 284],
    [260, 301],
    [306, 289],
    [350, 298],
    [410, 278],
    [451, 288],
    [499, 283],
    [546, 300],
    [589, 286],
    [640, 300],
    [640, 350],
    [0, 350],
  ]);
  // ARES habitat, solar array and communications mast.
  rect(ctx, "#302c39", 435, 257, 106, 8);
  rect(ctx, "#b5b9b7", 448, 214, 75, 40);
  rect(ctx, "#d8d4c2", 455, 205, 60, 10);
  rect(ctx, "#d8d4c2", 443, 221, 85, 25);
  rect(ctx, "#777e8b", 448, 246, 75, 8);
  rect(ctx, "#eae0c6", 453, 218, 68, 5);
  rect(ctx, "#4b596a", 454, 229, 14, 10);
  rect(ctx, "#6aafba", 456, 231, 10, 5);
  rect(ctx, "#4b596a", 477, 229, 14, 10);
  rect(ctx, "#6aafba", 479, 231, 10, 5);
  rect(ctx, "#494352", 503, 227, 13, 24);
  rect(ctx, "#bd654a", 510, 234, 3, 3);
  rect(ctx, "#35343f", 455, 254, 6, 10);
  rect(ctx, "#35343f", 514, 254, 6, 10);
  rect(ctx, "#9b9a9a", 489, 178, 2, 29);
  rect(ctx, "#b2b1a9", 481, 178, 18, 3);
  rect(ctx, "#e37956", 489, 175, 3, 4);
  rect(ctx, "#4d4655", 549, 235, 42, 4);
  rect(ctx, "#585363", 554, 238, 3, 21);
  rect(ctx, "#585363", 582, 238, 3, 21);
  polygon(ctx, "#252e47", [
    [546, 229],
    [582, 229],
    [593, 243],
    [551, 243],
  ]);
  for (let i = 0; i < 5; i++) rect(ctx, "#57748c", 551 + i * 8, 231, 2, 10);
  rect(ctx, "#7d9aaf", 550, 235, 38, 1);
  // Explorer: chunky 16-bit silhouette, backpack, reflective visor and suit patches.
  const ax = 366,
    ay = 252;
  rect(ctx, "#542f38", ax - 5, ay + 49, 40, 5);
  rect(ctx, "#8b8584", ax - 5, ay + 17, 10, 24);
  rect(ctx, "#ded5c3", ax + 1, ay + 14, 23, 27);
  rect(ctx, "#f5e8cb", ax + 5, ay + 2, 17, 5);
  rect(ctx, "#e5dac3", ax + 1, ay + 7, 25, 15);
  rect(ctx, "#5a6876", ax + 5, ay + 8, 17, 10);
  rect(ctx, "#92c0bf", ax + 7, ay + 9, 13, 5);
  rect(ctx, "#d6cbb8", ax - 5, ay + 22, 8, 16);
  rect(ctx, "#eee0c4", ax + 23, ay + 20, 7, 15);
  rect(ctx, "#a19b90", ax + 1, ay + 40, 9, 12);
  rect(ctx, "#d2c7b3", ax + 16, ay + 39, 8, 13);
  rect(ctx, "#45434a", ax - 1, ay + 50, 12, 5);
  rect(ctx, "#45434a", ax + 16, ay + 50, 12, 5);
  rect(ctx, "#cb654b", ax + 16, ay + 24, 5, 4);
  rect(ctx, "#726e70", ax + 4, ay + 29, 11, 3);
  // Bolivian tricolour on the mission flag.
  rect(ctx, "#b9b0a1", 407, 226, 2, 51);
  rect(ctx, "#c54d43", 409, 228, 19, 4);
  rect(ctx, "#d1ad50", 409, 232, 19, 4);
  rect(ctx, "#668259", 409, 236, 19, 4);
  for (let i = 0; i < 23; i++) {
    const x = Math.floor(noise(i, 8) * 640),
      y = 273 + Math.floor(noise(i, 9) * 70);
    rect(
      ctx,
      mars ? "#a65d4b" : "#7e8367",
      x,
      y,
      3 + Math.floor(noise(i, 5) * 7),
      3,
    );
  }
  rect(ctx, "#bf7259", 598, 310, 20, 5);
  rect(ctx, "#925044", 602, 305, 11, 5);
}
export function TerrainCanvas() {
  const tr = useTranslate();
  const ref = useRef<HTMLCanvasElement>(null);
  const { state } = useGame();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const earth = document.createElement("canvas");
    const mars = document.createElement("canvas");
    earth.width = mars.width = 640;
    earth.height = mars.height = 350;
    const e = earth.getContext("2d")!,
      m = mars.getContext("2d")!;
    e.imageSmoothingEnabled = m.imageSmoothingEnabled = false;
    drawScene(e, false, state.cityId);
    drawScene(m, true, state.cityId);
    let raf = 0;
    const start = performance.now();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    function frame(time: number) {
      if (state.phase !== "transition" || reduced) {
        ctx!.drawImage(mars, 0, 0);
        return;
      }
      const t = Math.min(1, (time - start) / 2500);
      ctx!.drawImage(earth, 0, 0);
      for (let y = 0; y < 350; y += 8)
        for (let x = 0; x < 640; x += 8) {
          if (noise(x / 8, y / 8) < t)
            ctx!.drawImage(mars, x, y, 8, 8, x, y, 8, 8);
        }
      if (t < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [state.phase, state.cityId, state.requestId]);
  return (
    <canvas
      ref={ref}
      width={640}
      height={350}
      className="terrain-canvas"
      role="img"
      aria-label={tr(
        "Paisaje pixel art procedural con montañas, astronauta boliviano, hábitat ARES y paneles solares; se transforma de Bolivia a Marte al seleccionar el origen.",
      )}
    />
  );
}
const outline = [
  [-69.5, -10.95],
  [-68.8, -11.1],
  [-68.1, -10.5],
  [-66.6, -9.9],
  [-65.4, -9.7],
  [-65.3, -11],
  [-64.5, -12],
  [-63.2, -12.5],
  [-61, -13.5],
  [-60.4, -13.8],
  [-60.2, -15.1],
  [-58.4, -16.3],
  [-58.3, -17.8],
  [-57.5, -18.1],
  [-58.3, -19.7],
  [-59.9, -19.3],
  [-61.8, -19.6],
  [-62.3, -22],
  [-64.3, -22.9],
  [-65.1, -22.1],
  [-66.3, -22.9],
  [-67.9, -22.9],
  [-68.2, -21.3],
  [-68.8, -20.9],
  [-68.8, -19.5],
  [-69.5, -17.7],
  [-69.6, -16.2],
  [-68.9, -15.2],
  [-69.4, -14.2],
  [-68.9, -12.5],
  [-69.5, -12.5],
];
function inside(x: number, y: number, poly: number[][]) {
  let b = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (
      poly[i][1] > y !== poly[j][1] > y &&
      x <
        ((poly[j][0] - poly[i][0]) * (y - poly[i][1])) /
          (poly[j][1] - poly[i][1]) +
          poly[i][0]
    )
      b = !b;
  }
  return b;
}
export const project = (lon: number, lat: number) => [
  18 + (lon + 70) * 15.6,
  17 + (-lat - 9) * 14.5,
];
export function BoliviaCanvas() {
  const tr = useTranslate();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    const p = outline.map(([lon, lat]) => project(lon, lat));
    c.clearRect(0, 0, 240, 240);
    for (let y = 8; y < 235; y += 4)
      for (let x = 8; x < 233; x += 4) {
        if (!inside(x, y, p)) continue;
        const n = noise(x, y),
          west = x < 76 + (y - 90) * 0.31;
        const color = west
          ? n > 0.8
            ? "#b3a786"
            : n > 0.6
              ? "#938c73"
              : n > 0.3
                ? "#777b63"
                : "#6a705b"
          : n > 0.8
            ? "#63795b"
            : n > 0.6
              ? "#536e51"
              : n > 0.3
                ? "#3d5949"
                : "#344e42";
        rect(c, color, x, y, 4, 4);
        if (
          !inside(x + 4, y, p) ||
          !inside(x - 4, y, p) ||
          !inside(x, y - 4, p) ||
          !inside(x, y + 4, p)
        )
          rect(c, "#9d9c79", x, y, 4, 4);
      }
    rect(c, "#73a2a1", 39, 120, 9, 4);
    rect(c, "#73a2a1", 43, 124, 8, 7);
    rect(c, "#c1b998", 55, 173, 14, 7);
    rect(c, "#dad0aa", 59, 173, 10, 4);
    // Faint orbital scan grid.
    c.strokeStyle = "#b4bd9c15";
    c.lineWidth = 1;
    for (let i = 18; i < 230; i += 24) {
      c.beginPath();
      c.moveTo(i, 8);
      c.lineTo(i, 230);
      c.stroke();
      c.beginPath();
      c.moveTo(8, i);
      c.lineTo(235, i);
      c.stroke();
    }
  }, []);
  return (
    <canvas
      ref={ref}
      width={240}
      height={240}
      role="img"
      aria-label={tr(
        "Mapa geográfico pixelado de Bolivia, con cordillera, salar y tierras bajas",
      )}
    />
  );
}
