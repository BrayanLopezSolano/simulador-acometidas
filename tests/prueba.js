// Pruebas en tamaño iPhone (Playwright + Chromium con perfil "iPhone 13").
// Uso: node tests/prueba.js [carpeta-de-capturas]
const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CAPTURAS = process.argv[2] || path.resolve(__dirname, 'capturas');
fs.mkdirSync(CAPTURAS, { recursive: true });

let fallos = 0;
function ok(cond, msg) { console.log((cond ? '  ✔ ' : '  ✖ ') + msg); if (!cond) fallos++; }

async function tocar(page, sel) { await page.locator(sel).first().click(); }

async function recorrer(page, tipo, modo) {
  await page.goto(URL);
  await tocar(page, `[data-accion="${modo}-${tipo}"]`);
  const pasos = await page.evaluate(t => DATOS.acometidas[t].pasos.map(p => [p.pieza, p.zona]), tipo);
  for (const [pieza, zona] of pasos) {
    await tocar(page, `[data-pieza="${pieza}"]`);
    await tocar(page, `[data-zona="${zona}"]`);
  }
  return pasos.length;
}

async function revisarDiseno(page, nombre) {
  const r = await page.evaluate(() => {
    const ancho = document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    const chicos = [...document.querySelectorAll('button:not(.zona), a.boton')].filter(b => {
      const c = b.getBoundingClientRect(); return c.width > 0 && (c.height < 48 || c.width < 48);
    }).map(b => b.textContent.trim().slice(0, 30));
    const zonasChicas = [...document.querySelectorAll('.zona')].filter(b => {
      const c = b.getBoundingClientRect(); return c.height < 40 || c.width < 40;
    }).map(b => b.dataset.zona + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height));
    const letraChica = [...document.querySelectorAll('body *')].filter(el =>
      [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 18
    ).map(el => el.tagName + ':' + el.textContent.trim().slice(0, 20));
    return { ancho, chicos, zonasChicas, letraChica };
  });
  ok(r.ancho, `${nombre}: sin desplazamiento horizontal`);
  ok(!r.chicos.length, `${nombre}: botones de 48 px o más ${r.chicos.length ? JSON.stringify(r.chicos) : ''}`);
  ok(!r.zonasChicas.length, `${nombre}: zonas del dibujo de 40 px o más ${r.zonasChicas.length ? JSON.stringify(r.zonasChicas) : ''}`);
  ok(!r.letraChica.length, `${nombre}: letra de 18 px o más ${r.letraChica.length ? JSON.stringify(r.letraChica.slice(0, 5)) : ''}`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const externas = [];
  await context.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('file:')) return route.continue();
    externas.push(u); return route.abort();
  });
  const page = await context.newPage();
  const erroresJs = [];
  page.on('pageerror', e => erroresJs.push(e.message));
  page.on('dialog', d => d.accept());

  console.log('1. Inicio');
  await page.goto(URL);
  ok(await page.locator('h1').first().innerText() === 'Simulador de acometidas', 'carga la pantalla de inicio');
  await revisarDiseno(page, 'Inicio');
  await page.screenshot({ path: path.join(CAPTURAS, '01-inicio.png'), fullPage: true });

  console.log('2. Recorrido perfecto en examen → 100');
  for (const tipo of ['aerea', 'soterrada']) {
    const n = await recorrer(page, tipo, 'examen');
    ok(await page.locator('#nota').innerText() === '100', `${tipo}: ${n} pasos sin errores dan 100`);
    await page.screenshot({ path: path.join(CAPTURAS, `0${tipo === 'aerea' ? 2 : 3}-resultado-${tipo}.png`), fullPage: true });
  }

  console.log('3. Errores en práctica');
  await page.goto(URL);
  await tocar(page, '[data-accion="practica-aerea"]');
  await revisarDiseno(page, 'Juego');
  // Saltarse la seguridad: detector antes del EPP
  await tocar(page, '[data-pieza="detector"]'); await tocar(page, '[data-zona="pared_media"]');
  ok((await page.locator('#fb').innerText()).includes('Error de seguridad'), 'saltarse el EPP → error de seguridad');
  // Distractor
  await tocar(page, '[data-pieza="guantes_tela"]'); await tocar(page, '[data-zona="trabajador"]');
  ok((await page.locator('#fb').innerText()).includes('Error de seguridad'), 'distractor en paso crítico → error de seguridad');
  // Lugar equivocado
  await tocar(page, '[data-pieza="epp"]'); await tocar(page, '[data-zona="suelo"]');
  ok((await page.locator('#fb').innerText()).includes('trabajador'), 'pieza correcta en lugar equivocado → mensaje de lugar');
  await tocar(page, '[data-zona="trabajador"]');
  ok((await page.locator('#fb').innerText()).includes('Correcto'), 'luego en su lugar → correcto');
  // Pista
  await tocar(page, '[data-accion="pista"]');
  ok(await page.locator('.pieza.pista').count() === 1, 'pista 1 marca la pieza');
  await tocar(page, '.pieza.pista'); await tocar(page, '[data-accion="pista"]');
  ok(await page.locator('.zona.pista').count() === 1, 'pista 2 marca la zona');
  await tocar(page, '.zona.pista');
  // Pasar el paso 3 (conos) y probar orden y distractor en paso normal
  await tocar(page, '[data-pieza="conos"]'); await tocar(page, '[data-zona="suelo"]');
  await tocar(page, '[data-pieza="mufa"]'); await tocar(page, '[data-zona="punta_tubo"]');
  ok((await page.locator('#fb').innerText()).includes('más adelante'), 'pieza de un paso futuro → error de orden');
  await tocar(page, '[data-pieza="cinta_aislante"]'); await tocar(page, '[data-zona="pared_alta"]');
  ok((await page.locator('#fb').innerText()).includes('cinta aislante'), 'distractor en paso normal → explica por qué no');
  await tocar(page, '[data-pieza="aislador"]'); await tocar(page, '[data-zona="poste"]');
  ok((await page.locator('#fb').innerText()).includes('distribuidora'), 'tocar el poste → aviso de la distribuidora');
  await tocar(page, '[data-zona="pared_alta"]');
  await page.screenshot({ path: path.join(CAPTURAS, '04-juego-aerea.png') });

  console.log('4. Examen con errores: puntaje y lista');
  await page.goto(URL);
  await tocar(page, '[data-accion="examen-aerea"]');
  await tocar(page, '[data-pieza="detector"]'); await tocar(page, '[data-zona="pared_media"]'); // crítico −20
  await tocar(page, '[data-pieza="detector"]'); await tocar(page, '[data-zona="pared_media"]'); // repetido: no resta
  ok((await page.locator('#fb').innerText()).includes('seguridad'), 'examen: aviso de seguridad sin revelar la respuesta');
  const pasos = await page.evaluate(() => DATOS.acometidas.aerea.pasos.map(p => [p.pieza, p.zona]));
  for (const [pieza, zona] of pasos) { await tocar(page, `[data-pieza="${pieza}"]`); await tocar(page, `[data-zona="${zona}"]`); }
  ok(await page.locator('#nota').innerText() === '80', 'un error crítico (contado una vez) → 80');
  ok(await page.locator('.lista-errores li').count() === 1, 'la lista de repaso tiene 1 error');
  ok((await page.content()).includes('error(es) de seguridad'), 'muestra aviso rojo de seguridad');
  await page.screenshot({ path: path.join(CAPTURAS, '05-resultado-con-error.png'), fullPage: true });

  console.log('5. Soterrada en práctica (pantalla)');
  await page.goto(URL);
  await tocar(page, '[data-accion="practica-soterrada"]');
  const pasosS = await page.evaluate(() => DATOS.acometidas.soterrada.pasos.map(p => [p.pieza, p.zona]));
  for (const [pieza, zona] of pasosS.slice(0, 12)) { await tocar(page, `[data-pieza="${pieza}"]`); await tocar(page, `[data-zona="${zona}"]`); }
  await revisarDiseno(page, 'Soterrada');
  await page.screenshot({ path: path.join(CAPTURAS, '06-juego-soterrada.png') });

  console.log('6. Identificar, repaso y videos');
  await page.goto(URL);
  await page.getByText('Identificar piezas').click();
  await page.locator('[data-opcion]').first().click();
  ok(await page.locator('.fb').count() === 1, 'identificar: muestra explicación');
  await revisarDiseno(page, 'Identificar');
  await page.screenshot({ path: path.join(CAPTURAS, '07-identificar.png') });
  await page.goto(URL);
  await page.getByText('Repaso rápido').click();
  await revisarDiseno(page, 'Repaso');
  await page.screenshot({ path: path.join(CAPTURAS, '08-repaso.png'), fullPage: true });
  await page.goto(URL);
  await page.getByText('Videos de apoyo').click();
  ok(await page.locator('a.boton').count() >= 1, 'videos: hay enlaces');

  console.log('7. Validador de datos');
  const v = await page.evaluate(() => {
    const copia = JSON.parse(JSON.stringify(DATOS));
    copia.acometidas.aerea.pasos[0].pieza = 'no_existe';
    copia.acometidas.soterrada.pasos[1].zona = 'tampoco';
    return validarDatos(copia);
  });
  ok(v.length === 2, 'detecta pieza y zona inexistentes: ' + JSON.stringify(v));
  ok((await page.evaluate(() => validarDatos())).length === 0, 'los datos actuales son válidos');

  console.log('8. Sin internet');
  ok(externas.length === 0, 'no pide nada a internet al usarla ' + JSON.stringify(externas));
  ok(erroresJs.length === 0, 'sin errores de JavaScript ' + JSON.stringify(erroresJs));

  await browser.close();
  console.log(fallos ? `\n${fallos} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
  process.exit(fallos ? 1 : 0);
})();
