import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ArenaHornController,
  createArenaHornController,
  selectHornPlaybackAction,
} from "@/src/audio/arena-horn";

class FakeAudioParam {
  value = 0;
  cancelScheduledValues = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  setValueAtTime = vi.fn();
}

class FakeConnectableNode {
  connect = vi.fn();
}

class FakeGainNode extends FakeConnectableNode {
  gain = new FakeAudioParam();
}

class FakeBiquadFilterNode extends FakeConnectableNode {
  type: BiquadFilterType = "lowpass";
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}

class FakeCompressorNode extends FakeConnectableNode {
  threshold = new FakeAudioParam();
  knee = new FakeAudioParam();
  ratio = new FakeAudioParam();
  attack = new FakeAudioParam();
  release = new FakeAudioParam();
}

class FakeOscillatorNode extends FakeConnectableNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 10;
  destination = {};
  oscillators: FakeOscillatorNode[] = [];
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createDynamicsCompressor = () => new FakeCompressorNode();
  createGain = () => new FakeGainNode();
  createBiquadFilter = () => new FakeBiquadFilterNode();
  createOscillator = () => {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("arena horn playback", () => {
  it("starts and stops a sustained horn with the manual control", () => {
    expect(
      selectHornPlaybackAction(
        { active: false, signalCount: 0, enabled: true },
        { active: true, signalCount: 1, enabled: true },
      ),
    ).toBe("start");

    expect(
      selectHornPlaybackAction(
        { active: true, signalCount: 1, enabled: true },
        { active: false, signalCount: 1, enabled: true },
      ),
    ).toBe("stop");
  });

  it("plays a fixed burst when an automatic horn signal is emitted", () => {
    expect(
      selectHornPlaybackAction(
        { active: false, signalCount: 2, enabled: true },
        { active: false, signalCount: 3, enabled: true },
      ),
    ).toBe("burst");
  });

  it("does nothing when the horn state has not changed", () => {
    expect(
      selectHornPlaybackAction(
        { active: false, signalCount: 3, enabled: true },
        { active: false, signalCount: 3, enabled: true },
      ),
    ).toBeNull();
  });

  it("stops playback when sound is disabled", () => {
    expect(
      selectHornPlaybackAction(
        { active: true, signalCount: 1, enabled: true },
        { active: true, signalCount: 1, enabled: false },
      ),
    ).toBe("stop");
  });

  it("stops a held horn before playing an automatic expiry burst", () => {
    expect(
      selectHornPlaybackAction(
        { active: true, signalCount: 1, enabled: true },
        { active: false, signalCount: 2, enabled: true },
      ),
    ).toBe("stop-and-burst");
  });

  it("creates and releases a six-oscillator arena horn voice", () => {
    const context = new FakeAudioContext();
    const horn = new ArenaHornController(context as unknown as AudioContext);

    horn.start();
    horn.start();
    expect(context.oscillators).toHaveLength(6);

    horn.stop();
    expect(
      context.oscillators.every(({ stop }) => stop.mock.calls.length === 1),
    ).toBe(true);
  });

  it("cleans up replaced burst timers and audio resources", () => {
    vi.useFakeTimers();
    const context = new FakeAudioContext();
    const horn = new ArenaHornController(context as unknown as AudioContext);

    horn.burst();
    expect(vi.getTimerCount()).toBe(1);

    horn.burst();
    expect(vi.getTimerCount()).toBe(1);

    horn.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(context.close).toHaveBeenCalledOnce();
  });

  it("fails closed when browser audio cannot be created", () => {
    class ThrowingAudioContext {
      constructor() {
        throw new Error("audio unavailable");
      }
    }

    expect(
      createArenaHornController(
        ThrowingAudioContext as unknown as typeof AudioContext,
      ),
    ).toBeNull();
    expect(createArenaHornController(undefined)).toBeNull();
  });
});
