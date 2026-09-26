/**
 * primer-mes.js — el recuerdo del 26 de septiembre de 2026.
 *
 * Como la invitación, NO pide la cartelera: entrar acá no dispara ningún
 * fetch. De datos.js solo viene `ahoraLima()`, que lee el reloj.
 *
 * El centro es el mapa sorpresa de aquel día. Los lugares NO se muestran de
 * entrada: cada "Descubrir" se enciende cuando llega su hora
 * (`momentoAbierto()` en logica.js), y solo si hay un lugar escrito. Un
 * momento con `lugar: null` no tiene botón, aunque ya haya pasado: revelar
 * un lugar inventado sería peor que no revelar nada.
 *
 * La ruta se MIDE, no se declara: pasa por el centro de cada flor tal como
 * quedó en pantalla, así sirve igual para la columna del teléfono que para
 * el zigzag de escritorio y para una polaroid recién abierta.
 */

import { momentoAbierto } from './logica.js';
import { ahoraLima } from './datos.js';

/* ── el contenido: todo lo editable vive acá ─────────────────
   Para completar después:
   - `lugar` de las 4:00 y las 5:00 (nombre y nota; `foto` es opcional).
   - `nota` de cada foto: la frase manuscrita bajo la polaroid.
   - `texto` de cada tarjeta de "Pequeñas cosas".
   `null` significa "todavía no escrito" y la pantalla lo dice así; nunca se
   rellena con algo plausible. */
const RECUERDO = {
  fecha: '2026-09-26',
  momentos: [
    { hora: '16:00', etiqueta: '4:00 p. m.', frase: 'Nos vemos aquí',
      flor: 'rosa', escena: 'auto', lugar: null },
    { hora: '17:00', etiqueta: '5:00 p. m.', frase: 'Una pausa para recargar',
      flor: 'blanca', escena: 'pausa', lugar: null },
    { hora: '18:00', etiqueta: '6:00 p. m.', frase: 'A explorar juntos',
      flor: 'amarilla', escena: 'naturaleza',
      lugar: { nombre: 'Parque de las Leyendas', nota: 'Experiencia nocturna', foto: null } },
    { hora: '21:30', etiqueta: '9:30 p. m.', frase: 'Drinks y buena compañía',
      flor: 'violeta', escena: 'noche',
      lugar: { nombre: 'La Mariposario', nota: 'Drinks', foto: null } },
  ],
  // Las fotos reales van en assets/primer-mes/. Si un archivo no existe,
  // su marco queda vacío con la leyenda "por agregar": no hay que tocar
  // código para sumarlas, solo copiarlas con estos nombres.
  fotos: [
    { archivo: 'assets/primer-mes/01.jpg', nota: null },
    { archivo: 'assets/primer-mes/02.jpg', nota: null },
    { archivo: 'assets/primer-mes/03.jpg', nota: null },
    { archivo: 'assets/primer-mes/04.jpg', nota: null },
    { archivo: 'assets/primer-mes/05.jpg', nota: null },
  ],
  pequenas: [
    { icono: 'flor', titulo: 'El detalle', texto: null },
    { icono: 'mariposa', titulo: 'El momento favorito', texto: null },
    { icono: 'copa', titulo: 'Nuestro drink', texto: null },
    { icono: 'camara', titulo: 'Nuestra foto favorita', texto: null },
    { icono: 'globo', titulo: 'Algo que dijiste', texto: null },
    { icono: 'corazon', titulo: 'Lo que sentí ese día', texto: null },
  ],
};

// Giros de las polaroids y las tarjetas. Fijos por índice y no al azar, por
// la misma regla del ramo: cada visita tiene que ver el mismo álbum.
const GIROS = [-2.4, 1.8, -1.2, 2.6, -1.9, 1.3];

// Cada cuánto se vuelve a mirar el reloj con la página abierta, para que
// un "Descubrir" se encienda solo al llegar su hora.
const PULSO_MS = 30000;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CORAZON = '<span class="corazon" aria-hidden="true"></span>';

