// Buildmart — Login form
// Checks the fields in the browser, then logs in through POST /auth/login.
// The login token is kept in sessionStorage, so it ends when the tab closes.

(function () {
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const toggle = document.getElementById("togglePassword");
  const message = document.getElementById("formMessage");
  const submit = form.querySelector('button[type="submit"]');
  const session = document.getElementById("loginSession");
  const sessionText = document.getElementById("sessionText");
  const logoutButton = document.getElementById("logoutButton");
  const TOKEN_KEY = "buildmartToken";
  const SERVER_HELP = "Could not reach the server. Start the backend (npm start in backend/) and open this page from http://localhost:3000/login.html.";

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MIN_PASSWORD_LENGTH = 8;

  // ---- Validation rules ----
  // Each returns an error message, or "" if the value is fine
  function checkEmail() {
    const value = email.value.trim();
    if (value === "") return "Please enter your email address.";
    if (!EMAIL_PATTERN.test(value)) return "Please enter a valid email address, like name@example.com.";
    return "";
  }

  function checkPassword() {
    const value = password.value;
    if (value === "") return "Please enter your password.";
    if (value.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    return "";
  }

  // ---- Show / clear an error under a field ----
  function setFieldError(input, text) {
    const errorEl = document.getElementById(input.id + "Error");
    errorEl.textContent = text;
    if (text) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = "form-message" + (type ? " is-" + type : "");
  }

  // ---- Clear errors as soon as the user fixes them ----
  // Only re-check a field that is already showing an error,
  // so we don't nag the user while they are still typing
  [[email, checkEmail], [password, checkPassword]].forEach(([input, check]) => {
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        setFieldError(input, check());
      }
      if (message.textContent) showMessage("", "");
    });
  });

  // ---- Show / hide password ----
  toggle.addEventListener("click", () => {
    const showing = password.type === "text";
    password.type = showing ? "password" : "text";
    toggle.textContent = showing ? "Show password" : "Hide password";
    toggle.setAttribute("aria-pressed", String(!showing));
  });

  // ---- Logged-in state ----
  function readToken() {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  function saveToken(token) {
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch { /* Storage is blocked: the login still works until the page is reloaded */ }
  }
  function showLoggedIn(user) {
    sessionText.textContent = `You are logged in as ${user.username}.`;
    session.hidden = false;
    form.hidden = true;
  }
  function showLoggedOut() {
    session.hidden = true;
    form.hidden = false;
  }

  // Keep the user logged in across pages while the token is still valid
  async function restoreLogin() {
    const token = readToken();
    if (!token) return;
    try {
      const response = await fetch("/auth/verify", {headers: {Authorization: `Bearer ${token}`}});
      if (response.ok) {
        const data = await response.json();
        showLoggedIn(data.user);
      } else {
        saveToken(null);
      }
    } catch { /* Server is stopped: leave the form showing */ }
  }

  logoutButton.addEventListener("click", async () => {
    const token = readToken();
    // Remove the token here even if the server can't be reached
    saveToken(null);
    showLoggedOut();
    password.value = "";
    try {
      await fetch("/auth/logout", {method: "POST", headers: {Authorization: `Bearer ${token}`}});
      showMessage("You have been logged out.", "success");
    } catch {
      showMessage(SERVER_HELP, "error");
    }
  });

  // ---- Submit ----
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailError = checkEmail();
    const passwordError = checkPassword();
    setFieldError(email, emailError);
    setFieldError(password, passwordError);

    if (emailError || passwordError) {
      showMessage("Please fix the highlighted fields and try again.", "error");
      (emailError ? email : password).focus();
      return;
    }

    submit.disabled = true;
    showMessage("", "");
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email: email.value.trim(), password: password.value})
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        saveToken(data.token);
        password.value = "";
        showLoggedIn(data.user);
      } else {
        showMessage(data.error || "Could not log in. Please try again.", "error");
      }
    } catch {
      showMessage(SERVER_HELP, "error");
    } finally {
      submit.disabled = false;
    }
  });

  restoreLogin();
})();
