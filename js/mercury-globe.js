/**
 * MERCURY GLOBE - Real NASA 3D Mercury GLB Model
 * Loads mercury.glb and renders with proper PBR lighting
 * Includes Smiley Face overlay
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { generateIceTexture } from './ice-texture.js';

class MercuryGlobe {
    constructor(container) {
        this.container = container || document.getElementById('mercury-container');
        
        if (!this.container) {
            console.error('Mercury container not found');
            const fallback = document.createElement('div');
            fallback.id = 'mercury-container';
            document.body.appendChild(fallback);
            this.container = fallback;
        }
        
        // Mouse will be initialized to screen center in init()
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        
        this.config = {
            maxRotation: 0.55,
            smoothing: 0.12,
        };
        
        this.currentRotation = { x: 0, y: 0 };
        this.targetRotation = { x: 0, y: 0 };
        
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;

        // Bigger Mercury globe
        this.targetRadius = 2.5;

        // Theme Transition State
        this.themeProgress = 0; // 0 = Light, 1 = Dark
        this.targetThemeProgress = 1; // Default target

        // Eyebrow Animation State
        this.eyebrowOffset = 0;
        this.targetEyebrowOffset = 0;

        this.init();
    }
    
    init() {
        // Mobile Detection
        this.isMobile = window.innerWidth <= 768;

        // Track model loading state
        this.modelLoaded = false;
        this._scrollAnimSetup = false;
        
        // Visibility Tracking
        this.isVisible = true;
        this.isRunning = true;
        
        // Warm-up phase: suppress all motion until everything is stable
        this._warmupComplete = false;
        this._warmupFrames = 0;

        // Initialize mouse to screen center so first frames don't snap
        this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.targetMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        this.setupCanvas();
        this.createScene();
        this.createLighting();
        this.loadMercuryModel();
        this.createSmileyFace();
        // NOTE: setupScrollAnimation is now deferred until model is loaded
        this.bindEvents();
        this.animate();
    }
    
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'mercury-canvas';
        // Ensure no debug border/outline shows up around the hero globe canvas
        this.canvas.style.cssText = 'width:100%;height:100%;display:block;border:0;outline:none;box-shadow:none;background:transparent;';
        this.container.appendChild(this.canvas);

        // Safety net: if the container ever had a debug outline/border, kill it too
        this.container.style.outline = 'none';
        this.container.style.border = '0';
        this.container.style.boxShadow = 'none';
        
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width || 100;
        this.height = rect.height || 100;
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 1000);
        this.camera.position.z = 6;
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.physicallyCorrectLights = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.mercuryGroup = new THREE.Group();
        this.scene.add(this.mercuryGroup);

        this.spinGroup = new THREE.Group();
        this.mercuryGroup.add(this.spinGroup);
    }

    createLighting() {
        const sunLight = new THREE.DirectionalLight(0xfff8ee, 3.0);
        sunLight.position.set(5, 3, 5);
        this.scene.add(sunLight);
        
        const fillLight = new THREE.DirectionalLight(0xc8d8ff, 1.0);
        fillLight.position.set(-4, -1, 3);
        this.scene.add(fillLight);
        
        const rimLight = new THREE.DirectionalLight(0x6688cc, 0.7);
        rimLight.position.set(-2, 2, -5);
        this.scene.add(rimLight);
        
        const bottomLight = new THREE.DirectionalLight(0x8899aa, 0.4);
        bottomLight.position.set(0, -5, 2);
        this.scene.add(bottomLight);
        
        const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x445566, 0.7);
        this.scene.add(hemiLight);
        
        const ambientLight = new THREE.AmbientLight(0x555566, 0.5);
        this.scene.add(ambientLight);
    }

    loadMercuryModel() {
        const loader = new GLTFLoader();

        loader.load(
            '/mercury.glb',
            (gltf) => {
                this.mercuryModel = gltf.scene;

                const box = new THREE.Box3().setFromObject(this.mercuryModel);
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = (this.targetRadius * 2) / maxDim;
                this.mercuryModel.scale.setScalar(scale);

                box.setFromObject(this.mercuryModel);
                const center = new THREE.Vector3();
                box.getCenter(center);
                this.mercuryModel.position.sub(center);

                this.mercuryPivot = new THREE.Group();
                this.mercuryPivot.add(this.mercuryModel);
                this.mercuryPivot.rotation.y = Math.PI;

                const finalBox = new THREE.Box3().setFromObject(this.mercuryPivot);
                const finalCenter = new THREE.Vector3();
                finalBox.getCenter(finalCenter);
                this.mercuryPivot.position.sub(finalCenter);

                this.mercuryModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        // Ensure correct color space for texture
                        if (child.material.map) {
                            child.material.map.colorSpace = THREE.SRGBColorSpace;
                            child.material.map.needsUpdate = true;
                        }
                        // Keep the model's own PBR values but ensure it looks good
                        child.material.needsUpdate = true;
                    }
                });

                this.spinGroup.add(this.mercuryPivot);
                this.mercurySurface = this.mercuryModel;

                // Model loaded — now set up scroll animations
                this.modelLoaded = true;
                this._onModelReady();
            },
            undefined,
            (err) => {
                console.error('Failed to load mercury.glb, creating fallback sphere:', err);
                this.createFallbackSphere();

                // Fallback also counts as ready
                this.modelLoaded = true;
                this._onModelReady();
            }
        );
    }

    /**
     * Called after the mercury model (or fallback) is ready.
     * Runs a multi-step warm-up sequence so everything is stable before the user can interact.
     */
    _onModelReady() {
        // Render one frame so the globe is visible
        this.renderer.render(this.scene, this.camera);

        // DEBUG: Trace initialization
        console.log("MercuryGlobe: _onModelReady", {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: this.isMobile
        });

        // Step 1: Set explicit GSAP initial state on the container BEFORE creating ScrollTriggers.
        // This eliminates the "GSAP doesn't know the starting position" problem.
        if (typeof gsap !== 'undefined') {
            if (window.innerWidth > 768) {
                console.log("MercuryGlobe: Applying DESKTOP initial state");
                gsap.set(this.container, {
                    left: "4vw",
                    top: "50%",
                    yPercent: -50,
                    x: 0, // Clear any potential pixel values parsed from CSS
                    y: 0, // Clear any potential pixel values parsed from CSS
                    scale: 1,
                    opacity: 1,
                    clearProps: "" // don't clear — keep these as the known state
                });
            } else {
                console.log("MercuryGlobe: Applying MOBILE initial state");
                gsap.set(this.container, {
                    left: "50%",
                    top: "35%",
                    xPercent: -50,
                    yPercent: -50,
                    x: 0, // Clear any potential pixel values parsed from CSS
                    y: 0, // Clear any potential pixel values parsed from CSS
                    scale: 1,
                    opacity: 1
                });
            }
            console.log("MercuryGlobe: Container style after init:", this.container.style.cssText);
        }

        // Step 2: Set up scroll animations now that the container has a known GSAP state
        if (!this._scrollAnimSetup) {
            this._scrollAnimSetup = true;
            this.setupScrollAnimation();
        }

        // Step 3: Wait for layout to fully settle, then refresh ScrollTrigger,
        // THEN dismiss loading screen — so positions are 100% correct before user can scroll.
        // Use double-rAF to guarantee the browser has painted the layout.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (typeof ScrollTrigger !== 'undefined') {
                    ScrollTrigger.refresh(true);
                }

                // Step 4: Start warm-up phase (a few rendered frames with correct positions
                // before we reveal to the user)
                this._warmupFrames = 0;
                this._warmupComplete = false;

                const warmupTick = () => {
                    this._warmupFrames++;
                    if (this._warmupFrames < 10) {
                        // Render a few frames to let lerps converge
                        requestAnimationFrame(warmupTick);
                    } else {
                        // Everything is stable — dismiss loading screen
                        this._warmupComplete = true;
                        this._dismissLoadingScreen();
                        
                        // DEBUG: Final check
                        console.log("MercuryGlobe: Warmup complete. Final container style:", {
                            top: this.container.style.top,
                            transform: this.container.style.transform,
                            rect: this.container.getBoundingClientRect()
                        });
                    }
                };
                requestAnimationFrame(warmupTick);
            });
        });
    }

    /**
     * Smoothly dismisses the loading screen and unlocks scrolling.
     */
    _dismissLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                document.body.classList.remove('loading-active');

                // One final ScrollTrigger refresh after loading screen is removed from layout
                if (typeof ScrollTrigger !== 'undefined') {
                    ScrollTrigger.refresh(true);
                }
            }, 600);
        } else {
            document.body.classList.remove('loading-active');
        }
    }

    createFallbackSphere() {
        const radius = this.targetRadius;
        const geometry = new THREE.SphereGeometry(radius, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, roughness: 0.85, metalness: 0.08,
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.spinGroup.add(this.mesh);
        this.mercurySurface = this.mesh;
    }

    setupScrollAnimation() {
        // Ensure GSAP is loaded
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.warn('GSAP or ScrollTrigger not loaded');
            return;
        }

        let mm = gsap.matchMedia();

        // === DESKTOP ANIMATION (> 768px) ===
        mm.add("(min-width: 769px)", () => {

            // Initial State Check (desktop) — keep consistent with the original movement
            gsap.set(this.container, {
                left: "4vw",
                top: "50%",
                yPercent: -50,
                scale: 1,
                opacity: 1
            });

            // --- Transition to About Section ---
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: "#about-section",
                    start: "top bottom",
                    end: "center center",
                    scrub: 0.5,
                    toggleActions: "play reverse play reverse"
                }
            });

            tl.to(this.container, {
                scale: 0.85,
                top: "60%",
                duration: 1,
                ease: "power1.inOut"
            });

            tl.to(this.container, {
                left: "50%",
                top: "50%",
                scale: 0.65,
                duration: 2,
                ease: "power2.inOut"
            });

            // --- Transition to Featured/Projects Section ---
            const tlProjects = gsap.timeline({
                scrollTrigger: {
                    trigger: "#projects-section",
                    start: "top bottom",
                    end: "center center",
                    scrub: 0.5,
                    toggleActions: "play reverse play reverse"
                }
            });
            tlProjects.to(this.container, {
                left: "0%",
                top: "50%",
                scale: 0.5,
                ease: "power2.inOut"
            });

            // --- Transition to Services Section ---
            const tlServices = gsap.timeline({
                scrollTrigger: {
                    trigger: "#services-section",
                    start: "top bottom",
                    end: "center center",
                    scrub: 0.5,
                    toggleActions: "play reverse play reverse"
                }
            });

            tlServices.to(this.container, {
                left: "60%",
                top: "50%",
                scale: 0.75,
                ease: "power2.inOut"
            });

            // --- Transition to Contact Section ---
            const tlContact = gsap.timeline({
                scrollTrigger: {
                    trigger: "#contact",
                    start: "top bottom",
                    end: "bottom bottom",
                    scrub: 0.5,
                    toggleActions: "play reverse play reverse"
                }
            });

            tlContact.to(this.container, {
                scale: 0.9,
                left: "50%",
                ease: "power2.inOut"
            });
        });

        // === MOBILE ANIMATION (<= 768px) ===
        mm.add("(max-width: 768px)", () => {

            // Initial State Check (mobile) — matches the original working behavior
            gsap.set(this.container, {
                left: "50%",
                top: "35%",
                xPercent: -50,
                yPercent: -50,
                scale: 1,
                opacity: 1
            });

            const tlMobile = gsap.timeline({
                scrollTrigger: {
                    trigger: "body",
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.5
                }
            });

            tlMobile.to(this.container, {
                top: "50%",
                scale: 0.6,
                opacity: 0.3,
                ease: "none"
            });
        });

        // Force a refresh to ensure start positions are calculated correctly if starting mid-page
        setTimeout(() => {
            ScrollTrigger.refresh();
        }, 100);
    }
    
    createSmileyFace() {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        // Smiley styling (easy to tweak): use RGB 0-255 so you can adjust quickly
        // Fill (smiley face lines)
        const FACE_FILL_RGB = { r: 0, g: 0, b: 0 };
        // Glow (outer neon)
        const FACE_GLOW_RGB = { r: 0, g: 234, b: 255 };

        const faceFill = new THREE.Color(
            FACE_FILL_RGB.r / 255,
            FACE_FILL_RGB.g / 255,
            FACE_FILL_RGB.b / 255
        );
        const faceGlow = new THREE.Color(
            FACE_GLOW_RGB.r / 255,
            FACE_GLOW_RGB.g / 255,
            FACE_GLOW_RGB.b / 255
        );

        this.iceFaceTexture = generateIceTexture({ size: 512, repeat: 1.6 });
        const s = 0.99;
        const faceZ = (this.targetRadius + 0.02) * 1.0;

        // === EYES ===
        const eyeGeometry = new THREE.SphereGeometry(0.32 * s, 25, 25);
        eyeGeometry.scale(0.7, 1.6, 0.35);
        const eyeMaterial = new THREE.MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const eyeGlowMaterial = new THREE.MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.55,
            side: THREE.BackSide,
            depthWrite: false
        });
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.42 * s, 0.15 * s, faceZ);
        this.leftEye.scale.y = !isDark ? 0.82 : 1.0;
        this.spinGroup.add(this.leftEye);

    this.leftEyeGlow = new THREE.Mesh(eyeGeometry.clone(), eyeGlowMaterial);
    this.leftEyeGlow.position.copy(this.leftEye.position);
    this.leftEyeGlow.scale.copy(this.leftEye.scale);
    this.leftEyeGlow.scale.multiplyScalar(1.12);
    this.leftEyeGlow.position.z = faceZ - 0.01;
    this.spinGroup.add(this.leftEyeGlow);
        
        this.rightEye = new THREE.Mesh(eyeGeometry.clone(), eyeMaterial.clone());
        this.rightEye.position.set(0.42 * s, 0.15 * s, faceZ);
        this.rightEye.visible = isDark;
        this.spinGroup.add(this.rightEye);

    this.rightEyeGlow = new THREE.Mesh(eyeGeometry.clone(), eyeGlowMaterial.clone());
    this.rightEyeGlow.position.copy(this.rightEye.position);
    this.rightEyeGlow.scale.copy(this.rightEye.scale);
    this.rightEyeGlow.scale.multiplyScalar(1.12);
    this.rightEyeGlow.position.z = faceZ - 0.01;
    this.rightEyeGlow.visible = isDark;
    this.spinGroup.add(this.rightEyeGlow);

        // === WINK RIGHT EYE ===
        const winkBottomCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.92 * s, 0.05 * s, faceZ - 0.08 * s),
            new THREE.Vector3(0.56 * s, 0.30 * s, faceZ - 0.02 * s),
            new THREE.Vector3(0.24 * s, 0.20 * s, faceZ - 0.08 * s)
        );
        const winkEyeMaterial = new THREE.MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const winkGlowMaterial = new THREE.MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.38,
            side: THREE.BackSide,
            depthWrite: false
        });
        this.winkRightEye = new THREE.Mesh(
            new THREE.TubeGeometry(winkBottomCurve, 32, 0.065 * s, 12, false), winkEyeMaterial
        );
        this.winkRightEye.visible = !isDark;
        this.spinGroup.add(this.winkRightEye);

        this.winkRightEyeGlow = new THREE.Mesh(
            new THREE.TubeGeometry(winkBottomCurve, 32, 0.085 * s, 12, false),
            winkGlowMaterial
        );
        this.winkRightEyeGlow.visible = !isDark;
        this.spinGroup.add(this.winkRightEyeGlow);

        const capGeometry = new THREE.SphereGeometry(0.065 * s, 12, 12);
        const capMaterial = new THREE.MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const capGlowMaterial = new THREE.MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.45,
            side: THREE.BackSide,
            depthWrite: false
        });
        
        this.winkCapBottom = new THREE.Mesh(capGeometry, capMaterial);
        this.winkCapBottom.position.set(0.92 * s, 0.05 * s, faceZ - 0.08 * s);
        this.winkCapBottom.visible = !isDark;
        this.spinGroup.add(this.winkCapBottom);

    this.winkCapBottomGlow = new THREE.Mesh(capGeometry.clone(), capGlowMaterial);
    this.winkCapBottomGlow.position.copy(this.winkCapBottom.position);
    this.winkCapBottomGlow.scale.multiplyScalar(1.25);
    this.winkCapBottomGlow.position.z -= 0.01;
    this.winkCapBottomGlow.visible = !isDark;
    this.spinGroup.add(this.winkCapBottomGlow);
        
        this.winkCapCenter = new THREE.Mesh(capGeometry.clone(), capMaterial.clone());
        this.winkCapCenter.position.set(0.24 * s, 0.20 * s, faceZ - 0.08 * s);
        this.winkCapCenter.visible = !isDark;
        this.spinGroup.add(this.winkCapCenter);

    this.winkCapCenterGlow = new THREE.Mesh(capGeometry.clone(), capGlowMaterial.clone());
    this.winkCapCenterGlow.position.copy(this.winkCapCenter.position);
    this.winkCapCenterGlow.scale.multiplyScalar(1.25);
    this.winkCapCenterGlow.position.z -= 0.01;
    this.winkCapCenterGlow.visible = !isDark;
    this.spinGroup.add(this.winkCapCenterGlow);
        
        this.winkCapTop = new THREE.Mesh(capGeometry.clone(), capMaterial.clone());
        this.winkCapTop.position.set(0.63 * s, 0.63 * s, faceZ - 0.08 * s);
        this.winkCapTop.visible = !isDark;
        this.spinGroup.add(this.winkCapTop);

    this.winkCapTopGlow = new THREE.Mesh(capGeometry.clone(), capGlowMaterial.clone());
    this.winkCapTopGlow.position.copy(this.winkCapTop.position);
    this.winkCapTopGlow.scale.multiplyScalar(1.25);
    this.winkCapTopGlow.position.z -= 0.01;
    this.winkCapTopGlow.visible = !isDark;
    this.spinGroup.add(this.winkCapTopGlow);

        // === EYEBROWS ===
        const browMaterial = new THREE.MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const browGlowMaterial = new THREE.MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.38,
            side: THREE.BackSide,
            depthWrite: false
        });

        const leftBrowCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.75 * s, 0.95 * s, faceZ - 0.15 * s),
            new THREE.Vector3(-0.42 * s, 1.2 * s, faceZ - 0.05 * s),
            new THREE.Vector3(-0.2 * s, 0.95 * s, faceZ - 0.15 * s)
        );
        this.leftEyebrow = new THREE.Mesh(
            new THREE.TubeGeometry(leftBrowCurve, 20, 0.04 * s, 8, false), browMaterial
        );
        this.spinGroup.add(this.leftEyebrow);

        this.leftEyebrowGlow = new THREE.Mesh(
            new THREE.TubeGeometry(leftBrowCurve, 20, 0.055 * s, 8, false),
            browGlowMaterial
        );
        this.spinGroup.add(this.leftEyebrowGlow);

        const browCapGeo = new THREE.SphereGeometry(0.04 * s, 10, 10);
        this.leftBrowCapL = new THREE.Mesh(browCapGeo, capMaterial);
        this.leftBrowCapL.position.set(-0.75 * s, 0.95 * s, faceZ - 0.15 * s);
        this.spinGroup.add(this.leftBrowCapL);

    this.leftBrowCapLGlow = new THREE.Mesh(browCapGeo.clone(), capGlowMaterial.clone());
    this.leftBrowCapLGlow.position.copy(this.leftBrowCapL.position);
    this.leftBrowCapLGlow.scale.multiplyScalar(1.25);
    this.leftBrowCapLGlow.position.z -= 0.01;
    this.spinGroup.add(this.leftBrowCapLGlow);

        this.leftBrowCapR = new THREE.Mesh(browCapGeo.clone(), capMaterial.clone());
        this.leftBrowCapR.position.set(-0.2 * s, 0.95 * s, faceZ - 0.15 * s);
        this.spinGroup.add(this.leftBrowCapR);

    this.leftBrowCapRGlow = new THREE.Mesh(browCapGeo.clone(), capGlowMaterial.clone());
    this.leftBrowCapRGlow.position.copy(this.leftBrowCapR.position);
    this.leftBrowCapRGlow.scale.multiplyScalar(1.25);
    this.leftBrowCapRGlow.position.z -= 0.01;
    this.spinGroup.add(this.leftBrowCapRGlow);

        const rightBrowCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.2 * s, 0.95 * s, faceZ - 0.15 * s),
            new THREE.Vector3(0.42 * s, 1.2 * s, faceZ - 0.05 * s),
            new THREE.Vector3(0.75 * s, 0.95 * s, faceZ - 0.15 * s)
        );
        this.rightEyebrow = new THREE.Mesh(
            new THREE.TubeGeometry(rightBrowCurve, 20, 0.04 * s, 8, false), browMaterial.clone()
        );
        this.rightEyebrow.visible = isDark;
        this.spinGroup.add(this.rightEyebrow);

        this.rightEyebrowGlow = new THREE.Mesh(
            new THREE.TubeGeometry(rightBrowCurve, 20, 0.055 * s, 8, false),
            browGlowMaterial.clone()
        );
        this.rightEyebrowGlow.visible = isDark;
        this.spinGroup.add(this.rightEyebrowGlow);

        this.rightBrowCapL = new THREE.Mesh(browCapGeo.clone(), capMaterial.clone());
        this.rightBrowCapL.position.set(0.2 * s, 0.95 * s, faceZ - 0.15 * s);
        this.rightBrowCapL.visible = isDark;
        this.spinGroup.add(this.rightBrowCapL);

    this.rightBrowCapLGlow = new THREE.Mesh(browCapGeo.clone(), capGlowMaterial.clone());
    this.rightBrowCapLGlow.position.copy(this.rightBrowCapL.position);
    this.rightBrowCapLGlow.scale.multiplyScalar(1.25);
    this.rightBrowCapLGlow.position.z -= 0.01;
    this.rightBrowCapLGlow.visible = isDark;
    this.spinGroup.add(this.rightBrowCapLGlow);

        this.rightBrowCapR = new THREE.Mesh(browCapGeo.clone(), capMaterial.clone());
        this.rightBrowCapR.position.set(0.75 * s, 0.95 * s, faceZ - 0.15 * s);
        this.rightBrowCapR.visible = isDark;
        this.spinGroup.add(this.rightBrowCapR);

    this.rightBrowCapRGlow = new THREE.Mesh(browCapGeo.clone(), capGlowMaterial.clone());
    this.rightBrowCapRGlow.position.copy(this.rightBrowCapR.position);
    this.rightBrowCapRGlow.scale.multiplyScalar(1.25);
    this.rightBrowCapRGlow.position.z -= 0.01;
    this.rightBrowCapRGlow.visible = isDark;
    this.spinGroup.add(this.rightBrowCapRGlow);

        const winkTopCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0.63 * s, 0.63 * s, faceZ - 0.08 * s),
            new THREE.Vector3(0.42 * s, 0.54 * s, faceZ - 0.02 * s),
            new THREE.Vector3(0.24 * s, 0.20 * s, faceZ - 0.08 * s)
        );
        this.winkRightEyebrow = new THREE.Mesh(
            new THREE.TubeGeometry(winkTopCurve, 32, 0.065 * s, 12, false), browMaterial.clone()
        );
        this.winkRightEyebrow.visible = !isDark;
        this.spinGroup.add(this.winkRightEyebrow);

        this.winkRightEyebrowGlow = new THREE.Mesh(
            new THREE.TubeGeometry(winkTopCurve, 32, 0.085 * s, 12, false),
            browGlowMaterial.clone()
        );
        this.winkRightEyebrowGlow.visible = !isDark;
        this.spinGroup.add(this.winkRightEyebrowGlow);

        // === SMILE ===
        const smileMaterial = new THREE.MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const smileGlowMaterial = new THREE.MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.30,
            side: THREE.BackSide,
            depthWrite: false
        });

        const smileCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.0 * s, -0.45 * s, faceZ - 0.25 * s),
            new THREE.Vector3(0, -1.7 * s, faceZ),
            new THREE.Vector3(1.0 * s, -0.45 * s, faceZ - 0.25 * s)
        );
        this.smile = new THREE.Mesh(
            new THREE.TubeGeometry(smileCurve, 40, 0.06 * s, 10, false), smileMaterial
        );
        this.smile.visible = isDark;
        this.spinGroup.add(this.smile);

        this.smileGlow = new THREE.Mesh(
            new THREE.TubeGeometry(smileCurve, 40, 0.085 * s, 10, false),
            smileGlowMaterial
        );
        this.smileGlow.visible = isDark;
        this.spinGroup.add(this.smileGlow);

        const leftHookCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.2 * s, -0.5 * s, faceZ - 0.25 * s),
            new THREE.Vector3(-1.15 * s, -0.55 * s, faceZ - 0.25 * s),
            new THREE.Vector3(-0.9 * s, -0.35 * s, faceZ - 0.27 * s)
        );
        this.leftHook = new THREE.Mesh(
            new THREE.TubeGeometry(leftHookCurve, 16, 0.055 * s, 10, false), smileMaterial.clone()
        );
        this.leftHook.visible = isDark;
        this.spinGroup.add(this.leftHook);

        this.leftHookGlow = new THREE.Mesh(
            new THREE.TubeGeometry(leftHookCurve, 16, 0.075 * s, 10, false),
            smileGlowMaterial.clone()
        );
        this.leftHookGlow.visible = isDark;
        this.spinGroup.add(this.leftHookGlow);
        
        const rightHookCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(1.2 * s, -0.5 * s, faceZ - 0.25 * s),
            new THREE.Vector3(1.15 * s, -0.55 * s, faceZ - 0.25 * s),
            new THREE.Vector3(0.9 * s, -0.35 * s, faceZ - 0.27 * s)
        );
        this.rightHook = new THREE.Mesh(
            new THREE.TubeGeometry(rightHookCurve, 16, 0.055 * s, 10, false), smileMaterial.clone()
        );
        this.rightHook.visible = isDark;
        this.spinGroup.add(this.rightHook);

        this.rightHookGlow = new THREE.Mesh(
            new THREE.TubeGeometry(rightHookCurve, 16, 0.075 * s, 10, false),
            smileGlowMaterial.clone()
        );
        this.rightHookGlow.visible = isDark;
        this.spinGroup.add(this.rightHookGlow);

        const hookCapGeo = new THREE.SphereGeometry(0.055 * s, 10, 10);
        this.lightCapL = new THREE.Mesh(hookCapGeo, capMaterial);
        this.lightCapL.position.set(-1.2 * s, -0.5 * s, faceZ - 0.25 * s);
        this.lightCapL.visible = isDark;
        this.spinGroup.add(this.lightCapL);
        this.lightCapLInner = new THREE.Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.lightCapLInner.position.set(-0.9 * s, -0.35 * s, faceZ - 0.27 * s);
        this.lightCapLInner.visible = isDark;
        this.spinGroup.add(this.lightCapLInner);
        this.lightCapR = new THREE.Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.lightCapR.position.set(1.2 * s, -0.5 * s, faceZ - 0.25 * s);
        this.lightCapR.visible = isDark;
        this.spinGroup.add(this.lightCapR);
        this.lightCapRInner = new THREE.Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.lightCapRInner.position.set(0.9 * s, -0.35 * s, faceZ - 0.27 * s);
        this.lightCapRInner.visible = isDark;
        this.spinGroup.add(this.lightCapRInner);
        
        // === SMIRK (Light Mode) ===
        const smirkCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.0 * s, -0.45 * s, faceZ - 0.25 * s),
            new THREE.Vector3(0, -1.7 * s, faceZ),
            new THREE.Vector3(1.0 * s, -0.45 * s, faceZ - 0.25 * s)
        );
        this.smirkSmile = new THREE.Mesh(
            new THREE.TubeGeometry(smirkCurve, 40, 0.06 * s, 10, false), smileMaterial.clone()
        );
        this.smirkSmile.visible = !isDark;
        this.spinGroup.add(this.smirkSmile);
        
        const smirkLeftHookCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-1.2 * s, -0.5 * s, faceZ - 0.25 * s),
            new THREE.Vector3(-1.15 * s, -0.55 * s, faceZ - 0.25 * s),
            new THREE.Vector3(-0.9 * s, -0.35 * s, faceZ - 0.27 * s)
        );
        this.smirkLeftHook = new THREE.Mesh(
            new THREE.TubeGeometry(smirkLeftHookCurve, 16, 0.055 * s, 10, false), smileMaterial.clone()
        );
        this.smirkLeftHook.visible = !isDark;
        this.spinGroup.add(this.smirkLeftHook);
        
        const smirkRightHookCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(1.2 * s, -0.5 * s, faceZ - 0.25 * s),
            new THREE.Vector3(1.15 * s, -0.55 * s, faceZ - 0.25 * s),
            new THREE.Vector3(0.9 * s, -0.35 * s, faceZ - 0.27 * s)
        );
        this.smirkRightHook = new THREE.Mesh(
            new THREE.TubeGeometry(smirkRightHookCurve, 16, 0.055 * s, 10, false), smileMaterial.clone()
        );
        this.smirkRightHook.visible = !isDark;
        this.spinGroup.add(this.smirkRightHook);
        
        this.smirkCapL = new THREE.Mesh(hookCapGeo, capMaterial);
        this.smirkCapL.position.set(-1.2 * s, -0.5 * s, faceZ - 0.25 * s);
        this.smirkCapL.visible = !isDark;
        this.spinGroup.add(this.smirkCapL);
        this.smirkCapLInner = new THREE.Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.smirkCapLInner.position.set(-0.9 * s, -0.35 * s, faceZ - 0.27 * s);
        this.smirkCapLInner.visible = !isDark;
        this.spinGroup.add(this.smirkCapLInner);
        this.smirkCapR = new THREE.Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.smirkCapR.position.set(1.2 * s, -0.5 * s, faceZ - 0.25 * s);
        this.smirkCapR.visible = !isDark;
        this.spinGroup.add(this.smirkCapR);
        this.smirkCapRInner = new THREE.Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.smirkCapRInner.position.set(0.9 * s, -0.35 * s, faceZ - 0.27 * s);
        this.smirkCapRInner.visible = !isDark;
        this.spinGroup.add(this.smirkCapRInner);
        
        // === TONGUE ===
        const tongueShape = new THREE.Shape();
        const tw = 0.38 * s;
        const th = 0.55 * s;
        const kappa = 0.5523;
        tongueShape.moveTo(-tw, 0);
        tongueShape.bezierCurveTo(-tw, -th * kappa, -tw * kappa, -th, 0, -th);
        tongueShape.bezierCurveTo(tw * kappa, -th, tw, -th * kappa, tw, 0);
        tongueShape.lineTo(-tw, 0);
        
        const tongueMaterial = new THREE.MeshBasicMaterial({
            color: 0xcc2244,
            side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false
        });
        this.tongue = new THREE.Mesh(new THREE.ShapeGeometry(tongueShape, 48), tongueMaterial);
        this.tongue.position.set(0, -1.05 * s, faceZ - 0.02 * s);
        this.tongue.visible = !isDark;
        this.spinGroup.add(this.tongue);

        // Ensure all smiley face parts render on top of Mercury
        this.smileyParts = [
            this.leftEyeGlow, this.rightEyeGlow,
            this.leftEye, this.rightEye,
            this.winkRightEyeGlow,
            this.winkRightEye,
            this.winkCapBottomGlow, this.winkCapCenterGlow, this.winkCapTopGlow,
            this.winkCapBottom, this.winkCapCenter, this.winkCapTop,
            this.leftEyebrowGlow, this.leftEyebrow,
            this.leftBrowCapLGlow, this.leftBrowCapRGlow,
            this.leftBrowCapL, this.leftBrowCapR,
            this.rightEyebrowGlow, this.rightEyebrow,
            this.rightBrowCapLGlow, this.rightBrowCapRGlow,
            this.rightBrowCapL, this.rightBrowCapR,
            this.winkRightEyebrowGlow, this.winkRightEyebrow,
            this.smileGlow, this.leftHookGlow, this.rightHookGlow,
            this.smile, this.leftHook, this.rightHook,
            this.lightCapL, this.lightCapLInner, this.lightCapR, this.lightCapRInner,
            this.smirkSmile, this.smirkLeftHook, this.smirkRightHook,
            this.smirkCapL, this.smirkCapLInner, this.smirkCapR, this.smirkCapRInner,
            this.tongue
        ];
        this.smileyParts.forEach(part => {
            if (part) {
                part.renderOrder = 1;
                if (part.material) part.material.depthTest = true;
                
                // Store initial max opacity for transition
                if (part.material) {
                    part.userData.maxOpacity = part.material.opacity;
                }
            }
        });

        // Group parts for transition logic
        this.darkParts = [
            this.rightEye, this.rightEyeGlow,
            this.rightEyebrow, this.rightEyebrowGlow,
            this.rightBrowCapL, this.rightBrowCapLGlow,
            this.rightBrowCapR, this.rightBrowCapRGlow,
            this.smile, this.smileGlow,
            this.leftHook, this.leftHookGlow,
            this.rightHook, this.rightHookGlow,
            this.lightCapL, this.lightCapLInner,
            this.lightCapR, this.lightCapRInner
        ];

        this.lightParts = [
            this.winkRightEye, this.winkRightEyeGlow,
            this.winkRightEyebrow, this.winkRightEyebrowGlow,
            this.winkCapBottom, this.winkCapBottomGlow,
            this.winkCapCenter, this.winkCapCenterGlow,
            this.winkCapTop, this.winkCapTopGlow,
            this.smirkSmile, this.smirkLeftHook, this.smirkRightHook,
            this.smirkCapL, this.smirkCapLInner,
            this.smirkCapR, this.smirkCapRInner,
            this.tongue
        ];

        // Group eyebrow parts for interaction
        this.eyebrowParts = [
            this.leftEyebrow, this.leftEyebrowGlow,
            this.leftBrowCapL, this.leftBrowCapLGlow,
            this.leftBrowCapR, this.leftBrowCapRGlow,
            this.rightEyebrow, this.rightEyebrowGlow,
            this.rightBrowCapL, this.rightBrowCapLGlow,
            this.rightBrowCapR, this.rightBrowCapRGlow
        ];
        
        // Store base Y position
        this.eyebrowParts.forEach(part => {
             if (part) part.userData.baseY = part.position.y;
        });

        // Initialize theme state
        const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        this.themeProgress = initialTheme === 'dark' ? 1 : 0;
        this.targetThemeProgress = this.themeProgress;
        this.updateTheme(initialTheme === 'dark');
    }
    
    bindEvents() {
        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = e.clientX;
            this.targetMouse.y = e.clientY;
        });
        
        window.addEventListener('resize', () => {
            this.centerX = window.innerWidth / 2;
            this.centerY = window.innerHeight / 2;
            this.onResize();
        });
        
        window.addEventListener('themeChanged', (e) => this.updateTheme(e.detail.isDark));

        window.addEventListener('mousedown', () => {
            if (!this.isVisible) return;
            // Trigger eyebrow jump
            const s = 0.99; // Scale factor used in creation
            this.targetEyebrowOffset = 0.15 * s;
            setTimeout(() => {
                this.targetEyebrowOffset = 0;
            }, 150);
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

        // Universe Video Toggle Listener
        window.addEventListener('universeToggle', (e) => {
            const isActive = e.detail.active;
            console.log('MercuryGlobe: universeToggle', isActive);
            this.isUniverseActive = isActive;
            
            if (isActive) {
                // Move globe down out of view
                gsap.to(this.container, {
                    y: window.innerHeight + 100, // Move a bit further to be safe
                    duration: 1,
                    ease: "power3.inOut",
                    overwrite: "auto"
                });
            } else {
                // Force visibility
                this.isVisible = true; 
                
                // Return to original position
                gsap.to(this.container, {
                    y: 0,
                    yPercent: -50,
                    opacity: 1,
                    duration: 1,
                    ease: "power3.inOut",
                    overwrite: "auto",
                    onComplete: () => {
                         console.log('MercuryGlobe: Restored position');
                         // Clear manual Y so standard positioning takes over completely if needed
                         // But we want to keep y=0 if that's the base.
                         // Actually, let's NOT clearProps "y" because standard CSS might not have it set to 0 strictly if we used `top`.
                         // But we SHOULD ensure opacity is 1.
                         this.container.style.opacity = '1';
                    }
                });
            }
        });
    }
    
    updateTheme(isDark) {
        if (!this.mercuryGroup) return;
        this.targetThemeProgress = isDark ? 1 : 0;
    }
    
    onResize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // --- VISIBILITY CHECK ---
        // If not visible and not in warm-up, skip processing to save CPU/GPU
        if (!this.isVisible && this._warmupComplete) return;

        // During warm-up: render the scene but clamp all motion to avoid jumps.
        // The globe just sits still at its initial rotation until everything is stable.
        if (!this._warmupComplete) {
            // Still render the globe so loading screen frames show it
            if (this.mercuryGroup) {
                this.mercuryGroup.rotation.x = 0;
                this.mercuryGroup.rotation.y = 0;
            }
            // Reset lerp states to current mouse so there's no snap when warm-up ends
            this.mouse.x = this.targetMouse.x;
            this.mouse.y = this.targetMouse.y;
            this.currentRotation.x = 0;
            this.currentRotation.y = 0;
            this.targetRotation.x = 0;
            this.targetRotation.y = 0;
            this.renderer.render(this.scene, this.camera);
            return;
        }

        // Theme Transition Logic
        this.themeProgress = this.lerp(this.themeProgress, this.targetThemeProgress, 0.06);
        
        // Update Opacities
        if (this.darkParts) {
            this.darkParts.forEach(part => {
                if (part && part.material) {
                    const maxOp = part.userData.maxOpacity || 1;
                    part.material.opacity = maxOp * this.themeProgress;
                    part.visible = part.material.opacity > 0.01;
                }
            });
        }
        
        if (this.lightParts) {
            this.lightParts.forEach(part => {
                if (part && part.material) {
                    const maxOp = part.userData.maxOpacity || 1;
                    part.material.opacity = maxOp * (1 - this.themeProgress);
                    part.visible = part.material.opacity > 0.01;
                }
            });
        }

        // Interpolate Left Eye Scale
        if (this.leftEye) {
             // Dark mode: 1.0, Light mode: 0.82
             const s = this.lerp(0.82, 1.0, this.themeProgress);
             this.leftEye.scale.y = s;
        }
        if (this.leftEyeGlow) {
            // Dark mode: 1.12, Light mode: 0.82 * 1.12
            const s = this.lerp(0.82 * 1.12, 1.12, this.themeProgress);
            this.leftEyeGlow.scale.y = s;
        }

        // Animate Eyebrows
        this.eyebrowOffset = this.lerp(this.eyebrowOffset, this.targetEyebrowOffset, 0.2);
        if (Math.abs(this.eyebrowOffset - this.targetEyebrowOffset) < 0.001) {
            this.eyebrowOffset = this.targetEyebrowOffset;
        }

        if (this.eyebrowParts && this.eyebrowOffset > 0.0001 || this.targetEyebrowOffset > 0) {
            this.eyebrowParts.forEach(part => {
                if (part && part.userData.baseY !== undefined) {
                    part.position.y = part.userData.baseY + this.eyebrowOffset;
                }
            });
        }

        this.mouse.x = this.lerp(this.mouse.x, this.targetMouse.x, 0.1);
        this.mouse.y = this.lerp(this.mouse.y, this.targetMouse.y, 0.1);
        
        // Calculate center based on current container position
        const rect = this.container.getBoundingClientRect();
        const globeCenterX = rect.left + rect.width / 2;
        const globeCenterY = rect.top + rect.height / 2;

        // Calculate offset relative to the globe's center
        // We use window dimensions for normalization to keep sensitivity consistent
        const offsetX = (this.mouse.x - globeCenterX) / (window.innerWidth / 2);
        const offsetY = (this.mouse.y - globeCenterY) / (window.innerHeight / 2);
        
        this.targetRotation.y = offsetX * this.config.maxRotation;
        this.targetRotation.x = offsetY * this.config.maxRotation;
        
        this.currentRotation.x = this.lerp(this.currentRotation.x, this.targetRotation.x, this.config.smoothing);
        this.currentRotation.y = this.lerp(this.currentRotation.y, this.targetRotation.y, this.config.smoothing);
        
        if (this.mercuryGroup) {
            this.mercuryGroup.rotation.x = this.currentRotation.x;
            this.mercuryGroup.rotation.y = this.currentRotation.y;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

window.MercuryGlobe = MercuryGlobe;

// Self-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const heroContainer = document.getElementById('mercury-container');
    if (heroContainer) {
        window.mercuryGlobe = new MercuryGlobe(heroContainer);
    }
});
