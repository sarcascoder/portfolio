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
        this.applyTheme(next);
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
