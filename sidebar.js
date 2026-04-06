/* =========================================================
   ORPHEUS — sidebar.js
   Injects the TOPBAR + SIDEBAR into every page.
   Wires up night-mode, active state, and avatar navigation.
   Include ONCE per page before </body>.
   ========================================================= */

(function () {

    /* ── 1. Apply saved theme before first paint ── */
    const savedTheme = localStorage.getItem('orpheus_theme') || 'light';
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');


    /* ══════════════════════════════════════════
       2. INJECT TOPBAR
       Replaces / creates <nav id="topNav"> so the
       topbar HTML is identical on every page.
    ══════════════════════════════════════════ */
    function injectTopbar() {
        const savedName = localStorage.getItem('orpheus_display_name') || 'Guest';
        const initial = savedName.charAt(0).toUpperCase();
        const savedAvatar = localStorage.getItem('orpheus_avatar') || '';

        /* Avatar: real photo (data-URL / http URL) → <img>, emoji → <span>, fallback → initial */
        function _isImgUrl(s) {
            return s && (s.startsWith('data:') || s.startsWith('http') || /\.(png|jpe?g|gif|webp|svg)$/i.test(s));
        }

        const avatarInner = _isImgUrl(savedAvatar)
            ? `<img src="${savedAvatar}" alt="avatar" id="topbarAvatarImg"
                   style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
            : savedAvatar
                ? `<span class="avatar-fallback" id="avatarFallback" style="font-size:1.3rem;line-height:1;">${savedAvatar}</span>`
                : `<span class="avatar-fallback" id="avatarFallback">${initial}</span>`;

        const html = `
            <a href="home.html" class="nav-left" style="text-decoration:none;">
                <img src="https://zsnefaffxvktxbibmqaf.supabase.co/storage/v1/object/public/Covers/sidebar_icons/no%20bg%20orpheus.svg" alt="Orpheus" class="nav-logo">
                <span class="nav-brand">ORPHEUS</span>
            </a>
            <div class="nav-center">
                <div class="search-bar">
                    <span class="search-icon">&#128269;</span>
                    <input class="search-input" type="search" placeholder="Search artists, songs, playlists\u2026" autocomplete="new-password" autocorrect="off" autocapitalize="off" spellcheck="false" readonly onfocus="this.removeAttribute('readonly')">
                </div>
            </div>
            <div class="nav-right">
                <span class="user-name" id="userName">${savedName}</span>
                <div class="avatar-wrapper" id="avatarWrapper">
                    <div class="user-avatar" id="userAvatar">
                        ${avatarInner}
                    </div>
                </div>
            </div>
        `;

        let nav = document.getElementById('topNav');
        if (!nav) {
            nav = document.createElement('nav');
            nav.id = 'topNav';
            document.body.insertBefore(nav, document.body.firstChild);
        }
        /* Both class names so home_theme.css (.topbar) and style.css (.top-nav) both match */
        nav.className = 'topbar top-nav';
        nav.innerHTML = html;
    }


    /* ══════════════════════════════════════════
       3. INJECT SIDEBAR
    ══════════════════════════════════════════ */
    function injectSidebar() {
        let aside = document.getElementById('sidebar');
        if (!aside) {
            aside = document.createElement('aside');
            aside.className = 'sidebar';
            aside.id = 'sidebar';
            const layout = document.querySelector('.main-layout');
            if (layout) layout.prepend(aside);
            else document.body.appendChild(aside);
        }

        aside.innerHTML = `
            <span class="sidebar-section-lbl">Navigation</span>

            <a href="home.html" class="sidebar-item" data-page="home.html">
                <img src="https://zsnefaffxvktxbibmqaf.supabase.co/storage/v1/object/public/Covers/sidebar_icons/explore.svg" alt="Explore" class="sidebar-icon">
                <span class="nav-label">Explore</span>
            </a>
            <a href="like.html" class="sidebar-item" data-page="like.html">
                <img src="https://zsnefaffxvktxbibmqaf.supabase.co/storage/v1/object/public/Covers/sidebar_icons/like.svg" alt="Like" class="sidebar-icon">
                <span class="nav-label">Like</span>
            </a>
            <a href="equalizer.html" class="sidebar-item" data-page="equalizer.html">
                <img src="https://zsnefaffxvktxbibmqaf.supabase.co/storage/v1/object/public/Covers/sidebar_icons/equalizer.svg" alt="Equalizer" class="sidebar-icon">
                <span class="nav-label">Equalizer</span>
            </a>
            <a href="genre.html" class="sidebar-item" data-page="genre.html">
                <img src="https://zsnefaffxvktxbibmqaf.supabase.co/storage/v1/object/public/Covers/sidebar_icons/genre.svg" alt="Genre" class="sidebar-icon">
                <span class="nav-label">Genre</span>
            </a>
            <a href="echo.html" class="sidebar-item" data-page="echo.html">
                <img src="https://zsnefaffxvktxbibmqaf.supabase.co/storage/v1/object/public/Covers/sidebar_icons/echo.svg" alt="Echo" class="sidebar-icon">
                <span class="nav-label">Echo</span>
            </a>

            <div class="sidebar-bottom">

                <div class="sidebar-nightmode" id="sidebarNightModeBtn" title="Toggle dark mode">
                    <span class="nm-icon">&#127769;</span>
                    <span class="nm-label">Night Mode</span>
                    <div class="nm-toggle"></div>
                </div>

                <div class="sidebar-divider"></div>

                <a href="settings.html" class="sidebar-item" data-page="settings.html">
                    <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        style="width:20px;height:20px;object-fit:unset">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
                                 a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
                                 A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
                                 l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
                                 A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
                                 l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
                                 a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
                                 l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
                                 a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    <span class="nav-label">Settings</span>
                </a>

                <a href="login.html" class="sidebar-item sidebar-logout" data-page="login.html">
                    <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        style="width:20px;height:20px;object-fit:unset">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span class="nav-label">Log Out</span>
                </a>

            </div>
        `;
    }


    /* ══════════════════════════════════════════
       4. AVATAR — click goes to profile.html
          Dropdown permanently disabled via CSS
    ══════════════════════════════════════════ */
    function setupAvatar() {
        if (!document.getElementById('orpheus-no-dropdown-style')) {
            const s = document.createElement('style');
            s.id = 'orpheus-no-dropdown-style';
            s.textContent = `
                .avatar-dropdown,
                .avatar-wrapper:hover .avatar-dropdown,
                .avatar-dropdown.open {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                }
                .user-avatar, .avatar-wrapper { cursor: pointer !important; }
            `;
            document.head.appendChild(s);
        }

        document.querySelectorAll('.avatar-wrapper, #avatarWrapper').forEach(wrapper => {
            wrapper.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
            wrapper.addEventListener('click', function (e) {
                e.stopPropagation();
                window.location.href = 'profile.html';
            });
        });
    }


    /* ══════════════════════════════════════════
       5. NIGHT MODE
    ══════════════════════════════════════════ */
    function toggleNightMode() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const next = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('orpheus_theme', next);
        syncNightModeIcons(!isDark);
        const t = document.getElementById('toggleNightMode');
        if (t) t.checked = !isDark;
    }

    function syncNightModeIcons(isDark) {
        document.querySelectorAll('.nm-icon').forEach(el => {
            el.textContent = isDark ? '\u2600\uFE0F' : '\uD83C\uDF19';
        });
    }


    /* ══════════════════════════════════════════
       6. ACTIVE SIDEBAR ITEM
    ══════════════════════════════════════════ */
    function setActiveItem() {
        const page = window.location.pathname.split('/').pop() || 'home.html';
        document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });
    }


    /* ══════════════════════════════════════════
       7. LOG-OUT BUTTON COLOUR + SUPABASE LOGOUT
    ══════════════════════════════════════════ */
    function styleLogout() {
        const el = document.querySelector('.sidebar-logout');
        if (!el) return;
        el.style.color = 'rgba(230,57,70,0.75)';
        el.addEventListener('mouseenter', () => el.style.color = '#e63946');
        el.addEventListener('mouseleave', () => el.style.color = 'rgba(230,57,70,0.75)');

        // Override default href navigation with real Supabase sign-out
        el.addEventListener('click', async function (e) {
            e.preventDefault();
            try {
                await supabaseClient.auth.signOut();
            } catch (_) { }
            sessionStorage.clear();
            localStorage.removeItem('orpheus_display_name');
            localStorage.removeItem('orpheus_avatar');
            localStorage.removeItem('orpheus_genres');
            window.location.href = 'login.html';
        });
    }




    /* ══════════════════════════════════════════
       8. PAGE TRANSITIONS
       • Enter : sidebar slides in L→R, then page
                 content fades + drifts up slightly.
       • Exit  : sidebar slides out R→L, page content
                 fades out — no dark curtain at all.
    ══════════════════════════════════════════ */

    /* ENTER — sidebar slides in, then content fades in */
    function playEnterTransition() {
        /* Always run on every page load */
        const sidebar = document.getElementById('sidebar');
        const content = document.querySelector('.main-content, main, .content, .page-content');

        /* Hide everything instantly before animating */
        if (sidebar) {
            sidebar.style.transform = 'translateX(-100%)';
            sidebar.style.opacity = '0';
        }
        if (content) {
            content.style.opacity = '0';
            content.style.transform = 'translateY(12px)';
        }

        /* Sidebar slides in first */
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (sidebar) {
                sidebar.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.45s ease';
                sidebar.style.transform = 'translateX(0)';
                sidebar.style.opacity = '1';
            }

            /* Content fades in shortly after */
            setTimeout(() => {
                if (content) {
                    content.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                }
            }, 220);

            /* Clean up inline styles once done */
            setTimeout(() => {
                if (sidebar) { sidebar.style.transition = ''; sidebar.style.transform = ''; sidebar.style.opacity = ''; }
                if (content) { content.style.transition = ''; content.style.transform = ''; content.style.opacity = ''; }
            }, 750);
        }));
    }

    function interceptLinks() {
        if (document._oc_links_wired) return;
        document._oc_links_wired = true;

        document.addEventListener('click', function (e) {
            const a = e.target.closest('a[href]');
            if (!a || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const href = a.getAttribute('href');
            if (!href) return;
            if (href.startsWith('http') || href.startsWith('//') ||
                href.startsWith('#') || href.startsWith('mailto:') ||
                href.startsWith('javascript:')) return;
            if (!href.match(/\.html(\?.*)?$/)) return;
            const currentPage = window.location.pathname.split('/').pop() || 'home.html';
            if (href.split('?')[0] === currentPage) return;

            e.preventDefault();

            const sidebar = document.getElementById('sidebar');
            const content = document.querySelector('.main-content, main, .content, .page-content');

            /* Sidebar slides out R→L */
            if (sidebar) {
                sidebar.style.transition = 'transform 0.38s cubic-bezier(0.55, 0, 0.45, 1), opacity 0.38s ease';
                sidebar.style.transform = 'translateX(-100%)';
                sidebar.style.opacity = '0';
            }

            /* Content fades out simultaneously */
            if (content) {
                content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                content.style.opacity = '0';
                content.style.transform = 'translateY(-8px)';
            }

            /* Navigate after exit animation completes */
            setTimeout(() => {
                window.location.href = href;
            }, 420);
        });
    }


    /* ══════════════════════════════════════════
       9. SEARCH — live dropdown connected to
          Supabase Storage (Albums + Genre buckets)
    ══════════════════════════════════════════ */

    const _SB_URL = SUPABASE_URL;
    const _SB_KEY = SUPABASE_KEY;

    /* All songs fetched from DB — populated once */
    let _searchIndex = [];    /* [{title, artist, album, genre, cover_url, audio_url, source}] */
    let _searchReady = false;

    async function _buildSearchIndex() {
        /* ── Query the `songs` database table via Supabase REST API ── */
        try {
            const res = await fetch(
                `${_SB_URL}/rest/v1/songs?select=title,artist,album,genre,cover_url,audio_url&order=title.asc&limit=1000`,
                {
                    headers: {
                        'apikey': _SB_KEY,
                        'Authorization': `Bearer ${_SB_KEY}`,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!res.ok) {
                console.warn('Search: songs table query failed', res.status, await res.text());
                _searchReady = true;
                return;
            }

            const rows = await res.json();

            _searchIndex = rows.map(row => ({
                title: row.title || '',
                artist: row.artist || '',
                album: row.album || '',
                genre: row.genre || '',
                cover_url: row.cover_url || null,
                audio_url: row.audio_url || null,
                source: row.genre || 'DB'
            }));

        } catch (e) {
            console.warn('Search: songs table error', e);
        }

        _searchReady = true;
    }

    function _injectSearchStyles() {
        if (document.getElementById('orpheus-search-styles')) return;
        const s = document.createElement('style');
        s.id = 'orpheus-search-styles';
        s.textContent = `
#orpheus-search-drop {
    position: absolute;
    top: calc(100% + 8px);
    left: 0; right: 0;
    background: var(--bg-sidebar, #25343F);
    border: 1px solid rgba(191,201,209,0.13);
    border-radius: 16px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.35);
    max-height: 420px;
    overflow-y: auto;
    z-index: 9999;
    scrollbar-width: thin;
    scrollbar-color: rgba(191,201,209,0.2) transparent;
    display: none;
}
#orpheus-search-drop.open { display: block; }

.osd-header {
    padding: 10px 16px 6px;
    font-family: var(--font-heading, 'Orbitron', sans-serif);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: rgba(191,201,209,0.35);
    text-transform: uppercase;
}
.osd-row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 8px 14px;
    cursor: pointer;
    border-radius: 10px;
    margin: 0 4px;
    transition: background 0.15s;
}
.osd-row:hover { background: rgba(255,155,81,0.1); }
.osd-row:hover .osd-title { color: var(--gold, #FF9B51); }
.osd-thumb {
    width: 38px; height: 38px;
    border-radius: 8px;
    background: rgba(191,201,209,0.1);
    flex-shrink: 0;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: rgba(191,201,209,0.4);
}
.osd-thumb img { width: 100%; height: 100%; object-fit: cover; }
.osd-info { flex: 1; min-width: 0; }
.osd-title {
    font-family: var(--font-sans, 'Space Grotesk', sans-serif);
    font-size: 0.82rem; font-weight: 600;
    color: rgba(191,201,209,0.9);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    transition: color 0.15s;
}
.osd-artist {
    font-size: 0.7rem;
    color: rgba(191,201,209,0.4);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.osd-badge {
    font-size: 0.58rem; font-weight: 700;
    letter-spacing: 0.1em;
    padding: 2px 7px; border-radius: 20px;
    background: rgba(191,201,209,0.08);
    color: rgba(191,201,209,0.35);
    flex-shrink: 0;
    font-family: var(--font-heading, 'Orbitron', sans-serif);
}
.osd-empty {
    padding: 28px 16px;
    text-align: center;
    font-size: 0.78rem;
    color: rgba(191,201,209,0.3);
    font-family: var(--font-sans, 'Space Grotesk', sans-serif);
}
.osd-loading {
    padding: 20px 16px;
    text-align: center;
    font-size: 0.75rem;
    color: rgba(191,201,209,0.35);
    font-family: var(--font-sans, 'Space Grotesk', sans-serif);
    display: flex; align-items: center; justify-content: center; gap: 8px;
}
@keyframes osd-spin { to { transform: rotate(360deg); } }
.osd-spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(191,201,209,0.15);
    border-top-color: var(--gold, #FF9B51);
    animation: osd-spin 0.7s linear infinite;
}
/* Make search bar wrapper relative for dropdown positioning */
.nav-center { position: relative; }
        `;
        document.head.appendChild(s);
    }

    function _highlightMatch(text, query) {
        if (!query) return text;
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return text;
        return text.slice(0, idx) +
            `<mark style="background:rgba(255,155,81,0.25);color:var(--gold,#FF9B51);border-radius:3px;">${text.slice(idx, idx + query.length)}</mark>` +
            text.slice(idx + query.length);
    }

    function _setupSearch() {
        _injectSearchStyles();

        /* Create dropdown element — anchored to nav-center */
        const drop = document.createElement('div');
        drop.id = 'orpheus-search-drop';
        const navCenter = document.querySelector('.nav-center');
        if (navCenter) navCenter.appendChild(drop);

        const input = document.querySelector('.search-input');
        if (!input) return;

        let _debounce = null;

        function runSearch(raw) {
            const q = raw.trim();

            if (!q) { drop.classList.remove('open'); return; }

            drop.classList.add('open');

            if (!_searchReady) {
                drop.innerHTML = `<div class="osd-loading"><div class="osd-spinner"></div>Building index…</div>`;
                return;
            }

            if (!_searchIndex.length) {
                drop.innerHTML = `<div class="osd-empty">No songs found in storage.</div>`;
                return;
            }

            const ql = q.toLowerCase();
            const seen = new Set();
            const hits = _searchIndex.filter(s => {
                const matches =
                    s.title.toLowerCase().includes(ql) ||
                    s.artist.toLowerCase().includes(ql) ||
                    s.album.toLowerCase().includes(ql) ||
                    (s.genre && s.genre.toLowerCase().includes(ql));
                if (!matches) return false;
                const key = s.title.toLowerCase().replace(/\s+/g, ' ').trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).slice(0, 12);

            if (!hits.length) {
                drop.innerHTML = `<div class="osd-empty">No results for "<strong>${q}</strong>"</div>`;
                return;
            }

            drop.innerHTML = `<div class="osd-header">Results (${hits.length})</div>` +
                hits.map((s, i) => {
                    const thumb = s.cover_url
                        ? `<img src="${s.cover_url}" alt="" loading="lazy" onerror="this.style.display='none'">`
                        : '♪';
                    return `<div class="osd-row" data-idx="${i}">
                        <div class="osd-thumb">${thumb}</div>
                        <div class="osd-info">
                            <div class="osd-title">${_highlightMatch(s.title, q)}</div>
                            <div class="osd-artist">${_highlightMatch(s.artist, q)}</div>
                        </div>
                        <span class="osd-badge">${s.source}</span>
                    </div>`;
                }).join('');

            /* Wire click → play */
            drop.querySelectorAll('.osd-row').forEach((row, i) => {
                row.addEventListener('mousedown', e => {
                    e.preventDefault(); /* prevent input blur before click fires */
                    const song = hits[i];
                    _playSearchResult(song);
                    input.value = song.title;
                    drop.classList.remove('open');
                });
            });
        }

        input.addEventListener('input', e => {
            clearTimeout(_debounce);
            _debounce = setTimeout(() => runSearch(e.target.value), 220);
        });

        input.addEventListener('focus', e => {
            if (e.target.value.trim()) runSearch(e.target.value);
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                drop.classList.remove('open');
                input.blur();
            }
            if (e.key === 'Enter') {
                const first = drop.querySelector('.osd-row');
                if (first) first.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            }
        });

        document.addEventListener('click', e => {
            if (!e.target.closest('.nav-center')) drop.classList.remove('open');
        });
    }

    function _playSearchResult(song) {
        if (!window.OrpheusPlayer) return;

        /* If OrpheusPlayer already has this song in its index, just play it */
        window.OrpheusPlayer.getSongs(songs => {
            const idx = songs.findIndex(s =>
                s.title.toLowerCase() === song.title.toLowerCase() &&
                s.artist.toLowerCase() === song.artist.toLowerCase()
            );
            if (idx >= 0) {
                window.OrpheusPlayer.play(idx);
                return;
            }
            /* Song isn't in the current player index (e.g. it's from Genre bucket).
               Inject it at position 0 so it plays immediately. */
            window.OrpheusPlayer._injectAndPlay(song);
        });
    }


    /* ══════════════════════════════════════════
       10. MAIN INIT
    ══════════════════════════════════════════ */
    function init() {
        /* Inject DOM first so sidebar element exists for animations */
        injectTopbar();
        injectSidebar();
        setupAvatar();

        interceptLinks();        /* wire exit transitions on all links */
        playEnterTransition();   /* animate sidebar + content on page load */

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        syncNightModeIcons(isDark);

        /* Settings-page night-mode checkbox */
        const settingsToggle = document.getElementById('toggleNightMode');
        if (settingsToggle) {
            settingsToggle.checked = isDark;
            settingsToggle.addEventListener('change', function () {
                document.documentElement.setAttribute('data-theme', this.checked ? 'dark' : 'light');
                localStorage.setItem('orpheus_theme', this.checked ? 'dark' : 'light');
                syncNightModeIcons(this.checked);
            });
        }

        const nmBtn = document.getElementById('sidebarNightModeBtn');
        if (nmBtn) nmBtn.addEventListener('click', toggleNightMode);

        setActiveItem();
        styleLogout();

        /* ── Search: setup UI immediately, build index in background ── */
        _setupSearch();
        _buildSearchIndex(); /* async — runs while user browses */
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();