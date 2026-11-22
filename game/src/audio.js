// Synthesised sound: every effect is a small WebAudio oscillator or noise
// burst, generated at run time — no audio files, no network. Created lazily
// on the first user gesture so browsers allow it.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      const len = Math.floor(ctx.sampleRate * 0.25);
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + (when || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, when, lowpass) {
    if (muted) return;
    const ac = ensure();
    if (!ac || !noiseBuffer) return;
    const t0 = ac.currentTime + (when || 0);
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(vol || 0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    click() {
      tone(660, 0.06, 'triangle', 0.08);
    },
    play() {
      noise(0.16, 0.12, 0, 2400);
      tone(520, 0.1, 'triangle', 0.08, 0, 780);
    },
    hit() {
      noise(0.22, 0.2, 0, 700);
      tone(140, 0.22, 'sawtooth', 0.14, 0, 60);
    },
    guard() {
      tone(300, 0.14, 'square', 0.06, 0, 420);
    },
    heal() {
      tone(523, 0.12, 'sine', 0.1);
      tone(784, 0.18, 'sine', 0.1, 0.09);
    },
    draw() {
      noise(0.08, 0.07, 0, 3200);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, i * 0.13));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.15));
    },
  };
}
