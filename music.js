/* A little record player in the header.
   Click the disc to play a soft, slowly changing ambient piece, generated live
   with the Web Audio API (no audio files, no licences). Click again to fade it out. */
(() => {
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // Cmaj7 → Am7 → Fmaj7 → G6, eight seconds each
  const CHORDS = [
    [48, 52, 55, 59],
    [45, 48, 52, 55],
    [41, 45, 48, 52],
    [43, 47, 50, 52],
  ];
  const MELODY = [72, 74, 76, 79, 81, 84]; // C major pentatonic, gentle and never clashing
  const BAR = 8;

  let ctx = null, master = null, verb = null, dry = null;
  let timer = null, nextBar = 0, barIndex = 0, playing = false;

  const makeImpulse = (seconds) => {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  };

  const setup = () => {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);

    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(3.6);
    verb = ctx.createGain(); verb.gain.value = 0.55;
    dry = ctx.createGain(); dry.gain.value = 0.7;
    verb.connect(conv).connect(master);
    dry.connect(master);
  };

  const voice = (freq, t, dur, { type = 'sine', gain = 0.05, attack = 2, release = 2.5, cutoff = 1400, detune = 0 } = {}) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(lp).connect(g);
    g.connect(dry); g.connect(verb);
    osc.start(t); osc.stop(t + dur + 0.1);
  };

  const pluck = (freq, t) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 3.2);
    osc.connect(g);
    g.connect(dry); g.connect(verb);
    osc.start(t); osc.stop(t + 3.3);
  };

  const scheduleBar = (t) => {
    const chord = CHORDS[barIndex % CHORDS.length];
    // soft pad: two slightly detuned voices per note
    chord.forEach((n) => {
      voice(midi(n), t, BAR + 1.5, { type: 'sine', gain: 0.035, detune: -4 });
      voice(midi(n), t, BAR + 1.5, { type: 'triangle', gain: 0.018, detune: 5, cutoff: 900 });
    });
    // warm bass on the root
    voice(midi(chord[0] - 12), t, BAR + 1, { type: 'sine', gain: 0.05, attack: 1.2, cutoff: 400 });
    // a few unhurried notes on top
    for (let beat = 0; beat < BAR; beat++) {
      if (Math.random() < 0.42) {
        const note = MELODY[Math.floor(Math.random() * MELODY.length)];
        pluck(midi(note), t + beat + (Math.random() < 0.3 ? 0.5 : 0));
      }
    }
    barIndex++;
  };

  const scheduler = () => {
    while (nextBar < ctx.currentTime + 1.5) {
      scheduleBar(nextBar);
      nextBar += BAR;
    }
  };

  const start = async () => {
    if (!ctx) setup();
    await ctx.resume();
    if (!timer) {
      nextBar = Math.max(nextBar, ctx.currentTime + 0.05);
      scheduler();
      timer = setInterval(scheduler, 400);
    }
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2.5);
    playing = true;
  };

  const stop = () => {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    clearInterval(timer); timer = null;
    setTimeout(() => { if (!playing) ctx.suspend(); }, 1400);
    playing = false;
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.music-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const on = !playing;
        if (on) start(); else stop();
        document.querySelectorAll('.music-toggle').forEach((b) => {
          b.classList.toggle('is-playing', on);
          b.setAttribute('aria-pressed', String(on));
          b.setAttribute('aria-label', on ? 'Pause the music' : 'Play some soothing music');
          b.title = on ? 'Pause the music' : 'Play some soothing music';
        });
      });
    });
  });
})();
