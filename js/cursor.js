/**
 * SMOOTH CURSOR - Custom cursor with inertia/damping effect
 * Inspired by Super Evil Geniuscorp website
 */

class SmoothCursor {
  constructor() {
    // Cursor elements
    this.cursorDot = document.getElementById("cursor-dot");
    this.cursorOutline = document.getElementById("cursor-outline");

    // Check if cursor elements exist
    if (!this.cursorDot || !this.cursorOutline) {
      console.warn("Cursor elements not found");
      return;
    }

    // Mouse position (actual)
    this.mouseX = 0;
    this.mouseY = 0;

    // Cursor positions (smoothed)
    this.dotX = 0;
    this.dotY = 0;
    this.outlineX = 0;
    this.outlineY = 0;

    // Damping factors (0-1, lower = more lag)
    this.dotSpeed = 0.35;
    this.outlineSpeed = 0.15;

    // State
    this.isHovering = false;
    this.isVisible = true;

    // Interactive element selectors
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
    // Track mouse movement
    document.addEventListener("mousemove", (e) => this.onMouseMove(e));

    // Track mouse enter/leave viewport
    document.addEventListener("mouseenter", () => this.showCursor());
    document.addEventListener("mouseleave", () => this.hideCursor());

    // Track clicks
    document.addEventListener("mousedown", () => this.onMouseDown());
    document.addEventListener("mouseup", () => this.onMouseUp());

    // Add hover listeners to interactive elements
    this.addHoverListeners();

    // Start animation loop
    this.animate();

    // Hide cursors initially until mouse moves
    this.cursorDot.style.opacity = "0";
    this.cursorOutline.style.opacity = "0";
  }

  onMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    // Show cursor on first move
    if (!this.isVisible) {
      this.showCursor();
    } else {
      this.cursorDot.style.opacity = "1";
      this.cursorOutline.style.opacity = "0.5";
    }
  }

  onMouseDown() {
    this.cursorDot.classList.add("active");
    this.cursorOutline.classList.add("active");
  }

  onMouseUp() {
    this.cursorDot.classList.remove("active");
    this.cursorOutline.classList.remove("active");
  }

  showCursor() {
    this.isVisible = true;
    this.cursorDot.classList.remove("hidden");
    this.cursorOutline.classList.remove("hidden");
  }

  hideCursor() {
    this.isVisible = false;
    this.cursorDot.classList.add("hidden");
    this.cursorOutline.classList.add("hidden");
  }

  addHoverListeners() {
    const interactiveElements = document.querySelectorAll(
      this.interactiveSelectors.join(", "),
    );

    interactiveElements.forEach((el) => {
      el.addEventListener("mouseenter", () => this.onHoverEnter(el));
      el.addEventListener("mouseleave", () => this.onHoverLeave(el));
    });
  }

  onHoverEnter(element) {
    this.isHovering = true;

    // Check for custom cursor type
    const cursorType = element.dataset.cursor || "hover";

    // Apply cursor state
    this.cursorDot.classList.add(cursorType);
    this.cursorOutline.classList.add(cursorType);

    // Check if it's a link
    if (element.tagName === "A") {
      this.cursorDot.classList.add("link");
      this.cursorOutline.classList.add("link");
    }

    // Check if it's a button
    if (element.tagName === "BUTTON" || element.classList.contains("btn")) {
      this.cursorDot.classList.add("button");
      this.cursorOutline.classList.add("button");
    }
  }

  onHoverLeave(element) {
    this.isHovering = false;

    // Remove all cursor states
    const states = ["hover", "link", "button", "text"];
    states.forEach((state) => {
      this.cursorDot.classList.remove(state);
      this.cursorOutline.classList.remove(state);
    });
  }

  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  animate() {
    // Smooth interpolation for dot
    this.dotX = this.lerp(this.dotX, this.mouseX, this.dotSpeed);
    this.dotY = this.lerp(this.dotY, this.mouseY, this.dotSpeed);

    // Smooth interpolation for outline (more lag)
    this.outlineX = this.lerp(this.outlineX, this.mouseX, this.outlineSpeed);
    this.outlineY = this.lerp(this.outlineY, this.mouseY, this.outlineSpeed);

    // Apply positions
    this.cursorDot.style.left = `${this.dotX}px`;
    this.cursorDot.style.top = `${this.dotY}px`;

    this.cursorOutline.style.left = `${this.outlineX}px`;
    this.cursorOutline.style.top = `${this.outlineY}px`;

    // Continue animation loop
    requestAnimationFrame(() => this.animate());
  }

  // Method to refresh hover listeners (useful after DOM updates)
  refresh() {
    this.addHoverListeners();
  }
}

// Initialize cursor when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize on non-touch devices
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.smoothCursor = new SmoothCursor();
  }
});
