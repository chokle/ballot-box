const crypto = require("crypto");
const { neon } = require("@netlify/neon");

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

  try {
    const sql = neon();
    await ensureSchema(sql);
    await sql`
      insert into submissions (
        id,
        question_id,
        question_text,
        answer_text,
        trade,
        years_experience,
        display_name,
        anonymous,
        created_at,
        user_cookie_id
      ) values (
        ${submission.id},
        ${submission.question_id},
        ${submission.question_text},
        ${submission.answer_text},
        ${submission.trade},
        ${submission.years_experience},
        ${submission.display_name},
        ${submission.anonymous},
        ${submission.created_at},
        ${submission.user_cookie_id}
      )
    `;
    return json(201, { ok: true });
  } catch (error) {
    console.error(error);
    return json(500, { error: "Database save failed", detail: error.message });
  }
};

async function ensureSchema(sql) {
  await sql`
    create table if not exists submissions (
      id text primary key,
      question_id text,
      question_text text,
      answer_text text not null,
      trade text,
      years_experience text,
      display_name text,
      anonymous boolean not null default true,
      created_at timestamptz not null default now(),
      user_cookie_id text
    )
  `;
}

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
