// Additional Features for Events Page

// Image compression function
// Compresses images to max 1920px width/height and 80% quality
async function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    } else {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                // Create canvas and compress
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// PROFILE DROPDOWN MENU - LEFT SIDE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Desktop + Mobile profile dropdown
    const profileMenuBtnLeft = document.getElementById('profileMenuBtnLeft');
    const profileMenuLeft = document.getElementById('profileMenuLeft');
    const profileMenuBtnLeftMobile = document.getElementById('profileMenuBtnLeftMobile');
    const profileMenuLeftMobile = document.getElementById('profileMenuLeftMobile');

    // Helper to toggle any given menu element (CSS handles visibility)
    function toggleMenu(menu) {
        if (!menu) return;
        menu.classList.toggle('show');
    }

    // Desktop avatar
    if (profileMenuBtnLeft && profileMenuLeft) {
        profileMenuBtnLeft.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu(profileMenuLeft);
            if (profileMenuLeftMobile) {
                profileMenuLeftMobile.classList.remove('show');
            }
        });
    }

    // Mobile avatar (same logic, shared helper)
       // Mobile avatar (same logic, shared helper)
   // Mobile avatar (same logic, shared helper)
if (profileMenuBtnLeftMobile && profileMenuLeftMobile) {
    const handleMobileProfileClick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Get button position
        const buttonRect = profileMenuBtnLeftMobile.getBoundingClientRect();
        
        // Position dropdown dynamically
        if (profileMenuLeftMobile.classList.contains('show')) {
            // Close it
            profileMenuLeftMobile.classList.remove('show');
        } else {
            // Open it and position it
            profileMenuLeftMobile.style.position = 'fixed';
            profileMenuLeftMobile.style.top = (buttonRect.bottom + 12) + 'px';
            profileMenuLeftMobile.style.left = buttonRect.left + 'px';
            profileMenuLeftMobile.classList.add('show');
        }
        
        if (profileMenuLeft) {
            profileMenuLeft.classList.remove('show');
        }
    };
    
    profileMenuBtnLeftMobile.addEventListener('click', handleMobileProfileClick);
    profileMenuBtnLeftMobile.addEventListener('touchend', function(e) {
        e.preventDefault();
        handleMobileProfileClick(e);
    });
}

    // Close both when clicking outside
    document.addEventListener('click', function(e) {
        if (profileMenuLeft &&
            !profileMenuLeft.contains(e.target) &&
            !(profileMenuBtnLeft && profileMenuBtnLeft.contains(e.target))) {
            profileMenuLeft.classList.remove('show');
        }
        if (profileMenuLeftMobile &&
            !profileMenuLeftMobile.contains(e.target) &&
            !(profileMenuBtnLeftMobile && profileMenuBtnLeftMobile.contains(e.target))) {
            profileMenuLeftMobile.classList.remove('show');
        }
    });
});

// ============================================
// LOGOUT FUNCTION
// ============================================
async function handleLogout() {
    try {
        // Get CSRF token
        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let cookie of cookies) {
                    cookie = cookie.trim();
                    if (cookie.startsWith(name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }
        const csrftoken = getCookie('csrftoken');
        
        // Call logout endpoint to clear server session
        const response = await fetch('/api/users/logout/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            credentials: 'include'
        });
        
        // Clear tokens from localStorage regardless of response
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        // Clear any other stored data
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = '/api/users/signin/';
    } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, clear tokens and redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.clear();
        window.location.href = '/api/users/signin/';
    }
}

