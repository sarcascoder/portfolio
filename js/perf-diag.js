/**
 * Perf diagnostics — only runs when the URL has ?diag. Measures real runtime
 * cost in the user's own browser and POSTs a summary every 2s to the local
 * logger (http://localhost:9099) so it can be read off disk. Harmless without
 * the query param. Remove this script + its <script> tag once diagnosis done.
 */
(function () {
    if (!/[?&]diag\b/.test(location.search)) return;
    const ENDPOINT = 'http://localhost:9099/log';
    const send = (o) => { try { fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(o), keepalive: true }); } catch (e) {} };

    // Long tasks (main-thread jank > 50ms).
    let longTasks = 0, longTaskMs = 0;
    try {
        new PerformanceObserver((list) => {
            for (const e of list.getEntries()) { longTasks++; longTaskMs += e.duration; }
        }).observe({ entryTypes: ['longtask'] });
    } catch (e) {}

    // Frame cadence.
    let frames = 0, last = performance.now(), maxGap = 0, sumGap = 0;
    (function tick(now) {
        frames++; const g = now - last; if (g > maxGap) maxGap = g; sumGap += g; last = now;
        requestAnimationFrame(tick);
    })(performance.now());

    let report = 0;
    setInterval(() => {
        let bf = 0;
        document.querySelectorAll('*').forEach((el) => {
            const s = getComputedStyle(el);
            const f = s.backdropFilter || s.webkitBackdropFilter;
            if (f && f !== 'none') bf++;
        });
        const anims = document.getAnimations ? document.getAnimations().length : -1;
        const vids = [...document.querySelectorAll('video')].filter((v) => !v.paused).length;
        const mg = window.__mgPerf || {};
        send({
            t: report++,
            mode: location.search,
            fps: +(frames / ((sumGap / 1000) || 1)).toFixed(1),
            avgFrameMs: +((sumGap / frames) || 0).toFixed(2),
            worstFrameMs: +maxGap.toFixed(1),
            longTasks, longTaskMs: +longTaskMs.toFixed(0),
            animations: anims,
            visibleBackdropFilters: bf,
            playingVideos: vids,
            blackHoleRPS: mg.mainRPS ?? null,
            cornerRPS: mg.cornerRPS ?? null,
            jsHeapMB: (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null)
        });
        frames = 0; sumGap = 0; maxGap = 0; longTasks = 0; longTaskMs = 0;
    }, 2000);
})();
