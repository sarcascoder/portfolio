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

    const start = () => {
        const videos = document.querySelectorAll(selector);
        if (!videos.length) return;

        // Graceful fallback: no IntersectionObserver -> just load everything.
        if (typeof IntersectionObserver === 'undefined') {
            videos.forEach((v) => {
                attachSource(v);
                v.play().catch(() => {});
            });
            return;
        }

        // 300px rootMargin gives the video a head start before it's actually visible.
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    attachSource(video);
                    // play() can reject on some browsers that block muted autoplay in background tabs;
                    // the catch stops the rejection from surfacing to the console.
                    const promise = video.play();
                    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
                } else if (video.dataset.loaded === 'true') {
                    video.pause();
                }
            });
        }, { rootMargin: '300px 0px', threshold: 0 });

        videos.forEach((v) => observer.observe(v));
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
