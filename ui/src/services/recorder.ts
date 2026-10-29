export interface Recording {
  blob: Blob;
  durationMs: number;
  heardSpeech: boolean;
}

const SPEECH_RMS = 0.02;     // volumen mínimo para considerar que hablaste
const SILENCE_MS = 1500;     // silencio tras hablar para cortar solo
const NO_SPEECH_MS = 8000;   // si no hablás en este tiempo, corta
const MAX_MS = 30000;        // duración máxima

function setLevel(level: number) {
  document.documentElement.style.setProperty("--mic-level", level.toFixed(3));
}

export class Recorder {
  private stream?: MediaStream;
  private ctx?: AudioContext;
  private rec?: MediaRecorder;
  private chunks: Blob[] = [];
  private raf = 0;
  private startedAt = 0;
  private lastLoud = 0;
  private spoke = false;
  private closed = false;

  constructor(private readonly onAutoStop: () => void) {}

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    if (this.closed) {
      this.release();
      return;
    }
    this.ctx = new AudioContext();
    await this.ctx.resume();

    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    this.ctx.createMediaStreamSource(this.stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    this.rec = new MediaRecorder(this.stream);
    this.chunks = [];
    this.rec.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.rec.start();

    this.startedAt = performance.now();
    this.lastLoud = this.startedAt;

    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const value of samples) sum += value * value;
      const rms = Math.sqrt(sum / samples.length);
      setLevel(Math.min(1, rms * 5));

      const now = performance.now();
      if (rms > SPEECH_RMS) {
        this.spoke = true;
        this.lastLoud = now;
      }
      const elapsed = now - this.startedAt;
      const done =
        (this.spoke && now - this.lastLoud > SILENCE_MS) ||
        (!this.spoke && elapsed > NO_SPEECH_MS) ||
        elapsed > MAX_MS;

      if (done) {
        this.onAutoStop();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  async stop(): Promise<Recording> {
    this.closed = true;
    cancelAnimationFrame(this.raf);
    const rec = this.rec;
    const blob = await new Promise<Blob>((resolve) => {
      if (!rec || rec.state === "inactive") {
        resolve(new Blob(this.chunks));
        return;
      }
      rec.onstop = () => resolve(new Blob(this.chunks, { type: rec.mimeType }));
      rec.stop();
    });
    const result: Recording = {
      blob,
      durationMs: this.startedAt ? performance.now() - this.startedAt : 0,
      heardSpeech: this.spoke,
    };
    this.release();
    return result;
  }

  cancel(): void {
    this.closed = true;
    if (this.rec && this.rec.state !== "inactive") this.rec.stop();
    this.release();
  }

  private release(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.ctx?.close();
    this.stream = undefined;
    this.ctx = undefined;
    this.rec = undefined;
    setLevel(0);
  }
}