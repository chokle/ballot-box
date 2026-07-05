const { getStore } = require("@netlify/blobs");
const crypto = require("crypto");

const STORE_NAME = "trade-legacy-box";
const SUBMISSIONS_KEY = "submissions.json";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  if (!body.answer_text || String(body.answer_text).trim().length < 8) {
    return json(400, { error: "Story is required." });
  }

  const submission = {
    id: body.id || crypto.randomUUID(),
    question_id: clean(body.question_id),
    question_text: clean(body.question_text),
    answer_text: clean(body.answer_text),
    trade: clean(body.trade),
    years_experience: clean(body.years_experience),
    display_name: clean(body.display_name),
    anonymous: Boolean(body.anonymous),
    created_at: body.created_at || new Date().toISOString(),
    user_cookie_id: clean(body.user_cookie_id)
  };

  const store = getStore(STORE_NAME);
  const existing = await store.get(SUBMISSIONS_KEY, { type: "json" }).catch(() => []);
  const submissions = Array.isArray(existing) ? existing : [];
  await store.setJSON(SUBMISSIONS_KEY, [submission, ...submissions]);

  return json(201, { ok: true });
};

function clean(value) {
  return String(value || "").trim();
}

function json(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}
