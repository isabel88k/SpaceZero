import type { GameState } from "./game";
import { WORLD, project, type Point } from "./isometric";
import {
  ROUTES,
  roverNight,
  terrainHeight,
  terrainHeightAt,
  terrainPath,
} from "./rover";
import {
  drawMotionTrail,
  type TrailPoint,
  pixelBox as box,
  pixelPolygon as poly,
  pixelLine as line,
  isoCorners as corners,
} from "./world-renderer";
type P = [number, number];
export const jezeroProject = (p: Point): Point => {
  const q = project(p);
  return { x: q.x, y: q.y - terrainHeightAt(p) };
};
export function pickJezeroTile(p: Point): Point | null {
  for (let sum = 18; sum >= 0; sum--)
    for (let x = 9; x >= 0; x--) {
      const y = sum - x;
      if (y < 0 || y > 9) continue;
      const q = jezeroProject({ x, y });
      if (Math.abs(p.x - q.x) / 32 + Math.abs(p.y - q.y) / 16 <= 1)
        return { x, y };
    }
  return null;
}
function wheel(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
) {
  box(c, "#17141b", x - 6, y - 5, 12, 10);
  box(c, "#302e38", x - 4, y - 7, 8, 14);
  box(c, "#0c0c13", x - 6, y - 2, 12, 4);
  box(c, "#9c9a91", x - 2, y - 3, 4, 6);
  box(c, "#505465", x - 1 + (frame % 2 ? 1 : -1), y - 2, 2, 4);
}
function rover(
  c: CanvasRenderingContext2D,
  p: Point,
  moving: boolean,
  time: number,
  night: boolean,
  heated: boolean,
  direction: Point,
) {
  const q = jezeroProject(p),
    x = Math.round(q.x),
    y = Math.round(q.y),
    frame = moving ? Math.floor(time / 110) % 4 : 0;
  poly(c, "#35212a", [
    [x - 36, y + 4],
    [x, y - 14],
    [x + 38, y + 5],
    [x, y + 23],
  ]);
  if (heated) {
    c.save();
    c.globalAlpha = (night ? 0.67 : 0.35) + Math.sin(time / 450) * 0.08;
    poly(c, "#f28a52", [
      [x - 26, y + 3],
      [x, y - 9],
      [x + 26, y + 3],
      [x, y + 14],
    ]);
    poly(c, "#ffc567", [
      [x - 14, y + 3],
      [x, y - 1],
      [x + 15, y + 3],
      [x, y + 10],
    ]);
    c.restore();
  }

  c.save();
  if (direction.x < 0) {
    c.translate(x * 2, 0);
    c.scale(-1, 1);
  }
  // Three far and three near wheels remain visible around the chassis.
  for (let i = 0; i < 3; i++) wheel(c, x - 20 + i * 18, y - 8 + i * 7, frame);
  poly(c, "#aaa99e", [
    [x - 28, y - 20],
    [x - 7, y - 31],
    [x + 31, y - 12],
    [x + 10, y - 2],
  ]);
  poly(c, "#817e77", [
    [x - 28, y - 20],
    [x + 10, y - 2],
    [x + 10, y + 9],
    [x - 28, y - 9],
  ]);
  poly(c, "#d8c8a4", [
    [x + 10, y - 2],
    [x + 31, y - 12],
    [x + 31, y],
    [x + 10, y + 9],
  ]);
  box(c, "#c8c2b2", x - 11, y - 34, 25, 17);
  box(c, "#3a5565", x - 8, y - 31, 19, 8);
  box(c, "#88c6c6", x - 6, y - 30, 14, 3);
  line(c, "#c6b99e", [x + 1, y - 33], [x + 1, y - 51], 2);
  box(c, "#ded8c7", x - 6, y - 54, 17, 7);
  box(c, "#5ce1e6", x + 6, y - 53, 3, 3);
  for (let i = 0; i < 3; i++) wheel(c, x - 27 + i * 18, y + 1 + i * 7, frame);
  box(c, "#ec6a4a", x + 15, y - 4, 8, 4);
  box(c, night ? "#fff0af" : "#c9baa6", x + 27, y - 9, 4, 4);
  if (night) box(c, "#fff9d9", x + 28, y - 9, 3, 2);
  if (heated) {
    box(c, "#dd793e", x - 25, y - 13, 8, 3);
    box(c, "#ffc377", x - 24, y - 14, 5, 2);
  }
  c.restore();
}

