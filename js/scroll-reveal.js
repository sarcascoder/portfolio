/**
 * SCROLL-REVEAL.JS - Scroll-triggered typewriter animations
 */

(function initScrollReveal() {
    console.log("📜 Scroll Reveal: Init started");

    // Wait for GSAP and ScrollTrigger
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn("⚠️ Scroll Reveal: GSAP not found, retrying...");
        setTimeout(initScrollReveal, 100);
        return;
    }

    console.log("✅ Scroll Reveal: GSAP loaded");
    gsap.registerPlugin(ScrollTrigger);

    // ... (rest of configuration)

    const CONFIG = {
        scrollStart: 'top 85%', 
        typeSpeed: 0.03,        
        staggerBatch: 0.01,     
    };

    // ... (rest of selectors)
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
        '.view-all-link span', 
        '.contact-email',
        '.contact-location',
        '.nav-link',
        'li', 
        '.tagline-text'
    ];

    const EXCLUDE_SELECTORS = [
        '.hero-title',         
        '.rotating-text-ring', 
        '.marquee-text',       
        '#contact-modal *',    
        '.no-typewriter',      
        'script', 'style', 'svg', 'img', 'br'
    ];

    // ... (splitTextToChars function)
    function splitTextToChars(element) {
        // ... (existing logic)
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
                if (text.length > 0) {
                    if (text.match(/^\s+$/)) return;

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
            } else if (node.nodeType === 1 && !EXCLUDE_SELECTORS.some(s => node.matches(s))) { 
                 if (['SPAN', 'STRONG', 'EM', 'B', 'I', 'A'].includes(node.tagName)) {
                     if (splitTextToChars(node)) {
                         modified = true;
                     }
                 }
            }
        });
        return modified;
    }

    // Initialization
    const allElements = document.querySelectorAll(TYPEWRITER_SELECTORS.join(', '));
    console.log(`🔍 Scroll Reveal: Found ${allElements.length} potential elements`);
    
    const animatableElements = [];

    allElements.forEach(el => {
        if (el.closest(EXCLUDE_SELECTORS.join(', '))) return;
        if (el.closest('.hero')) return; 
        
        if (el.getAttribute('data-typewriter-init') === 'true') return;

        if (splitTextToChars(el)) {
            el.setAttribute('data-typewriter-init', 'true');
            el.style.opacity = '1'; 
            animatableElements.push(el);
        }
    });

    console.log(`⚡ Scroll Reveal: Prepared ${animatableElements.length} elements for animation`);

    animatableElements.forEach(el => {
        const chars = el.querySelectorAll('.char-reveal');
        if (chars.length === 0) return;

        gsap.set(chars, { opacity: 0 });

        ScrollTrigger.create({
            trigger: el,
            start: CONFIG.scrollStart,
            once: true,
            // markers: true, // DEBUG: Uncomment to see scroll markers
            onEnter: () => {
                // console.log("▶️ Animate:", el);
                gsap.to(chars, {
                    opacity: 1,
                    duration: 0.1, 
                    stagger: {
                        each: CONFIG.typeSpeed,
                        from: "start"
                    },
                    ease: "none"
                });
            }
        });
    });

    ScrollTrigger.refresh();
    console.log("🚀 Scroll Reveal: Ready");

})();