/* ── dibujos ─────────────────────────────────────────────────
   Todo es SVG propio: el pedido traía emoji, y la regla 3 de DESIGN.md los
   prohíbe porque renderizan distinto en cada celular. */

// Pétalos en elipses rotadas, la misma técnica de defsFlores() en pregunta.js.
function petalos(cantidad, rx, ry, cy, clase, desfase = 0) {
  return Array.from({ length: cantidad }, (_, k) => {
    const giro = desfase + (k * 360) / cantidad;
    return `<ellipse class="${clase}" rx="${rx}" ry="${ry}" cy="${cy}" transform="rotate(${giro})"/>`;
  }).join('');
}

function florSvg(tipo) {
  return `
    <svg class="flor-marca flor-${tipo}" viewBox="-40 -40 80 80" aria-hidden="true">
      <ellipse class="flor-hoja" rx="7" ry="17" transform="rotate(-128) translate(0 -24)"/>
      <ellipse class="flor-hoja" rx="6" ry="14" transform="rotate(118) translate(0 -24)"/>
      ${petalos(5, 11, 17, -15, 'flor-petalo')}
      ${petalos(5, 7, 11, -9, 'flor-petalo-dentro', 36)}
      <circle class="flor-centro" r="5.5"/>
    </svg>`;
}

const ESCENAS = {
  auto: `
    <path d="M6 18h8M3 23h9"/>
    <path d="M18 33v-7l7-9h24l9 9h6q3 0 3 3v4z"/>
    <path d="M28 18v8M40 18v8M26 26h22"/>
    <circle class="relleno-papel" cx="28" cy="34" r="4.5"/><circle class="relleno-papel" cx="56" cy="34" r="4.5"/>
    <path class="trazo-acento" d="M70 9c-1.6-2.8-5.4-1-3.4 1.8L70 14l3.4-3.2c2-2.8-1.8-4.6-3.4-1.8z"/>`,
  pausa: `
    <path class="relleno-hoja" d="M16 20h16l-2.2 20H18.2z"/>
    <path d="M14 13h20l-3 29H17z"/>
    <path d="M27 13l6-10"/>
    <ellipse cx="57" cy="38" rx="17" ry="4.5"/>
    <path class="relleno-amarillo" d="M49 34v-7l8-3 8 3v7z"/>`,
  naturaleza: `
    <path class="relleno-amarillo" d="M30 6a12 12 0 1 0 12 17 10 10 0 0 1-12-17z"/>
    <path d="M56 9l1.2 3 3 1.2-3 1.2L56 18l-1.2-3.6-3-1.2 3-1.2zM68 22l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>
    <path class="relleno-hoja" d="M10 44c2-12 10-18 22-18-2 12-10 18-22 18z"/>
    <path class="relleno-hoja" d="M44 44c1-9 7-14 16-15-1 9-7 14-16 15z"/>
    <path d="M10 44l14-10M44 44l10-8"/>`,
  noche: `
    <path d="M4 8q18 10 36 2t36 2"/>
    <circle class="luz" cx="13" cy="12" r="2"/><circle class="luz" cx="27" cy="14" r="2"/>
    <circle class="luz" cx="45" cy="10" r="2"/><circle class="luz" cx="61" cy="11" r="2"/>
    <path d="M16 22h18l-9 11zM25 33v9M20 42h10"/>
    <path d="M42 24h18l-9 11zM51 35v7M46 42h10"/>
    <path class="relleno-violeta" d="M70 26c-5-5-10-1-6 3 4 1 6-1 6-3zm0 0c5-5 10-1 6 3-4 1-6-1-6-3z"/>`,
};

function escenaSvg(escena) {
  return `<svg class="escena" viewBox="0 0 80 48" aria-hidden="true">${ESCENAS[escena] ?? ''}</svg>`;
}

