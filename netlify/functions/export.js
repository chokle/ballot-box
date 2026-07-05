const { Pool } = require("pg");

const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
const pool = connectionString ? new Pool({ connectionString }) : null;

exports.handler = async (event) => {
  const expectedPassword = process.env.BALLOT_BOX_ADMIN_PASSWORD;
  const providedPassword = event.queryStringParameters?.password || "";

  if (!expectedPassword || providedPassword !== expectedPassword) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "Unauthorized"
    };
  }

  try {
    if (!pool) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: "Database connection is not configured."
      };
    }

    await ensureSchema();
    const result = await pool.query(`
      select
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
      from submissions
      order by created_at desc
    `);
    const rows = result.rows;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trade-legacy-stories-${new Date().toISOString().slice(0, 10)}.csv"`
      },
      body: toCsv(rows)
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: `Database export failed: ${error.message}`
    };
  }
};

async function ensureSchema() {
  await pool.query(`
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
  `);
}

function toCsv(rows) {
  const headers = [
    "id",
    "question_id",
    "question_text",
    "answer_text",
    "trade",
    "years_experience",
    "display_name",
    "anonymous",
    "created_at",
    "user_cookie_id"
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
