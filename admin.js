let submissions = [];

async function api(path, options = {}) {
  const response = await fetch(path, options);
  if (response.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Unauthorized");
  }
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response;
}

async function loadSubmissions() {
  const response = await api("/api/admin/submissions");
  submissions = await response.json();
  renderSubmissions();
}

function renderSubmissions() {
  const list = document.querySelector("#submissions-list");
  const query = document.querySelector("#submission-search").value.trim().toLowerCase();
  const filtered = submissions.filter((submission) => {
    const text = [
      submission.question_text,
      submission.answer_text,
      submission.trade,
      submission.years_experience,
      submission.display_name
    ].join(" ").toLowerCase();
    return text.includes(query);
  });

  if (!filtered.length) {
    list.innerHTML = `<p class="empty-note">No matching stories yet.</p>`;
    return;
  }

  list.innerHTML = filtered.map((submission) => `
    <article class="admin-item">
      <strong>${escapeHtml(submission.trade || "Trade not listed")} · ${escapeHtml(displayName(submission))}</strong>
      <p class="question-count">${escapeHtml(submission.question_text || submission.question_id || "Question not listed")}</p>
      <p>${escapeHtml(submission.answer_text)}</p>
      <p>Saved · ${new Date(submission.created_at).toLocaleString()}</p>
      <div class="admin-actions">
        <button class="danger" type="button" data-delete-submission="${submission.id}">Delete</button>
      </div>
    </article>
  `).join("");
}

function displayName(submission) {
  if (submission.anonymous) return "Anonymous";
  return submission.display_name || "Anonymous";
}

async function handleAdminClick(event) {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.deleteSubmission) {
    await api(`/api/admin/submissions/${encodeURIComponent(button.dataset.deleteSubmission)}`, {
      method: "DELETE"
    });
    submissions = submissions.filter((submission) => submission.id !== button.dataset.deleteSubmission);
    renderSubmissions();
  }
}

async function exportCsv() {
  const response = await api("/api/admin/export");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `field-knowledge-answers-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function logout() {
  await api("/api/admin/logout", { method: "POST" });
  window.location.href = "/";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

document.querySelector("#submission-search").addEventListener("input", renderSubmissions);
document.querySelector("#export-csv").addEventListener("click", exportCsv);
document.querySelector("#logout").addEventListener("click", logout);
document.addEventListener("click", handleAdminClick);
loadSubmissions();
