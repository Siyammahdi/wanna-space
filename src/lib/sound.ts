import { readDevicePrefs } from "./settings";

let audio: AudioContext | undefined;

type Tone = { frequency: number; at: number; length: number; volume: number };

const bell = (notes: number[]): Tone[] =>
  notes.map((frequency, i) => ({ frequency, at: i * 0.22, length: 1.4, volume: 0.18 }));

/** Every sound the app makes: focus ending rises, a break ending falls back, done ticks. */
export const SOUNDS = {
  "focus-done": bell([659.25, 987.77]),
  "break-done": bell([783.99, 523.25]),
  complete: [
    { frequency: 880, at: 0, length: 0.18, volume: 0.07 },
    { frequency: 1318.5, at: 0.07, length: 0.32, volume: 0.06 },
  ],
} satisfies Record<string, Tone[]>;

/** Soft sine tones through one shared AudioContext; silent where audio isn't available. */
export function playTones(tones: Tone[]) {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    void ctx.resume();
    for (const tone of tones) {
      const at = ctx.currentTime + tone.at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = tone.frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(tone.volume, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + tone.length + 0.05);
    }
  } catch {
    // No audio on this device.
  }
}

/** A light two-note tick for completing a task, when the device asks for it. */
export function playCompletion() {
  if (readDevicePrefs().completionSound) playTones(SOUNDS.complete);
}
