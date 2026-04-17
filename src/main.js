import { Conversation } from "@elevenlabs/client";
import { VOICES } from "./voices.js";
import "./styles.css";

const AGENT_ID = "agent_2401kpdcfbczeznsr4bkmr97c7p1";

const voiceSelect = document.getElementById("voiceSelect");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const connStatus = document.getElementById("connStatus");
const modeStatus = document.getElementById("modeStatus");
const errorBox = document.getElementById("errorBox");
const callSurface = document.querySelector(".call-surface");
const callLabel = document.getElementById("callLabel");
const modeLine = document.getElementById("modeLine");

for (const v of VOICES) {
  const opt = document.createElement("option");
  opt.value = v.id;
  opt.textContent = v.label;
  voiceSelect.appendChild(opt);
}

let conversation = null;

function showError(msg) {
  if (!msg) {
    errorBox.hidden = true;
    errorBox.textContent = "";
    return;
  }
  errorBox.hidden = false;
  errorBox.textContent = msg;
}

async function fetchConversationToken() {
  const res = await fetch("/api/token");
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.detail?.map((d) => d.msg).join("; ") || JSON.stringify(j);
    } catch {
      /* raw text */
    }
    throw new Error(detail || `Token HTTP ${res.status}`);
  }
  const data = JSON.parse(text);
  if (!data.token) {
    throw new Error("API response is missing the token field");
  }
  return data.token;
}

function setCallUi(state) {
  if (!callSurface) return;
  callSurface.dataset.state = state;
  if (!callLabel || !modeLine) return;
  if (state === "idle") {
    callLabel.textContent = "Ready to connect";
    modeLine.textContent = "Microphone access is requested when you start.";
  } else if (state === "connecting") {
    callLabel.textContent = "Connecting…";
    modeLine.textContent = "Grant microphone access if the browser asks.";
  } else if (state === "active") {
    callLabel.textContent = "Live session";
    modeLine.textContent = "Speak naturally — the agent follows the system prompt on the left.";
  }
}

async function startConversation() {
  showError(null);
  startBtn.disabled = true;
  setCallUi("connecting");

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });

    const voiceId = voiceSelect.value;

    // Dev: token from small server (branch_id from .env). Static hosting: public agentId only.
    const sessionAuth =
      import.meta.env.DEV && import.meta.env.VITE_DEV_USE_TOKEN_SERVER !== "false"
        ? { conversationToken: await fetchConversationToken() }
        : { agentId: AGENT_ID };

    conversation = await Conversation.startSession({
      ...sessionAuth,
      overrides: {
        tts: {
          voiceId,
        },
      },
      onConnect: () => {
        connStatus.textContent = "Connected";
        stopBtn.disabled = false;
        voiceSelect.disabled = true;
        setCallUi("active");
      },
      onDisconnect: () => {
        connStatus.textContent = "Disconnected";
        startBtn.disabled = false;
        stopBtn.disabled = true;
        modeStatus.textContent = "—";
        voiceSelect.disabled = false;
        conversation = null;
        setCallUi("idle");
      },
      onError: (err) => {
        console.error(err);
        showError(typeof err === "string" ? err : err?.message || String(err));
      },
      onModeChange: ({ mode }) => {
        modeStatus.textContent = mode === "speaking" ? "Speaking" : "Listening";
        if (callSurface?.dataset.state === "active" && modeLine) {
          modeLine.textContent =
            mode === "speaking" ? "Agent is speaking — wait for your turn." : "Listening — go ahead and talk.";
        }
      },
    });
  } catch (e) {
    console.error(e);
    showError(e instanceof Error ? e.message : String(e));
    startBtn.disabled = false;
    stopBtn.disabled = true;
    setCallUi("idle");
  }
}

async function stopConversation() {
  if (conversation) {
    await conversation.endSession();
    conversation = null;
  }
}

startBtn.addEventListener("click", startConversation);
stopBtn.addEventListener("click", stopConversation);
