document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container");
  const registerButton = document.getElementById("register");
  const loginButton = document.getElementById("login");
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const registerMessage = document.getElementById("registerMessage");
  const loginMessage = document.getElementById("loginMessage");

  if (!container || !registerButton || !loginButton || !registerForm || !loginForm) {
    return;
  }

  registerButton.addEventListener("click", (event) => {
    event.preventDefault();
    container.classList.add("right-panel-active");
  });

  loginButton.addEventListener("click", (event) => {
    event.preventDefault();
    container.classList.remove("right-panel-active");
  });

  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const input = document.querySelector(button.getAttribute("toggle"));
      if (!input) {
        return;
      }

      input.type = input.type === "password" ? "text" : "password";
      const icon = button.querySelector("svg");
      if (icon) {
        icon.classList.toggle("visible");
      }
    });
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: document.getElementById("registerName").value.trim(),
      email: document.getElementById("registerEmail").value.trim(),
      password: document.getElementById("registerPassword").value
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to register right now.");
      }

      localStorage.setItem("unicuraAuth", data.token);
      localStorage.setItem("unicuraUser", JSON.stringify(data.user));
      registerMessage.textContent = data.message;
      registerMessage.style.display = "block";
      registerForm.reset();

      setTimeout(() => {
        container.classList.remove("right-panel-active");
        registerMessage.style.display = "none";
      }, 1200);
    } catch (error) {
      registerMessage.textContent = error.message;
      registerMessage.style.display = "block";
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value
    };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to log in right now.");
      }

      localStorage.setItem("unicuraAuth", data.token);
      localStorage.setItem("unicuraUser", JSON.stringify(data.user));
      loginMessage.textContent = data.message;
      loginMessage.style.display = "block";

      setTimeout(() => {
        window.location.href = "../index.html";
      }, 800);
    } catch (error) {
      loginMessage.textContent = error.message;
      loginMessage.style.display = "block";
    }
  });
});

function handleFbSignIn() {
  alert("Social sign-in is not connected yet. Please use email and password for now.");
}

function handleGoogleSignIn() {
  alert("Social sign-in is not connected yet. Please use email and password for now.");
}

function handleLinkedInSignIn() {
  alert("Social sign-in is not connected yet. Please use email and password for now.");
}

function handleMicrosoftSignIn() {
  alert("Social sign-in is not connected yet. Please use email and password for now.");
}

function handleGitHubSignIn() {
  alert("Social sign-in is not connected yet. Please use email and password for now.");
}
