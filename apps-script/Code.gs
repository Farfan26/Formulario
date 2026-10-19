/**
 * ENCUESTA ANÓNIMA PARA JÓVENES INGENIEROS
 * Backend de Google Apps Script.
 *
 * 1) Ejecuta instalarEncuesta() una única vez.
 * 2) Revisa Registros: allí estarán el ID de Google Sheets y el secreto.
 * 3) Implementar > Nueva implementación > Aplicación web:
 *      Ejecutar como: Yo
 *      Quién puede acceder: Cualquier persona
 * 4) Copia la URL /exec y el secreto a las variables de entorno de Netlify.
 *
 * IMPORTANTE: nunca copies el secreto a los archivos públicos HTML/CSS/JS.
 *
 * NO se guardan nombres, emails, direcciones IP, ubicaciones ni device IDs.
 * Cada envío guarda un FOLIO aleatorio; no representa a una persona.
 */

var STATUS = [
  "Trabajo actualmente, pero no como practicante.",
  "Actualmente realizo prácticas preprofesionales.",
  "Trabajo y también realizo prácticas.",
  "Actualmente no trabajo ni hago prácticas, pero sí tengo experiencia previa.",
  "Aún no trabajo ni he realizado prácticas."
];

var RETOS = [
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

var LABEL_RETOS = [
  "Negociar plazos/prioridades",
  "Aclarar expectativas y recursos",
  "Expresar desacuerdos",
  "Hacer escuchar propuestas",
  "Tensiones del equipo",
  "Recibir retroalimentación",
  "Pedir orientación",
  "Coordinar con otras áreas",
  "Ninguna por ahora",
  "Otra situación"
];

var LABEL_STATUS = [
  "Trabajo (no practicante)",
  "Prácticas preprofesionales",
  "Trabajo y prácticas",
  "Experiencia previa",
  "Sin experiencia",
  "Otra situación"
];

var COLORS = {
  navy: "#132850", purple: "#6759ED", soft: "#F3F1FF",
  white: "#FFFFFF", muted: "#66738C", border: "#DFE4F0"
};

// ============================================================
// CREACIÓN INICIAL: NO DUPLICA EL ARCHIVO CUANDO SE REPITE
// ============================================================
function instalarEncuesta() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty("SPREADSHEET_ID");
  var ss;

  if (spreadsheetId) {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } else {
    ss = SpreadsheetApp.create("RESULTADOS | Encuesta anónima - Retos en ingeniería");
    props.setProperty("SPREADSHEET_ID", ss.getId());
  }

  if (!props.getProperty("INGENIERIA_SHARED_SECRET")) {
    props.setProperty("INGENIERIA_SHARED_SECRET", Utilities.getUuid() + Utilities.getUuid());
  }

  configurarHojaRespuestas_(ss);
  configurarResumen_(ss);
  configurarCruces_(ss);
  configurarComentarios_(ss);

  Logger.log("================================================");
  Logger.log("✅ GOOGLE SHEETS: " + ss.getUrl());
  Logger.log("🔐 INGENIERIA_SHARED_SECRET: " + props.getProperty("INGENIERIA_SHARED_SECRET"));
  Logger.log("Copia este secreto solo en las variables de Netlify.");
  Logger.log("================================================");
}

function doGet() {
  // El análisis nunca se expone públicamente.
  return responder_({ ok: false, error: "Servicio de registro activo. Usa la encuesta publicada." });
}

// ============================================================
// RECEPCIÓN Y VALIDACIÓN DE ENCUESTAS
// ============================================================
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty("INGENIERIA_SHARED_SECRET");
    var sheetId = props.getProperty("SPREADSHEET_ID");
    if (!secret || !sheetId) throw new Error("El administrador debe ejecutar instalarEncuesta().");

    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (data.secret !== secret) throw new Error("Solicitud no autorizada.");
    validar_(data);

    lock.waitLock(25000);
    // Idempotencia temporal: reintentar el MISMO envío no crea dos filas.
    // El identificador se conserva en caché hasta 10 minutos, no identifica dispositivos.
    var cache = CacheService.getScriptCache();
    var cacheKey = "envio_" + data.requestId;
    var prior = cache.get(cacheKey);
    if (prior) return responder_({ ok: true, folio: prior, duplicado: true });

    var ss = SpreadsheetApp.openById(sheetId);
    var tab = ss.getSheetByName("Respuestas");
    if (!tab) throw new Error("No existe la hoja Respuestas.");

    var folio = "ING-" + Utilities.getUuid().slice(0, 8).toUpperCase();
    var retosLimpios = data.challenges.map(redactar_);
    var prioridadLimpia = redactar_(data.priority);
    var fecha = new Date();
    var row = [
      folio,
      fecha,
      textoSeguro_(redactar_(data.situation)),
      textoSeguro_(retosLimpios[0] || ""),
      textoSeguro_(retosLimpios[1] || ""),
      textoSeguro_(retosLimpios[2] || ""),
      textoSeguro_(prioridadLimpia),
      textoSeguro_(redactar_(data.comment))
    ];
    tab.appendRow(row);
    var lastRow = tab.getLastRow();
    tab.getRange(lastRow, 2).setNumberFormat("dd/mm/yyyy hh:mm");
    tab.getRange(lastRow, 1, 1, 8).setVerticalAlignment("top");
    tab.getRange(lastRow, 1, 1, 8).setWrap(true);
    if (lastRow % 2 === 0) tab.getRange(lastRow, 1, 1, 8).setBackground("#F8F9FE");
    cache.put(cacheKey, folio, 600);
    return responder_({ ok: true, folio: folio });

  } catch (error) {
    Logger.log("Error registrando encuesta: " + error.message);
    return responder_({ ok: false, error: error.message });
  } finally {
    try { if (lock.hasLock()) lock.releaseLock(); } catch (_) {}
  }
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isOther_(s, limit) {
  return typeof s === "string" && /^Otra situación: .{3,}$/s.test(s.trim()) && s.length <= limit;
}

