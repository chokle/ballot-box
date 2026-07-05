const { neon } = require("@netlify/neon");

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
    const sql = neon();
    await ensureSchema(sql);
    const rows = await sql`
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
    `;

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
