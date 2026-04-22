/**
 * TELEMETRY HUD
 *
 * Minimal "spacecraft console" readout pinned to the bottom-left of the
 * viewport. Mirrors the contact globe on the right. Three live values:
 *   - current section (IntersectionObserver on every section[id])
 *   - scroll progress (% of document scrolled)
 *   - UTC clock (ticks once per second)
 *
 * Auto-hides when the universe reveal is active, when the nav menu is open,
 * or when the loading screen is still up — managed via a MutationObserver on
 * <body>'s class list, so it reacts to the existing `universe-mode`,
 * `menu-open`, and `loading-active` toggles that the rest of the app sets.
 */
(() => {
    const hud = document.getElementById('telemetry-hud');
    if (!hud) return;

    const sectionEl = document.getElementById('telemetry-section');
    const scrollFill = document.getElementById('telemetry-scroll-fill');
    const scrollPct = document.getElementById('telemetry-scroll-pct');
    const clockEl = document.getElementById('telemetry-clock');

    const SECTION_LABELS = {
        'hero': { num: '00', name: 'HERO' },
        'about-section': { num: '01', name: 'ABOUT' },
        'projects-section': { num: '02', name: 'FEATURED WORK' },
        'services-section': { num: '03', name: 'SERVICES' },
        'contact': { num: '04', name: 'CONTACT' },
    };

    let currentSectionId = 'hero';
    const setSection = (id) => {
        if (id === currentSectionId) return;
        const info = SECTION_LABELS[id];
        if (!info) return;
        currentSectionId = id;
        if (sectionEl) sectionEl.textContent = `SECTION ${info.num} · ${info.name}`;
    };

    // --- Section tracking ---
    const sections = document.querySelectorAll('.section[id]');
    if (sections.length && typeof IntersectionObserver !== 'undefined') {
        const obs = new IntersectionObserver((entries) => {
            // Pick the most visible intersecting section
            let best = null;
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                if (!best || entry.intersectionRatio > best.intersectionRatio) {
                    best = entry;
                }
            });
            if (best) setSection(best.target.id);
        }, {
            // Viewport-centered band — whichever section occupies the middle of the screen wins.
            rootMargin: '-40% 0px -40% 0px',
            threshold: [0, 0.25, 0.5, 0.75, 1],
        });
        sections.forEach((s) => obs.observe(s));
    }

    // --- Scroll progress ---
    let rafPending = false;
    const updateScroll = () => {
        rafPending = false;
        const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        const max = Math.max(
            document.documentElement.scrollHeight - window.innerHeight,
            1
        );
        const pct = Math.min(100, Math.max(0, (scrollTop / max) * 100));
        if (scrollFill) scrollFill.style.width = `${pct}%`;
        if (scrollPct) scrollPct.textContent = `${String(Math.round(pct)).padStart(2, '0')}%`;
    };
    window.addEventListener('scroll', () => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(updateScroll);
    }, { passive: true });
    updateScroll();

    // --- UTC clock ---
    const pad = (n) => String(n).padStart(2, '0');
    const updateClock = () => {
        if (!clockEl) return;
        const d = new Date();
        clockEl.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
    };
    updateClock();
    // Clock tick — pause when tab is backgrounded (no point updating an unseen clock)
    let clockTimer = setInterval(updateClock, 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            clearInterval(clockTimer);
            clockTimer = null;
        } else if (!clockTimer) {
            updateClock();
            clockTimer = setInterval(updateClock, 1000);
        }
    });

    // --- Visibility toggling driven by existing body classes ---
    const refreshVisibility = () => {
        const cl = document.body.classList;
        const hidden =
            cl.contains('universe-mode') ||
            cl.contains('menu-open') ||
            cl.contains('loading-active');
        hud.classList.toggle('telemetry-hidden', hidden);
    };
    refreshVisibility();
    const mo = new MutationObserver(refreshVisibility);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Reveal once ready so it doesn't flash in during loading
    hud.classList.add('telemetry-ready');
})();