function validar_(d) {
  if (d.website) throw new Error("Envío no admitido.");
  if (!(STATUS.indexOf(d.situation) !== -1 || isOther_(d.situation, 200))) throw new Error("Situación laboral no válida.");
  if (!Array.isArray(d.challenges) || d.challenges.length < 1 || d.challenges.length > 3) throw new Error("Elige de 1 a 3 alternativas.");
  if (new Set(d.challenges).size !== d.challenges.length) throw new Error("No repitas situaciones.");
  for (var i = 0; i < d.challenges.length; i++) {
    if (!(RETOS.indexOf(d.challenges[i]) !== -1 || isOther_(d.challenges[i], 220))) throw new Error("Alternativa no válida.");
  }
  if (d.challenges.indexOf("Ninguna de estas por ahora.") !== -1 && d.challenges.length > 1) throw new Error("Ninguna se selecciona sola.");
  if (d.challenges.filter(function(s) { return s.indexOf("Otra situación: ") === 0; }).length > 1) throw new Error("Solo se permite una alternativa libre.");
  if (d.challenges.indexOf(d.priority) === -1) throw new Error("Prioridad incorrecta.");
  if (typeof d.comment !== "string" || d.comment.length > 600) throw new Error("Respuesta abierta demasiado extensa.");
  if (typeof d.requestId !== "string" || !/^[a-zA-Z0-9-]{12,90}$/.test(d.requestId)) throw new Error("ID de envío inválido.");
}

// Reduce el riesgo de guardar datos identificables escritos accidentalmente.
function redactar_(s) {
  if (typeof s !== "string") return "";
  return s.trim()
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[correo omitido]")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "[enlace omitido]")
    .replace(/(?:\+?\d[\s().-]*){9,}/g, "[número omitido]");
}
function textoSeguro_(s) {
  // Protege la hoja ante fórmulas inyectadas en respuestas libres.
  return /^[\s]*[=+@-]/.test(s) ? "'" + s : s;
}

// ============================================================
// REGISTRO DE RESPUESTAS (hoja privada)
// ============================================================
function configurarHojaRespuestas_(ss) {
  var tab = ss.getSheetByName("Respuestas") || ss.getSheets()[0];
  tab.setName("Respuestas");
  var headers = ["Folio aleatorio", "Fecha y hora", "Situación actual", "Reto 1", "Reto 2", "Reto 3", "Prioridad", "Comentario opcional"];
  if (tab.getLastRow() === 0) tab.appendRow(headers);
  else if (tab.getLastRow() === 1) tab.getRange(1,1,1,8).setValues([headers]);
  tab.getRange(1,1,1,8).setBackground(COLORS.navy).setFontColor(COLORS.white).setFontWeight("bold").setWrap(true);
  tab.setFrozenRows(1);
  tab.setRowHeight(1,42);
  tab.setColumnWidth(1,135);
  tab.setColumnWidth(2,160);
  tab.setColumnWidth(3,290);
  tab.setColumnWidths(4,3,310);
  tab.setColumnWidth(7,310);
  tab.setColumnWidth(8,400);
  tab.getRange("B2:B").setNumberFormat("dd/mm/yyyy hh:mm");
  if (!tab.getFilter()) tab.getRange(1,1,Math.max(2,tab.getLastRow()),8).createFilter();
}

