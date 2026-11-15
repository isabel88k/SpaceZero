"use client";

import { useCallback } from "react";
import { useGame, useTranslate } from "./GameProvider";
import { useChapterCanvas } from "./ChapterCanvas";
import { drawPixelLabel } from "@/lib/canvas-label";
import { SIGNAL_TARGET, alignment } from "@/lib/rescue";

const WIDTH = 640;
const HEIGHT = 200;

function scopeNoise(c: CanvasRenderingContext2D, time: number) {
  const tick = Math.floor(time / 110);
  for (let i = 0; i < 95; i++) {
    const x = (i * 127 + tick * 71) % WIDTH;
    const y = (i * i * 37 + tick * ((i % 13) + 9)) % HEIGHT;
    c.fillStyle = i % 3 === 0 ? "#5da7a440" : "#739c8754";
    c.fillRect(x, y, i % 8 === 0 ? 15 : 3, 1);
  }
}

function drawWave(
  c: CanvasRenderingContext2D,
  signal: { angle: number; frequency: number; phase: number },
  drift: number,
  color: string,
  dashed: boolean,
  glow = 0,
  offset = 0,
) {
  c.fillStyle = color;
  const amp = 20 + (signal.angle / 180) * 44;
  const phase = (signal.phase * Math.PI) / 180 + drift;
  const stretch = (Math.PI * 2 * signal.frequency) / WIDTH;
  let previous = Math.sin(-2 * stretch + phase) * amp;
  for (let x = 0; x < WIDTH; x += 2) {
    const y = Math.sin(x * stretch + phase) * amp;
    if (!dashed || x % 12 < 8) {
      const start = Math.floor((100 + offset - Math.max(y, previous)) / 2) * 2;
      const height = Math.max(2, Math.ceil(Math.abs(y - previous) / 2) * 2);
      c.fillRect(x, start - glow, 2, height + glow * 2);
    }
    previous = y;
  }
}

export function Oscilloscope() {
  const tr = useTranslate();
  const { state } = useGame();
  const { angle, frequency, phase } = state.rescue;
  const accuracy = alignment(state.rescue);
  const captured = accuracy >= 75;
  const noise = accuracy < 50;
  const draw = useCallback(
    (c: CanvasRenderingContext2D, time: number) => {
      const sky = c.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, "#0d1d1d");
      sky.addColorStop(1, "#080f0d");
      c.fillStyle = sky;
      c.fillRect(0, 0, WIDTH, HEIGHT);
      for (let x = 0; x < WIDTH; x += 40) {
        c.fillStyle = x % 80 === 0 ? "#285345" : "#172f28";
        c.fillRect(x, 0, 1, HEIGHT);
      }
      for (let y = 0; y < HEIGHT; y += 40) {
        c.fillStyle = y % 80 === 0 ? "#285345" : "#172f28";
        c.fillRect(0, y, WIDTH, 1);
      }
      c.fillStyle = "#4d7a51";
      for (let x = 0; x < WIDTH; x += 10) {
        c.fillRect(x, 99, 1, x % 40 === 0 ? 8 : 4);
      }
      if (noise) scopeNoise(c, time);

      const drift = time / 1800;
      const player = { angle, frequency, phase };
      if (captured) {
        drawWave(c, SIGNAL_TARGET, drift, "#81ff706b", false, 6, -2);
        drawWave(c, player, drift, "#64eaff85", false, 6, 2);
      }
      drawWave(
        c,
        SIGNAL_TARGET,
        drift,
        captured ? "#b5ff91" : "#39ff1499",
        true,
        0,
        captured ? -2 : 0,
      );
      drawWave(
        c,
        player,
        drift,
        captured ? "#d8ffff" : "#5ce1e6",
        false,
        0,
        captured ? 2 : 0,
      );
      drawPixelLabel(c, tr("OBJETIVO"), 16, 22, { size: 25, color: "#b7ff9b" });
      drawPixelLabel(c, tr("TU SEÑAL"), 16, 178, {
        size: 25,
        color: "#b9faff",
      });
      if (captured) {
        c.fillStyle = "#142f29";
        c.fillRect(302, 8, 329, 30);
        c.fillStyle = "#91f6b1";
        c.fillRect(302, 36, 329, 2);
        drawPixelLabel(c, tr("¡SEÑAL ENGANCHADA!"), 619, 23, {
          align: "right",
          size: 25,
          color: "#b6ffc1",
        });
      }
    },
    [angle, frequency, phase, captured, noise, tr],
  );
  const ref = useChapterCanvas(draw);
  return (
    <canvas
      ref={ref}
      width={WIDTH}
      height={HEIGHT}
      className="oscilloscope"
      role="img"
      aria-label={tr(
        "Dos líneas en píxeles: la verde es el objetivo y la azul es tu señal.",
      )}
    />
  );
}
