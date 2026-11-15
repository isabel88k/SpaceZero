"use client";
import { useEffect, useRef } from "react";
import { useGame, useTranslate } from "../GameProvider";
import { LanguageButton } from "./LanguageButton";
import { MEDAL_SOLS, PixelMedal } from "./LearningUI";
import { LESSONS } from "@/lib/learning";
import { CITIES } from "@/lib/game";
import { ROUTES } from "@/lib/rover";

const DOSSIER_STARS = [
  [4, 14],
  [16, 70],
  [22, 22],
  [31, 85],
  [39, 13],
  [51, 79],
  [63, 18],
  [72, 82],
  [78, 26],
  [87, 71],
  [91, 15],
  [97, 52],
];

export function MissionDossier({ onRestart }: { onRestart: () => void }) {
  const tr = useTranslate();
  const { state: s } = useGame(),
    ref = useRef<HTMLDialogElement>(null),
    o = s.outcome;
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      d.showModal();
      d.focus({ preventScroll: true });
      d.scrollTop = 0;
    }
    return () => d?.close();
  }, []);
  if (!o) return null;
  const city = CITIES.find((c) => c.id === s.cityId),
    flare = s.rescue.event,
    crop = s.greenhouse.growth >= 50 && s.resources.saludCosecha > 0,
    route = s.rover.route ? ROUTES[s.rover.route] : null;
  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      className={`mission-dossier ${o.success ? "dossier-success" : "dossier-failed"}`}
      aria-label={tr("Diploma de Junior Astronauta")}
      onCancel={(e) => e.preventDefault()}
    >
      <div className="dialog-language">
        <LanguageButton />
      </div>
      <div className="dossier-masthead">
        <div className="dossier-stars" aria-hidden="true">
          {DOSSIER_STARS.map(([x, y], i) => (
            <i
              key={x}
              className="pixel-star"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${(i % 6) * -360}ms`,
              }}
            />
          ))}
        </div>
        <span className="nasa-pixel">
          J<span>R</span>
          <i>✦</i>
        </span>
        <div>
          {tr("DIPLOMA DE JUNIOR ASTRONAUTA")}
          <small>{tr("APRENDÍ JUGANDO CON DATOS DE LA NASA")}</small>
        </div>
        <b>
          {String(o.sol).padStart(2, "0")}
          <br />
          <small>{tr("DÍAS")}</small>
        </b>
      </div>
      <div className="dossier-heading">
        <span className="eyebrow">{tr("¡LA CURIOSIDAD TE LLEVÓ LEJOS!")}</span>
        <h2>{tr("¡JUNIOR ASTRONAUTA!")}</h2>
        <p>{tr(o.reason)}</p>
        <span className="dossier-stamp">
          {o.success ? tr("EQUIPO A SALVO") : tr("VOLVAMOS A INTENTARLO")} · SOL{" "}
          {String(o.sol).padStart(2, "0")}
        </span>
      </div>
      <div className="diploma-medals">
        {MEDAL_SOLS.map((sol) => {
          const earned = s.learning.answered.includes(sol);
          return (
            <div key={sol} className="diploma-medal" data-earned={earned}>
              <PixelMedal sol={sol} locked={!earned} />
              <span>{tr(LESSONS[sol].medal)}</span>
            </div>
          );
        })}
      </div>
      <p className="diploma-city">
        {tr("Desde", "From")} <strong>{tr(city?.name ?? "")}</strong>{" "}
        {tr(
          "hasta las estrellas. ¡Exploraste, cuidaste y aprendiste!",
          "to the stars. You explored, cared for the crew and learned!",
        )}
      </p>
      <dl className="dossier-grid">
        <div>
          <dt>{tr("01 / TU CIUDAD")}</dt>
          <dd>{tr(city?.name ?? "Sin seleccionar")}</dd>
          <small>
            {tr("ABRIGO DE TU CIUDAD ×")}
            {s.modifiers.aislamientoTermico.toFixed(1)}
          </small>
        </div>
        <div>
          <dt>{tr("02 / NUESTRAS PLANTAS")}</dt>
          <dd className={crop ? "good" : "warn"}>
            {crop
              ? tr("COSECHA SALVADA")
              : s.greenhouse.elapsed === 0
                ? tr("SIN PLANTAR")
                : tr("COSECHA PERDIDA")}
          </dd>
          <small>
            {tr("SALUD")} {s.resources.saludCosecha.toFixed(1)}
            {tr("% · CRECIMIENTO")} {s.greenhouse.growth.toFixed(1)}%
          </small>
        </div>
        <div>
          <dt>{tr("03 / RIESGO AL LIMPIAR PANELES")}</dt>
          <dd>
            {s.storm.evaRadiation.toFixed(1)}
            <em>%</em>
          </dd>
          <small>
            {tr("RADIACIÓN TOTAL")}{" "}
            {s.resources.radiacionTripulacion.toFixed(1)}%
          </small>
        </div>
        <div>
          <dt>{tr("04 / BATERÍA EN JEZERO")}</dt>
          <dd>
            {s.rover.boarded ? (
              <>
                {s.resources.energia.toFixed(2)}
                <em>%</em>
              </>
            ) : (
              tr("AÚN NO SALIMOS")
            )}
          </dd>
          <small>
            {route
              ? `${tr(route.name.toUpperCase())} · ${s.rover.segment * 5} / ${route.distance} KM`
              : tr(
                  `BATERÍA DE LA BASE ${s.resources.energia.toFixed(2)}%`,
                  `BASE BATTERY ${s.resources.energia.toFixed(2)}%`,
                )}
          </small>
        </div>
        <div className="dossier-flare">
          <dt>{tr("05 / AVISO REAL DE NASA DONKI")}</dt>
          {flare ? (
            <>
              <dd>
                {tr("LLAMARADA")} <b>{flare.classType}</b>
                <span className="data-source">
                  {flare.source === "live"
                    ? tr("CONSULTA A NASA")
                    : tr("DATO REAL GUARDADO")}
                </span>
              </dd>
              <p>
                {new Date(flare.peakTime)
                  .toISOString()
                  .replace("T", " · ")
                  .replace(".000Z", " UTC")}
                <br />
                {tr("ZONA DEL SOL")} {tr(flare.activeRegion ?? "NO INFORMADA")}{" "}
                ·{" "}
                {s.rescue.status === "complete"
                  ? tr("ESCUDO ACTIVADO")
                  : tr("SIN PROTECCIÓN")}
              </p>
              <a href={flare.link} target="_blank" rel="noreferrer">
                {tr("VER DATO EN NASA ↗")}
              </a>
            </>
          ) : (
            <dd>{tr("AÚN SIN AVISO")}</dd>
          )}
        </div>
      </dl>
      {s.climate && (
        <div className="diploma-power">
          <strong>{tr("☀️ EL CLIMA REAL DE TU CIUDAD")}</strong>
          <p>
            NASA POWER · {s.climate.date} · {s.climate.temperature.toFixed(1)}{" "}
            {tr("°C · luz:")} {s.climate.solar.toFixed(2)} {tr("kWh/m²/día.")}
          </p>
          <small>
            {s.climate.source === "live"
              ? tr("Consulta a NASA")
              : tr("Dato real guardado")}{" "}
            {tr("· Los bonos de la isla son parte del juego.")}
          </small>
        </div>
      )}
      <div className="dossier-telemetry">
        <span>
          {tr("AGUA")} <b>{s.resources.agua.toFixed(1)}%</b>
        </span>
        <span>
          O₂ <b>{s.resources.oxigeno.toFixed(1)}%</b>
        </span>
        <span>
          {tr("EQUIPO")} <b>{s.resources.integridadTripulacion.toFixed(1)}%</b>
        </span>
        <span>
          {tr("CALOR DEL EQUIPO")}{" "}
          <b>
            {s.rover.boarded ? `${s.rover.bodyTemperature.toFixed(1)} °C` : "—"}
          </b>
        </span>
      </div>
      <p className="dossier-note">
        {tr(
          "Diploma educativo de MISIÓN RESCATE. No es un título oficial ni está emitido por NASA.",
        )}
      </p>
      <div className="dossier-actions">
        <button
          className="launch-button dossier-restart"
          autoFocus
          onClick={onRestart}
        >
          {tr("JUGAR OTRA VEZ")} <span>↻</span>
          <small>{tr("ELEGIR OTRA CIUDAD")}</small>
        </button>
        <button
          type="button"
          className="dossier-print"
          onClick={() => window.print()}
        >
          {tr("IMPRIMIR / GUARDAR DIPLOMA")} <span aria-hidden="true">🖨️</span>
        </button>
      </div>
    </dialog>
  );
}
