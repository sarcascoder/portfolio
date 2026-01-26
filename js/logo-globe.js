/**
 * LOGO GLOBE - 3D Animated Globe for Header Logo
 * Small animated wireframe globe that reacts to mouse
 */

class LogoGlobe {
    constructor() {
        this.canvas = document.getElementById('logo-globe-canvas');
        
        if (!this.canvas) {
            console.warn('Logo globe canvas not found');
            return;
        }
        
        // Small fixed size for logo
        this.size = 100;
        
        // Mouse tracking
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        
        // Colors
        this.neonGreen = 0x00ff00;
        
        this.init();
    }
    
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera - orthographic for consistent logo size
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        this.camera.position.z = 4;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.size, this.size);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Create the globe
        this.createGlobe();
        
        // Event listeners
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('themeChanged', (e) => this.updateTheme(e.detail.isDark));

        // Optimization: Pause when not visible
        this.isVisible = true;

        // 1. Intersection Observer
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isVisible = entry.isIntersecting;
            });
        });
        this.observer.observe(this.canvas);
        
        // 2. Tab Visibility
        document.addEventListener('visibilitychange', () => {
            this.isVisible = document.visibilityState === 'visible';
        });
        
        // Start animation
        this.animate();
    }
    
    updateTheme(isDark) {
        if (!this.globe) return;
        const color = isDark ? 0x00ff00 : 0x008f00; // Match other files
        
        this.globe.material.color.setHex(color);
        this.ring1.material.color.setHex(color);
        this.ring2.material.color.setHex(color);
        this.neonGreen = color;
    }
    
    createGlobe() {
        // Check current theme
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        this.neonGreen = isDark ? 0x00ff00 : 0x008f00;

        // Main globe - wireframe sphere
        const globeGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const globeMaterial = new THREE.MeshBasicMaterial({
            color: this.neonGreen,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        
        this.globe = new THREE.Mesh(globeGeometry, globeMaterial);
        this.scene.add(this.globe);
        
        // Equatorial ring
        const ringGeometry = new THREE.TorusGeometry(1.5, 0.02, 8, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: this.neonGreen,
            transparent: true,
            opacity: 0.5
        });
        
        this.ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring1.rotation.x = Math.PI / 2;
        this.scene.add(this.ring1);
        
        // Tilted orbital ring
        this.ring2 = new THREE.Mesh(ringGeometry.clone(), ringMaterial.clone());
        this.ring2.rotation.x = Math.PI / 4;
        this.ring2.rotation.z = Math.PI / 6;
        this.ring2.material.opacity = 0.3;
        this.scene.add(this.ring2);
    }
    
    onMouseMove(e) {
        // Get mouse position normalized to -1 to 1
        this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Skip rendering if not visible
        if (!this.isVisible) return;
        
        // Smooth mouse following
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;
        
        // Rotate globe
        if (this.globe) {
            this.globe.rotation.y += 0.01;
            this.globe.rotation.x = this.mouse.y * 0.3;
        }
        
        // Rotate rings
        if (this.ring1) {
            this.ring1.rotation.z += 0.005;
        }
        if (this.ring2) {
            this.ring2.rotation.z -= 0.008;
            this.ring2.rotation.y += 0.003;
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    destroy() {
        this.renderer.dispose();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if Three.js is loaded
    if (typeof THREE !== 'undefined') {
        window.logoGlobe = new LogoGlobe();
    } else {
        console.warn('Three.js not loaded for logo globe');
    }
});
