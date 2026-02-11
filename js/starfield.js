/**
 * STARFIELD BACKGROUND - ROBUST EDITION
 * Features:
 * - 15,000 Stars with realistic colors (using PointsMaterial + VertexColors)
 * - CPU-based infinite wrapping (Simulated Universe)
 * - Navigation Controls (Fly/Look)
 * - Comet System
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
        
        // Camera with good draw distance
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 0, 0); // Camera stays at 0,0,0. The *world* moves around it.
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // State
        this.starsCount = 15000;
        this.worldSize = 1000;
        this.halfSize = this.worldSize / 2;
        
        // Navigation Vector (Simulated Position)
        // We don't move the camera. We shift the star positions relative to this "virtual" position.
        // Actually for CPU wrapping, it's easier to:
        // Move the points opposite to velocity. If point goes out of bounds, wrap it to other side.
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.targetVelocity = new THREE.Vector3(0, 0, 0);
        this.mouse = new THREE.Vector2(0, 0);
        
        // Physics
        this.friction = 0.96;
        this.lookSpeed = 0.05;
        this.baseSpeed = 0.5;

        // Systems
        this.createStars();
        this.createCometSystem();
        
        // Controls
        this.initControls();
        
        // Events
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('themeChanged', (e) => this.updateTheme(e.detail.isDark));
        
        // Initial Theme
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        this.updateTheme(isDark);
        
        this.animate();
    }

    createStars() {
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.starsCount * 3);
        this.colors = new Float32Array(this.starsCount * 3);
        this.sizes = new Float32Array(this.starsCount); // For size attenuation if supported? 
        // PointsMaterial supports one size. We can't easily vary size per particle without shader.
        // But we can create 2-3 layers of stars with different sizes for depth.
        // For simplicity/robustness, one layer is fine, but let's try 3 layers to make it cool.
        
        // Wait, 'sizes' attribute only works in ShaderMaterial. 
        // PointsMaterial has a global 'size'.
        // So for varying sizes, we need multiple ParticleSystems (Meshes).
        
        // Let's create 3 Layers: Small (Distant), Medium, Large (Close/Bright)
        this.starSystems = [];
        
        this.createStarLayer(10000, 1.5, 0.8); // Small, faint
        this.createStarLayer(4000, 2.5, 0.9);  // Medium
        this.createStarLayer(1000, 4.0, 1.0);  // Large
    }

    createStarLayer(count, size, opacityMultiplier) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new THREE.Color();
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.worldSize;
            positions[i * 3 + 1] = (Math.random() - 0.5) * this.worldSize;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.worldSize;
            
            // Color Logic
            color.setHex(this.getStarColor());
            // Random variation
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Texture
        const texture = this.getTexture();
        
        const material = new THREE.PointsMaterial({
            size: size,
            vertexColors: true,
            map: texture,
            transparent: true,
            opacity: 1.0 * opacityMultiplier,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        const points = new THREE.Points(geometry, material);
        // Store original properties for theme switching
        points.userData = { 
            originalOpacity: 1.0 * opacityMultiplier,
            originalSize: size
        };
        
        this.scene.add(points);
        this.starSystems.push(points);
    }
    
    getStarColor() {
        const palette = [
            0x9bb0ff, // O (Blue)
            0xaabfff, // B 
            0xcad7ff, // A
            0xffffff, // F (White)
            0xfff4ea, // G (Yellow)
            0xffd2a1, // K (Orange)
            0xffcc6f  // M (Red)
        ];
        return palette[Math.floor(Math.random() * palette.length)];
    }

    getTexture() {
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const c = size/2;
        
        const g = ctx.createRadialGradient(c,c,0, c,c,c);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.2, 'rgba(255,255,255,0.8)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = g;
        ctx.fillRect(0,0,size,size);
        
        return new THREE.CanvasTexture(canvas);
    }

    // --- Comets ---
    createCometSystem() {
        this.comets = [];
        this.cometSpawnTimer = 0;
        this.cometTexture = this.getCometTexture();
    }
    
    getCometTexture() {
        const w = 64, h = 16;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        
        const g = ctx.createLinearGradient(0,0,w,0);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.1)');
        g.addColorStop(1, 'rgba(255,255,255,1)');
        
        ctx.fillStyle = g;
        ctx.fillRect(0,0,w,h);
        return new THREE.CanvasTexture(canvas);
    }
    
    spawnComet() {
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({
            map: this.cometTexture,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        
        // Spawn randomly around
        const dist = 100 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        mesh.position.setFromSphericalCoords(dist, phi, theta);
        
        // Velocity (Crosses the view)
        // Aim roughly at center but miss slightly
        const target = new THREE.Vector3(
            (Math.random()-0.5)*50,
            (Math.random()-0.5)*50,
            (Math.random()-0.5)*50
        );
        const velocity = target.sub(mesh.position).normalize().multiplyScalar(2 + Math.random() * 4);
        
        // Orient to velocity
        mesh.lookAt(mesh.position.clone().add(velocity));
        mesh.scale.set(40, 1, 1); // Stretch
        
        mesh.userData = { velocity: velocity, life: 1.0 };
        this.scene.add(mesh);
        this.comets.push(mesh);
    }

    updateComets() {
        this.cometSpawnTimer++;
        if (this.cometSpawnTimer > 100 && Math.random() > 0.5) {
            this.spawnComet();
            this.cometSpawnTimer = 0;
        }

        for (let i = this.comets.length - 1; i >= 0; i--) {
            const c = this.comets[i];
            c.position.add(c.userData.velocity);
            
            // Wrap comets too? simpler to just let them die.
            c.userData.life -= 0.01;
            c.material.opacity = Math.sin(c.userData.life * Math.PI); // Fade in/out
            
            if (c.userData.life <= 0) {
                this.scene.remove(c);
                c.geometry.dispose();
                c.material.dispose();
                this.comets.splice(i, 1);
            }
        }
    }

    // --- Controls ---
    initControls() {
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        document.addEventListener('keydown', (e) => {
            const step = 2.0;
            switch(e.key.toLowerCase()) {
                case 'w': case 'arrowup': this.targetVelocity.z -= step; break;
                case 's': case 'arrowdown': this.targetVelocity.z += step; break;
                case 'a': case 'arrowleft': this.targetVelocity.x -= step; break;
                case 'd': case 'arrowright': this.targetVelocity.x += step; break;
                case 'shift': this.targetVelocity.multiplyScalar(2.0); break;
            }
        });
        
        document.addEventListener('wheel', (e) => {
            // Sync with Lenis scroll speed (0.35)
            // Original factor was 0.05. New factor: 0.05 * 0.35 = 0.0175
            this.targetVelocity.z += e.deltaY * 0.00075;
        }, { passive: true });
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    updateTheme(isDark) {
        if (!this.starSystems) return;
        
        this.starSystems.forEach(points => {
             if (isDark) {
                 // DARK MODE: Bright stars, glowing additives
                 points.material.color.setHex(0xffffff); // White multiplier (keeps original color)
                 points.material.blending = THREE.AdditiveBlending;
                 points.material.opacity = points.userData.originalOpacity;
                 points.material.size = points.userData.originalSize;
             } else {
                 // LIGHT MODE: Dark stars for contrast
                 // Multiply with dark grey to turn light colors (white/blue) into dark grey/navy
                 points.material.color.setHex(0x444444); 
                 points.material.blending = THREE.NormalBlending; // Normal blend to show darkness
                 points.material.opacity = 0.8; // High opacity
                 // Increase size to make them more visible
                 points.material.size = points.userData.originalSize * 1.5;
             }
             points.material.needsUpdate = true;
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Physics
        this.velocity.lerp(this.targetVelocity, 0.05);
        this.targetVelocity.multiplyScalar(this.friction);
        
        // Camera Look
        const lookX = this.mouse.y * 1.0;
        const lookY = -this.mouse.x * 1.0;
        this.camera.rotation.x += (lookX - this.camera.rotation.x) * this.lookSpeed;
        this.camera.rotation.y += (lookY - this.camera.rotation.y) * this.lookSpeed;
        
        // MAIN FEATURE: Move the Universe (Infinite Wrap)
        // Instead of moving Camera, we move the Stars opposite to velocity
        // transform velocity to world space based on rotation
        const moveVec = this.velocity.clone().negate(); // Move stars opposite
        moveVec.applyEuler(this.camera.rotation); 
        
        // Apply movement to all star layers
        if (this.starSystems) {
            this.starSystems.forEach(points => {
                const posAttr = points.geometry.attributes.position;
                const arr = posAttr.array;
                
                for (let i = 0; i < arr.length; i += 3) {
                    arr[i] += moveVec.x;
                    arr[i+1] += moveVec.y;
                    arr[i+2] += moveVec.z;
                    
                    // Wrapping Logic
                    // If > halfSize, subtract worldSize
                    if (arr[i] > this.halfSize) arr[i] -= this.worldSize;
                    if (arr[i] < -this.halfSize) arr[i] += this.worldSize;
                    
                    if (arr[i+1] > this.halfSize) arr[i+1] -= this.worldSize;
                    if (arr[i+1] < -this.halfSize) arr[i+1] += this.worldSize;
                    
                    if (arr[i+2] > this.halfSize) arr[i+2] -= this.worldSize;
                    if (arr[i+2] < -this.halfSize) arr[i+2] += this.worldSize;
                }
                
                posAttr.needsUpdate = true;
            });
        }

        // Update Comets
        this.updateComets();

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (typeof THREE !== 'undefined') {
        new Starfield();
    } else {
        setTimeout(() => {
             if (typeof THREE !== 'undefined') new Starfield();
        }, 100);
    }
});
