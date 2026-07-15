/**
 * Idle freeze.
 * The reason this site heats a Mac when ordinary sites don't: ordinary pages go
 * static after load, so the GPU compositor sleeps. This one never stops moving
 * (WebGL disk + ~20 infinite CSS animations + looping video), so the compositor
 * — and the re-computation of every backdrop-filter blur behind that motion —
 * runs forever. This pauses ALL CSS animation after a short idle so the page
 * becomes static like any other tab and the GPU can idle. Any interaction wakes
 * it instantly. (The WebGL black hole handles its own idle slow-down separately.)
 */
(function () {
    const IDLE_MS = 4000;
    const root = document.documentElement;
    let timer = null;

    const sleep = () => root.classList.add('is-idle');
    const wake = () => {
        if (root.classList.contains('is-idle')) root.classList.remove('is-idle');
        clearTimeout(timer);
        timer = setTimeout(sleep, IDLE_MS);
    };

    ['mousemove', 'pointermove', 'pointerdown', 'wheel', 'scroll', 'keydown', 'touchstart', 'touchmove']
        .forEach((ev) => window.addEventListener(ev, wake, { passive: true }));

    // Also freeze when the tab is hidden; wake check when it returns.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) sleep(); else wake();
    });

    wake();
})();
