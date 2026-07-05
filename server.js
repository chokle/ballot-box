const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4177);
const ADMIN_PASSWORD = process.env.BALLOT_BOX_ADMIN_PASSWORD || "change-this-password";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const SUBMISSIONS_FILE = path.join(DATA_DIR, "submissions.json");
const sessions = new Set();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8"
};

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, "[]");
  }
}

function readSubmissions() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSubmissions(submissions) {
  ensureDataFile();
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((cookie) => {
    const [name, ...value] = cookie.trim().split("=");
    return [name, decodeURIComponent(value.join("="))];
  }));
}

function isAdmin(req) {
  return sessions.has(parseCookies(req).ballot_box_admin);
}

function send(res, status, body, type = "text/plain; charset=utf-8", headers = {}) {
  res.writeHead(status, { "Content-Type": type, ...headers });
  res.end(body);
}

function sendJson(res, status, data, headers = {}) {
  send(res, status, JSON.stringify(data), MIME_TYPES[".json"], headers);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

function safeStaticPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const filePath = path.normalize(path.join(ROOT, cleanPath === "/" ? "index.html" : cleanPath));
  if (!filePath.startsWith(ROOT)) return null;
  return filePath;
}

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/submissions") {
    const body = JSON.parse(await readBody(req) || "{}");
    if (!body.answer_text || String(body.answer_text).trim().length < 8) {
      sendJson(res, 400, { error: "Answer is required." });
      return;
    }

    const submission = {
      id: body.id || crypto.randomUUID(),
      question_id: String(body.question_id || ""),
      question_text: String(body.question_text || ""),
      answer_text: String(body.answer_text || "").trim(),
      trade: String(body.trade || "").trim(),
      years_experience: String(body.years_experience || "").trim(),
      display_name: String(body.display_name || "").trim(),
      anonymous: Boolean(body.anonymous),
      created_at: body.created_at || new Date().toISOString(),
      user_cookie_id: String(body.user_cookie_id || "")
    };
    writeSubmissions([submission, ...readSubmissions()]);
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    const body = JSON.parse(await readBody(req) || "{}");
    if (body.password !== ADMIN_PASSWORD) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    sessions.add(token);
    sendJson(res, 200, { ok: true }, {
      "Set-Cookie": `ballot_box_admin=${token}; HttpOnly; SameSite=Lax; Path=/`
    });
    return;
  }

  if (url.pathname.startsWith("/api/admin/") && !isAdmin(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    sessions.delete(parseCookies(req).ballot_box_admin);
    sendJson(res, 200, { ok: true }, {
      "Set-Cookie": "ballot_box_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/submissions") {
    sendJson(res, 200, readSubmissions());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/export") {
    send(res, 200, toCsv(readSubmissions()), MIME_TYPES[".csv"], {
      "Content-Disposition": `attachment; filename="field-knowledge-answers-${new Date().toISOString().slice(0, 10)}.csv"`
    });
    return;
  }

  const deleteMatch = url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)$/);
  if (req.method === "DELETE" && deleteMatch) {
    const id = decodeURIComponent(deleteMatch[1]);
    writeSubmissions(readSubmissions().filter((submission) => submission.id !== id));
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

function serveStatic(req, res, url) {
  if ((url.pathname === "/admin.html" || url.pathname === "/admin.js") && !isAdmin(req)) {
    redirect(res, "/login.html");
    return;
  }

  const filePath = safeStaticPath(url.pathname);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(res, 404, "Not found");
    return;
  }

  const ext = path.extname(filePath);
  send(res, 200, fs.readFileSync(filePath), MIME_TYPES[ext] || "application/octet-stream");
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server error" });
  }
});

ensureDataFile();
server.listen(PORT, () => {
  console.log(`Ballot Box running at http://127.0.0.1:${PORT}/`);
  console.log("Set BALLOT_BOX_ADMIN_PASSWORD to change the admin password.");
});
