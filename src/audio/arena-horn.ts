export interface HornPlaybackState {
  active: boolean;
  signalCount: number;
  enabled: boolean;
}

export type HornPlaybackAction = "start" | "stop" | "burst" | "stop-and-burst";

export function selectHornPlaybackAction(
  previous: HornPlaybackState,
  current: HornPlaybackState,
): HornPlaybackAction | null {
  if (previous.enabled && !current.enabled) {
    return "stop";
  }

  if (!current.enabled) {
    return null;
  }

  if (current.active && !previous.active) {
    return "start";
  }

  if (
    !current.active &&
    previous.active &&
    current.signalCount > previous.signalCount
  ) {
    return "stop-and-burst";
  }

  if (!current.active && previous.active) {
    return "stop";
  }

  if (current.signalCount > previous.signalCount) {
    return "burst";
  }

  return null;
}

interface HornVoice {
  gain: GainNode;
  sources: OscillatorNode[];
}

const oscillatorFrequencies = [164.81, 196, 246.94] as const;
const burstDurationSeconds = 1.35;
const releaseSeconds = 0.12;

export class ArenaHornController {
  private readonly context: AudioContext;
  private readonly output: GainNode;
  private continuousVoice: HornVoice | null = null;
  private burstVoice: HornVoice | null = null;
  private burstTimerId: number | null = null;

  constructor(context: AudioContext) {
    this.context = context;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.18;

    this.output = context.createGain();
    this.output.gain.value = 0.22;
    this.output.connect(compressor);
    compressor.connect(context.destination);
  }

  unlock(): void {
    if (this.context.state === "suspended") {
      void this.context.resume().catch(() => undefined);
    }
  }

  start(): void {
    this.unlock();
    if (this.continuousVoice) {
      return;
    }

    this.stopBurst();
    this.continuousVoice = this.createVoice();
  }

  stop(): void {
    if (!this.continuousVoice) {
      return;
    }

    this.releaseVoice(this.continuousVoice);
    this.continuousVoice = null;
  }

  burst(): void {
    this.unlock();
    this.stopBurst();

    const voice = this.createVoice();
    this.burstVoice = voice;
    const stopAt = this.context.currentTime + burstDurationSeconds;
    voice.gain.gain.setValueAtTime(0.72, stopAt - releaseSeconds);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    voice.sources.forEach((source) => source.stop(stopAt + 0.02));

    this.burstTimerId = window.setTimeout(
      () => {
        if (this.burstVoice === voice) {
          this.burstVoice = null;
        }
        this.burstTimerId = null;
      },
      (burstDurationSeconds + 0.1) * 1000,
    );
  }

  dispose(): void {
    this.stop();
    this.stopBurst();
    void this.context.close().catch(() => undefined);
  }

  private createVoice(): HornVoice {
    const now = this.context.currentTime;
    const gain = this.context.createGain();
    const lowPass = this.context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 1050;
    lowPass.Q.value = 0.7;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.72, now + 0.035);
    gain.connect(lowPass);
    lowPass.connect(this.output);

    const sources = oscillatorFrequencies.flatMap((frequency, index) =>
      [-5, 5].map((detune) => {
        const source = this.context.createOscillator();
        source.type = index === 0 ? "square" : "sawtooth";
        source.frequency.value = frequency;
        source.detune.value = detune;
        source.connect(gain);
        source.start(now);
        return source;
      }),
    );

    return { gain, sources };
  }

  private releaseVoice(voice: HornVoice): void {
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(
      Math.max(voice.gain.gain.value, 0.0001),
      now,
    );
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseSeconds);
    voice.sources.forEach((source) => source.stop(now + releaseSeconds + 0.02));
  }

  private stopBurst(): void {
    if (this.burstTimerId !== null) {
      window.clearTimeout(this.burstTimerId);
      this.burstTimerId = null;
    }

    if (!this.burstVoice) {
      return;
    }

    this.releaseVoice(this.burstVoice);
    this.burstVoice = null;
  }
}

export function createArenaHornController(
  AudioContextConstructor: typeof AudioContext | undefined,
): ArenaHornController | null {
  if (!AudioContextConstructor) {
    return null;
  }

  try {
    return new ArenaHornController(new AudioContextConstructor());
  } catch {
    return null;
  }
}
