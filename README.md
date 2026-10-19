# ENCUESTA PROFESIONAL Y ANÓNIMA — RETOS DE INGENIERÍA (VERSIÓN 2)

Sitio adaptable a PC, tablet y celular; HTML, CSS y JS en archivos separados; portada incluida; envío seguro con Netlify Function, Apps Script y Google Sheets; resumen estadístico privado.

## 1. CONTENIDO DEL ZIP

```text
Encuesta_Retos_Ingenieria_Profesional_V2/
├── public/
│   ├── index.html                Página principal; preguntas literales
│   ├── css/styles.css            Paleta, tarjetas, botones, animaciones, responsive
│   ├── js/app.js                 Validación, navegación y envío
│   └── assets/
│       ├── portada-ingenieria.webp  Portada optimizada 2508 × 627
│       └── favicon.svg
├── netlify/functions/enviar.cjs  Puente privado entre HTML y Apps Script
├── apps-script/Code.gs           Backend Google Sheets + gráficos
├── netlify.toml                  Configuración de despliegue
├── package.json                 Comprobación de sintaxis
├── preview/                      Capturas orientativas en 3 dispositivos
└── README.md                     Esta guía
```

## 2. PREGUNTAS RESPETADAS

Título: **Retos de las prácticas y los primeros años profesionales en ingeniería**.

Descripción original: "Estoy explorando una propuesta de formación complementaria para estudiantes de últimos ciclos y jóvenes ingenieros. Me interesa conocer qué situaciones de conversación, coordinación y toma de decisiones pueden resultar más retadoras durante las prácticas preprofesionales o al comenzar a trabajar. La encuesta es voluntaria, toma unos dos minutos y no afecta las notas. No solicita datos personales." El texto aparece en dos lugares para una lectura más cómoda.

**Pregunta 1 (obligatoria): ¿Cuál describe mejor tu situación actual?** Opciones originales (5 + Otra situación).

**Pregunta 2 (obligatoria): Pensando en tus prácticas preprofesionales o en tus primeros años de trabajo, ¿qué situaciones te parece importante aprender a manejar mejor?** Opciones originales (8 + Ninguna de estas por ahora + Otra situación). De una a tres respuestas. La opción «Ninguna» es excluyente.

**Pregunta 3 (obligatoria): De las situaciones que marcaste, ¿cuál te gustaría aprender a manejar primero?** Se visualizan solo las alternativas marcadas en la pregunta anterior. Para «Ninguna de estas por ahora», el botón de prioridad muestra «Ninguna por ahora» y guarda el mismo valor original.

**Pregunta 4 (opcional): Piensa en una práctica, proyecto de equipo o situación laboral real —o que anticipes al empezar a trabajar—. ¿Qué conversación o interacción te gustaría manejar mejor?** Campo abierto con la instrucción original y un aviso para evitar datos personales.

**Privacidad:** No se piden nombres ni correos. El sistema registra respuestas, fecha y hora y un folio aleatorio de cada envío. No se intenta identificar a una persona, por lo que **no es posible garantizar una única respuesta por persona**. En campos de texto libre podrían introducirse datos identificables; se intenta eliminar correos, teléfonos y enlaces, pero no puede detectarse todo (por ejemplo, nombres propios). Google y Netlify pueden conservar sus registros de infraestructura. Mantén la hoja privada y protege grupos demasiado pequeños al compartir conclusiones.

## 3. INSTALACIÓN GOOGLE SHEETS

1. Entra a https://script.google.com/ y crea un proyecto llamado, por ejemplo, `Encuesta de ingeniería`.
2. Abre `Código.gs`, borra el ejemplo y pega **todo el contenido de `apps-script/Code.gs`**.
3. Guarda, selecciona `instalarEncuesta` en el desplegable y haz clic en **Ejecutar**.
4. Autoriza el acceso a tu cuenta de Google: el script necesita crear y escribir su propia hoja de cálculo.
5. Abre **Registro de ejecución**. Copia de ahí el enlace de Google Sheets y el valor `INGENIERIA_SHARED_SECRET` (es una clave privada, no se comparte con participantes ni se escribe en el JS público).
6. El Sheet tendrá **Respuestas**, **Resumen**, **Cruces** y **Comentarios**. No lo publiques en internet.

**¿Ya usabas la versión anterior?** El nuevo `Code.gs` sigue empleando las propiedades `SPREADSHEET_ID` e `INGENIERIA_SHARED_SECRET`. Si lo pegas y ejecutas **en el MISMO proyecto de Apps Script anterior**, seguirá apuntando al mismo Sheet; actualiza su despliegue a una nueva versión para que use el nuevo código. Conserva las respuestas previas. No ejecutes `instalarEncuesta` en un proyecto de Apps Script completamente distinto si deseas recuperar el Sheet anterior.

## 4. PUBLICAR GOOGLE APPS SCRIPT COMO WEB APP

