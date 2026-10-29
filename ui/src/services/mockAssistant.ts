import type { Recording } from "./recorder";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function transcribe(recording: Recording): Promise<string> {
  await wait(500);
  const seconds = (recording.durationMs / 1000).toFixed(1).replace(".", ",");
  return `Grabé ${seconds} s de audio (transcripción simulada)`;
}

export async function reply(text: string): Promise<string> {
  await wait(900);
  return `Entendido: “${text}”. Esta es una respuesta simulada; el cerebro se conecta más adelante.`;
}

export function speakDuration(text: string): number {
  return Math.min(4000, 800 + text.length * 35);
}