// ============================================================
// PANEL AUTOMÁTICO: estadísticas, porcentajes y gráficos
// ============================================================
function configurarResumen_(ss) {
  var sheet = ss.getSheetByName("Resumen") || ss.insertSheet("Resumen");
  sheet.getCharts().forEach(function(c){ sheet.removeChart(c); });
  sheet.getRange("A1:L60").breakApart();
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.setColumnWidth(1,290); sheet.setColumnWidth(2,120); sheet.setColumnWidth(3,115);
  sheet.setColumnWidths(4,9,135);
  sheet.getRange("A1:L2").merge().setValue("📊 INFORME DE RESULTADOS | RETOS EN INGENIERÍA")
    .setFontWeight("bold").setFontSize(16).setFontColor(COLORS.white)
    .setBackground(COLORS.navy).setVerticalAlignment("middle");
  sheet.setRowHeight(1,27); sheet.setRowHeight(2,27);

  sheet.getRange("A4").setValue("RESPUESTAS RECIBIDAS").setFontWeight("bold").setFontColor(COLORS.muted);
  sheet.getRange("B4").setFormula("=COUNTA(Respuestas!A2:A)").setFontWeight("bold").setFontSize(20).setFontColor(COLORS.purple);
  sheet.getRange("D4").setValue("CON COMENTARIO").setFontWeight("bold").setFontColor(COLORS.muted);
  sheet.getRange("E4").setFormula('=COUNTIF(Respuestas!H2:H,"?*")').setFontSize(20).setFontWeight("bold").setFontColor(COLORS.purple);
  sheet.getRange("G4").setValue("CON RETOS SELECCIONADOS").setFontWeight("bold").setFontColor(COLORS.muted);
  sheet.getRange("I4").setFormula('=COUNTIF(Respuestas!D2:D,"?*")').setFontSize(20).setFontWeight("bold").setFontColor(COLORS.purple);
  sheet.getRange("A7:C7").merge().setValue("🎯 SITUACIONES MÁS SELECCIONADAS").setFontWeight("bold").setFontColor(COLORS.white).setBackground(COLORS.purple);
  sheet.getRange("A9:C9").setValues([["Situación", "Selecciones", "% de respuestas"]]).setFontWeight("bold").setBackground(COLORS.soft);
  sheet.getRange("A10:A19").setValues(LABEL_RETOS.map(function(s){ return [s]; }));
  sheet.getRange("M10:M19").setValues(RETOS.concat(["Otra situación:*"]).map(function(s){return [s];}));
  for (var i=0; i<10; i++) {
    var r = 10+i;
    sheet.getRange(r,2).setFormula('=COUNTIF(Respuestas!$D$2:$F,"="&$M'+r+')');
    sheet.getRange(r,3).setFormula('=IFERROR(B'+r+'/$B$4,0)');
  }
  sheet.getRange("C10:C19").setNumberFormat("0.0%");
  sheet.hideColumns(13);

  sheet.getRange("A22:C22").merge().setValue("⭐ PRIORIDADES DE APRENDIZAJE").setFontWeight("bold").setFontColor(COLORS.white).setBackground(COLORS.purple);
  sheet.getRange("A23:C23").setValues([["Primera prioridad", "Personas", "% de respuestas"]]).setFontWeight("bold").setBackground(COLORS.soft);
  sheet.getRange("A24:A33").setValues(LABEL_RETOS.map(function(s){ return [s]; }));
  for (var j=0; j<10; j++) {
    var pr=24+j, sourceRow=10+j;
    sheet.getRange(pr,2).setFormula('=COUNTIF(Respuestas!$G$2:$G,"="&$M'+sourceRow+')');
    sheet.getRange(pr,3).setFormula('=IFERROR(B'+pr+'/$B$4,0)');
  }
  sheet.getRange("C24:C33").setNumberFormat("0.0%");

  sheet.getRange("A36:C36").merge().setValue("💼 SITUACIÓN ACTUAL").setFontWeight("bold").setFontColor(COLORS.white).setBackground(COLORS.purple);
  sheet.getRange("A37:C37").setValues([["Situación laboral", "Respuestas", "% de respuestas"]]).setFontWeight("bold").setBackground(COLORS.soft);
  sheet.getRange("A38:A43").setValues(LABEL_STATUS.map(function(s){ return [s]; }));
  sheet.getRange("N38:N43").setValues(STATUS.concat(["Otra situación:*"]).map(function(s){ return [s]; }));
  sheet.hideColumns(14);
  for (var k=0;k<6;k++) {
    var st=38+k;
    sheet.getRange(st,2).setFormula('=COUNTIF(Respuestas!$C$2:$C,"="&$N'+st+')');
    sheet.getRange(st,3).setFormula('=IFERROR(B'+st+'/$B$4,0)');
  }
  sheet.getRange("C38:C43").setNumberFormat("0.0%");
  sheet.getRange("A46:L47").merge()
    .setValue("Nota: las cifras se actualizan automáticamente con cada envío. Una persona puede marcar hasta 3 retos, por eso la suma de selecciones puede superar el número total de respuestas. Los comentarios están en la pestaña «Comentarios».")
    .setWrap(true).setFontColor(COLORS.muted).setBackground("#F6F7FC");
  sheet.setRowHeights(46,2,25);

  var chartR = sheet.newChart().asBarChart()
    .addRange(sheet.getRange("A9:B19"))
    .setPosition(8,5,0,0)
    .setOption("title","Retos más frecuentes")
    .setOption("legend",{position:"none"})
    .setOption("colors",[COLORS.purple])
    .setOption("width",740).setOption("height",330)
    .build();
  sheet.insertChart(chartR);
  var chartS = sheet.newChart().asPieChart()
    .addRange(sheet.getRange("A37:B43"))
    .setPosition(25,5,0,0)
    .setOption("title","Situación laboral actual")
    .setOption("pieHole",0.38)
    .setOption("width",650).setOption("height",360)
    .build();
  sheet.insertChart(chartS);
  sheet.setFrozenRows(2);
}

