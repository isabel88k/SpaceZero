"use client";

import { useCallback, useEffect, useRef } from "react";
import { drawPixelLabel } from "@/lib/canvas-label";
import {
  pixelBox as box,
  pixelLine as line,
  pixelPolygon as poly,
} from "@/lib/world-renderer";
import { SAFE_WATER } from "@/lib/ux";
import { useGame, useTranslate } from "./GameProvider";

type DrawFrame = (canvas: CanvasRenderingContext2D, time: number) => void;

export function useChapterCanvas(draw: DrawFrame) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    function paint(time: number) {
      draw(c!, motion.matches ? 0 : time);
      if (!motion.matches) frame = requestAnimationFrame(paint);
    }

    function restart() {
      cancelAnimationFrame(frame);
      paint(performance.now());
    }

    restart();
    motion.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", restart);
    };
  }, [draw]);
  return ref;
}

const WIDTH = 640;
const HEIGHT = 212;

function chemicalTank(
  c: CanvasRenderingContext2D,
  time: number,
  hydrogen: number,
  risk: number,
) {
  const safe = hydrogen >= SAFE_WATER.min && hydrogen <= SAFE_WATER.max;
  const hot = hydrogen > SAFE_WATER.max;
  const glow = 0.52 + Math.cos(time / 310) * 0.23;
  box(c, "#526578", 74, 48, 87, 15);
  box(c, "#354659", 146, 55, 15, 101);
  box(c, "#91a8b7", 151, 58, 6, 90);
  box(c, "#3f7785", 155, 58, 4, 90);
  box(c, "#465364", 31, 69, 98, 97);
  box(c, "#a8bac0", 37, 62, 86, 106);
  box(c, "#526275", 44, 72, 73, 89);
  box(c, "#17212d", 49, 78, 63, 76);
  box(
    c,
    safe ? "#148b9e" : hot ? "#a23a39" : "#475d85",
    49,
    153 - hydrogen * 0.68,
    63,
    hydrogen * 0.68,
  );
  box(
    c,
    safe ? "#5de2f2" : hot ? "#ff9b79" : "#a2bad4",
    49,
    152 - hydrogen * 0.68,
    63,
    2,
  );
  box(c, "#a7bac140", 53, 82, 7, 67);
  box(c, "#71899b", 64, 48, 30, 14);
  box(
    c,
    risk > 75 || hot ? "#ff725f" : safe ? "#8bffd9" : "#b7a8df",
    100,
    56,
    13,
    7,
  );
  if (safe) {
    for (let i = 0; i < 7; i++) {
      const rise = (time / 940 + i / 7) % 1;
      const x = 151 + (i % 3);
      const y = 142 - rise * 78;
      box(c, "#0b526c", x - 1, y, 6, 7);
      box(c, "#89faff", x, y, 4, 4);
    }
  } else if (hot) {
    box(c, `rgba(255, 80, 69, ${glow})`, 37, 62, 86, 7);
    box(c, `rgba(255, 80, 69, ${glow * 0.42})`, 37, 70, 86, 97);
    box(c, "#2b111a", 74, 95, 16, 26);
    box(c, "#ffc690", 79, 98, 5, 11);
    box(c, "#ffc690", 79, 113, 5, 5);
    for (let i = 0; i < 6; i++) {
      const drift = (time / 1240 + i * 0.19) % 1;
      box(
        c,
        `rgba(255, 179, 142, ${(1 - drift) * 0.73})`,
        67 + drift * (i % 2 ? 31 : -19),
        49 - 37 * drift,
        8 + drift * 14,
        5 + drift * 8,
      );
    }
  }
}

