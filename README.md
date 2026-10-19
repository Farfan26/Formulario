# 🎓 Encuesta anónima | Retos profesionales en ingeniería

**Proyecto completo HTML + CSS + JavaScript + Netlify Functions + Google Apps Script + Google Sheets**. Incluye la portada ilustrada, encuesta mobile-first y panel de análisis privado.

## ✅ Qué hace realmente

- **Es anónima a nivel de las respuestas almacenadas**: no pregunta ni guarda nombre, correo electrónico, ubicación, IP o identificador de dispositivo en Google Sheets. No contiene herramientas de seguimiento web.
- Recopila las cuatro preguntas originales, reorganizadas en tres pasos.
- En situación actual y prioridad, selección única. En retos profesionales, **máximo 3** opciones y «Ninguna de estas» excluyente.
- Cuando alguien pasa a la prioridad, **solamente verá sus alternativas seleccionadas**.
- Al enviar: confirma el registro en Google Sheets antes de mostrar «Gracias».
- Genera **un folio aleatorio por respuesta**, no por persona; permite distinguir envíos, no personas. **Una misma persona puede responder varias veces**, ya que no se identifica a los participantes.
- Crea cuatro pestañas privadas en Sheets: **Respuestas**, **Resumen** (indicadores y gráficos), **Cruces** (situación laboral × retos) y **Comentarios**.
- Filtra intentos no válidos y elimina patrones básicos de correos, teléfonos y enlaces que se incluyan por error en campos abiertos. No detecta con fiabilidad nombres propios: solicita a los participantes no introducir información identificable.

> **Privacidad:** la web y Google/Netlify pueden conservar registros técnicos normales de infraestructura. Este proyecto no los envía a la hoja de resultados. Los comentarios libres y las combinaciones poco frecuentes podrían revelar indirectamente a una persona si escribe datos identificativos o la muestra es muy pequeña. Limita quién puede ver el Sheet.

## 📁 Archivos incluidos

```text
Encuesta_Retos_Ingenieria_Anonima/
├── public/
│   ├── index.html                 ← Página de la encuesta
│   ├── css/styles.css             ← Diseño, responsive y animaciones
│   ├── js/app.js                  ← Preguntas, validación y envío
│   └── assets/
│       ├── portada-ingenieria.webp ← Portada incluida, 2508×627 px
│       └── favicon.svg
├── netlify/functions/enviar.cjs   ← Backend privado de Netlify
├── apps-script/Code.gs            ← Registro y análisis en Google Sheets
├── netlify.toml                   ← Configuración de despliegue
├── package.json                  ← Opcional: pruebas y entorno local
└── README.md                     ← Esta guía
```

## 🚀 INSTALACIÓN (paso a paso)

### PASO 1 — Configura el Google Apps Script

1. Ve a **https://script.google.com/** e inicia sesión con la cuenta propietaria del Sheets.
2. Pulsa **Nuevo proyecto** y ponle por nombre `Encuesta Ingeniería - Anónima`.
3. Abre `Código.gs`, borra el contenido original y pega **todo** `apps-script/Code.gs`.
4. Guarda el archivo.
5. En el desplegable de funciones selecciona **`instalarEncuesta`** y pulsa **Ejecutar**.
6. Autoriza los permisos solicitados de Google Sheets / Apps Script. Si hay una advertencia de aplicación no verificada, continúa **solo si reconoces y confías en este script propio**.
7. Ve a **Registro de ejecución**. Aparecerán:
   - `GOOGLE SHEETS: https://docs.google.com/spreadsheets/d/...`
   - `INGENIERIA_SHARED_SECRET: ...` (**secreto**, no publicarlo)
8. Abre el enlace de Google Sheets. Verás cuatro pestañas. Déjalo **privado**; no lo publiques ni lo compartas con los participantes.

**IMPORTANTE:** `instalarEncuesta` se puede ejecutar otra vez sin crear otro spreadsheet. Sí rehace los formatos/gráficos de las pestañas de análisis, por lo que no conviene personalizar manualmente esas pestañas antes de volver a ejecutarlo. **No elimina las respuestas existentes**.

### PASO 2 — Publica el Apps Script como Web App

1. En el editor de Apps Script, elige **Implementar → Nueva implementación**.
2. Selecciona el tipo **Aplicación web** (ícono de engranaje).
3. Introduce una descripción, por ejemplo `API de encuestas anónimas`.
4. Selecciona **Ejecutar como: Yo**.
5. Selecciona **Quién tiene acceso: Cualquier persona** (no «solo yo»).
6. Pulsa **Implementar** y copia la URL que termina en **`/exec`**.
7. Guárdala como `SCRIPT_WEB_APP_URL` para el paso siguiente.

**Nota:** para preservar el anonimato y no obligar a iniciar sesión, el despliegue debe permitir visitantes sin iniciar sesión. Algunas cuentas institucionales de Google Workspace restringen este acceso; prueba la URL en incógnito y revisa las políticas de tu organización si falla.

### PASO 3 — Publica en Netlify (con funciones)

La versión HTML se publica en Netlify. La función de Netlify protege la URL de Apps Script y su secreto y permite una **confirmación real** del envío, evitando problemas de CORS.

**Método recomendado: conectar GitHub:**

1. Extrae el ZIP en tu PC. **No subas el ZIP completo a la carpeta `public`**.
2. Crea un repositorio de GitHub y sube **el contenido de esta carpeta del proyecto** (incluidos `netlify.toml`, `public`, `netlify/functions`, pero sin secretos).
3. En Netlify, selecciona **Add new project / Import an existing project → GitHub** y elige tu repositorio.
4. `netlify.toml` configura automáticamente:
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
   - **Build command:** ninguno.
