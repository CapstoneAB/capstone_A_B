// Buildmart — Login form (UI only)
// Checks the fields in the browser. Nothing is stored or sent anywhere;
// real sign-in will be connected to the backend in Version 2.

(function () {
  const form = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const toggle = document.getElementById("togglePassword");
  const message = document.getElementById("formMessage");

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

  // ---- Submit ----
  form.addEventListener("submit", (event) => {
    // Never do a real submit in Version 1
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

    showMessage("Login form is valid. Sign-in will be connected to the backend in Version 2.", "success");
  });
})();
