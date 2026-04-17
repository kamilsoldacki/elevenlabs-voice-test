import { Conversation } from "@elevenlabs/client";
import { VOICES } from "./voices.js";
import "./styles.css";

const AGENT_ID = "agent_2401kpdcfbczeznsr4bkmr97c7p1";

/** Used only when VITE_USE_BROWSER_TOKEN=true (token + optional branch in browser). */
const BRANCH_ID = import.meta.env.VITE_BRANCH_ID ?? "";
const CONVAI_TOKEN_SOURCE = "js_sdk";
const CONVAI_TOKEN_VERSION = "1.2.1";

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

function parseTokenResponse(text, httpStatus) {
  if (!text) {
    throw new Error(`Token HTTP ${httpStatus}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 200) || `Token HTTP ${httpStatus}`);
  }
  if (!data.token) {
    throw new Error("API response is missing the token field");
  }
  return data.token;
}

/** Dev: token via Vite proxy → local server (XI_API_KEY / branch in .env). */
async function fetchConversationTokenFromDevServer() {
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
  return parseTokenResponse(text, res.status);
}

/** Optional: browser token (e.g. branch_id). Off by default — same as pjatk GAIA page (agentId only). */
async function fetchConversationTokenFromBrowser() {
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
  url.searchParams.set("agent_id", AGENT_ID);
  if (BRANCH_ID) {
    url.searchParams.set("branch_id", BRANCH_ID);
  }
  url.searchParams.set("source", CONVAI_TOKEN_SOURCE);
  url.searchParams.set("version", CONVAI_TOKEN_VERSION);

  const res = await fetch(url.toString());
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
  return parseTokenResponse(text, res.status);
}

/**
 * Same idea as https://kamilsoldacki.github.io/pjatk-march_workshops-2026/ — agentId + SDK token fetch inside WebRTC.
 * Opt-in: dev token server, VITE_USE_BROWSER_TOKEN, or VITE_USE_WEBSOCKET.
 */
async function buildSessionAuth() {
  const useLocalTokenServer =
    import.meta.env.DEV && import.meta.env.VITE_DEV_USE_TOKEN_SERVER !== "false";
  if (useLocalTokenServer) {
    return { conversationToken: await fetchConversationTokenFromDevServer() };
  }
  if (import.meta.env.VITE_USE_BROWSER_TOKEN === "true") {
    return { conversationToken: await fetchConversationTokenFromBrowser() };
  }
  if (import.meta.env.VITE_USE_WEBSOCKET === "true") {
    return { agentId: AGENT_ID, connectionType: "websocket" };
  }
  return { agentId: AGENT_ID };
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
    const voiceId = voiceSelect.value;
    const overrides = {
      tts: {
        voiceId,
      },
    };

    const sessionAuth = await buildSessionAuth();

    conversation = await Conversation.startSession({
      ...sessionAuth,
      overrides,
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
