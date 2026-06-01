/**
 * MERCURY GLOBE - Real NASA 3D Mercury GLB Model
 * Loads mercury.glb and renders with proper PBR lighting
 * Includes Smiley Face overlay
 */

import {
    ACESFilmicToneMapping, AmbientLight, BackSide, Box3, Color, DirectionalLight, DoubleSide, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, QuadraticBezierCurve3, SRGBColorSpace, Scene, Shape, ShapeGeometry, SphereGeometry, TubeGeometry, Vector3, WebGLRenderer
} from 'three';
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

        this.frameInterval = 1000 / 60;
        this.lastFrameTime = 0;
        
        this.currentRotation = { x: 0, y: 0 };
        this.targetRotation = { x: 0, y: 0 };
        
        this.centerX = window.innerWidth / 2;
        this.centerY = window.innerHeight / 2;

        // Black hole disk — sized so the disk is a self-contained object in
        // the canvas with transparent space around it. That's what makes the
        // scroll-driven CSS shrink feel like the disk zooming out (rather
        // than a rectangular box collapsing) — there's no disk material at
        // the canvas edges to give away the box boundary.
        this.targetRadius = 9.5;
        // Scene-unit horizontal shift applied to the model and the smiley
        // base position so the void sits on the left of the viewport.
        this.diskShiftX = -3.6;
        // Smiley sizing & placement on the central spherical singularity.
        // smileyOffsetZ puts the face onto the sphere's front surface
        // (createSmileyFace flattens the internal faceZ so this is the
        // dominant z-position knob); Y offset stays 0 so the face centers
        // vertically on the void; scale chooses how much of the sphere face
        // the smiley covers.
        this.smileyScale = 1.4;
        this.smileyOffsetY = 0.0;
        this.smileyOffsetZ = 0.0;
        // How far the face translates with the cursor (world units per
        // currentRotation radian). Position-based parallax — the face never
        // rotates so it always reads as camera-facing.
        this.smileyParallax = 0.7;
        // Auto-rotation speed of the disk (radians/frame, applied around Y
        // — the disk's perpendicular axis. The viewing tilt now comes from
        // the camera being above the disk plane rather than from rotating
        // the model itself, so the spin reads as natural rotation).
        this.diskSpinSpeed = 0.005;

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
        // isMobileLayout drives positioning (must match the CSS @media breakpoint, 1024px)
        // so desktop GSAP timelines don't kick in on tablets / landscape phones where
        // the CSS has already centered the globe.
        this.isMobileLayout = window.matchMedia('(max-width: 1024px)').matches;
        this.isMobile = window.innerWidth <= 768; // used for perf / sensitivity only
        this.frameInterval = this.isMobile ? 1000 / 30 : 1000 / 60;

        if (this.isMobileLayout) {
            this.config.maxRotation = 0.85;
            this.config.smoothing = 0.14;
            this.targetRadius = 7.0;
            // Mobile: keep the black hole horizontally centered always — no
            // left/right movement across sections, only z-axis (scale/blur)
            // animations via GSAP on this.innerEl. So diskShiftX = 0.
            this.diskShiftX = 0;
            this.smileyScale = 1.1;
            this.smileyOffsetY = 0.0;
            this.smileyOffsetZ = 0.0;
            this.smileyParallax = 0.55;
        }

        // Idle auto-drift: keep the globe feeling alive when the user isn't interacting
        this.idleRotation = { x: 0, y: 0 };
        this.lastInteractionTime = performance.now();
        this.idleTimeout = this.isMobile ? 900 : 1800; // ms before idle drift kicks in

        // Track model loading state
        this.modelLoaded = false;
        this._scrollAnimSetup = false;
        
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

        // Mount inside #mercury-inner if present (the new wrapper architecture).
        // Falls back to the container itself so older markup still works.
        this.innerEl = document.getElementById('mercury-inner');
        if (!this.innerEl) {
            this.innerEl = document.createElement('div');
            this.innerEl.id = 'mercury-inner';
            this.innerEl.className = 'smiley-globe-inner';
            this.innerEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;transform-origin:center center;pointer-events:none;';
            this.container.appendChild(this.innerEl);
        }
        this.innerEl.appendChild(this.canvas);

        // Safety net: if the container ever had a debug outline/border, kill it too
        this.container.style.outline = 'none';
        this.container.style.border = '0';
        this.container.style.boxShadow = 'none';

        const rect = this.container.getBoundingClientRect();
        this.width = rect.width || 100;
        this.height = rect.height || 100;
    }
    
    createScene() {
        this.scene = new Scene();
        
        this.camera = new PerspectiveCamera(50, this.width / this.height, 0.1, 1000);
        // Camera positioned just barely above the disk plane and aimed back
        // at the origin so the horizontal accretion disk is seen nearly
        // edge-on — the iconic Interstellar / Event-Horizon view where the
        // lensed back of the disk arcs as a dome over the void. Keep y
        // small (< 1) so the disk reads as a thin horizontal slice rather
        // than a tilted plate.
        this.camera.position.set(0, 0.55, 9);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: !this.isMobile,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.width, this.height);
        // Pixel ratio 1.5 (was 1.75) — ~30% fewer fragments on Retina, invisible at this size
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1 : 1.5));
        this.renderer.physicallyCorrectLights = true;
        this.renderer.toneMapping = ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = SRGBColorSpace;

        this.mercuryGroup = new Group();
        this.scene.add(this.mercuryGroup);

        this.spinGroup = new Group();
        this.mercuryGroup.add(this.spinGroup);

        // Dedicated group for the disk's continuous auto-rotation. Sits
        // between spinGroup and mercuryPivot so the smileyGroup (also a child
        // of spinGroup) is unaffected by the spin and keeps facing camera.
        // The base rotation.x tilts the (horizontal) accretion disk forward
        // so the camera sees the ring face instead of edge-on; rotation.y is
        // then incremented every frame to spin the disk around its own
        // perpendicular axis (natural black-hole rotation, visible swirl).
        this.modelSpinGroup = new Group();
        this.modelSpinGroup.position.x = this.diskShiftX;
        // No manual base tilt — the viewing angle comes from the camera
        // being above y=0, so the horizontal disk reads naturally.
        this.spinGroup.add(this.modelSpinGroup);
    }

    createLighting() {
        const sunLight = new DirectionalLight(0xfff8ee, 3.0);
        sunLight.position.set(5, 3, 5);
        this.scene.add(sunLight);
        
        const fillLight = new DirectionalLight(0xc8d8ff, 1.0);
        fillLight.position.set(-4, -1, 3);
        this.scene.add(fillLight);
        
        const rimLight = new DirectionalLight(0x6688cc, 0.7);
        rimLight.position.set(-2, 2, -5);
        this.scene.add(rimLight);
        
        const bottomLight = new DirectionalLight(0x8899aa, 0.4);
        bottomLight.position.set(0, -5, 2);
        this.scene.add(bottomLight);
        
        const hemiLight = new HemisphereLight(0xddeeff, 0x445566, 0.7);
        this.scene.add(hemiLight);
        
        const ambientLight = new AmbientLight(0x555566, 0.5);
        this.scene.add(ambientLight);
    }

    loadMercuryModel() {
        const loader = new GLTFLoader();

        loader.load(
            '/blackhole.glb',
            (gltf) => {
                this.mercuryModel = gltf.scene;

                const box = new Box3().setFromObject(this.mercuryModel);
                const size = new Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = (this.targetRadius * 2) / maxDim;
                this.mercuryModel.scale.setScalar(scale);

                box.setFromObject(this.mercuryModel);
                const center = new Vector3();
                box.getCenter(center);
                this.mercuryModel.position.sub(center);

                this.mercuryPivot = new Group();
                this.mercuryPivot.add(this.mercuryModel);
                this.mercuryPivot.rotation.y = Math.PI;

                const finalBox = new Box3().setFromObject(this.mercuryPivot);
                const finalCenter = new Vector3();
                finalBox.getCenter(finalCenter);
                this.mercuryPivot.position.sub(finalCenter);

                this.mercuryModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        // Ensure correct color space for texture
                        if (child.material.map) {
                            child.material.map.colorSpace = SRGBColorSpace;
                            child.material.map.needsUpdate = true;
                        }
                        // Keep the model's own PBR values but ensure it looks good
                        child.material.needsUpdate = true;
                    }
                });

                this.modelSpinGroup.add(this.mercuryPivot);
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
            if (!this.isMobileLayout) {
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
                // MOBILE: CSS owns the container's position (translate(-50%,-50%)
                // centering via media queries). We explicitly strip any GSAP
                // transform/position state from the container so a previous
                // desktop matchMedia branch can't leave behind stale inline
                // styles that would override the CSS centering during scroll.
                gsap.set(this.container, {
                    clearProps: "transform,left,top,xPercent,yPercent,x,y,scale"
                });
                // Inner element: neutral state. ALL mobile GSAP work targets
                // this element from here on, so the container is untouched.
                gsap.set(this.innerEl, {
                    x: 0, y: 0, scale: 1, opacity: 1,
                    filter: "blur(0px)"
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
    /**
     * Smoothly dismisses the loading screen and unlocks scrolling.
     */
    _dismissLoadingScreen() {
        // Use Global Rocket Loader if available
        if (window.finishLoading) {
            window.finishLoading();
            
            // Still refresh ScrollTrigger after a safe delay matching the loader's exit
            setTimeout(() => {
                if (typeof ScrollTrigger !== 'undefined') {
                    ScrollTrigger.refresh(true);
                }
            }, 1200);
            return;
        }

        // Fallback (Original Logic)
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
        const geometry = new SphereGeometry(radius, 64, 64);
        const material = new MeshStandardMaterial({
            color: 0xaaaaaa, roughness: 0.85, metalness: 0.08,
        });
        this.mesh = new Mesh(geometry, material);
        this.modelSpinGroup.add(this.mesh);
        this.mercurySurface = this.mesh;
    }

    setupScrollAnimation() {
        // Ensure GSAP is loaded
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.warn('GSAP or ScrollTrigger not loaded');
            return;
        }

        let mm = gsap.matchMedia();

        // === DESKTOP ANIMATION (> 1024px) ===
        // Must match the CSS breakpoint so we don't fight the stylesheet on tablets/landscape phones.
        mm.add("(min-width: 1025px)", () => {

            // Initial State (desktop) — container is left-anchored so any
            // CSS scale shrinks the canvas TOWARD the left edge instead of
            // centering it horizontally. Section tweens then only animate
            // top (vertical drift) + scale + opacity, never `left` or
            // `xPercent`, so the black hole stays glued to the left in
            // every section.
            gsap.set(this.container, {
                left: "0%",
                top: "50%",
                yPercent: -50,
                scale: 1,
                opacity: 1,
                filter: "blur(0px)",
                transformPerspective: 1200,
                transformOrigin: "0% 50%"
            });

            // --- Transition to About Section ---
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: "#about-section",
                    start: "top bottom",
                    end: "top 35%",
                    scrub: 0.5,
                    toggleActions: "play reverse play reverse"
                }
            });

            // Keep opacity/blur on the container so the visual fades out,
            // but DO NOT CSS-scale the canvas — that just shrinks the
            // rendered image without revealing anything that was clipped at
            // the camera level. Instead, pull the THREE camera back so the
            // black hole actually zooms out in 3D and the previously-clipped
            // accretion arms come into view.
            tl.to(this.container, {
                opacity: 0,
                filter: "blur(10px)",
                duration: 1,
                ease: "power2.inOut"
            }, 0);
            tl.to(this.camera.position, {
                z: 22,
                duration: 1,
                ease: "power2.inOut",
                onUpdate: () => this.camera.lookAt(0, 0, 0)
            }, 0);

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
            // Scale 1.2 from transformOrigin "0% 50%" makes the rendered
            // canvas grow toward the right, drifting the disk toward screen
            // center. A negative `left` shift compensates and keeps the
            // void anchored on the LEFT in the projects section.
            tlProjects.to(this.container, {
                left: "-28%",
                top: "40%",
                scale: 1.2,
                opacity: 1,
                z: 0,
                filter: "blur(0px)",
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

            // Services section: slide the disk over to the RIGHT side of
            // the viewport. transformOrigin "0% 50%" + scale 0.6 means a
            // container left of ~56vw lands the void around the 75vw mark
            // on screen — right-of-center.
            tlServices.to(this.container, {
                left: "10%",
                top: "50%",
                scale: 1.8,
                opacity: 1,
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

            // Contact section: disk grows bigger and nudges a touch toward
            // the center, then holds there. transformOrigin "0% 50%" means
            // scale > 1 also drifts the void rightward on its own; combined
            // with the small `left` shift it lands slightly inboard of its
            // default left-edge position.
            tlContact.to(this.container, {
                left: "-35%",
                top: "40%",
                scale: 2.7,
                opacity: 1,
                ease: "power2.inOut"
            });
        });

        // === MOBILE / TABLET ANIMATION (<= 1024px) ===
        // CSS owns the container's centering on this breakpoint (see the
        // inline <style> in index.html plus the @media rules in styles.css).
        // GSAP is restricted to scale/opacity/filter on #mercury-inner so it
        // can never override the CSS translate(-50%,-50%) centering. This
        // architectural split is what fixes the "globe drifts to the left
        // during fast mobile scroll" bug — there's no way for an incomplete
        // GSAP transform write to clobber centering anymore.
        mm.add("(max-width: 1024px)", () => {

            // Strip any stale transform/position GSAP may have written onto
            // the container while a desktop matchMedia branch was active.
            // After this, the container's position is purely CSS.
            gsap.set(this.container, {
                clearProps: "transform,left,top,xPercent,yPercent,x,y,scale"
            });
            // Inner element initial state — neutral.
            gsap.set(this.innerEl, {
                x: 0, y: 0, scale: 1, opacity: 1, z: 0,
                filter: "blur(0px)",
                transformPerspective: 1200,
                transformOrigin: "50% 50%"
            });

            const tlMobileAbout = gsap.timeline({
                scrollTrigger: {
                    trigger: "#about-section",
                    start: "top bottom",
                    end: "top 38%",
                    scrub: 0.5
                }
            });

            // Mobile uses true 3D camera pull-back instead of CSS-scaling
            // the canvas. The CSS scale was just shrinking an already-
            // clipped image (disk wider than the square mobile canvas), so
            // the user saw the sides of the disk stay cut while everything
            // got smaller. Pulling the camera back widens the WebGL
            // viewport so the full disk reveals itself as the user scrolls.
            tlMobileAbout.to(this.innerEl, {
                opacity: 0,
                filter: "blur(10px)",
                ease: "power2.inOut"
            }, 0);
            tlMobileAbout.to(this.camera.position, {
                z: 20,
                ease: "power2.inOut",
                onUpdate: () => this.camera.lookAt(0, 0, 0)
            }, 0);

            const tlMobileProjects = gsap.timeline({
                scrollTrigger: {
                    trigger: "#projects-section",
                    start: "top bottom",
                    end: "center center",
                    scrub: 0.5
                }
            });

            tlMobileProjects.to(this.innerEl, {
                scale: 0.6,
                opacity: 0.3,
                z: 0,
                filter: "blur(0px)",
                ease: "power2.inOut"
            });

            // Contact section on mobile: grow the disk back so it reads big
            // behind the "Let's create something amazing" copy. Pulls the
            // camera closer (z back to ~8) while bumping innerEl scale and
            // opacity to full.
            const tlMobileContact = gsap.timeline({
                scrollTrigger: {
                    trigger: "#contact",
                    start: "top bottom",
                    end: "center center",
                    scrub: 0.5
                }
            });
            tlMobileContact.to(this.innerEl, {
                scale: 1.4,
                opacity: 1,
                z: 0,
                filter: "blur(0px)",
                ease: "power2.inOut"
            }, 0);
            tlMobileContact.to(this.camera.position, {
                z: 8,
                ease: "power2.inOut",
                onUpdate: () => this.camera.lookAt(0, 0, 0)
            }, 0);
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

        const faceFill = new Color(
            FACE_FILL_RGB.r / 255,
            FACE_FILL_RGB.g / 255,
            FACE_FILL_RGB.b / 255
        );
        const faceGlow = new Color(
            FACE_GLOW_RGB.r / 255,
            FACE_GLOW_RGB.g / 255,
            FACE_GLOW_RGB.b / 255
        );

        this.iceFaceTexture = generateIceTexture({ size: 512, repeat: 1.6 });
        const s = 0.99;
        // faceZ used to put the smiley parts on the surface of the mercury
        // sphere (z ≈ targetRadius). For the black hole the face is now a
        // flat decal positioned by smileyGroup.position.z onto the spherical
        // singularity, so keep parts flat in local z.
        const faceZ = 0.02;

        // === EYES ===
        const eyeGeometry = new SphereGeometry(0.32 * s, 25, 25);
        eyeGeometry.scale(0.7, 1.6, 0.35);
        const eyeMaterial = new MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const eyeGlowMaterial = new MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.55,
            side: BackSide,
            depthWrite: false
        });
        
        this.leftEye = new Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.42 * s, 0.15 * s, faceZ);
        this.leftEye.scale.y = !isDark ? 0.82 : 1.0;
        this.spinGroup.add(this.leftEye);

    this.leftEyeGlow = new Mesh(eyeGeometry.clone(), eyeGlowMaterial);
    this.leftEyeGlow.position.copy(this.leftEye.position);
    this.leftEyeGlow.scale.copy(this.leftEye.scale);
    this.leftEyeGlow.scale.multiplyScalar(1.12);
    this.leftEyeGlow.position.z = faceZ - 0.01;
    this.spinGroup.add(this.leftEyeGlow);
        
        this.rightEye = new Mesh(eyeGeometry.clone(), eyeMaterial.clone());
        this.rightEye.position.set(0.42 * s, 0.15 * s, faceZ);
        this.rightEye.visible = isDark;
        this.spinGroup.add(this.rightEye);

    this.rightEyeGlow = new Mesh(eyeGeometry.clone(), eyeGlowMaterial.clone());
    this.rightEyeGlow.position.copy(this.rightEye.position);
    this.rightEyeGlow.scale.copy(this.rightEye.scale);
    this.rightEyeGlow.scale.multiplyScalar(1.12);
    this.rightEyeGlow.position.z = faceZ - 0.01;
    this.rightEyeGlow.visible = isDark;
    this.spinGroup.add(this.rightEyeGlow);

        // === WINK RIGHT EYE ===
        const winkBottomCurve = new QuadraticBezierCurve3(
            new Vector3(0.92 * s, 0.05 * s, faceZ - 0.08 * s),
            new Vector3(0.56 * s, 0.30 * s, faceZ - 0.02 * s),
            new Vector3(0.24 * s, 0.20 * s, faceZ - 0.08 * s)
        );
        const winkEyeMaterial = new MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const winkGlowMaterial = new MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.38,
            side: BackSide,
            depthWrite: false
        });
        this.winkRightEye = new Mesh(
            new TubeGeometry(winkBottomCurve, 32, 0.065 * s, 12, false), winkEyeMaterial
        );
        this.winkRightEye.visible = !isDark;
        this.spinGroup.add(this.winkRightEye);

        this.winkRightEyeGlow = new Mesh(
            new TubeGeometry(winkBottomCurve, 32, 0.085 * s, 12, false),
            winkGlowMaterial
        );
        this.winkRightEyeGlow.visible = !isDark;
        this.spinGroup.add(this.winkRightEyeGlow);

        const capGeometry = new SphereGeometry(0.065 * s, 12, 12);
        const capMaterial = new MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const capGlowMaterial = new MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.45,
            side: BackSide,
            depthWrite: false
        });
        
        this.winkCapBottom = new Mesh(capGeometry, capMaterial);
        this.winkCapBottom.position.set(0.92 * s, 0.05 * s, faceZ - 0.08 * s);
        this.winkCapBottom.visible = !isDark;
        this.spinGroup.add(this.winkCapBottom);

    this.winkCapBottomGlow = new Mesh(capGeometry.clone(), capGlowMaterial);
    this.winkCapBottomGlow.position.copy(this.winkCapBottom.position);
    this.winkCapBottomGlow.scale.multiplyScalar(1.25);
    this.winkCapBottomGlow.position.z -= 0.01;
    this.winkCapBottomGlow.visible = !isDark;
    this.spinGroup.add(this.winkCapBottomGlow);
        
        this.winkCapCenter = new Mesh(capGeometry.clone(), capMaterial.clone());
        this.winkCapCenter.position.set(0.24 * s, 0.20 * s, faceZ - 0.08 * s);
        this.winkCapCenter.visible = !isDark;
        this.spinGroup.add(this.winkCapCenter);

    this.winkCapCenterGlow = new Mesh(capGeometry.clone(), capGlowMaterial.clone());
    this.winkCapCenterGlow.position.copy(this.winkCapCenter.position);
    this.winkCapCenterGlow.scale.multiplyScalar(1.25);
    this.winkCapCenterGlow.position.z -= 0.01;
    this.winkCapCenterGlow.visible = !isDark;
    this.spinGroup.add(this.winkCapCenterGlow);
        
        this.winkCapTop = new Mesh(capGeometry.clone(), capMaterial.clone());
        this.winkCapTop.position.set(0.63 * s, 0.63 * s, faceZ - 0.08 * s);
        this.winkCapTop.visible = !isDark;
        this.spinGroup.add(this.winkCapTop);

    this.winkCapTopGlow = new Mesh(capGeometry.clone(), capGlowMaterial.clone());
    this.winkCapTopGlow.position.copy(this.winkCapTop.position);
    this.winkCapTopGlow.scale.multiplyScalar(1.25);
    this.winkCapTopGlow.position.z -= 0.01;
    this.winkCapTopGlow.visible = !isDark;
    this.spinGroup.add(this.winkCapTopGlow);

        // === EYEBROWS ===
        const browMaterial = new MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const browGlowMaterial = new MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.38,
            side: BackSide,
            depthWrite: false
        });

        const leftBrowCurve = new QuadraticBezierCurve3(
            new Vector3(-0.75 * s, 0.95 * s, faceZ - 0.15 * s),
            new Vector3(-0.42 * s, 1.2 * s, faceZ - 0.05 * s),
            new Vector3(-0.2 * s, 0.95 * s, faceZ - 0.15 * s)
        );
        this.leftEyebrow = new Mesh(
            new TubeGeometry(leftBrowCurve, 20, 0.04 * s, 8, false), browMaterial
        );
        this.spinGroup.add(this.leftEyebrow);

        this.leftEyebrowGlow = new Mesh(
            new TubeGeometry(leftBrowCurve, 20, 0.055 * s, 8, false),
            browGlowMaterial
        );
        this.spinGroup.add(this.leftEyebrowGlow);

        const browCapGeo = new SphereGeometry(0.04 * s, 10, 10);
        this.leftBrowCapL = new Mesh(browCapGeo, capMaterial);
        this.leftBrowCapL.position.set(-0.75 * s, 0.95 * s, faceZ - 0.15 * s);
        this.spinGroup.add(this.leftBrowCapL);

    this.leftBrowCapLGlow = new Mesh(browCapGeo.clone(), capGlowMaterial.clone());
    this.leftBrowCapLGlow.position.copy(this.leftBrowCapL.position);
    this.leftBrowCapLGlow.scale.multiplyScalar(1.25);
    this.leftBrowCapLGlow.position.z -= 0.01;
    this.spinGroup.add(this.leftBrowCapLGlow);

        this.leftBrowCapR = new Mesh(browCapGeo.clone(), capMaterial.clone());
        this.leftBrowCapR.position.set(-0.2 * s, 0.95 * s, faceZ - 0.15 * s);
        this.spinGroup.add(this.leftBrowCapR);

    this.leftBrowCapRGlow = new Mesh(browCapGeo.clone(), capGlowMaterial.clone());
    this.leftBrowCapRGlow.position.copy(this.leftBrowCapR.position);
    this.leftBrowCapRGlow.scale.multiplyScalar(1.25);
    this.leftBrowCapRGlow.position.z -= 0.01;
    this.spinGroup.add(this.leftBrowCapRGlow);

        const rightBrowCurve = new QuadraticBezierCurve3(
            new Vector3(0.2 * s, 0.95 * s, faceZ - 0.15 * s),
            new Vector3(0.42 * s, 1.2 * s, faceZ - 0.05 * s),
            new Vector3(0.75 * s, 0.95 * s, faceZ - 0.15 * s)
        );
        this.rightEyebrow = new Mesh(
            new TubeGeometry(rightBrowCurve, 20, 0.04 * s, 8, false), browMaterial.clone()
        );
        this.rightEyebrow.visible = isDark;
        this.spinGroup.add(this.rightEyebrow);

        this.rightEyebrowGlow = new Mesh(
            new TubeGeometry(rightBrowCurve, 20, 0.055 * s, 8, false),
            browGlowMaterial.clone()
        );
        this.rightEyebrowGlow.visible = isDark;
        this.spinGroup.add(this.rightEyebrowGlow);

        this.rightBrowCapL = new Mesh(browCapGeo.clone(), capMaterial.clone());
        this.rightBrowCapL.position.set(0.2 * s, 0.95 * s, faceZ - 0.15 * s);
        this.rightBrowCapL.visible = isDark;
        this.spinGroup.add(this.rightBrowCapL);

    this.rightBrowCapLGlow = new Mesh(browCapGeo.clone(), capGlowMaterial.clone());
    this.rightBrowCapLGlow.position.copy(this.rightBrowCapL.position);
    this.rightBrowCapLGlow.scale.multiplyScalar(1.25);
    this.rightBrowCapLGlow.position.z -= 0.01;
    this.rightBrowCapLGlow.visible = isDark;
    this.spinGroup.add(this.rightBrowCapLGlow);

        this.rightBrowCapR = new Mesh(browCapGeo.clone(), capMaterial.clone());
        this.rightBrowCapR.position.set(0.75 * s, 0.95 * s, faceZ - 0.15 * s);
        this.rightBrowCapR.visible = isDark;
        this.spinGroup.add(this.rightBrowCapR);

    this.rightBrowCapRGlow = new Mesh(browCapGeo.clone(), capGlowMaterial.clone());
    this.rightBrowCapRGlow.position.copy(this.rightBrowCapR.position);
    this.rightBrowCapRGlow.scale.multiplyScalar(1.25);
    this.rightBrowCapRGlow.position.z -= 0.01;
    this.rightBrowCapRGlow.visible = isDark;
    this.spinGroup.add(this.rightBrowCapRGlow);

        const winkTopCurve = new QuadraticBezierCurve3(
            new Vector3(0.63 * s, 0.63 * s, faceZ - 0.08 * s),
            new Vector3(0.42 * s, 0.54 * s, faceZ - 0.02 * s),
            new Vector3(0.24 * s, 0.20 * s, faceZ - 0.08 * s)
        );
        this.winkRightEyebrow = new Mesh(
            new TubeGeometry(winkTopCurve, 32, 0.065 * s, 12, false), browMaterial.clone()
        );
        this.winkRightEyebrow.visible = !isDark;
        this.spinGroup.add(this.winkRightEyebrow);

        this.winkRightEyebrowGlow = new Mesh(
            new TubeGeometry(winkTopCurve, 32, 0.085 * s, 12, false),
            browGlowMaterial.clone()
        );
        this.winkRightEyebrowGlow.visible = !isDark;
        this.spinGroup.add(this.winkRightEyebrowGlow);

        // === SMILE ===
        const smileMaterial = new MeshBasicMaterial({
            color: faceFill,
            transparent: true, opacity: 1
        });
        const smileGlowMaterial = new MeshBasicMaterial({
            color: faceGlow,
            transparent: true,
            opacity: 0.30,
            side: BackSide,
            depthWrite: false
        });

        const smileCurve = new QuadraticBezierCurve3(
            new Vector3(-1.0 * s, -0.45 * s, faceZ - 0.25 * s),
            new Vector3(0, -1.7 * s, faceZ),
            new Vector3(1.0 * s, -0.45 * s, faceZ - 0.25 * s)
        );
        this.smile = new Mesh(
            new TubeGeometry(smileCurve, 40, 0.06 * s, 10, false), smileMaterial
        );
        this.smile.visible = isDark;
        this.spinGroup.add(this.smile);

        this.smileGlow = new Mesh(
            new TubeGeometry(smileCurve, 40, 0.085 * s, 10, false),
            smileGlowMaterial
        );
        this.smileGlow.visible = isDark;
        this.spinGroup.add(this.smileGlow);

        const leftHookCurve = new QuadraticBezierCurve3(
            new Vector3(-1.2 * s, -0.5 * s, faceZ - 0.25 * s),
            new Vector3(-1.15 * s, -0.55 * s, faceZ - 0.25 * s),
            new Vector3(-0.9 * s, -0.35 * s, faceZ - 0.27 * s)
        );
        this.leftHook = new Mesh(
            new TubeGeometry(leftHookCurve, 16, 0.055 * s, 10, false), smileMaterial.clone()
        );
        this.leftHook.visible = isDark;
        this.spinGroup.add(this.leftHook);

        this.leftHookGlow = new Mesh(
            new TubeGeometry(leftHookCurve, 16, 0.075 * s, 10, false),
            smileGlowMaterial.clone()
        );
        this.leftHookGlow.visible = isDark;
        this.spinGroup.add(this.leftHookGlow);
        
        const rightHookCurve = new QuadraticBezierCurve3(
            new Vector3(1.2 * s, -0.5 * s, faceZ - 0.25 * s),
            new Vector3(1.15 * s, -0.55 * s, faceZ - 0.25 * s),
            new Vector3(0.9 * s, -0.35 * s, faceZ - 0.27 * s)
        );
        this.rightHook = new Mesh(
            new TubeGeometry(rightHookCurve, 16, 0.055 * s, 10, false), smileMaterial.clone()
        );
        this.rightHook.visible = isDark;
        this.spinGroup.add(this.rightHook);

        this.rightHookGlow = new Mesh(
            new TubeGeometry(rightHookCurve, 16, 0.075 * s, 10, false),
            smileGlowMaterial.clone()
        );
        this.rightHookGlow.visible = isDark;
        this.spinGroup.add(this.rightHookGlow);

        const hookCapGeo = new SphereGeometry(0.055 * s, 10, 10);
        this.lightCapL = new Mesh(hookCapGeo, capMaterial);
        this.lightCapL.position.set(-1.2 * s, -0.5 * s, faceZ - 0.25 * s);
        this.lightCapL.visible = isDark;
        this.spinGroup.add(this.lightCapL);
        this.lightCapLInner = new Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.lightCapLInner.position.set(-0.9 * s, -0.35 * s, faceZ - 0.27 * s);
        this.lightCapLInner.visible = isDark;
        this.spinGroup.add(this.lightCapLInner);
        this.lightCapR = new Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.lightCapR.position.set(1.2 * s, -0.5 * s, faceZ - 0.25 * s);
        this.lightCapR.visible = isDark;
        this.spinGroup.add(this.lightCapR);
        this.lightCapRInner = new Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.lightCapRInner.position.set(0.9 * s, -0.35 * s, faceZ - 0.27 * s);
        this.lightCapRInner.visible = isDark;
        this.spinGroup.add(this.lightCapRInner);
        
        // === SMIRK (Light Mode) ===
        const smirkCurve = new QuadraticBezierCurve3(
            new Vector3(-1.0 * s, -0.45 * s, faceZ - 0.25 * s),
            new Vector3(0, -1.7 * s, faceZ),
            new Vector3(1.0 * s, -0.45 * s, faceZ - 0.25 * s)
        );
        this.smirkSmile = new Mesh(
            new TubeGeometry(smirkCurve, 40, 0.06 * s, 10, false), smileMaterial.clone()
        );
        this.smirkSmile.visible = !isDark;
        this.spinGroup.add(this.smirkSmile);
        
        const smirkLeftHookCurve = new QuadraticBezierCurve3(
            new Vector3(-1.2 * s, -0.5 * s, faceZ - 0.25 * s),
            new Vector3(-1.15 * s, -0.55 * s, faceZ - 0.25 * s),
            new Vector3(-0.9 * s, -0.35 * s, faceZ - 0.27 * s)
        );
        this.smirkLeftHook = new Mesh(
            new TubeGeometry(smirkLeftHookCurve, 16, 0.055 * s, 10, false), smileMaterial.clone()
        );
        this.smirkLeftHook.visible = !isDark;
        this.spinGroup.add(this.smirkLeftHook);
        
        const smirkRightHookCurve = new QuadraticBezierCurve3(
            new Vector3(1.2 * s, -0.5 * s, faceZ - 0.25 * s),
            new Vector3(1.15 * s, -0.55 * s, faceZ - 0.25 * s),
            new Vector3(0.9 * s, -0.35 * s, faceZ - 0.27 * s)
        );
        this.smirkRightHook = new Mesh(
            new TubeGeometry(smirkRightHookCurve, 16, 0.055 * s, 10, false), smileMaterial.clone()
        );
        this.smirkRightHook.visible = !isDark;
        this.spinGroup.add(this.smirkRightHook);
        
        this.smirkCapL = new Mesh(hookCapGeo, capMaterial);
        this.smirkCapL.position.set(-1.2 * s, -0.5 * s, faceZ - 0.25 * s);
        this.smirkCapL.visible = !isDark;
        this.spinGroup.add(this.smirkCapL);
        this.smirkCapLInner = new Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.smirkCapLInner.position.set(-0.9 * s, -0.35 * s, faceZ - 0.27 * s);
        this.smirkCapLInner.visible = !isDark;
        this.spinGroup.add(this.smirkCapLInner);
        this.smirkCapR = new Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.smirkCapR.position.set(1.2 * s, -0.5 * s, faceZ - 0.25 * s);
        this.smirkCapR.visible = !isDark;
        this.spinGroup.add(this.smirkCapR);
        this.smirkCapRInner = new Mesh(hookCapGeo.clone(), capMaterial.clone());
        this.smirkCapRInner.position.set(0.9 * s, -0.35 * s, faceZ - 0.27 * s);
        this.smirkCapRInner.visible = !isDark;
        this.spinGroup.add(this.smirkCapRInner);
        
        // === TONGUE ===
        const tongueShape = new Shape();
        const tw = 0.38 * s;
        const th = 0.55 * s;
        const kappa = 0.5523;
        tongueShape.moveTo(-tw, 0);
        tongueShape.bezierCurveTo(-tw, -th * kappa, -tw * kappa, -th, 0, -th);
        tongueShape.bezierCurveTo(tw * kappa, -th, tw, -th * kappa, tw, 0);
        tongueShape.lineTo(-tw, 0);
        
        const tongueMaterial = new MeshBasicMaterial({
            color: 0xcc2244,
            side: DoubleSide, transparent: true, opacity: 0.95, depthWrite: false
        });
        this.tongue = new Mesh(new ShapeGeometry(tongueShape, 48), tongueMaterial);
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
                // Render after the disk and disable depth testing so the
                // face is always visible inside the central void instead of
                // being occluded by the singularity sphere geometry.
                part.renderOrder = 1;
                if (part.material) part.material.depthTest = false;

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

        // Reparent every smiley part into a scaled wrapper group. Sits as a
        // sibling of modelSpinGroup inside spinGroup so the disk's continuous
        // rotation never touches the face — it stays camera-facing. The
        // animate() loop drives smileyGroup.position to follow the cursor
        // (position-based parallax instead of rotation).
        this.smileyGroup = new Group();
        this.smileyParts.forEach(part => {
            if (part) this.smileyGroup.add(part);
        });
        this.smileyGroup.scale.setScalar(this.smileyScale);
        this.smileyGroup.position.set(this.diskShiftX, this.smileyOffsetY, this.smileyOffsetZ);
        this.spinGroup.add(this.smileyGroup);

        // Initialize theme state
        const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        this.themeProgress = initialTheme === 'dark' ? 1 : 0;
        this.targetThemeProgress = this.themeProgress;
        this.updateTheme(initialTheme === 'dark');
    }

    bindEvents() {
        // Bind both mouse and touch handlers so hybrid devices (iPad, touch laptops)
        // always rotate whichever input the user reaches for.
        window.addEventListener('mousemove', (e) => {
            this.targetMouse.x = e.clientX;
            this.targetMouse.y = e.clientY;
            this.lastInteractionTime = performance.now();
        });

        const updateFromTouch = (e) => {
            const touch = e.touches?.[0] || e.changedTouches?.[0];
            if (!touch) return;
            this.targetMouse.x = touch.clientX;
            this.targetMouse.y = touch.clientY;
            this.lastInteractionTime = performance.now();
        };
        window.addEventListener('touchstart', updateFromTouch, { passive: true });
        window.addEventListener('touchmove', updateFromTouch, { passive: true });

        // Device orientation only makes sense on a real handheld.
        //
        // Baseline-relative tilt: the very first valid reading is captured as
        // the "rest" orientation — whatever angle the phone happens to be in
        // when the user opens the page becomes the zero point where the smiley
        // faces straight at them. Subsequent events apply only the DELTA from
        // that baseline, so different users holding the phone at different
        // resting angles all get the same on-axis starting image.
        //
        // A small warm-up is used: the first couple of readings can be noisy
        // (some devices emit a burst of events during orientation sensor init),
        // so we wait until `ORIENTATION_WARMUP_MS` has passed before locking
        // in the baseline. The caller can ignore all events before that.
        if (this.isMobileLayout) {
            this.orientationBaseline = null;
            this.orientationWarmupStart = 0;
            this.orientationSamples = []; // rolling 500ms window for stillness detection
            const ORIENTATION_WARMUP_MS = 250;
            // Auto-rebaseline parameters: when the user holds the phone steady
            // at a new orientation for STILL_WINDOW_MS, that new orientation
            // becomes the rest pose. Prevents the globe from staying tilted
            // forever after the user reorients (lying down → sitting up, etc).
            const STILL_WINDOW_MS = 500;
            const STILL_RANGE_DEG = 3;   // max beta/gamma variation over the window to count as "still"
            const REBASELINE_DIFF_DEG = 5; // must be at least this far from current baseline to re-baseline

            // Reset the baseline when the device orientation changes (portrait <-> landscape),
            // because beta/gamma swap meaning and the old zero-point no longer reflects the
            // user's current hold.
            const resetBaseline = () => {
                this.orientationBaseline = null;
                this.orientationWarmupStart = 0;
                this.orientationSamples = [];
            };
            window.addEventListener('orientationchange', resetBaseline);
            if (screen.orientation && typeof screen.orientation.addEventListener === 'function') {
                screen.orientation.addEventListener('change', resetBaseline);
            }

            window.addEventListener('deviceorientation', (e) => {
                if (e.beta == null || e.gamma == null) return;

                // Establish the warm-up window on the first event, then lock the baseline once it elapses.
                if (this.orientationBaseline === null) {
                    if (this.orientationWarmupStart === 0) {
                        this.orientationWarmupStart = performance.now();
                        return;
                    }
                    if (performance.now() - this.orientationWarmupStart < ORIENTATION_WARMUP_MS) {
                        return;
                    }
                    this.orientationBaseline = { beta: e.beta, gamma: e.gamma };
                    return; // the baseline reading itself produces zero rotation — skip emitting it
                }

                // --- Auto-rebaseline on a new sustained rest pose ---------------
                // Push current reading into the rolling window and trim old samples.
                const now = performance.now();
                this.orientationSamples.push({ beta: e.beta, gamma: e.gamma, t: now });
                while (this.orientationSamples.length && now - this.orientationSamples[0].t > STILL_WINDOW_MS) {
                    this.orientationSamples.shift();
                }
                // Need a full window of samples and the oldest must be at least
                // STILL_WINDOW_MS ago — otherwise we don't have 500ms of evidence yet.
                if (this.orientationSamples.length >= 3
                    && (now - this.orientationSamples[0].t) >= STILL_WINDOW_MS) {
                    let bMin = Infinity, bMax = -Infinity, gMin = Infinity, gMax = -Infinity;
                    for (const s of this.orientationSamples) {
                        if (s.beta  < bMin) bMin = s.beta;
                        if (s.beta  > bMax) bMax = s.beta;
                        if (s.gamma < gMin) gMin = s.gamma;
                        if (s.gamma > gMax) gMax = s.gamma;
                    }
                    const isStill = (bMax - bMin) < STILL_RANGE_DEG
                                 && (gMax - gMin) < STILL_RANGE_DEG;
                    if (isStill) {
                        const dBeta  = e.beta  - this.orientationBaseline.beta;
                        const dGamma = e.gamma - this.orientationBaseline.gamma;
                        const drift  = Math.hypot(dBeta, dGamma);
                        if (drift > REBASELINE_DIFF_DEG) {
                            // User has settled at a meaningfully different angle.
                            // Snap the baseline; the existing lerp on this.mouse
                            // smooths the visual rotation transition.
                            this.orientationBaseline = { beta: e.beta, gamma: e.gamma };
                            // Reset the window so we don't immediately re-trigger.
                            this.orientationSamples = [{ beta: e.beta, gamma: e.gamma, t: now }];
                        }
                    }
                }
                // ----------------------------------------------------------------

                // Deltas from the captured baseline. 30° tilt in either axis = full response.
                const clamp11 = (v) => Math.max(-1, Math.min(1, v));
                const deltaGamma = e.gamma - this.orientationBaseline.gamma;
                const deltaBeta  = e.beta  - this.orientationBaseline.beta;
                const normX = clamp11(deltaGamma / 30);
                const normY = clamp11(deltaBeta  / 30);

                this.targetMouse.x = window.innerWidth  / 2 + normX * (window.innerWidth  / 2) * 0.7;
                this.targetMouse.y = window.innerHeight / 2 + normY * (window.innerHeight / 2) * 0.7;
                this.lastInteractionTime = performance.now();
            }, { passive: true });
        }

        window.addEventListener('resize', () => {
            this.centerX = window.innerWidth / 2;
            this.centerY = window.innerHeight / 2;
            this.onResize();
        });

        window.addEventListener('themeChanged', (e) => this.updateTheme(e.detail.isDark));

        const triggerEyebrowBounce = () => {
            if (!this.isVisible) return;
            const s = 0.99;
            this.targetEyebrowOffset = 0.15 * s;
            setTimeout(() => {
                this.targetEyebrowOffset = 0;
            }, 150);
        };

        window.addEventListener('mousedown', triggerEyebrowBounce);
        window.addEventListener('touchstart', triggerEyebrowBounce, { passive: true });

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
            // Mobile: universe reveal is disabled at this viewport (see main.js).
            // Skip entirely so we never write a transform to the container —
            // that's what kept the globe drifting to the left on fast scroll.
            if (this.isMobileLayout) return;
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

                // Return to original position — explicitly re-pin horizontal center on
                // mobile layout so any stale x/xPercent from prior scroll timelines
                // can't leave the globe off-center.
                const restoreProps = {
                    y: 0,
                    yPercent: -50,
                    opacity: 1,
                    duration: 1,
                    ease: "power3.inOut",
                    overwrite: "auto",
                    onComplete: () => {
                         console.log('MercuryGlobe: Restored position');
                         this.container.style.opacity = '1';
                    }
                };
                if (this.isMobileLayout) {
                    restoreProps.left = "50%";
                    restoreProps.xPercent = -50;
                    restoreProps.x = 0;
                }
                gsap.to(this.container, restoreProps);
            }
        });
    }
    
    updateTheme(isDark) {
        if (!this.mercuryGroup) return;
        this.targetThemeProgress = isDark ? 1 : 0;
    }
    
    onResize() {
        if (!this.container) return;
        this.isMobile = window.innerWidth <= 768;
        this.isMobileLayout = window.matchMedia('(max-width: 1024px)').matches;
        this.frameInterval = this.isMobile ? 1000 / 30 : 1000 / 60;
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1 : 1.5));
    }
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    animate(now = 0) {
        requestAnimationFrame((time) => this.animate(time));

        // Idle throttle: after 2s of no interaction, cap the animation loop
        // at 30fps instead of 60. The globe's idle drift is slow enough that
        // 30fps is visually indistinguishable from 60fps for passive motion;
        // as soon as the user moves the cursor (which updates
        // lastInteractionTime) we're back to full-rate.
        const idleFor = now - (this.lastInteractionTime || 0);
        const interval = (idleFor > 2000 && !this.isMobile)
            ? 1000 / 30
            : this.frameInterval;
        if (now - this.lastFrameTime < interval) return;
        this.lastFrameTime = now;

        // Skip render entirely when the globe isn't actually visible — when
        // the user has scrolled past the hero, when the tab is backgrounded,
        // or when the universe reveal video is covering the page.
        // Physics state is held by the lerps so resuming is seamless.
        if (
            this.isVisible === false ||
            document.visibilityState === 'hidden' ||
            document.body.classList.contains('universe-mode')
        ) {
            return;
        }

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
        
        // Reference point for cursor offset = the smiley's actual screen
        // position (projected from its world anchor). The container is now
        // full-viewport so rect.center collapses to screen center, but the
        // smiley sits on the left side of the screen — using screen center
        // as the reference made the face yaw toward the center even when
        // the cursor was directly above the smiley.
        const anchor = new Vector3(this.diskShiftX, this.smileyOffsetY, this.smileyOffsetZ || 0);
        anchor.project(this.camera);
        const globeCenterX = (anchor.x * 0.5 + 0.5) * window.innerWidth;
        const globeCenterY = (-anchor.y * 0.5 + 0.5) * window.innerHeight;

        // Calculate offset relative to the globe's center
        // We use window dimensions for normalization to keep sensitivity consistent
        const offsetX = (this.mouse.x - globeCenterX) / (window.innerWidth / 2);
        const offsetY = (this.mouse.y - globeCenterY) / (window.innerHeight / 2);
        
        this.targetRotation.y = offsetX * this.config.maxRotation;
        // Phones place the globe at top:35% (CSS @media ≤768), so globeCenterY
        // sits ABOVE the viewport center. That makes offsetY positive even when
        // the user is holding the phone perfectly still at the orientation
        // baseline, which would otherwise tilt the smiley downward.
        // Subtract a small constant bias on phones so the rest pose looks
        // slightly upward instead of slightly downward. The orientation tilt
        // response on top of this is unchanged.
        const phoneRestTiltBias = this.isMobile ? 0.30 : 0;
        this.targetRotation.x = offsetY * this.config.maxRotation - phoneRestTiltBias;

        this.currentRotation.x = this.lerp(this.currentRotation.x, this.targetRotation.x, this.config.smoothing);
        this.currentRotation.y = this.lerp(this.currentRotation.y, this.targetRotation.y, this.config.smoothing);

        // Idle auto-drift: after a period without interaction, gently orbit so the globe feels alive
        const timeSinceInteraction = now - (this.lastInteractionTime || 0);
        const idleAmount = Math.max(0, Math.min(1, (timeSinceInteraction - this.idleTimeout) / 1500));
        const t = now * 0.0004;
        const idleAmplitude = this.isMobile ? 0.35 : 0.22;
        const driftY = Math.sin(t) * idleAmplitude;
        const driftX = Math.sin(t * 0.7) * idleAmplitude * 0.4;
        this.idleRotation.x = this.lerp(this.idleRotation.x, driftX * idleAmount, 0.05);
        this.idleRotation.y = this.lerp(this.idleRotation.y, driftY * idleAmount, 0.05);

        // Disk auto-rotates continuously around its own disk-plane axis (Y).
        if (this.modelSpinGroup) {
            this.modelSpinGroup.rotation.y += this.diskSpinSpeed;
        }

        // Subtle cursor parallax: tilt the whole scene a small amount with
        // the cursor so the black hole reads as reactive. Magnitude is much
        // smaller than the original mercury-globe behavior so it doesn't
        // fight the smileyGroup translation parallax below.
        if (this.mercuryGroup) {
            const sceneTilt = 0.18;
            this.mercuryGroup.rotation.x = (this.currentRotation.x + this.idleRotation.x) * sceneTilt;
            this.mercuryGroup.rotation.y = (this.currentRotation.y + this.idleRotation.y) * sceneTilt;
        }

        // Smiley turns to face the cursor: rotation tracks the cursor
        // position via currentRotation (yaw) and -currentRotation (pitch).
        // A small translation parallax is layered on top so the face also
        // drifts subtly with the cursor — the rotation is what reads as
        // "looking at" the cursor.
        if (this.smileyGroup) {
            const lookFactor = 0.9;
            this.smileyGroup.rotation.y = (this.currentRotation.y + this.idleRotation.y) * lookFactor;
            this.smileyGroup.rotation.x = (this.currentRotation.x + this.idleRotation.x) * lookFactor;

            const px = (this.currentRotation.y + this.idleRotation.y) * this.smileyParallax * 0.3;
            const py = -(this.currentRotation.x + this.idleRotation.x) * this.smileyParallax * 0.3;
            this.smileyGroup.position.x = this.diskShiftX + px;
            this.smileyGroup.position.y = this.smileyOffsetY + py;
        }

        // Keep the camera aimed at the origin regardless of GSAP-driven
        // camera.position.z changes (scroll zoom-out animation).
        if (this.camera) {
            this.camera.lookAt(0, 0, 0);
        }

        // Dirty-flag render: compose every piece of state that contributes to
        // the rendered image (rotation, theme blend, eyebrow offset) into a
        // single number, and only call renderer.render() when it has changed
        // meaningfully since the last frame. When the user's mouse is still
        // AND the idle drift hasn't kicked in yet AND the theme isn't
        // transitioning, the scene is literally identical frame-to-frame —
        // skipping the WebGL draw call saves the entire GPU cost.
        const key =
            (this.currentRotation.x + this.idleRotation.x) * 1000 +
            (this.currentRotation.y + this.idleRotation.y) * 97 +
            this.themeProgress * 13 +
            this.eyebrowOffset * 7 +
            (this.modelSpinGroup ? this.modelSpinGroup.rotation.y * 211 : 0) +
            (this.camera ? this.camera.position.z * 53 : 0);
        if (this._lastRenderKey === undefined || Math.abs(key - this._lastRenderKey) > 0.0004) {
            this._lastRenderKey = key;
            this.renderer.render(this.scene, this.camera);
        }
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
