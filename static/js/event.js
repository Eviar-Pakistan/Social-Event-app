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

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

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
 

function showToast(message, type = "error") {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

// Modal handlers are now in the HTML template
// Keeping this file for API functions only


const submitPostBtn = document.getElementById('submitPostBtn');

submitPostBtn.addEventListener('click', async () => {
     event.preventDefault(); 
    let token = localStorage.getItem("access_token");
    const caption = document.getElementById('caption').value;
    const imageInput = document.getElementById("image");
    let image = null;
    if (imageInput.files[0]) {
        // Compress image before uploading
        const compressedFile = await compressImage(imageInput.files[0]);
        image = await toBase64(compressedFile);
    }

    const payload = { caption, image };

    try {
        const response = await fetch("/api/events/create_post/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "X-CSRFToken": csrftoken
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.status === "success") {
            showToast("Post created successfully", "success");
            // Reset button state
            const submitBtn = document.getElementById('submitPostBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post';
                submitBtn.style.opacity = '1';
            }
            // Close modal
            const postModal = document.getElementById('postModal');
            if (postModal) postModal.classList.add('hidden');
            // Reset form
            document.getElementById('caption').value = '';
            document.getElementById('image').value = '';
            const preview = document.getElementById('image-preview');
            if (preview) preview.remove();
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast(data.message, "error");
            // Reset button state on error
            const submitBtn = document.getElementById('submitPostBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post';
                submitBtn.style.opacity = '1';
            }
        }

    } catch (error) {
        console.error("Post creation error:", error);
        showToast("An unexpected error occurred. Please try again.", "error");
        // Reset button state on error
        const submitBtn = document.getElementById('submitPostBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
            submitBtn.style.opacity = '1';
        }
    }
});


async function toggleLike(postId) {
    const token = localStorage.getItem("access_token");

    try {
        const res = await fetch(`/api/events/${postId}/like/`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`
            ,"X-CSRFToken": csrftoken
        }
        });
        const data = await res.json();

        if (data.status === "success") {
            document.getElementById(`like-count-${postId}`).innerText = data.total_likes;
            const icon = document.getElementById(`like-icon-${postId}`);
            const likeBtn = icon.closest('.like-btn');
            
            if (data.message === "Post liked") {
                icon.src = "/static/icon/heart.png";
                if (likeBtn) likeBtn.classList.add("active");
                showToast("Post liked! ❤️", "success");
            } else {
                icon.src = "/static/icon/outlineheart.png";
                if (likeBtn) likeBtn.classList.remove("active");
            }
        } else {
            showToast(data.message || "Something went wrong", "error");
        }
    } catch (error) {
        console.error("Like error:", error);
        showToast("Failed to like post. Please try again.", "error");
    }
}


// Comments Modal
function openCommentsModal(postId) {
    const modal = document.getElementById("comments-modal");
    modal.classList.remove("hidden");

    loadComments(postId);
}

// Close Modal
function closeCommentsModal() {
    const modal = document.getElementById("comments-modal");
    modal.classList.add("hidden");
}

// Load comments from backend
async function loadComments(postId) {
    const token = localStorage.getItem("access_token");
    try {
        const res = await fetch(`/api/events/${postId}/comments/`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();

        const commentsList = document.getElementById("comments-list");
        commentsList.innerHTML = "";

   if (data.status === "success" && Array.isArray(data.comments) && data.comments.length > 0) {
    data.comments.forEach(comment => {
        console.log(comment);
        const div = document.createElement("div");
        div.className = "comment-item-modern";

        const profileImg = document.createElement("img");
        profileImg.src = comment.profile_picture || "/static/images/default-profile.png";
        profileImg.alt = comment.user;
        profileImg.className = "comment-avatar-modern";

        const contentDiv = document.createElement("div");
        contentDiv.className = "comment-content-modern";
        contentDiv.innerHTML = `
            <div class="comment-author-modern">
                ${comment.user}
                <span class="comment-time-modern">${comment.time_ago}</span>
            </div>
            <p class="comment-text-modern">${comment.content}</p>
        `;

        div.appendChild(profileImg);
        div.appendChild(contentDiv);
        commentsList.appendChild(div);
    });
} else {
    commentsList.innerHTML = "<div class='empty-state-modern'><div class='empty-icon'>💬</div><div class='empty-title'>No comments yet</div><div class='empty-text'>Be the first to comment!</div></div>";
}

        document.getElementById("comment-post-id").value = postId;

        // Show modal
        const modal = document.getElementById("comments-modal");
        modal.classList.remove("hidden");

    } catch (error) {
        console.error("Error loading comments:", error);
    }
}


// Add Comment
async function addComment() {
    const token = localStorage.getItem("access_token");
    const postId = document.getElementById("comment-post-id").value;
    const input = document.getElementById("comment-input");
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`/api/events/${postId}/comment/`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-CSRFToken": csrftoken
            },
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (data.status === "success") {
            input.value = "";
            loadComments(postId);
            document.getElementById(`comment-count-${postId}`).innerText = data.total_comments;
            showToast("Comment added successfully!", "success");
        } else {
            showToast(data.message || "Failed to add comment", "error");
        }
    } catch (err) {
        console.error("Comment error:", err);
        showToast("An error occurred while adding comment", "error");
    }
}

document.getElementById("see-more-btn").addEventListener("click", function () {
    const fullList = document.getElementById("full-leaderboard");
    const top3list = document.getElementById("top3-leaderboard")

    if (fullList.classList.contains("visible")) {
        fullList.classList.remove("visible");
        top3list.style.display = "block"
        this.textContent = "See More";
    } else {
        top3list.style.display = "none"
        fullList.classList.add("visible");
        this.textContent = "Show Less";
    }
});

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
                            ${post.is_liked_by_user ? '❤ Liked' : '🤍 Like'}
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

// Scan QR
const qrTab = document.getElementById("qrTab");
const qrModal = document.getElementById("qrModal");
const closeScanner = document.getElementById("closeScanner");
let html5QrCode = null;
let isProcessingQr = false; // Flag to prevent multiple simultaneous requests
let lastScannedQr = null; // Track last scanned QR code

function stopQrScannerAndClose() {
    if (!qrModal) return;

    isProcessingQr = false;
    lastScannedQr = null;

    if (html5QrCode) {
        try {
            // stop() returns a promise; hide modal regardless of success/failure
            html5QrCode.stop()
                .catch(() => {})
                .finally(() => {
                    qrModal.classList.add("hidden");
                });
        } catch (err) {
            console.error("Error stopping QR scanner:", err);
            qrModal.classList.add("hidden");
        }
    } else {
        // No scanner instance yet; just hide the modal
        qrModal.classList.add("hidden");
    }
}

if (closeScanner && qrModal) {
    // Close when clicking the X button
    closeScanner.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopQrScannerAndClose();
    });
}

if (qrTab && qrModal) {
    qrTab.addEventListener("click", () => {
        const token = localStorage.getItem("access_token");

        
        isProcessingQr = false;
        lastScannedQr = null;
        qrModal.classList.remove("hidden");

        // Create scanner instance if needed
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        const config = { fps: 10, qrbox: 250 };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            async (decodedText) => {
                console.log("QR Result:", decodedText);

                // Prevent duplicate requests
                if (isProcessingQr) {
                    console.log("Already processing a QR code request, ignoring...");
                    return;
                }

                // Prevent scanning the same QR code multiple times
                if (lastScannedQr === decodedText) {
                    console.log("Same QR code detected again, ignoring...");
                    return;
                }

                // Stop scanner immediately to prevent multiple scans
                try {
                    await html5QrCode.stop();
                } catch (err) {
                    console.error("Error stopping scanner:", err);
                }

                // Set flags before making request
                isProcessingQr = true;
                lastScannedQr = decodedText;

                try {
                    const res = await fetch("/api/events/submit-qr/", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": csrftoken,
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ qr_data: decodedText })
                    });

                    const data = await res.json();

                    if (data.status === "success") {
                        showToast(data.message, "success");
                        stopQrScannerAndClose();
                        setTimeout(() => window.location.reload(), 3000);
                    } else {
                        showToast(data.message, "error");
                        stopQrScannerAndClose();
                    }
                } catch (err) {
                    console.error(err);
                    stopQrScannerAndClose();
                } finally {
                    // Reset processing flag after request completes
                    isProcessingQr = false;
                }
            }
        );
    });
}