5. Antes de publicar, entra a **Site configuration / Project configuration → Environment variables** y agrega estas dos variables (para **Functions** o **All scopes**):

| Variable | Valor |
| --- | --- |
| `SCRIPT_WEB_APP_URL` | La URL **/exec** del PASO 2 |
| `INGENIERIA_SHARED_SECRET` | El secreto de **Registro de ejecución** del PASO 1 |

6. Guarda y despliega. Si añadiste las variables después de publicar, realiza **Trigger deploy / Redeploy** para que la función pueda leerlas.
7. Abre la URL pública de Netlify; la encuesta aparecerá lista para compartir.

**Alternativa por terminal Netlify CLI:** desde la raíz del proyecto, usa `npx netlify-cli deploy --build --prod` tras autenticarte y configurar las mismas variables de entorno en Netlify. Si no tienes el CLI, puedes instalarlo siguiendo la documentación oficial.

> **No uses solamente “arrastrar y soltar” la carpeta `public`** a Netlify: se cargaría el HTML, pero no la función `enviar.cjs` y no guardaría las respuestas. El despliegue debe incluir Netlify Functions.

### PASO 4 — Prueba que se guarda en Sheets

1. Abre la encuesta pública en modo incógnito (sin sesión de Google).
2. Selecciona una opción en situación actual.
3. Marca hasta tres retos (verifica que una cuarta marca sea rechazada).
4. Selecciona la prioridad entre las alternativas elegidas.
5. Escribe, si deseas, un comentario de prueba **sin datos personales**.
6. Haz clic en **Enviar mi respuesta**. Debes ver una pantalla de agradecimiento y un folio con formato `ING-XXXXXXXX`.
7. Abre la hoja privada **Respuestas**: debe aparecer una nueva fila.
8. Revisa **Resumen**: los indicadores, gráficos y porcentajes cambian automáticamente.
9. Revisa **Cruces** para comparar retos según situación laboral y **Comentarios** para leer las respuestas abiertas.

Si el envío no confirma, **no lo des por recibido**. Revisa Netlify → Functions → Logs y Google Apps Script → Ejecuciones.

## 📊 Cómo se analizan diferentes respuestas

- **Respuestas:** conserva cada envío con su fecha, folio aleatorio, situación, máximo tres retos, primera prioridad y comentario opcional.
- **Resumen:** cuenta cuántos envíos hay, qué reto se eligió más, cuál es la prioridad más habitual y cómo se distribuyen las situaciones laborales. Los gráficos son automáticos.
- **Cruces:** matriz para comparar, por ejemplo, si quienes realizan prácticas necesitan más ayuda con negociación o coordinación.
- **Comentarios:** reúne las respuestas abiertas en una hoja aparte, sin nombre ni email.
- **Importante:** se distinguen **envíos individuales**, no **personas únicas**. Anonimato fuerte y control de una sola respuesta por persona no se pueden garantizar simultáneamente sin algún mecanismo identificador.

## 🛠️ ¿Dónde edito cada cosa?

| Qué deseas cambiar | Archivo |
| --- | --- |
| Textos, encabezados, descripciones | `public/index.html` |
| Colores, sombras, tarjetas, animaciones y móviles | `public/css/styles.css` |
| Alternativas, límite de tres y comportamiento | `public/js/app.js` |
| Portada | `public/assets/portada-ingenieria.webp` |
| Validación del servidor y conexión segura | `netlify/functions/enviar.cjs` |
| Columnas de Sheets y gráficos | `apps-script/Code.gs` |

**Si cambias opciones:** actualiza en `public/js/app.js`, `netlify/functions/enviar.cjs` y `apps-script/Code.gs` para que los tres componentes acepten los mismos textos. Si ya tienes respuestas, cambiar el texto de las opciones requerirá ajustar el histórico del panel.

## 🔒 Qué medidas de seguridad incluye

- El secreto se guarda como propiedad de Apps Script y variable de entorno de Netlify; nunca en el frontend.
- Validación **doble**: el navegador, la función de Netlify y Apps Script validan las respuestas.
- «Ninguna» es excluyente; no se aceptan más de tres retos, ni prioridades no seleccionadas.
- Protección básica antispam (campo señuelo), antipérdida por reintento (idempotencia de 10 minutos), longitud máxima de campos y neutralización de entradas que parecen fórmulas de Sheets.
- El dashboard se consulta en el Google Sheets **privado**, no existe un panel público de comentarios.
- **Limitación:** esto no es un sistema antibots avanzado ni garantiza un envío único por persona.

## 🧪 Vista previa local

Puedes abrir `public/index.html` para inspeccionar el diseño sin desplegarlo. También puedes iniciar un servidor local:

```bash
cd public
python -m http.server 8000
```

Luego abre `http://localhost:8000`. **El botón Enviar solo guardará en Sheets cuando el proyecto esté publicado con Netlify Functions y las dos variables de entorno estén configuradas.**

## ⚠️ Aviso sobre formularios anteriores

Esta solución es una **página HTML independiente**, no modifica tu Google Form previo ni reutiliza su hoja de respuestas. Crea su propio Google Sheets para llevar el análisis de manera separada.

### Fuentes técnicas oficiales
- Google Apps Script Web Apps: https://developers.google.com/apps-script/guides/web
- Netlify Functions: https://docs.netlify.com/build/functions/configuration/
- Netlify variables de entorno: https://docs.netlify.com/build/functions/environment-variables/
