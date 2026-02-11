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
        this.setupCanvas();
        this.createScene();
        this.createLighting();
        this.loadMercuryModel();
        this.createSmileyFace();
        this.setupScrollAnimation();
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
            },
            undefined,
            (err) => {
                console.error('Failed to load mercury.glb, creating fallback sphere:', err);
                this.createFallbackSphere();
            }
        );
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

        // Safety Trigger: Force reset when at very top to prevent "stuck on right"
        ScrollTrigger.create({
            trigger: "body",
            start: "top top",
            end: "100px",  // Small range at top
            onEnter: () => {
                // Ensure we are in hero state
                gsap.to(this.container, {
                    left: "4vw",
                    top: "50%",
                    scale: 1,
                    yPercent: -50,
                    overwrite: "auto",
                    duration: 0.5
                });
            },
            onLeaveBack: () => {
                 // Ensure we are in hero state when hitting top from bottom
                 gsap.to(this.container, {
                    left: "4vw",
                    top: "50%",
                    scale: 1,
                    yPercent: -50,
                    overwrite: "auto",
                    duration: 0.5
                });
            }
        });

        // --- Transition to About Section ---
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#about-section",
                start: "top bottom", // When top of about section hits bottom of viewport
                end: "center center",   // When top of about section hits center
                scrub: 0.5, // Reduced for tighter response
                toggleActions: "play reverse play reverse"
            }
        });

        // Step 1: First scale down to 85% and dip down slightly (before moving right)
        // Use fromTo to explicitly enforce the initial state so fast scrolling up always returns here
        tl.fromTo(this.container, {
            left: "4vw",
            top: "50%",
            scale: 1,
            yPercent: -50
        }, {
            scale: 0.85,
            top: "60%",       // Dip down a bit
            duration: 1,
            ease: "power1.inOut"
        });

        // Step 2: Then move right and scale down to 50%
        tl.to(this.container, {
            left: "60%",      // Move next to marquee 
            top: "50%",       // Return to center
            scale: 0.5,       // Final size for About section
            duration: 2,
            ease: "power2.inOut"
        });

        // --- Transition to Featured/Projects Section ---
        const tlProjects = gsap.timeline({
            scrollTrigger: {
                trigger: "#projects-section",
                start: "top bottom", // When top of projects hits bottom of viewport
                end: "center center", // When center of projects hits center
                scrub: 0.5,
                toggleActions: "play reverse play reverse"
            }
        });
        // Move to left most part of the screen (Scale stays 0.5)
        tlProjects.to(this.container, {
            left: "0%",       // Fully left
            top: "50%",       // Keep centered vertically
            scale: 0.5,       // Maintain size
            ease: "power2.inOut"
        });

        // --- Transition to Services Section ---
        const tlServices = gsap.timeline({
            scrollTrigger: {
                trigger: "#services-section",
                start: "top bottom", // When top of services hits bottom of viewport
                end: "center center", // When center of services hits center
                scrub: 0.5,
                toggleActions: "play reverse play reverse"
            }
        });

        // Move back to right (same position as about section)
        tlServices.to(this.container, {
            left: "60%",      // Move back to right
            top: "50%",       // Keep centered vertically
            scale: 0.5,       // Maintain size
            ease: "power2.inOut"
        });

        // --- Transition to Contact Section ---
        const tlContact = gsap.timeline({
            scrollTrigger: {
                trigger: "#contact",
                start: "top bottom", // When top of contact hits bottom of viewport
                end: "center center", // When center of contact hits center
                scrub: 0.5,
                toggleActions: "play reverse play reverse"
            }
        });

        // Scale up to 90% and move slightly left (to leave 10vw gap from right)
        tlContact.to(this.container, {
            scale: 0.9,       // Scale up to 90%
            left: "50%",      // Move to 50% so visual right edge is ~90% (10vw gap)
            ease: "power2.inOut"
        });
        
        // Optional: slight rotation or other effects on the globe itself
        // But the container animation handles position/size
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
        requestAnimationFrame(() => this.animate());
        
        
        if (!this.isVisible) return;

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
