"use client";
import { useEffect, useRef, useState } from "react";
import { Chispa, type ChispaMood } from "./Chispa";
import { useGame, useTranslate } from "../GameProvider";
import type { ResourceKey } from "@/lib/game";
import {
  PROLOGUE_SECONDS,
  PROLOGUE_TRANSFORM_AT,
  PROLOGUE_WARNING_AT,
} from "@/lib/prologue";
export function PixelPlanet() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="29"
      height="29"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d="M10 2h12v3h5v5h3v12h-3v5h-5v3H10v-3H5v-5H2V10h3V5h5zm0 5v3H7v12h3v3h12v-3h3V10h-3V7z" />
      <path d="M0 15h8v3H0zm24 0h8v3h-8zM9 13h14v2H9zm0 6h14v2H9z" />
    </svg>
  );
}
const RESOURCES: {
  key: ResourceKey;
  label: string;
  glyph: string;
  color: string;
}[] = [
  { key: "agua", label: "AGUA", glyph: "💧", color: "#5ce1e6" },
  { key: "oxigeno", label: "AIRE", glyph: "💨", color: "#a9b8eb" },
  { key: "energia", label: "BATERÍA", glyph: "⚡", color: "#ffb000" },
  { key: "temperaturaCabina", label: "CALOR", glyph: "🌡️", color: "#ec8b66" },
  {
    key: "radiacionTripulacion",
    label: "RAYOS",
    glyph: "☢",
    color: "#c5a4d5",
  },
  { key: "saludCosecha", label: "PLANTAS", glyph: "✳", color: "#a3cc85" },
  {
    key: "integridadTripulacion",
    label: "EQUIPO",
    glyph: "♥",
    color: "#e6a29c",
  },
];
const CRITICAL_LEVEL: Partial<Record<ResourceKey, number>> = {
  agua: 30,
  oxigeno: 35,
  energia: 25,
  temperaturaCabina: 0,
};

function ResourceCard({
  resource,
  raw,
  extraRadiation,
}: {
  resource: (typeof RESOURCES)[number];
  raw: number;
  extraRadiation: number;
}) {
  const tr = useTranslate();
  const previous = useRef(raw);
  const nextChange = useRef(0);
  const [change, setChange] = useState<{ id: number; amount: number } | null>(
    null,
  );

  useEffect(() => {
    const amount = Number((raw - previous.current).toFixed(2));
    previous.current = raw;
    if (amount) setChange({ id: ++nextChange.current, amount });
  }, [raw]);

  useEffect(() => {
    if (!change) return;
    const timeout = setTimeout(() => setChange(null), 1350);
    return () => clearTimeout(timeout);
  }, [change]);

  const temp = resource.key === "temperaturaCabina";
  const unit = temp ? "°C" : "%";
  const preview = extraRadiation > 0;
  const min = CRITICAL_LEVEL[resource.key];
  const critical = min !== undefined && raw < min;
  const value = temp ? raw.toFixed(1) : Math.round(raw + extraRadiation);
  const bar = temp ? Math.max(0, ((raw + 20) / 60) * 100) : Number(value);
  const resourceName = tr(resource.label);
  const label = preview ? tr("Riesgo al limpiar paneles") : resourceName;
  const { lang } = useGame();

  return (
    <div
      className={`world-resource${temp ? " resource-temperature" : ""}${preview ? " eva-preview" : ""}${critical ? " resource-critical" : ""}`}
      style={{ "--resource": resource.color } as React.CSSProperties}
      title={`${resourceName}: ${raw.toFixed(1)}${temp ? " " : ""}${unit}${preview ? tr(` + ${extraRadiation.toFixed(1)}% de riesgo al limpiar`, ` + ${extraRadiation.toFixed(1)}% risk while cleaning`) : ""}`}
    >
      <span className="resource-glyph" aria-hidden="true">
        {resource.glyph}
      </span>
      <div className="resource-readout">
        <span className="world-resource-label">
          {resourceName}
          {preview ? tr(" · AFUERA") : ""}
        </span>
        <strong>
          {temp && raw > 0 ? "+" : ""}
          {value}
          <small>{unit}</small>
        </strong>
        <div
          className="world-resource-bar"
          role="meter"
          aria-label={
            critical
              ? tr(`${label}, nivel crítico`, `${label}, critical level`)
              : label
          }
          aria-valuenow={Number(value)}
          aria-valuemin={temp ? -75 : 0}
          aria-valuemax={temp ? 40 : 100}
        >
          <i style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      </div>
      {critical && (
        <span className="resource-warning" aria-hidden="true">
          !
        </span>
      )}
      {change && (
        <span
          key={change.id}
          className={`resource-delta ${change.amount > 0 ? "resource-gain" : "resource-loss"}`}
          aria-hidden="true"
        >
          {change.amount > 0 ? "+" : "−"}
          {Math.abs(change.amount).toLocaleString(lang, {
            maximumFractionDigits: 2,
          })}
          {unit}
        </span>
      )}
    </div>
  );
}

export function WorldHUD({ evaRadiation = 0 }: { evaRadiation?: number }) {
  const tr = useTranslate();
  const { state } = useGame();
  return (
    <section className="world-hud" aria-label={tr("Recursos de supervivencia")}>
      {RESOURCES.map((resource) => (
        <ResourceCard
          key={resource.key}
          resource={resource}
          raw={state.resources[resource.key]}
          extraRadiation={
            resource.key === "radiacionTripulacion" ? evaRadiation : 0
          }
        />
      ))}
    </section>
  );
}

