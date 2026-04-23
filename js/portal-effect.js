/**
 * PORTAL EFFECT
 * Creates a circular portal revealing a video when hovering over specific text.
 * The text adapts its color for contrast using mix-blend-mode.
 */

class PortalEffect {
    constructor() {
        this.triggers = document.querySelectorAll('.hero-title h1, .hero-title .title-line');
        this.portal = null;
        this.video = null;
        this.cursor = { x: 0, y: 0 };
        this.portalSize = 0;
        this.targetSize = 0;
        this.isHovering = false;
        
        // Configuration
        this.maxSize = 120; // Maximum radius of the portal
        this.IMAGE_URL = new URL('../portal_image.webp', import.meta.url).href;
        
        this.init();
    }

    init() {
        this.createPortalDOM();
        this.bindEvents();
        // No RAF at startup — the portal only needs to animate while the
        // user is hovering one of the trigger elements. hover handlers
        // call wake() to start the loop, which self-terminates when the
        // size has settled back to zero.
        this.isAnimating = false;
    }

    createPortalDOM() {
        // Create container
        this.portal = document.createElement('div');
        this.portal.className = 'portal-cursor';
        this.portal.style.background = 'linear-gradient(45deg, #00ff00, #0066ff)'; // Fallback
        
        // Create image element
        this.image = document.createElement('img');
        this.image.src = this.IMAGE_URL;
        this.image.className = 'portal-video'; // Keep same class for styling (object-fit)
        
        
        this.image.onerror = () => {
            console.warn('Image failed to load, utilizing fallback gradient');
            this.image.style.display = 'none';
        };
        
        // Append to hero-content to ensure correct stacking/blending with text
        this.portal.appendChild(this.image); // Restore missing line
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.appendChild(this.portal);
        } else {
            console.warn('Hero content not found, appending to body');
            document.body.appendChild(this.portal);
        }
    }

    bindEvents() {
        // Mouse move — only update cursor coords while the portal is
        // actually animating. When the portal is closed there's no
        // reason to track cursor position.
        window.addEventListener('mousemove', (e) => {
            if (!this.isAnimating) return;
            this.cursor.x = e.clientX;
            this.cursor.y = e.clientY;
        });

        // Hover triggers
        this.triggers.forEach(trigger => {
            trigger.style.position = 'relative'; // Ensure z-index works
            trigger.style.zIndex = '10'; // Above local content
            trigger.style.mixBlendMode = 'difference'; // Contrast effect

            trigger.addEventListener('mouseenter', (e) => {
                this.isHovering = true;
                this.targetSize = this.maxSize;
                document.body.classList.add('portal-active');
                // Seed cursor position from the enter event so the first
                // frame is at the right place.
                this.cursor.x = e.clientX;
                this.cursor.y = e.clientY;
                this.wake();
            });

            trigger.addEventListener('mouseleave', () => {
                this.isHovering = false;
                this.targetSize = 0;
                document.body.classList.remove('portal-active');
                this.wake(); // keep the loop running while it shrinks back to 0
            });
        });
    }

    animate() {
        // Smooth lerp for size
        this.portalSize += (this.targetSize - this.portalSize) * 0.1;

        // Update portal position and size
        if (this.portal && this.portal.parentElement) {
            // Calculate position relative to parent container
            const rect = this.portal.parentElement.getBoundingClientRect();
            const relX = this.cursor.x - rect.left;
            const relY = this.cursor.y - rect.top;

            this.portal.style.transform = `translate(${relX}px, ${relY}px) translate(-50%, -50%)`;
            this.portal.style.width = `${this.portalSize}px`;
            this.portal.style.height = `${this.portalSize}px`;
        }

        // Self-terminate: if the size has settled (open or fully closed),
        // stop looping. Wake() re-arms on the next hover event.
        const settled = Math.abs(this.portalSize - this.targetSize) < 0.2;
        if (settled && !this.isHovering && this.portalSize < 0.5) {
            this.portalSize = 0;
            if (this.portal) {
                this.portal.style.width = '0px';
                this.portal.style.height = '0px';
            }
            this.isAnimating = false;
            return;
        }

        requestAnimationFrame(() => this.animate());
    }

    wake() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
        new PortalEffect();
    }, 100);
});