// ============================================
// POST DETAIL MODAL
// ============================================
function openPostDetail(postId) {
    const modal = document.getElementById('postDetailModal');
    const content = document.getElementById('postDetailContent');
    
    if (!modal || !content) return;
    
    // Show loading state
    content.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="loading-spinner" style="margin: 0 auto;"></div>
            <p style="margin-top: 16px; color: var(--text-light);">Loading post...</p>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Fetch post details
    const token = localStorage.getItem("access_token");
    
    fetch(`/api/events/${postId}/`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success") {
            const post = data.post;
            
            // Update URL without reload
            window.history.pushState({}, '', `/api/events/${postId}/`);
            
            content.innerHTML = `
                <div style="text-align: center;">
                    ${post.image ? `
                        <img src="${post.image}" class="post-detail-image" alt="Post image">
                    ` : ''}
                    <p class="post-detail-caption">${post.caption}</p>
                    <div class="post-detail-meta">
                        <div class="post-detail-stat">
                            <div class="post-detail-stat-value">${post.total_likes}</div>
                            <div class="post-detail-stat-label">Likes</div>
                        </div>
                        <div class="post-detail-stat">
                            <div class="post-detail-stat-value">${post.total_comments}</div>
                            <div class="post-detail-stat-label">Comments</div>
                        </div>
                    </div>
                    <div style="margin-top: 24px; padding: 16px; background: var(--bg-beige); border-radius: 12px;">
                        <p style="font-size: 12px; color: var(--text-light); margin-bottom: 8px;">Posted by</p>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                            ${post.user_avatar ? `
                                <img src="${post.user_avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            ` : `
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--accent-red); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                                    ${post.user.charAt(0).toUpperCase()}
                                </div>
                            `}
                            <span style="font-weight: 700; font-size: 16px;">${post.user}</span>
                        </div>
                        <p style="font-size: 12px; color: var(--text-light); margin-top: 8px;">${post.created_at}</p>
                    </div>
                    <div class="post-detail-actions">
                        <button onclick="toggleLike(${post.id}); loadPostDetail(${post.id});" class="action-btn ${post.is_liked_by_user ? 'active' : ''}" style="padding: 12px 24px; font-size: 16px;">
                            ${post.is_liked_by_user ? '❤️ Liked' : '🤍 Like'}
                        </button>
                        <button onclick="closePostDetail(); openCommentsModal(${post.id});" class="action-btn" style="padding: 12px 24px; font-size: 16px; background: var(--accent-red); color: white;">
                            💬 Comment
                        </button>
                    </div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <p style="color: var(--accent-red); font-weight: 600;">Failed to load post details</p>
                    <button onclick="closePostDetail()" class="create-post-btn" style="margin-top: 16px; max-width: 200px;">
                        Close
                    </button>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error loading post detail:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <p style="color: var(--accent-red); font-weight: 600;">Error loading post</p>
                <button onclick="closePostDetail()" class="create-post-btn" style="margin-top: 16px; max-width: 200px;">
                    Close
                </button>
            </div>
        `;
    });
}

function loadPostDetail(postId) {
    // Reload post detail after like action
    const content = document.getElementById('postDetailContent');
    if (content && !document.getElementById('postDetailModal').classList.contains('hidden')) {
        openPostDetail(postId);
    }
}

function closePostDetail() {
    const modal = document.getElementById('postDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset URL
        window.history.pushState({}, '', '/api/events/');
    }
}

// Close post detail on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const postDetailModal = document.getElementById('postDetailModal');
        if (postDetailModal && !postDetailModal.classList.contains('hidden')) {
            closePostDetail();
        }
    }
});

// Close post detail on overlay click
document.addEventListener('click', function(e) {
    const postDetailModal = document.getElementById('postDetailModal');
    if (postDetailModal && e.target === postDetailModal) {
        closePostDetail();
    }
});

// ============================================
// IMAGE UPLOAD PREVIEW
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image');
    const imageUploadBox = document.getElementById('imageUploadBox');
    const imageUploadContainer = document.getElementById('image-upload-container');
    
    if (imageInput && imageUploadBox && imageUploadContainer) {
        imageInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                // Compress the uploaded image
                const compressedFile = await compressImage(file);
                
                // Update the input with compressed file
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(compressedFile);
                imageInput.files = dataTransfer.files;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Remove existing preview
                    const existingPreview = imageUploadContainer.querySelector('.image-preview-container');
                    if (existingPreview) {
                        existingPreview.remove();
                    }
                    
                    // Hide upload box
                    imageUploadBox.style.display = 'none';
                    
                    // Create preview
                    const previewContainer = document.createElement('div');
                    previewContainer.className = 'image-preview-container';
                    previewContainer.innerHTML = `
                        <img src="${e.target.result}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                        <button type="button" class="image-preview-remove" onclick="removeImagePreview()" title="Remove image">×</button>
                    `;
                    
                    imageUploadContainer.appendChild(previewContainer);
                };
                reader.readAsDataURL(compressedFile);
            }
        });
    }
});

function removeImagePreview() {
    const imageUploadContainer = document.getElementById('image-upload-container');
    const imageInput = document.getElementById('image');
    const imageUploadBox = document.getElementById('imageUploadBox');
    
    if (imageUploadContainer && imageInput && imageUploadBox) {
        const preview = imageUploadContainer.querySelector('.image-preview-container');
        if (preview) {
            preview.remove();
        }
        imageInput.value = '';
        imageUploadBox.style.display = 'flex';
    }
}

// Reset image preview when modal closes
document.addEventListener('DOMContentLoaded', function() {
    const postModal = document.getElementById('postModal');
    const closePostModal = document.getElementById('closePostModal');
    
    function resetImageUpload() {
        removeImagePreview();
        const caption = document.getElementById('caption');
        if (caption) caption.value = '';
    }
    
    if (closePostModal) {
        closePostModal.addEventListener('click', resetImageUpload);
    }
    
    if (postModal) {
        postModal.addEventListener('click', function(e) {
            if (e.target === postModal) {
                resetImageUpload();
            }
        });
    }
});

