/**
 * HOVER PREVIEW - Shows image previews on navigation hover
 * Similar to Super Evil Geniuscorp menu interaction
 */

class HoverPreview {
    constructor() {
        this.previewContainer = document.getElementById('nav-preview');
        this.previewImage = document.getElementById('preview-image');
        this.navLinks = document.querySelectorAll('.nav-link[data-preview]');
        
        // Preview images (can be updated dynamically)
        this.previewImages = {
            home: 'at_logo.png',
            projects: 'at_logo.png',
            services: 'at_logo.png',
            about: 'at_logo.png',
            contact: 'at_logo.png'
        };
        
        this.currentPreview = null;
        this.isTransitioning = false;
        
        this.init();
    }
    
    init() {
        if (!this.previewContainer || !this.navLinks.length) {
            return;
        }
        
        this.navLinks.forEach(link => {
            link.addEventListener('mouseenter', (e) => this.showPreview(e));
            link.addEventListener('mouseleave', () => this.hidePreview());
        });
    }
    
    showPreview(e) {
        const previewKey = e.target.dataset.preview;
        const imageUrl = this.previewImages[previewKey];
        
        if (!imageUrl || this.currentPreview === previewKey) {
            return;
        }
        
        this.currentPreview = previewKey;
        
        // Fade out current image
        if (this.previewImage.src) {
            this.isTransitioning = true;
            this.previewContainer.style.opacity = '0';
            
            setTimeout(() => {
                this.previewImage.src = imageUrl;
                this.previewContainer.classList.add('active');
                this.previewContainer.style.opacity = '1';
                this.isTransitioning = false;
            }, 200);
        } else {
            this.previewImage.src = imageUrl;
            this.previewContainer.classList.add('active');
        }
    }
    
    hidePreview() {
        this.currentPreview = null;
        this.previewContainer.classList.remove('active');
    }
    
    // Method to update preview images
    setPreviewImages(images) {
        this.previewImages = { ...this.previewImages, ...images };
    }
}

/**
 * PROJECT CARD HOVER - Shows detailed preview on project card hover
 */

class ProjectCardPreview {
    constructor() {
        this.projectCards = document.querySelectorAll('.project-card');
        this.init();
    }
    
    init() {
        this.projectCards.forEach(card => {
            // Add magnetic effect on hover
            card.addEventListener('mousemove', (e) => this.magneticEffect(e, card));
            card.addEventListener('mouseleave', (e) => this.resetEffect(card));
        });
    }
    
    magneticEffect(e, card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const deltaX = (x - centerX) / centerX;
        const deltaY = (y - centerY) / centerY;
        
        // Apply subtle rotation and scale
        card.style.transform = `
            perspective(1000px)
            rotateY(${deltaX * 5}deg)
            rotateX(${-deltaY * 5}deg)
            translateY(-10px)
            scale(1.02)
        `;
        
        // Move image slightly
        const image = card.querySelector('.project-image');
        if (image) {
            image.style.transform = `
                translateX(${deltaX * 10}px)
                translateY(${deltaY * 10}px)
            `;
        }
    }
    
    resetEffect(card) {
        card.style.transform = '';
        
        const image = card.querySelector('.project-image');
        if (image) {
            image.style.transform = '';
        }
    }
}

/**
 * SERVICE ITEM HOVER - Interactive hover effect for service items
 */

class ServiceItemHover {
    constructor() {
        this.serviceItems = document.querySelectorAll('.service-item');
        this.init();
    }
    
    init() {
        this.serviceItems.forEach(item => {
            // Create hover highlight element
            const highlight = document.createElement('div');
            highlight.className = 'service-highlight';
            highlight.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle at var(--mouse-x) var(--mouse-y), 
                    rgba(0, 255, 0, 0.1) 0%, 
                    transparent 50%);
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            item.style.position = 'relative';
            item.appendChild(highlight);
            
            item.addEventListener('mousemove', (e) => this.onMouseMove(e, item, highlight));
            item.addEventListener('mouseenter', () => { highlight.style.opacity = '1'; });
            item.addEventListener('mouseleave', () => { highlight.style.opacity = '0'; });
        });
    }
    
    onMouseMove(e, item, highlight) {
        const rect = item.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        item.style.setProperty('--mouse-x', `${x}px`);
        item.style.setProperty('--mouse-y', `${y}px`);
    }
}

// Initialize all hover effects when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.hoverPreview = new HoverPreview();
    window.projectCardPreview = new ProjectCardPreview();
    window.serviceItemHover = new ServiceItemHover();
});
