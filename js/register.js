// Buildmart — Registration form
// Checks every field as the user types, using the same rules as the server
// (backend/auth/routes.js and backend/auth/passwords.js), then sends the form
// to POST /auth/register. The password only lives in the form field: it is
// never saved in the browser (no localStorage, sessionStorage or cookies)
// and never put in a URL.

(function () {
  const form = document.getElementById("registerForm");
  const username = document.getElementById("username");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirm = document.getElementById("confirmPassword");
  const toggle = document.getElementById("togglePassword");
  const message = document.getElementById("formMessage");
  const submit = document.getElementById("registerSubmit");
  const strengthMeter = document.getElementById("strengthMeter");
  const strengthText = document.getElementById("strengthText");
  const confirmMatch = document.getElementById("confirmPasswordMatch");
  const ruleItems = document.querySelectorAll("#passwordRules [data-rule]");

  const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MAX_EMAIL_LENGTH = 254;
  const MIN_PASSWORD_LENGTH = 8;
  // bcrypt on the server only uses 72 bytes (accented letters and emoji use more than 1)
  const MAX_PASSWORD_BYTES = 72;
  const STRONG_LENGTH = 12;
  const SUBMIT_TEXT = submit.textContent;
  // A field is checked live after the user has left it once (or tried to submit),
  // so they aren't told off for an email they haven't finished typing yet
  const touched = new Set();

  // ---- Password rules (same as checkPasswordStrength on the server) ----
  const PASSWORD_RULES = {
    length: (value) => value.length >= MIN_PASSWORD_LENGTH,
    maxBytes: (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
    upper: (value) => /[A-Z]/.test(value),
    lower: (value) => /[a-z]/.test(value),
    number: (value) => /[0-9]/.test(value),
    symbol: (value) => /[^A-Za-z0-9\s]/.test(value)
  };

  function failedRules(value) {
    return Object.keys(PASSWORD_RULES).filter((rule) => !PASSWORD_RULES[rule](value));
  }

  // ---- Validation rules ----
  // Each returns an error message, or "" if the value is fine
  function checkUsername() {
    const value = username.value;
    if (value === "") return "Please choose a username.";
    if (!USERNAME_PATTERN.test(value)) return "Username must be 3 to 20 characters: letters, numbers or underscore.";
    return "";
  }

  function checkEmail() {
    const value = email.value.trim();
    if (value === "") return "Please enter your email address.";
    if (!EMAIL_PATTERN.test(value) || value.length > MAX_EMAIL_LENGTH) return "Please enter a valid email address, like name@example.com.";
    return "";
  }

  function checkPassword() {
    if (password.value === "") return "Please choose a password.";
    if (failedRules(password.value).length) return "Your password doesn't meet all the rules yet.";
    return "";
  }

  function checkConfirm() {
    if (confirm.value === "") return "Please type your password again.";
    if (confirm.value !== password.value) return "Passwords do not match.";
    return "";
  }

  // Server field names (from the API) mapped to the input and its check
  const fields = {
    username: [username, checkUsername],
    email: [email, checkEmail],
    password: [password, checkPassword],
    confirmPassword: [confirm, checkConfirm]
  };

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

  // ---- Live password checklist and strength meter ----
  // Weak = still missing a rule, fair = passes every rule, strong = also 12+ characters
  function updatePasswordHelp() {
    const value = password.value;
    const failed = failedRules(value);
    ruleItems.forEach((item) => {
      const met = value !== "" && !failed.includes(item.dataset.rule);
      item.classList.toggle("is-met", met);
      item.querySelector(".rule-state").textContent = met ? "Done: " : "Not yet: ";
    });
    let level = "";
    if (value !== "") level = failed.length ? "weak" : value.length >= STRONG_LENGTH ? "strong" : "fair";
    strengthMeter.className = "strength-meter" + (level ? " is-" + level : "");
    strengthText.textContent = level ? "Strength: " + level : "";
  }

  // ---- Confirm field says whether it matches ----
  // "Do not match" only shows once the user has typed as much as the password
  // (or left the field), so it doesn't flash up after the first letter
  function updateConfirmStatus() {
    const value = confirm.value;
    const matches = value !== "" && value === password.value;
    confirmMatch.textContent = matches ? "Passwords match." : "";
    const ready = touched.has(confirm) || (value !== "" && value.length >= password.value.length);
    setFieldError(confirm, ready && !matches ? checkConfirm() : "");
  }

  // ---- Real-time checks while typing ----
  [username, email].forEach((input) => {
    const check = fields[input.id][1];
    input.addEventListener("input", () => {
      if (touched.has(input)) setFieldError(input, check());
      if (message.textContent) showMessage("", "");
    });
    input.addEventListener("blur", () => {
      if (input.value !== "") touched.add(input);
      if (touched.has(input)) setFieldError(input, check());
    });
  });

  password.addEventListener("input", () => {
    updatePasswordHelp();
    if (touched.has(password)) setFieldError(password, checkPassword());
    if (confirm.value !== "") updateConfirmStatus();
    if (message.textContent) showMessage("", "");
  });
  password.addEventListener("blur", () => {
    if (password.value !== "") touched.add(password);
    if (touched.has(password)) setFieldError(password, checkPassword());
  });

  confirm.addEventListener("input", () => {
    updateConfirmStatus();
    if (message.textContent) showMessage("", "");
  });
  confirm.addEventListener("blur", () => {
    if (confirm.value !== "") touched.add(confirm);
    updateConfirmStatus();
  });

  // ---- Show / hide password (both password fields) ----
  function setPasswordVisible(visible) {
    password.type = visible ? "text" : "password";
    confirm.type = visible ? "text" : "password";
    toggle.textContent = visible ? "Hide password" : "Show password";
    toggle.setAttribute("aria-pressed", String(visible));
  }
  toggle.addEventListener("click", () => setPasswordVisible(password.type === "password"));

  // ---- Submit ----
  function setBusy(busy) {
    submit.disabled = busy;
    submit.textContent = busy ? "Creating account..." : SUBMIT_TEXT;
    form.setAttribute("aria-busy", String(busy));
  }

  function showServerErrors(data) {
    let firstInvalid = null;
    Object.entries(data.fields || {}).forEach(([name, text]) => {
      if (!fields[name]) return;
      setFieldError(fields[name][0], text);
      if (!firstInvalid) firstInvalid = fields[name][0];
    });
    showMessage(data.error || "Something went wrong. Please try again.", "error");
    if (firstInvalid) firstInvalid.focus();
  }

  function showSuccess(user) {
    // Clear the form so the password isn't left sitting in the page
    form.reset();
    touched.clear();
    Object.values(fields).forEach(([input]) => setFieldError(input, ""));
    setPasswordVisible(false);
    updatePasswordHelp();
    confirmMatch.textContent = "";

    showMessage("Account created for " + user.username + ". ", "success");
    const link = document.createElement("a");
    link.href = "login.html";
    link.textContent = "Log in now";
    message.appendChild(link);
    link.focus();
  }

  form.addEventListener("submit", async (event) => {
    // The form is always sent by fetch below, never by the browser
    event.preventDefault();
    if (submit.disabled) return;

    let firstInvalid = null;
    Object.values(fields).forEach(([input, check]) => {
      touched.add(input);
      const error = check();
      setFieldError(input, error);
      if (error && !firstInvalid) firstInvalid = input;
    });
    updatePasswordHelp();
    updateConfirmStatus();

    if (firstInvalid) {
      showMessage("Please fix the highlighted fields and try again.", "error");
      firstInvalid.focus();
      return;
    }

    setBusy(true);
    showMessage("", "");
    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({username: username.value, email: email.value.trim(), password: password.value})
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 201) {
        showSuccess(data);
      } else {
        showServerErrors(data);
      }
    } catch {
      showMessage("Could not reach the server. Start the backend (npm start in backend/) and open this page from http://localhost:3000/register.html.", "error");
    } finally {
      setBusy(false);
    }
  });
})();
