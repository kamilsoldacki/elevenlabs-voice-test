import { Conversation } from "@elevenlabs/client";
import { VOICES } from "./voices.js";

const AGENT_ID = "agent_2401kpdcfbczeznsr4bkmr97c7p1";

const voiceSelect = document.getElementById("voiceSelect");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const connStatus = document.getElementById("connStatus");
const modeStatus = document.getElementById("modeStatus");
const errorBox = document.getElementById("errorBox");

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
    throw new Error("Brak pola token w odpowiedzi API");
  }
  return data.token;
}

async function startConversation() {
  showError(null);
  startBtn.disabled = true;

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });

    const voiceId = voiceSelect.value;

    // Lokalnie (vite dev): token z małego serwera — obsługuje branch_id z .env.
    // Produkcja (np. GitHub Pages): tylko statyczne pliki — start z publicznym agentId.
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
        connStatus.textContent = "połączone";
        stopBtn.disabled = false;
        voiceSelect.disabled = true;
      },
      onDisconnect: () => {
        connStatus.textContent = "rozłączone";
        startBtn.disabled = false;
        stopBtn.disabled = true;
        modeStatus.textContent = "—";
        voiceSelect.disabled = false;
        conversation = null;
      },
      onError: (err) => {
        console.error(err);
        showError(typeof err === "string" ? err : err?.message || String(err));
      },
      onModeChange: ({ mode }) => {
        modeStatus.textContent = mode === "speaking" ? "mówi" : "nasłuchuje";
      },
    });
  } catch (e) {
    console.error(e);
    showError(e instanceof Error ? e.message : String(e));
    startBtn.disabled = false;
    stopBtn.disabled = true;
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
