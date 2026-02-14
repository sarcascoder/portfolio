/**
 * SCROLL-REVEAL.JS - Scroll-triggered typewriter animations
 */

(function initScrollReveal() {
    // Wait for GSAP and ScrollTrigger
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        setTimeout(initScrollReveal, 100);
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // ==========================================
    // CONFIGURATION
    // ==========================================

    const CONFIG = {
        scrollStart: 'top 85%', // Trigger when top of element hits 85% of viewport
        typeSpeed: 0.03,        // Moderate typing speed (seconds per character)
        staggerBatch: 0.01,     // Slightly faster for long blocks
    };

    // Elements to apply typewriter effect to
    const TYPEWRITER_SELECTORS = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p',
        '.section-label',
        '.service-title',
        '.project-title',
        '.project-category',
        '.project-year',
        '.stat-number',
        '.stat-label',
        '.view-all-link span', // Target text inside links
        '.contact-email',
        '.contact-location',
        '.nav-link',
        'li', // List items
        '.tagline-text' // Hero tagline
    ];

    // Exclude complete containers or specific elements
    const EXCLUDE_SELECTORS = [
        '.hero-title',         // Has its own custom animation
        '.rotating-text-ring', // SVG text
        '.marquee-text',       // Marquee needs to stay intact
        '#contact-modal *',    // Modal content
        '.no-typewriter',      // Utility class to opt-out
        'script', 'style', 'svg', 'img', 'br'
    ];


    // ==========================================
    // UTILITIES
    // ==========================================

    // Helper: Split text into spans without breaking HTML structure
    // Wraps words to prevent character-level line breaks
    function splitTextToChars(element) {
        // If element has no children (just text), simpler split but with word wrapping
        if (element.children.length === 0) {
            const text = element.textContent;
            if (!text.trim()) return false;
            
            // Split by spaces to preserve words
            const words = text.split(/(\s+)/);
            
            element.innerHTML = words.map(word => {
                if (word.match(/^\s+$/)) return word; // Return spaces/newlines as is (text node effectively)
                // Wrap word in a nowrap span
                return `<span style="display: inline-block; white-space: nowrap;">${
                    word.split('').map(char => `<span class="char-reveal">${char}</span>`).join('')
                }</span>`;
            }).join('');
            return true;
        } 
        
        // Traverse child nodes for mixed content
        let nodes = Array.from(element.childNodes);
        let modified = false;

        nodes.forEach(node => {
            if (node.nodeType === 3) { // Text node
                const text = node.textContent;
                // Only process if it has non-whitespace content (or is meaningful space)
                if (text.length > 0) {
                     // Check if it's just whitespace (preserve it as text node)
                    if (text.match(/^\s+$/)) {
                        // Do nothing, leave whitespace node
                        return;
                    }

                    const words = text.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    
                    words.forEach(word => {
                        if (word.match(/^\s+$/)) {
                             frag.appendChild(document.createTextNode(word));
                        } else if (word.length > 0) {
                             const wordSpan = document.createElement('span');
                             wordSpan.style.display = 'inline-block';
                             wordSpan.style.whiteSpace = 'nowrap';
                             wordSpan.innerHTML = word.split('').map(char => {
                                 return `<span class="char-reveal">${char}</span>`;
                             }).join('');
                             frag.appendChild(wordSpan);
                        }
                    });
                    
                    element.replaceChild(frag, node);
                    modified = true;
                }
            } else if (node.nodeType === 1 && !EXCLUDE_SELECTORS.some(s => node.matches(s))) { // Element node
                // Recursively split children elements if they aren't excluded
                 if (['SPAN', 'STRONG', 'EM', 'B', 'I', 'A'].includes(node.tagName)) {
                     if (splitTextToChars(node)) {
                         modified = true;
                     }
                 }
            }
        });
        return modified;
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    const allElements = document.querySelectorAll(TYPEWRITER_SELECTORS.join(', '));
    const animatableElements = [];

    // Filter and prepare elements
    allElements.forEach(el => {
        // Validation: Check exclusions
        if (el.closest(EXCLUDE_SELECTORS.join(', '))) return;
        if (el.closest('.hero')) return; // General hero exclusion (except explicitly grouped items if any)
        
        // Skip if already processed or has too much HTML (e.g. strict interactive components)
        if (el.getAttribute('data-typewriter-init') === 'true') return;

        // Attempt split
        if (splitTextToChars(el)) {
            el.setAttribute('data-typewriter-init', 'true');
            // Ensure parent is visible to prevent FOUC, chars will be hidden by CSS
            el.style.opacity = '1'; 
            animatableElements.push(el);
        }
    });

    // ==========================================
    // ANIMATION
    // ==========================================

    animatableElements.forEach(el => {
        // Select all the newly created chars inside this element
        const chars = el.querySelectorAll('.char-reveal');
        if (chars.length === 0) return;

        // Set initial state via GSAP (opacity 0)
        gsap.set(chars, { opacity: 0 });

        // Create ScrollTrigger
        ScrollTrigger.create({
            trigger: el,
            start: CONFIG.scrollStart,
            once: true,
            onEnter: () => {
                gsap.to(chars, {
                    opacity: 1,
                    duration: 0.1, // Sudden appearance per char (typing feel)
                    stagger: {
                        each: CONFIG.typeSpeed,
                        from: "start"
                    },
                    ease: "none"
                });
            }
        });
    });

    console.log(`%c⌨️ Typewriter: Initialized on ${animatableElements.length} elements`, 'color: #00ff88; font-weight: bold;');

    // Refresh to calculate positions
    ScrollTrigger.refresh();

})();
