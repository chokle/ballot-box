document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.querySelector("#login-error");
  error.hidden = true;

  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password: document.querySelector("#admin-password").value
    })
  });

  if (response.ok) {
    window.location.href = "/admin.html";
    return;
  }

  error.hidden = false;
});
