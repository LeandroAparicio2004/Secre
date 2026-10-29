import { useEffect } from "react";
import { Island } from "./components/Island";
import { useIsland } from "./hooks/useIsland";
import "./App.css";

// En el navegador (desarrollo) mostramos un fondo; dentro de Tauri la ventana es transparente.
const isTauri = "__TAURI_INTERNALS__" in window;

export default function App() {
  const { state, wake, sleep, ask, toggleMic, poke } = useIsland();

  useEffect(() => {
    document.documentElement.dataset.runtime = isTauri ? "tauri" : "web";
  }, []);

  return (
    <main className="stage">
      <Island
        phase={state.phase}
        heard={state.heard}
        reply={state.reply}
        onWake={wake}
        onSleep={sleep}
        onSubmit={ask}
        onMic={toggleMic}
        onActivity={poke}
      />
      {!isTauri && <p className="devtag">dev · estado: {state.phase}</p>}
    </main>
  );
}
