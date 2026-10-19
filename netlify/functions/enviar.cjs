/**
 * Netlify Function: puente privado entre HTML y Google Apps Script.
 * El secreto y la URL de Apps Script NO están en el JavaScript público.
 * No recopila direcciones IP, nombres, correos ni datos del navegador.
 */
const STATUS = [
  "Trabajo actualmente, pero no como practicante.",
  "Actualmente realizo prácticas preprofesionales.",
  "Trabajo y también realizo prácticas.",
  "Actualmente no trabajo ni hago prácticas, pero sí tengo experiencia previa.",
  "Aún no trabajo ni he realizado prácticas."
];
const CHALLENGES = [
  "Negociar plazos o prioridades cuando recibo tareas urgentes al mismo tiempo.",
  "Aclarar con mi supervisor qué espera de mí, con qué autoridad cuento o qué recursos tengo.",
  "Expresar un desacuerdo o proponer una alternativa a alguien con más experiencia.",
  "Lograr que escuchen una propuesta cuando todavía no tengo un cargo de autoridad.",
  "Manejar una diferencia o tensión dentro de un equipo de trabajo.",
  "Recibir una crítica o retroalimentación y responder de manera constructiva.",
  "Decidir cuándo resolver algo por mi cuenta y cuándo pedir orientación.",
  "Coordinar tareas con personas de otras especialidades o áreas.",
  "Ninguna de estas por ahora."
];

function isOther(value, max) {
  return typeof value === "string" && value.startsWith("Otra situación: ") &&
    value.slice("Otra situación: ".length).trim().length >= 3 && value.length <= max;
}
function validate(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Datos incorrectos.";
  if (payload.website) return "El envío no se ha aceptado.";
  if (!(STATUS.includes(payload.situation) || isOther(payload.situation, 200))) return "Selecciona una situación válida.";
  if (!Array.isArray(payload.challenges) || payload.challenges.length < 1 || payload.challenges.length > 3) return "Selecciona de una a tres situaciones.";
  if (new Set(payload.challenges).size !== payload.challenges.length) return "No repitas alternativas.";
  for (const value of payload.challenges) {
    if (!(CHALLENGES.includes(value) || isOther(value, 220))) return "Hay una situación no válida.";
  }
  if (payload.challenges.some(c => c === "Ninguna de estas por ahora.") && payload.challenges.length !== 1) return "La opción «Ninguna» se elige sola.";
  if (payload.challenges.filter(c => c.startsWith("Otra situación: ")).length > 1) return "Solo puedes escribir una alternativa libre.";
  if (!payload.challenges.includes(payload.priority)) return "La prioridad debe ser una de las situaciones seleccionadas.";
  if (typeof payload.comment !== "string" || payload.comment.length > 600) return "El texto es demasiado largo.";
  if (typeof payload.requestId !== "string" || !/^[a-zA-Z0-9-]{12,90}$/.test(payload.requestId)) return "No se pudo validar el intento. Actualiza la página.";
  return null;
}
function reply(statusCode, content) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(content)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { ok: false, error: "Método no permitido." });
  if (!process.env.SCRIPT_WEB_APP_URL || !process.env.INGENIERIA_SHARED_SECRET) {
    return reply(503, { ok: false, error: "La conexión con Google Sheets aún no está configurada por el administrador." });
  }
  if (!event.body || event.body.length > 12000) return reply(413, { ok: false, error: "Solicitud demasiado grande." });

  let payload;
  try {
    payload = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
  } catch (_) {
    return reply(400, { ok: false, error: "La solicitud no contiene JSON válido." });
  }
  const error = validate(payload);
  if (error) return reply(400, { ok: false, error });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(process.env.SCRIPT_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret: process.env.INGENIERIA_SHARED_SECRET }),
      redirect: "follow",
      signal: controller.signal
    });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) { throw new Error("No se recibió JSON desde Google Apps Script."); }
    if (!response.ok || result.ok !== true || typeof result.folio !== "string") {
      return reply(502, { ok: false, error: result.error || "Google Sheets no pudo registrar el envío." });
    }
    return reply(200, { ok: true, folio: result.folio });
  } catch (err) {
    // No devolver secretos ni datos del backend al navegador.
    console.error("Error de registro en Netlify Function:", err.name, err.message);
    return reply(502, { ok: false, error: "No se pudo contactar con el servicio de registro. Vuelve a intentar." });
  } finally {
    clearTimeout(timeout);
  }
};
