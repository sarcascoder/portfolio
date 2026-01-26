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
        // Menu toggle
        this.initMenu();
        
        // Smooth scroll for anchor links
        this.initSmoothScroll();
        
        // Page load animation
        this.initPageLoad();
        
        // Active nav link tracking
        this.initActiveNavTracking();
        
        // Keyboard navigation
        this.initKeyboardNav();
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
        // Add loaded class to body after a short delay
        window.addEventListener('load', () => {
            setTimeout(() => {
                document.body.classList.add('loaded');
                
                // Animate hero content
                this.animateHeroContent();
            }, 100);
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
    
    // ==========================================
    // KEYBOARD NAVIGATION
    // ==========================================
    
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
}

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
