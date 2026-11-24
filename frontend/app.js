const fileInput = document.getElementById("file-input");
const uploadLabel = document.getElementById("upload-label");
const uploadBtn = document.getElementById("upload-btn");
const statusEl = document.getElementById("status");
const bannerEl = document.getElementById("banner");
const messagesEl = document.getElementById("messages");
const emptyEl = document.getElementById("empty");
const form = document.getElementById("ask-form");
const questionEl = document.getElementById("question");
const sendBtn = document.getElementById("send-btn");

let sessionId = null;

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = "status " + kind;
}

// Read the error message from the API (FastAPI sends it as {"detail": "..."}).
async function readError(res) {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return "Please check your input and try again.";
  } catch (_) {}
  return `Request failed (${res.status}).`;
}

// textContent is used everywhere, so text from the PDF or the model can never run as HTML.
function addMessage(role, text, sources = []) {
  if (emptyEl) emptyEl.remove();
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;

  if (sources.length) {
    const details = document.createElement("details");
    details.className = "sources";
    const summary = document.createElement("summary");
    summary.textContent = "📎 Source pages";
    details.appendChild(summary);
    for (const s of sources) {
      const p = document.createElement("p");
      p.textContent = `Page ${s.page}: ${s.text}...`;
      details.appendChild(p);
    }
    div.appendChild(details);
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  uploadLabel.textContent = file ? file.name : "Choose a PDF";
  uploadBtn.disabled = !file;
  setStatus("");
});

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  uploadBtn.disabled = true;
  setStatus("Processing PDF... (the first time can take a little longer)");
  const body = new FormData();
  body.append("file", file);

  try {
    const res = await fetch("/api/upload", { method: "POST", body });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    sessionId = data.session_id;
    messagesEl.innerHTML = "";
    setStatus(`Ready! ${data.chunks} chunks indexed.`, "ok");
    questionEl.disabled = false;
    sendBtn.disabled = false;
    questionEl.focus();
  } catch (err) {
    setStatus(err.message || "Upload failed.", "error");
  } finally {
    uploadBtn.disabled = !fileInput.files[0];
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = questionEl.value.trim();
  if (!question || !sessionId) return;

  addMessage("user", question);
  questionEl.value = "";
  questionEl.disabled = true;
  sendBtn.disabled = true;
  const loading = addMessage("assistant loading", "Searching document...");

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, question }),
    });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    loading.remove();
    addMessage("assistant", data.answer, data.sources);
  } catch (err) {
    loading.remove();
    addMessage("assistant error", err.message || "Something went wrong.");
  } finally {
    questionEl.disabled = false;
    sendBtn.disabled = false;
    questionEl.focus();
  }
});


fetch("/api/health")
  .then((r) => r.json())
  .then((h) => {
    if (!h.api_key_set) {
      bannerEl.textContent = "Server setup problem: the AI service API key is not set.";
      bannerEl.hidden = false;
    }
  })
  .catch(() => {});
