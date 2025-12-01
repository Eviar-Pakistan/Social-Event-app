// Modern UI Interactive Enhancements

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // SMOOTH SCROLL BEHAVIOR
    // ============================================
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // ============================================
    // ENHANCED POST CARD INTERACTIONS
    // ============================================
    const postCards = document.querySelectorAll('.post-card-modern');
    postCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // ============================================
    // ENHANCED LIKE BUTTON ANIMATION
    // ============================================
    const likeButtons = document.querySelectorAll('.action-btn');
    likeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(228, 0, 43, 0.3);
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
                animation: ripple 0.6s ease-out;
                transform: scale(0);
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
    
    // Add ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // ============================================
    // ENHANCED MODAL CLOSING
    // ============================================
    const modals = document.querySelectorAll('.modal-overlay-modern, .comments-modal-modern');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });
    
    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    document.addEventListener('keydown', function(e) {
        // Escape to close modals
        if (e.key === 'Escape') {
            modals.forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                }
            });
        }
        
        // Ctrl/Cmd + K to create post
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const createBtn = document.getElementById('createPostBtn');
            if (createBtn) createBtn.click();
        }
    });
    
    // ============================================
    // IMAGE PREVIEW ON POST CREATION
    // ============================================
    const imageInput = document.getElementById('image');
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Remove existing preview
                    const existing = document.getElementById('image-preview');
                    if (existing) existing.remove();
                    
                    // Create preview
                    const preview = document.createElement('img');
                    preview.id = 'image-preview';
                    preview.src = e.target.result;
                    preview.style.cssText = `
                        width: 100%;
                        max-height: 300px;
                        object-fit: cover;
                        border-radius: 12px;
                        margin-top: 12px;
                        box-shadow: 0 2px 8px rgba(33, 39, 33, 0.1);
                    `;
                    
                    imageInput.parentElement.appendChild(preview);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // ============================================
    // ENHANCED COMMENT INPUT
    // ============================================
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
        commentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (typeof addComment === 'function') {
                    addComment();
                }
            }
        });
    }
    
    // ============================================
    // FADE IN ANIMATIONS ON SCROLL
    // ============================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe post cards
    postCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
    
    // ============================================
    // ENHANCED QR BUTTON
    // ============================================
    const qrButton = document.getElementById('qrTab');
    if (qrButton) {
        qrButton.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        
        qrButton.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    }
    
    // ============================================
    // LOADING STATE FOR BUTTONS
    // ============================================
    const submitPostBtn = document.getElementById('submitPostBtn');
    if (submitPostBtn) {
        const originalText = submitPostBtn.textContent;
        submitPostBtn.addEventListener('click', function() {
            if (!this.disabled) {
                this.disabled = true;
                this.textContent = 'Posting...';
                this.style.opacity = '0.7';
            }
        });
    }
    
    console.log('✨ Modern UI interactions loaded!');
});



