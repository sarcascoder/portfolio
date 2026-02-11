/**
 * THEME MANAGER
 * Handles Dark/Light mode switching and persistence.
 * Dispatches 'themeChanged' event for Canvas/3D elements to react.
 */

const ThemeManager = {
    init() {
        // 1. Determine initial theme
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // Default to dark if no preference, matches original design
        const theme = savedTheme ? savedTheme : 'dark'; 
        
        // 2. Apply immediately to prevent FOUC
        this.applyTheme(theme);
        
        // 3. Setup UI listeners
        document.addEventListener('DOMContentLoaded', () => {
            this.setupButton();
        });
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Dispatch global event for other scripts (Three.js stars, globe, etc.)
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: theme, isDark: theme === 'dark' } 
        }));
        
        this.updateButtonState(theme);
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        
        // Create glitch overlay
        const overlay = document.createElement('div');
        overlay.className = 'theme-glitch-overlay';
        document.body.appendChild(overlay);
        
        // Create TV static canvas
        const staticCanvas = document.createElement('canvas');
        staticCanvas.className = 'tv-static-overlay';
        staticCanvas.width = window.innerWidth;
        staticCanvas.height = window.innerHeight;
        document.body.appendChild(staticCanvas);
        
        const ctx = staticCanvas.getContext('2d');
        let staticFrame = 0;
        const maxStaticFrames = 6;
        
        // Animate static noise
        const animateStatic = () => {
            if (staticFrame >= maxStaticFrames) {
                staticCanvas.remove();
                return;
            }
            
            // Draw random static noise
            const imageData = ctx.createImageData(staticCanvas.width, staticCanvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const noise = Math.random() * 255;
                data[i] = noise;     // R
                data[i + 1] = noise; // G
                data[i + 2] = noise; // B
                data[i + 3] = 200;   // A (semi-transparent)
            }
            
            ctx.putImageData(imageData, 0, 0);
            staticFrame++;
            
            setTimeout(() => requestAnimationFrame(animateStatic), 20);
        };
        
        // Start static animation
        animateStatic();
        
        // Trigger glitch animation
        let flickerCount = 0;
        const maxFlickers = 4;
        const flickerInterval = setInterval(() => {
            // Rapid theme flicker
            if (flickerCount % 2 === 0) {
                document.documentElement.setAttribute('data-theme', next);
            } else {
                document.documentElement.setAttribute('data-theme', current);
            }
            flickerCount++;
            
            if (flickerCount >= maxFlickers) {
                clearInterval(flickerInterval);
                // Final theme application
                this.applyTheme(next);
                
                // Remove overlay after animation
                setTimeout(() => {
                    overlay.classList.add('fade-out');
                    setTimeout(() => overlay.remove(), 100);
                }, 70);
            }
        }, 40);
    },
    
    setupButton() {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.addEventListener('click', () => this.toggle());
            // Set initial state
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            this.updateButtonState(current);
        }
    },
    
    updateButtonState(theme) {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        
        // Simple text/icon swap
        // Dark mode shows Sun (to switch to light)
        // Light mode shows Moon (to switch to dark)
        btn.innerHTML = theme === 'dark' 
            ? '<span style="font-size: 20px;">☀️</span>' 
            : '<span style="font-size: 20px;">🌙</span>';
        
        btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        
        // Optional: Add active class for styling
        if (theme === 'dark') {
            btn.classList.remove('active-light');
            btn.classList.add('active-dark');
        } else {
            btn.classList.remove('active-dark');
            btn.classList.add('active-light');
        }
    }
};

ThemeManager.init();

// Expose for debugging
window.ThemeManager = ThemeManager;
