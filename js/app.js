/**
 * app.js — navegación de primer nivel.
 *
 * Las cuatro vistas no comparten datos ni estados de error. El hash permite
 * entrar directamente a cada una y hace que atrás y adelante del navegador
 * sean navegación real, no una imitación con botones.
 */

import { arrancar as montarCartelera, desmontar as desmontarCartelera } from './vista.js';
import { pintarEscala } from './escala.js';
import { pintarPregunta } from './pregunta.js';
import { pintarFlores, desmontar as desmontarFlores } from './flores.js';

// Marca de que la invitación ya se abrió sola alguna vez.
const CLAVE_VISTA = 'teatro.pregunta.vista';

function pintarCartelera(nodo) {
  nodo.className = 'app';
  nodo.innerHTML = '<p class="cargando">Cargando cartelera…</p>';
  return montarCartelera(nodo);
}

/**
 * Cada ruta trae su título, su pintor, el encabezado al que salta el foco y,
 * si deja algo encendido, cómo apagarlo.
 *
 * Con dos vistas alcanzaba un if/else y un ternario; con tres, las dos
 * cadenas crecen cada vez que se agrega una pantalla y el despacho deja de
 * estar en un solo sitio. La tabla ya existía: solo le faltaban columnas.
 *
 * `desmontar` es la última que llegó. Era una llamada suelta a la cartelera,
 * porque era la única vista con algo que liberar. Con el cielo de flores hay
 * dos, y una de ellas tiene un bucle de requestAnimationFrame: dejarlo vivo
 * es pintar para siempre una pantalla que ya no está. Las vistas que no
 * ensucian nada —la escala y la invitación— siguen sin la columna.
 */
const RUTAS = {
  cartelera: {
    titulo: 'Theater with her — cartelera de Lima',
    hash: '#cartelera',
    foco: '.mes-nombre, .vacio h2',
    pintar: pintarCartelera,
    desmontar: desmontarCartelera,
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
  'flores-amarillas': {
    titulo: 'Flores amarillas — Theater with her',
    hash: '#flores-amarillas',
    foco: '#flores-titulo',
    pintar: pintarFlores,
    desmontar: desmontarFlores,
  },
};

let app = null;
let primeraRuta = true;
let rutaActual = null;

function rutaDesdeHash(hash = window.location.hash) {
  const nombre = hash.replace(/^#/, '');
  return RUTAS[nombre] ? nombre : 'cartelera';
}

function actualizarPestanas(ruta) {
  for (const enlace of document.querySelectorAll('[data-ruta]')) {
    const activa = enlace.dataset.ruta === ruta;
    if (activa) {
      enlace.setAttribute('aria-current', 'page');
      acercarPestana(enlace);
    } else {
      enlace.removeAttribute('aria-current');
    }
  }
  marcarDesborde();
}

/**
 * Con cuatro destinos las etiquetas completas ya no entran en un teléfono
 * angosto y la barra scrollea. La pestaña activa tiene que estar a la vista,
 * y eso se hace con scrollLeft y NUNCA con scrollIntoView: sobre un hijo de
 * un contenedor con scroll horizontal, scrollIntoView desplaza además el
 * ancestro vertical. Es el mismo motivo por el que la tira de días no lo usa.
 */
function acercarPestana(enlace) {
  const barra = enlace.parentElement;
  if (!barra || barra.scrollWidth <= barra.clientWidth) return;
  const centro = (enlace.offsetLeft - barra.offsetLeft)
    - (barra.clientWidth - enlace.offsetWidth) / 2;
  barra.scrollLeft = Math.max(0, centro);
}

/**
 * Enciende un degradado en cada borde donde queden pestañas por recorrer.
 * Una barra que scrollea sin decirlo esconde destinos enteros, y este
 * proyecto ya carga con un afordance escondido (la barra de la escala).
 */
function marcarDesborde() {
  const barra = document.querySelector('.pestanas');
  if (!barra || !barra.parentElement) return;
  const resto = barra.scrollWidth - barra.clientWidth - barra.scrollLeft;
  barra.parentElement.classList.toggle('desborda-antes', barra.scrollLeft > 2);
  barra.parentElement.classList.toggle('desborda-despues', resto > 2);
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
  // La vista que se va apaga lo suyo antes de que la siguiente pinte.
  RUTAS[rutaActual]?.desmontar?.();
  rutaActual = ruta;
  actualizarPestanas(ruta);
  document.title = destino.titulo;

  // Solo la cartelera devuelve una promesa: sus JSON tardan y el encabezado
  // al que debe llegar el foco no existe hasta que esa promesa resuelva.
  // Las otras tres pintan sincrónicamente y no devuelven nada.
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
  // La barra de pestañas puede desbordar sin que cambie la ruta: al girar el
  // teléfono, o al recorrerla con el dedo.
  const barra = document.querySelector('.pestanas');
  if (barra) barra.addEventListener('scroll', marcarDesborde, { passive: true });
  window.addEventListener('resize', marcarDesborde, { passive: true });
  pintarRuta();
}
