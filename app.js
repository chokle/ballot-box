const STORAGE_KEYS = {
  questions: "field_knowledge_logger_questions",
  submissions: "field_knowledge_logger_submissions",
  thankYous: "field_knowledge_logger_thank_yous",
  answered: "field_knowledge_logger_answered_questions",
  userId: "field_knowledge_logger_user_id",
  sequence: "field_knowledge_logger_question_sequence"
};

const LEGACY_STORAGE_KEYS = {
  questions: "torch_story_box_questions",
  submissions: "torch_story_box_submissions",
  thankYous: "torch_story_box_thank_yous",
  answered: "torch_story_box_answered_questions",
  userId: "torch_story_box_user_id",
  sequence: "torch_story_box_question_sequence"
};

const seedQuestions = [
  "What’s one lesson the jobsite taught you that every apprentice should know?",
  "What’s a mistake you made early in your career that taught you something important?",
  "What’s one safety rule people ignore until it’s too late?",
  "What’s something school never taught you that the field did?",
  "What separates a good apprentice from a great one?",
  "What’s one tool, habit, or trick that saved you time?",
  "What’s a moment on site that changed how you worked forever?",
  "What should every young tradesperson understand before their first big job?",
  "What’s one thing you wish someone told you when you started?",
  "What does pride in the trades mean to you?",
  "What field expectation surprised you most after leaving the classroom?",
  "What mistake slows a new crew down that nobody talks about enough?",
  "What piece of judgment took you years to learn but minutes to explain?",
  "What should employers teach new hires before the first costly rework happens?",
  "What habit keeps a job moving when the plan changes on site?"
].map((question_text, index) => ({
  id: `q-${index + 1}`,
  question_text,
  active: true,
  category: "field wisdom",
  created_at: new Date().toISOString()
}));

const seedMessages = [
  "Thank you. That one may help someone coming up behind you.",
  "Respect. A lesson like that deserves to outlast the job.",
  "Dropped into the box. One story at a time.",
  "Appreciate it. This is how field wisdom survives.",
  "Your story is in the box. The next generation needs this.",
  "That one matters. Thanks for leaving it behind."
].map((message_text, index) => ({
  id: `m-${index + 1}`,
  message_text,
  active: true
}));

const store = {
  get(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function initializeSeeds() {
  migrateLegacyStorage();
  if (!localStorage.getItem(STORAGE_KEYS.questions)) store.set(STORAGE_KEYS.questions, seedQuestions);
  if (!localStorage.getItem(STORAGE_KEYS.thankYous)) store.set(STORAGE_KEYS.thankYous, seedMessages);
  if (!localStorage.getItem(STORAGE_KEYS.submissions)) store.set(STORAGE_KEYS.submissions, []);
  if (!localStorage.getItem(STORAGE_KEYS.answered)) store.set(STORAGE_KEYS.answered, []);
  if (!localStorage.getItem(STORAGE_KEYS.userId)) {
    localStorage.setItem(STORAGE_KEYS.userId, crypto.randomUUID());
  }
}

function migrateLegacyStorage() {
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    if (localStorage.getItem(key)) return;
    const legacyValue = localStorage.getItem(LEGACY_STORAGE_KEYS[name]);
    if (!legacyValue) return;

    if (name === "submissions") {
      try {
        const submissions = JSON.parse(legacyValue)
          .filter((submission) => submission.user_cookie_id !== "seed");
        localStorage.setItem(key, JSON.stringify(submissions));
        return;
      } catch {
        localStorage.setItem(key, "[]");
        return;
      }
    }

    localStorage.setItem(key, legacyValue);
  });
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getActiveQuestions() {
  return store.get(STORAGE_KEYS.questions, []).filter((question) => question.active);
}

function getPersonalQuestionSequence(activeQuestions) {
  const activeIds = activeQuestions.map((question) => question.id);
  const existing = store.get(STORAGE_KEYS.sequence, []);
  const stillValid = existing.filter((id) => activeIds.includes(id));
  const missing = activeIds.filter((id) => !stillValid.includes(id));
  const nextSequence = [...stillValid, ...shuffle(missing)];
  store.set(STORAGE_KEYS.sequence, nextSequence);
  return nextSequence;
}

function getNextQuestion() {
  const activeQuestions = getActiveQuestions();
  const answered = store.get(STORAGE_KEYS.answered, []);
  const sequence = getPersonalQuestionSequence(activeQuestions);
  const nextId = sequence.find((id) => !answered.includes(id));
  return {
    question: activeQuestions.find((question) => question.id === nextId),
    answeredCount: answered.filter((id) => sequence.includes(id)).length,
    total: activeQuestions.length
  };
}

function getRandomThankYou() {
  const messages = store.get(STORAGE_KEYS.thankYous, []).filter((message) => message.active);
  return messages[Math.floor(Math.random() * messages.length)]?.message_text || seedMessages[0].message_text;
}

function saveSubmission(submission) {
  const submissions = store.get(STORAGE_KEYS.submissions, []);
  store.set(STORAGE_KEYS.submissions, [submission, ...submissions]);
  const answered = store.get(STORAGE_KEYS.answered, []);
  store.set(STORAGE_KEYS.answered, [...new Set([...answered, submission.question_id])]);
}

async function sendSubmission(submission) {
  const response = await fetch("/.netlify/functions/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission)
  });

  if (!response.ok) {
    throw new Error("Submission could not be saved.");
  }
}