const ICONOS = {
  flor: `<circle cx="16" cy="9" r="5"/><circle cx="23" cy="14" r="5"/><circle cx="20.5" cy="22" r="5"/>
    <circle cx="11.5" cy="22" r="5"/><circle cx="9" cy="14" r="5"/><circle class="relleno-amarillo" cx="16" cy="16" r="3.2"/>`,
  mariposa: `<path class="relleno-violeta" d="M16 16C11 5 3 6 4 12c1 5 7 5 12 4zm0 0c5-11 13-10 12-4-1 5-7 5-12 4z"/>
    <path class="relleno-violeta" d="M16 16c-5 2-9 6-7 10 2 3 6 0 7-10zm0 0c5 2 9 6 7 10-2 3-6 0-7-10z"/>
    <path d="M16 11v15M14 7l2 4 2-4"/>`,
  copa: `<path d="M6 6h20L16 18zM16 18v9M10 27h12"/><path class="relleno-rosa" d="M10 10h12l-6 7z"/><path d="M22 6l4-4"/>`,
  camara: `<rect x="3" y="10" width="26" height="17" rx="3"/><path d="M11 10l2.5-4h5l2.5 4"/>
    <circle cx="16" cy="18.5" r="5"/><circle class="relleno-rosa" cx="16" cy="18.5" r="2"/>`,
  globo: `<path d="M5 7h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H14l-6 5v-5H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/>
    <path d="M9 13h14M9 17h9"/>`,
  corazon: `<path class="relleno-rosa" d="M16 27C6 20 3 14 6 9.5 9 5 14 6.5 16 10c2-3.5 7-5 10-.5 3 4.5 0 10.5-10 17.5z"/>`,
};

// La mariposa del cierre: alas en dos grupos para que puedan batir.
const MARIPOSA = `
  <svg class="mariposa" viewBox="-20 -16 40 32" aria-hidden="true">
    <g class="ala ala-izq">
      <path d="M-1 0C-6-12-17-12-16-4c1 5 8 6 15 4z"/>
      <path d="M-1 1c-6 2-12 7-9 11 3 3 8-1 9-11z"/>
    </g>
    <g class="ala ala-der">
      <path d="M1 0C6-12 17-12 16-4c-1 5-8 6-15 4z"/>
      <path d="M1 1c6 2 12 7 9 11-3 3-8-1-9-11z"/>
    </g>
    <path class="mariposa-cuerpo" d="M0-7v16"/>
  </svg>`;

/* ── las piezas ──────────────────────────────────────────── */

function accionMomento(m, i, abierta) {
  if (!abierta) {
    return `<p class="parada-espera">Se descubre a las ${esc(m.etiqueta)}</p>`;
  }
  if (!m.lugar) return '';
  return `
    <button class="btn parada-descubrir" type="button" data-descubrir="${i}"
      aria-expanded="false" aria-controls="revelado-${i}">Descubrir</button>`;
}

function reveladoMomento(m, i) {
  if (!m.lugar) return '';
  const imagen = m.lugar.foto
    ? `<img src="${esc(m.lugar.foto)}" alt="" loading="lazy" decoding="async">`
    : florSvg(m.flor);
  return `
    <figure class="revelado polaroid" id="revelado-${i}" hidden>
      <div class="revelado-imagen flor-fondo-${esc(m.flor)}">${imagen}</div>
      <figcaption>
        <span class="revelado-nombre">${esc(m.lugar.nombre)}</span>
        ${m.lugar.nota ? `<span class="revelado-nota">${esc(m.lugar.nota)}</span>` : ''}
      </figcaption>
    </figure>`;
}

