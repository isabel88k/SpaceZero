"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useGame, useTranslate } from "../GameProvider";
import { regionSpawn } from "@/lib/regions";
import { createMotionTrail, renderWorld } from "@/lib/world-renderer";
import {
  structuresForCity,
  activeBuilding,
  WORLD,
  keyboardStep,
  distance,
  findPath,
  nearestWalkable,
  pickTile,
  project,
  terraceHeight,
  tileIsMars,
  unproject,
  type BuildingId,
  type Point,
} from "@/lib/isometric";
const EARTH_BUILDINGS: Record<BuildingId, string> = {
  refuge: "PLAZA CENTRAL",
  greenhouse: "JARDÍN BOTÁNICO",
  solar: "ESTACIÓN ELÉCTRICA",
  probe: "TORRE DE RADIO",
  garage: "GARAJE",
};

export type WorldHandle = {
  goTo: (id: BuildingId) => void;
  walkTo: (p: Point) => void;
  interact: () => void;
  reset: () => void;
  zoom: (direction: number) => void;
};
export type PositionUpdate = {
  position: Point;
  moving: boolean;
  nearby: BuildingId | null;
};
type Props = {
  transformation: number;
  blocked: boolean;
  active: BuildingId | null;
  cleaning: boolean;
  onArrive: (id: BuildingId) => void;
  onPosition: (update: PositionUpdate) => void;
};
export const WorldCanvas = forwardRef<WorldHandle, Props>(
  function WorldCanvas(props, ref) {
    const tr = useTranslate();
    const { state } = useGame();
    const live = useRef({ state, ...props });
    live.current = { state, ...props };
    const canvas = useRef<HTMLCanvasElement>(null),
      container = useRef<HTMLDivElement>(null);
    const hero = useRef({
      position: { x: 5, y: 6 } as Point,
      path: [] as Point[],
      destination: null as BuildingId | null,
      moving: false,
      direction: 1,
    });
    const hover = useRef<Point | null>(null),
      held = useRef(new Set<string>());
    const [fit, setFit] = useState(1),
      [zoom, setZoom] = useState(1),
      [pan, setPan] = useState({ x: 0, y: 0 }),
      [dragging, setDragging] = useState(false);
    const zoomLevel = useRef(1);
    const [position, setPosition] = useState<Point>({ x: 5, y: 6 }),
      [nearby, setNearby] = useState<BuildingId | null>(null);
    const drag = useRef<{
      id: number;
      x: number;
      y: number;
      px: number;
      py: number;
      moved: boolean;
    } | null>(null);
    function walkTo(p: Point, building: BuildingId | null = null) {
      if (live.current.blocked) return;
      const h = hero.current;
      h.path = findPath(h.position, p, live.current.state.cityId);
      h.destination = building;
      held.current.clear();
    }
    function goTo(id: BuildingId) {
      const b = structuresForCity(live.current.state.cityId).find(
        (b) => b.id === id,
      )!;
      walkTo(b.door, id);
    }
    function interact() {
      if (live.current.blocked) return;
      const h = hero.current,
        b = structuresForCity(live.current.state.cityId)
          .filter((b) => distance(h.position, b.door) < 1.35)
          .sort(
            (a, b) =>
              distance(h.position, a.door) - distance(h.position, b.door),
          )[0];
      if (b) {
        h.path = [];
        h.destination = null;
        live.current.onArrive(b.id);
      }
    }
    function changeZoom(delta: number) {
      const value = delta
        ? Math.min(2, Math.max(0.85, zoomLevel.current + delta))
        : 1;
      zoomLevel.current = value;
      setZoom(value);
      if (value <= 1) setPan({ x: 0, y: 0 });
    }
    function finishDrag() {
      drag.current = null;
      setDragging(false);
    }
    useImperativeHandle(ref, () => ({
      goTo,
      walkTo: (p) => walkTo(p),
      interact,
      reset: () => {
        hero.current = {
          position: regionSpawn(live.current.state.cityId),
          path: [],
          destination: null,
          moving: false,
          direction: 1,
        };
        held.current.clear();
        finishDrag();
        changeZoom(0);
      },
      zoom: (direction) => {
        if (!live.current.blocked) changeZoom(direction * 0.2);
      },
    }));
    useEffect(() => {
      const node = canvas.current;
      if (!node) return;
      function wheel(e: WheelEvent) {
        if (
          live.current.blocked ||
          drag.current ||
          e.ctrlKey ||
          e.metaKey ||
          !e.deltaY
        )
          return;
        e.preventDefault();
        const unit =
          e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? node!.clientHeight : 1;
        changeZoom(
          -Math.sign(e.deltaY) *
            Math.min(0.22, Math.abs(e.deltaY) * unit * 0.002),
        );
      }
      node.addEventListener("wheel", wheel, { passive: false });
      return () => node.removeEventListener("wheel", wheel);
    }, []);
    useEffect(() => {
      hero.current.position = regionSpawn(state.cityId);
      hero.current.path = [];
      hero.current.destination = null;
      setPosition({ ...hero.current.position });
    }, [state.cityId]);
    useEffect(() => {
      const node = container.current;
      if (!node) return;
      const resize = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        // Frame the terrain, including the floating rocks beneath it.
        setFit(
          Math.min(width / (WORLD.width * 0.8), height / (WORLD.height * 0.74)),
        );
      });
      resize.observe(node);
      return () => resize.disconnect();
    }, []);
    useEffect(() => {
      function keyDown(e: KeyboardEvent) {
        if (e.altKey || e.metaKey || e.ctrlKey) return;
        const el = e.target as HTMLElement;
        if (
          el?.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "SUMMARY"].includes(el?.tagName)
        )
          return;
        if (live.current.blocked) return;
        const code = e.key.toLowerCase();
        if (
          [
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
            "w",
            "a",
            "s",
            "d",
          ].includes(code)
        ) {
          e.preventDefault();
          held.current.add(code);
          if (!e.repeat) {
            const step = keyboardStep(
              hero.current.position,
              held.current,
              live.current.state.cityId,
            );
            hero.current.path = step ? [step] : [];
            hero.current.destination = null;
          }
        }
        if (
          [" ", "enter", "e"].includes(code) &&
          el?.tagName !== "BUTTON" &&
          el?.tagName !== "A"
        ) {
          e.preventDefault();
          interact();
        }
      }
      const keyUp = (e: KeyboardEvent) =>
        held.current.delete(e.key.toLowerCase());
      const blur = () => held.current.clear();
      window.addEventListener("keydown", keyDown);
      window.addEventListener("keyup", keyUp);
      window.addEventListener("blur", blur);
      return () => {
        window.removeEventListener("keydown", keyDown);
        window.removeEventListener("keyup", keyUp);
        window.removeEventListener("blur", blur);
      };
    }, []);
    useEffect(() => {
      const c = canvas.current?.getContext("2d");
      if (!c) return;
      c.imageSmoothingEnabled = false;
      let raf = 0,
        last = performance.now(),
        lastReport = 0;
      const trail = createMotionTrail();
      let trailCity = live.current.state.cityId;
      let recovered = live.current.state.storm.recovered;
      let chargeStarted = -Infinity;
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      function frame(time: number) {
        const dt = Math.min(0.05, (time - last) / 1000);
        last = time;
        const h = hero.current,
          p = live.current;
        h.moving = false;
        if (!p.blocked) {
          if (!h.path.length && held.current.size) {
            const step = keyboardStep(h.position, held.current, p.state.cityId);
            if (step) h.path = [step];
          }
          if (h.path.length) {
            const target = h.path[0],
              d = distance(h.position, target),
              speed = p.state.solActual === 8 ? 1.9 : 2.7;
            const step = speed * dt;
            if (d <= step) {
              h.position = { ...target };
              h.path.shift();
            } else {
              const vx = (target.x - h.position.x) / d,
                vy = (target.y - h.position.y) / d;
              h.position = {
                x: h.position.x + vx * step,
                y: h.position.y + vy * step,
              };
              h.direction = vx - vy >= 0 ? 1 : -1;
              h.moving = true;
            }
            if (!h.path.length && h.destination) {
              const id = h.destination;
              h.destination = null;
              p.onArrive(id);
            }
          }
        }
        const reduced = motion.matches;
        const storm = p.state.solActual === 8;
        if (p.state.cityId !== trailCity) {
          trail.clear();
          trailCity = p.state.cityId;
        }
        const trailFoot = project(h.position);
        if (!tileIsMars(h.position.x, h.position.y, p.transformation))
          trailFoot.y -=
            terraceHeight(h.position.x, h.position.y, trailCity) * 1.15;
        const footprints = trail.update(trailFoot, time, h.moving, reduced);
        const nextRecovered = p.state.storm.recovered;
        if (!storm || nextRecovered < recovered) chargeStarted = -Infinity;
        else if (nextRecovered > recovered) chargeStarted = time;
        recovered = nextRecovered;

        renderWorld(c!, {
          state: p.state,
          position: h.position,
          moving: h.moving,
          footprints,
          direction: h.direction,
          time,
          transform: p.transformation,
          path: h.path.length
            ? h.path
            : p.active
              ? findPath(
                  h.position,
                  structuresForCity(p.state.cityId).find(
                    (b) => b.id === p.active,
                  )!.door,
                  p.state.cityId,
                )
              : [],
          hover: hover.current,
          reduced,
          cleaning: p.cleaning,
          solarCharge: Math.max(0, 1 - (time - chargeStarted) / 1050),
          active: p.active,
        });
        if (time - lastReport > 90) {
          lastReport = time;
          setPosition({ ...h.position });
          const b = structuresForCity(live.current.state.cityId)
            .filter((b) => distance(h.position, b.door) < 1.35)
            .sort(
              (a, b) =>
                distance(h.position, a.door) - distance(h.position, b.door),
            )[0];
          setNearby(b?.id ?? null);
          p.onPosition({
            position: { ...h.position },
            moving: h.moving,
            nearby: b?.id ?? null,
          });
        }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }, []);
    function pointerPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
      const bounds = e.currentTarget.getBoundingClientRect();
      return {
        x: ((e.clientX - bounds.left) / bounds.width) * WORLD.width,
        y: ((e.clientY - bounds.top) / bounds.height) * WORLD.height,
      };
    }
    function hit(e: React.PointerEvent<HTMLCanvasElement>) {
      const point = pointerPoint(e);
      const hit = structuresForCity(live.current.state.cityId)
        .slice()
        .sort((a, b) => b.x + b.y - (a.x + a.y))
        .find((b) => {
          const center = project({
            x: b.x + (b.w - 1) / 2,
            y: b.y + (b.d - 1) / 2,
          });
          const z = tileIsMars(b.x, b.y, live.current.transformation)
            ? 0
            : terraceHeight(b.x, b.y, state.cityId);
          return (
            Math.abs(point.x - center.x) < (b.w + b.d) * 16 &&
            point.y > center.y - b.height - z - 15 &&
            point.y < center.y + (b.w + b.d) * 7 - z
          );
        });
      if (hit) {
        goTo(hit.id);
        return;
      }
      const goal = pickTile(point, state.cityId, live.current.transformation);
      if (goal) walkTo(nearestWalkable(goal, state.cityId));
    }
    const avatar = project(position);
    const avatarZ = tileIsMars(position.x, position.y, props.transformation)
      ? 0
      : terraceHeight(position.x, position.y, state.cityId);
    const scale = Math.max(0.01, fit * zoom);
    const frameWidth = (container.current?.clientWidth ?? WORLD.width) / scale;
    const frameLeft = (WORLD.width - frameWidth) / 2 - pan.x / scale;
    const frameTop =
      (WORLD.height -
        (container.current?.clientHeight ?? WORLD.height) / scale) /
        2 -
      pan.y / scale;
    const buildings = structuresForCity(state.cityId);
    const labels = buildings.map((b) => {
      const point = project({
        x: b.x + (b.w - 1) / 2,
        y: b.y + (b.d - 1) / 2,
      });
      const isMars = tileIsMars(b.x, b.y, props.transformation);
      const elevation = isMars ? 0 : terraceHeight(b.x, b.y, state.cityId);
      const active = props.active === b.id;
      const close = nearby === b.id;
      const name = tr(isMars ? b.short : EARTH_BUILDINGS[b.id]);
      const openWidth = Math.min(34 + name.length * 8 + 16, 254) * 1.06;
      const width = (active || close ? openWidth : 34) / scale;
      point.y -= b.height + elevation + 4;
      if (active) {
        // Place the expanded label beside the yellow Canvas arrow.
        const side = point.x < WORLD.width / 2 ? 1 : -1;
        point.x += side * (width / 2 + 14 / scale);
        point.y += 9 / scale;
      }
      return { b, point, width, openWidth, name, active, close };
    });
    const placed: { point: Point; width: number; height: number }[] = [];
    for (const label of [...labels].sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        Number(b.close) - Number(a.close) ||
        a.point.y - b.point.y,
    )) {
      const { point, width } = label;
      const edge = 4 / scale;
      if (point.x >= frameLeft && point.x <= frameLeft + frameWidth) {
        point.x = Math.max(
          frameLeft + edge + width / 2,
          Math.min(frameLeft + frameWidth - edge - width / 2, point.x),
        );
      }
      const height = (label.active || label.close ? 37 : 34) / scale;
      if (point.y >= frameTop)
        point.y = Math.max(point.y, frameTop + height + edge);
      for (let attempt = 0; attempt < placed.length; attempt++) {
        const overlap = placed.find(
          (previous) =>
            Math.abs(previous.point.x - point.x) <
              (previous.width + width) / 2 + edge &&
            Math.abs(previous.point.y - point.y) <
              Math.max(height, previous.height) + edge,
        );
        if (!overlap) break;
        point.y = overlap.point.y + height + 2 * edge;
      }
      placed.push({ point, width, height });
    }
    return (
      <div className="world-canvas-container" ref={container}>
        <div
          className={`world-surface${dragging ? " is-dragging" : ""}`}
          style={{
            width: WORLD.width * fit,
            height: WORLD.height * fit,
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        >
          <canvas
            ref={canvas}
            width={WORLD.width}
            height={WORLD.height}
            tabIndex={0}
            role="application"
            aria-label={tr(
              "Base en píxeles. Toca un edificio para entrar o camina con WASD y las flechas.",
            )}
            onPointerDown={(e) => {
              if (props.blocked || !e.isPrimary || e.button !== 0) return;
              e.currentTarget.focus({ preventScroll: true });
              drag.current = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                px: pan.x,
                py: pan.y,
                moved: false,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const point = unproject(pointerPoint(e));
              hover.current = {
                x: Math.round(point.x),
                y: Math.round(point.y),
              };
              const d = drag.current;
              if (
                d?.id === e.pointerId &&
                !props.blocked &&
                zoom > 1 &&
                (Math.abs(e.clientX - d.x) > 6 || Math.abs(e.clientY - d.y) > 6)
              ) {
                d.moved = true;
                setDragging(true);
                setPan({
                  x: Math.max(-250, Math.min(250, d.px + e.clientX - d.x)),
                  y: Math.max(-180, Math.min(180, d.py + e.clientY - d.y)),
                });
              }
            }}
            onPointerUp={(e) => {
              if (drag.current?.id !== e.pointerId) return;
              if (!drag.current.moved && !props.blocked) hit(e);
              finishDrag();
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onLostPointerCapture={(e) => {
              if (drag.current?.id === e.pointerId) finishDrag();
            }}
            onPointerLeave={() => {
              hover.current = null;
            }}
          />
          {labels.map(({ b, point, openWidth, name, active, close }) => {
            const availableLeft = (point.x - frameLeft) * scale;
            const availableRight = (frameLeft + frameWidth - point.x) * scale;
            const textAlignment =
              availableLeft < openWidth / 2
                ? "right"
                : availableRight < openWidth / 2
                  ? "left"
                  : undefined;
            return (
              <button
                key={b.id}
                className={`building-label ${active ? "mission-active" : ""} ${close ? "nearby" : ""} ${b.id === "garage" && state.solActual !== 28 ? "future-building" : ""}`}
                style={{
                  left: `${(point.x / WORLD.width) * 100}%`,
                  top: `${(point.y / WORLD.height) * 100}%`,
                  scale: 1 / zoom,
                }}
                data-expand={textAlignment}
                disabled={props.blocked}
                aria-label={tr(
                  `Ir a ${b.name}${active ? ", tu próxima tarea" : ""}`,
                  `Go to ${tr(b.name)}${active ? tr(", tu próxima tarea") : ""}`,
                )}
                onClick={() => goTo(b.id)}
              >
                <span className="building-icon" aria-hidden="true">
                  {b.id === "refuge"
                    ? "🏠"
                    : b.id === "greenhouse"
                      ? "🌱"
                      : b.id === "solar"
                        ? "☀️"
                        : b.id === "probe"
                          ? "📡"
                          : "🚙"}
                </span>
                <span className="building-name">{name}</span>
              </button>
            );
          })}
          <span
            className="player-marker"
            style={{
              left: `${(avatar.x / WORLD.width) * 100}%`,
              top: `${((avatar.y - avatarZ - 42) / WORLD.height) * 100}%`,
            }}
          >
            {tr("TÚ")} <i />
          </span>
        </div>
      </div>
    );
  },
);
