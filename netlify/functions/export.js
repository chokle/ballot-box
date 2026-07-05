const { getStore } = require("@netlify/blobs");

const STORE_NAME = "trade-legacy-box";
const SUBMISSIONS_KEY = "submissions.json";

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

  let csv;
  try {
    const store = getStore(STORE_NAME);
    const rows = await store.get(SUBMISSIONS_KEY, { type: "json" }).catch(() => []);
    csv = toCsv(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: `Storage failed: ${error.message}`
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trade-legacy-stories-${new Date().toISOString().slice(0, 10)}.csv"`
    },
    body: csv
  };
};

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
