/**
 * Lazy Loader for Videos and Images
 * Uses IntersectionObserver to load heavy assets only when they approach the viewport.
 */

document.addEventListener("DOMContentLoaded", () => {
    const lazyVideos = document.querySelectorAll("video.lazy");
    const lazyImages = document.querySelectorAll("img.lazy");

    const mediaObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const media = entry.target;

                if (media.tagName === "VIDEO") {
                    const sources = media.querySelectorAll("source");
                    sources.forEach((source) => {
                        if (source.dataset.src) {
                            source.src = source.dataset.src;
                        }
                    });
                    media.load();
                    media.classList.remove("lazy");
                    observer.unobserve(media);
                } else if (media.tagName === "IMG") {
                    if (media.dataset.src) {
                        media.src = media.dataset.src;
                        media.classList.remove("lazy");
                        observer.unobserve(media);
                    }
                }
            }
        });
    }, {
        rootMargin: "200px 0px" // Start loading 200px before the element enters the viewport
    });

    lazyVideos.forEach((video) => {
        mediaObserver.observe(video);
    });

    lazyImages.forEach((image) => {
        mediaObserver.observe(image);
    });
});
