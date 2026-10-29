import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { initialState, islandReducer } from "../state/islandMachine";
import { reply as askAssistant, speakDuration, transcribe } from "../services/mockAssistant";

// Suspensión por inactividad: 5 min por defecto. Para probar: http://localhost:1420/?idle=10
const IDLE_SECONDS = Number(new URLSearchParams(window.location.search).get("idle")) || 300;
const IDLE_MS = IDLE_SECONDS * 1000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useIsland() {
  const [state, dispatch] = useReducer(islandReducer, initialState);
  const [activity, setActivity] = useState(0);
  const runId = useRef(0);

  const poke = useCallback(() => setActivity((n) => n + 1), []);

  const wake = useCallback(() => dispatch({ type: "WAKE" }), []);

  const sleep = useCallback(() => {
    runId.current += 1; // cancela cualquier respuesta en curso
    dispatch({ type: "SLEEP" });
  }, []);

  const ask = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const id = ++runId.current;
    dispatch({ type: "SUBMIT", text: clean });
    const answer = await askAssistant(clean);
    if (id !== runId.current) return;
    dispatch({ type: "REPLY", text: answer });
    await wait(speakDuration(answer));
    if (id !== runId.current) return;
    dispatch({ type: "SPEAK_DONE" });
  }, []);

  const toggleMic = useCallback(async () => {
    poke();
    if (state.phase === "listening") {
      const id = ++runId.current;
      dispatch({ type: "LISTEN_STOP" });
      const heard = await transcribe();
      if (id !== runId.current) return;
      await ask(heard);
    } else if (state.phase === "awake" || state.phase === "speaking") {
      runId.current += 1;
      dispatch({ type: "LISTEN_START" });
    }
  }, [ask, poke, state.phase]);

  // Vuelve a "dormant" tras IDLE_MS sin actividad (solo estando en reposo despierto).
  useEffect(() => {
    if (state.phase !== "awake") return;
    const id = window.setTimeout(sleep, IDLE_MS);
    return () => window.clearTimeout(id);
  }, [state.phase, activity, sleep]);

  // Esc = volver a dormir.
  useEffect(() => {
    if (state.phase === "dormant") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") sleep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase, sleep]);

  return { state, wake, sleep, ask, toggleMic, poke };
}
