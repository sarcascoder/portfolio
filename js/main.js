/**
 * MAIN.JS - Main entry point and initialization
 * Handles navigation, page transitions, and global functionality
 */

class App {
    constructor() {
        this.menuToggle = document.getElementById('menu-toggle');
        this.navMenu = document.getElementById('nav-menu');
        this.isMenuOpen = false;
        
        this.init();
    }
    
    init() {
        // Lock scrolling until 3D assets load
        document.body.classList.add('loading-active');

        // Menu toggle
        this.initMenu();

        // Initialize Lenis for custom scroll control
        this.initLenis();
        
        // Smooth scroll for anchor links
        this.initSmoothScroll();
        
        // Page load animation
        this.initPageLoad();

        // Force scroll to top on refresh/unload to ensure animations sync correctly
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        
        // Reset scroll on load
        window.scrollTo(0, 0);
        
        // Reset scroll before unload (refresh)
        window.onbeforeunload = function () {
            window.scrollTo(0, 0);
        }

        // Safety timeout: dismiss loading screen even if model fails to signal
        this._loadingSafetyTimer = setTimeout(() => {
            if (window.finishLoading) {
                 window.finishLoading();
                 return;
            }
            
            // Fallback if rocket loader script is missing
            const ls = document.getElementById('loading-screen');
            if (ls && ls.style.display !== 'none') {
                ls.style.opacity = '0';
                setTimeout(() => {
                    ls.style.display = 'none';
                    document.body.classList.remove('loading-active');
                    if (typeof ScrollTrigger !== 'undefined') {
                        ScrollTrigger.refresh(true);
                    }
                }, 600);
            }
        }, 8000);
        
        // Active nav link tracking
        this.initActiveNavTracking();
        
        // Keyboard navigation
        this.initKeyboardNav();

        // Universe Video Reveal
        this.initUniverseReveal();

        // About section moon background reveal
        this.initAboutMoonReveal();
        
        // Hover Sound
        this.initAudioEffects();
    }

    initAboutMoonReveal() {
        const aboutSection = document.getElementById('about-section');
        const moonImage = document.querySelector('.about-moon-image');
        const moonOverlay = document.querySelector('.about-moon-overlay');
        const aboutContent = aboutSection?.querySelector('.section-content');

        if (!aboutSection || !moonImage || !moonOverlay) return;
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        gsap.set(moonImage, {
            opacity: 0,
            scale: 1.08,
            yPercent: -8,
            transformOrigin: 'center center'
        });

        gsap.set(moonOverlay, {
            opacity: 0
        });

        if (aboutContent) {
            gsap.set(aboutContent, {
                yPercent: 48
            });
        }

        gsap.timeline({
            scrollTrigger: {
                trigger: aboutSection,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.8
            }
        })
        .to(moonImage, {
            opacity: 1,
            scale: 1.02,
            yPercent: 4,
            ease: 'none'
        }, 0)
        .to(moonImage, {
            opacity: 0,
            scale: 1,
            yPercent: 10,
            ease: 'none'
        }, 0.28)
        .to(moonOverlay, {
            opacity: 1,
            ease: 'none'
        }, 0)
        .to(aboutContent, {
            yPercent: -68,
            ease: 'none'
        }, 0);
    }