function crop(
  c: CanvasRenderingContext2D,
  x: number,
  i: number,
  growth: number,
  health: number,
  time: number,
) {
  const soil = 160;
  const height = 16 + growth * 0.66 + (i % 3) * 5;
  const sway = Math.round(Math.sin(time / 580 + i * 0.86) * 4);
  const top = soil - height;
  const stem = "#49866a";
  const leaf = health < 35 ? "#b98547" : health < 65 ? "#90b450" : "#70db71";
  box(c, "#564258", x - 17, soil, 34, 12);
  box(c, "#b17d65", x - 20, soil - 2, 40, 4);
  line(c, stem, [x, soil - 2], [x + sway, top], 3);
  for (let h = 14; h < height; h += 13) {
    const side = Math.floor(h / 13) % 2 ? -1 : 1;
    const stemX = x + Math.round((sway * h) / height);
    const y = soil - h;
    poly(c, leaf, [
      [stemX, y + 2],
      [stemX + side * 6, y - 5],
      [stemX + side * 13, y - 7],
      [stemX + side * 12, y - 1],
      [stemX + side * 7, y + 2],
    ]);
  }
  if (growth > 50) {
    const color = i % 2 ? "#ffc678" : "#ff8dc1";
    box(c, color, x + sway - 6, top - 7, 13, 5);
    box(c, color, x + sway - 2, top - 11, 5, 12);
    box(c, "#fff498", x + sway - 1, top - 6, 4, 4);
  }
}

export function GreenhouseCanvas() {
  const tr = useTranslate();
  const { state } = useGame();
  const { growth, uv, risk, hydrogen } = state.greenhouse;
  const health = state.resources.saludCosecha;
  const draw = useCallback(
    (c: CanvasRenderingContext2D, time: number) => {
      box(c, "#101926", 0, 0, WIDTH, HEIGHT);
      box(c, "#1e303c", 20, 21, 600, 157);
      box(c, "#263d4d", 174, 30, 430, 136);
      box(c, "#304851", 182, 44, 415, 112);
      for (let x = 190; x < 570; x += 66) {
        box(c, "#617686", x, 43, 4, 117);
        box(c, "#111d32", x + 11, 49, 44, 8);
        box(c, uv > 20 ? "#cab9fa" : "#747aab", x + 14, 50, 38, 4);
        if (uv > 10) {
          poly(c, `rgba(161, 133, 255, ${uv / 560})`, [
            [x + 14, 54],
            [x + 52, 54],
            [x + 61, 159],
            [x + 5, 159],
          ]);
        }
      }
      box(c, "#7f9aa3", 176, 30, 428, 5);
      box(c, "#3b5061", 20, 171, 600, 7);
      chemicalTank(c, time, hydrogen, risk);
      for (let i = 0; i < 7; i++)
        crop(c, 208 + i * 57, i, growth, health, time);
      drawPixelLabel(c, tr("INVERNADERO"), 24, 194, {
        size: 25,
        color: "#ddffff",
      });
      drawPixelLabel(c, tr("AGUA PARA LAS PLANTAS"), 615, 194, {
        size: 22,
        align: "right",
        color: "#fff3a3",
      });
    },
    [growth, health, hydrogen, risk, uv, tr],
  );
  const ref = useChapterCanvas(draw);
  return (
    <canvas
      ref={ref}
      width={WIDTH}
      height={HEIGHT}
      className="greenhouse-canvas"
      role="img"
      aria-label={tr(
        `Plantas en píxeles: crecimiento ${Math.round(growth)}%, salud ${Math.round(health)}%. Las plantas crecen cuando tienen agua y luz.`,
        `Pixel plants: ${Math.round(growth)}% grown, ${Math.round(health)}% healthy. Plants grow when they have water and light.`,
      )}
    />
  );
}

function dustPanel(c: CanvasRenderingContext2D, x: number, y: number) {
  box(c, "#9c8e84", x + 32, y + 25, 5, 37);
  box(c, "#675753", x + 19, y + 60, 39, 4);
  const panel: [number, number][] = [
    [x + 18, y],
    [x + 94, y],
    [x + 74, y + 42],
    [x, y + 42],
  ];
  poly(c, "#233a55", panel);
  for (let i = 0; i < 4; i++) {
    line(c, "#aac3c4", panel[i], panel[(i + 1) % 4], 2);
  }
  for (let i = 1; i < 5; i++)
    line(c, "#7398a3", [x + 18 + i * 15, y], [x + i * 15, y + 42]);
  line(c, "#7398a3", [x + 9, y + 22], [x + 83, y + 22]);
}

