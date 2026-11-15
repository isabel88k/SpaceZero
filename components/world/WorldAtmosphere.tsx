"use client";

import { useEffect, useRef } from "react";
import type { CityId } from "@/lib/game";
import { renderAtmosphere, type SkyWeather } from "@/lib/world-renderer";

type Props = {
  city: CityId | null;
  transform: number;
  weather: SkyWeather;
};

export function WorldAtmosphere(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef(props);
  live.current = props;

  useEffect(() => {
    const node = canvas.current;
    const context = node?.getContext("2d", { alpha: false });
    if (!node || !context) return;

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const scale = Math.min(1, 1200 / Math.max(width, height));
      node.width = Math.max(1, Math.round(width * scale));
      node.height = Math.max(1, Math.round(height * scale));
      last = null;
    });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last: { props: Props; reduced: boolean; time: number } | null = null;

    function draw(time: number) {
      const current = live.current;
      const reduced = motion.matches;
      if (
        !last ||
        current.city !== last.props.city ||
        current.transform !== last.props.transform ||
        current.weather !== last.props.weather ||
        reduced !== last.reduced ||
        (!reduced && time - last.time >= 33)
      ) {
        renderAtmosphere(context!, {
          ...current,
          city: current.city ?? "santa-cruz",
          seconds: time / 1000,
          reduced,
        });
        last = { props: current, reduced, time };
      }
      frame = requestAnimationFrame(draw);
    }

    resize.observe(node);
    frame = requestAnimationFrame(draw);
    return () => {
      resize.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas ref={canvas} className="world-atmosphere" aria-hidden="true" />
  );
}
