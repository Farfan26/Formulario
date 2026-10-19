/** Pruebas locales sin servicios externos: node tests/test-backend.cjs */
const assert = require('node:assert/strict');
const { handler } = require('../netlify/functions/enviar.cjs');
const STATUS = 'Actualmente realizo prácticas preprofesionales.';
const RETOS = [
  'Negociar plazos o prioridades cuando recibo tareas urgentes al mismo tiempo.',
  'Expresar un desacuerdo o proponer una alternativa a alguien con más experiencia.',
  'Coordinar tareas con personas de otras especialidades o áreas.',
  'Ninguna de estas por ahora.'
];
const payload = {
  situation: STATUS,
  challenges: [RETOS[0], RETOS[1]],
  priority: RETOS[1],
  comment: '', website: '',
  requestId: '11111111-2222-4333-8444-555555555555'
};
function req(obj) { return { httpMethod:'POST', body:JSON.stringify(obj), isBase64Encoded:false }; }
async function test() {
  delete process.env.SCRIPT_WEB_APP_URL;
  delete process.env.INGENIERIA_SHARED_SECRET;
  let r = await handler(req(payload));
  assert.equal(r.statusCode,503,'Debería avisar cuando aún no está conectado a Sheets');

  process.env.SCRIPT_WEB_APP_URL='https://script.google.com/macros/s/fake/exec';
  process.env.INGENIERIA_SHARED_SECRET='secret_for_local_test_only';
  let calls = 0;
  global.fetch=async (_url,options) => {
    calls += 1;
    const posted=JSON.parse(options.body);
    assert.equal(posted.secret,process.env.INGENIERIA_SHARED_SECRET);
    assert.equal(posted.priority,RETOS[1]);
    return { ok:true,text:async()=>JSON.stringify({ok:true,folio:'ING-1234ABCD'}) };
  };
  r=await handler(req(payload));
  assert.equal(r.statusCode,200);
  assert.equal(JSON.parse(r.body).folio,'ING-1234ABCD');
  r=await handler(req({...payload,challenges:[RETOS[0],RETOS[1],RETOS[2],RETOS[3]]}));
  assert.equal(r.statusCode,400,'Se rechazan 4 retos');
  r=await handler(req({...payload,challenges:[RETOS[0],RETOS[3]],priority:RETOS[0]}));
  assert.equal(r.statusCode,400,'Ninguna es excluyente');
  r=await handler(req({...payload,priority:RETOS[2]}));
  assert.equal(r.statusCode,400,'La prioridad debe haberse elegido antes');
  r=await handler(req({...payload,situation:'Otra situación: Taller independiente'}));
  assert.equal(r.statusCode,200,'Debe aceptar una situación de texto libre');
  assert.equal(calls,2,'Solo solicitudes válidas llegan a Google');
  console.log('PRUEBAS API: configuración, válidos, 4 opciones, ninguna, prioridad y otros: OK');
}
test().catch(e=>{console.error(e);process.exit(1);});