export function DustCanvas() {
  const tr = useTranslate();
  const { state } = useGame();
  const eva = state.storm.allocation.eva;
  const round = state.storm.cycle;
  const draw = useCallback(
    (c: CanvasRenderingContext2D, time: number) => {
      const sky = c.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#5e352e");
      sky.addColorStop(0.58, "#b96a42");
      sky.addColorStop(1, "#e29b5e");
      c.fillStyle = sky;
      c.fillRect(0, 0, WIDTH, HEIGHT);
      poly(c, "#985035", [
        [0, 90],
        [64, 57],
        [160, 78],
        [218, 110],
        [371, 76],
        [502, 90],
        [640, 66],
        [640, 170],
        [0, 170],
      ]);
      poly(c, "#ac694a", [
        [0, 141],
        [121, 119],
        [257, 129],
        [407, 114],
        [640, 127],
        [640, 212],
        [0, 212],
      ]);
      box(c, "#593d46", 39, 101, 110, 55);
      box(c, "#a88172", 50, 94, 89, 9);
      box(c, "#ffb974", 58, 111, 13, 9);
      box(c, "#ffb974", 114, 111, 13, 9);
      dustPanel(c, 411, 90);
      dustPanel(c, 510, 98);
      for (let i = 0; i < 32 + Math.min(round, 2) * 5; i++) {
        const travel = time * (0.06 + (i % 4) * 0.016 + round * 0.01);
        const x = ((i * 107 + travel) % 700) - 30;
        const y = (i * 67 + travel * 0.26) % 194;
        const length = 9 + (i % 4) * 8;
        line(
          c,
          i % 4 ? "#ffc68d78" : "#fce0acb0",
          [x, y],
          [x + length, y + length * 0.24],
          2,
        );
      }
      if (eva) {
        const x = 374 + Math.round(Math.sin(time / 630) * 3);
        const y = 116;
        box(c, "#66484d", x - 12, y + 45, 46, 5);
        box(c, "#f5e3cd", x, y, 19, 16);
        box(c, "#2d526b", x + 4, y + 4, 13, 7);
        box(c, "#8dddde", x + 5, y + 4, 10, 2);
        box(c, "#dac7ba", x - 2, y + 16, 22, 20);
        box(c, "#edddd0", x, y + 35, 7, 11);
        box(c, "#edddd0", x + 12, y + 35, 7, 11);
        line(c, "#f3e3c4", [x + 16, y + 21], [x + 30, y + 17], 4);
        line(
          c,
          "#ead08b",
          [x + 26, y + 24],
          [x + 59, y + 3 + Math.sin(time / 180) * 3],
          3,
        );
        for (let i = 0; i < 5; i++) {
          const drift = (time / 750 + i * 0.23) % 1;
          box(
            c,
            `rgba(255, 224, 172, ${(1 - drift) * 0.8})`,
            x + 54 + drift * 26,
            y + i - drift * 18,
            4,
            2,
          );
        }
      }
      drawPixelLabel(c, tr("TORMENTA DE POLVO"), 24, 24, {
        size: 24,
        color: "#fff0c7",
      });
    },
    [eva, round, tr],
  );
  const ref = useChapterCanvas(draw);
  return (
    <canvas
      ref={ref}
      width={WIDTH}
      height={HEIGHT}
      className="dust-canvas"
      aria-label={
        eva
          ? tr("Tormenta de polvo con astronauta limpiando paneles solares")
          : tr("Tormenta de polvo naranja sobre el hábitat marciano")
      }
      role="img"
    />
  );
}
