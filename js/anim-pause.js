/**
 * Off-screen animation pause.
 * Infinite CSS animations (this site has ~27) run forever and keep the browser
 * compositor / GPU awake continuously — a real, always-on heat source even when
 * the WebGL scenes are idle. This pauses all animations inside a section once it
 * scrolls out of view (via `.anim-paused` + animation-play-state:paused in CSS),
 * and resumes them when it comes back. Cheap: one IntersectionObserver over a
 * handful of sections.
 */
(function () {
    if (!('IntersectionObserver' in window)) return;

    const boot = () => {
        const els = document.querySelectorAll(
            'section, .section, .hero, footer, #telemetry-hud'
        );
        if (!els.length) return;

        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                // Paused when NOT intersecting. rootMargin keeps a just-off-screen
                // section live so nothing pops when it scrolls back in.
                e.target.classList.toggle('anim-paused', !e.isIntersecting);
            }
        }, { rootMargin: '15% 0px' });

        els.forEach((el) => io.observe(el));
    };

    // Heat-diagnosis: ?novideo stops all <video> decode (see index.html head).
    const killVideo = () => {
        if (!document.documentElement.classList.contains('diag-novideo')) return;
        const stop = () => document.querySelectorAll('video').forEach((v) => {
            try { v.pause(); v.autoplay = false; v.removeAttribute('autoplay'); v.removeAttribute('src');
                  v.querySelectorAll('source').forEach((s) => s.remove()); v.load(); } catch (e) {}
        });
        stop();
        // Re-stop anything that lazy-loads in later.
        new MutationObserver(stop).observe(document.documentElement, { childList: true, subtree: true });
    };

    const start = () => { boot(); killVideo(); };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