function trackMarks(
  c: CanvasRenderingContext2D,
  points: Point[],
  completed: number,
  night: boolean,
) {
  for (
    let segment = 1;
    segment <= completed && segment < points.length;
    segment++
  ) {
    const course = terrainPath(points[segment - 1], points[segment]);
    for (let cell = 1; cell < course.length; cell++) {
      const a = course[cell - 1];
      const b = course[cell];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const direction = project({ x: dx, y: dy });
      const dxScreen = direction.x - WORLD.originX;
      const dyScreen = direction.y - WORLD.originY;
      const magnitude = Math.hypot(dxScreen, dyScreen);
      const normal = { x: -dyScreen / magnitude, y: dxScreen / magnitude };
      const steps = Math.max(3, Math.round(magnitude / 7));
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.46) / steps;
        const p = jezeroProject({ x: a.x + dx * t, y: a.y + dy * t });
        for (const side of [-1, 1]) {
          const x = p.x + normal.x * side * 8;
          const y = p.y + normal.y * side * 8;
          const reach = 2.1;
          line(
            c,
            night ? "#0e1b31" : "#745044",
            [x - normal.x * reach, y - normal.y * reach],
            [x + normal.x * reach, y + normal.y * reach],
            2,
          );
          box(c, night ? "#7690b390" : "#e5ad8488", x + 1, y + 1, 2, 1);
        }
      }
    }
  }
}

function headlights(
  c: CanvasRenderingContext2D,
  terrain: Path2D,
  p: Point,
  direction: Point,
) {
  const center = jezeroProject(p);
  const beam = (distance: number, width: number): P => [
    center.x + direction.x * distance - direction.y * width,
    center.y + direction.y * distance + direction.x * width,
  ];
  c.save();
  c.clip(terrain);
  poly(c, "#ffd79936", [
    beam(19, -5),
    beam(112, -26),
    beam(120, 24),
    beam(19, 5),
  ]);
  poly(c, "#ffe9ae48", [
    beam(18, -3),
    beam(89, -15),
    beam(94, 12),
    beam(18, 3),
  ]);
  poly(c, "#fff1c744", [beam(16, -2), beam(61, -8), beam(65, 7), beam(16, 2)]);
  c.restore();
}

