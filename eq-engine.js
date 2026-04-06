/* ══════════════════════════════════════════════════════════
   ORPHEUS — eq-engine.js
   Web Audio API 10-band parametric equalizer + spatial audio.

   Include ONCE per page AFTER supabase.js:
     <script src="eq-engine.js"></script>

   Usage (from any page):
     OrpheusEQ.connect(audioElement)   ← call on user gesture
     OrpheusEQ.setGain(bandIndex, dB)  ← band 0-9, dB -20..+20
     OrpheusEQ.setEnabled(bool)        ← bypass toggle
     OrpheusEQ.setSpatialMode(name)    ← see SPATIAL below
     OrpheusEQ.setVolume(0..1)         ← master gain
   ══════════════════════════════════════════════════════════ */

window.OrpheusEQ = (() => {

  /* ── Band centre frequencies (Hz) matching the UI sliders ── */
  const BAND_FREQS = [30, 60, 120, 250, 500, 1000, 2000, 4000, 8000, 16000];

  /* ── Spatial mode → right-channel delay (seconds)
        Haas effect: delaying one side ≥ 8ms creates perceived width
        without comb-filtering. Values are conservative and safe. ── */
  const SPATIAL_DELAY = {
    'Standard':           0,
    'Wide Stereo (3D)':   0.008,
    'Spatialized (4D)':   0.016,
    'Infinite Field (10D)': 0.025,
    'Full Immersion (16D)': 0.035
  };

  /* ── Internal state ── */
  let ctx       = null;
  let source    = null;          // MediaElementSourceNode
  let filters   = [];            // BiquadFilterNode × 10
  let splitter  = null;
  let merger    = null;
  let delayL    = null;
  let delayR    = null;
  let masterGain= null;

  let eqEnabled    = false;
  let spatialMode  = 'Standard';

  /* ─────────────────────────────────────────────────────────
     INIT — build the audio graph (runs once on first connect)

     Signal path:
       <audio> → MediaElementSource
              → [10 × BiquadFilter (peaking)]
              → ChannelSplitter
                  L → DelayNode(0ms)   ─┐
                  R → DelayNode(Nms)   ─┼→ ChannelMerger → GainNode → destination
  ───────────────────────────────────────────────────────── */
  function init() {
    if (ctx) return;

    ctx = new (window.AudioContext || window.webkitAudioContext)();

    /* 10-band peaking EQ */
    filters = BAND_FREQS.map(freq => {
      const f = ctx.createBiquadFilter();
      f.type            = 'peaking';
      f.frequency.value = freq;
      f.Q.value         = 1.4;   /* ~2/3-octave bandwidth */
      f.gain.value      = 0;
      f._saved          = 0;     /* saved value for bypass toggle */
      return f;
    });

    /* Chain filters in series */
    filters.slice(0, -1).forEach((f, i) => f.connect(filters[i + 1]));

    /* Spatial: splitter → delay L/R → merger */
    splitter = ctx.createChannelSplitter(2);
    merger   = ctx.createChannelMerger(2);
    delayL   = ctx.createDelay(0.1);   /* left  channel delay */
    delayR   = ctx.createDelay(0.1);   /* right channel delay */
    delayL.delayTime.value = 0;
    delayR.delayTime.value = 0;

    masterGain             = ctx.createGain();
    masterGain.gain.value  = 1;

    /* Wire the tail of the chain */
    filters[filters.length - 1].connect(splitter);
    splitter.connect(delayL, 0, 0);   /* L → delay → L */
    splitter.connect(delayR, 1, 0);   /* R → delay → R */
    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);
    merger.connect(masterGain);
    masterGain.connect(ctx.destination);
  }

  /* ─────────────────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────────────────── */
  return {

    /* Connect an HTMLAudioElement to the EQ chain.
       IMPORTANT: call this inside a user-gesture handler (click/tap).
       The audio element must have crossOrigin="anonymous" if src is
       cross-origin (e.g. Spotify preview URLs). */
    connect(audioEl) {
      init();
      if (ctx.state === 'suspended') ctx.resume();

      /* createMediaElementSource can only be called once per element.
         Cache the node on the element itself. */
      if (!audioEl._eqSource) {
        audioEl._eqSource = ctx.createMediaElementSource(audioEl);
      }
      source = audioEl._eqSource;
      source.connect(filters[0]);
    },

    /* Set gain (dB) for one band. bandIndex 0–9. */
    setGain(bandIndex, dB) {
      const f = filters[bandIndex];
      if (!f) return;
      f._saved          = dB;
      f.gain.value      = eqEnabled ? dB : 0;
    },

    /* Enable or bypass the EQ (restores/mutes all band gains). */
    setEnabled(bool) {
      eqEnabled = bool;
      filters.forEach(f => {
        f.gain.value = bool ? (f._saved || 0) : 0;
      });
    },

    /* Spatial audio mode. See SPATIAL_DELAY map at top. */
    setSpatialMode(mode) {
      spatialMode = mode;
      if (!delayR) return;
      const ms = SPATIAL_DELAY[mode] ?? 0;
      /* Smooth transition using setTargetAtTime to avoid clicks */
      const t = ctx.currentTime;
      delayL.delayTime.setTargetAtTime(0,  t, 0.02);
      delayR.delayTime.setTargetAtTime(ms, t, 0.02);
    },

    /* Master output volume 0–1. */
    setVolume(v) {
      if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
    },

    /* Resume the AudioContext — call on any user gesture if needed. */
    resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },

    /* Read-only access to the underlying context (advanced use). */
    get context() { return ctx; },
    get isEnabled() { return eqEnabled; }
  };

})();