const PROLOGUE_PHASES = [
  { start: 0, end: PROLOGUE_WARNING_AT, label: "Exploración", tone: "explore" },
  {
    start: PROLOGUE_WARNING_AT,
    end: PROLOGUE_TRANSFORM_AT,
    label: "¡Anomalía Magnética!",
    tone: "anomaly",
  },
  {
    start: PROLOGUE_TRANSFORM_AT,
    end: PROLOGUE_SECONDS,
    label: "Transformación Marciana",
    tone: "transform",
  },
] as const;

export function PrologueTimeline({ elapsed }: { elapsed: number }) {
  const tr = useTranslate();
  const seconds = Math.floor(elapsed);
  const active =
    PROLOGUE_PHASES.find((phase) => elapsed < phase.end) ?? PROLOGUE_PHASES[2];
  return (
    <section
      className="prologue-timeline"
      aria-label={tr("Prólogo automático de 20 segundos")}
    >
      <div className="prologue-timeline-header">
        <span>{tr("PRÓLOGO · SOL 0")}</span>
        <small>{tr("Fantasía · Datos NASA reales")}</small>
        <span
          className="prologue-clock"
          role="timer"
          aria-label={tr("Segundos del prólogo")}
        >
          <strong>{String(seconds).padStart(2, "0")}</strong> /{" "}
          {PROLOGUE_SECONDS} s
        </span>
      </div>
      <div
        className="prologue-track"
        role="progressbar"
        aria-label={tr("Progreso de la cinemática")}
        aria-valuemin={0}
        aria-valuemax={PROLOGUE_SECONDS}
        aria-valuenow={seconds}
      >
        <i style={{ transform: `scaleX(${elapsed / PROLOGUE_SECONDS})` }} />
      </div>
      <ol className="prologue-phases">
        {PROLOGUE_PHASES.map((phase) => (
          <li
            key={phase.tone}
            className={`prologue-phase prologue-phase-${phase.tone}`}
            aria-current={phase === active ? "step" : undefined}
            data-complete={elapsed >= phase.end ? true : undefined}
          >
            <b>
              {phase.start}–{phase.end} s
            </b>{" "}
            {tr(phase.label)}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WorldDialogue({
  text: sourceText,
  tag,
  action,
  actionLabel,
  actionDisabled = false,
  onHistory,
  mood,
  instant = false,
}: {
  text: string;
  mood?: ChispaMood;
  instant?: boolean;
  tag: string;
  action?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  onHistory: () => void;
}) {
  const tr = useTranslate();
  const [count, setCount] = useState(0);
  const { state, lang } = useGame();
  const text = tr(sourceText);
  const previousLanguage = useRef(lang);
  const languageChanged = previousLanguage.current !== lang;
  const expression =
    mood ??
    (state.support || state.rescue.status === "alert"
      ? "alert"
      : state.learning.pending !== null || state.outcome
        ? "celebrate"
        : "happy");
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const translateImmediately = previousLanguage.current !== lang;
    previousLanguage.current = lang;
    if (instant || motion.matches || translateImmediately) {
      setCount(text.length);
      return;
    }

    setCount(0);
    const tick = setInterval(
      () => setCount((n) => Math.min(text.length, n + 3)),
      20,
    );
    const finish = () => {
      clearInterval(tick);
      setCount(text.length);
    };
    const timeout = setTimeout(finish, Math.ceil(text.length / 3) * 20);
    const reduceMotion = () => {
      if (motion.matches) finish();
    };

    motion.addEventListener("change", reduceMotion);
    return () => {
      clearInterval(tick);
      clearTimeout(timeout);
      motion.removeEventListener("change", reduceMotion);
    };
  }, [text, instant, lang]);
  return (
    <section
      className={`world-dialogue dialogue-${expression}`}
      aria-label={tr("Diálogo de misión")}
    >
      <div className="dialogue-portrait">
        <Chispa mood={expression} />
        <span>CHISPA</span>
      </div>
      <div className="dialogue-copy">
        <div className="dialogue-meta">
          <span>
            {tr("TU ROBOT GUÍA")} <b>/</b> {tr(tag)}
          </span>
          <button onClick={onHistory}>
            {tr("MI VIAJE")}{" "}
            <span>{String(state.logs.length).padStart(2, "0")}</span> ↗
          </button>
        </div>
        <p aria-label={text} onClick={() => setCount(text.length)}>
          {languageChanged ? text : text.slice(0, count)}
          <span className="cursor">▌</span>
        </p>
      </div>
      {action && (
        <button
          className="dialogue-action"
          onClick={action}
          disabled={actionDisabled}
        >
          {actionLabel && tr(actionLabel)}
          <span>→</span>
        </button>
      )}
    </section>
  );
}

export function MissionGoal({
  text,
  onGo,
}: {
  text: string;
  onGo?: () => void;
}) {
  const tr = useTranslate();
  return (
    <div className="mission-goal" role="status">
      <span className="goal-arrow" aria-hidden="true">
        ➜
      </span>
      <p>{tr(text)}</p>
      {onGo && <button onClick={onGo}>{tr("IR AHÍ →")}</button>}
    </div>
  );
}
