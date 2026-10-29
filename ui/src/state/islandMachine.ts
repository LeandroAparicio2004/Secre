export type Phase = "dormant" | "awake" | "listening" | "thinking" | "speaking";

export interface IslandState {
  phase: Phase;
  heard: string;
  reply: string;
}

export type IslandEvent =
  | { type: "WAKE" }
  | { type: "SLEEP" }
  | { type: "LISTEN_START" }
  | { type: "LISTEN_STOP" }
  | { type: "SUBMIT"; text: string }
  | { type: "REPLY"; text: string }
  | { type: "SPEAK_DONE" }
  | { type: "FAIL"; text: string };

export const initialState: IslandState = { phase: "dormant", heard: "", reply: "" };

export function islandReducer(state: IslandState, event: IslandEvent): IslandState {
  switch (event.type) {
    case "WAKE":
      return state.phase === "dormant" ? { ...state, phase: "awake" } : state;
    case "SLEEP":
      return initialState;
    case "LISTEN_START":
      return state.phase === "awake" || state.phase === "speaking"
        ? { ...state, phase: "listening", reply: "" }
        : state;
    case "LISTEN_STOP":
      return state.phase === "listening" ? { ...state, phase: "thinking" } : state;
    case "SUBMIT":
      return state.phase === "dormant"
        ? state
        : { ...state, phase: "thinking", heard: event.text, reply: "" };
    case "REPLY":
      return state.phase === "thinking" ? { ...state, phase: "speaking", reply: event.text } : state;
    case "SPEAK_DONE":
      return state.phase === "speaking" ? { ...state, phase: "awake" } : state;
    case "FAIL":
      return state.phase === "dormant" ? state : { ...state, phase: "awake", reply: event.text };
    default:
      return state;
  }
}