/**
 * HERO HINT
 *
 * Tiny affordance label that tells a first-time visitor the hero globe is
 * interactive. Fades in after the loader dismisses, fades out on the first
 * real interaction (mouse move, touch, device tilt, or scroll) or after a
 * short visible window — whichever comes first.
 *
 * The text adapts to input capability:
 *   - coarse pointer / touch        → "TAP OR TILT TO EXPLORE"
 *   - fine pointer                  → "MOVE CURSOR TO EXPLORE"
 *   - coarse pointer + scroll       → "TAP · TILT · SCROLL"  (fallback copy)
 */
(() => {
    const hint = document.getElementById('hero-hint');
    const text = document.getElementById('hero-hint-text');
    if (!hint || !text) return;

    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    text.textContent = isTouch ? 'TAP OR TILT TO EXPLORE' : 'MOVE CURSOR TO EXPLORE';

    // Show after loader dismissal. If body.loading-active is already gone, show now.
    const show = () => hint.classList.add('hero-hint-visible');
    if (!document.body.classList.contains('loading-active')) {
        setTimeout(show, 400);
    } else {
        const mo = new MutationObserver(() => {
            if (!document.body.classList.contains('loading-active')) {
                mo.disconnect();
                setTimeout(show, 400);
            }
        });
        mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    let dismissed = false;
    const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        hint.classList.add('hero-hint-dismissed');
        remove();
    };

    // Auto-dismiss after 6s of visibility so the hint never becomes visual noise
    const autoTimer = setTimeout(dismiss, 6500);

    // Listeners — any real interaction hides the hint
    const once = { once: true, passive: true };
    const onInteract = () => dismiss();
    window.addEventListener('mousemove', onInteract, once);
    window.addEventListener('touchstart', onInteract, once);
    window.addEventListener('wheel', onInteract, once);
    window.addEventListener('scroll', onInteract, once);
    // Only count a real tilt, not the baseline capture
    let tiltBaseline = null;
    const onTilt = (e) => {
        if (e.beta == null || e.gamma == null) return;
        if (!tiltBaseline) { tiltBaseline = { b: e.beta, g: e.gamma }; return; }
        if (Math.abs(e.beta - tiltBaseline.b) > 6 || Math.abs(e.gamma - tiltBaseline.g) > 6) {
            window.removeEventListener('deviceorientation', onTilt);
            dismiss();
        }
    };
    window.addEventListener('deviceorientation', onTilt, { passive: true });

    function remove() {
        clearTimeout(autoTimer);
        // Remove from the DOM once the fade-out finishes so it's not a click trap
        setTimeout(() => {
            if (hint.parentNode) hint.parentNode.removeChild(hint);
        }, 700);
    }
})();
