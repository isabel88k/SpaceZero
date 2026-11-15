"use client";
import { useRef, useState } from "react";
import { useGame, useTranslate } from "../GameProvider";
import { NasaFact } from "../NasaFact";
import { CITIES } from "@/lib/game";
import {
  ROUTES,
  forecastRoverStep,
  roverNight,
  type RoverRoute,
} from "@/lib/rover";
import { missionObjective } from "@/lib/ux";
import { JezeroCanvas, type JezeroHandle } from "./JezeroCanvas";
import { MedalBar, LearningLayer, SciencePlayCard } from "./LearningUI";
import { MissionDossier } from "./MissionDossier";
import { PixelPlanet, WorldDialogue, MissionGoal } from "./WorldUI";
import { WorldAtmosphere } from "./WorldAtmosphere";
import { LanguageButton } from "./LanguageButton";
import { TacticalModal } from "./TacticalModal";
export function JezeroExpedition({ onRestart }: { onRestart: () => void }) {
  const tr = useTranslate();
  const { state: s, act, sound, toggleSound } = useGame(),
    rover = useRef<JezeroHandle>(null),
    [moving, setMoving] = useState(false),
    [panel, setPanel] = useState<"history" | "nasa" | null>(null);
  const route = s.rover.route ? ROUTES[s.rover.route] : null,
    night = roverNight(s.rover.route, s.rover.segment),
    f = forecastRoverStep(s),
    city = CITIES.find((c) => c.id === s.cityId),
    heaterOn = s.rover.heater === "high";
  return (
    <div
      className={`iso-game easy-game kids-game floating-world jezero-game ${night ? "jezero-night" : ""}`}
    >
      <WorldAtmosphere
        city={s.cityId}
        transform={1}
        weather={night ? "night" : "clear"}
      />
      <header className="iso-topbar">
        <a className="iso-brand" href="#jezero">
          <span>
            <PixelPlanet />
          </span>
          <div>
            {tr("MISIÓN RESCATE")}
            <small>
              {tr("ESPEJO")} <b>{tr("MARCIANO")}</b>
            </small>
          </div>
        </a>
        <MedalBar />
        <div className="iso-header-status">
          <span className="live-dot" />
          {tr("RUMBO AL RESCATE")}
        </div>
        <div className="iso-header-actions">
          <LanguageButton />
          <span className="iso-sol">
            {tr("DÍA")} <strong>28</strong>
            <small>/28</small>
          </span>
          <button
            className="iso-icon-button"
            onClick={toggleSound}
            aria-label={sound ? tr("Apagar sonido") : tr("Encender sonido")}
            aria-pressed={sound}
          >
            {sound ? "♪" : "♫"}
            <span>{sound ? tr("SÍ") : "NO"}</span>
          </button>
        </div>
      </header>
      <MissionGoal text={missionObjective(s)} />
      <section
        className="rover-hud"
        aria-label={tr("Batería y calor del equipo")}
      >
        <TwinMeter
          label={tr("BATERÍA")}
          value={s.resources.energia}
          unit="%"
          percent={s.resources.energia}
          color="#ffb000"
        />
        <TwinMeter
          label={tr("CALOR DEL EQUIPO")}
          value={s.rover.bodyTemperature}
          unit="°C"
          percent={((s.rover.bodyTemperature - 30) / 7.4) * 100}
          color={s.rover.bodyTemperature < 35 ? "#ff7057" : "#5ce1e6"}
          min={30}
          max={37.4}
        />
        <div className="rover-environment">
          <span>
            {night ? tr("☾ ES DE NOCHE") : tr("☀ TODAVÍA ES DE DÍA")}{" "}
            <b>{night ? "−80" : "−35"} °C</b>
          </span>
          <span>
            {tr(
              `El abrigo de ${city?.name} viaja contigo.`,
              `The warmth from ${tr(city?.name ?? "")} comes with you.`,
            )}
          </span>
        </div>
      </section>
      <main
        id="jezero"
        className={`iso-world jezero-world${route && !s.outcome ? " with-rover-controls" : ""}`}
        aria-label={tr("Camino al rescate en Jezero")}
      >
        <div className="world-heading">
          <div className="eyebrow">{tr("EL ÚLTIMO VIAJE")}</div>
          <h1>
            {tr("¡VAMOS")}
            <br />
            <em>{tr("A CASA!")}</em>
          </h1>
          <p>{tr("Sigue la flecha amarilla.")}</p>
        </div>
        <div className="jezero-map-id">
          <span>{tr("CRÁTER JEZERO")}</span>
          <strong>{tr("EL RESCATE NOS ESPERA")}</strong>
        </div>
        <JezeroCanvas
          ref={rover}
          onMoving={setMoving}
          blocked={!!panel || !!s.support || s.learning.pending !== null}
        />
        <div className="jezero-legend">
          <span>
            <i style={{ background: "#ffb000" }} />
            {tr("CAMINO CORTO")}
          </span>
          <span>
            <i style={{ background: "#5ce1e6" }} />
            {tr("CAMINO LARGO")}
          </span>
        </div>
        {!route && !s.outcome && (
          <section
            className="route-planner easy-route-planner"
            aria-label={tr("Elige un camino")}
          >
            <span className="eyebrow">{tr("ANTES DE SALIR")}</span>
            <h2>{tr("¿POR DÓNDE VAMOS?")}</h2>
            <p className="short-copy">
              {tr(
                `Tenemos ${s.resources.energia.toFixed(0)}% de batería para llegar.`,
                `We have ${s.resources.energia.toFixed(0)}% battery power to get there.`,
              )}
            </p>
            <div className="route-options">
              {(Object.keys(ROUTES) as RoverRoute[]).map((id) => {
                const r = ROUTES[id];
                return (
                  <button
                    key={id}
                    className={`route-option route-${id}`}
                    onClick={() => act({ type: "ROVER_ROUTE", route: id })}
                  >
                    <span className="easy-route-symbol" aria-hidden="true">
                      {id === "short" ? "↗" : "☾"}
                    </span>
                    <strong>
                      {r.distance}
                      <small> KM</small>
                    </strong>
                    <h3>{tr(r.name)}</h3>
                    <p>{tr(r.description)}</p>
                    <em>{tr("ELEGIR ESTE CAMINO →")}</em>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {route && (
          <div className="rover-route-progress">
            <span>
              {tr(route.name.toUpperCase())}
              <b>
                {s.rover.segment * 5} / {route.distance} KM
              </b>
            </span>
            <div>
              {Array.from({ length: route.segments }, (_, i) => (
                <i
                  key={i}
                  className={
                    i < s.rover.segment
                      ? "done"
                      : i === s.rover.segment
                        ? "current"
                        : ""
                  }
                />
              ))}
            </div>
            <small>
              {moving ? tr("ROVER EN MARCHA") : tr("TOCA AVANZAR O CONDUCE TÚ")}
            </small>
          </div>
        )}
        {route && !s.outcome && (
          <section
            className="rover-console easy-rover-console"
            aria-label={tr("Conducir y encender calor")}
          >
            <div className="rover-console-heading">
              <span>{tr("CUIDA AL EQUIPO")}</span>
              <b>
                {night ? tr("HACE MUCHO FRÍO AFUERA") : tr("LLEGAREMOS PRONTO")}
              </b>
            </div>
            <button
              className={`rover-heat-toggle ${heaterOn ? "switched-on" : ""}`}
              role="switch"
              aria-checked={heaterOn}
              onClick={() =>
                act({ type: "ROVER_HEAT", heater: heaterOn ? "off" : "high" })
              }
            >
              <span aria-hidden="true">🔥</span> {tr("Calefacción:")}{" "}
              {heaterOn ? tr("ENCENDIDA") : tr("APAGADA")}
              <i />
            </button>
            <p className="short-copy easy-tip">
              {!heaterOn && night
                ? tr("¡Es de noche! Enciende el calor para cuidar al equipo.")
                : tr("El calor usa batería y evita que pasemos frío.")}
            </p>
            <div className="rover-forecast">
              <span>{tr("DESPUÉS DE AVANZAR")}</span>
              <b className={f.battery <= 0 ? "warn" : ""}>
                {f.battery.toFixed(1)}% <i>{tr("BATERÍA")}</i>
              </b>
              <b className={f.bodyTemperature < 35 ? "warn" : ""}>
                {f.bodyTemperature.toFixed(1)} °C <i>{tr("EQUIPO")}</i>
              </b>
            </div>
            <button
              className="launch-button easy-primary"
              disabled={moving}
              onClick={() => rover.current?.next()}
            >
              {moving ? tr("ROVER EN MARCHA…") : tr("AVANZAR 5 KM")}{" "}
              <span>→</span>
            </button>
            <p className="short-copy easy-tip">
              {tr("También puedes conducir con las flechas o tocar el mapa.")}
            </p>
          </section>
        )}
        {!panel && (
          <button
            className="world-nasa-button"
            onClick={() => setPanel("nasa")}
          >
            {tr("[?] Info NASA")}
          </button>
        )}
      </main>
      <WorldDialogue
        tag={tr("DÍA 28")}
        text={
          s.rover.route
            ? tr(
                "¡Sigue los puntos! Toca «Avanzar 5 km». De noche, enciende el calor.",
              )
            : tr(
                "¡Como en bici! Elige un camino: corto con cuestas o largo y más frío.",
              )
        }
        onHistory={() => setPanel("history")}
      />
      <footer className="iso-controls">
        <span>
          <kbd>WASD</kbd> / <kbd>{tr("FLECHAS")}</kbd>{" "}
          {tr("CONDUCIR · TOCA EL MAPA PARA IR AHÍ")}
        </span>
        <span>
          {tr("AGUA")} {s.resources.agua.toFixed(0)}
          {tr("% · AIRE")} {s.resources.oxigeno.toFixed(0)}
          {tr("% · EQUIPO")} {s.resources.integridadTripulacion.toFixed(0)}%
        </span>
      </footer>
      {panel && !s.outcome && (
        <TacticalModal
          title={panel === "nasa" ? tr("Info NASA") : tr("Mi viaje")}
          tag={tr("DÍA 28")}
          onClose={() => setPanel(null)}
        >
          {panel === "nasa" ? (
            <>
              <SciencePlayCard mission={28} />
              <NasaFact mission="rover" initialOpen />
              <details className="secondary-info">
                <summary>{tr("Cómo conducir")}</summary>
                <p>
                  {tr(
                    "Toca Avanzar 5 km o conduce con WASD y las flechas. Enciende el calor por la noche.",
                  )}
                </p>
              </details>
              <details className="secondary-info">
                <summary>{tr("Mi viaje")}</summary>
                {s.logs.map((l, i) => (
                  <p key={`${l.id}-${i}`}>{tr(l.text)}</p>
                ))}
              </details>
            </>
          ) : (
            <div className="world-history">
              {s.logs.map((l, i) => (
                <article key={`${l.id}-${i}`}>
                  <span>{tr(l.tag)}</span>
                  <p className="short-copy">{tr(l.text)}</p>
                </article>
              ))}
            </div>
          )}
        </TacticalModal>
      )}
      <LearningLayer />
      {s.outcome && <MissionDossier onRestart={onRestart} />}
    </div>
  );
}
function TwinMeter({
  label,
  value,
  unit,
  percent,
  color,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  unit: string;
  percent: number;
  color: string;
  min?: number;
  max?: number;
}) {
  return (
    <div
      className="rover-twin"
      style={{ "--resource": color } as React.CSSProperties}
    >
      <div>
        <span>{label}</span>
        <strong>
          {value.toFixed(1)}
          <small>{unit}</small>
        </strong>
      </div>
      <div
        className="rover-twin-bar"
        role="meter"
        aria-label={label}
        aria-valuenow={Number(value.toFixed(1))}
        aria-valuemin={min}
        aria-valuemax={max}
      >
        <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}
