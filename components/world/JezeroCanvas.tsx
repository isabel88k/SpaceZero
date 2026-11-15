"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useGame, useTranslate } from "../GameProvider";
import { WORLD, project, type Point } from "@/lib/isometric";
import { ROUTES, terrainPath, roverKeyboardStep } from "@/lib/rover";
import { createMotionTrail } from "@/lib/world-renderer";
import {
  renderJezero,
  pickJezeroTile,
  jezeroProject,
} from "@/lib/jezero-renderer";
const EXTRACTION = jezeroProject(ROUTES.short.points[ROUTES.short.segments]);

export type JezeroHandle = { next: () => void };
export const JezeroCanvas = forwardRef<
  JezeroHandle,
  { onMoving: (moving: boolean) => void; blocked: boolean }
>(function JezeroCanvas({ onMoving, blocked }, ref) {
  const tr = useTranslate();
  const { state, act } = useGame(),
    live = useRef({ state, act, onMoving, blocked });
  live.current = { state, act, onMoving, blocked };
  const canvas = useRef<HTMLCanvasElement>(null),
    container = useRef<HTMLDivElement>(null),
    hero = useRef<Point>({ x: 1, y: 8 }),
    heading = useRef<Point | null>(null),
    path = useRef<Point[]>([]),
    hover = useRef<Point | null>(null),
    keys = useRef(new Set<string>()),
    reported = useRef(0),
    [fit, setFit] = useState(1);
  function walk(p: Point) {
    if (
      live.current.state.rover.status !== "ready" ||
      live.current.state.outcome ||
      live.current.blocked
    )
      return;
    path.current = terrainPath(hero.current, p).slice(1);
    keys.current.clear();
  }
  useImperativeHandle(ref, () => ({
    next: () => {
      const s = live.current.state;
      if (s.rover.route) {
        const p = ROUTES[s.rover.route].points[s.rover.segment + 1];
        if (p) walk(p);
      }
    },
  }));
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([v]) =>
      setFit(
        Math.min(
          v.contentRect.width / (WORLD.width * 0.94),
          v.contentRect.height / (WORLD.height * 0.8),
        ),
      ),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ["INPUT", "SELECT", "TEXTAREA"].includes(
          (e.target as HTMLElement)?.tagName,
        )
      )
        return;
      const k = e.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(k)
      ) {
        e.preventDefault();
        keys.current.add(k);
        if (
          !e.repeat &&
          live.current.state.rover.status === "ready" &&
          !live.current.blocked &&
          !live.current.state.outcome
        ) {
          const goal = roverKeyboardStep(hero.current, keys.current);
          path.current = goal ? terrainPath(hero.current, goal).slice(1) : [];
        }
      }
    }
    function up(e: KeyboardEvent) {
      keys.current.delete(e.key.toLowerCase());
    }
    function clear() {
      keys.current.clear();
      path.current = [];
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, []);
  useEffect(() => {
    let frame = 0,
      last = 0,
      lastMoving = false;
    const trail = createMotionTrail();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function draw(time: number) {
      const delta = Math.min(0.045, (time - last) / 1000 || 0);
      last = time;
      const s = live.current.state;
      let moving = false;
      if (s.rover.status === "ready" && !s.outcome && !live.current.blocked) {
        if (!path.current.length && keys.current.size) {
          const goal = roverKeyboardStep(hero.current, keys.current);
          if (goal) path.current = terrainPath(hero.current, goal).slice(1);
        }
        const goal = path.current[0];
        if (goal) {
          const dx = goal.x - hero.current.x,
            dy = goal.y - hero.current.y,
            d = Math.hypot(dx, dy),
            amount = delta * 2.2;
          if (d > 0.001) {
            const ahead = project(goal);
            const here = project(hero.current);
            heading.current = { x: ahead.x - here.x, y: ahead.y - here.y };
          }
          moving = true;
          if (d <= amount) {
            hero.current = { ...goal };
            path.current.shift();
          } else
            hero.current = {
              x: hero.current.x + (dx / d) * amount,
              y: hero.current.y + (dy / d) * amount,
            };
        }
        if (s.rover.route) {
          const target = ROUTES[s.rover.route].points[s.rover.segment + 1];
          if (
            target &&
            Math.hypot(hero.current.x - target.x, hero.current.y - target.y) <
              0.06 &&
            reported.current < s.rover.segment + 1
          ) {
            reported.current = s.rover.segment + 1;
            path.current = [];
            keys.current.clear();
            live.current.act({
              type: "ROVER_STEP",
              segment: s.rover.segment + 1,
            });
          }
        }
      } else {
        path.current = [];
        keys.current.clear();
      }
      if (moving !== lastMoving) {
        lastMoving = moving;
        live.current.onMoving(moving);
      }
      const reduced = motion.matches;
      const footprints = trail.update(
        jezeroProject(hero.current),
        time,
        moving,
        reduced,
      );
      const c = canvas.current?.getContext("2d");
      if (c)
        renderJezero(
          c,
          s,
          hero.current,
          moving,
          time,
          hover.current,
          reduced,
          heading.current,
          footprints,
        );
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  function tile(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return pickJezeroTile({
      x: ((e.clientX - r.left) * WORLD.width) / r.width,
      y: ((e.clientY - r.top) * WORLD.height) / r.height,
    });
  }
  return (
    <div className="jezero-canvas-container" ref={container}>
      <div
        className="jezero-surface"
        style={{
          width: WORLD.width * fit,
          height: WORLD.height * fit,
        }}
      >
        <canvas
          ref={canvas}
          width={WORLD.width}
          height={WORLD.height}
          tabIndex={0}
          aria-label={tr(
            "Mapa de Jezero. Conduce con flechas, WASD o un toque.",
          )}
          onPointerMove={(e) => {
            hover.current = tile(e);
          }}
          onPointerLeave={() => {
            hover.current = null;
          }}
          onPointerDown={(e) => {
            e.currentTarget.focus();
            const p = tile(e);
            if (p) walk(p);
          }}
        />
        <div
          className="jezero-extraction-label"
          style={{
            left: `${((EXTRACTION.x + 38) / WORLD.width) * 100}%`,
            top: `${((EXTRACTION.y - 73) / WORLD.height) * 100}%`,
          }}
        >
          {tr("AQUÍ NOS RECOGEN")} <b>↗</b>
        </div>
      </div>
    </div>
  );
});
