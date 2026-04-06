/* =========================================================
   ORPHEUS — player.js  (v3 — Supabase Database edition)
   Loads songs from the "songs" table in Supabase.
   A single song row has: title, artist, album, genre,
   cover_url, audio_url, duration_sec, track_number.

   Include ONCE per page: <script src="player.js"></script>
   Works alongside sidebar.js (include sidebar.js first).
   ========================================================= */

(function () {

    /* ── Supabase config (centralised in supabase.js) ── */
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_KEY = window.SUPABASE_KEY;

    /* ── Song catalogue — loaded async from Supabase DB ── */
    let SONGS = [];
    let _songsLoaded = false;
    let _songsCallbacks = [];

    function fmtTime(sec) {
        if (!isFinite(sec) || sec < 0) return '0:00';
        const m = Math.floor(sec / 60), s = Math.round(sec % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    /* ── Fetch all songs from the "songs" DB table ── */
    async function loadSongsFromDB(filter) {
        try {
            let url = `${SUPABASE_URL}/rest/v1/songs?select=*&order=album.asc,track_number.asc,title.asc`;
            if (filter && filter.genre)  url += `&genre=eq.${encodeURIComponent(filter.genre)}`;
            if (filter && filter.album)  url += `&album=eq.${encodeURIComponent(filter.album)}`;
            if (filter && filter.artist) url += `&artist=eq.${encodeURIComponent(filter.artist)}`;

            const res = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Accept': 'application/json'
                }
            });

            if (!res.ok) throw new Error(`DB fetch failed: ${res.status}`);
            const rows = await res.json();

            SONGS = rows.map(r => ({
                id:        r.id,
                title:     r.title     || 'Untitled',
                artist:    r.artist    || 'Unknown Artist',
                album:     r.album     || 'Unknown Album',
                genre:     r.genre     || '',
                cover_url: r.cover_url || null,
                audio_url: r.audio_url || null,
                duration:  r.duration_sec ? fmtTime(r.duration_sec) : '0:00',
            }));
        } catch (err) {
            console.warn('Orpheus: DB song load error:', err);
            SONGS = [];
        }
        _songsLoaded = true;
        _songsCallbacks.forEach(cb => cb());
        _songsCallbacks = [];
    }

    function whenLoaded(cb) { if (_songsLoaded) cb(); else _songsCallbacks.push(cb); }

    /* ── State ── */
    function loadState() { try { return JSON.parse(sessionStorage.getItem('orpheus_player') || 'null'); } catch { return null; } }
    function saveState(s) {
        try { sessionStorage.setItem('orpheus_player', JSON.stringify(s)); } catch { }
        saveQueue();
    }
    function saveQueue() {
        try { sessionStorage.setItem('orpheus_queue', JSON.stringify(SONGS)); } catch { }
    }
    function loadQueue() {
        try { return JSON.parse(sessionStorage.getItem('orpheus_queue') || 'null'); } catch { return null; }
    }
    const DEFAULT_STATE = { idx: 0, playing: false, progress: 0, volume: 60, muted: false, shuffle: false, repeat: 0, shuffleQueue: [], shufflePos: 0 };
    let ST = Object.assign({}, DEFAULT_STATE, loadState());

    function song() { return SONGS[ST.idx] || { title: 'Loading…', artist: '', duration: '0:00', cover_url: null, audio_url: null }; }

    /* ── Record play to Supabase play_history (fire-and-forget) ── */
    let _lastRecordedKey = '';
    async function _recordPlay(s) {
        if (!s || !s.title || s.title === 'Loading…') return;
        // Deduplicate: don't record the same song twice in a row
        const key = (s.id || '') + '|' + s.title + '|' + s.artist;
        if (key === _lastRecordedKey) return;
        _lastRecordedKey = key;
        try {
            const sb = window.supabaseClient;
            if (!sb) return;
            const { data: { user } } = await sb.auth.getUser();
            if (!user) return;
            await sb.from('play_history').insert({
                user_id: user.id,
                song_id: s.id || null,
                title:   s.title  || 'Unknown',
                artist:  s.artist || 'Unknown',
            });
        } catch (e) {
            console.warn('Orpheus: play_history record error:', e);
        }
    }

    function buildShuffleQueue() {
        const rest = SONGS.map((_, i) => i).filter(i => i !== ST.idx);
        for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[rest[i], rest[j]] = [rest[j], rest[i]]; }
        ST.shuffleQueue = [ST.idx, ...rest]; ST.shufflePos = 0;
    }

    function getLiked() { try { return JSON.parse(localStorage.getItem('orpheus_liked_songs') || '[]'); } catch { return []; } }
    function saveLiked(arr) { localStorage.setItem('orpheus_liked_songs', JSON.stringify(arr)); }
    function isLiked(title) { return getLiked().some(s => s.title === title); }
    function toggleLike() {
        let arr = getLiked(); const s = song();
        const idx = arr.findIndex(x => x.title === s.title);
        if (idx >= 0) arr.splice(idx, 1); else arr.push({ title: s.title, artist: s.artist, duration: s.duration });
        saveLiked(arr);
        panel.querySelector('#gp-like').classList.toggle('liked', isLiked(s.title));
    }

    /* ── CSS ── */
    function injectCSS() {
        if (document.getElementById('orpheus-player-css')) return;
        const style = document.createElement('style');
        style.id = 'orpheus-player-css';
        style.textContent = `
:root{--player-w:280px}
#orpheus-player{position:fixed;top:var(--nav-height,64px);right:0;width:var(--player-w);height:calc(100vh - var(--nav-height,64px));background:var(--bg-sidebar,#25343F);border-left:1px solid rgba(191,201,209,.09);display:flex;flex-direction:column;gap:0;z-index:88;transform:translateX(100%);transition:transform .35s cubic-bezier(.22,1,.36,1);overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(191,201,209,.2) transparent}
#orpheus-player.open{transform:translateX(0)}
body.player-open .content{transition:padding-right .35s cubic-bezier(.22,1,.36,1);padding-right:calc(var(--player-w) + 12px)}
body.player-open .page-body>.content{padding-right:calc(var(--player-w) + 12px)}
#gp-toggle-tab{position:fixed;top:50%;right:0;transform:translateY(-50%);width:28px;height:64px;background:var(--bg-sidebar,#25343F);border:1px solid rgba(191,201,209,.15);border-right:none;border-radius:12px 0 0 12px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:89;transition:right .35s cubic-bezier(.22,1,.36,1),background .2s;writing-mode:vertical-rl}
#gp-toggle-tab:hover{background:rgba(255,155,81,.15)}
body.player-open #gp-toggle-tab{right:var(--player-w)}
#gp-toggle-tab svg{width:14px;height:14px;stroke:rgba(191,201,209,.6);transition:stroke .2s}
#gp-toggle-tab:hover svg{stroke:var(--gold,#FF9B51)}
#gp-art-wrap{position:relative;width:100%;height:240px;background:linear-gradient(135deg,#2e4455,#1a2e3a);flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
#gp-art-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s ease;z-index:0}
#gp-art-img.loaded{opacity:1}
#gp-art-placeholder{font-size:64px;opacity:.35;user-select:none;transition:opacity .3s;position:relative;z-index:1}
#gp-art-img.loaded~#gp-art-placeholder{opacity:0}
.gp-art-link{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:flex-end;padding:10px;text-decoration:none;z-index:2}
.gp-art-badge{background:rgba(37,52,63,.7);border:1px solid rgba(255,155,81,.25);border-radius:8px;padding:4px 9px;font-family:var(--font-sans,'Space Grotesk',sans-serif);font-size:.65rem;font-weight:700;color:var(--gold,#FF9B51);letter-spacing:.08em;backdrop-filter:blur(6px);cursor:pointer;transition:background .2s}
.gp-art-badge:hover{background:rgba(255,155,81,.2)}
.gp-info{padding:16px 18px 12px;display:flex;flex-direction:column;gap:4px;border-bottom:1px solid rgba(191,201,209,.08);flex-shrink:0}
#gp-title{font-family:var(--font-sans,'Space Grotesk',sans-serif);font-size:.95rem;font-weight:700;color:var(--text-white,#fff);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#gp-artist{font-size:.75rem;color:rgba(191,201,209,.55)}
#gp-artist a.artist-link{color:inherit;text-decoration:none;transition:color .2s}
#gp-artist a.artist-link:hover{color:var(--gold,#FF9B51);text-decoration:underline}
.gp-like-row{display:flex;justify-content:flex-end;padding:4px 0}
#gp-like{background:none;border:none;cursor:pointer;color:rgba(191,201,209,.45);display:flex;align-items:center;padding:4px;border-radius:6px;transition:color .2s}
#gp-like:hover{color:var(--gold,#FF9B51)}
#gp-like.liked{color:#e63946}
#gp-like.liked svg{fill:#e63946}
.gp-progress-section{padding:8px 18px 6px;flex-shrink:0}
.gp-time-row{display:flex;justify-content:space-between;margin-bottom:6px}
.gp-time-lbl{font-family:var(--font-sans,'Space Grotesk',sans-serif);font-size:.68rem;color:rgba(191,201,209,.45)}
.gp-track{height:4px;background:rgba(191,201,209,.15);border-radius:2px;position:relative;cursor:pointer}
.gp-fill{height:100%;background:var(--gold,#FF9B51);border-radius:2px;transition:width .05s linear}
.gp-thumb{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid var(--gold,#FF9B51);transform:translate(-50%,-50%);transition:left .05s linear;box-shadow:0 0 6px rgba(255,155,81,.4)}
.gp-controls{display:flex;align-items:center;justify-content:center;gap:4px;padding:10px 18px 8px;flex-shrink:0}
.gp-btn{background:none;border:none;cursor:pointer;color:rgba(191,201,209,.55);border-radius:8px;padding:7px;display:flex;align-items:center;justify-content:center;transition:color .2s,background .2s}
.gp-btn:hover{color:#fff;background:rgba(234,239,239,.07)}
.gp-btn.active{color:var(--gold,#FF9B51)}
.gp-play-btn{width:46px;height:46px;border-radius:50%;background:var(--gold,#FF9B51);color:#fff;box-shadow:0 4px 14px rgba(255,155,81,.4)}
.gp-play-btn:hover{background:var(--gold-dark,#e8832e);transform:scale(1.06)}
.gp-volume-row{display:flex;align-items:center;gap:8px;padding:0 18px 14px;flex-shrink:0}
.gp-vol-track{flex:1;height:3px;background:rgba(191,201,209,.15);border-radius:2px;cursor:pointer;position:relative}
.gp-vol-fill{height:100%;background:rgba(191,201,209,.4);border-radius:2px}
.gp-vol-pct{font-size:.68rem;color:rgba(191,201,209,.4);min-width:28px;text-align:right;font-family:var(--font-sans,'Space Grotesk',sans-serif)}
.gp-queue-section{flex:1;display:flex;flex-direction:column;min-height:0;border-top:1px solid rgba(191,201,209,.08);padding:12px 0 0}
.gp-queue-label{font-family:var(--font-heading,'Orbitron',sans-serif);font-size:.65rem;font-weight:700;letter-spacing:2px;color:rgba(191,201,209,.3);text-transform:uppercase;padding:0 18px 8px}
.gp-queue-list{flex:1;overflow-y:auto;padding:0 10px 12px;scrollbar-width:thin}
#gp-repeat{position:relative}
#gp-repeat .gp-repeat-one{display:none;position:absolute;top:1px;right:1px;width:10px;height:10px;border-radius:50%;background:var(--gold,#FF9B51);font-size:.48rem;font-weight:900;color:#1a2e3a;line-height:10px;text-align:center}
#gp-repeat.repeat-one .gp-repeat-one{display:block}
#gp-shuffle{position:relative}
#gp-shuffle::after{content:'';position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--gold,#FF9B51);opacity:0;transition:opacity .2s}
#gp-shuffle.active::after{opacity:1}
.gp-q-item{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:8px;cursor:pointer;transition:background .18s}
.gp-q-item:hover{background:rgba(234,239,239,.06)}
.gp-q-item.now{background:rgba(255,155,81,.1)}
.gp-q-item.past{opacity:.4}
.gp-q-num{font-size:.68rem;color:rgba(191,201,209,.35);width:16px;text-align:center;flex-shrink:0;font-family:var(--font-heading,'Orbitron',sans-serif)}
.gp-q-item.now .gp-q-num{color:var(--gold,#FF9B51)}
.gp-q-disc{width:26px;height:26px;border-radius:6px;background:rgba(191,201,209,.1);flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:10px}
.gp-q-disc img{width:100%;height:100%;object-fit:cover}
.gp-q-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.gp-q-title{font-size:.75rem;font-weight:600;color:rgba(191,201,209,.75);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-sans,'Space Grotesk',sans-serif)}
.gp-q-item.now .gp-q-title{color:var(--gold,#FF9B51)}
.gp-q-artist{font-size:.65rem;color:rgba(191,201,209,.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gp-q-artist a.artist-link{color:inherit;text-decoration:none;transition:color .2s}
.gp-q-artist a.artist-link:hover{color:var(--gold,#FF9B51);text-decoration:underline}
.gp-q-dur{font-size:.63rem;color:rgba(191,201,209,.3);flex-shrink:0;font-family:var(--font-sans,'Space Grotesk',sans-serif)}
@keyframes gp-pulse{0%,100%{opacity:.4}50%{opacity:1}}
.gp-loading{display:flex;align-items:center;justify-content:center;padding:20px;gap:6px}
.gp-loading-dot{width:6px;height:6px;border-radius:50%;background:var(--gold,#FF9B51);animation:gp-pulse 1.2s ease-in-out infinite}
.gp-loading-dot:nth-child(2){animation-delay:.2s}
.gp-loading-dot:nth-child(3){animation-delay:.4s}
`;
        document.head.appendChild(style);
    }

    /* ── Panel HTML ── */
    let panel, toggleTab;
    function buildPanel() {
        document.getElementById('orpheus-player')?.remove();
        document.getElementById('gp-toggle-tab')?.remove();

        toggleTab = document.createElement('button');
        toggleTab.id = 'gp-toggle-tab'; toggleTab.title = 'Toggle Now Playing';
        toggleTab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
        toggleTab.addEventListener('click', togglePanel);
        document.body.appendChild(toggleTab);

        panel = document.createElement('div');
        panel.id = 'orpheus-player';
        panel.innerHTML = `
<div id="gp-art-wrap">
  <img id="gp-art-img" src="" alt="Album art">
  <span id="gp-art-placeholder">♫</span>
  <a href="playing.html" class="gp-art-link"><span class="gp-art-badge">▶ FULL VIEW</span></a>
</div>
<div class="gp-info">
  <span id="gp-title">Loading songs…</span>
  <span id="gp-artist"></span>
  <div class="gp-like-row">
    <button id="gp-like" aria-label="Like">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  </div>
</div>
<div class="gp-progress-section">
  <div class="gp-time-row">
    <span class="gp-time-lbl" id="gp-elapsed">0:00</span>
    <span class="gp-time-lbl" id="gp-total">0:00</span>
  </div>
  <div class="gp-track" id="gp-track">
    <div class="gp-fill" id="gp-fill" style="width:0%"></div>
    <div class="gp-thumb" id="gp-thumb" style="left:0%"></div>
  </div>
</div>
<div class="gp-controls">
  <button class="gp-btn" id="gp-shuffle" title="Shuffle">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
      <line x1="4" y1="4" x2="9" y2="9"/>
    </svg>
  </button>
  <button class="gp-btn" id="gp-prev" title="Previous">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
    </svg>
  </button>
  <button class="gp-btn gp-play-btn" id="gp-play" title="Play/Pause">
    <svg id="gp-play-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  </button>
  <button class="gp-btn" id="gp-next" title="Next">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
  </button>
  <button class="gp-btn" id="gp-repeat" title="Repeat: Off">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
    <span class="gp-repeat-one">1</span>
  </button>
</div>
<div class="gp-volume-row">
  <button class="gp-btn" id="gp-mute" style="padding:4px;">
    <svg id="gp-vol-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  </button>
  <div class="gp-vol-track" id="gp-vol-track">
    <div class="gp-vol-fill" id="gp-vol-fill" style="width:60%"></div>
  </div>
  <span class="gp-vol-pct" id="gp-vol-pct">60%</span>
</div>
<div class="gp-queue-section">
  <div class="gp-queue-label">Queue</div>
  <div class="gp-queue-list" id="gp-queue-list">
    <div class="gp-loading"><div class="gp-loading-dot"></div><div class="gp-loading-dot"></div><div class="gp-loading-dot"></div></div>
  </div>
</div>`;
        document.body.appendChild(panel);
    }

    /* ── Panel toggle ── */
    let isOpen = false;
    function togglePanel() {
        isOpen = !isOpen;
        panel.classList.toggle('open', isOpen);
        document.body.classList.toggle('player-open', isOpen);
        const arrow = toggleTab.querySelector('polyline');
        if (arrow) arrow.setAttribute('points', isOpen ? '9 18 15 12 9 6' : '15 18 9 12 15 6');
    }

    /* ── Audio element ── */
    const _audio = document.createElement('audio');
    _audio.id = 'orpheus-audio'; _audio.crossOrigin = 'anonymous'; _audio.preload = 'auto'; _audio.style.display = 'none';
    document.body.appendChild(_audio);
    window.dispatchEvent(new CustomEvent('orpheus:audioReady', { detail: { audioEl: _audio } }));
    if (window.OrpheusEQ && !_audio._eqConnected) { OrpheusEQ.connect(_audio); _audio._eqConnected = true; }
    window.OrpheusAudio = _audio;

    /* ── Public API ── */
    window.OrpheusPlayer = {
        play(idx) {
            if (!SONGS.length) { whenLoaded(() => this.play(idx)); return; }
            ST.idx = ((idx % SONGS.length) + SONGS.length) % SONGS.length;
            ST.playing = true; ST.progress = 0;
            if (ST.shuffle) buildShuffleQueue();
            saveState(ST); loadSong();
            if (!isOpen) togglePanel();
        },
        playRandom() {
            if (!SONGS.length) { whenLoaded(() => this.playRandom()); return; }
            this.play(Math.floor(Math.random() * SONGS.length));
        },
        getSongs(cb) { whenLoaded(() => cb(SONGS)); },

        /* Load songs filtered by genre, album, or artist from the DB */
        async loadFiltered(filter) {
            _songsLoaded = false;
            _songsCallbacks = [];
            await loadSongsFromDB(filter);
            window.dispatchEvent(new CustomEvent('orpheus:songsLoaded', { detail: { songs: SONGS } }));
        },

        /* Override the song catalogue externally (e.g. pre-fetched list) */
        setSongs(songs) {
            if (!songs || !songs.length) return;
            SONGS = songs;
            _songsLoaded = true;
            _songsCallbacks.forEach(cb => cb());
            _songsCallbacks = [];
            ST.idx = 0; ST.progress = 0; ST.playing = false;
            if (ST.shuffle) buildShuffleQueue();
            saveState(ST);
            if (els.title) { loadSong(); renderQueue(); }
            window.dispatchEvent(new CustomEvent('orpheus:songsLoaded', { detail: { songs: SONGS } }));
        },

        pause() { ST.playing = false; _audio.pause(); renderPlayIcon(); saveState(ST); },
        toggle() { togglePanel(); },
    };

    /* ── DOM refs ── */
    let els = {};
    function grabEls() {
        els = {
            title: panel.querySelector('#gp-title'), artist: panel.querySelector('#gp-artist'),
            like: panel.querySelector('#gp-like'), fill: panel.querySelector('#gp-fill'),
            thumb: panel.querySelector('#gp-thumb'), elapsed: panel.querySelector('#gp-elapsed'),
            total: panel.querySelector('#gp-total'), track: panel.querySelector('#gp-track'),
            playIcon: panel.querySelector('#gp-play-icon'), shuffle: panel.querySelector('#gp-shuffle'),
            prev: panel.querySelector('#gp-prev'), play: panel.querySelector('#gp-play'),
            next: panel.querySelector('#gp-next'), repeat: panel.querySelector('#gp-repeat'),
            mute: panel.querySelector('#gp-mute'), volIcon: panel.querySelector('#gp-vol-icon'),
            volTrack: panel.querySelector('#gp-vol-track'), volFill: panel.querySelector('#gp-vol-fill'),
            volPct: panel.querySelector('#gp-vol-pct'), queue: panel.querySelector('#gp-queue-list'),
            artImg: panel.querySelector('#gp-art-img'),
        };
    }

    /* ── Render helpers ── */
    function updateVolIcon() {
        const vol = ST.muted ? 0 : ST.volume;
        if (vol === 0) els.volIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;
        else if (vol < 40) els.volIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
        else els.volIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
    }

    function renderRepeatBtn() {
        const labels = ['Repeat: Off', 'Repeat: All', 'Repeat: One'];
        els.repeat.title = labels[ST.repeat];
        els.repeat.classList.toggle('active', ST.repeat > 0);
        els.repeat.classList.toggle('repeat-one', ST.repeat === 2);
    }

    function renderPlayIcon() {
        els.playIcon.innerHTML = ST.playing
            ? `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`
            : `<polygon points="5 3 19 12 5 21 5 3"/>`;
        panel.classList.toggle('playing', ST.playing);
    }

    function renderQueue() {
        if (!SONGS.length) {
            els.queue.innerHTML = `<div class="gp-loading"><div class="gp-loading-dot"></div><div class="gp-loading-dot"></div><div class="gp-loading-dot"></div></div>`;
            return;
        }
        const displayList = ST.shuffle && ST.shuffleQueue.length === SONGS.length
            ? ST.shuffleQueue.map((si, pos) => ({ song: SONGS[si], songIdx: si, pos }))
            : SONGS.map((s, i) => ({ song: s, songIdx: i, pos: i }));

        els.queue.innerHTML = (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize : (x => x))(displayList.map(({ song: s, songIdx, pos }) => {
            const isCurrent = songIdx === ST.idx;
            const isPast = ST.shuffle && pos < ST.shufflePos;
            const thumb = s.cover_url ? `<img src="${s.cover_url}" alt="" loading="lazy" onerror="this.style.display='none'">` : '♪';
            return `<div class="gp-q-item${isCurrent ? ' now' : ''}${isPast ? ' past' : ''}" data-song-idx="${songIdx}" data-shuffle-pos="${pos}">
                <span class="gp-q-num">${isCurrent ? '▶' : pos + 1}</span>
                <div class="gp-q-disc">${thumb}</div>
                <div class="gp-q-info"><span class="gp-q-title">${s.title}</span><span class="gp-q-artist"><a class="artist-link" href="playing.html?artist=${encodeURIComponent(s.artist)}" title="View ${s.artist}">${s.artist}</a></span></div>
                <span class="gp-q-dur">${s.duration}</span>
            </div>`;
        }).join(''), {ADD_ATTR: ['onerror', 'style', 'loading']});

        els.queue.querySelectorAll('.gp-q-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.artist-link')) return;
                ST.idx = parseInt(item.dataset.songIdx);
                if (ST.shuffle) ST.shufflePos = parseInt(item.dataset.shufflePos);
                ST.playing = true; ST.progress = 0; saveState(ST); loadSong();
            });
        });
        const nowEl = els.queue.querySelector('.gp-q-item.now');
        if (nowEl) nowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function loadSong() {
        const s = song();
        els.title.textContent = s.title;
        els.artist.innerHTML = `<a class="artist-link" href="playing.html?artist=${encodeURIComponent(s.artist)}" title="View ${s.artist}">${s.artist}</a>`;
        els.like.classList.toggle('liked', isLiked(s.title));
        renderPlayIcon();
        renderQueue();

        if (s.cover_url) {
            els.artImg.src = s.cover_url;
            els.artImg.onload = () => els.artImg.classList.add('loaded');
            els.artImg.onerror = () => els.artImg.classList.remove('loaded');
        } else {
            els.artImg.src = ''; els.artImg.classList.remove('loaded');
        }

        if (s.audio_url) {
            const isSameSong = _audio.src === s.audio_url ||
                decodeURIComponent(_audio.src) === decodeURIComponent(s.audio_url);

            if (!isSameSong) {
                _audio.src = s.audio_url;
                _audio.volume = ST.muted ? 0 : ST.volume / 100;
                _audio.onloadedmetadata = () => {
                    s.duration = fmtTime(_audio.duration);
                    els.total.textContent = s.duration;
                    renderQueue();
                    saveState(ST);
                    if (ST.progress > 0 && ST.progress < 100) {
                        _audio.currentTime = (_audio.duration * ST.progress) / 100;
                    }
                };
            } else {
                _audio.volume = ST.muted ? 0 : ST.volume / 100;
                if (_audio.duration && isFinite(_audio.duration)) {
                    els.total.textContent = fmtTime(_audio.duration);
                    els.elapsed.textContent = fmtTime(_audio.currentTime);
                    const pct = (_audio.currentTime / _audio.duration) * 100;
                    els.fill.style.width = pct + '%';
                    els.thumb.style.left = pct + '%';
                } else {
                    _audio.onloadedmetadata = () => {
                        s.duration = fmtTime(_audio.duration);
                        els.total.textContent = s.duration;
                        renderQueue();
                    };
                }
            }

            _audio.ontimeupdate = () => {
                if (!_audio.duration || !isFinite(_audio.duration)) return;
                const pct = (_audio.currentTime / _audio.duration) * 100;
                ST.progress = pct;
                els.fill.style.width = pct + '%';
                els.thumb.style.left = pct + '%';
                els.elapsed.textContent = fmtTime(_audio.currentTime);
                els.total.textContent = fmtTime(_audio.duration);
            };

            _audio.onended = () => handleSongEnd();

            if (ST.playing) {
                if (window.OrpheusEQ && !_audio._eqConnected) { OrpheusEQ.connect(_audio); _audio._eqConnected = true; }
                if (_audio.paused) {
                    _audio.play().catch(err => console.warn('Audio play blocked:', err));
                }
            }
        } else {
            _audio.src = ''; _audio.ontimeupdate = null; _audio.onloadedmetadata = null; _audio.onended = null;
            els.total.textContent = '0:00';
        }

        saveState(ST);
        window.dispatchEvent(new CustomEvent('orpheus-song-change', { detail: s }));

        // Record play to play_history (only for new songs that are actually playing)
        if (ST.playing && s.audio_url) _recordPlay(s);
    }

    function handleSongEnd() {
        if (ST.repeat === 2) { _audio.currentTime = 0; _audio.play().catch(() => { }); }
        else goNext();
    }

    function goNext() {
        if (!SONGS.length) return;
        if (ST.shuffle) {
            const len = ST.shuffleQueue.length;
            ST.shufflePos = ST.repeat === 1 ? (ST.shufflePos + 1) % len : Math.min(ST.shufflePos + 1, len - 1);
            ST.idx = ST.shuffleQueue[ST.shufflePos];
        } else {
            ST.idx = (ST.idx + 1) % SONGS.length;
        }
        ST.progress = 0; saveState(ST); loadSong();
    }

    function goPrev() {
        if (!SONGS.length) return;
        if (_audio.currentTime > 3) { _audio.currentTime = 0; ST.progress = 0; saveState(ST); return; }
        if (ST.shuffle) { ST.shufflePos = Math.max(ST.shufflePos - 1, 0); ST.idx = ST.shuffleQueue[ST.shufflePos]; }
        else { ST.idx = ((ST.idx - 1) + SONGS.length) % SONGS.length; }
        ST.progress = 0; saveState(ST); loadSong();
    }

    /* ── Wire controls ── */
    function wireControls() {
        els.play.addEventListener('click', () => {
            ST.playing = !ST.playing;
            if (ST.playing) { _audio.volume = ST.muted ? 0 : ST.volume / 100; _audio.play().catch(err => console.warn(err)); }
            else _audio.pause();
            renderPlayIcon(); saveState(ST);
        });
        els.prev.addEventListener('click', goPrev);
        els.next.addEventListener('click', goNext);
        els.shuffle.addEventListener('click', () => {
            ST.shuffle = !ST.shuffle;
            if (ST.shuffle) buildShuffleQueue(); else { ST.shuffleQueue = []; ST.shufflePos = 0; }
            els.shuffle.classList.toggle('active', ST.shuffle);
            els.shuffle.title = ST.shuffle ? 'Shuffle: On' : 'Shuffle: Off';
            saveState(ST); renderQueue();
        });
        els.repeat.addEventListener('click', () => { ST.repeat = (ST.repeat + 1) % 3; renderRepeatBtn(); saveState(ST); });
        els.like.addEventListener('click', toggleLike);

        function scrubProgress(e) {
            const rect = els.track.getBoundingClientRect();
            const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            ST.progress = pct;
            els.fill.style.width = pct + '%'; els.thumb.style.left = pct + '%';
            if (_audio.src && _audio.duration && isFinite(_audio.duration)) {
                _audio.currentTime = (_audio.duration * pct) / 100;
                els.elapsed.textContent = fmtTime(_audio.currentTime);
            }
            saveState(ST);
        }
        els.track.addEventListener('mousedown', e => {
            scrubProgress(e);
            const mv = ev => scrubProgress(ev);
            const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        });

        function scrubVol(e) {
            const rect = els.volTrack.getBoundingClientRect();
            ST.volume = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
            ST.muted = false; _audio.volume = ST.volume / 100;
            els.volFill.style.width = ST.volume + '%'; els.volPct.textContent = ST.volume + '%';
            updateVolIcon(); saveState(ST);
        }
        els.volTrack.addEventListener('mousedown', e => {
            scrubVol(e);
            const mv = ev => scrubVol(ev);
            const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        });
        els.mute.addEventListener('click', () => {
            ST.muted = !ST.muted; _audio.volume = ST.muted ? 0 : ST.volume / 100;
            els.volFill.style.width = ST.muted ? '0%' : ST.volume + '%';
            els.volPct.textContent = ST.muted ? '0%' : ST.volume + '%';
            updateVolIcon(); saveState(ST);
        });
    }

    /* ── Init ── */
    function init() {
        injectCSS(); buildPanel(); grabEls(); wireControls();
        els.volFill.style.width = (ST.muted ? 0 : ST.volume) + '%';
        els.volPct.textContent = (ST.muted ? 0 : ST.volume) + '%';
        updateVolIcon();
        els.shuffle.classList.toggle('active', ST.shuffle);
        els.shuffle.title = ST.shuffle ? 'Shuffle: On' : 'Shuffle: Off';
        renderRepeatBtn();

        /* ── Restore saved queue from sessionStorage for seamless page navigation ── */
        const savedQueue = loadQueue();
        const hadSavedQueue = savedQueue && savedQueue.length > 0;

        if (hadSavedQueue) {
            /* Restore the queue and resume playback immediately */
            SONGS = savedQueue;
            _songsLoaded = true;
            if (ST.idx >= SONGS.length) ST.idx = 0;
            if (ST.shuffle && ST.shuffleQueue.length !== SONGS.length) buildShuffleQueue();
            loadSong();
            if (ST.playing) togglePanel();
        }

        /* Fetch the full catalogue from DB in the background */
        loadSongsFromDB().then(() => {
            if (hadSavedQueue) {
                /* Queue was restored — don't overwrite it.
                   Just fire the event so other page scripts can use the catalogue. */
                window.dispatchEvent(new CustomEvent('orpheus:songsLoaded', { detail: { songs: SONGS } }));
                return;
            }
            /* No saved queue — this is a fresh session */
            if (!SONGS.length) {
                els.title.textContent = 'No songs found';
                els.artist.textContent = 'Add songs to the songs table in Supabase';
                return;
            }
            if (ST.idx >= SONGS.length) ST.idx = 0;
            if (ST.shuffle && ST.shuffleQueue.length !== SONGS.length) buildShuffleQueue();
            loadSong();
            if (ST.playing) togglePanel();
            window.dispatchEvent(new CustomEvent('orpheus:songsLoaded', { detail: { songs: SONGS } }));
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
