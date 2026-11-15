"use client";
import { useGame, useTranslate } from "./GameProvider";
import { Oscilloscope } from "./Oscilloscope";
import { SIGNAL_TARGET, alignment } from "@/lib/rescue";
export function RescueChapter() {
  const tr = useTranslate();
  const { state: s, act } = useGame(),
    r = s.rescue,
    locked = !["idle", "tuning"].includes(r.status);
  const controls = [
    {
      field: "angle",
      label: tr("Girar la antena"),
      min: 0,
      max: 180,
      step: 1,
      target: SIGNAL_TARGET.angle,
      margin: 24,
      unit: "°",
    },
    {
      field: "frequency",
      label: tr("Velocidad de la señal"),
      min: 1,
      max: 8,
      step: 0.1,
      target: SIGNAL_TARGET.frequency,
      margin: 0.7,
      unit: "",
    },
    {
      field: "phase",
      label: tr("Juntar las líneas"),
      min: 0,
      max: 360,
      step: 5,
      target: SIGNAL_TARGET.phase,
      margin: 35,
      unit: "°",
    },
  ] as const;
  return (
    <div className="easy-mission easy-signal">
      <p className="mission-instruction">
        {tr("Objetivo: junta la línea azul con la verde.")}
      </p>
      {controls.map((c) => (
        <label className="easy-slider" key={c.field}>
          <span>
            {tr(c.label)}
            <strong>
              {r[c.field].toFixed(c.field === "frequency" ? 1 : 0)}
              {c.unit}
            </strong>
          </span>
          <div className="safe-track">
            <span
              className="safe-band"
              style={{
                left: `${((c.target - c.margin - c.min) / (c.max - c.min)) * 100}%`,
                width: `${((c.margin * 2) / (c.max - c.min)) * 100}%`,
              }}
            />
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={r[c.field]}
              disabled={locked}
              aria-label={tr(c.label)}
              onChange={(e) =>
                act({
                  type: "SIGNAL_SET",
                  field: c.field,
                  value: Number(e.target.value),
                })
              }
            />
          </div>
          <small>
            {tr("Acércalo a")} {c.target}
            {c.unit}.
          </small>
        </label>
      ))}
      <div className="easy-progress">
        <span>
          {tr("Llamada conectada")} <b>{Math.round(r.progress)}%</b>
        </span>
        <progress
          max={100}
          value={r.progress}
          aria-label={tr("Llamada conectada")}
        />
      </div>
      {r.status === "tuning" && (
        <p className="short-copy easy-tip">
          {tr("Tienes 20 segundos. Mantén las líneas cerca.")}
        </p>
      )}
      {r.status === "connected" && (
        <p className="short-copy" role="status">
          {tr("¡Hay señal! NASA está revisando la actividad del Sol.")}
        </p>
      )}
      {r.status === "failed" && (
        <>
          <button
            className="world-secondary"
            onClick={() => act({ type: "RETRY_STORM" })}
          >
            {tr("VOLVER A LIMPIAR PANELES")}
          </button>
        </>
      )}
    </div>
  );
}

export function SignalPreview() {
  const tr = useTranslate();
  const { state } = useGame(),
    r = state.rescue,
    accuracy = alignment(r);
  const locked = !["idle", "tuning"].includes(r.status);
  return (
    <div
      className={`signal-preview${accuracy >= 75 ? " signal-captured" : ""}`}
    >
      <Oscilloscope />
      <div
        className="signal-color-bar"
        aria-label={tr(
          `Señal: ${Math.round(accuracy)} de 100`,
          `Signal: ${Math.round(accuracy)} out of 100`,
        )}
        role="meter"
        aria-valuenow={Math.round(accuracy)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={
          {
            "--signal-color":
              accuracy >= 75
                ? "#83ed85"
                : accuracy >= 65
                  ? "#ffe179"
                  : "#ff897e",
          } as React.CSSProperties
        }
      >
        {Array.from({ length: 12 }, (_, i) => (
          <i
            key={i}
            className={i < Math.round((accuracy / 100) * 12) ? "lit" : ""}
          />
        ))}
      </div>
      <div
        className={`signal-friendly ${accuracy >= 75 ? "is-safe" : accuracy >= 65 ? "almost-ready" : ""}`}
        role="status"
      >
        {locked
          ? tr(r.message)
          : accuracy >= 75
            ? tr("¡Lo tienes! Deja los controles así.")
            : accuracy >= 65
              ? tr("¡Casi listo! Acerca un poco más las líneas.")
              : tr("Lleva los controles hacia la zona verde.")}
      </div>
    </div>
  );
}
