"use client";
import { useEffect, useRef, useState } from "react";
import { useGame, useTranslate } from "../GameProvider";
import { Greenhouse, Storm } from "../PlayableChapters";
import { DustCanvas, GreenhouseCanvas } from "../ChapterCanvas";
import { RescueChapter, SignalPreview } from "../RescueChapter";
import { NasaFact } from "../NasaFact";
import { CITIES, type CityId } from "@/lib/game";
import {
  structuresForCity,
  activeBuilding,
  evaProjection,
  type BuildingId,
} from "@/lib/isometric";
import { ALERT_SECONDS, missionObjective, SHIELD_COST } from "@/lib/ux";
import {
  WorldCanvas,
  type WorldHandle,
  type PositionUpdate,
} from "./WorldCanvas";
import { WorldAtmosphere } from "./WorldAtmosphere";
import { LanguageButton } from "./LanguageButton";
import { TacticalModal } from "./TacticalModal";
import {
  PixelPlanet,
  WorldHUD,
  WorldDialogue,
  MissionGoal,
  PrologueTimeline,
} from "./WorldUI";
import { JezeroExpedition } from "./JezeroExpedition";
import { Chispa } from "./Chispa";
import { BoliviaMap } from "./BoliviaMap";
import { MedalBar, SciencePlayCard, LearningLayer } from "./LearningUI";
import {
  prologueFrame,
  PROLOGUE_DANGER,
  PROLOGUE_SURVIVED,
} from "@/lib/prologue";
import { MissionDossier } from "./MissionDossier";
type Cinematic = "select" | "earth" | "warning" | "collapse" | "mars";
type Panel = BuildingId | "help" | "history" | "nasa" | null;
type EvaTrip = { cycle: number; startedAt: number; arrivedAt: number };
export function IsometricGame() {
  const tr = useTranslate();
  const { state: s, selectCity, reset, sound, toggleSound, act } = useGame(),
    world = useRef<WorldHandle>(null),
    emergency = useRef<HTMLDialogElement>(null),
    nasaReturn = useRef<Panel>(null),
    latest = useRef(s);
  latest.current = s;
  const prologue = prologueFrame(s.prologue.elapsed);
  const cinematic: Cinematic =
    s.solActual !== 0
      ? "mars"
      : !s.cityId
        ? "select"
        : prologue.stage === "earth"
          ? "earth"
          : prologue.stage === "warning"
            ? "warning"
            : "collapse";
  const transformation = s.solActual === 0 ? prologue.transform : 1;
  const prologueAlert = s.solActual === 0 && prologue.alert;
  const [modal, setModal] = useState<Panel>(null),
    [position, setPosition] = useState<PositionUpdate>({
      position: { x: 5, y: 6 },
      moving: false,
      nearby: null,
    }),
    [toast, setToast] = useState(""),
    [pendingEva, setPendingEva] = useState<EvaTrip | null>(null),
    [evaElapsed, setEvaElapsed] = useState(0),
    [resetConfirm, setResetConfirm] = useState(false);
  const city = CITIES.find((c) => c.id === s.cityId),
    solarAlert = s.rescue.status === "alert",
    cleaning = !!pendingEva?.arrivedAt,
    active =
      s.outcome || (s.solActual === 18 && s.rescue.status === "complete")
        ? null
        : activeBuilding(s),
    lastCommit = useRef(""),
    previousPhase = useRef(s.phase);
  useEffect(() => {
    if (previousPhase.current !== s.phase) {
      previousPhase.current = s.phase;
      nasaReturn.current = null;
      setModal(null);
      setPendingEva(null);
      setToast("");
    }
  }, [s.phase]);
  useEffect(() => {
    if (s.learning.pending !== null || s.support) setModal(null);
  }, [s.learning.pending, !!s.support]);
  useEffect(() => {
    if (solarAlert) {
      setModal(null);
      if (emergency.current && !emergency.current.open)
        emergency.current.showModal();
    }
    return () => emergency.current?.close();
  }, [solarAlert]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (cinematic === "earth") world.current?.walkTo({ x: 6, y: 5 });
  }, [cinematic, s.cityId]);
  useEffect(() => {
    if (prologueAlert) {
      setModal(null);
      setToast("");
    }
  }, [prologueAlert]);
  useEffect(() => {
    if (pendingEva && !pendingEva.arrivedAt && !modal)
      world.current?.goTo("solar");
  }, [pendingEva, modal]);
  useEffect(() => {
    if (!pendingEva) {
      setEvaElapsed(0);
      return;
    }
    const trip = pendingEva,
      id = `${trip.cycle}:${trip.startedAt}`,
      t = setInterval(() => {
        setEvaElapsed((Date.now() - trip.startedAt) / 1000);
        if (
          trip.arrivedAt &&
          Date.now() - trip.arrivedAt >= 3000 &&
          lastCommit.current !== id
        ) {
          const current = latest.current;
          if (
            current.solActual === 8 &&
            current.storm.cycle === trip.cycle &&
            !["complete", "failed"].includes(current.storm.status)
          ) {
            lastCommit.current = id;
            act({ type: "STORM_CYCLE" });
            setToast("¡Paneles limpios! Vuelve al Refugio.");
          }
          setPendingEva(null);
          clearInterval(t);
        }
      }, 100);
    return () => clearInterval(t);
  }, [pendingEva]);
  function chooseCity(id: CityId) {
    setModal(null);
    world.current?.reset();
    void selectCity(id);
  }
  function restart() {
    reset();
    setModal(null);
    setPendingEva(null);
    setResetConfirm(false);
    setToast("");
    world.current?.reset();
  }
  function pauseCultivation() {
    if (s.greenhouse.status === "running") act({ type: "GREENHOUSE_PAUSE" });
  }
  function closeModal() {
    pauseCultivation();
    if (modal === "nasa" && nasaReturn.current) {
      setModal(nasaReturn.current);
      nasaReturn.current = null;
    } else setModal(null);
  }
  function openPanel(panel: Panel) {
    if (prologueAlert) return;
    if (panel === "nasa") nasaReturn.current = modal;
    if (panel !== "greenhouse") pauseCultivation();
    setModal(panel);
  }
  function requestCycle() {
    if (pendingEva) {
      setToast("Primero termina de limpiar los paneles.");
      return;
    }
    if (s.storm.allocation.eva > 0) {
      setPendingEva({
        cycle: s.storm.cycle,
        startedAt: Date.now(),
        arrivedAt: 0,
      });
      setModal(null);
      setToast("Vamos a los paneles. El equipo caminará hasta allí.");
    } else act({ type: "STORM_CYCLE" });
  }
  function arrived(id: BuildingId) {
    if (solarAlert || s.outcome) return;
    if (cinematic !== "mars") {
      setToast("¡Explora! La historia avanzará sola en 20 segundos.");
      return;
    }
    if (pendingEva) {
      if (id === "solar") {
        setPendingEva((t) => (t ? { ...t, arrivedAt: Date.now() } : null));
        setToast("Limpiando… espera tres segundos.");
      } else setToast("Sigue la flecha hasta los paneles.");
      return;
    }
    if (id === "garage" && s.phase === "sol28") {
      act({ type: "BOARD_ROVER" });
      return;
    }
    openPanel(id);
  }
  function go(id: BuildingId) {
    closeModal();
    requestAnimationFrame(() => world.current?.goTo(id));
  }
  const objective =
    s.solActual === 0
      ? cinematic === "select"
        ? tr("Objetivo: Elige una ciudad para empezar.")
        : cinematic === "earth"
          ? tr("Objetivo: Explora tu isla. La historia avanza sola.")
          : cinematic === "warning"
            ? tr("Objetivo: ¡Atención! Chispa nos guía durante la alerta.")
            : tr("Objetivo: Mira cómo tu isla se convierte en Marte.")
      : s.learning.pending !== null
        ? tr("Objetivo: Responde a Chispa para ganar tu medalla.")
        : s.support
          ? tr("Objetivo: Arregla el control con la ayuda de Chispa.")
          : missionObjective(s, !!pendingEva);
  const dialogue =
    cinematic === "select"
      ? tr(
          "¡Hola, explorador! Toca un pin de Bolivia para crear tu isla mágica.",
        )
      : cinematic === "earth"
        ? tr(
            `¡Bienvenido a ${city?.name}! Explora tu ciudad mientras analizamos el clima real con la NASA...`,
            `Welcome to ${tr(city?.name ?? "")}! Explore your city while we check real weather data with NASA...`,
          )
        : prologueAlert
          ? PROLOGUE_DANGER
          : pendingEva
            ? cleaning
              ? tr("Estamos limpiando. Pronto recuperaremos batería.")
              : tr("Camina a los paneles. Tu traje te protege del frío.")
            : s.solActual === 0
              ? tr("Ahora estamos en Marte. ¡Vamos a cuidar al equipo!")
              : s.solActual === 1
                ? s.greenhouse.status === "failed"
                  ? tr(
                      "¡Probemos otra vez! Toca el Invernadero y deja el agua en verde.",
                    )
                  : PROLOGUE_SURVIVED
                : s.solActual === 8
                  ? tr(
                      "¡Una nube de polvo! Toca el Refugio para elegir dos ayudas.",
                    )
                  : s.solActual === 18
                    ? s.rescue.status === "failed"
                      ? tr(
                          "¡Otra oportunidad! Toca la Antena y pulsa «Probar otra vez».",
                        )
                      : tr(
                          "¡Llamemos a la Tierra! Toca la Antena y junta las líneas de colores.",
                        )
                    : tr(
                        "¡El rescate nos espera! Toca el Garaje y sube al rover.",
                      );
  const heading =
    s.solActual === 0
      ? tr("DE BOLIVIA A MARTE")
      : s.solActual === 1
        ? tr("HAGAMOS AGUA")
        : s.solActual === 8
          ? tr("CUIDA AL EQUIPO")
          : s.solActual === 18
            ? tr("LLAMA A LA TIERRA")
            : tr("VAMOS AL RESCATE");
  const nearby = structuresForCity(s.cityId).find(
      (b) => b.id === position.nearby,
    ),
    building = structuresForCity(s.cityId).find((b) => b.id === modal),
    science =
      s.solActual === 0
        ? "origin"
        : s.solActual === 1
          ? "water"
          : s.solActual === 8
            ? "storm"
            : s.solActual === 18
              ? "signal"
              : "rover";
  const nasaContent = (
    <>
      <SciencePlayCard mission={s.solActual} cityId={s.cityId} />
      <NasaFact mission={science} initialOpen>
        {s.solActual === 0 && (
          <p className="short-copy">
            {tr("Las islas vuelan solo en esta historia.")}{" "}
            <a
              href="https://www.geoboundaries.org/api/current/gbOpen/BOL/ADM1/"
              target="_blank"
              rel="noreferrer"
            >
              {tr("Su forma viene de GeoBolivia.")}
            </a>
          </p>
        )}
        {s.solActual === 0 && s.climate && (
          <>
            <p className="short-copy">
              {tr(city?.name ?? "")}: {s.climate.temperature.toFixed(1)} °C.
            </p>
            <p className="short-copy">
              {tr("Luz solar:")} {s.climate.solar.toFixed(2)}{" "}
              {tr("kWh/m²/día.")}
            </p>
            <p className="short-copy">
              {s.climate.source === "live"
                ? tr("Consulta a NASA POWER.")
                : tr("Dato real guardado: la consulta no respondió.")}
            </p>
            <a href={s.climate.url} target="_blank" rel="noreferrer">
              {tr("Ver dato del 15/01/2024 ↗")}
            </a>
          </>
        )}
        {s.solActual === 18 && s.rescue.event && (
          <>
            <p className="short-copy">
              {tr("Llamarada")} {s.rescue.event.classType} ·{" "}
              {s.rescue.event.source === "live"
                ? tr("Consulta NASA")
                : tr("Dato real guardado")}
            </p>
            <p className="short-copy">
              {s.rescue.event.peakTime.replace("T", " · ").replace("Z", " UTC")}
            </p>
            <p className="short-copy">
              {tr("Zona del Sol:")} {tr(s.rescue.event.activeRegion)}
            </p>
            <a href={s.rescue.event.link} target="_blank" rel="noreferrer">
              {tr("Ver este dato en NASA ↗")}
            </a>
          </>
        )}
      </NasaFact>
      <details className="secondary-info">
        <summary>{tr("Cómo jugar")}</summary>
        <p>
          {tr(
            "Toca un edificio para caminar hasta él. También puedes usar WASD o las flechas.",
          )}
        </p>
        <p>
          {tr(
            "Sigue la flecha amarilla. Puedes pausar el cultivo cuando quieras.",
          )}
        </p>
        {s.solActual === 8 && (
          <p>
            {tr(
              "Calor cuida al equipo. Aire ayuda a respirar. Plantas cuida la comida. Limpiar paneles recupera batería al salir al exterior.",
            )}
          </p>
        )}
        <div className="info-map-tools">
          <button onClick={() => world.current?.zoom(1)}>
            {tr("Acercar mapa +")}
          </button>
          <button onClick={() => world.current?.zoom(-1)}>
            {tr("Alejar mapa −")}
          </button>
          <button onClick={() => world.current?.zoom(0)}>
            {tr("Ver isla completa")}
          </button>
        </div>
        <button className="world-secondary" onClick={() => openPanel("help")}>
          {tr("Ayuda y nueva expedición")}
        </button>
      </details>
      <details className="secondary-info">
        <summary>{tr("Mi viaje")}</summary>
        {s.logs.map((l, i) => (
          <p key={`${l.id}-${i}`}>{tr(l.text)}</p>
        ))}
      </details>
    </>
  );
  let missionAction: React.ReactNode;
  if (modal === "greenhouse" && s.solActual === 1) {
    const status = s.greenhouse.status,
      ended = ["complete", "failed"].includes(status);
    missionAction = (
      <button
        className="launch-button easy-primary"
        onClick={() =>
          act({
            type: ended
              ? status === "complete"
                ? "ENTER_STORM"
                : "RETRY"
              : status === "running"
                ? "GREENHOUSE_PAUSE"
                : "GREENHOUSE_START",
          })
        }
      >
        {ended
          ? status === "complete"
            ? tr("IR AL DÍA 8")
            : tr("PROBAR OTRA VEZ")
          : status === "running"
            ? tr("PAUSAR")
            : status === "paused"
              ? tr("SEGUIR CULTIVANDO")
              : tr("EMPEZAR A CULTIVAR")}
        <span>{status === "running" ? "Ⅱ" : "→"}</span>
      </button>
    );
  } else if (modal === "refuge" && s.solActual === 8) {
    const done = s.storm.status === "complete",
      failed = s.storm.status === "failed";
    missionAction = (
      <button
        className="launch-button easy-primary"
        onClick={() =>
          done
            ? act({ type: "ENTER_RESCUE" })
            : failed
              ? act({ type: "RETRY" })
              : requestCycle()
        }
      >
        {done
          ? tr("IR AL DÍA 18")
          : failed
            ? tr("PROBAR OTRA VEZ")
            : s.storm.allocation.eva > 0
              ? tr("SALIR A LIMPIAR PANELES")
              : tr(
                  `PASAR RONDA ${s.storm.cycle + 1}`,
                  `PLAY ROUND ${s.storm.cycle + 1}`,
                )}
        <span>→</span>
      </button>
    );
  } else if (modal === "probe" && s.solActual === 18) {
    const status = s.rescue.status;
    missionAction = (
      <button
        className="launch-button easy-primary"
        disabled={
          status === "tuning" || status === "connected" || status === "alert"
        }
        onClick={() =>
          act(
            status === "idle"
              ? { type: "SIGNAL_START", now: Date.now() }
              : status === "complete"
                ? { type: "ENTER_ROVER" }
                : { type: "RETRY" },
          )
        }
      >
        {status === "idle"
          ? tr("CONECTAR CON LA TIERRA")
          : status === "tuning"
            ? tr(
                `CONECTANDO… ${Math.ceil(20 - s.rescue.elapsed)} S`,
                `CONNECTING… ${Math.ceil(20 - s.rescue.elapsed)} S`,
              )
            : status === "connected"
              ? tr("ESPERANDO AVISO DE NASA…")
              : status === "complete"
                ? tr("IR AL DÍA 28")
                : tr("PROBAR OTRA VEZ")}
        <span>→</span>
      </button>
    );
  }
  if (s.rover.boarded) return <JezeroExpedition onRestart={restart} />;
  const worldBlocked =
    !!modal ||
    !!s.support ||
    s.learning.pending !== null ||
    !!s.outcome ||
    cinematic === "select" ||
    prologueAlert ||
    cleaning ||
    solarAlert;
  const skyWeather = solarAlert
    ? "solar"
    : s.rescue.status === "complete"
      ? "shield"
      : s.solActual === 8
        ? "storm"
        : prologueAlert
          ? "magnetic"
          : "clear";
  return (
    <div
      data-prologue-stage={prologueAlert ? cinematic : undefined}
      className={`iso-game easy-game kids-game floating-world ${s.solActual === 8 ? "iso-storm" : ""} ${prologueAlert ? "iso-prologue-alert" : ""} ${s.solActual === 0 && s.cityId ? "prologue-narrative" : ""} ${solarAlert ? "iso-solar-alert" : ""}`}
    >
      <WorldAtmosphere
        city={s.cityId}
        transform={s.cityId ? transformation : 1}
        weather={skyWeather}
      />
      <header className="iso-topbar">
        <a className="iso-brand" href="#world">
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
          {s.solActual === 0 ? tr("BOLIVIA → MARTE") : tr("BASE EN MARTE")}
        </div>
        <div className="iso-header-actions">
          <LanguageButton />
          <span className="iso-sol">
            {tr("DÍA")} <strong>{String(s.solActual).padStart(2, "0")}</strong>
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
          <button
            onClick={() => openPanel("help")}
            className="iso-icon-button world-help-button"
            aria-label={tr("Cómo jugar")}
            disabled={solarAlert || prologueAlert}
          >
            ?
          </button>
        </div>
      </header>
      <MissionGoal
        text={objective}
        onGo={
          active && cinematic === "mars" && !modal && !pendingEva
            ? () => go(active)
            : undefined
        }
      />
      {s.solActual !== 0 && (
        <WorldHUD
          evaRadiation={pendingEva ? evaProjection(s, evaElapsed) : 0}
        />
      )}
      {s.solActual === 0 && s.cityId !== null && (
        <PrologueTimeline elapsed={prologue.seconds} />
      )}
      <main
        id="world"
        className="iso-world"
        aria-label={tr("Base en Marte: toca un edificio para ir hasta él")}
      >
        <div className="world-heading">
          <div className="eyebrow">
            {s.solActual === 0
              ? tr("EL COMIENZO")
              : tr(`DÍA ${s.solActual} EN MARTE`, `DAY ${s.solActual} ON MARS`)}
          </div>
          <h1>{heading}</h1>
          <p>
            {cinematic === "earth"
              ? tr(city?.name ?? "")
              : cinematic === "collapse"
                ? tr("Tu ciudad está cambiando…")
                : cinematic === "warning"
                  ? tr("¡Chispa está contigo!")
                  : tr("Toca un edificio. Tu personaje caminará hasta allí.")}
          </p>
        </div>
        <div className="world-coordinate-card easy-location">
          <span>
            {s.solActual === 0 && cinematic !== "mars"
              ? tr("TU CIUDAD")
              : tr("TU BASE")}
          </span>
          <strong>
            {s.solActual === 0 && cinematic !== "mars"
              ? (city?.name ?? "BOLIVIA")
              : tr("MARTE")}
          </strong>
          <span className="coordinate-link">
            <i />
            {s.climate ? tr("DATOS NASA LISTOS") : tr("PREPARANDO VIAJE")}
          </span>
        </div>
        <WorldCanvas
          ref={world}
          transformation={transformation}
          blocked={worldBlocked}
          active={cinematic === "mars" ? (pendingEva ? "solar" : active) : null}
          cleaning={cleaning}
          onArrive={arrived}
          onPosition={setPosition}
        />
        {cinematic === "select" && (
          <section className="origin-overlay" aria-label={tr("Elegir ciudad")}>
            <div className="origin-overlay-header">
              <span className="eyebrow">{tr("1. ELEGIR CIUDAD")}</span>
              <h2>
                {tr("TU ISLA")} <em>{tr("ESPACIAL")}</em>
              </h2>
              <p>{tr("¡Elige un pin y despierta tu isla mágica!")}</p>
            </div>
            <BoliviaMap onChoose={chooseCity} />
            <div className="origin-choices">
              {CITIES.map((c, i) => (
                <button
                  className={`origin-choice origin-${c.id}`}
                  key={c.id}
                  onClick={() => chooseCity(c.id)}
                >
                  <span className="origin-symbol" aria-hidden="true">
                    {i === 0 ? "▟" : i === 1 ? "▱" : "▴"}
                  </span>
                  <span>
                    <strong>{tr(c.name)}</strong>
                    <span className="origin-bonus">{tr(c.bonus)}</span>
                  </span>
                  <b>→</b>
                </button>
              ))}
            </div>
            <div className="origin-overlay-footer">
              <span className="live-dot" />
              {tr("ELIGE UNA. LA HISTORIA AVANZA SOLA EN 20 SEGUNDOS.")}
            </div>
          </section>
        )}
        {s.solActual === 0 &&
          cinematic !== "select" &&
          cinematic === "earth" && (
            <div className="origin-science">
              <SciencePlayCard mission={0} cityId={s.cityId} />
            </div>
          )}
        {prologueAlert && (
          <div
            className="prologue-alert-cascade"
            role="alert"
            aria-label={tr("¡Peligro! Escena de fantasía")}
          >
            <div className="prologue-danger-card alert-window alert-main">
              <Chispa mood="alert" />
              <div>
                <strong>{tr("¡PELIGRO!")}</strong>
                <p>{tr(PROLOGUE_DANGER)}</p>
                <small>
                  {tr("AVENTURA DE FANTASÍA · NO ES UNA ALERTA REAL DE NASA")}
                </small>
              </div>
            </div>
            {prologue.seconds >= 11.4 && (
              <div className="alert-window alert-sensor">
                <span>⚠️ {tr("SENSOR MAGNÉTICO · ALERTA #02")}</span>
                <strong>{tr("¡POLOS INVERTIDOS!")}</strong>
                <p>{tr("El cielo y las rocas están cambiando de color.")}</p>
              </div>
            )}
            {prologue.seconds >= 13 && (
              <div className="alert-window alert-climate">
                <span>❄️ {tr("CLIMA EXTREMO · ALERTA #03")}</span>
                <strong>{tr("AIRE MARCIANO: −63 °C")}</strong>
                <p>{tr("Activando trajes espaciales del equipo…")}</p>
              </div>
            )}
            {cinematic === "collapse" && (
              <div className="alert-window alert-collapse">
                <span>
                  🚨 {tr("RECONSTRUCCIÓN PLANETARIA")} ·{" "}
                  {Math.round(transformation * 100)}%
                </span>
                <strong>{tr("CONVIRTIENDO ISLA EN BASE MARCIANA")}</strong>
                <progress
                  value={transformation}
                  max={1}
                  aria-label={tr("Transformación a Marte")}
                />
              </div>
            )}
          </div>
        )}
        <div className="world-notices">
          {toast && !solarAlert && (
            <div className="world-toast short-copy" role="status">
              ▸ {tr(toast)}
            </div>
          )}
          {pendingEva && (
            <div className="eva-route-card" role="status">
              <span className="live-dot" />
              <div>
                {cleaning
                  ? tr("LIMPIANDO PANELES")
                  : tr("CAMINANDO A LOS PANELES")}
                <strong>
                  {tr("Riesgo al salir: +")}
                  {evaProjection(s, evaElapsed).toFixed(1)}%
                </strong>
                <small>
                  {cleaning
                    ? tr("YA CASI TERMINAMOS")
                    : tr("SIGUE LA FLECHA AMARILLA")}
                </small>
              </div>
            </div>
          )}
          {s.rescue.status === "complete" &&
            s.solActual === 18 &&
            !s.outcome && (
              <div className="world-complete-banner">
                <span className="live-dot" />
                {tr("¡EL EQUIPO ESTÁ A SALVO!")}
                <button
                  className="world-secondary"
                  onClick={() => act({ type: "ENTER_ROVER" })}
                >
                  {tr("IR AL DÍA 28 →")}
                </button>
              </div>
            )}
          {s.rescue.status === "connected" && (
            <div className="world-complete-banner" role="status">
              {tr("¡Hay señal! Esperando el aviso de NASA…")}
            </div>
          )}
        </div>
        <div className="world-tools" hidden={cinematic === "select"}>
          <button
            aria-label={tr("Acercar mapa")}
            disabled={worldBlocked}
            onClick={() => world.current?.zoom(1)}
          >
            +
          </button>
          <button
            aria-label={tr("Alejar mapa")}
            disabled={worldBlocked}
            onClick={() => world.current?.zoom(-1)}
          >
            −
          </button>
          <button
            aria-label={tr("Ver toda la base")}
            disabled={worldBlocked}
            onClick={() => world.current?.zoom(0)}
          >
            ⌖
          </button>
        </div>
        {!modal && (
          <button
            className="world-nasa-button"
            onClick={() => openPanel("nasa")}
            disabled={prologueAlert}
          >
            {tr("[?] Info NASA")}
          </button>
        )}
      </main>
      <WorldDialogue
        text={dialogue}
        tag={tr(`DÍA ${s.solActual}`, `DAY ${s.solActual}`)}
        onHistory={() => openPanel("history")}
        mood={prologueAlert ? "alert" : undefined}
        instant={prologueAlert}
        action={
          s.solActual !== 0 && nearby && !pendingEva
            ? () => world.current?.interact()
            : undefined
        }
        actionLabel={tr("ABRIR [E]")}
      />
      <footer className="iso-controls">
        <span>
          <kbd>WASD</kbd> / <kbd>{tr("FLECHAS")}</kbd>{" "}
          {tr("CAMINAR · TOCA UN EDIFICIO PARA ENTRAR")}
        </span>
        <span>{tr("HECHO EN BOLIVIA. RUMBO A MARTE.")}</span>
      </footer>
      {modal && !s.outcome && (
        <TacticalModal
          title={
            modal === "help"
              ? tr("Cómo jugar")
              : modal === "history"
                ? tr("Mi viaje")
                : modal === "nasa"
                  ? tr("Info NASA")
                  : (building?.name ?? "")
          }
          tag={tr(`DÍA ${s.solActual}`, `DAY ${s.solActual}`)}
          onClose={closeModal}
          onInfo={
            modal !== "nasa" &&
            !["tuning", "connected", "alert"].includes(s.rescue.status)
              ? () => openPanel("nasa")
              : undefined
          }
          action={missionAction}
          preview={
            modal === "greenhouse" && s.solActual === 1 ? (
              <GreenhouseCanvas />
            ) : modal === "refuge" && s.solActual === 8 ? (
              <DustCanvas />
            ) : modal === "probe" && s.solActual === 18 ? (
              <SignalPreview />
            ) : undefined
          }
          kind={
            modal === "greenhouse" && s.solActual === 1
              ? "greenhouse"
              : modal === "refuge" && s.solActual === 8
                ? "storm"
                : modal === "probe" && s.solActual === 18
                  ? "rescue"
                  : "info"
          }
        >
          {modal === "help" ? (
            <div className="world-info easy-help">
              <p className="short-copy">
                {tr("Toca un edificio para caminar hasta él y entrar.")}
              </p>
              <p className="short-copy">
                {tr("También puedes caminar con WASD o las flechas.")}
              </p>
              <p className="short-copy">
                {tr("Sigue la flecha amarilla. Ahí está tu siguiente tarea.")}
              </p>
              <p className="short-copy">
                {tr("No gastas reservas por caminar o leer la ayuda.")}
              </p>
              <p className="short-copy">
                {tr("Día 1: pon el agua en verde para cultivar.")}
              </p>
              <p className="short-copy">
                {tr("Día 8: elige dos ayudas en cada ronda.")}
              </p>
              <p className="short-copy">
                {tr(
                  "Día 18: junta las líneas y activa el escudo en 10 segundos.",
                )}
              </p>
              <p className="short-copy">
                {tr("Día 28: sigue el camino y enciende el calor de noche.")}
              </p>
              {resetConfirm ? (
                <div className="reset-confirm">
                  {tr("¿EMPEZAR DE CERO?")}{" "}
                  <button onClick={restart}>{tr("SÍ")}</button>
                  <button onClick={() => setResetConfirm(false)}>
                    {tr("CANCELAR")}
                  </button>
                </div>
              ) : (
                <button
                  className="world-secondary"
                  onClick={() => setResetConfirm(true)}
                >
                  {tr("ELEGIR OTRA CIUDAD ↻")}
                </button>
              )}
            </div>
          ) : modal === "history" ? (
            <div className="world-history">
              {s.logs.map((l, i) => (
                <article key={`${l.id}-${i}`}>
                  <span>{tr(l.tag)}</span>
                  <p className="short-copy">{tr(l.text)}</p>
                </article>
              ))}
            </div>
          ) : modal === "nasa" ? (
            nasaContent
          ) : modal === "greenhouse" && s.solActual === 1 ? (
            <Greenhouse />
          ) : modal === "refuge" && s.solActual === 8 ? (
            <Storm onCycle={requestCycle} />
          ) : modal === "probe" && s.solActual === 18 ? (
            <RescueChapter />
          ) : (
            <div className="world-info">
              <h3>{building && tr(building.name)}</h3>
              <p className="short-copy">
                {modal === "garage"
                  ? tr("El rover nos llevará al rescate en el día 28.")
                  : modal === "solar"
                    ? tr(
                        "Estos paneles dan energía. Se limpian desde el Refugio.",
                      )
                    : modal === "greenhouse"
                      ? tr("Aquí hacemos agua para cuidar las plantas.")
                      : modal === "probe"
                        ? tr("Esta antena nos ayudará a llamar a la Tierra.")
                        : tr("Aquí cuidamos el calor, el aire y las plantas.")}
              </p>
              {active && (
                <button
                  className="launch-button easy-primary"
                  onClick={() => go(active)}
                >
                  {tr("IR A MI TAREA")} <span>→</span>
                </button>
              )}
            </div>
          )}
        </TacticalModal>
      )}
      {solarAlert && !s.outcome && (
        <dialog
          ref={emergency}
          className="world-solar-emergency easy-emergency"
          data-urgent={s.rescue.secondsLeft <= 3 ? true : undefined}
          role="alertdialog"
          aria-modal="true"
          aria-label={tr("Alerta solar: activa el escudo")}
          onCancel={(e) => e.preventDefault()}
        >
          <div className="dialog-language">
            <LanguageButton />
          </div>
          <div className="solar-emergency-heading">
            <Chispa mood="alert" />
            <div>
              {tr("¡ALERTA SOLAR!")}
              <small>{tr("PROTEGE AL EQUIPO DE LA RADIACIÓN")}</small>
            </div>
          </div>
          <div
            className="easy-countdown"
            role="timer"
            aria-label={tr("Segundos para activar el escudo")}
          >
            <strong>{s.rescue.secondsLeft}</strong>
            <span>{tr("SEGUNDOS")}</span>
          </div>
          <div
            className="solar-shield-progress"
            role="progressbar"
            aria-label={tr("Tiempo restante para activar el escudo")}
            aria-valuemin={0}
            aria-valuemax={ALERT_SECONDS}
            aria-valuenow={s.rescue.secondsLeft}
            aria-valuetext={tr(
              `${s.rescue.secondsLeft} segundos`,
              `${s.rescue.secondsLeft} seconds`,
            )}
          >
            <i
              style={{
                width: `${(s.rescue.secondsLeft / ALERT_SECONDS) * 100}%`,
              }}
            />
          </div>
          <p className="short-copy">
            {tr(
              "¡El Sol estornudó energía! Enciende nuestro escudo de fantasía.",
            )}
          </p>
          <button
            autoFocus
            className="world-shield-button"
            onClick={() => act({ type: "SHIELD", now: Date.now() })}
          >
            {tr("¡ACTIVAR ESCUDO!")}
          </button>
          <p className="short-copy">
            {tr("Escudo Anti-Radiación · usa")} {SHIELD_COST}
            {tr("% de batería.")}
          </p>
          {s.resources.energia < SHIELD_COST && (
            <p className="short-copy warn" role="alert">
              {tr("Falta batería. Después podrás volver a limpiar paneles.")}
            </p>
          )}
        </dialog>
      )}
      <LearningLayer />
      {s.outcome && <MissionDossier onRestart={restart} />}
    </div>
  );
}