function renderQuestion() {
  const form = document.querySelector("#submission-form");
  const thanks = document.querySelector("#thanks-panel");
  const completion = document.querySelector("#completion-panel");
  const questionText = document.querySelector("#question-text");
  const questionCount = document.querySelector("#question-count");
  if (!form || !questionText || !questionCount) return;

  const next = getNextQuestion();
  window.currentFieldKnowledgeQuestion = next.question;
  thanks.hidden = true;

  if (!next.question) {
    form.hidden = true;
    completion.hidden = false;
    return;
  }

  form.hidden = false;
  completion.hidden = true;
  questionText.textContent = next.question.question_text;
  questionCount.textContent = `Question ${Math.min(next.answeredCount + 1, next.total)} of ${next.total}`;
  document.querySelector("#question-id").value = next.question.id;
  document.querySelector("#question-hidden-text").value = next.question.question_text;
  document.querySelector("#user-id").value = localStorage.getItem(STORAGE_KEYS.userId);
}

function renderSavedPreview() {
  const grid = document.querySelector("#saved-preview-grid");
  if (!grid) return;

  const saved = store.get(STORAGE_KEYS.submissions, []).slice(0, 6);

  if (!saved.length) {
    grid.innerHTML = `<p class="empty-note">No answers saved in this browser yet.</p>`;
    return;
  }

  grid.innerHTML = saved.map((submission) => {
    const name = submission.anonymous ? "Anonymous" : submission.display_name || "Anonymous";
    const years = submission.years_experience ? `${submission.years_experience} years` : "Experience not listed";
    const trade = submission.trade || "Trade not listed";
    const excerpt = submission.answer_text.length > 180
      ? `${submission.answer_text.slice(0, 177)}...`
      : submission.answer_text;
    return `
      <article class="story-tile">
        <blockquote>"${escapeHtml(excerpt)}"</blockquote>
        <p class="story-meta">${escapeHtml(trade)} · ${escapeHtml(years)} · ${escapeHtml(name)}</p>
      </article>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function wireVoiceInput() {
  const button = document.querySelector("#voice-button");
  const status = document.querySelector("#voice-status");
  const answer = document.querySelector("#answer-text");
  if (!button || !status || !answer) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    button.disabled = true;
    status.textContent = "Voice input is not supported in this browser.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  let listening = false;

  const setListeningState = (next) => {
    listening = next;
    button.classList.toggle("is-recording", next);
    button.setAttribute("aria-pressed", String(next));
    button.textContent = next ? "Stop Voice Input" : "Start Voice Input";
    status.textContent = next ? "Listening. Speak naturally." : "Voice input is off.";
  };

  button.addEventListener("click", async () => {
    if (listening) {
      recognition.stop();
      setListeningState(false);
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognition.start();
      setListeningState(true);
    } catch (error) {
      status.textContent = "Microphone access is blocked in this browser.";
    }
  });

  recognition.onresult = (event) => {
    let transcript = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
    }
    const current = answer.value.trim();
    answer.value = current ? `${current} ${transcript.trim()}` : transcript.trim();
  };

  recognition.onerror = (event) => {
    status.textContent = `Voice input error: ${event.error}`;
    setListeningState(false);
  };

  recognition.onend = () => {
    if (listening) {
      setListeningState(false);
    }
  };
}

function wireLandingPage() {
  const form = document.querySelector("#submission-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = window.currentFieldKnowledgeQuestion;
    if (!question) return;

    const answerText = document.querySelector("#answer-text").value.trim();
    if (!answerText) return;

    const card = document.querySelector("#animated-card");
    card.classList.remove("drop");
    void card.offsetWidth;
    card.classList.add("drop");

    const anonymous = document.querySelector("#anonymous").checked;
    const createdAt = new Date().toISOString();
    document.querySelector("#submitted-at").value = createdAt;
    const submission = {
      id: crypto.randomUUID(),
      question_id: question.id,
      question_text: question.question_text,
      answer_text: answerText,
      trade: document.querySelector("#trade").value.trim(),
      years_experience: document.querySelector("#years-experience").value.trim(),
      display_name: anonymous ? "" : document.querySelector("#display-name").value.trim(),
      anonymous,
      approved: true,
      created_at: createdAt,
      user_cookie_id: localStorage.getItem(STORAGE_KEYS.userId)
    };

    try {
      await sendSubmission(submission);
      saveSubmission(submission);
      window.location.href = "/success.html";
    } catch (error) {
      console.error(error);
      alert("That did not save. Please try again.");
    }
  });

  document.querySelector("#answer-another")?.addEventListener("click", renderQuestion);
}

initializeSeeds();
renderQuestion();
renderSavedPreview();
wireLandingPage();
wireVoiceInput();

window.FieldKnowledgeLogger = {
  STORAGE_KEYS,
  store,
  seedQuestions,
  seedMessages,
  getActiveQuestions,
  renderSavedPreview
};
