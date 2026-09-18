/**
 * pregunta.js — la invitación.
 *
 * Como escala.js, NO importa datos.js para pedir la cartelera: entrar acá
 * no dispara ningún fetch y la invitación sigue en pie aunque los JSON
 * estén caídos o la cartelera vencida. De datos.js solo viene `hoyLima()`,
 * que lee el reloj y nada más.
 *
 * El texto no nombra la obra ni el teatro. Lo único que dice es el jueves,
 * la hora y que la noche sigue después; el resto lo tiene que intuir ella.
 */

import { tallosDelRamo, RAMO_DESDE } from './logica.js';
import { hoyLima } from './datos.js';

const CLAVE_RESPUESTA = 'teatro.pregunta.respondida';

// El punto del que sale el ramo. No hay viewBox fijo: se calcula del
// contenido, porque el ramo se ensancha al crecer y un marco fijo le
// dejaría un margen distinto cada día.
const BASE = { x: 200, y: 288 };
// Cuánto sobresale el dibujo de una flor respecto de su centro: los pétalos
// más largos llegan a |cy| + ry ≈ 10.7 en los dos tipos.
const RADIO_FLOR = 11;

/**
 * Ruido determinista en [0,1): mismo índice, mismo valor, siempre.
 *
 * Cada visita tiene que ver EL MISMO ramo, así que nada de Math.random().
 * Es la misma razón por la que los IDs de la cartelera salen del contenido
 * y no de un contador.
 */