    initLenis() {
        // Initialize Lenis
        this.lenis = new Lenis({
            duration: 0, // 0 duration = no smoothing (immediate)
            easing: (t) => t, // Linear easing
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 0.35, // 55% scroll speed (slower/heavier)
            touchMultiplier: 0.35,
            normalizeWheel: true // Fix inconsistencies across devices
        });

        // Stop Lenis immediately — it will be started when loading is done
        this.lenis.stop();

        // Watch for loading screen dismissal to re-enable Lenis
        const loadingObserver = new MutationObserver(() => {
            if (!document.body.classList.contains('loading-active')) {
                this.lenis.start();
                loadingObserver.disconnect();
            }
        });
        loadingObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Frame loop
        const raf = (time) => {
            this.lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
        
        // Connect GSAP ScrollTrigger if available
        if (typeof ScrollTrigger !== 'undefined') {
            this.lenis.on('scroll', ScrollTrigger.update);
            
            // Add Lenis's ticker to GSAP's ticker for sync
            gsap.ticker.add((time) => {
                this.lenis.raf(time * 1000);
            });
            
            // Disable GSAP's own lag smoothing to let Lenis handle it or keep it separate
            gsap.ticker.lagSmoothing(0);
        }
    }
    
    // ==========================================
    // MENU FUNCTIONALITY
    // ==========================================
    
    initMenu() {
        if (!this.menuToggle || !this.navMenu) return;
        
        this.menuToggle.addEventListener('click', () => this.toggleMenu());
        
        // Close menu when nav link is clicked
        const navLinks = this.navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (this.isMenuOpen) {
                    this.toggleMenu();
                }
            });
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.toggleMenu();
            }
        });

        // Close menu when clicking outside the panel (left side dimmer)
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen) {
                 // Check if click is on the dimmer (pseudo-element check via coordinates)
                 // or simply if it's NOT on the nav-menu and NOT on the toggle button
                 if (this.navMenu.contains(e.target)) return;
                 if (this.menuToggle.contains(e.target)) return;
                 
                 // If we are here, we clicked outside the menu content
                 this.toggleMenu();
            }
        });
    }
    
    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        
        this.menuToggle.classList.toggle('active', this.isMenuOpen);
        this.navMenu.classList.toggle('active', this.isMenuOpen);
        document.body.classList.toggle('menu-open', this.isMenuOpen);
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = this.isMenuOpen ? 'hidden' : '';
        
        // Animate nav links
        if (this.isMenuOpen) {
            this.animateNavLinks();
        }
    }
    
    animateNavLinks() {
        const navLinks = this.navMenu.querySelectorAll('.nav-link');
        
        navLinks.forEach((link, i) => {
            link.style.opacity = '0';
            link.style.transform = 'translateX(-30px)';
            
            setTimeout(() => {
                link.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                link.style.opacity = '';
                link.style.transform = '';
            }, 100 + i * 50);
        });
    }
    
    // ==========================================
    // SMOOTH SCROLL
    // ==========================================
    
    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = anchor.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Close menu if open
                    if (this.isMenuOpen) {
                        this.toggleMenu();
                    }
                    
                    // Smooth scroll to target
                    setTimeout(() => {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }, this.isMenuOpen ? 300 : 0);
                }
            });
        });
    }
    
    // ==========================================
    // PAGE LOAD ANIMATION
    // ==========================================
    
    initPageLoad() {
        // Add loaded class to body after loading screen is dismissed
        // Wait for both window.load AND loading-active to be removed
        const startAnimations = () => {
            document.body.classList.add('loaded');
            this.animateHeroContent();
        };

        window.addEventListener('load', () => {
            // If loading screen is already dismissed, animate immediately
            if (!document.body.classList.contains('loading-active')) {
                setTimeout(startAnimations, 100);
            } else {
                // Wait for loading-active to be removed
                const observer = new MutationObserver(() => {
                    if (!document.body.classList.contains('loading-active')) {
                        observer.disconnect();
                        setTimeout(startAnimations, 100);
                    }
                });
                observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            }
        });
    }
    
    animateHeroContent() {
        const heroTitle = document.querySelector('.hero-title');
        const heroTagline = document.querySelector('.hero-tagline');
        const scrollIndicator = document.querySelector('.scroll-indicator');
        
        if (heroTitle) {
            const lines = heroTitle.querySelectorAll('.title-line');
            lines.forEach((line, i) => {
                line.style.opacity = '0';
                line.style.transform = 'translateY(50px)';
                
                setTimeout(() => {
                    line.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    line.style.opacity = '1';
                    line.style.transform = 'translateY(0)';
                }, 300 + i * 150);
            });
        }
        
        if (heroTagline) {
            heroTagline.style.opacity = '0';
            setTimeout(() => {
                heroTagline.style.transition = 'opacity 1s ease';
                heroTagline.style.opacity = '1';
            }, 800);
        }
        
        if (scrollIndicator) {
            scrollIndicator.style.opacity = '0';
            setTimeout(() => {
                scrollIndicator.style.transition = 'opacity 1s ease';
                scrollIndicator.style.opacity = '1';
            }, 1200);
        }
    }
    
    // ==========================================
    // ACTIVE NAV TRACKING
    // ==========================================
    
    initActiveNavTracking() {
        const sections = document.querySelectorAll('.section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);
        
        sections.forEach(section => observer.observe(section));
    }
    

    initKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            // M key toggles menu
            if (e.key === 'm' || e.key === 'M') {
                if (!e.target.matches('input, textarea')) {
                    this.toggleMenu();
                }
            }
        });
    }

    // ==========================================
    // UNIVERSE VIDEO REVEAL
    // ==========================================
    
    // ==========================================
    // UNIVERSE VIDEO REVEAL
    // ==========================================
    
    initUniverseReveal() {
        const videoContainer = document.getElementById('universe-video-container');
        const video = document.getElementById('universe-video');
        
        if (!videoContainer || !video) return;
        
        // State tracking
        let isUniverseActive = false;
        let isTransitioning = false;
        
        // We use 'wheel' event to detect scroll intention when at the very top
        window.addEventListener('wheel', (e) => {
            // Ignore if menu is open or loading
            if (this.isMenuOpen || document.body.classList.contains('loading-active')) return;
            
            // Current scroll position
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            
            // SCROLL UP logic (revealing video)
            // If at top (approx 0) AND scrolling UP (deltaY < 0) AND video not active
            if (scrollTop <= 5 && e.deltaY < -10 && !isUniverseActive && !isTransitioning) {
                this.activateUniverse(videoContainer, video);
            }
            
            // SCROLL DOWN logic (hiding video)
            // If video is active AND scrolling DOWN (deltaY > 0)
            else if (isUniverseActive && e.deltaY > 20 && !isTransitioning) {
                e.preventDefault(); // Stop the scroll from actually moving the page
                this.deactivateUniverse(videoContainer, video);
            }
        }, { passive: false });
        
        // Also handle touch events for mobile
        let touchStartY = 0;
        window.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        window.addEventListener('touchmove', (e) => {
            if (this.isMenuOpen || document.body.classList.contains('loading-active')) return;
            
            const touchEndY = e.touches[0].clientY;
            const deltaY = touchStartY - touchEndY; // Positive = scroll down, Negative = scroll up
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            
            // Scroll Up (Swipe Down) at top
            if (scrollTop <= 5 && deltaY < -20 && !isUniverseActive && !isTransitioning) {
                this.activateUniverse(videoContainer, video);
                touchStartY = touchEndY; // Reset
            }
            // Scroll Down (Swipe Up) when active
            else if (isUniverseActive && deltaY > 50 && !isTransitioning) {
                this.deactivateUniverse(videoContainer, video);
            }
        }, { passive: true });
        
        // Failsafe: if we scrolled down via scrollbar or inertia without triggering wheel/touch
        window.addEventListener('scroll', () => {
            if (this.isUniverseActive && window.scrollY > 50 && !isTransitioning) {
                 this.deactivateUniverse(videoContainer, video);
            }
        }, { passive: true });
    }
    
    activateUniverse(container, video) {
        // Reset to start
        video.currentTime = 0;
        video.muted = false; // Enable sound!
        video.volume = 1.0;
        
        // Remove any existing ended listeners to prevent stacking
        video.onended = null;
        
        // When video ends, just pause at the last frame. 
        // Do NOT deactivate. User must scroll down to close.
        video.onended = () => {
             console.log('Video ended. Stopping at last frame.');
             video.pause();
             // Ensure it stays at the end
             video.currentTime = video.duration; 
        };
        
        // Attempt to play. Note: browser might block unmuted autoplay if no user interaction registered.
        // But scrolling is an interaction, so it often works.
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Autoplay blocked or failed:', error);
                // Fallback to muted active if unmuted fails? 
                // But user wants sound. Let's try to keep it unmuted and see.
                // If it fails, it fails, but we won't mute it here strictly unless absolutely broken.
            });
        }
        
        container.classList.add('active');
        document.body.classList.add('universe-mode');
        
        this.isUniverseActive = true;
        
        // Dispatch event for other components (Mercury Globe)
        window.dispatchEvent(new CustomEvent('universeToggle', { detail: { active: true } }));
        console.log('Universe Active (Autoplay with Sound)');
    }
    
    deactivateUniverse(container, video) {
        container.classList.remove('active');
        document.body.classList.remove('universe-mode');
        
        this.isUniverseActive = false;
        
        // Force scroll to top to align with Hero section
        // We use 'instant' to prevent any fighting with the layout shift
        window.scrollTo({
            top: 0,
            behavior: 'instant'
        });
        
        // Stop Lenis to kill inertia
        if (this.lenis) {
            this.lenis.stop();
        }
        
        // LOCK scroll at top during transition to ensure we don't drift
        const startTime = Date.now();
        const lockScroll = () => {
             if (Date.now() - startTime < 1100 && !this.isUniverseActive) {
                 window.scrollTo(0, 0);
                 requestAnimationFrame(lockScroll);
             } else if (!this.isUniverseActive) {
                 // Re-enable Lenis after transition
                 if (this.lenis) this.lenis.start();
             }
        };
        requestAnimationFrame(lockScroll);
        
        // Pause video after transition to save resources
        setTimeout(() => {
            if (!this.isUniverseActive) video.pause();
        }, 1000);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('universeToggle', { detail: { active: false } }));
        console.log('Universe Deactivated');
    }

    // ==========================================
    // AUDIO EFFECTS
    // ==========================================
    
    initAudioEffects() {
        // Simple Web Audio API for UI sounds
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Unlock AudioContext on first interaction
        const unlockAudio = () => {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
        
        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        
        // --- CLICK SOUND ---
        const playClick = () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            // Sci-fi "blip" sound (Confirmation)
            oscillator.type = 'sine'; 
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
            
            // Louder!
            gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); 
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        };
        
        // --- HOVER SOUND ---
        const playHover = () => {
            if (audioCtx.state === 'suspended') return; // Don't force resume on hover, only click
            
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            // Short high-pitched "tick" or "chirp"
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
            
            // Louder!
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.05);
        };
        
        // Attach Click Listeners (Global + Specific if needed)
        document.addEventListener('click', () => {
            playClick();
        });
        
        // Attach Hover Listeners to Interactive Elements
        const attachHoverListeners = () => {
             const selectors = [
                 'a', 
                 'button', 
                 '.social-link', 
                 '.theme-toggle-btn', 
                 '.menu-toggle', 
                 '.project-card',
                 '.nav-link',
                 '.scroll-indicator',
                 '.scroll-indicator-up' // Also the new indicator
             ];
             
             const elements = document.querySelectorAll(selectors.join(', '));
             elements.forEach(el => {
                 // Prevent multiple listeners
                 if (!el.dataset.hasHoverSound) {
                     el.addEventListener('mouseenter', () => playHover());
                     el.dataset.hasHoverSound = 'true';
                 }
             });
        };
        
        // Initial attach
        attachHoverListeners();
        
        // Re-attach on DOM mutations (for dynamically added content)
        const observer = new MutationObserver((mutations) => {
            // throttle or just run it? simplified for now
            attachHoverListeners();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

// ==========================================
// SCROLL CONTROLLER (Lenis)
// ==========================================
// Lenis is initialized in App.init()


// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Lerp (Linear interpolation)
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// Clamp value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Map value from one range to another
function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

// ==========================================
// INITIALIZE APP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    
    // Log initialization
    console.log('%c🎨 Portfolio Loaded', 'color: #00ff00; font-size: 14px; font-weight: bold;');
    console.log('%cInspired by Super Evil Geniuscorp', 'color: #666; font-size: 12px;');
});

// ==========================================
// OPTIONAL: PRELOADER
// ==========================================

class Preloader {
    constructor() {
        this.preloader = document.querySelector('.loading-screen');
        
        if (this.preloader) {
            this.init();
        }
    }
    
    init() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.hide();
            }, 500);
        });
    }
    
    hide() {
        this.preloader.style.opacity = '0';
        
        setTimeout(() => {
            this.preloader.style.display = 'none';
        }, 500);
    }
}

// Initialize preloader
new Preloader();