function paradas(ahora) {
  return RECUERDO.momentos.map((m, i) => `
    <li class="parada ${i % 2 ? 'lado-der' : 'lado-izq'} aparece" data-parada="${i}">
      <div class="parada-marca" data-marca>${florSvg(m.flor)}</div>
      <div class="parada-texto">
        ${escenaSvg(m.escena)}
        <p class="parada-hora">${esc(m.etiqueta)}</p>
        <p class="parada-frase">${esc(m.frase)} ${CORAZON}</p>
        <div class="parada-accion" data-accion="${i}">
          ${accionMomento(m, i, momentoAbierto(RECUERDO.fecha, m.hora, ahora))}
        </div>
        ${reveladoMomento(m, i)}
      </div>
    </li>`).join('');
}

function galeria() {
  return RECUERDO.fotos.map((f, i) => {
    const n = String(i + 1).padStart(2, '0');
    return `
      <figure class="foto polaroid aparece" style="--giro:${GIROS[i % GIROS.length]}deg">
        <div class="foto-marco">
          <span class="foto-vacia">Foto ${n}<br>por agregar</span>
          <img src="${esc(f.archivo)}" width="800" height="1000" loading="lazy" decoding="async"
            alt="${f.nota ? esc(f.nota) : `Foto ${i + 1} del 26 de septiembre`}">
        </div>
        ${f.nota ? `<figcaption class="foto-nota">${esc(f.nota)}</figcaption>` : ''}
      </figure>`;
  }).join('');
}

function tarjetas() {
  return RECUERDO.pequenas.map((t, i) => `
    <li class="recuerdo-tarjeta aparece" style="--giro:${(GIROS[(i + 2) % GIROS.length] / 2).toFixed(2)}deg">
      <svg class="recuerdo-icono" viewBox="0 0 32 32" aria-hidden="true">${ICONOS[t.icono] ?? ''}</svg>
      <h4>${esc(t.titulo)}</h4>
      ${t.texto
        ? `<p class="recuerdo-texto">${esc(t.texto)}</p>`
        : '<p class="recuerdo-texto pendiente">Por escribir</p>'}
    </li>`).join('');
}

/* ── lo vivo: ruta, apariciones y reloj ──────────────────────
   Todo lo que queda encendido se apaga en desmontar(). El listener de
   scroll escucha en captura sobre document porque en móvil scrollea la
   ventana y en escritorio scrollea .app; así uno solo sirve a los dos. */

let vivo = null;

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function trazarRuta(papel) {
  const svg = papel.querySelector('.ruta');
  const marcas = [...papel.querySelectorAll('[data-marca]')];
  if (!svg || marcas.length < 2) return;
  const caja = papel.getBoundingClientRect();
  const puntos = marcas.map((m) => {
    const r = m.getBoundingClientRect();
    const fila = m.closest('.parada').getBoundingClientRect();
    return {
      x: r.left - caja.left + r.width / 2,
      y: r.top - caja.top + r.height / 2,
      arriba: fila.top - caja.top,
      abajo: fila.bottom - caja.top,
    };
  });
  // Cada tramo baja recto por la columna de su flor, que debajo del dibujo
  // está vacía, y cruza de lado SOLO en el hueco entre dos paradas. Una S
  // libre de flor a flor pasaba por encima del texto y lo tachaba.
  const f = (n) => n.toFixed(1);
  let d = `M${f(puntos[0].x)} ${f(puntos[0].y)}`;
  for (let k = 1; k < puntos.length; k++) {
    const a = puntos[k - 1];
    const b = puntos[k];
    const cruce = (a.abajo + b.arriba) / 2;
    const bajada = Math.max(a.y, cruce - 26);
    d += ` L${f(a.x)} ${f(bajada)}`
      + ` C${f(a.x)} ${f(cruce + 8)} ${f(b.x)} ${f(cruce - 8)} ${f(b.x)} ${f(Math.min(b.y, cruce + 26))}`
      + ` L${f(b.x)} ${f(b.y)}`;
  }
  svg.setAttribute('viewBox', `0 0 ${caja.width.toFixed(1)} ${caja.height.toFixed(1)}`);
  for (const p of svg.querySelectorAll('path')) p.setAttribute('d', d);
  const mascara = svg.querySelector('.ruta-mascara');
  vivo.largo = mascara.getTotalLength();
  vivo.fin = puntos[puntos.length - 1].y;
  mascara.style.strokeDasharray = `${vivo.largo} ${vivo.largo}`;
  avanzarRuta(papel);
}

