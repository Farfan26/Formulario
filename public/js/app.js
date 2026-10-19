/* ==========================================================
   RETOS EN INGENIERÍA · Lógica de la encuesta (JavaScript puro)
   Sin cookies, analítica de terceros ni identificación del usuario.
   ========================================================== */
"use strict";

const SITUATIONS = Object.freeze([
  "Trabajo actualmente, pero no como practicante.",
  "Actualmente realizo prácticas preprofesionales.",
  "Trabajo y también realizo prácticas.",
  "Actualmente no trabajo ni hago prácticas, pero sí tengo experiencia previa.",
  "Aún no trabajo ni he realizado prácticas.",
  "Otra situación."
]);

const CHALLENGES = Object.freeze([
  "Negociar plazos o prioridades cuando recibo tareas urgentes al mismo tiempo.",
  "Aclarar con mi supervisor qué espera de mí, con qué autoridad cuento o qué recursos tengo.",
  "Expresar un desacuerdo o proponer una alternativa a alguien con más experiencia.",
  "Lograr que escuchen una propuesta cuando todavía no tengo un cargo de autoridad.",
  "Manejar una diferencia o tensión dentro de un equipo de trabajo.",
  "Recibir una crítica o retroalimentación y responder de manera constructiva.",
  "Decidir cuándo resolver algo por mi cuenta y cuándo pedir orientación.",
  "Coordinar tareas con personas de otras especialidades o áreas.",
  "Ninguna de estas por ahora.",
  "Otra situación."
]);

const SITUATION_ICONS = ["💼", "🦺", "⚙️", "📘", "🌱", "✨"];
const CHALLENGE_ICONS = ["🗓️", "📋", "💬", "📣", "🤝", "🌱", "🧭", "🔗", "➖", "✍️"];
const NONE_INDEX = 8;
const OTHER_CHALLENGE_INDEX = 9;
const OTHER_SITUATION_INDEX = 5;
const API = "/.netlify/functions/enviar";

const state = {
  step: 0,
  situationIndex: null,
  challengeIndices: new Set(),
  priority: null,
  sending: false,
  requestId: null
};

const $ = (id) => document.getElementById(id);
const steps = [...document.querySelectorAll(".survey-step")];

// Crea elementos sin inyectar las respuestas de las personas en HTML.
function optionElement(text, { name, value, kind, emoji, onChange }) {
  const label = document.createElement("label");
  label.className = "option" + (kind === "checkbox" ? " is-checkbox" : "");
  if (text === "Ninguna de estas por ahora." || text === "Ninguna por ahora") label.classList.add("option--none");
  if (text === "Otra situación.") label.classList.add("option--other");

  const control = document.createElement("input");
  control.type = kind;
  control.name = name;
  control.value = String(value);
  control.addEventListener("change", () => onChange(control, label));

  const indicator = document.createElement("span");
  indicator.className = "option-control";
  indicator.setAttribute("aria-hidden", "true");

  const content = document.createElement("span");
  content.className = "option-label";
  content.textContent = text;

  label.append(control, indicator, content);

  if (emoji) {
    const badge = document.createElement("span");
    badge.className = "option-emoji";
    badge.textContent = emoji;
    badge.setAttribute("aria-hidden", "true");
    label.append(badge);
  }

  return label;
}

function renderSituationOptions() {
  const root = $("situationOptions");
  root.replaceChildren();

  SITUATIONS.forEach((labelText, index) => {
    root.append(optionElement(labelText, {
      name: "situacion", value: index, kind: "radio",
      emoji: SITUATION_ICONS[index],
      onChange: () => {
        state.situationIndex = index;
        state.requestId = null;
        $("otherSituationWrap").hidden = index !== OTHER_SITUATION_INDEX;
        $("situationError").hidden = true;
        root.querySelectorAll(".option").forEach((item) => {
          item.classList.toggle("is-selected", item.querySelector("input").checked);
        });
      }
    }));
  });
}

function renderChallenges() {
  const root = $("challengeOptions");
  root.replaceChildren();

  CHALLENGES.forEach((labelText, index) => {
    root.append(optionElement(labelText, {
      name: "retos", value: index, kind: "checkbox", emoji: CHALLENGE_ICONS[index],
      onChange: (input) => {
        if (input.checked) {
          if (index === NONE_INDEX) {
            state.challengeIndices.clear();
            state.challengeIndices.add(NONE_INDEX);
          } else {
            state.challengeIndices.delete(NONE_INDEX);
            if (state.challengeIndices.size >= 3 && !state.challengeIndices.has(index)) {
              input.checked = false;
              showToast("Puedes seleccionar como máximo tres situaciones.");
              refreshChallenges();
              return;
            }
            state.challengeIndices.add(index);
          }
        } else {
          state.challengeIndices.delete(index);
        }
        state.priority = null; // Cambió la selección, hay que elegir prioridad de nuevo.
        state.requestId = null;
        $("challengesError").hidden = true;
        refreshChallenges();
      }
    }));
  });
}

function refreshChallenges() {
  $("challengeOptions").querySelectorAll(".option").forEach((label, i) => {
    const checked = state.challengeIndices.has(i);
    label.querySelector("input").checked = checked;
    label.classList.toggle("is-selected", checked);
  });
  const size = state.challengeIndices.size;
  $("selectionCount").textContent = `${size} / 3 seleccionadas`;
  $("otherChallengeWrap").hidden = !state.challengeIndices.has(OTHER_CHALLENGE_INDEX);
}

function describeSituation() {
  if (state.situationIndex === OTHER_SITUATION_INDEX) {
    return "Otra situación: " + $("otherSituation").value.trim();
  }
  return SITUATIONS[state.situationIndex];
}

