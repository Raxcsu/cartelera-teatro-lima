/**
 * app.js — navegación de primer nivel.
 *
 * Las tres vistas no comparten datos ni estados de error. El hash permite
 * entrar directamente a cada una y hace que atrás y adelante del navegador
 * sean navegación real, no una imitación con botones.
 */

import { arrancar as montarCartelera, desmontar as desmontarCartelera } from './vista.js';
import { pintarEscala } from './escala.js';
import { pintarPregunta } from './pregunta.js';

// Marca de que la invitación ya se abrió sola alguna vez.
const CLAVE_VISTA = 'teatro.pregunta.vista';

function pintarCartelera(nodo) {
  nodo.className = 'app';
  nodo.innerHTML = '<p class="cargando">Cargando cartelera…</p>';
  return montarCartelera(nodo);
}

/**
 * Cada ruta trae su título, su pintor y el encabezado al que salta el foco.
 *
 * Con dos vistas alcanzaba un if/else y un ternario; con tres, las dos
 * cadenas crecen cada vez que se agrega una pantalla y el despacho deja de
 * estar en un solo sitio. La tabla ya existía: solo le faltaban columnas.
 */
const RUTAS = {
  cartelera: {
    titulo: 'Theater with her — cartelera de Lima',
    hash: '#cartelera',
    foco: '.mes-nombre, .vacio h2',
    pintar: pintarCartelera,
  },
  'escala-astronomica': {
    titulo: 'Escala astronómica — Theater with her',
    hash: '#escala-astronomica',
    foco: '#escala-titulo',
    pintar: pintarEscala,
  },
  'una-pregunta': {
    titulo: 'Una pregunta — Theater with her',
    hash: '#una-pregunta',
    foco: '#pregunta-titulo',
    pintar: pintarPregunta,
  },
};

let app = null;
let primeraRuta = true;

function rutaDesdeHash(hash = window.location.hash) {
  const nombre = hash.replace(/^#/, '');
  return RUTAS[nombre] ? nombre : 'cartelera';
}

function actualizarPestanas(ruta) {
  for (const enlace of document.querySelectorAll('[data-ruta]')) {
    const activa = enlace.dataset.ruta === ruta;
    if (activa) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
}

function moverFoco(ruta) {
  const titulo = app.querySelector(RUTAS[ruta].foco);
  if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
  }
}

function pintarRuta() {
  const ruta = rutaDesdeHash();
  const destino = RUTAS[ruta];
  // La raíz y cualquier hash desconocido comparten una única URL canónica.
  // replaceState evita agregar una entrada falsa al historial y no dispara
  // otro hashchange, así que esta misma ejecución puede pintar la vista.
  if (window.location.hash !== destino.hash) {
    window.history.replaceState(null, '', destino.hash);
  }
  const debeMoverFoco = !primeraRuta;
  desmontarCartelera();
  actualizarPestanas(ruta);
  document.title = destino.titulo;

  // Solo la cartelera devuelve una promesa: sus JSON tardan y el encabezado
  // al que debe llegar el foco no existe hasta que esa promesa resuelva.
  // Las otras dos pintan sincrónicamente y no devuelven nada.
  const pintado = destino.pintar(app);
  if (debeMoverFoco) {
    if (pintado) pintado.then(() => { if (rutaDesdeHash() === ruta) moverFoco(ruta); });
    else moverFoco(ruta);
  }

  primeraRuta = false;
}

/**
 * La invitación se abre sola UNA sola vez, y solo al entrar limpio a la raíz.
 *
 * Un hash explícito gana siempre: un link a #cartelera tiene que llevar a la
 * cartelera aunque la marca todavía no exista. Y si localStorage no está
 * disponible no hay forma de cumplir el "una sola vez", así que no se abre:
 * mejor no secuestrar la raíz que secuestrarla en cada carga.
 */
function primeraVisitaALaPregunta() {
  if (window.location.hash) return false;
  try {
    if (localStorage.getItem(CLAVE_VISTA)) return false;
    localStorage.setItem(CLAVE_VISTA, '1');
  } catch {
    return false;
  }
  return true;
}

export function arrancarApp(nodoApp) {
  app = nodoApp;
  // Va antes de pintarRuta(): su replaceState normaliza la raíz a #cartelera
  // y después ya no se distingue una entrada limpia de un link directo.
  if (primeraVisitaALaPregunta()) {
    window.history.replaceState(null, '', RUTAS['una-pregunta'].hash);
  }
  window.addEventListener('hashchange', pintarRuta);
  pintarRuta();
}
