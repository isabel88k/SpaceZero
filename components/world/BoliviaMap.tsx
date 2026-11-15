"use client";
import { useTranslate } from "@/components/GameProvider";
import { DEPARTMENTS } from "@/lib/regions";
import { CITIES, type CityId } from "@/lib/game";
const colors = [
  "#e7bbff",
  "#ffc889",
  "#71ded1",
  "#a7afff",
  "#fce587",
  "#99dc93",
  "#f3a1c9",
  "#89dba8",
  "#ffac90",
];
const xy = ([lon, lat]: number[]) => ({
  x: 24 + (lon + 69.7) * 23,
  y: 12 + (-9.5 - lat) * 22,
});
export function BoliviaMap({ onChoose }: { onChoose: (id: CityId) => void }) {
  const tr = useTranslate();
  return (
    <div
      className="bolivia-map"
      aria-label={tr("Mapa de Bolivia. Elige un pin brillante.")}
    >
      <svg
        viewBox="0 0 300 310"
        role="img"
        aria-label={tr("Los nueve departamentos de Bolivia")}
        shapeRendering="crispEdges"
      >
        {DEPARTMENTS.map((d, i) => (
          <path
            key={d.iso}
            fill={colors[i]}
            stroke="#48405d"
            strokeWidth="2"
            strokeLinejoin="miter"
            d={
              d.ring
                .map((p, i) => {
                  const q = xy(p);
                  return `${i ? "L" : "M"}${Math.round(q.x / 2) * 2},${Math.round(q.y / 2) * 2}`;
                })
                .join(" ") + "Z"
            }
          />
        ))}
      </svg>
      {CITIES.map((c) => {
        const p = xy([c.lon, c.lat]);
        return (
          <button
            key={c.id}
            className={`map-pin pin-${c.id}`}
            style={{ left: `${p.x / 3}%`, top: `${p.y / 3.1}%` }}
            onClick={() => onChoose(c.id)}
            aria-label={tr(`Elegir ${c.name}`, `Choose ${tr(c.name)}`)}
          >
            <i aria-hidden="true">✦</i>
            <span>
              {c.id === "uyuni"
                ? "Uyuni · Potosí"
                : c.id === "la-paz"
                  ? "La Paz"
                  : "Santa Cruz"}
            </span>
          </button>
        );
      })}
      <small>{tr("BOLIVIA · TU AVENTURA EMPIEZA AQUÍ")}</small>
    </div>
  );
}
