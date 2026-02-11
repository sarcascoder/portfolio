/**
 * SMILEY FACE - Exact Reference Match
 * Tall narrow eyes, eyebrows from inner corners, smile with upward hooks
 */

class SmileyFace {
    constructor(container) {
        this.container = container || document.getElementById('smiley-container');
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'smiley-container';
            document.body.appendChild(this.container);
        }
        
        // Mouse tracking
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        
        // Configuration
        this.config = {
            maxRotation: 0.6,
            smoothing: 0.08,
        };
        
        // Current rotation
        this.currentRotation = { x: 0, y: 0 };
        this.targetRotation = { x: 0, y: 0 };
        
        // Viewport center
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.createScene();
        this.createGlobeWithFace();
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
        
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width || 500;
        this.height = rect.height || 500;
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 1000);
        this.camera.position.z = 5;  // Further back = smaller smiley (was 5)
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
    

    
    updateTheme(isDark) {
        if (!this.smileyGroup) return;
        
        const gridColor = isDark ? 0x555555 : 0xaaaaaa;
        const neonColor = 0xffffff; // Always white for clouds

        // Smooth fade out
        this.fadeOut(() => {
            // Toggle face expressions after fade out
            // Left eye - slightly shorter in wink mode (now light mode)
            this.leftEye.scale.y = !isDark ? 0.82 : 1.0;
            
            // Normal face (now dark mode)
            this.rightEye.visible = isDark;
            this.rightEyebrow.visible = isDark;
            this.rightBrowCapL.visible = isDark;
            this.rightBrowCapR.visible = isDark;
            this.smile.visible = isDark;
            this.leftHook.visible = isDark;
            this.rightHook.visible = isDark;
            this.lightCapL.visible = isDark;
            this.lightCapLInner.visible = isDark;
            this.lightCapR.visible = isDark;
            this.lightCapRInner.visible = isDark;
            
            // Wink/naughty face (now light mode)
            this.winkRightEye.visible = !isDark;
            this.winkRightEyebrow.visible = !isDark;
            this.smirkSmile.visible = !isDark;
            this.smirkLeftHook.visible = !isDark;
            this.smirkRightHook.visible = !isDark;
            this.tongue.visible = !isDark;
            if (this.tongueLine) this.tongueLine.visible = !isDark;
            this.winkCapBottom.visible = !isDark;
            this.winkCapCenter.visible = !isDark;
            this.winkCapTop.visible = !isDark;
            this.smirkCapL.visible = !isDark;
            this.smirkCapLInner.visible = !isDark;
            this.smirkCapR.visible = !isDark;
            this.smirkCapRInner.visible = !isDark;

            this.smileyGroup.traverse((child) => {
                if (child.isLine || child.isMesh) {
                    if (child.material.name === 'gridMaterial') {
                        child.material.color.setHex(gridColor);
                    } else if (child.material.name === 'faceMaterial') {
                        child.material.color.setHex(neonColor);
                    }
                }
            });
            
            // Smooth fade in
            this.fadeIn();
        });
    }
    
    fadeOut(callback) {
        const duration = 500; // ms - slower transition
        const startTime = Date.now();
        const startScale = this.smileyGroup.scale.x;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out
            
            // Scale down and fade
            const scale = startScale * (1 - eased * 0.15);
            this.smileyGroup.scale.set(scale, scale, scale);
            
            // Fade opacity on all materials
            this.smileyGroup.traverse((child) => {
                if (child.material) {
                    child.material.opacity = 1 - eased * 0.7;
                    child.material.transparent = true;
                }
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                callback();
            }
        };
        animate();
    }
    
    fadeIn() {
        const duration = 700; // ms - slower transition
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Ease out
            
            // Scale back up
            const scale = 0.85 + eased * 0.15;
            this.smileyGroup.scale.set(scale, scale, scale);
            
            // Fade opacity back in
            this.smileyGroup.traverse((child) => {
                if (child.material) {
                    child.material.opacity = 0.3 + eased * 0.7;
                }
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Reset to full opacity (restore original values)
                this.smileyGroup.traverse((child) => {
                    if (child.material) {
                        if (child.material.name === 'faceMaterial' || child.material.name === 'tongueMaterial') {
                            child.material.opacity = 0.95;
                            child.material.transparent = true;
                        } else if (child.material.name === 'cloudMaterial') {
                            child.material.opacity = 0.8;
                            child.material.transparent = true;
                        } else if (child.material.name === 'earthMaterial') {
                            child.material.opacity = 1.0;
                            child.material.transparent = false;
                        }
                    }
                });
            }
        };
        animate();
    }

    generateCloudTexture() {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Fill transparent
        ctx.clearRect(0, 0, size, size);
        
        // Draw puffy clouds
        const centerX = size / 2;
        const centerY = size / 2;
        
        // Create radial gradient for soft puff
        const drawPuff = (x, y, rad) => {
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, rad);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)'); // Center white
            gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
            gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, rad, 0, Math.PI * 2);
            ctx.fill();
        };
        
        // Draw multiple puffs to create noise
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const rad = 10 + Math.random() * 20;
            drawPuff(x, y, rad);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    createGlobeWithFace() {
        this.smileyGroup = new THREE.Group();
        
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        // User requested "cloud" look -> White color
        const neonGreen = 0xffffff;
        
        // Generate cloud texture
        const cloudFaceTexture = this.generateCloudTexture();
        this.cloudFaceTexture = cloudFaceTexture; // Store for later
        
        // === REALISTIC 3D EARTH TO REPLACE WIREFRAME ===
        const earthRadius = 2.2; // Decreased from 2.6 to 2.2 based on user feedback
        const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
        
        // Load textures
        const textureLoader = new THREE.TextureLoader();
        
        // Using high-res textures from public URLs (reliable GitHub pages hosted sources)
        // Base color map
        const earthMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
        // Specular map for oceans
        const earthSpecular = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
        // Normal map for relief
        const earthNormal = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
        
        const earthMaterial = new THREE.MeshPhongMaterial({
            map: earthMap,
            specularMap: earthSpecular,
            normalMap: earthNormal,
            specular: new THREE.Color(0x333333),
            shininess: 15,
            name: 'earthMaterial'
        });
        
        this.earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        
        // Add cloud layer
        const cloudGeometry = new THREE.SphereGeometry(earthRadius + 0.02, 64, 64);
        const cloudTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');
        const cloudMaterial = new THREE.MeshPhongMaterial({
            map: cloudTexture,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            name: 'cloudMaterial'
        });
        this.cloudsMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.earthMesh.add(this.cloudsMesh);
        
        // Position Earth behind smiley faces
        // Radius 2.2, Position Z -0.6 => Front Surface Z = 1.6
        // This keeps the surface close to features (Z ~ 1.65 - 1.7)
        this.earthMesh.position.z = -0.6;
        this.earthMesh.rotation.y = -Math.PI / 2; // Show Americas/Atlantic initially

        
        // Add Earth to main group
        this.smileyGroup.add(this.earthMesh);
        this.globe = this.earthMesh; // Keep reference for rotation
        
        // === LIGHTING FOR 3D EARTH ===
        // We need lights since we're using MeshPhongMaterial now
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 3, 5);
        this.scene.add(dirLight);

        // Add a rim light for extra pop
        const rimLight = new THREE.DirectionalLight(0x4444ff, 0.5);
        rimLight.position.set(-5, 5, -5);
        this.scene.add(rimLight);

        
        // === EYES - Shorter ovals, closer together ===
        const eyeGeometry = new THREE.SphereGeometry(0.32, 25, 25);
        eyeGeometry.scale(0.7, 1.6, 0.35);  // Less tall
        
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: neonGreen,
            map: cloudFaceTexture, // Apply generated cloud texture
            transparent: true,
            opacity: 0.95, // Higher opacity because texture has transparency
            name: 'faceMaterial',
            depthWrite: false // Helps with transparency render order
        });
        
        // Left eye - closer to center (slightly shorter in dark/wink mode)
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.42, 0.15, 1.7);
        this.leftEye.scale.y = !isDark ? 0.82 : 1.0;
        this.smileyGroup.add(this.leftEye);
        
        // Right eye - closer to center (visible in light mode / normal face)
        this.rightEye = new THREE.Mesh(eyeGeometry.clone(), eyeMaterial.clone());
        this.rightEye.position.set(0.42, 0.15, 1.7);
        this.rightEye.visible = isDark;
        this.smileyGroup.add(this.rightEye);
        
        // === WINK RIGHT EYE (dark mode) - Bottom stroke of "<" chevron ===
        // Rotated 15° CCW around convergence point (0.12, 0.20)
        // using rotation matrix: x'=px+(x-px)cosθ-(y-py)sinθ, y'=py+(x-px)sinθ+(y-py)cosθ
        const winkBottomCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.92, 0.05, 1.62),     // Shortened + rotated + shifted right
            new THREE.Vector3(0.56, 0.30, 1.68),     // Control
            new THREE.Vector3(0.24, 0.20, 1.62)      // Convergence point
        );
        // Tube geometry needs more segments for smooth texture mapping
        const winkBottomGeometry = new THREE.TubeGeometry(winkBottomCurve, 32, 0.065, 12, false);
        const winkEyeMaterial = new THREE.MeshBasicMaterial({
            color: neonGreen,
            map: cloudFaceTexture,
            transparent: true,
            opacity: 0.65,
            name: 'faceMaterial',
            depthWrite: false
        });
        this.winkRightEye = new THREE.Mesh(winkBottomGeometry, winkEyeMaterial);
        this.winkRightEye.visible = !isDark;
        this.smileyGroup.add(this.winkRightEye);
        
        // Round caps for wink chevron (spheres at endpoints for smooth corners)
        const capGeometry = new THREE.SphereGeometry(0.065, 12, 12);
        const capMaterial = new THREE.MeshBasicMaterial({ 
            color: neonGreen, 
            map: cloudFaceTexture,
            transparent: true, 
            opacity: 0.95, 
            name: 'faceMaterial',
            depthWrite: false
        });
        
        // Cap at bottom stroke outer end
        this.winkCapBottom = new THREE.Mesh(capGeometry, capMaterial);
        this.winkCapBottom.position.set(0.92, 0.05, 1.62);
        this.winkCapBottom.visible = !isDark;
        this.smileyGroup.add(this.winkCapBottom);
        
        // Cap at convergence point
        this.winkCapCenter = new THREE.Mesh(capGeometry.clone(), capMaterial.clone());
        this.winkCapCenter.position.set(0.24, 0.20, 1.62);
        this.winkCapCenter.visible = !isDark;
        this.smileyGroup.add(this.winkCapCenter);
        
        // Cap at top stroke outer end
        this.winkCapTop = new THREE.Mesh(capGeometry.clone(), capMaterial.clone());
        this.winkCapTop.position.set(0.63, 0.63, 1.62);
        this.winkCapTop.visible = !isDark;
        this.smileyGroup.add(this.winkCapTop);
        
        // === LEFT EYEBROW - Simple arc shape ===
        const leftBrowCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.75, 0.85, 1.55),  // Outer left
            new THREE.Vector3(-0.42, 1.1, 1.65),   // Peak center
            new THREE.Vector3(-0.2, 0.85, 1.55)    // Inner right
        );
        const leftBrowGeometry = new THREE.TubeGeometry(leftBrowCurve, 20, 0.04, 8, false);
        const browMaterial = new THREE.MeshBasicMaterial({ 
            color: neonGreen,
            map: cloudFaceTexture,
            transparent: true,
            opacity: 0.95,
            name: 'faceMaterial',
            depthWrite: false
        });
        
        this.leftEyebrow = new THREE.Mesh(leftBrowGeometry, browMaterial);
        this.smileyGroup.add(this.leftEyebrow);
        
        // Round caps on left eyebrow
        const browCapGeo = new THREE.SphereGeometry(0.04, 10, 10);
        const browCapMat = new THREE.MeshBasicMaterial({ 
            color: neonGreen, 
            map: cloudFaceTexture,
            transparent: true, 
            opacity: 0.95, 
            name: 'faceMaterial',
            depthWrite: false
        });
        
        this.leftBrowCapL = new THREE.Mesh(browCapGeo, browCapMat);
        this.leftBrowCapL.position.set(-0.75, 0.85, 1.55);
        this.smileyGroup.add(this.leftBrowCapL);
        
        this.leftBrowCapR = new THREE.Mesh(browCapGeo.clone(), browCapMat.clone());
        this.leftBrowCapR.position.set(-0.2, 0.85, 1.55);
        this.smileyGroup.add(this.leftBrowCapR);
        
        // === RIGHT EYEBROW - Normal arc (light mode) ===
        const rightBrowCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.2, 0.85, 1.55),    // Inner left
            new THREE.Vector3(0.42, 1.1, 1.65),    // Peak center
            new THREE.Vector3(0.75, 0.85, 1.55)    // Outer right
        );
        const rightBrowGeometry = new THREE.TubeGeometry(rightBrowCurve, 20, 0.04, 8, false);
        
        this.rightEyebrow = new THREE.Mesh(rightBrowGeometry, browMaterial.clone());
        this.rightEyebrow.visible = isDark;
        this.smileyGroup.add(this.rightEyebrow);
        
        // Round caps on right eyebrow (light mode only)
        this.rightBrowCapL = new THREE.Mesh(browCapGeo.clone(), browCapMat.clone());
        this.rightBrowCapL.position.set(0.2, 0.85, 1.55);
        this.rightBrowCapL.visible = isDark;
        this.smileyGroup.add(this.rightBrowCapL);
        
        this.rightBrowCapR = new THREE.Mesh(browCapGeo.clone(), browCapMat.clone());
        this.rightBrowCapR.position.set(0.75, 0.85, 1.55);
        this.rightBrowCapR.visible = isDark;
        this.smileyGroup.add(this.rightBrowCapR);
        
        // === WINK RIGHT EYEBROW (dark mode) - Top stroke of "<" chevron ===
        // Rotated 15° CCW around convergence point (0.12, 0.20)
        const winkTopCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.63, 0.63, 1.62),     // Shortened + rotated + shifted right
            new THREE.Vector3(0.42, 0.54, 1.68),     // Control
            new THREE.Vector3(0.24, 0.20, 1.62)      // Convergence point
        );
        const winkTopGeometry = new THREE.TubeGeometry(winkTopCurve, 32, 0.065, 12, false);
        this.winkRightEyebrow = new THREE.Mesh(winkTopGeometry, browMaterial.clone());
        this.winkRightEyebrow.visible = !isDark;
        this.smileyGroup.add(this.winkRightEyebrow);
        
        // === SMILE - Wide curve (normal / light mode) ===
        const smileCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.0, -0.45, 1.4),  // Left end
            new THREE.Vector3(0, -1.7, 1.65),    // Bottom center
            new THREE.Vector3(1.0, -0.45, 1.4)    // Right end
        );
        const smileGeometry = new THREE.TubeGeometry(smileCurve, 40, 0.06, 10, false);
        const smileMaterial = new THREE.MeshBasicMaterial({ 
            color: neonGreen,
            map: cloudFaceTexture,
            transparent: true,
            opacity: 0.65,
            name: 'faceMaterial',
            depthWrite: false
        });
        
        this.smile = new THREE.Mesh(smileGeometry, smileMaterial);
        this.smile.visible = isDark;
        this.smileyGroup.add(this.smile);
        
        // === LEFT HOOK - Curved arc (normal / light mode) ===
        const leftHookCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.2, -0.5, 1.4),
            new THREE.Vector3(-1.15, -0.55, 1.40),
            new THREE.Vector3(-0.9, -0.35, 1.38)
        );
        const leftHookGeometry = new THREE.TubeGeometry(leftHookCurve, 16, 0.055, 10, false);
        this.leftHook = new THREE.Mesh(leftHookGeometry, smileMaterial.clone());
        this.leftHook.visible = isDark;
        this.smileyGroup.add(this.leftHook);
        
        // === RIGHT HOOK - Curved arc (normal / light mode) ===
        const rightHookCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(1.2, -0.5, 1.4),
            new THREE.Vector3(1.15, -0.55, 1.40),
            new THREE.Vector3(0.9, -0.35, 1.38)
        );
        const rightHookGeometry = new THREE.TubeGeometry(rightHookCurve, 16, 0.055, 10, false);
        this.rightHook = new THREE.Mesh(rightHookGeometry, smileMaterial.clone());
        this.rightHook.visible = isDark;
        this.smileyGroup.add(this.rightHook);
        
        // Round caps on light-mode smile hooks
        const lightHookCapGeo = new THREE.SphereGeometry(0.055, 10, 10);
        const lightHookCapMat = new THREE.MeshBasicMaterial({ 
            color: neonGreen, 
            map: cloudFaceTexture,
            transparent: true, 
            opacity: 0.95, 
            name: 'faceMaterial',
            depthWrite: false
        });
        
        this.lightCapL = new THREE.Mesh(lightHookCapGeo, lightHookCapMat);
        this.lightCapL.position.set(-1.2, -0.5, 1.4);
        this.lightCapL.visible = isDark;
        this.smileyGroup.add(this.lightCapL);
        
        this.lightCapLInner = new THREE.Mesh(lightHookCapGeo.clone(), lightHookCapMat.clone());
        this.lightCapLInner.position.set(-0.9, -0.35, 1.38);
        this.lightCapLInner.visible = isDark;
        this.smileyGroup.add(this.lightCapLInner);
        
        this.lightCapR = new THREE.Mesh(lightHookCapGeo.clone(), lightHookCapMat.clone());
        this.lightCapR.position.set(1.2, -0.5, 1.4);
        this.lightCapR.visible = isDark;
        this.smileyGroup.add(this.lightCapR);
        
        this.lightCapRInner = new THREE.Mesh(lightHookCapGeo.clone(), lightHookCapMat.clone());
        this.lightCapRInner.position.set(0.9, -0.35, 1.38);
        this.lightCapRInner.visible = isDark;
        this.smileyGroup.add(this.lightCapRInner);
        
        // === DARK MODE SMILE - Symmetrical (same shape as normal smile) ===
        const smirkCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.0, -0.45, 1.4),    // Left end
            new THREE.Vector3(0, -1.7, 1.65),        // Center (symmetric)
            new THREE.Vector3(1.0, -0.45, 1.4)       // Right end (matches left)
        );
        const smirkGeometry = new THREE.TubeGeometry(smirkCurve, 40, 0.06, 10, false);
        const smirkMaterial = new THREE.MeshBasicMaterial({
            color: neonGreen,
            map: cloudFaceTexture,
            transparent: true,
            opacity: 0.65,
            name: 'faceMaterial',
            depthWrite: false
        });
        this.smirkSmile = new THREE.Mesh(smirkGeometry, smirkMaterial);
        this.smirkSmile.visible = !isDark;
        this.smileyGroup.add(this.smirkSmile);
        
        // Left hook - curved arc
        const smirkLeftHookCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.2, -0.5, 1.4),
            new THREE.Vector3(-1.15, -0.55, 1.40),
            new THREE.Vector3(-0.9, -0.35, 1.38)
        );
        const smirkLeftHookGeometry = new THREE.TubeGeometry(smirkLeftHookCurve, 16, 0.055, 10, false);
        this.smirkLeftHook = new THREE.Mesh(smirkLeftHookGeometry, smirkMaterial.clone());
        this.smirkLeftHook.visible = !isDark;
        this.smileyGroup.add(this.smirkLeftHook);
        
        // Right hook - curved arc (mirrors left)
        const smirkRightHookCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(1.2, -0.5, 1.4),
            new THREE.Vector3(1.15, -0.55, 1.40),
            new THREE.Vector3(0.9, -0.35, 1.38)
        );
        const smirkRightHookGeometry = new THREE.TubeGeometry(smirkRightHookCurve, 16, 0.055, 10, false);
        this.smirkRightHook = new THREE.Mesh(smirkRightHookGeometry, smirkMaterial.clone());
        this.smirkRightHook.visible = !isDark;
        this.smileyGroup.add(this.smirkRightHook);
        
        // Round caps on dark-mode smile hook endpoints
        const hookCapGeo = new THREE.SphereGeometry(0.055, 10, 10);
        const hookCapMat = new THREE.MeshBasicMaterial({ 
            color: neonGreen, 
            map: cloudFaceTexture,
            transparent: true, 
            opacity: 0.95, 
            name: 'faceMaterial',
            depthWrite: false
        });
        
        this.smirkCapL = new THREE.Mesh(hookCapGeo, hookCapMat);
        this.smirkCapL.position.set(-1.2, -0.5, 1.4);
        this.smirkCapL.visible = !isDark;
        this.smileyGroup.add(this.smirkCapL);
        
        this.smirkCapLInner = new THREE.Mesh(hookCapGeo.clone(), hookCapMat.clone());
        this.smirkCapLInner.position.set(-0.9, -0.35, 1.38);
        this.smirkCapLInner.visible = !isDark;
        this.smileyGroup.add(this.smirkCapLInner);
        
        this.smirkCapR = new THREE.Mesh(hookCapGeo.clone(), hookCapMat.clone());
        this.smirkCapR.position.set(1.2, -0.5, 1.4);
        this.smirkCapR.visible = !isDark;
        this.smileyGroup.add(this.smirkCapR);
        
        this.smirkCapRInner = new THREE.Mesh(hookCapGeo.clone(), hookCapMat.clone());
        this.smirkCapRInner.position.set(0.9, -0.35, 1.38);
        this.smirkCapRInner.visible = !isDark;
        this.smileyGroup.add(this.smirkCapRInner);
        
        // === TONGUE (dark mode) - Filled solid half-ellipse ===
        // Using ShapeGeometry for a solid filled shape (not wireframe)
        // Mathematically: bottom half of an ellipse using cubic bezier with kappa=0.5523
        // Symmetric smile lowest point: y(0.5)=0.25*(-0.45)+0.5*(-1.7)+0.25*(-0.45)=-1.075, x=0
        // Tongue top edge must align with smile's lowest point
        const tongueShape = new THREE.Shape();
        const tw = 0.38;   // tongue half-width (wide to fill mouth)
        const th = 0.55;   // tongue height (long, prominent tongue)
        const kappa = 0.5523;  // Bezier approximation constant for quarter-circle
        
        tongueShape.moveTo(-tw, 0);                                              // Top-left
        tongueShape.bezierCurveTo(-tw, -th * kappa, -tw * kappa, -th, 0, -th);  // Left quarter-ellipse
        tongueShape.bezierCurveTo(tw * kappa, -th, tw, -th * kappa, tw, 0);     // Right quarter-ellipse
        tongueShape.lineTo(-tw, 0);                                              // Close top edge
        
        const tongueGeometry = new THREE.ShapeGeometry(tongueShape, 48);
        const tongueMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3366,
            name: 'tongueMaterial',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            depthWrite: false
        });
        this.tongue = new THREE.Mesh(tongueGeometry, tongueMaterial);
        // Position: top edge at smile's lowest point (y≈-1.0, x≈-0.13)
        this.tongue.position.set(0, -1.05, 1.68);
        this.tongue.visible = !isDark;
        this.smileyGroup.add(this.tongue);
        
        // No separate tongue line needed
        this.tongueLine = null;
        
        this.scene.add(this.smileyGroup);
    }
    
    bindEvents() {
        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = e.clientX;
            this.targetMouse.y = e.clientY;
        });
        
        window.addEventListener('themeChanged', (e) => this.updateTheme(e.detail.isDark));
        
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.targetMouse.x = e.touches[0].clientX;
                this.targetMouse.y = e.touches[0].clientY;
            }
        });
        
        window.addEventListener('resize', () => {
            this.centerX = window.innerWidth / 2;
            this.centerY = window.innerHeight / 2;
            this.onResize();
        });

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
    }
    
    onResize() {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width || 500;
        this.height = rect.height || 500;
        
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Skip rendering if not visible
        if (!this.isVisible) return;
        
        // Smooth mouse following
        this.mouse.x = this.lerp(this.mouse.x, this.targetMouse.x, 0.1);
        this.mouse.y = this.lerp(this.mouse.y, this.targetMouse.y, 0.1);
        
        // Calculate target rotation
        const offsetX = (this.mouse.x - this.centerX) / this.centerX;
        const offsetY = (this.mouse.y - this.centerY) / this.centerY;
        
        this.targetRotation.y = offsetX * this.config.maxRotation;
        this.targetRotation.x = offsetY * this.config.maxRotation;
        
        // Smooth rotation
        this.currentRotation.x = this.lerp(this.currentRotation.x, this.targetRotation.x, this.config.smoothing);
        this.currentRotation.y = this.lerp(this.currentRotation.y, this.targetRotation.y, this.config.smoothing);
        
        // Apply rotation
        if (this.smileyGroup) {
            this.smileyGroup.rotation.x = this.currentRotation.x;
            this.smileyGroup.rotation.y = this.currentRotation.y;
            
            // Auto-rotate Earth
            if (this.earthMesh) {
                this.earthMesh.rotation.y += 0.001;
            }
            // Auto-rotate Clouds (slightly faster)
            if (this.cloudsMesh) {
                this.cloudsMesh.rotation.y += 0.0013;
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    destroy() {
        this.renderer.dispose();
        this.container.innerHTML = '';
    }
}

window.SmileyFace = SmileyFace;
