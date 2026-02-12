/**
 * SCROLL-REVEAL.JS - Scroll-triggered text reveal animations
 * Uses GSAP ScrollTrigger to fade-in-up text elements as they enter the viewport
 */

(function initScrollReveal() {
    // Wait for GSAP and ScrollTrigger to be available
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        // Retry after a short delay if GSAP isn't loaded yet
        setTimeout(initScrollReveal, 100);
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // ==========================================
    // CONFIGURATION
    // ==========================================

    const CONFIG = {
        y: 40,                    // Starting Y offset (px)
        duration: 0.8,            // Animation duration (s)
        ease: 'power2.out',       // Easing function
        stagger: 0.12,            // Stagger delay between siblings (s)
        triggerStart: 'top 88%',  // When to trigger (element top hits 88% of viewport)
    };

    // Elements to animate
    const TEXT_SELECTORS = [
        // Headings
        'h1', 'h2', 'h3',
        // Paragraphs and text
        'p',
        // Section labels
        '.section-label',
        // Links and buttons
        '.view-all-link',
        '.contact-email',
        '.contact-location',
        // Service items
        '.service-item',
        // Project cards
        '.project-card',
        // Value items
        '.value-item',
        // Stat items
        '.stat-item',
        // Job items
        '.job-item',
        // Process steps
        '.process-step',
        // Service blocks
        '.service-block',
        // Filter buttons
        '.filter-section',
        // Footer
        '.footer-content',
        // Lists (animate the whole list, not each li)
        '.service-list',
        '.service-offerings',
        '.project-tags',
        // Careers
        '.careers-header',
        // Misc text containers
        '.about-text',
        '.contact-content',
        '.page-subtitle',
    ];

    // Containers to exclude (elements inside these won't be animated)
    const EXCLUDE_CONTAINERS = [
        '.header',
        '.nav-menu',
        '#contact-modal',
        '#mercury-container',
        '#contact-earth-wrapper',
        '.hero',              // Hero has its own entrance animation
        '.rotating-text-ring',
    ];

    // Build the exclude selector
    const excludeSelector = EXCLUDE_CONTAINERS.map(c => `${c} *`).join(', ');

    // ==========================================
    // SELECT & FILTER ELEMENTS
    // ==========================================

    const allSelector = TEXT_SELECTORS.join(', ');
    const allElements = document.querySelectorAll(allSelector);

    // Filter out excluded elements and already-processed ones
    const elements = [];
    const seen = new Set();

    allElements.forEach(el => {
        // Skip if already processed
        if (seen.has(el)) return;

        // Skip if inside an excluded container
        if (el.closest(EXCLUDE_CONTAINERS.join(', '))) return;

        // Skip if it's a child of another element we're already animating
        // (e.g., an h3 inside a .service-item — we animate the service-item)
        let dominated = false;
        for (const parent of seen) {
            if (parent.contains(el) && parent !== el) {
                dominated = true;
                break;
            }
        }
        if (dominated) return;

        // Remove any already-added children that this element contains
        for (let i = elements.length - 1; i >= 0; i--) {
            if (el.contains(elements[i]) && el !== elements[i]) {
                seen.delete(elements[i]);
                elements.splice(i, 1);
            }
        }

        elements.push(el);
        seen.add(el);
    });

    // ==========================================
    // GROUP SIBLINGS FOR STAGGER
    // ==========================================

    // Group elements by their parent to apply staggered animations
    const parentGroups = new Map();

    elements.forEach(el => {
        const parent = el.parentElement;
        if (!parentGroups.has(parent)) {
            parentGroups.set(parent, []);
        }
        parentGroups.get(parent).push(el);
    });

    // ==========================================
    // APPLY ANIMATIONS
    // ==========================================

    parentGroups.forEach((group, parent) => {
        if (group.length > 1) {
            // Staggered animation for sibling groups
            gsap.set(group, { opacity: 0, y: CONFIG.y });

            ScrollTrigger.batch(group, {
                onEnter: (batch) => {
                    gsap.to(batch, {
                        opacity: 1,
                        y: 0,
                        duration: CONFIG.duration,
                        ease: CONFIG.ease,
                        stagger: CONFIG.stagger,
                        overwrite: true,
                    });
                },
                start: CONFIG.triggerStart,
                once: true, // Only animate once
            });
        } else {
            // Single element animation
            const el = group[0];
            gsap.set(el, { opacity: 0, y: CONFIG.y });

            gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: CONFIG.duration,
                ease: CONFIG.ease,
                overwrite: true,
                scrollTrigger: {
                    trigger: el,
                    start: CONFIG.triggerStart,
                    once: true,
                },
            });
        }
    });

    // Force a ScrollTrigger refresh after setup to catch already-visible elements
    ScrollTrigger.refresh();

    console.log(`%c✨ Scroll Reveal: ${elements.length} elements initialized`, 'color: #00ff88; font-size: 11px;');
})();
