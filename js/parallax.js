/**
 * PARALLAX EFFECTS - Scroll-based and mouse-based parallax
 * Uses GSAP ScrollTrigger for smooth scroll animations
 */

class ParallaxManager {
    constructor() {
        this.parallaxElements = [];
        this.scrollY = 0;
        this.targetScrollY = 0;
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        // Register GSAP plugins if available
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
            this.initGSAPAnimations();
        } else {
            // Fallback to vanilla JS
            this.initVanillaAnimations();
        }
        
        // Mouse parallax
        this.initMouseParallax();
        
        // Scroll reveal animations
        this.initScrollReveal();
        
        // Start animation loop. wake() arms the loop only if there's content
        // to animate; otherwise it stays idle until a scroll/mousemove wakes it.
        this.isAnimating = true;
        this.animate();
    }
    
    initGSAPAnimations() {
        // Hero section parallax
        gsap.to('.hero-content', {
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            },
            y: 200,
            opacity: 0.3
        });
        
        // Section headings reveal
        gsap.utils.toArray('.section-heading').forEach(heading => {
            gsap.from(heading, {
                scrollTrigger: {
                    trigger: heading,
                    start: 'top 80%',
                    end: 'top 50%',
                    toggleActions: 'play none none reverse'
                },
                y: 50,
                opacity: 0,
                duration: 1,
                ease: 'power3.out'
            });
        });
        
        // Project cards stagger animation
        gsap.utils.toArray('.project-card').forEach((card, i) => {
            gsap.from(card, {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                },
                y: 80,
                opacity: 0,
                duration: 0.8,
                delay: i * 0.1,
                ease: 'power3.out'
            });
        });
        
        // Service items fade in
        gsap.utils.toArray('.service-item').forEach((item, i) => {
            gsap.from(item, {
                scrollTrigger: {
                    trigger: item,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                },
                y: 50,
                opacity: 0,
                duration: 0.6,
                delay: i * 0.15,
                ease: 'power2.out'
            });
        });
        
        // Wireframe elements parallax
        gsap.utils.toArray('.wireframe-element').forEach(element => {
            const speed = element.dataset.speed || 0.3;
            
            gsap.to(element, {
                scrollTrigger: {
                    trigger: element.parentElement,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1
                },
                y: `${100 * speed}%`,
                rotation: 45
            });
        });
        
        // Section labels slide in
        gsap.utils.toArray('.section-label').forEach(label => {
            gsap.from(label, {
                scrollTrigger: {
                    trigger: label,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                },
                x: -30,
                opacity: 0,
                duration: 0.6,
                ease: 'power2.out'
            });
        });
    }
    
    initVanillaAnimations() {
        // Collect all parallax elements
        document.querySelectorAll('[data-speed]').forEach(el => {
            this.parallaxElements.push({
                element: el,
                speed: parseFloat(el.dataset.speed) || 0.5
            });
        });
        
        // Track scroll
        window.addEventListener('scroll', () => {
            this.targetScrollY = window.pageYOffset;
            this.wake();
        }, { passive: true });
    }

    initMouseParallax() {
        // Elements that react to mouse movement
        this.mouseElements = document.querySelectorAll('[data-mouse-parallax]');

        // Only bind the global mousemove listener if there's anything to move.
        // Previously it bound unconditionally and the RAF ran every frame
        // regardless — now both are skipped on pages that don't use mouse
        // parallax.
        if (this.mouseElements.length === 0) return;

        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
            this.targetMouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
            this.wake();
        });
    }
    
    initScrollReveal() {
        // Intersection Observer for reveal animations
        const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.15
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);
        
        revealElements.forEach(el => observer.observe(el));
    }
    
    animate() {
        // Smooth scroll interpolation
        this.scrollY += (this.targetScrollY - this.scrollY) * 0.1;

        // Smooth mouse interpolation
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08;

        // Apply parallax to elements (vanilla fallback)
        this.parallaxElements.forEach(({ element, speed }) => {
            const y = this.scrollY * speed;
            element.style.transform = `translateY(${y}px)`;
        });

        // Apply mouse parallax
        this.mouseElements.forEach(element => {
            const strength = parseFloat(element.dataset.mouseParallax) || 20;
            const x = this.mouse.x * strength;
            const y = this.mouse.y * strength;
            element.style.transform = `translate(${x}px, ${y}px)`;
        });

        // Event-driven RAF: stop looping once the interpolation has converged.
        // Previously this ran at 60 fps forever, even when the page was idle.
        // On-demand wake() re-arms it on the next scroll or mousemove.
        const EPS = 0.05;
        const scrollConverged = Math.abs(this.scrollY - this.targetScrollY) < EPS;
        const mouseConverged =
            Math.abs(this.mouse.x - this.targetMouse.x) < EPS * 0.01 &&
            Math.abs(this.mouse.y - this.targetMouse.y) < EPS * 0.01;
        if (scrollConverged && mouseConverged) {
            this.scrollY = this.targetScrollY;
            this.mouse.x = this.targetMouse.x;
            this.mouse.y = this.targetMouse.y;
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.parallaxManager = new ParallaxManager();
});
