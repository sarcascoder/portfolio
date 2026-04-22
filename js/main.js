/**
 * MAIN.JS - Main entry point and initialization
 * Handles navigation, page transitions, and global functionality
 */

class App {
    constructor() {
        this.menuToggle = document.getElementById('menu-toggle');
        this.navMenu = document.getElementById('nav-menu');
        this.isMenuOpen = false;
        this.isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
        this.isMobileViewport = window.innerWidth <= 820;
        this.isLowPowerDevice = (navigator.deviceMemory && navigator.deviceMemory <= 4)
            || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 6);
        this.isMobileOptimized = this.isTouchDevice && (this.isMobileViewport || this.isLowPowerDevice);
        
        this.init();
    }
    
    init() {
        // Lock scrolling until 3D assets load
        document.body.classList.add('loading-active');
        document.body.classList.toggle('mobile-optimized', this.isMobileOptimized);

        // Menu toggle
        this.initMenu();

        // Initialize Lenis for custom scroll control
        this.initLenis();

        // Adaptive hero-to-about scroll pacing
        this.initHeroScrollPacing();
        
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

        // Universe Audio (scroll-synced soundtrack)
        this.initUniverseAudio();

        // Scroll cursor state detection
        this.initScrollCursor();

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
        const isMobile = this.isMobileOptimized;

        if (!aboutSection || !moonImage || !moonOverlay) return;
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        gsap.set(moonImage, {
            opacity: 0,
            scale: isMobile ? 1.03 : 1.08,
            yPercent: isMobile ? -4 : -8,
            transformOrigin: 'center center'
        });

        gsap.set(moonOverlay, {
            opacity: 0
        });

        if (aboutContent) {
            gsap.set(aboutContent, {
                yPercent: isMobile ? 18 : 48
            });
        }

        gsap.timeline({
            scrollTrigger: {
                trigger: aboutSection,
                start: 'top bottom',
                end: 'bottom top',
                scrub: isMobile ? 0.35 : 0.8
            }
        })
        .to(moonImage, {
            opacity: 1,
            scale: isMobile ? 1.01 : 1.02,
            yPercent: isMobile ? 2 : 4,
            ease: 'none'
        }, 0)
        .to(moonImage, {
            opacity: 0,
            scale: 1,
            yPercent: isMobile ? 6 : 10,
            ease: 'none'
        }, 0.28)
        .to(moonOverlay, {
            opacity: isMobile ? 0.45 : 1,
            ease: 'none'
        }, 0)
        .to(aboutContent, {
            yPercent: isMobile ? -18 : -68,
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
            wheelMultiplier: this.isMobileOptimized ? 0.55 : 0.35,
            touchMultiplier: this.isMobileOptimized ? 1.05 : 0.35,
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

    initHeroScrollPacing() {
        if (this.isMobileOptimized) return;

        this.baseWheelMultiplier = this.lenis?.options?.wheelMultiplier || 0.35;
        this.baseTouchMultiplier = this.lenis?.options?.touchMultiplier || 0.35;
        this.heroScrollTouchY = null;

        const applyMultiplierForDirection = (direction) => {
            if (!this.lenis || this.universeTargetProgress > 0 || this.isMenuOpen) return;

            const multiplier = this.getHeroScrollMultiplier(direction);
            this.lenis.options.wheelMultiplier = multiplier;
            this.lenis.options.touchMultiplier = multiplier;
        };

        window.addEventListener('wheel', (e) => {
            applyMultiplierForDirection(e.deltaY > 0 ? 1 : -1);
        }, { passive: true, capture: true });

        window.addEventListener('touchstart', (e) => {
            this.heroScrollTouchY = e.touches[0]?.clientY ?? null;
        }, { passive: true, capture: true });

        window.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0]?.clientY;
            if (typeof currentY !== 'number' || this.heroScrollTouchY == null) return;

            const delta = this.heroScrollTouchY - currentY;
            if (Math.abs(delta) < 2) return;

            applyMultiplierForDirection(delta > 0 ? 1 : -1);
            this.heroScrollTouchY = currentY;
        }, { passive: true, capture: true });

        window.addEventListener('touchend', () => {
            this.heroScrollTouchY = null;
        }, { passive: true, capture: true });

        window.addEventListener('resize', () => {
            if (!this.lenis) return;
            this.lenis.options.wheelMultiplier = this.baseWheelMultiplier;
            this.lenis.options.touchMultiplier = this.baseTouchMultiplier;
        });
    }

    getHeroScrollMultiplier(direction = 1) {
        if (this.isMobileOptimized) {
            return direction > 0
                ? (this.baseTouchMultiplier || this.baseWheelMultiplier || 0.55)
                : (this.baseWheelMultiplier || 0.55);
        }

        const heroSection = document.getElementById('hero');
        const aboutSection = document.getElementById('about-section');

        if (!heroSection || !aboutSection) {
            return this.baseWheelMultiplier || 0.35;
        }

        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const heroStart = Math.max(heroSection.offsetTop, 0);
        const heroHeight = heroSection.offsetHeight || window.innerHeight;
        const aboutTop = aboutSection.offsetTop;
        const aboutHeight = aboutSection.offsetHeight || window.innerHeight;
        const aboutMid = aboutTop + aboutHeight * 0.5;

        if (direction <= 0) {
            return this.baseWheelMultiplier;
        }

        const effectStart = heroStart;
        const effectEnd = aboutTop + aboutHeight * (this.isMobileOptimized ? 0.72 : 0.92);

        if (scrollY <= effectStart || scrollY >= effectEnd) {
            return this.baseWheelMultiplier;
        }

        const fastMultiplier = this.isMobileOptimized ? 0.72 : 0.98;
        const slowMultiplier = this.isMobileOptimized ? 0.3 : 0.035;
        const holdMultiplier = this.isMobileOptimized ? 0.34 : 0.05;
        const normalFastMultiplier = this.isMobileOptimized ? 0.65 : 0.84;

        const slowZoneCenter = aboutTop + aboutHeight * (this.isMobileOptimized ? 0.46 : 0.58);
        const slowZoneHalfWidth = Math.max(
            window.innerHeight * (this.isMobileOptimized ? 0.18 : 0.34),
            aboutHeight * (this.isMobileOptimized ? 0.14 : 0.24)
        );
        const slowZoneStart = slowZoneCenter - slowZoneHalfWidth;
        const slowZoneEnd = slowZoneCenter + slowZoneHalfWidth;
        const slowHoldStart = slowZoneCenter - slowZoneHalfWidth * 0.28;
        const slowHoldEnd = slowZoneCenter + slowZoneHalfWidth * 0.4;

        if (scrollY < slowZoneStart) {
            const progress = this.clamp((scrollY - effectStart) / Math.max(slowZoneStart - effectStart, 1), 0, 1);
            return this.mix(fastMultiplier, slowMultiplier, this.smoothStep(progress));
        }

        if (scrollY <= slowHoldStart) {
            const progress = this.clamp((scrollY - slowZoneStart) / Math.max(slowHoldStart - slowZoneStart, 1), 0, 1);
            return this.mix(slowMultiplier, holdMultiplier, this.smoothStep(progress));
        }

        if (scrollY <= slowHoldEnd) {
            return holdMultiplier;
        }

        if (scrollY <= slowZoneEnd) {
            const progress = this.clamp((scrollY - slowHoldEnd) / Math.max(slowZoneEnd - slowHoldEnd, 1), 0, 1);
            return this.mix(holdMultiplier, slowMultiplier, this.smoothStep(progress));
        }

        const progress = this.clamp((scrollY - slowZoneEnd) / Math.max(effectEnd - slowZoneEnd, 1), 0, 1);
        return this.mix(slowMultiplier, normalFastMultiplier, this.smoothStep(progress));
    }

    smoothStep(value) {
        const t = this.clamp(value, 0, 1);
        return t * t * (3 - 2 * t);
    }

    mix(start, end, amount) {
        return start + (end - start) * amount;
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
        this.universeVideo = video;
        this.universeContainer = videoContainer;
        this.universeProgress = 0;
        this.universeTargetProgress = 0;
        this.universeIsOpen = false;
        this.universeVideoReady = false;
        this.universeDuration = 0;
        this.universeRaf = null;
        this.universeTouchY = null;
        this.universeLastAppliedTime = -1;

        if (this.isMobileOptimized) {
            video.preload = 'metadata';
            video.setAttribute('fetchpriority', 'auto');
        }

        video.muted = true;
        video.pause();
        video.playsInline = true;

        const markVideoReady = () => {
            if (!Number.isFinite(video.duration) || video.duration <= 0) return;
            this.universeDuration = video.duration;
            this.universeVideoReady = true;
            this.syncUniverseVideoFrame(true);
        };

        if (video.readyState >= 1) {
            markVideoReady();
        } else {
            video.addEventListener('loadedmetadata', markVideoReady, { once: true });
        }

        video.addEventListener('canplay', () => {
            markVideoReady();
        });

        const shouldCaptureUniverseScroll = () => {
            if (this.isMenuOpen || document.body.classList.contains('loading-active')) return false;
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            return this.universeTargetProgress > 0 || scrollTop <= 4;
        };

        const scrubUniverse = (delta) => {
            // Two-speed scroll: fast for reveal (container expand), slow for video playback
            const revealCutoff = 0.04; // reveal phase is only 4% of total progress
            const currentProgress = this.universeTargetProgress;

            // Use fast scroll in the reveal zone (both entering and exiting)
            const isClosing = delta < 0; // scrolling back down
            const inRevealZone = currentProgress < revealCutoff || (isClosing && currentProgress < revealCutoff * 3);

            let range;
            if (inRevealZone) {
                // Reveal phase: fast/snappy — small range means fewer pixels of scroll needed
                // Mobile needs a shorter range because a swipe rarely exceeds ~300px
                range = this.isMobileOptimized
                    ? Math.max(window.innerHeight * 0.6, 400)
                    : Math.max(window.innerHeight * 1.8, 900);
            } else {
                // Playback phase: slow and controlled on desktop (long wheel throw),
                // much shorter on mobile so a few finger swipes scrub the whole video
                range = this.isMobileOptimized
                    ? Math.max(window.innerHeight * 5, 2800)
                    : Math.max(window.innerHeight * 22, 11000);
            }

            const nextProgress = this.clamp(currentProgress + delta / range, 0, 1);

            if (nextProgress === this.universeTargetProgress) return;

            this.universeTargetProgress = nextProgress;
            this.startUniverseRenderLoop();
        };

        window.addEventListener('wheel', (e) => {
            if (!shouldCaptureUniverseScroll()) return;

            if (e.deltaY < 0 || this.universeTargetProgress > 0) {
                e.preventDefault();
                scrubUniverse(-e.deltaY);
            }
        }, { passive: false });

        window.addEventListener('touchstart', (e) => {
            this.universeTouchY = e.touches[0]?.clientY ?? null;
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (!shouldCaptureUniverseScroll() || this.universeTouchY == null) return;

            const currentY = e.touches[0]?.clientY;
            if (typeof currentY !== 'number') return;

            const delta = currentY - this.universeTouchY;
            if (Math.abs(delta) < 2) return;

            const shouldScrubUniverse = delta > 0 || this.universeTargetProgress > 0;
            if (!shouldScrubUniverse) {
                this.universeTouchY = currentY;
                return;
            }

            e.preventDefault();
            scrubUniverse(delta);
            this.universeTouchY = currentY;
        }, { passive: false });

        window.addEventListener('touchend', () => {
            this.universeTouchY = null;
        }, { passive: true });

        this.applyUniverseProgress(true);
    }

    // ==========================================
    // SCROLL CURSOR STATE
    // ==========================================

    initScrollCursor() {
        if (this.isTouchDevice) return;

        const cursorDot = document.getElementById('cursor-dot');
        if (!cursorDot) return;

        this.scrollCursorTimeout = null;
        this.isScrollCursorActive = false;

        const setScrollCursor = () => {
            if (!this.isScrollCursorActive) {
                this.isScrollCursorActive = true;
                cursorDot.classList.add('scrolling');
            }

            clearTimeout(this.scrollCursorTimeout);

            this.scrollCursorTimeout = setTimeout(() => {
                if (this.isScrollCursorActive) {
                    this.isScrollCursorActive = false;
                    cursorDot.classList.remove('scrolling');
                }
            }, 150);
        };

        window.addEventListener('wheel', setScrollCursor, { passive: true });

        window.addEventListener('touchstart', setScrollCursor, { passive: true });
        window.addEventListener('touchmove', setScrollCursor, { passive: true });
    }

    // ==========================================
    // UNIVERSE AUDIO (scroll-synced soundtrack)
    // ==========================================

    initUniverseAudio() {
        const audio = document.getElementById('universe-audio');
        if (!audio) return;

        this.universeAudio = audio;
        this.universeAudioReady = false;
        this.universeAudioPlaying = false;
        this.universeAudioCtx = null;
        this.universeGainNode = null;
        this.universeAudioSource = null;
        this.universeAudioFadeTimeout = null;
        this.universeAudioContextUnlocked = false;

        if (this.isMobileOptimized) {
            audio.preload = 'metadata';
        }

        audio.volume = 1; // Volume controlled via GainNode, not element volume

        const markAudioReady = () => {
            this.universeAudioReady = true;
        };

        if (audio.readyState >= 2) {
            markAudioReady();
        } else {
            audio.addEventListener('canplay', markAudioReady, { once: true });
        }
    }

    /**
     * Lazily create Web Audio API nodes on first user gesture.
     * Must be called from a user-interaction context (wheel/touch/click).
     */
    ensureUniverseAudioContext() {
        if (this.universeAudioContextUnlocked) return true;

        const audio = this.universeAudio;
        if (!audio) return false;

        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaElementSource(audio);
            const gain = ctx.createGain();

            gain.gain.value = 0; // Start silent — will fade in on scroll
            source.connect(gain);
            gain.connect(ctx.destination);

            this.universeAudioCtx = ctx;
            this.universeAudioSource = source;
            this.universeGainNode = gain;
            this.universeAudioContextUnlocked = true;

            // Resume context if suspended (autoplay policy)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            return true;
        } catch (e) {
            console.warn('Universe audio: Web Audio API init failed', e);
            return false;
        }
    }

    /**
     * Called from syncUniverseVideoFrame to play audio at the matching position.
     * @param {number} targetTime - The current video time to sync audio to
     * @param {boolean} isScrolling - Whether the user is actively scrolling
     */
    syncUniverseAudio(targetTime, isScrolling) {
        const audio = this.universeAudio;
        if (!audio || !this.universeAudioReady) return;

        // Lazy-init the AudioContext on first scroll interaction
        if (!this.universeAudioContextUnlocked) {
            if (!this.ensureUniverseAudioContext()) return;
        }

        const ctx = this.universeAudioCtx;
        const gain = this.universeGainNode;
        if (!ctx || !gain) return;

        // Resume context if it got suspended
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        if (isScrolling) {
            // Sync audio position — only seek if drifted more than 0.5s
            const drift = Math.abs(audio.currentTime - targetTime);
            if (drift > 0.5) {
                audio.currentTime = targetTime;
            }

            // Start playing if not already
            if (audio.paused) {
                audio.play().catch(() => {
                    // Autoplay blocked — will try again on next scroll
                });
            }

            // Fade in volume smoothly
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setTargetAtTime(0.6, ctx.currentTime, 0.15); // 0.6 = target volume, 150ms ramp

            this.universeAudioPlaying = true;

            // Clear any pending fade-out
            clearTimeout(this.universeAudioFadeTimeout);

            // Schedule fade-out if scrolling stops
            this.universeAudioFadeTimeout = setTimeout(() => {
                this.fadeOutUniverseAudio();
            }, 300);
        }
    }

    fadeOutUniverseAudio() {
        const audio = this.universeAudio;
        const ctx = this.universeAudioCtx;
        const gain = this.universeGainNode;
        if (!audio || !ctx || !gain) return;

        // Smooth fade out over 400ms
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.12); // ~400ms to near-zero

        // Pause after fade completes
        setTimeout(() => {
            if (this.universeAudioPlaying) {
                audio.pause();
                this.universeAudioPlaying = false;
            }
        }, 500);
    }

    /**
     * Immediately stop universe audio (e.g. when leaving universe mode entirely)
     */
    stopUniverseAudio() {
        const audio = this.universeAudio;
        const gain = this.universeGainNode;
        const ctx = this.universeAudioCtx;
        if (!audio) return;

        clearTimeout(this.universeAudioFadeTimeout);

        if (gain && ctx) {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        }

        setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
            this.universeAudioPlaying = false;
        }, 200);
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    startUniverseRenderLoop() {
        if (this.universeRaf) return;

        const tick = () => {
            // Use faster lerp during reveal phase for snappy container expansion
            const revealCutoff = 0.04;
            const lerpFactor = this.universeProgress < revealCutoff ? 0.35 : 0.16;
            const next = this.universeProgress + (this.universeTargetProgress - this.universeProgress) * lerpFactor;
            this.universeProgress = Math.abs(next - this.universeTargetProgress) < 0.001 ? this.universeTargetProgress : next;

            this.applyUniverseProgress();

            if (Math.abs(this.universeProgress - this.universeTargetProgress) < 0.001) {
                this.universeRaf = null;
                return;
            }

            this.universeRaf = requestAnimationFrame(tick);
        };

        this.universeRaf = requestAnimationFrame(tick);
    }

    applyUniverseProgress(forceSync = false) {
        const container = this.universeContainer;
        const video = this.universeVideo;

        if (!container || !video) return;

        const progress = this.clamp(this.universeProgress, 0, 1);
        const revealCutoff = 0.04; // must match scrubUniverse
        const revealPhase = this.clamp(progress / revealCutoff, 0, 1);
        const playbackPhase = progress <= revealCutoff ? 0 : this.clamp((progress - revealCutoff) / (1 - revealCutoff), 0, 1);
        const revealHeight = `${revealPhase * 100}vh`;

        container.style.height = revealHeight;
        video.style.opacity = `${0.15 + revealPhase * 0.85}`;

        if (progress > 0.001) {
            container.classList.add('active');
            document.body.classList.add('universe-mode');
            window.scrollTo(0, 0);
            if (this.lenis) this.lenis.stop();
        } else {
            container.classList.remove('active');
            document.body.classList.remove('universe-mode');
            if (this.lenis) this.lenis.start();
            // Stop audio when universe fully closes
            if (this.universeAudioPlaying) this.stopUniverseAudio();
        }

        const isOpen = progress > 0.03;
        if (this.universeIsOpen !== isOpen) {
            this.universeIsOpen = isOpen;
            this.isUniverseActive = isOpen;
            window.dispatchEvent(new CustomEvent('universeToggle', { detail: { active: isOpen } }));
        } else {
            this.isUniverseActive = isOpen;
        }

        this.syncUniverseVideoFrame(forceSync, playbackPhase);
    }

    syncUniverseVideoFrame(forceSync = false, progressOverride = null) {
        const video = this.universeVideo;
        if (!video || !this.universeVideoReady || !this.universeDuration) return;

        const playbackProgress = progressOverride == null
            ? this.clamp(this.universeProgress, 0, 1)
            : this.clamp(progressOverride, 0, 1);
        const targetTime = playbackProgress * this.universeDuration;

        if (!forceSync && Math.abs(targetTime - this.universeLastAppliedTime) < 1 / 30) {
            return;
        }

        if (video.seeking && !forceSync) return;

        this.universeLastAppliedTime = targetTime;
        video.pause();

        try {
            video.currentTime = targetTime;
        } catch (error) {
            // Ignore transient seek errors while metadata/buffer settles.
        }

        // Sync audio: play soundtrack when actively scrolling in playback phase
        const isScrolling = Math.abs(this.universeProgress - this.universeTargetProgress) > 0.001;
        if (playbackProgress > 0.005) {
            // In playback phase — sync audio
            this.syncUniverseAudio(targetTime, isScrolling);
        } else if (this.universeAudioPlaying) {
            // Left the playback phase — stop audio
            this.stopUniverseAudio();
        }
    }

    // ==========================================
    // AUDIO EFFECTS
    // ==========================================
    
    initAudioEffects() {
        if (this.isTouchDevice) return;

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
