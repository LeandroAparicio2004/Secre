// Respuestas simuladas. Se reemplaza por STT / LLM / TTS reales en fases posteriores.
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function transcribe(): Promise<string> {
  await wait(500);
  return "Reproduce Nirvana en Spotify";
}

export async function reply(text: string): Promise<string> {
  await wait(900);
  return `Entendido: “${text}”. Esta es una respuesta simulada; el cerebro se conecta más adelante.`;
}

export function speakDuration(text: string): number {
  return Math.min(4000, 800 + text.length * 35);
}