function selectedChallenges() {
  return [...state.challengeIndices]
    .sort((a, b) => a - b)
    .map((index) => index === OTHER_CHALLENGE_INDEX
      ? "Otra situación: " + $("otherChallenge").value.trim()
      : CHALLENGES[index]);
}

function renderPriority() {
  const choices = selectedChallenges();
  const root = $("priorityOptions");
  root.replaceChildren();

  if (!choices.includes(state.priority)) {
    state.priority = choices.length === 1 ? choices[0] : null;
  }
  choices.forEach((choice, i) => {
    const label = optionElement(choice === "Ninguna de estas por ahora." ? "Ninguna por ahora" : choice, {
      name: "prioridad", value: i, kind: "radio",
      emoji: "⭐",
      onChange: () => {
        state.priority = choice;
        state.requestId = null;
        $("priorityError").hidden = true;
        root.querySelectorAll(".option").forEach((item) => {
          item.classList.toggle("is-selected", item.querySelector("input").checked);
        });
      }
    });
    if (choice === state.priority) {
      label.querySelector("input").checked = true;
      label.classList.add("is-selected");
    }
    root.append(label);
  });
}

function validationError(elementId, message) {
  const box = $(elementId);
  box.textContent = message;
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return false;
}

function validateStep(index) {
  if (index === 0) {
    if (state.situationIndex === null) {
      return validationError("situationError", "Selecciona tu situación actual para continuar.");
    }
    if (state.situationIndex === OTHER_SITUATION_INDEX &&
        $("otherSituation").value.trim().length < 3) {
      return validationError("situationError", "Describe tu situación en al menos 3 caracteres.");
    }
  }

  if (index === 1) {
    if (state.challengeIndices.size === 0 || state.challengeIndices.size > 3) {
      return validationError("challengesError", "Selecciona entre una y tres alternativas.");
    }
    if (state.challengeIndices.has(NONE_INDEX) && state.challengeIndices.size !== 1) {
      return validationError("challengesError", "«Ninguna» debe seleccionarse sola.");
    }
    if (state.challengeIndices.has(OTHER_CHALLENGE_INDEX) &&
        $("otherChallenge").value.trim().length < 3) {
      return validationError("challengesError", "Explica brevemente tu otra situación (mínimo 3 caracteres).");
    }
  }

  if (index === 2 && !selectedChallenges().includes(state.priority)) {
    return validationError("priorityError", "Elige cuál de tus situaciones es la más importante.");
  }
  return true;
}

function setStep(index) {
  state.step = index;
  steps.forEach((section, i) => {
    const active = i === index;
    section.hidden = !active;
    section.classList.toggle("is-current", active);
  });
  $("backButton").hidden = index === 0;
  $("nextButton").hidden = index === 2;
  $("submitButton").hidden = index !== 2;
  $("completionTag").textContent = `Paso ${index + 1} de 3`;
  $("progressFill").style.width = `${((index + 1) / 3) * 100}%`;
  $("progressBar").setAttribute("aria-valuenow", String(Math.round(((index + 1) / 3) * 100)));
  document.querySelectorAll("[data-step-label]").forEach((label, i) => {
    label.classList.toggle("is-active", i === index);
  });
  $("submissionError").hidden = true;
  if (index === 2) renderPriority();
  $("surveySection").scrollIntoView({ behavior: "smooth", block: "start" });
  const heading = $("headingStep" + (index + 1));
  heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
}

let toastTimeout;
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 3300);
}

function generateNonce() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Es un ID del ENVÍO, no del dispositivo; no queda almacenado en el navegador.
  return "n-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function submitSurvey(event) {
  event.preventDefault();
  if (state.sending || !validateStep(2)) return;

  const payload = {
    situation: describeSituation(),
    challenges: selectedChallenges(),
    priority: state.priority,
    comment: $("freeText").value.trim(),
    website: $("website").value,
    requestId: state.requestId || generateNonce()
  };
  state.requestId = payload.requestId;
  state.sending = true;
  $("submitButton").disabled = true;
  $("submitButtonLabel").textContent = "Registrando respuesta…";
  $("submissionError").hidden = true;

  try {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true || !data.folio) {
      throw new Error(data.error || "No se pudo registrar la respuesta. Inténtalo nuevamente.");
    }
    $("responseFolio").textContent = data.folio;
    $("surveySection").hidden = true;
    $("successCard").hidden = false;
    $("successCard").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    const errorBox = $("submissionError");
    errorBox.textContent = "⚠️ " + (error.message || "No fue posible completar el envío.");
    errorBox.hidden = false;
  } finally {
    state.sending = false;
    $("submitButton").disabled = false;
    $("submitButtonLabel").textContent = "Enviar respuestas";
  }
}

// ----------------------------------------------------------
// Inicialización
// ----------------------------------------------------------
renderSituationOptions();
renderChallenges();
refreshChallenges();
$("nextButton").addEventListener("click", () => {
  if (!validateStep(state.step)) return;
  setStep(state.step + 1);
});
$("backButton").addEventListener("click", () => { if (state.step > 0) setStep(state.step - 1); });
$("surveyForm").addEventListener("submit", submitSurvey);
$("freeText").addEventListener("input", () => { $("charCount").textContent = `${$("freeText").value.length} / 600`; });
$("restartButton").addEventListener("click", () => { window.location.reload(); });

// Si un participante edita una respuesta después de un fallo, el nuevo
// contenido corresponde a un envío diferente. El ID anterior no se reutiliza.
["otherSituation", "otherChallenge", "freeText"].forEach((id) => {
  $(id).addEventListener("input", () => { state.requestId = null; });
});
