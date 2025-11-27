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

 const helpBtn = document.getElementById('helpBtn');
    const helpPopup = document.getElementById('helpPopup');
    const closeHelp = document.getElementById('closeHelp');

    helpBtn.addEventListener('click', () => helpPopup.classList.remove('hidden'));
    closeHelp.addEventListener('click', () => helpPopup.classList.add('hidden'));

    const swiper = new Swiper('.swiper-container', {
      loop: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      autoplay: {
        delay: 3000,
      },
    });

const createPostBtn = document.getElementById('createPostBtn');
const postModal = document.getElementById('postModal');
const closePostModal = document.getElementById('closePostModal');

createPostBtn.addEventListener('click', () => postModal.classList.remove('hidden'));
closePostModal.addEventListener('click', () => postModal.classList.add('hidden'));


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
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast(data.message, "error");
        }

    } catch (error) {
        console.error("Post creation error:", error);
        showToast("An unexpected error occurred. Please try again.", "error");
    }
});


async function toggleLike(postId) {
    const token = localStorage.getItem("access_token");

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
        if (data.message === "Post liked") {
            icon.src = "/static/icon/heart.png";
        } else {
            icon.src = "/static/icon/outlineheart.png";
        }
    }
}


// Comments Modal
function openCommentsModal(postId) {
    const modal = document.getElementById("comments-modal");
    modal.classList.remove("translate-y-full", "hidden");
    modal.classList.add("translate-y-0", "block");

    loadComments(postId);
}

// Close Modal
function closeCommentsModal() {
    const modal = document.getElementById("comments-modal");
    modal.classList.remove("translate-y-0");
    modal.classList.add("translate-y-full");
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
        div.className = "flex items-start space-x-2 p-2 border rounded";

        const profileImg = document.createElement("img");
        profileImg.src = comment.profile_picture || "/static/images/default-profile.png";
        profileImg.alt = comment.user;
        profileImg.className = "w-8 h-8 rounded-full object-cover";

        const contentDiv = document.createElement("div");
        contentDiv.innerHTML = `
            <div class="flex items-center space-x-2">
                <strong>${comment.user}</strong>
                <span class="text-gray-400 text-sm">${comment.time_ago}</span>
            </div>
            <p>${comment.content}</p>
        `;

        div.appendChild(profileImg);
        div.appendChild(contentDiv);
        commentsList.appendChild(div);
    });
} else {
    commentsList.innerHTML = "<p class='text-gray-500'>No comments yet.</p>";
}

        document.getElementById("comment-post-id").value = postId;

        // Show modal
        const modal = document.getElementById("comments-modal");
        modal.classList.remove("hidden");
        modal.classList.remove("translate-y-full");

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
        }
    } catch (err) {
        console.error(err);
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




