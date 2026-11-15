"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CITIES,
  INITIAL_STATE,
  climateUrl,
  gameReducer,
  parseClimate,
  type Action,
  type CityId,
  type GameState,
} from "@/lib/game";
import { prologueFrame } from "@/lib/prologue";
import { LESSONS } from "@/lib/learning";
import { SHIELD_COST } from "@/lib/ux";
import { HISTORICAL_FLARE, donkiUrl, latestFlare } from "@/lib/donki";
import { GAME_DESCRIPTIONS, GAME_TITLES, t, type Lang } from "@/lib/i18n";

type GameContextType = {
  state: GameState;
  selectCity: (id: CityId) => void;
  start: () => void;
  reset: () => void;
  lang: Lang;
  toggleLang: () => void;
  translate: (source: string, english?: string) => string;
  sound: boolean;
  toggleSound: () => void;
  act: (action: Action) => void;
};
const Context = createContext<GameContextType | null>(null);

type Tone = {
  from: number;
  to?: number;
  peak?: number;
  duration: number;
  delay?: number;
  volume: number;
  wave: OscillatorType;
};

type Synth = {
  context: AudioContext;
  output: GainNode;
  voices: Set<OscillatorNode>;
  sliderAt: number;
};

const DO = 523.25;
const MI = 659.25;
const SOL = 783.99;
const DO_ALTO = 1046.5;
const LIFT_OFF: Tone[] = [
  ...[DO, MI, SOL, DO_ALTO].map((from, i): Tone => ({
    from,
    delay: i * 0.083,
    duration: 0.14,
    volume: 0.045,
    wave: "triangle",
  })),
  ...[DO, MI, SOL, DO_ALTO].map((from, i): Tone => ({
    from,
    delay: i * 0.083,
    duration: 0.075,
    volume: 0.012,
    wave: "square",
  })),
];
const MEDAL: Tone[] = [SOL, DO_ALTO, 1174.66, 1318.51].map((from, i): Tone => ({
  from,
  delay: i * 0.095,
  duration: i === 3 ? 0.25 : 0.12,
  volume: 0.034,
  wave: "square",
}));
const TRY_AGAIN: Tone[] = [
  { from: 329.63, to: 349.23, duration: 0.11, volume: 0.038, wave: "triangle" },
  { from: 392, delay: 0.105, duration: 0.15, volume: 0.038, wave: "sine" },
];
const SWITCH: Tone[] = [
  { from: 148, to: 88, duration: 0.065, volume: 0.057, wave: "triangle" },
  {
    from: 260,
    to: 185,
    delay: 0.045,
    duration: 0.055,
    volume: 0.03,
    wave: "square",
  },
];
const SHIELD_SWEEP: Tone[] = [
  { from: 150, to: 880, duration: 0.45, volume: 0.038, wave: "sawtooth" },
  { from: 150, to: 880, duration: 0.45, volume: 0.051, wave: "sine" },
];
const ROVER_MOTOR: Tone[] = [
  {
    from: 98,
    to: 193,
    peak: 234,
    duration: 0.23,
    volume: 0.05,
    wave: "triangle",
  },
  {
    from: 192,
    to: 136,
    delay: 0.055,
    duration: 0.15,
    volume: 0.018,
    wave: "sawtooth",
  },
];
const CONFIRM: Tone[] = [
  { from: 370, to: 472, duration: 0.078, volume: 0.026, wave: "triangle" },
];
const SIREN: Tone[] = [
  {
    from: 330,
    peak: 660,
    to: 330,
    duration: 0.65,
    volume: 0.033,
    wave: "square",
  },
];
const GREENHOUSE_ALARM: Tone[] = [
  { from: 220, to: 440, duration: 0.25, volume: 0.024, wave: "square" },
];

function stopVoices(voices: Set<OscillatorNode>) {
  for (const voice of voices) {
    try {
      voice.stop();
    } catch {
      // A voice may already have stopped.
    }
  }
  voices.clear();
}

