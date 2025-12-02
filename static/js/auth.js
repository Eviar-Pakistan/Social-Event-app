// Get CSRF token from cookie
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const csrftoken = getCookie("csrftoken");

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Image compression function
// Compresses images to max 1920px width/height and 80% quality
async function compressImage(
  file,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.8
) {
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
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
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

// SweetAlert2 toast helper
function showToast(message, type = "error") {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: type, // "success", "error", "warning", "info", "question"
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
}

const signupBtn = document.getElementById("signupBtn");

signupBtn &&
  signupBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Disable button and show loading
    const btnText = document.getElementById("signupBtnText");
    const btnLoader = document.getElementById("signupBtnLoader");
    if (btnText && btnLoader) {
      btnText.style.display = "none";
      btnLoader.style.display = "inline";
    }
    signupBtn.disabled = true;

    const username = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const contactNo = document.getElementById("contact").value.trim();
    const role = document.getElementById("role").value.trim();
    const region = document.getElementById("region").value.trim();
    const selfieInput = document.getElementById("selfie");

    // Validate contact number format
    if (!/^03[0-9]{9}$/.test(contactNo)) {
      showToast(
        "Contact number must start with 03 and be 11 digits (e.g., 03001234567)",
        "error"
      );
      if (btnText && btnLoader) {
        btnText.style.display = "inline";
        btnLoader.style.display = "none";
      }
      signupBtn.disabled = false;
      return;
    }

    if (!selfieInput.files[0] || selfieInput.files[0].size === 0) {
      showToast("Please upload a selfie or take a photo", "error");
      if (btnText && btnLoader) {
        btnText.style.display = "inline";
        btnLoader.style.display = "none";
      }
      signupBtn.disabled = false;
      return;
    }

    const selfie = await toBase64(selfieInput.files[0]);
    const payload = {
      username,
      email,
      password,
      contactNo,
      role,
      selfie,
      region,
    };

    try {
      const response = await fetch("/api/users/signup/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        credentials: "include", // Include cookies for CSRF
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
          localStorage.setItem("access_token", `${data.access}`);
          localStorage.setItem("refresh_token", `${data.refresh}`); // fixed syntax

          showToast("Signup successful!", "success");
          setTimeout(() => {
              window.location.href = `${data.redirect}`;
          }, 1500);
      } else {
          showToast(data.message, "error");
          if (btnText && btnLoader) {
              btnText.style.display = "inline";
              btnLoader.style.display = "none";
          }
          signupBtn.disabled = false;
      }

    } catch (error) {
      console.error("Signup error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
      if (btnText && btnLoader) {
        btnText.style.display = "inline";
        btnLoader.style.display = "none";
      }
      signupBtn.disabled = false;
    }
  });

// Handle Enter key submission for forms
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");

  if (loginForm && loginBtn) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!loginBtn.disabled) {
        loginBtn.click();
      }
    });

    // Handle Enter key on password field
    const passwordField = document.getElementById("password");
    if (passwordField) {
      passwordField.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && !loginBtn.disabled) {
          e.preventDefault();
          loginBtn.click();
        }
      });
    }
  }
});

const signinBtn = document.getElementById("loginBtn");

signinBtn &&
  signinBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Disable button and show loading
    const btnText = document.getElementById("loginBtnText");
    const btnLoader = document.getElementById("loginBtnLoader");
    if (btnText && btnLoader) {
      btnText.style.display = "none";
      btnLoader.style.display = "inline";
    }
    signinBtn.disabled = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      showToast("Please enter both email and password", "error");
      if (btnText && btnLoader) {
        btnText.style.display = "inline";
        btnLoader.style.display = "none";
      }
      signinBtn.disabled = false;
      return;
    }

    const payload = { email, password };

    try {
      const response = await fetch("/api/users/signin/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        credentials: "include", // Include cookies for session
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // Store tokens in localStorage
        if (data.access) {
          localStorage.setItem("access_token", data.access);
          console.log("Access token stored in localStorage");
        } else {
          console.warn("No access token in response");
        }

        if (data.refresh) {
          localStorage.setItem("refresh_token", data.refresh);
          console.log("Refresh token stored in localStorage");
        } else {
          console.warn("No refresh token in response");
        }

        // Session cookie should be set automatically by Django's login() function
        // Check if sessionid cookie exists
        console.log("Cookies:", document.cookie);

        showToast("Signin successful!", "success");
        setTimeout(() => {
          window.location.href = "/api/events/";
        }, 1500);
      } else {
        showToast(data.message, "error");
        if (btnText && btnLoader) {
          btnText.style.display = "inline";
          btnLoader.style.display = "none";
        }
        signinBtn.disabled = false;
      }
    } catch (error) {
      console.error("Signin error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
      if (btnText && btnLoader) {
        btnText.style.display = "inline";
        btnLoader.style.display = "none";
      }
      signinBtn.disabled = false;
    }
  });
