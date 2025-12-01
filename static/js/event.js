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
    const image = imageInput.files[0] ? await toBase64(imageInput.files[0]) : null;

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


// Scan Qr
const qrTab = document.getElementById("qrTab");

qrTab && qrTab.addEventListener("click", () => {
    const token = localStorage.getItem("access_token");
    const qrModal = document.getElementById("qrModal");
    const closeScanner = document.getElementById("closeScanner");

    qrModal.classList.remove("hidden");

    let html5QrCode = new Html5Qrcode("qr-reader");

    function startScanner() {
        const config = { fps: 10, qrbox: 250 };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            async (decodedText) => {
                console.log("QR Result:", decodedText);

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
                        html5QrCode.stop();
                        qrModal.classList.add("hidden");
                        setTimeout(() => window.location.reload(), 3000);

                    } else {
                        showToast(data.message, "error");
                        html5QrCode.stop();
                        qrModal.classList.add("hidden");
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        );
    }

    startScanner();
    
    closeScanner.addEventListener("click", () => {
        html5QrCode.stop();
        qrModal.classList.add("hidden");
    });
});