function extractionSite(
  c: CanvasRenderingContext2D,
  p: Point,
  time: number,
  night: boolean,
) {
  const { x, y } = p;
  poly(c, night ? "#91accb" : "#ead09a", [
    [x - 28, y],
    [x, y - 14],
    [x + 28, y],
    [x, y + 14],
  ]);
  poly(c, night ? "#375675" : "#597f7a", [
    [x - 21, y],
    [x, y - 9],
    [x + 21, y],
    [x, y + 9],
  ]);
  for (const side of [-1, 1]) {
    box(c, "#8cf6e8", x + side * 21 - 2, y - 1, 5, 3);
  }

  const beaconX = x - 23;
  const beaconY = y - 7;
  const pulse = (1 + Math.sin(time / 520)) / 2;
  const upper = Math.max(8, y - 178);
  c.save();
  c.globalAlpha = 0.58 + pulse * 0.38;
  poly(c, "#5ce1e637", [
    [beaconX - 2, beaconY - 23],
    [beaconX - 13, upper],
    [beaconX + 12, upper],
    [beaconX + 2, beaconY - 23],
  ]);
  poly(c, "#a8fff48a", [
    [beaconX - 1, beaconY - 23],
    [beaconX - 3, upper],
    [beaconX + 3, upper],
    [beaconX + 1, beaconY - 23],
  ]);
  c.restore();
  box(c, "#475466", beaconX - 5, beaconY, 11, 3);
  box(c, "#c1d3d8", beaconX - 2, beaconY - 24, 4, 24);
  box(c, "#157c82", beaconX - 6, beaconY - 26, 12, 6);
  box(c, "#adfff4", beaconX - 4, beaconY - 26, 8, 3);

  const podX = x + 38;
  const foot = y + 9;
  const shadow: P[] = [
    [podX - 24, foot],
    [podX, foot - 11],
    [podX + 24, foot],
    [podX, foot + 10],
  ];
  poly(c, "#080e25a2", shadow);
  for (const side of [-1, 1]) {
    line(
      c,
      "#8ea1af",
      [podX + side * 10, foot - 14],
      [podX + side * 18, foot + 2],
      3,
    );
    box(c, "#d3ddd8", podX + side * 18 - 5, foot + 2, 10, 3);
    box(c, "#69d9e1", podX + side * 18 - 3, foot + 2, 5, 1);
  }
  const shell: P[] = [
    [podX - 19, foot - 15],
    [podX - 20, foot - 37],
    [podX - 13, foot - 56],
    [podX - 5, foot - 62],
    [podX + 7, foot - 62],
    [podX + 16, foot - 53],
    [podX + 21, foot - 29],
    [podX + 16, foot - 14],
    [podX, foot - 8],
  ];
  poly(c, night ? "#a9bed1" : "#faf0d8", shell);
  poly(c, night ? "#4c6b8b" : "#889dab", [
    shell[4],
    shell[5],
    shell[6],
    shell[7],
    shell[8],
    [podX + 5, foot - 33],
  ]);
  poly(c, "#35445c", [
    [podX - 15, foot - 38],
    [podX + 3, foot - 38],
    [podX + 5, foot - 33],
    [podX + 3, foot - 16],
    [podX - 13, foot - 18],
  ]);
  box(c, "#8eeaef", podX - 13, foot - 35, 14, 6);
  box(c, "#d9ffff", podX - 12, foot - 34, 10, 2);
  line(c, "#e5bd69", [podX - 19, foot - 16], [podX, foot - 9], 2);
  box(c, "#e9945d", podX + 9, foot - 51, 4, 4);
  box(c, "#d8e8ee", podX - 2, foot - 69, 3, 7);
  box(c, "#86fff0", podX - 2, foot - 70, 4, 3);
}