function schedule(synth: Synth, tones: Tone[], group?: Set<OscillatorNode>) {
  const { context, output, voices } = synth;
  const now = context.currentTime;
  for (const tone of tones) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = now + (tone.delay ?? 0);
    const end = start + tone.duration;
    oscillator.type = tone.wave;
    oscillator.frequency.setValueAtTime(tone.from, start);
    if (tone.peak !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(
        tone.peak,
        start + tone.duration * 0.48,
      );
    }
    if (tone.to !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(tone.to, end);
    }
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(
      tone.volume,
      start + Math.min(0.024, tone.duration * 0.24),
    );
    envelope.gain.setValueAtTime(tone.volume, start + tone.duration * 0.63);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.onended = () => {
      voices.delete(oscillator);
      group?.delete(oscillator);
      try {
        oscillator.disconnect();
        envelope.disconnect();
      } catch {
        // The context may have been closed.
      }
    };
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(start);
    voices.add(oscillator);
    group?.add(oscillator);
    oscillator.stop(end);
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [lang, setLang] = useState<Lang>("es");
  const tCurrent = useCallback(
    (source: string, english?: string) =>
      lang === "en" && english !== undefined ? english : t(lang, source),
    [lang],
  );
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("mision-rescate-lang");
      if (saved === "es" || saved === "en") setLang(saved);
    } catch {
      // The current session still supports switching languages.
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = GAME_TITLES[lang];
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", GAME_DESCRIPTIONS[lang]);
  }, [lang]);
  function toggleLang() {
    const next = lang === "es" ? "en" : "es";
    setLang(next);
    try {
      window.localStorage.setItem("mision-rescate-lang", next);
    } catch {
      // Storage can be unavailable in private sessions.
    }
  }
  const [sound, setSound] = useState(true);
  const counter = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const audio = useRef<Synth | null>(null);
  const soundEnabled = useRef(sound);
  const previousSol = useRef(state.solActual);
  const withAudio = useCallback((play: (synth: Synth) => void) => {
    if (!soundEnabled.current) return;
    try {
      if (!audio.current) {
        const context = new AudioContext();
        const output = context.createGain();
        output.connect(context.destination);
        audio.current = {
          context,
          output,
          voices: new Set(),
          sliderAt: -Infinity,
        };
      }
      const synth = audio.current;
      if (synth.context.state === "suspended") {
        void synth.context.resume().catch(() => {});
      }
      play(synth);
    } catch {
      // Audio may be unavailable, including in browsers that require a gesture.
    }
  }, []);
  const prologueAlert =
    state.solActual === 0 && prologueFrame(state.prologue.elapsed).alert;
  useEffect(() => {
    const departed = previousSol.current === 0 && state.solActual === 1;
    previousSol.current = state.solActual;
    if (departed) withAudio((synth) => schedule(synth, LIFT_OFF));
  }, [state.solActual, withAudio]);
  useEffect(() => {
    if (
      state.solActual !== 0 ||
      !state.cityId ||
      state.prologue.startedAt === null
    )
      return;
    const requestId = state.requestId;
    const tick = () =>
      dispatch({ type: "PROLOGUE_TICK", requestId, now: Date.now() });
    tick();
    const timer = setInterval(tick, 40);
    return () => clearInterval(timer);
  }, [
    state.solActual,
    state.cityId,
    state.requestId,
    state.prologue.startedAt,
  ]);
  useEffect(() => {
    if (state.support || state.learning.pending !== null) return;
    const tuning = state.phase === "sol18" && state.rescue.status === "tuning";
    const alert = state.phase === "sol18" && state.rescue.status === "alert";
    if (!tuning && !alert) return;
    const timer = setInterval(
      () =>
        dispatch({
          type: tuning ? "SIGNAL_TICK" : "ALERT_TICK",
          now: Date.now(),
        }),
      100,
    );
    return () => clearInterval(timer);
  }, [state.phase, state.rescue.status, state.support, state.learning.pending]);
  useEffect(() => {
    if (state.phase !== "sol18" || state.rescue.status !== "connected") return;
    const attempt = state.rescue.attempt;
    const abort = new AbortController();
    let disposed = false;
    const timeout = setTimeout(() => abort.abort(), 5000);
    async function load() {
      let event;
      try {
        const response = await fetch(donkiUrl(), { signal: abort.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        event = latestFlare(await response.json());
      } catch (error) {
        event = {
          ...HISTORICAL_FLARE,
          reason: error instanceof Error ? error.message : "API indisponible",
        };
      } finally {
        clearTimeout(timeout);
      }
      if (!disposed)
        dispatch({ type: "SOLAR_EVENT", event, attempt, now: Date.now() });
    }
    void load();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      abort.abort();
    };
  }, [state.phase, state.rescue.status, state.rescue.attempt]);
  useEffect(() => {
    if (
      state.support ||
      !sound ||
      (!prologueAlert &&
        (state.phase !== "sol18" || state.rescue.status !== "alert"))
    )
      return;
    const playing = new Set<OscillatorNode>();
    const siren = () => withAudio((synth) => schedule(synth, SIREN, playing));
    siren();
    const timer = setInterval(siren, 700);
    return () => {
      clearInterval(timer);
      stopVoices(playing);
    };
  }, [
    sound,
    state.phase,
    state.rescue.status,
    state.support,
    prologueAlert,
    withAudio,
  ]);
  useEffect(
    () => () => {
      controller.current?.abort();
      const synth = audio.current;
      audio.current = null;
      if (!synth) return;
      stopVoices(synth.voices);
      try {
        void synth.context.close().catch(() => {});
      } catch {
        // The context may already have been closed.
      }
    },
    [],
  );
  useEffect(() => {
    if (
      state.support ||
      state.learning.pending !== null ||
      state.phase !== "sol1" ||
      state.greenhouse.status !== "running"
    )
      return;
    const timer = setInterval(
      () => dispatch({ type: "GREENHOUSE_TICK" }),
      1000,
    );
    const visibility = () => {
      if (document.hidden) dispatch({ type: "GREENHOUSE_PAUSE" });
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [
    state.phase,
    state.greenhouse.status,
    state.support,
    state.learning.pending,
  ]);
  useEffect(() => {
    if (
      !sound ||
      state.phase !== "sol1" ||
      state.greenhouse.status !== "running" ||
      (state.greenhouse.risk < 75 && state.resources.oxigeno >= 30)
    )
      return;
    const playing = new Set<OscillatorNode>();
    const alarm = () =>
      withAudio((synth) => schedule(synth, GREENHOUSE_ALARM, playing));
    alarm();
    const timer = setInterval(alarm, 1000);
    return () => {
      clearInterval(timer);
      stopVoices(playing);
    };
  }, [
    sound,
    state.phase,
    state.greenhouse.status,
    state.greenhouse.risk >= 75,
    state.resources.oxigeno < 30,
    withAudio,
  ]);

  function playAction(action: Action) {
    withAudio((synth) => {
      switch (action.type) {
        case "SELECT":
        case "START":
          schedule(synth, LIFT_OFF);
          break;
        case "CALIBRATE":
        case "SIGNAL_SET": {
          const now = synth.context.currentTime;
          if (!Number.isFinite(action.value) || now - synth.sliderAt < 0.027)
            break;
          synth.sliderAt = now;
          const position =
            action.type === "CALIBRATE"
              ? action.value / 100
              : action.field === "frequency"
                ? (action.value - 1) / 7
                : action.value / (action.field === "angle" ? 180 : 360);
          const from = 385 + Math.max(0, Math.min(1, position)) * 225;
          schedule(synth, [
            {
              from,
              to: from + 19,
              duration: 0.053,
              volume: 0.034,
              wave: "triangle",
            },
          ]);
          break;
        }
        case "ALLOCATE":
        case "ROVER_HEAT":
          schedule(synth, SWITCH);
          break;
        case "SHIELD":
          if (
            state.phase === "sol18" &&
            state.rescue.status === "alert" &&
            !state.support &&
            action.now < state.rescue.alertDeadline &&
            state.resources.energia >= SHIELD_COST
          ) {
            schedule(synth, SHIELD_SWEEP);
          }
          break;
        case "QUIZ_ANSWER": {
          const sol = state.learning.pending;
          if (sol !== null && state.learning.feedback !== "correct") {
            schedule(
              synth,
              LESSONS[sol].correct === action.answer ? MEDAL : TRY_AGAIN,
            );
          }
          break;
        }
        case "ROVER_STEP":
          schedule(synth, ROVER_MOTOR);
          break;
        default:
          schedule(synth, CONFIRM);
      }
    });
  }

  function act(action: Action) {
    playAction(action);
    dispatch(action);
  }

  function toggleSound() {
    const enabled = !soundEnabled.current;
    soundEnabled.current = enabled;
    setSound(enabled);
    if (enabled) {
      withAudio((synth) => {
        synth.output.gain.value = 1;
      });
      return;
    }
    const synth = audio.current;
    if (!synth) return;
    try {
      synth.output.gain.value = 0;
      synth.sliderAt = -Infinity;
    } catch {
      // Audio controls may be unavailable when the context closes.
    }
    stopVoices(synth.voices);
  }

  async function selectCity(id: CityId) {
    if (state.solActual !== 0) return;
    controller.current?.abort();
    const requestId = ++counter.current;
    const city = CITIES.find((c) => c.id === id)!;
    const abort = new AbortController();
    controller.current = abort;
    act({ type: "SELECT", cityId: id, requestId, now: Date.now() });
    const timeout = setTimeout(() => abort.abort(), 6500);
    const url = climateUrl(city);
    try {
      const response = await fetch(url, { signal: abort.signal });
      if (!response.ok) throw new Error(`POWER ${response.status}`);
      const climate = parseClimate(await response.json(), url);
      dispatch({ type: "CLIMATE", requestId, climate });
    } catch {
      if (requestId !== counter.current) return;
      dispatch({
        type: "CLIMATE",
        requestId,
        climate: {
          ...city.fallback,
          date: "2024-01-15",
          source: "fallback",
          url,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  function reset() {
    if (audio.current) stopVoices(audio.current.voices);
    controller.current?.abort();
    counter.current++;
    act({ type: "RESET" });
  }
  return (
    <Context.Provider
      value={{
        state,
        selectCity,
        start: () => act({ type: "START" }),
        reset,
        lang,
        toggleLang,
        translate: tCurrent,
        sound,
        toggleSound,
        act,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useGame() {
  const context = useContext(Context);
  if (!context) throw new Error("Falta GameProvider");
  return context;
}

export function useTranslate() {
  return useGame().translate;
}
