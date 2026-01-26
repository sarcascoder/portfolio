/**
 * STARFIELD BACKGROUND
 * Renders a simple 3D starfield of green dots using Three.js
 * Matches the About page background style but without globe/shapes.
 */

class Starfield {
    constructor() {
        this.canvas = document.getElementById('starfield-canvas');
        if (!this.canvas) {
            console.warn('Starfield canvas not found');
            return;
        }
        
        this.init();
    }
    
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 20;
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Add elements
        this.createStars();
        
        // Listeners
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('themeChanged', (e) => this.updateTheme(e.detail.isDark));
        
        // Optimization: Pause when not visible
        this.isVisible = true;
        document.addEventListener('visibilitychange', () => {
            this.isVisible = document.visibilityState === 'visible';
        });

        // Loop
        this.animate();
    }
    
    getStarColor(layerIndex, isDark) {
        if (isDark) {
            // Original colors
            if (layerIndex === 0) return 0x88ccff; // Dust
            return 0xffffff; // Stars
        } else {
            // Light mode colors (dark grey/black)
            if (layerIndex === 0) return 0x5588cc; // Dust (bluer)
            return 0x000000; // Stars
        }
    }

    createStars() {
        // Check initial theme
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        // Layer 1: Background Dust
        this.addStarLayer(20000, 0.1, this.getStarColor(0, isDark), 0.006, 0); 
        
        // Layer 2: Main Starfield
        this.addStarLayer(12000, 0.2, this.getStarColor(1, isDark), 1.0, 1);
        
        // Layer 3: Bright Stars
        this.addStarLayer(70, 0.25, this.getStarColor(2, isDark), 1.0, 2);
    }
    
    updateTheme(isDark) {
        if (!this.starLayers) return;
        
        this.starLayers.forEach(points => {
            const layerIndex = points.userData.layerIndex;
            const newColor = this.getStarColor(layerIndex, isDark);
            points.material.color.setHex(newColor);
            
            // Switch blending for visibility
            // Additive works great on dark, but on light background (white) it makes things white (invisible)
            // Normal blending is better for dark dots on light background
            points.material.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
            
            // Adjust opacity for light mode if needed?
            // Light mode might need stronger opacity
             if (!isDark) {
                points.material.opacity = points.userData.originalOpacity * 1.5; // Darker dots
            } else {
                points.material.opacity = points.userData.originalOpacity;
            }
        });
    }

    addStarLayer(count, size, color, opacity, layerIndex) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        
        for (let i = 0; i < count * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 100;     // x
            positions[i + 1] = (Math.random() - 0.5) * 100; // y
            positions[i + 2] = (Math.random() - 0.5) * 60;  // z
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Check theme for blending
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        
        const material = new THREE.PointsMaterial({
            color: color,
            size: size,
            map: this.getTexture(),
            transparent: true,
            opacity: opacity,
            sizeAttenuation: true,
            depthWrite: false,
            blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending
        });
        
        const starPoints = new THREE.Points(geometry, material);
        starPoints.userData = {
            rotationSpeedX: (Math.random() * 0.0002),
            rotationSpeedY: (Math.random() * 0.0005),
            layerIndex: layerIndex,
            originalOpacity: opacity
        };
        
        this.scene.add(starPoints);
        
        if (!this.starLayers) this.starLayers = [];
        this.starLayers.push(starPoints);
    }
    
    // Helper to generate a soft glow texture
    getTexture() {
        if (this._starTexture) return this._starTexture;
        
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const context = canvas.getContext('2d');
        const center = size / 2;
        
        // Radial gradient for soft glow
        const gradient = context.createRadialGradient(center, center, 0, center, center, center);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Bright center
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)'); // Soft core
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fade out
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        
        this._starTexture = new THREE.CanvasTexture(canvas);
        return this._starTexture;
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isVisible) return;

        if (this.starLayers) {
            this.starLayers.forEach(layer => {
                layer.rotation.y += layer.userData.rotationSpeedY + 0.0001;
                layer.rotation.x += layer.userData.rotationSpeedX;
            });
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Three.js to load
    if (typeof THREE !== 'undefined') {
        new Starfield();
    } else {
        // Retry a bit later if script loading order is off
        setTimeout(() => {
             if (typeof THREE !== 'undefined') new Starfield();
        }, 100);
    }
});
