/**
 * EARTH GLOBE - Realistic 3D Earth (No Face)
 * For Contact Section
 */

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
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 1000);
        this.camera.position.z = 5; 
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    
    createEarth() {
        this.earthGroup = new THREE.Group();
        
        // Reduced radius: 1.4 (was 1.8)
        const earthRadius = 1.4;
        const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
        
        const textureLoader = new THREE.TextureLoader();
        
        // Earth Textures
        const earthMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
        const earthSpecular = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
        const earthNormal = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
        
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: earthMap,
            specularMap: earthSpecular,
            normalMap: earthNormal,
            specular: new THREE.Color(0x333333),
            shininess: 15
        });
        
        this.earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        
        // Clouds
        const cloudGeometry = new THREE.SphereGeometry(earthRadius + 0.02, 64, 64);
        const cloudTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        this.cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.earthMesh.add(this.cloudsMesh);
        
        this.earthMesh.rotation.y = -Math.PI / 2;
        
        this.earthGroup.add(this.earthMesh);
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 3, 5);
        this.scene.add(dirLight);

        const rimLight = new THREE.DirectionalLight(0x4444ff, 0.5);
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
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isVisible) return;
        
        if (this.earthGroup) {
            // Auto-rotate
            if (this.earthMesh) {
                this.earthMesh.rotation.y += 0.001;
            }
            if (this.cloudsMesh) {
                this.cloudsMesh.rotation.y += 0.0013;
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

window.SmileyFace = SmileyFace;

// Self-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded for contact earth');
        return;
    }
    const contactContainer = document.getElementById('contact-earth-container');
    if (contactContainer) {
        window.smileyFace = new SmileyFace(contactContainer);
    }
});
