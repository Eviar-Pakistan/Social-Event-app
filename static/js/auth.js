const IP = "51.20.71.150"
// Get CSRF token from cookie
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

// SweetAlert2 toast helper
function showToast(message, type = "error") {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: type, // "success", "error", "warning", "info", "question"
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

const signupBtn = document.getElementById("signupBtn");

signupBtn && signupBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const username = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const contactNo = document.getElementById("contact").value.trim();
    const role = document.getElementById("role").value.trim();
    const selfieInput = document.getElementById("selfie");
    const selfie = selfieInput.files[0] ? await toBase64(selfieInput.files[0]) : null;

    const payload = { username, email, password, contactNo, role, selfie };

    try {
        const response = await fetch(`${IP}/api/users/signup/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrftoken
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);

            showToast("Signup successfully", "success");
            setTimeout(() => {
                window.location.href = "/api/events/";
            }, 1500);
        } else {
            showToast(data.message, "error");
        }

    } catch (error) {
        console.error("Signup error:", error);
        showToast("An unexpected error occurred. Please try again.", "error");
    }
});


const signinBtn = document.getElementById("loginBtn");

signinBtn && signinBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const payload = { email, password };

    try {
        const response = await fetch(`${IP}/api/users/signin/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrftoken
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);

            showToast("Signin successful!", "success");
            setTimeout(() => {
                window.location.href = "/api/events/";
            }, 1500);
        } else {
            showToast(data.message, "error");
        }
    } catch (error) {
        console.error("Signin error:", error);
        showToast("An unexpected error occurred. Please try again.", "error");
    }
});

