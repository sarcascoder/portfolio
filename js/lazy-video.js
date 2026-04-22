/**
 * LAZY-VIDEO
 *
 * Project videos used to start downloading the moment the page loaded,
 * which pushed the home page's initial payload over 30MB. This module
 * defers every <video data-src="..."> until the card is about to scroll
 * into view, attaches the source, and begins playback. When the card
 * leaves the viewport we pause to save decode work; the bytes stay
 * cached so the second visit is instant.
 */
(() => {
    const selector = 'video[data-src]';

    const attachSource = (video) => {
        if (video.dataset.loaded === 'true') return;
        const src = video.getAttribute('data-src');
        if (!src) return;
        video.src = src;
        video.dataset.loaded = 'true';
    };

    const playSafely = (video) => {
        const promise = video.play();
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    };

    const start = () => {
        const videos = document.querySelectorAll(selector);
        const pauseOffscreenVideos = document.querySelectorAll('video[data-pause-offscreen]');

        // Graceful fallback: no IntersectionObserver -> just load everything.
        if (typeof IntersectionObserver === 'undefined') {
            videos.forEach((v) => { attachSource(v); playSafely(v); });
            return;
        }

        // Lazy-load: 300px rootMargin gives the video a head start
        if (videos.length) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const video = entry.target;
                    if (entry.isIntersecting) {
                        attachSource(video);
                        playSafely(video);
                    } else if (video.dataset.loaded === 'true') {
                        video.pause();
                    }
                });
            }, { rootMargin: '300px 0px', threshold: 0 });
            videos.forEach((v) => observer.observe(v));
        }

        // Pause-when-offscreen: for already-sourced videos (like the hero teaser)
        // whose decoder would otherwise burn CPU after the user scrolls past.
        // Also pauses when the parent is hidden (universe-mode) because offsetParent
        // becomes null.
        if (pauseOffscreenVideos.length) {
            const pauseObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const video = entry.target;
                    if (entry.isIntersecting) {
                        if (video.paused) playSafely(video);
                    } else {
                        video.pause();
                    }
                });
            }, { threshold: 0 });
            pauseOffscreenVideos.forEach((v) => pauseObserver.observe(v));
        }

        // Also pause the teaser video entirely while the universe reveal is active
        // — the CSS hides it but the video element keeps decoding frames otherwise.
        const teaser = document.querySelector('.universe-teaser-video');
        if (teaser) {
            const bodyObserver = new MutationObserver(() => {
                if (document.body.classList.contains('universe-mode')) {
                    teaser.pause();
                } else if (teaser.paused) {
                    // Only resume if the teaser is actually on-screen; the pauseObserver
                    // above will handle the case where we're scrolled away.
                    const rect = teaser.getBoundingClientRect();
                    const onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
                    if (onScreen) playSafely(teaser);
                }
            });
            bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
