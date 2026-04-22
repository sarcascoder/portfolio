/**
 * SMOOTH CURSOR
 *
 * Two-layer cursor:
 *   1. The rocket dot — default, follows the mouse with some damping.
 *   2. A labelled cyan ring — morphs in when hovering elements that carry
 *      data-cursor-label="...". When active the rocket quiets down so the
 *      ring becomes the focal cursor.
 *
 * Elements with data-cursor-magnetic="true" get subtle snap toward their
 * centre while hovered — reserved for small CTAs, not big cards.
 *
 * Desktop/fine-pointer only — registration is gated in the DOMContentLoaded
 * handler at the bottom.
 */
class SmoothCursor {
  constructor() {
    this.cursorDot = document.getElementById("cursor-dot");
    this.cursorOutline = document.getElementById("cursor-outline");
    this.cursorRing = document.getElementById("cursor-ring");
    this.cursorRingLabel = document.getElementById("cursor-ring-label");

    if (!this.cursorDot) {
      console.warn("Cursor elements not found");
      return;
    }

    this.mouseX = 0;
    this.mouseY = 0;

    this.dotX = 0;
    this.dotY = 0;
    this.ringX = 0;
    this.ringY = 0;

    this.dotSpeed = 0.35;
    this.ringSpeed = 0.22; // slightly laggier than the dot — reads as a trailing ring

    this.isVisible = true;
    this.currentLabelEl = null;
    this.magneticEl = null;

    // Selectors that get the generic "hover scale" treatment (no ring)
    this.interactiveSelectors = [
      "a",
      "button",
      ".project-card",
      ".service-item",
      ".nav-link",
      ".menu-toggle",
      "[data-cursor]",
    ];

    this.init();
  }

  init() {
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("mouseenter", () => this.showCursor());
    document.addEventListener("mouseleave", () => this.hideCursor());
    document.addEventListener("mousedown", () => this.onMouseDown());
    document.addEventListener("mouseup", () => this.onMouseUp());

    this.addHoverListeners();
    // NOTE: previously a MutationObserver on the whole body/subtree re-ran
    // addHoverListeners on every DOM mutation. That fired dozens of times
    // per second during scroll-triggered reveal animations and was the main
    // JS-side heat source on desktop. Removed. If content is injected after
    // load, call window.smoothCursor.refresh() once to pick it up.
    this.animate();

    this.cursorDot.style.opacity = "0";
    if (this.cursorOutline) this.cursorOutline.style.opacity = "0";
  }

  onMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    if (!this.isVisible) {
      this.showCursor();
    } else {
      this.cursorDot.style.opacity = "1";
      if (this.cursorOutline) this.cursorOutline.style.opacity = "0.5";
    }
  }

  onMouseDown() {
    this.cursorDot.classList.add("active");
    if (this.cursorRing) this.cursorRing.classList.add("pressing");
  }

  onMouseUp() {
    this.cursorDot.classList.remove("active");
    if (this.cursorRing) this.cursorRing.classList.remove("pressing");
  }

  showCursor() {
    this.isVisible = true;
    this.cursorDot.classList.remove("hidden");
    if (this.cursorOutline) this.cursorOutline.classList.remove("hidden");
  }

  hideCursor() {
    this.isVisible = false;
    this.cursorDot.classList.add("hidden");
    if (this.cursorOutline) this.cursorOutline.classList.add("hidden");
    if (this.cursorRing) this.cursorRing.classList.remove("active");
  }

  addHoverListeners() {
    const interactiveElements = document.querySelectorAll(
      this.interactiveSelectors.join(", "),
    );

    interactiveElements.forEach((el) => {
      if (el.dataset.cursorBound === "true") return;
      el.dataset.cursorBound = "true";
      el.addEventListener("mouseenter", () => this.onHoverEnter(el));
      el.addEventListener("mouseleave", () => this.onHoverLeave(el));
    });
  }

  onHoverEnter(element) {
    const cursorType = element.dataset.cursor || "hover";
    this.cursorDot.classList.add(cursorType);

    if (element.tagName === "A") this.cursorDot.classList.add("link");
    if (element.tagName === "BUTTON" || element.classList.contains("btn")) {
      this.cursorDot.classList.add("button");
    }

    // If this element (or an ancestor we already own via walk-up) has a label,
    // morph the cursor ring in with that copy.
    const labelEl = element.closest("[data-cursor-label]");
    if (labelEl && this.cursorRing && this.cursorRingLabel) {
      this.currentLabelEl = labelEl;
      this.cursorRingLabel.textContent = labelEl.dataset.cursorLabel;
      this.cursorRing.classList.add("active");
      this.cursorDot.classList.add("morph-hidden");
    }

    // Opt-in magnetic snap (only small CTAs should use this — big cards
    // with magnetism feel weird because the snap target is far away).
    const magEl = element.closest("[data-cursor-magnetic='true']");
    if (magEl) this.magneticEl = magEl;
  }

  onHoverLeave(element) {
    const states = ["hover", "link", "button", "text", "view", "grab", "cta"];
    states.forEach((state) => {
      this.cursorDot.classList.remove(state);
    });

    // Only clear the ring if we're actually leaving the labelled element,
    // not a child of it (mouseleave is fired per element).
    if (this.currentLabelEl && !element.contains(this.currentLabelEl)) {
      this.cursorRing?.classList.remove("active");
      this.cursorDot.classList.remove("morph-hidden");
      this.currentLabelEl = null;
    } else if (this.currentLabelEl === element) {
      this.cursorRing?.classList.remove("active");
      this.cursorDot.classList.remove("morph-hidden");
      this.currentLabelEl = null;
    }

    if (this.magneticEl === element || element.contains?.(this.magneticEl)) {
      this.magneticEl = null;
    }
  }

  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  animate() {
    // Compute the target for the ring: blend 30% toward the magnetic element's centre
    let ringTargetX = this.mouseX;
    let ringTargetY = this.mouseY;
    if (this.magneticEl) {
      const rect = this.magneticEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      ringTargetX = this.mouseX * 0.7 + cx * 0.3;
      ringTargetY = this.mouseY * 0.7 + cy * 0.3;
    }

    this.dotX = this.lerp(this.dotX, this.mouseX, this.dotSpeed);
    this.dotY = this.lerp(this.dotY, this.mouseY, this.dotSpeed);
    this.ringX = this.lerp(this.ringX, ringTargetX, this.ringSpeed);
    this.ringY = this.lerp(this.ringY, ringTargetY, this.ringSpeed);

    this.cursorDot.style.left = `${this.dotX}px`;
    this.cursorDot.style.top = `${this.dotY}px`;
    if (this.cursorRing) {
      this.cursorRing.style.left = `${this.ringX}px`;
      this.cursorRing.style.top = `${this.ringY}px`;
    }

    requestAnimationFrame(() => this.animate());
  }

  refresh() {
    this.addHoverListeners();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.smoothCursor = new SmoothCursor();
  }
});
