/**
 * EARTH GLOBE - Realistic 3D Earth (No Face)
 * For Contact Section
 *
 * Uses the bundled (Vite-resolved) Three.js. The CDN copy that used to set
 * window.THREE has been removed so we don't double-load.
 */

import {
    AdditiveBlending, AmbientLight, Color, DirectionalLight, DoubleSide, Group, Mesh, MeshPhongMaterial, PerspectiveCamera, Scene, SphereGeometry, TextureLoader, WebGLRenderer
} from 'three';

class SmileyFace {
    constructor(container) {
        this.container = container || document.getElementById('contact-earth-container');
        
        if (!this.container) {
            console.error('Contact earth container not found');
            return;
        }
        
        // No mouse tracking: Earth rotates on its own only
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.createScene();
        this.createEarth();
        this.bindEvents();
        this.animate();
    }
    
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'smiley-canvas';
        this.canvas.style.cssText = `
            width: 100%;
            height: 100%;
            display: block;
        `;
        this.container.appendChild(this.canvas);
        
        this.onResize();
    }
    
    createScene() {
        this.scene = new Scene();
        
        this.camera = new PerspectiveCamera(50, this.width / this.height, 0.1, 1000);
        this.camera.position.z = 5; 
        
        this.renderer = new WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.width, this.height);
        // Pixel ratio 1.5 (was 2.0) — Retina gains no visible quality at this size
        // and we save ~44% of fragment work per frame.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }
    
    createEarth() {
        this.earthGroup = new Group();
        
        // Reduced radius: 1.4 (was 1.8)
        const earthRadius = 1.4;
        const earthGeometry = new SphereGeometry(earthRadius, 64, 64);
        
        const textureLoader = new TextureLoader();
        
        // Earth Textures
        const earthMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
        const earthSpecular = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
        const earthNormal = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
        
        const earthMaterial = new MeshPhongMaterial({
            map: earthMap,
            specularMap: earthSpecular,
            normalMap: earthNormal,
            specular: new Color(0x333333),
            shininess: 15
        });
        
        this.earthMesh = new Mesh(earthGeometry, earthMaterial);
        
        // Clouds
        const cloudGeometry = new SphereGeometry(earthRadius + 0.02, 64, 64);
        const cloudTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');
        const cloudMaterial = new MeshPhongMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.8,
            blending: AdditiveBlending,
            side: DoubleSide
        });
        this.cloudsMesh = new Mesh(cloudGeometry, cloudMaterial);
        this.earthMesh.add(this.cloudsMesh);
        
        this.earthMesh.rotation.y = -Math.PI / 2;
        
        this.earthGroup.add(this.earthMesh);
        
        // Lights
        const ambientLight = new AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const dirLight = new DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 3, 5);
        this.scene.add(dirLight);

        const rimLight = new DirectionalLight(0x4444ff, 0.5);
        rimLight.position.set(-5, 5, -5);
        this.scene.add(rimLight);
        
        this.scene.add(this.earthGroup);
    }
    
    bindEvents() {
        window.addEventListener('resize', () => {
            this.onResize();
        });

        this.isVisible = true;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                this.isVisible = entry.isIntersecting;
            });
        });
        observer.observe(this.canvas);

        document.addEventListener('visibilitychange', () => {
            this.isVisible = document.visibilityState === 'visible';
        });
    }
    
    onResize() {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width || 100;
        this.height = rect.height || 100;
        
        if (this.camera) {
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
        }
        if (this.renderer) {
            this.renderer.setSize(this.width, this.height);
        }
    }
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    animate(now = 0) {
        requestAnimationFrame((t) => this.animate(t));

        // Skip render entirely when the tab is hidden, the canvas is off-screen,
        // or the universe reveal is covering the page. The existing isVisible
        // flag already covers off-screen; adding universe-mode stops a full
        // WebGL draw loop from running behind the covering video.
        if (
            !this.isVisible ||
            document.visibilityState === 'hidden' ||
            document.body.classList.contains('universe-mode')
        ) {
            return;
        }

        // Cap at 30fps — the earth only auto-rotates, and at 0.001 rad/frame
        // it moves too slowly for 60 vs 30fps to be visually distinguishable.
        // We compensate by doubling the per-frame rotation increment below so
        // the wall-clock rotation speed stays identical.
        if (now - (this._lastTime || 0) < 1000 / 30) return;
        this._lastTime = now;

        if (this.earthGroup) {
            // Auto-rotate — 2× increment to match former 60fps wall-clock speed
            if (this.earthMesh) {
                this.earthMesh.rotation.y += 0.002;
            }
            if (this.cloudsMesh) {
                this.cloudsMesh.rotation.y += 0.0026;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.SmileyFace = SmileyFace;

// Self-initialize when DOM is ready. The `typeof THREE === 'undefined'` guard
// that used to live here was a leftover from when THREE came from a CDN; now
// THREE is imported directly so the guard was always true.
document.addEventListener('DOMContentLoaded', () => {
    const contactContainer = document.getElementById('contact-earth-container');
    if (contactContainer) {
        window.smileyFace = new SmileyFace(contactContainer);
    }
});
