const form = document.getElementById("loginForm");
const statusMsg = document.getElementById("statusMsg");
const loginBtn = document.getElementById("loginBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusMsg.textContent = "";
  statusMsg.className = "status";
  loginBtn.disabled = true;
<<<<<<< HEAD
  loginBtn.querySelector(".btn-label").textContent = "Authenticating...";
=======
  loginBtn.querySelector("span").textContent = "Authenticating...";
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.ok) {
      statusMsg.textContent = "Access granted. Redirecting...";
      statusMsg.className = "status success";
      window.location.href = data.redirect || "/dashboard";
    } else {
      statusMsg.textContent = data.message || "Access denied.";
      statusMsg.className = "status error";
    }
  } catch (err) {
    statusMsg.textContent = "Connection error.";
    statusMsg.className = "status error";
  } finally {
    loginBtn.disabled = false;
<<<<<<< HEAD
    loginBtn.querySelector(".btn-label").textContent = "Access Terminal";
=======
    loginBtn.querySelector("span").textContent = "Access Terminal";
>>>>>>> a77ef059e85bdaf13eadf2dd59f745d0221b2dad
  }
});
