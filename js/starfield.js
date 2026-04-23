/**
 * STARFIELD BACKGROUND - ROBUST EDITION
 * Features:
 * - ~8,000 Stars with realistic colors (using PointsMaterial + VertexColors)
 * - CPU-based infinite wrapping (Simulated Universe)
 * - Navigation Controls (Fly/Look)
 * - Comet System
 *
 * Uses the bundled (Vite-resolved) Three.js so we don't double-load — the
 * CDN copy has been removed from the HTML.
 */

import {
    AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, Mesh, MeshBasicMaterial, NormalBlending, PerspectiveCamera, PlaneGeometry, Points, PointsMaterial, Scene, Vector2, Vector3, WebGLRenderer
} from 'three';

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
        this.isMobile = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
        this.frameInterval = this.isMobile ? 1000 / 30 : 1000 / 60;
        this.lastFrameTime = 0;

        // Render-gating state: skip the per-frame CPU star-wrap + GPU draw
        // when the user can't see the starfield anyway. This is the single
        // biggest heat-saver — the hot loop iterates thousands of star
        // coordinates every frame.
        this.isPageVisible = document.visibilityState !== 'hidden';
        this.isUniverseCovering = document.body.classList.contains('universe-mode');

        // Scene setup
        this.scene = new Scene();

        // Camera with good draw distance
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 0, 0); // Camera stays at 0,0,0. The *world* moves around it.

        this.renderer = new WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: !this.isMobile,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Pixel ratio 1.5 (was 1.75) — Retina draws ~30% fewer pixels with no
        // visible quality loss at this density.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1 : 1.5));

        // State — reduced desktop count from 15k → 8k. Star density still
        // feels dense; no visible regression at 1080p/1440p.
        this.starsCount = this.isMobile ? 5000 : 8000;
        this.worldSize = 1000;
        this.halfSize = this.worldSize / 2;
        
        // Navigation Vector (Simulated Position)
        // We don't move the camera. We shift the star positions relative to this "virtual" position.
        // Actually for CPU wrapping, it's easier to:
        // Move the points opposite to velocity. If point goes out of bounds, wrap it to other side.
        this.velocity = new Vector3(0, 0, 0);
        this.targetVelocity = new Vector3(0, 0, 0);
        this.mouse = new Vector2(0, 0);
        
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

        // Pause rendering entirely when the tab is backgrounded or when the
        // universe reveal is covering the starfield — no point spending CPU
        // on a canvas the user can't see.
        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = document.visibilityState !== 'hidden';
        });
        const bodyObserver = new MutationObserver(() => {
            this.isUniverseCovering = document.body.classList.contains('universe-mode');
        });
        bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Initial Theme
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        this.updateTheme(isDark);

        this.animate();
    }

    createStars() {
        this.geometry = new BufferGeometry();
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
        
        if (this.isMobile) {
            this.createStarLayer(3200, 1.15, 0.65);
            this.createStarLayer(1400, 1.9, 0.75);
            this.createStarLayer(400, 3.0, 0.85);
        } else {
            // Reduced 10k/4k/1k → 5.2k/2.2k/600 (same density ratio) — still
            // reads as a dense starfield but ~46% less per-frame CPU work.
            this.createStarLayer(5200, 1.5, 0.8); // Small, faint
            this.createStarLayer(2200, 2.5, 0.9); // Medium
            this.createStarLayer(600, 4.0, 1.0);  // Large
        }
    }

    createStarLayer(count, size, opacityMultiplier) {
        const geometry = new BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const color = new Color();

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.worldSize;
            positions[i * 3 + 1] = (Math.random() - 0.5) * this.worldSize;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.worldSize;

            color.setHex(this.getStarColor());
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new BufferAttribute(positions, 3));
        geometry.setAttribute('color', new BufferAttribute(colors, 3));

        const texture = this.getTexture();

        const material = new PointsMaterial({
            size: size,
            vertexColors: true,
            map: texture,
            transparent: true,
            opacity: 1.0 * opacityMultiplier,
            depthWrite: false,
            blending: AdditiveBlending,
            sizeAttenuation: true
        });

        // GPU drift: inject a wrap-around transform into the PointsMaterial
        // vertex shader. The position buffer stays STATIC — every frame we
        // just update a single vec3 uniform, and the GPU computes each star's
        // wrapped position via `mod()`. Eliminates the per-frame CPU loop
        // over ~8000 star coordinates and the ~96KB GPU buffer upload that
        // used to happen every frame.
        const driftUniform = { value: new Vector3() };
        const halfUniform = { value: this.halfSize };
        const worldUniform = { value: this.worldSize };
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTotalDrift = driftUniform;
            shader.uniforms.uHalfSize = halfUniform;
            shader.uniforms.uWorldSize = worldUniform;
            shader.vertexShader = shader.vertexShader
                .replace(
                    'void main() {',
                    'uniform vec3 uTotalDrift; uniform float uHalfSize; uniform float uWorldSize;\nvoid main() {'
                )
                .replace(
                    '#include <begin_vertex>',
                    // Apply the accumulated drift and wrap each axis back into
                    // the cube via mod(). Replaces the `vec3 transformed = vec3(position)`
                    // that begin_vertex normally defines.
                    'vec3 transformed = mod(position - uTotalDrift + vec3(uHalfSize), vec3(uWorldSize)) - vec3(uHalfSize);'
                );
            material.userData.driftUniform = driftUniform;
        };

        const points = new Points(geometry, material);
        points.userData = {
            originalOpacity: 1.0 * opacityMultiplier,
            originalSize: size,
            driftUniform
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
        
        return new CanvasTexture(canvas);
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
        return new CanvasTexture(canvas);
    }
    
    spawnComet() {
        const geo = new PlaneGeometry(1, 1);
        const mat = new MeshBasicMaterial({
            map: this.cometTexture,
            transparent: true,
            opacity: 0,
            blending: AdditiveBlending,
            side: DoubleSide,
            depthWrite: false
        });
        const mesh = new Mesh(geo, mat);
        
        // Spawn randomly around
        const dist = 100 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        mesh.position.setFromSphericalCoords(dist, phi, theta);
        
        // Velocity (Crosses the view)
        // Aim roughly at center but miss slightly
        const target = new Vector3(
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
        // Mobile: spawn less often and less aggressively to keep FPS up
        const spawnThreshold = this.isMobile ? 220 : 100;
        const spawnChance = this.isMobile ? 0.75 : 0.5;
        if (this.cometSpawnTimer > spawnThreshold && Math.random() > spawnChance) {
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
        // Activity tracker — any input resets this. The animate loop checks
        // it to decide whether to run full 60fps + ambient drift, or drop to
        // 30fps + freeze drift when idle.
        this.lastActivityTime = performance.now();
        const bump = () => { this.lastActivityTime = performance.now(); };

        if (!this.isMobile) {
            document.addEventListener('mousemove', (e) => {
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                bump();
            });
        } else {
            // Touch: drag finger to pan the camera through the stars
            document.addEventListener('touchmove', (e) => {
                const t = e.touches?.[0];
                if (!t) return;
                this.mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
                bump();
            }, { passive: true });

            // Scroll-synced forward boost using scroll position (wheel events rarely fire on mobile)
            let lastScrollY = window.scrollY || 0;
            window.addEventListener('scroll', () => {
                const y = window.scrollY || 0;
                const delta = y - lastScrollY;
                lastScrollY = y;
                this.targetVelocity.z += delta * 0.0008;
                bump();
            }, { passive: true });
        }

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
            this.targetVelocity.z += e.deltaY * (this.isMobile ? 0.00045 : 0.00075);
            bump();
        }, { passive: true });
    }

    onResize() {
        this.isMobile = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
        this.frameInterval = this.isMobile ? 1000 / 30 : 1000 / 60;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1 : 1.75));
    }
    
    updateTheme(isDark) {
        if (!this.starSystems) return;
        
        this.starSystems.forEach(points => {
             if (isDark) {
                 // DARK MODE: Bright stars, glowing additives
                 points.material.color.setHex(0xffffff); // White multiplier (keeps original color)
                 points.material.blending = AdditiveBlending;
                 points.material.opacity = points.userData.originalOpacity;
                 points.material.size = points.userData.originalSize;
             } else {
                 // LIGHT MODE: Dark stars for contrast
                 // Multiply with dark grey to turn light colors (white/blue) into dark grey/navy
                 points.material.color.setHex(0x444444); 
                 points.material.blending = NormalBlending; // Normal blend to show darkness
                 points.material.opacity = 0.8; // High opacity
                 // Increase size to make them more visible
                 points.material.size = points.userData.originalSize * 1.5;
             }
             points.material.needsUpdate = true;
        });
    }

    animate(now = 0) {
        requestAnimationFrame((time) => this.animate(time));

        // Idle throttle: after 2s with no wheel/scroll/mousemove/touch input,
        // drop from 60fps → 30fps on desktop. At this drift speed the passive
        // motion is indistinguishable between the two rates; the moment
        // the user touches the page we're back to full-rate via bump().
        const idleFor = now - (this.lastActivityTime || 0);
        const isIdle = idleFor > 2000;
        const interval = (isIdle && !this.isMobile) ? 1000 / 30 : this.frameInterval;
        if (now - this.lastFrameTime < interval) {
            return;
        }
        this.lastFrameTime = now;

        // Skip ALL work (CPU star-wrap loop + GPU draw) while the starfield
        // isn't actually visible. Biggest single heat-saver on a Retina
        // Mac — the inner loop iterates ~8000 stars per layer per frame.
        if (!this.isPageVisible || this.isUniverseCovering) return;

        // Physics
        this.velocity.lerp(this.targetVelocity, 0.05);
        this.targetVelocity.multiplyScalar(this.friction);

        // Ambient drift only runs while the user is active. Once idle, velocity
        // decays via friction → stars gently settle to stationary → the
        // dirty-flag check below skips the GPU draw. Any input wakes it back up.
        if (!isIdle) {
            const ambientDrift = this.isMobile ? 0.35 : 0.18;
            this.velocity.z += ambientDrift * 0.01;
            const t = performance.now() * 0.0002;
            this.velocity.x += Math.sin(t) * 0.004;
            this.velocity.y += Math.cos(t * 0.8) * 0.003;
        }

        // Camera Look — stronger on mobile so touch panning has presence
        const lookX = this.mouse.y * (this.isMobile ? 0.75 : 1.0);
        const lookY = -this.mouse.x * (this.isMobile ? 0.75 : 1.0);
        this.camera.rotation.x += (lookX - this.camera.rotation.x) * this.lookSpeed;
        this.camera.rotation.y += (lookY - this.camera.rotation.y) * this.lookSpeed;

        // MAIN FEATURE: Move the Universe (Infinite Wrap)
        // Instead of moving Camera, we move the Stars opposite to velocity
        // transform velocity to world space based on rotation
        const moveVec = this.velocity.clone().negate(); // Move stars opposite
        moveVec.applyEuler(this.camera.rotation);

        // GPU-driven drift: for each layer, advance its uTotalDrift uniform by
        // moveVec. One vec3 add per layer replaces the 8000-iteration per-frame
        // CPU loop + 96KB buffer upload that used to happen here. Wrapping is
        // computed on the GPU inside the vertex shader (see createStarLayer).
        if (this.starSystems) {
            for (let i = 0; i < this.starSystems.length; i++) {
                const u = this.starSystems[i].userData.driftUniform;
                if (u) u.value.add(moveVec);
            }
        }

        // Update Comets (throttled on mobile via spawn rates in updateComets)
        this.updateComets();

        // Dirty-flag render: if the universe isn't moving, nothing has changed
        // on screen, so skip the WebGL draw call entirely. The scene is dirty
        // when velocity is non-trivial, camera is still settling, or a comet
        // is alive (comets move independently of velocity).
        const velLenSq =
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z;
        const camMoved =
            this._lastCamX === undefined ||
            Math.abs(this.camera.rotation.x - this._lastCamX) > 0.00015 ||
            Math.abs(this.camera.rotation.y - this._lastCamY) > 0.00015;
        const hasLiveComets = (this.comets && this.comets.length > 0);

        if (velLenSq > 0.00004 || camMoved || hasLiveComets) {
            this._lastCamX = this.camera.rotation.x;
            this._lastCamY = this.camera.rotation.y;
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Initialize — deferred until the rocket loader dismisses (i.e. body no longer
// has .loading-active) and the first contentful paint has happened. This keeps
// the starfield's ~30-50ms of Three.js scene setup off the critical path on
// first visit. The loading screen has its own CSS-only starfield so there's
// no visible gap.
function bootStarfield() {
    if (typeof window !== 'undefined' && !window.__starfieldBooted) {
        window.__starfieldBooted = true;
        new Starfield();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // If the loading screen is already gone, boot on idle.
    const loaderDismissed = !document.body.classList.contains('loading-active');
    const deferBoot = () => {
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(bootStarfield, { timeout: 1500 });
        } else {
            setTimeout(bootStarfield, 50);
        }
    };

    if (loaderDismissed) {
        deferBoot();
        return;
    }

    // Otherwise wait for the loader to dismiss via the loading-active class
    // toggle (set by the rocket loader). Fallback: 8-second safety window.
    let fired = false;
    const mo = new MutationObserver(() => {
        if (fired) return;
        if (!document.body.classList.contains('loading-active')) {
            fired = true;
            mo.disconnect();
            deferBoot();
        }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    setTimeout(() => {
        if (!fired) { fired = true; mo.disconnect(); deferBoot(); }
    }, 8000);
});