export function renderJezero(
  c: CanvasRenderingContext2D,
  s: GameState,
  p: Point,
  moving: boolean,
  time: number,
  hover: Point | null,
  reduced: boolean,
  heading: Point | null,
  trail: readonly TrailPoint[],
) {
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, WORLD.width, WORLD.height);
  const night = roverNight(s.rover.route, s.rover.segment);
  const motion = reduced ? 0 : time;
  const route = s.rover.route ? ROUTES[s.rover.route] : null;
  const next = route?.points[s.rover.segment + 1];
  const destination = project(
    next ?? ROUTES.short.points[ROUTES.short.segments],
  );
  const current = project(p);
  const facing = heading ?? {
    x: destination.x - current.x,
    y: destination.y - current.y,
  };
  const magnitude = Math.hypot(facing.x, facing.y);
  const direction =
    magnitude > 0.01
      ? { x: facing.x / magnitude, y: facing.y / magnitude }
      : { x: 1, y: 0 };
  const terrain = night ? new Path2D() : null;
  for (let i = 0; i < 10; i++) {
    const x = (i * 137 + 37) % 800,
      y = (i * i * 31) % 165;
    box(c, night ? "#5b5d78" : "#453139", x, y, i % 7 === 0 ? 2 : 1, 1);
  }
  // Painter ordering: each cliff is drawn before its upper diamond.
  for (let sum = 0; sum < 19; sum++)
    for (let x = 0; x < 10; x++) {
      const y = sum - x;
      if (y < 0 || y > 9) continue;
      const z = terrainHeight(x, y),
        q = corners(x, y, 1, 1, z),
        base = corners(x, y, 1, 1, -18);
      poly(c, night ? "#1a2641" : "#683b36", [q[1], q[2], base[2], base[1]]);
      poly(c, night ? "#23314d" : "#4a3031", [q[2], q[3], base[3], base[2]]);
      const dayColor = z > 35 ? "#c79172" : z > 18 ? "#ba876a" : "#ae7d64";
      const nightColor = z > 35 ? "#485d80" : z > 18 ? "#354b70" : "#2b3f60";
      poly(c, night ? nightColor : dayColor, q);
      for (let i = 0; i < 4; i++)
        line(c, night ? "#8dadcc40" : "#d4ab8e44", q[i], q[(i + 1) % 4]);
      if (terrain) {
        terrain.moveTo(...q[0]);
        for (let i = 1; i < q.length; i++) terrain.lineTo(...q[i]);
        terrain.closePath();
      }
    }
  if (route) trackMarks(c, route.points, s.rover.segment, night);
  if (terrain) headlights(c, terrain, p, direction);
  // The tire tracks mark confirmed legs. The dotted route guides the next leg.
  for (const route of Object.values(ROUTES)) {
    if (s.rover.route && s.rover.route !== route.id) continue;
    c.globalAlpha = 0.85;
    const first = s.rover.route ? s.rover.segment + 1 : 1;
    for (let i = first; i < route.points.length; i++) {
      const a = route.points[i - 1],
        b = route.points[i],
        steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 12;
      for (let j = 0; j <= steps; j++) {
        if (j % 4 === 3) continue;
        const q = jezeroProject({
          x: a.x + ((b.x - a.x) * j) / steps,
          y: a.y + ((b.y - a.y) * j) / steps,
        });
        box(c, route.color, q.x - 1, q.y - 1, 3, 3);
      }
    }
    c.globalAlpha = 1;
  }
  const end = jezeroProject(ROUTES.short.points[ROUTES.short.segments]);
  extractionSite(c, end, motion, night);
  if (route) {
    route.points.forEach((v, i) => {
      const q = jezeroProject(v);
      box(
        c,
        i <= s.rover.segment ? "#a8cf83" : "#1c2026",
        q.x - 5,
        q.y - 4,
        10,
        8,
      );
      box(
        c,
        i <= s.rover.segment ? "#ecf2cf" : route.color,
        q.x - 2,
        q.y - 2,
        4,
        4,
      );
    });
  }
  if (hover) {
    const q = corners(hover.x, hover.y, 1, 1, terrainHeight(hover.x, hover.y));
    for (let i = 0; i < 4; i++) line(c, "#f6dfba", q[i], q[(i + 1) % 4], 2);
  }
  if (!reduced)
    drawMotionTrail(
      c,
      trail,
      time,
      night ? ["#7eb1de", "#c8f0ff"] : ["#f19861", "#ffd69b"],
    );
  rover(
    c,
    p,
    moving && !reduced,
    motion,
    night,
    s.rover.heater === "high",
    direction,
  );
  if (next && !s.outcome) {
    const q = jezeroProject(next),
      bounce = Math.round((1 - Math.cos(motion / 220)) * 2);
    box(c, "#6c4e23", q.x - 5, q.y - 41 - bounce, 10, 15);
    box(c, "#ffdf37", q.x - 3, q.y - 42 - bounce, 6, 13);
    poly(c, "#ffdf37", [
      [q.x - 10, q.y - 30 - bounce],
      [q.x + 11, q.y - 30 - bounce],
      [q.x, q.y - 19 - bounce],
    ]);
  }
}