// La línea llega a la última flor cuando esa flor pasa por el 75% del alto
// de la pantalla. Se mide contra la flor y no contra el alto del papel: con
// el papel, la última flor ya estaba a la vista y la línea todavía no. Con el movimiento reducido la ruta está entera desde el
// principio: una línea que no se dibuja es aceptable, una que falta no.
function avanzarRuta(papel) {
  const mascara = papel.querySelector('.ruta-mascara');
  if (!mascara || !vivo.largo) return;
  let avance = 1;
  if (!sinMovimiento()) {
    const r = papel.getBoundingClientRect();
    avance = Math.min(1, Math.max(0, (window.innerHeight * 0.75 - r.top) / vivo.fin));
  }
  mascara.style.strokeDashoffset = (vivo.largo * (1 - avance)).toFixed(1);
}

function encenderApariciones(app) {
  const piezas = app.querySelectorAll('.aparece, .mes-cierre');
  if (!('IntersectionObserver' in window)) {
    piezas.forEach((p) => p.classList.add('visible'));
    return null;
  }
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  piezas.forEach((p) => io.observe(p));
  return io;
}

// Solo abre, nunca cierra: un botón que se encendió no se apaga porque el
// reloj del teléfono retroceda. Y no toca los momentos ya abiertos, o
// cerraría una polaroid que ella está mirando.
function revisarReloj(app, ahora) {
  RECUERDO.momentos.forEach((m, i) => {
    const caja = app.querySelector(`[data-accion="${i}"]`);
    if (!caja || !caja.querySelector('.parada-espera')) return;
    if (momentoAbierto(RECUERDO.fecha, m.hora, ahora)) caja.innerHTML = accionMomento(m, i, true);
  });
}

function alternarRevelado(boton) {
  const figura = document.getElementById(boton.getAttribute('aria-controls'));
  if (!figura) return;
  const abrir = boton.getAttribute('aria-expanded') !== 'true';
  boton.setAttribute('aria-expanded', String(abrir));
  boton.textContent = abrir ? 'Volver a esconder' : 'Descubrir';
  figura.hidden = !abrir;
  // El ResizeObserver del papel vuelve a trazar la ruta: la polaroid
  // recién abierta empuja las flores de abajo.
}

/**
 * `ahora` se inyecta para poder probar el desbloqueo sin tocar el reloj:
 * con un valor fijo la pantalla se congela en ese instante; sin él, lee la
 * hora de Lima y la vuelve a mirar cada medio minuto.
 */
