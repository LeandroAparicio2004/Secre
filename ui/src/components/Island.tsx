import { useState } from "react";
import type { FormEvent } from "react";
import type { Phase } from "../state/islandMachine";

interface IslandProps {
  phase: Phase;
  heard: string;
  reply: string;
  onWake: () => void;
  onSleep: () => void;
  onSubmit: (text: string) => void;
  onMic: () => void;
  onActivity: () => void;
}

const LABELS: Record<Exclude<Phase, "dormant">, string> = {
  awake: "Lista",
  listening: "Escuchando",
  thinking: "Pensando",
  speaking: "Hablando",
};

function Indicator({ phase }: { phase: Exclude<Phase, "dormant"> }) {
  if (phase === "listening") {
    return (
      <span className="pulse" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </span>
    );
  }
  if (phase === "thinking") {
    return (
      <span className="dots" aria-hidden="true">
        <span /><span /><span />
      </span>
    );
  }
  return <span className={`dot dot--${phase}`} aria-hidden="true" />;
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function Island({
  phase, heard, reply, onWake, onSleep, onSubmit, onMic, onActivity,
}: IslandProps) {
  const [draft, setDraft] = useState("");

  if (phase === "dormant") {
    return (
      <button type="button" className="trigger" onClick={onWake} aria-label="Despertar a Secre">
        <span className="trigger__line" />
      </button>
    );
  }

  const busy = phase === "listening" || phase === "thinking";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    onSubmit(draft);
    setDraft("");
  };

  return (
    <section className={`island island--${phase}`} onPointerMove={onActivity} aria-live="polite">
      <header className="island__head">
        <span className="island__name">Secre</span>
        <span className="island__meta">
          <span className="island__status">
            <Indicator phase={phase} />
            {LABELS[phase]}
          </span>
          <button type="button" className="island__sleep" onClick={onSleep} title="Esc">
            Reposo
          </button>
        </span>
      </header>

      {heard && <p className="island__heard">{heard}</p>}
      {reply && <p className="island__reply">{reply}</p>}

      <form className="island__form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          disabled={busy}
          autoFocus
          placeholder="Escribí o tocá el micrófono"
          onChange={(event) => { setDraft(event.target.value); onActivity(); }}
          aria-label="Mensaje para Secre"
        />
        <button
          type="button"
          className="mic"
          onClick={onMic}
          disabled={phase === "thinking"}
          aria-pressed={phase === "listening"}
          aria-label={phase === "listening" ? "Terminar de grabar" : "Hablar"}
        >
          <MicIcon />
        </button>
      </form>
    </section>
  );
}
