/**
 * Contact Modal Logic
 * Handles opening/closing of the contact modal and form interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const modal = document.getElementById('contact-modal');
    const closeBtn = document.getElementById('close-modal');
    const globeContainer = document.getElementById('fixed-globe-container');
    const globeLink = document.querySelector('.globe-link-overlay');
    const contactForm = document.getElementById('contact-form');
    // Select contact link in the nav menu (matches href ending in #contact)
    const navContactLink = document.querySelector('.nav-link[href*="#contact"]');
    
    if (!modal) return;

    // Open Modal
    function openModal(e) {
        e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    // Close Modal
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    // Event Listeners
    if (globeContainer) {
        globeContainer.addEventListener('click', openModal);
    }
    
    if (globeLink) {
        globeLink.addEventListener('click', openModal);
    }

    if (navContactLink) {
        navContactLink.addEventListener('click', (e) => {
            openModal(e);
            // Optional: Explicitly close the menu if main.js doesn't handle it perfectly
            // But main.js has a listener on .nav-link to toggleMenu(), so it should close automatically.
            // visual polish: ensure modal is ON TOP of the menu if menu takes a second to close? 
            // The modal z-index should be higher.
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Handle Form Submission
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const countryCode = document.getElementById('country-code') ? document.getElementById('country-code').value : '';
            const message = document.getElementById('message').value;
            
            // Visual feedback
            const submitBtn = contactForm.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'OPENING MAIL...';
            submitBtn.disabled = true;
            
            // Construct Email Body
            const subject = `Portfolio Contact from ${name}`;
            const body = `Name: ${name}
Email: ${email}
Phone: ${countryCode} ${phone}

Message:
${message}`;

            const mailtoLink = `mailto:tanupam760@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            // Open Mail Client
            window.location.href = mailtoLink;
            
            setTimeout(() => {
                submitBtn.textContent = 'SENT!';
                
                setTimeout(() => {
                    closeModal();
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    contactForm.reset();
                }, 1000);
            }, 1000);
        });
    }
});