export function pintarPrimerMes(app, ahora) {
  desmontar();
  const reloj = ahora ? () => ahora : ahoraLima;

  app.className = 'app primer-mes';
  app.innerHTML = `
    <article class="mes-articulo" aria-labelledby="primer-mes-titulo">
      <header class="mes-hero">
        <span class="mes-petalo p1" aria-hidden="true"></span>
        <span class="mes-petalo p2" aria-hidden="true"></span>
        <span class="mes-petalo p3" aria-hidden="true"></span>
        <span class="mes-petalo p4" aria-hidden="true"></span>
        <p class="mes-kicker"><time datetime="${RECUERDO.fecha}">26.09.2026</time></p>
        <h2 id="primer-mes-titulo" tabindex="-1">Nuestro primer mes ${CORAZON}</h2>
        <p class="mes-sub">Una pequeña aventura para celebrar<br>nuestro primer mes juntos.</p>
        <svg class="mes-trazo" viewBox="0 0 220 24" aria-hidden="true">
          <path pathLength="1" d="M4 14c26-10 44 8 70 0s40-12 66-2 44 8 76-4"/>
        </svg>
      </header>

      <section class="mes-seccion" aria-labelledby="mes-mapa-titulo">
        <h3 id="mes-mapa-titulo" class="mes-titulo-seccion">El mapa de aquel día</h3>
        <p class="mes-bajada">Cuatro horas, cuatro flores. Cada lugar se descubre a su hora.</p>
        <div class="mapa-papel">
          <svg class="ruta" aria-hidden="true" preserveAspectRatio="none">
            <defs>
              <mask id="ruta-dibujada" maskUnits="userSpaceOnUse">
                <path class="ruta-mascara"/>
              </mask>
            </defs>
            <path class="ruta-linea" mask="url(#ruta-dibujada)"/>
          </svg>
          <ol class="paradas">${paradas(reloj())}</ol>
        </div>
      </section>

      <section class="mes-seccion" aria-labelledby="mes-fotos-titulo">
        <h3 id="mes-fotos-titulo" class="mes-titulo-seccion">Así terminó viéndose<br>nuestra pequeña aventura</h3>
        <div class="galeria">${galeria()}</div>
      </section>

      <section class="mes-seccion" aria-labelledby="mes-cosas-titulo">
        <h3 id="mes-cosas-titulo" class="mes-titulo-seccion">Pequeñas cosas<br>que quiero recordar</h3>
        <ul class="recuerdos">${tarjetas()}</ul>
      </section>

      <section class="mes-cierre" aria-labelledby="mes-cierre-titulo">
        ${MARIPOSA}
        <h3 id="mes-cierre-titulo">Feliz primer mes,<br>mi princesa ${CORAZON}</h3>
        <p>Este fue el mapa de aquel día.<br>Ahora ya es uno de nuestros recuerdos.</p>
      </section>
    </article>`;

  vivo = { largo: 0, fin: 1, cuadro: 0, io: null, ro: null, pulso: 0, alScroll: null, alCambiar: null };

  // Un marco sin foto se queda con su leyenda "por agregar" en vez del
  // ícono de imagen rota. El error de una <img> recién insertada llega en
  // otra tarea, así que el listener alcanza a engancharse; `complete` cubre
  // el caso de un fallo ya resuelto desde la caché.
  for (const img of app.querySelectorAll('.foto img, .revelado img')) {
    const quitar = () => img.remove();
    if (img.complete && !img.naturalWidth) quitar();
    else img.addEventListener('error', quitar, { once: true });
  }

  app.querySelector('.paradas').addEventListener('click', (e) => {
    const boton = e.target.closest('[data-descubrir]');
    if (boton) alternarRevelado(boton);
  });

  const papel = app.querySelector('.mapa-papel');
  const programar = (fn) => {
    if (vivo.cuadro) return;
    vivo.cuadro = requestAnimationFrame(() => { vivo.cuadro = 0; fn(); });
  };
  vivo.alScroll = () => programar(() => avanzarRuta(papel));
  document.addEventListener('scroll', vivo.alScroll, { capture: true, passive: true });
  if ('ResizeObserver' in window) {
    vivo.ro = new ResizeObserver(() => programar(() => trazarRuta(papel)));
    vivo.ro.observe(papel);
  } else {
    trazarRuta(papel);
  }
  vivo.alCambiar = () => avanzarRuta(papel);
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', vivo.alCambiar);

  vivo.io = encenderApariciones(app);
  vivo.pulso = setInterval(() => revisarReloj(app, reloj()), PULSO_MS);
}

export function desmontar() {
  if (!vivo) return;
  document.removeEventListener('scroll', vivo.alScroll, { capture: true });
  window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener('change', vivo.alCambiar);
  cancelAnimationFrame(vivo.cuadro);
  vivo.io?.disconnect();
  vivo.ro?.disconnect();
  clearInterval(vivo.pulso);
  vivo = null;
}
