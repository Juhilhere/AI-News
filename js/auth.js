class Auth {
  constructor() {
    this.isLoggedIn = false;
    this.user = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const modal = document.getElementById("authModal");
    const closeBtn = document.querySelector(".close");

    loginBtn.addEventListener("click", () => this.showAuthForm("login"));
    registerBtn.addEventListener("click", () => this.showAuthForm("register"));
    closeBtn.addEventListener("click", () => (modal.style.display = "none"));
  }

  showAuthForm(type) {
    const authForm = document.getElementById("authForm");
    const modal = document.getElementById("authModal");

    const formHTML = `
            <h2>${type === "login" ? "Login" : "Register"}</h2>
            <form id="${type}Form">
                <div>
                    <label>Email:</label>
                    <input type="email" required>
                </div>
                <div>
                    <label>Password:</label>
                    <input type="password" required>
                </div>
                <button type="submit">${
                  type === "login" ? "Login" : "Register"
                }</button>
            </form>
        `;

    authForm.innerHTML = formHTML;
    modal.style.display = "block";

    document.getElementById(`${type}Form`).addEventListener("submit", (e) => {
      e.preventDefault();
      this[type](e.target);
    });
  }

  login(form) {
    // Implement actual login logic here
    this.isLoggedIn = true;
    this.user = { email: form.querySelector('input[type="email"]').value };
    document.getElementById("authModal").style.display = "none";
    this.updateUI();
  }

  register(form) {
    // Implement actual registration logic here
    this.login(form);
  }

  updateUI() {
    const authButtons = document.querySelector(".auth-buttons");
    if (this.isLoggedIn) {
      authButtons.innerHTML = `
                <span>Welcome, ${this.user.email}</span>
                <button id="logoutBtn">Logout</button>
            `;
      document
        .getElementById("logoutBtn")
        .addEventListener("click", () => this.logout());
    }
  }

  logout() {
    this.isLoggedIn = false;
    this.user = null;
    location.reload();
  }
}