function ruido(i, sal = 0) {
  const x = Math.sin((i + 1) * 12.9898 + sal * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Coloca N tallos en abanico sobre el punto base.
 *
 * Se ordenan de atrás hacia adelante (los más altos primero) para que al
 * pintarlos en orden los de adelante tapen a los de atrás, que es como se
 * apila un ramo de verdad.
 */
function componerRamo(n) {
  const tallos = [];
  const ABANICO = 1.02;              // radianes hacia cada lado
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    // Reparto en abanico, más dos correcciones: `sesgo` desordena apenas
    // el ángulo para que no se vea un peine, y el centro queda más alto
    // que los bordes, como cualquier ramo sostenido con una mano.
    const sesgo = (ruido(i, 1) - 0.5) * 0.16;
    const ang = (t * 2 - 1) * ABANICO + sesgo;
    const altura = 1 - Math.abs(t * 2 - 1) * 0.34;
    const largo = (118 + ruido(i, 2) * 46) * altura;

    tallos.push({
      x: BASE.x + Math.sin(ang) * largo * 0.96,
      y: BASE.y - Math.cos(ang) * largo,
      // El tallo se curva hacia afuera: el control de la curva cuadrática
      // se corre en contra del ángulo para que no sea una línea recta.
      cx: BASE.x + Math.sin(ang) * largo * 0.34 - Math.sin(ang) * 16,
      cy: BASE.y - Math.cos(ang) * largo * 0.55,
      giro: (ang * 180) / Math.PI + (ruido(i, 3) - 0.5) * 22,
      escala: 0.82 + ruido(i, 4) * 0.4,
      // Rosas y claveles alternados, con el ruido rompiendo la alternancia
      // perfecta para que no se lea como un patrón.
      tipo: (i + Math.floor(ruido(i, 5) * 2)) % 2 === 0 ? 'rosa' : 'clavel',
      tono: 1 + Math.floor(ruido(i, 6) * 4),
      hoja: i % 3 === 0,
    });
  }
  return tallos.sort((a, b) => a.y - b.y);
}

/**
 * Las dos flores viven en <defs> y cada tallo las instancia con <use>.
 * Con 29 tallos, repetir los pétalos sería multiplicar por 29 un dibujo
 * que es siempre el mismo; el color entra por `currentColor`, que sí
 * atraviesa el <use>.
 */
function defsFlores() {
  const petalos = (cantidad, rx, ry, cy, op, desfase = 0) =>
    Array.from({ length: cantidad }, (_, k) => {
      const giro = desfase + (k * 360) / cantidad;
      return `<ellipse rx="${rx}" ry="${ry}" cy="${cy}" opacity="${op}" transform="rotate(${giro})"/>`;
    }).join('');

  return `
    <defs>
      <g id="flor-rosa" fill="currentColor">
        ${petalos(5, 4.7, 5.6, -5.1, 0.55)}
        ${petalos(5, 3.6, 4.2, -3.6, 0.72, 36)}
        ${petalos(3, 2.6, 3, -2.1, 0.9, 18)}
        <circle r="1.7"/>
      </g>
      <g id="flor-clavel" fill="currentColor">
        ${petalos(12, 1.9, 6.4, -4.2, 0.5)}
        ${petalos(10, 1.7, 4.6, -3, 0.7, 18)}
        ${petalos(7, 1.4, 2.9, -1.8, 0.92, 26)}
        <circle r="1.2"/>
      </g>
      <g id="hoja-tallo">
        <ellipse rx="3.1" ry="7.4" transform="rotate(-28)"/>
      </g>
    </defs>`;
}

function dibujarRamo(n) {
  const tallos = componerRamo(n);
  const medio = (a, b) => ((a + b) / 2).toFixed(1);

  const svgTallos = tallos.map((f, orden) => `
    <g class="tallo" style="--i:${orden}">
      <path class="tallo-vara" d="M${BASE.x} ${BASE.y} Q${f.cx.toFixed(1)} ${f.cy.toFixed(1)} ${f.x.toFixed(1)} ${f.y.toFixed(1)}"/>
      ${f.hoja ? `<use class="tallo-hoja" href="#hoja-tallo" transform="translate(${medio(BASE.x, f.x)} ${medio(BASE.y, f.y)}) scale(${f.x < BASE.x ? -1 : 1} 1)"/>` : ''}
      <use class="flor flor-t${f.tono}" href="#flor-${f.tipo}"
        transform="translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.giro.toFixed(1)}) scale(${f.escala.toFixed(2)})"/>
    </g>`).join('');

  // Marco ajustado al dibujo real, con aire parejo alrededor.
  const AIRE = 8;
  let x1 = BASE.x, x2 = BASE.x, y1 = BASE.y, y2 = BASE.y + 26;  // +26: las cintas
  for (const f of tallos) {
    const r = RADIO_FLOR * f.escala;
    x1 = Math.min(x1, f.x - r); x2 = Math.max(x2, f.x + r);
    y1 = Math.min(y1, f.y - r); y2 = Math.max(y2, f.y + r);
  }
  x1 -= AIRE; y1 -= AIRE; x2 += AIRE; y2 += AIRE;

  // El origen de la animación viaja como custom property en vez de estar
  // copiado en el CSS: con el viewBox calculado, un transform-origin fijo
  // apuntaría a otro sitio cada día y las flores brotarían del aire.
  const origen = `--origen-x:${(BASE.x - x1).toFixed(1)}px;--origen-y:${(BASE.y - y1).toFixed(1)}px`;

  // El aria-label NO lleva la cifra a propósito: el número de flores es la
  // única pista que lleva a la fecha en que empezamos, y un lector de
  // pantalla que la cante la regala antes de que ella pueda contarlas.
  return `
    <div class="ramo">
      <svg viewBox="${x1.toFixed(1)} ${y1.toFixed(1)} ${(x2 - x1).toFixed(1)} ${(y2 - y1).toFixed(1)}"
        style="${origen}" role="img" aria-label="Un ramo de rosas y claveles">
        ${defsFlores()}
        ${svgTallos}
        <g class="ramo-lazo">
          <path class="ramo-cinta" d="M197 289 q-9 11 -6 23 q-7 -8 -8 -17 z"/>
          <path class="ramo-cinta" d="M203 289 q9 11 6 23 q7 -8 8 -17 z"/>
          <rect x="187" y="280" width="26" height="9" rx="4.5"/>
        </g>
      </svg>
    </div>`;
}

// Ninguno de los dos botones dice que no, y ese es el chiste.
const BOTONES = `
  <p class="pregunta-pide" id="pregunta-pide">¿Vienes?</p>
  <div class="pregunta-botones" role="group" aria-labelledby="pregunta-pide">
    <button class="btn primario" type="button" data-acepta>Sí</button>
    <button class="btn" type="button" data-acepta>Obviamente</button>
  </div>`;

const ACEPTADA = `
  <div class="pregunta-dicho">
    <p>Entonces está dicho.<br>Jueves, 7:15. Yo toco el timbre.</p>
    <p>Hay una flor por cada día.<br>Cuéntalas si quieres saber desde cuándo.</p>
    <p class="pregunta-firma">— Para Mi Princesa</p>
  </div>`;

function yaAcepto() {
  try {
    return localStorage.getItem(CLAVE_RESPUESTA) === 'si';
  } catch {
    return false;   // modo privado no puede romper la invitación
  }
}

function guardarRespuesta() {
  try {
    localStorage.setItem(CLAVE_RESPUESTA, 'si');
  } catch { /* si no se puede guardar, el sí igual vale */ }
}

export function pintarPregunta(app, hoy = hoyLima()) {
  const aceptada = yaAcepto();
  app.className = `app pregunta${aceptada ? ' aceptada' : ''}`;
  app.innerHTML = `
    <article class="pregunta-articulo" aria-labelledby="pregunta-titulo">
      <header class="pregunta-cabecera">
        <p class="pregunta-kicker">Comunicación privada · no publicada</p>
        <h2 id="pregunta-titulo" tabindex="-1">¿Vienes conmigo<br>el jueves?</h2>
      </header>

      ${dibujarRamo(tallosDelRamo(RAMO_DESDE, hoy))}

      <div class="pregunta-cuerpo">
        <p>Este jueves paso por ti a las 7:15.<br>Despeja la noche entera.</p>
        <p>No te voy a decir a dónde vamos.<br>Solo que hay que llegar a una hora exacta<br>y que después la noche sigue.</p>
        <p class="pregunta-alusion">No es el día.<br>Faltan dos para el día.<br>Pero el jueves me quedaba mejor.</p>
      </div>

      <div class="pregunta-respuesta" aria-live="polite">${aceptada ? ACEPTADA : BOTONES}</div>
    </article>`;

  if (aceptada) return;

  // Delegación, como los tres listeners de vista.js: el contenedor
  // sobrevive al reemplazo de los botones por el mensaje.
  const respuesta = app.querySelector('.pregunta-respuesta');
  respuesta.addEventListener('click', (e) => {
    if (!e.target.closest('[data-acepta]')) return;
    guardarRespuesta();
    app.classList.add('aceptada');
    respuesta.innerHTML = ACEPTADA;
  });
}