1. Haz clic en **Implementar → Nueva implementación → Aplicación web**.
2. En **Ejecutar como**, elige **Yo**.
3. En **Quién tiene acceso**, elige **Cualquier persona**, si tu institución lo permite. Los estudiantes no necesitarán iniciar sesión.
4. Pulsa **Implementar** y copia la URL terminada en `/exec`.
5. Si ya publicaste una versión anterior, ve a **Implementar → Gestionar implementaciones → Editar → Nueva versión** y vuelve a implementar. Puedes conservar el mismo enlace `/exec`.

Este servicio no muestra los datos del panel a los visitantes. Requiere la clave privada para aceptar registros.

## 5. PUBLICAR EN NETLIFY

**Recomendado: integración GitHub + Netlify**, no solo arrastrar la carpeta `public` (eso no incluiría la función que guarda respuestas).

1. Descomprime el ZIP en tu equipo.
2. Sube el contenido de la carpeta del proyecto a un repositorio GitHub. Deben quedar en la raíz `netlify.toml`, `public/`, `netlify/functions/` y `apps-script/`.
3. Entra en https://app.netlify.com/ → **Add new project / Import an existing project** → GitHub → selecciona el repositorio.
4. Netlify detectará `netlify.toml`: `public` es la carpeta publicada y `netlify/functions` contiene la función.
5. En **Site configuration → Environment variables** agrega:
   - `SCRIPT_WEB_APP_URL` = URL del paso 4, terminada en `/exec`.
   - `INGENIERIA_SHARED_SECRET` = clave privada generada por `instalarEncuesta`.
6. Guarda esas variables y ejecuta **Deploy / Redeploy**. No agregues estos secretos a archivos HTML, CSS, JS, GitHub ni capturas.
7. Abre la dirección web pública de Netlify y comparte únicamente esa URL a los participantes.

**Advertencia:** la URL y secreto de Apps Script se usan **solo** desde la función `netlify/functions/enviar.cjs`; el navegador no tiene acceso a esas credenciales. Abrir `index.html` sin desplegar sirve para revisar el diseño, pero no guarda en Sheets.

## 6. VERIFICACIÓN CON UNA RESPUESTA DE PRUEBA

1. Abre tu Netlify en incógnito.
2. **Pregunta 1:** marca una de las seis opciones. «Otra situación» despliega un campo obligatorio si se selecciona.
3. **Pregunta 2:** marca 1, 2 o 3 retos. Una cuarta opción es rechazada; «Ninguna de estas por ahora» limpia las demás. «Otra situación» pide una explicación.
4. **Pregunta 3:** se presentan las opciones marcadas; elige una.
5. **Pregunta 4:** escribe un comentario inventado sin nombres (o déjala en blanco).
6. Pulsa **Enviar respuestas** y comprueba que aparece `ING-XXXXXXXX`.
7. En Google Sheets, verifica la nueva fila en **Respuestas** y los indicadores en **Resumen**. Las pestañas **Cruces** y **Comentarios** facilitan comparar diferentes tipos de respuestas.
8. Si algo falla, revisa **Netlify → Functions → Logs** y **Apps Script → Ejecuciones**. Un fallo de red **no** se muestra como envío confirmado. Reintentar el mismo envío evita duplicados por ID aleatorio.

## 7. ANALÍTICA INCLUIDA

- **Respuestas:** fecha, folio aleatorio, situación actual, 1–3 retos, prioridad y comentario.
- **Resumen:** respuestas recibidas, conteo de selecciones, prioridades y distribución laboral, con dos gráficos.
- **Cruces:** cuántos estudiantes de cada situación laboral seleccionaron cada reto.
- **Comentarios:** respuestas abiertas, para revisión privada.
- **Nota metodológica:** las selecciones totales pueden superar las respuestas porque cada persona puede marcar hasta tres retos. Se analizan **envíos**, no individuos verificados.

## 8. PERSONALIZACIÓN

- Imagen de encabezado: reemplaza `public/assets/portada-ingenieria.webp` por otra imagen WEBP en formato horizontal (mantén nombre y relación 4:1 para no tocar el código). Si usas otro nombre, cambia la ruta `src` de `index.html`.
- Colores, tarjetas, sombras, tipografías, hover y móvil: `public/css/styles.css` → sección `:root` y selectores.
- Textos visibles y cabeceras: `public/index.html`.
- Alternativas y reglas de validación: `public/js/app.js`, `netlify/functions/enviar.cjs` y `apps-script/Code.gs`. Deben concordar; no cambies opciones en un solo archivo.
- Nombres de columnas y análisis: `apps-script/Code.gs`.
- Ejecuta `npm run check` si tienes Node instalado para comprobar la sintaxis de los scripts JS.

La solución **no** crea un Google Form: es un formulario HTML profesional que envía sus datos a Google Sheets. No contiene nombres propios de miembros del equipo ni pide identificación de participantes.
