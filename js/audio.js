// ── AUDIO ─────────────────────────────────────────────────────────────────────
let audioCtx = null;
let thrusterGain = null;
let thrusterOsc1 = null;
let thrusterOsc2 = null;
let thrusterNoise = null;
let audioReady = false;

// Extra audio nodes for richer engine sound
let thrusterLowFilt = null;
let thrusterMidFilt = null;
let thrusterLFO = null;
let thrusterLFOGain = null;
let thrusterNoise2 = null;

function initAudio() {
  if (audioReady) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // ── Master chain ──
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(audioCtx.destination);

  thrusterGain = audioCtx.createGain();
  thrusterGain.gain.value = 0;
  thrusterGain.connect(masterGain);

  // ── Layer 1: deep low-end rumble using heavy filtered white noise ──
  // This gives the "mass of a real engine" feeling
  const bufSize = audioCtx.sampleRate * 3;
  const noiseBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1;

  thrusterNoise = audioCtx.createBufferSource();
  thrusterNoise.buffer = noiseBuf;
  thrusterNoise.loop = true;
  // Heavy low-pass to create a thunderous sub-bass body
  thrusterLowFilt = audioCtx.createBiquadFilter();
  thrusterLowFilt.type = 'lowpass';
  thrusterLowFilt.frequency.value = 95;
  thrusterLowFilt.Q.value = 0.7;
  const noiseGain1 = audioCtx.createGain();
  noiseGain1.gain.value = 1.8;
  thrusterNoise.connect(thrusterLowFilt);
  thrusterLowFilt.connect(noiseGain1);
  noiseGain1.connect(thrusterGain);
  thrusterNoise.start();

  // ── Layer 2: mid exhaust hiss (bandpass noise for plasma/jet texture) ──
  const noiseBuf2 = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const nd2 = noiseBuf2.getChannelData(0);
  for (let i = 0; i < bufSize; i++) nd2[i] = Math.random() * 2 - 1;
  thrusterNoise2 = audioCtx.createBufferSource();
  thrusterNoise2.buffer = noiseBuf2;
  thrusterNoise2.loop = true;
  thrusterMidFilt = audioCtx.createBiquadFilter();
  thrusterMidFilt.type = 'bandpass';
  thrusterMidFilt.frequency.value = 320;
  thrusterMidFilt.Q.value = 1.4;
  const noiseGain2 = audioCtx.createGain();
  noiseGain2.gain.value = 0.45;
  thrusterNoise2.connect(thrusterMidFilt);
  thrusterMidFilt.connect(noiseGain2);
  noiseGain2.connect(thrusterGain);
  thrusterNoise2.start();

  // ── Layer 3: sine sub-oscillator for tonal engine note ──
  // Sine (not sawtooth) gives a smooth, real-feeling engine hum
  thrusterOsc1 = audioCtx.createOscillator();
  thrusterOsc1.type = 'sine';
  thrusterOsc1.frequency.value = 48;
  const oscGain1 = audioCtx.createGain();
  oscGain1.gain.value = 0.55;
  thrusterOsc1.connect(oscGain1);
  oscGain1.connect(thrusterGain);
  thrusterOsc1.start();

  // ── Layer 4: slightly detuned triangle for harmonic shimmer ──
  thrusterOsc2 = audioCtx.createOscillator();
  thrusterOsc2.type = 'triangle';
  thrusterOsc2.frequency.value = 97.3; // slightly off 2x for beating
  const oscGain2 = audioCtx.createGain();
  oscGain2.gain.value = 0.18;
  thrusterOsc2.connect(oscGain2);
  oscGain2.connect(thrusterGain);
  thrusterOsc2.start();

  // ── LFO: slow wobble on the low filter cutoff — gives organic "breathing" ──
  thrusterLFO = audioCtx.createOscillator();
  thrusterLFO.type = 'sine';
  thrusterLFO.frequency.value = 1.8; // ~2Hz pulsation
  thrusterLFOGain = audioCtx.createGain();
  thrusterLFOGain.gain.value = 0; // activated when thrusting
  thrusterLFO.connect(thrusterLFOGain);
  thrusterLFOGain.connect(thrusterLowFilt.frequency);
  thrusterLFO.start();

  audioReady = true;
}

function setThruster(level) {
  if (!audioReady) return;
  const now = audioCtx.currentTime;
  const smoothIn  = level > 0 ? 0.12 : 0.45; // slow fade-out for realism

  // Master volume
  thrusterGain.gain.cancelScheduledValues(now);
  thrusterGain.gain.setTargetAtTime(level * 0.85, now, smoothIn);

  // Pitch up the tonal layers with thrust intensity
  thrusterOsc1.frequency.setTargetAtTime(48  + level * 22, now, 0.15);
  thrusterOsc2.frequency.setTargetAtTime(97.3 + level * 44, now, 0.15);

  // Open up the exhaust hiss filter when thrusting harder
  thrusterMidFilt.frequency.setTargetAtTime(320 + level * 280, now, 0.2);

  // Engage LFO wobble (more organic feel under thrust)
  thrusterLFOGain.gain.setTargetAtTime(level * 18, now, 0.3);
}

function playLaser() {
  if (!audioReady) return;
  const now = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.22, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  g.connect(audioCtx.destination);

  // Main laser tone — descending frequency sweep
  const osc = audioCtx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);
  osc.connect(g);
  osc.start(now);
  osc.stop(now + 0.18);

  // Thin high-freq sizzle layer
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(2800, now);
  osc2.frequency.exponentialRampToValueAtTime(900, now + 0.12);
  const g2 = audioCtx.createGain();
  g2.gain.setValueAtTime(0.06, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 2000;
  filt.Q.value = 3;
  osc2.connect(filt); filt.connect(g2); g2.connect(audioCtx.destination);
  osc2.start(now); osc2.stop(now + 0.12);
}

// Init audio on first user interaction
document.addEventListener('touchstart', initAudio, { once: true });
document.addEventListener('mousedown',  initAudio, { once: true });