// ============================================================
// MATRIZ DE CRUCE: situación laboral vs. cada reto
// ============================================================
function configurarCruces_(ss) {
  var sheet = ss.getSheetByName("Cruces") || ss.insertSheet("Cruces");
  sheet.getRange("A1:Q20").breakApart();
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.setColumnWidth(1,260);
  sheet.setColumnWidths(2,10,165);
  sheet.getRange("A1:K2").merge().setValue("🔎 ANÁLISIS CRUZADO | SITUACIÓN LABORAL × RETO")
    .setBackground(COLORS.navy).setFontColor(COLORS.white).setFontSize(15).setFontWeight("bold");
  sheet.getRange("A4:K4").merge().setValue("Número de respuestas por tipo de situación laboral y reto elegido. Una respuesta puede contar en hasta tres columnas.")
    .setFontColor(COLORS.muted).setWrap(true);
  sheet.getRange("A6").setValue("Situación / Reto");
  sheet.getRange("B6:K6").setValues([LABEL_RETOS]);
  sheet.getRange("A6:K6").setBackground(COLORS.purple).setFontColor(COLORS.white).setFontWeight("bold").setWrap(true);
  sheet.setRowHeight(6,70);
  sheet.getRange("A7:A12").setValues(LABEL_STATUS.map(function(s){return [s];}));
  sheet.getRange("M7:M12").setValues(STATUS.concat(["Otra situación:*"]).map(function(s){return [s];}));
  sheet.getRange("Q7:Q16").setValues(RETOS.concat(["Otra situación:*"]).map(function(s){return [s];}));

  for (var i=0; i<6; i++) {
    for (var j=0; j<10; j++) {
      var row = 7+i, col = 2+j, keyRow = 7+j;
      var f = '=COUNTIFS(Respuestas!$C$2:$C,"="&$M'+row+',Respuestas!$D$2:$D,"="&$Q$'+keyRow+')'
        + '+COUNTIFS(Respuestas!$C$2:$C,"="&$M'+row+',Respuestas!$E$2:$E,"="&$Q$'+keyRow+')'
        + '+COUNTIFS(Respuestas!$C$2:$C,"="&$M'+row+',Respuestas!$F$2:$F,"="&$Q$'+keyRow+')';
      sheet.getRange(row,col).setFormula(f);
    }
  }
  sheet.getRange("A7:K12").setBackground("#F8F9FF").setWrap(true);
  sheet.getRange("B7:K12").setHorizontalAlignment("center");
  sheet.hideColumns(13); sheet.hideColumns(17);
  sheet.setFrozenRows(6); sheet.setFrozenColumns(1);
}

// ============================================================
// COMENTARIOS ANÓNIMOS (NUNCA PÚBLICOS)
// ============================================================
function configurarComentarios_(ss) {
  var sheet = ss.getSheetByName("Comentarios") || ss.insertSheet("Comentarios");
  sheet.getRange("A1:C3").breakApart();
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.getRange("A1:C2").merge().setValue("💬 COMENTARIOS ABIERTOS | ANÓNIMOS")
    .setBackground(COLORS.navy).setFontColor(COLORS.white).setFontWeight("bold").setFontSize(14);
  sheet.getRange("A4:C4").setValues([["Fecha y hora", "Situación laboral", "Respuesta opcional"]])
    .setBackground(COLORS.purple).setFontColor(COLORS.white).setFontWeight("bold");
  sheet.getRange("A5").setFormula('=IFERROR(QUERY(Respuestas!B2:H,"select B,C,H where H is not null",0),"Aún no hay comentarios")');
  sheet.setColumnWidth(1,175); sheet.setColumnWidth(2,330); sheet.setColumnWidth(3,540);
  sheet.getRange("A5:A").setNumberFormat("dd/mm/yyyy hh:mm");
  sheet.setFrozenRows(4);
}
