/**
 * flores.js — el cielo de flores amarillas.
 *
 * No importa datos.js ni logica.js: no pide datos y no lee el reloj, así que
 * la vista sigue en pie aunque la cartelera esté caída o vencida, igual que
 * la escala astronómica.
 *
 * Es la única pantalla oscura del proyecto y es a propósito: son flores
 * encendidas, y sin cielo negro no se encienden.
 *
 * También es el primer módulo con un bucle de requestAnimationFrame, y por
 * eso el router aprendió a desmontar por ruta. Un canvas que sigue pintando
 * una vista que ya no está es el mismo defecto que cicloVista y cicloMapa
 * evitan dentro de la cartelera, solo que a nivel de app.js.
 */

/* ── los mensajes ───────────────────────────────────────────
   Cada flor ocupa un sitio estable y abre un texto propio. El contenido se
   queda junto a la composición porque no viene de red ni es dato de la
   cartelera: es la pieza escrita de esta vista personal. */
const MENSAJES = [
  {
    id: 'lugar-favorito',
    titulo: 'Mi lugar favorito',
    texto: 'Entre todos los planes, siempre termino eligiendo el que me lleva a ti.',
    x: -0.13, y: 0.17, z: 0.48, fase: 0.25, tipo: 2, etiqueta: 'abajo',
  },
  {
    id: 'tu-luz',
    titulo: 'Tu luz',
    texto: 'No necesito inventar otra estrella: tú ya cambias la forma en que miro el cielo.',
    x: 0.47, y: 0.28, z: 0.67, fase: 0.87, tipo: 0, etiqueta: 'izquierda',
  },
  {
    id: 'cada-dia',
    titulo: 'Cada día',
    texto: 'Hay una flor por cada día desde que empezamos. Ninguna alcanza a decir todo lo que has ido haciendo en mí.',
    x: 0.38, y: 0.65, z: 0.88, fase: 0.52, tipo: 1, etiqueta: 'izquierda',
  },
  {
    id: 'volveria-a-elegirte',
    titulo: 'Volvería a elegirte',
    texto: 'Puede cambiar el camino, la fecha o la historia. Yo volvería a encontrarte y a elegirte.',
    x: 0.27, y: 0.80, z: 0.52, fase: 0.42, tipo: 2, etiqueta: 'derecha',
  },
  {
    id: 'que-sea-especial',
    titulo: 'Que sea especial',
    texto: 'No siempre puedo consentirte, pero contigo siempre quiero que cada detalle valga la pena.',
    x: -0.36, y: 0.63, z: 1.04, fase: 0.18, tipo: 0, etiqueta: 'derecha',
  },
  {
    id: 'mi-princesa',
    titulo: 'Mi Princesa',
    texto: 'No hay escala suficiente para medirte. Solo sé que mi vida es más bonita cuando estás en ella.',
    x: -0.46, y: 0.31, z: 0.72, fase: 0.72, tipo: 1, etiqueta: 'derecha',
  },
];

const CARTA_FINAL = {
  titulo: 'Para Valeria',
  parrafos: [
    'Valeria: hice este pequeño universo para decirte algo sin esconderlo detrás de una cifra: te amo.',
    'Si el experimento pudiera repetirse infinitas veces, volvería a encontrarte, elegirte, conquistarte y enamorarme de ti.',
    'Puede cambiar el camino; el resultado seguirías siendo tú.',
  ],
  firma: '— Oscar',
};

/* ── la paleta del cielo ────────────────────────────────────
   Vive ACÁ y no en styles.css porque estos colores los pinta el canvas, no
   el CSS. El fondo de la caja también se escribe desde acá (ver pintarFlores):
   el mismo negro en dos archivos son dos sitios que hay que mover juntos, y
   ese es el problema que ya documenta PIN contra el width de .pin-teatro i.

   Los dorados son el contenido: la vista se llama flores amarillas. El
   violeta y el azul del original se fueron; el frío de la galaxia es ahora
   el rosa de la familia del acento, el mismo de las flores de la invitación.
   El verde de las hojas es PROPIO y NO --ok: ese es el verde del semáforo de
   confianza y DESIGN.md prohíbe reusarlo para decorar. */
const CIELO = {
  fondo: '#030208',
  centro: '#130c28',
  medio: '#090617',
  borde: '#020106',
  estrella: '#fff9ee',
  oro: '#ffd75d',
  oroClaro: '#fff08a',
  oroMedio: '#ffd638',
  oroHondo: '#e49d0a',
  rosa: '#c77e90',
  corazon: '#d98fa0',
  tallo: '#55741c',
  hoja: '#6e9527',
  semilla: '#e4a528',
};

const MAX_CHISPAS = 240;
const DURACION_ENTRADA = 1400;

// Estado de módulo. Todo lo que se enciende acá se apaga en desmontar().
let raiz = null, caja = null, lienzo = null, ctx = null, controles = null;
let leyenda = null, dialogo = null, dialogoTitulo = null, dialogoCuerpo = null;
let dialogoFirma = null, activadorCarta = null, fallback = null;
let ancho = 0, alto = 0, cx = 0, cy = 0, escala = 1;
let estrellas = [], polvo = [], corazon = [], flores = [], chispas = [];
let cuadro = null, cuadroMedida = null, inicioEntrada = 0;
let alRedimensionar = null, alCambiarVisibilidad = null, alCambiarMovimiento = null;
let alCerrarDialogo = null, consultaMovimiento = null;

const quieto = () => consultaMovimiento?.matches
  ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Acá sí va Math.random(), y no contradice al ramo de la invitación: el ramo
   tiene que ser idéntico en cada visita porque su número es un dato. Una
   estrella no es dato de nadie, y el cielo se vuelve a sembrar en cada medida
   de todos modos. Lo único fijo es dónde van las flores. */
const azar = (tope = 1, piso = 0) => Math.random() * (tope - piso) + piso;

// ── medida y siembra ──────────────────────────────────────

/**
 * El cielo ocupa lo que queda bajo la cabecera, y eso se mide, no se declara.
 *
 * La página original era position:fixed sobre todo el viewport. Acá la
 * cabecera se queda arriba, y el alto exacto que sobra no se puede escribir
 * en CSS sin un :has() que sostenga el layout — justo lo que la regla del
 * proyecto no permite, porque sin soporte quedaría media pantalla vacía.
 * Medirlo desde JS funciona en los dos layouts y no estrena nada.
 */
function medir() {
  if (!raiz || !caja) return;
  const respiro = parseFloat(getComputedStyle(raiz).paddingBottom) || 0;
  const arriba = caja.getBoundingClientRect().top;
  const visual = window.visualViewport;
  const limite = visual ? visual.height + visual.offsetTop : window.innerHeight;
  caja.style.height = Math.max(300, Math.round(limite - arriba - respiro)) + 'px';

  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = caja.clientWidth;
  alto = caja.clientHeight;
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = ancho * 0.5;
  cy = alto * 0.53;
  escala = Math.min(ancho, alto) / 720;
  sembrar();
}

/** Agrupa todos los resize de un cuadro en una sola resiembra. */
function programarMedida() {
  if (cuadroMedida !== null) return;
  cuadroMedida = requestAnimationFrame(() => {
    cuadroMedida = null;
    medir();
    if (ctx && (quieto() || cuadro === null)) dibujar(performance.now());
  });
}

function sembrar() {
  const densidad = Math.min(1, (ancho * alto) / (1280 * 720));

  estrellas = Array.from({ length: Math.floor(150 + 260 * densidad) }, () => ({
    x: azar(ancho), y: azar(alto), r: azar(1.65, 0.2),
    a: azar(0.9, 0.15), tw: azar(5, 0.7), p: azar(Math.PI * 2),
  }));

  polvo = [];
  const granos = Math.floor(560 + 520 * densidad);
  for (let i = 0; i < granos; i++) {
    const brazo = i % 4;
    const t = azar();
    polvo.push({
      a: brazo * Math.PI / 2 + t * 7.5 + azar(0.92, -0.92),
      r: (15 + Math.pow(t, 0.52) * Math.min(ancho, alto) * 0.49) * escala,
      s: azar(2.3, 0.35), o: azar(0.88, 0.12), v: azar(0.1, 0.018),
      z: azar(1.3, 0.35), tibio: Math.random() > 0.28, capa: i % 2,
    });
  }

  // La curva del corazón, con las partículas repartidas al azar sobre ella.
  corazon = [];
  for (let i = 0; i < 260; i++) {
    const t = azar(Math.PI * 2);
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    corazon.push({
      x: x * escala * 6 + azar(2.2, -2.2) * escala,
      y: y * escala * 6 + azar(2.2, -2.2) * escala,
      a: azar(0.98, 0.28), r: azar(2.3, 0.55), p: azar(Math.PI * 2),
    });
  }

  // Las posiciones y las semillas son estables. Antes el centro de cada flor
  // generaba 21 puntos al azar EN CADA CUADRO: 126 llamadas a Math.random()
  // por frame y una vibración visual que no pertenecía al movimiento.
  flores = MENSAJES.map((mensaje, i) => ({
    ...mensaje,
    giro: azar(0.3, -0.3),
    semillas: Array.from({ length: 21 }, (_, k) => {
      const radio = Math.sqrt((k + 0.5) / 21) * 0.29;
      const angulo = k * 2.3999632297 + i * 0.31;
      return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio };
    }),
  }));
}

// ── dibujo ────────────────────────────────────────────────

/* punto() deja globalAlpha donde lo dejó la última partícula, y save/restore
   lo conserva. Por eso todo lo que se dibuja con un fill propio —el núcleo de
   la galaxia, los pétalos, el centro de la flor— empieza reponiendo el alfa:
   sin eso los girasoles heredaban el 0,1 del halo de la última estrella y
   salían fantasmales. Se veía en pantalla: flores amarillas sin amarillo. */
function punto(x, y, r, color, a = 1) {
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function progresoEntrada(transcurrido, demora = 0, duracion = 600) {
  if (quieto()) return 1;
  const p = Math.max(0, Math.min(1, (transcurrido - demora) / duracion));
  return p * p * (3 - 2 * p);
}

function galaxia(t, entrada) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = entrada;

  const nucleo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 130 * escala);
  nucleo.addColorStop(0, 'rgba(255,252,218,.46)');
  nucleo.addColorStop(0.08, 'rgba(255,199,63,.34)');
  nucleo.addColorStop(0.35, 'rgba(199,126,144,.16)');
  nucleo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nucleo;
  ctx.beginPath();
  ctx.arc(cx, cy, 132 * escala, 0, Math.PI * 2);
  ctx.fill();

  for (const p of polvo) {
    const sentido = p.capa ? -0.58 : 1;
    const a = p.a + t * p.v * sentido;
    const parpadeo = 0.72 + Math.sin(t * 1.7 + p.r) * 0.28;
    punto(cx + Math.cos(a) * p.r, cy + Math.sin(a) * p.r * (p.capa ? 0.42 : 0.53),
      p.s * p.z, p.tibio ? CIELO.oro : CIELO.rosa, p.o * parpadeo * entrada);
  }

  ctx.globalAlpha = entrada;
  for (let i = 0; i < 10; i++) {
    const a = t * 0.09 + i * Math.PI / 5;
    const r = (60 + i * 15) * escala;
    ctx.strokeStyle = 'rgba(255,194,51,' + (0.02 - i * 0.0015) + ')';
    ctx.lineWidth = (18 - i) * escala;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 2.2, r * 0.72, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function latido(t, entrada) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = entrada;
  const respira = 1 + Math.sin(t * 2.2) * 0.035;
  for (const p of corazon) {
    const a = p.a * (0.62 + Math.sin(t * 2 + p.p) * 0.38);
    const x = cx + p.x * respira;
    const y = cy + p.y * respira;
    punto(x, y, p.r, CIELO.corazon, a * entrada);
    if (p.r > 1.7) punto(x, y, p.r * 3.8, CIELO.rosa, a * entrada * 0.1);
  }
  ctx.restore();
}

function girasol(x, y, tam, vuelta, t, tipo, semillas, entrada) {
  ctx.save();
  // El alfa de la flor se DECLARA acá, y no se hereda del último punto que
  // se haya dibujado. Opaca queda de calcomanía sobre el cielo; a 0,62 es
  // una flor encendida dentro de la galaxia, que es lo que la vista es.
  ctx.globalAlpha = 0.62 * entrada;
  ctx.translate(x, y);
  ctx.rotate(vuelta + Math.sin(t * 0.55 + tipo) * 0.08);
  ctx.scale(0.88 + entrada * 0.12, 0.88 + entrada * 0.12);

  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, tam * 1.45);
  halo.addColorStop(0, 'rgba(255,193,28,.26)');
  halo.addColorStop(1, 'rgba(255,193,28,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, tam * 1.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = CIELO.tallo;
  ctx.lineWidth = Math.max(1, tam * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, tam * 0.45);
  ctx.quadraticCurveTo(-tam * 0.1, tam * 1.35, tam * 0.12, tam * 2.1);
  ctx.stroke();

  ctx.fillStyle = CIELO.hoja;
  ctx.beginPath();
  ctx.ellipse(-tam * 0.2, tam * 1.2, tam * 0.16, tam * 0.42, -0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(tam * 0.22, tam * 1.52, tam * 0.14, tam * 0.35, 0.85, 0, Math.PI * 2);
  ctx.fill();

  const petalos = tipo === 2 ? 15 : 12;
  for (let i = 0; i < petalos; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI * 2 / petalos);
    const g = ctx.createLinearGradient(0, 0, 0, -tam);
    g.addColorStop(0, CIELO.oroHondo);
    g.addColorStop(0.45, CIELO.oroMedio);
    g.addColorStop(1, CIELO.oroClaro);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -tam * 0.58, tam * 0.24, tam * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const centro = ctx.createRadialGradient(-tam * 0.1, -tam * 0.1, tam * 0.03, 0, 0, tam * 0.48);
  centro.addColorStop(0, '#8a4b0b');
  centro.addColorStop(0.55, '#5a2607');
  centro.addColorStop(1, '#281105');
  ctx.fillStyle = centro;
  ctx.beginPath();
  ctx.arc(0, 0, tam * 0.46, 0, Math.PI * 2);
  ctx.fill();

  for (const semilla of semillas) {
    punto(semilla.x * tam, semilla.y * tam, tam * 0.026, CIELO.semilla, 0.75 * entrada);
  }
  ctx.restore();
}

function ramillete(t, transcurrido) {
  flores.forEach((f, i) => {
    const entrada = progresoEntrada(transcurrido, 480 + i * 85, 420);
    const flotaY = Math.sin(t * 0.65 + f.fase * 9) * 10 * escala;
    const flotaX = Math.cos(t * 0.44 + f.fase * 7) * 5 * escala;
    girasol(cx + f.x * ancho + flotaX, f.y * alto + flotaY,
      (28 + f.z * 32) * escala, f.giro, t, f.tipo, f.semillas, entrada);
  });
}

function destellos() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = chispas.length - 1; i >= 0; i--) {
    const c = chispas[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.012;
    c.vida -= 0.018;
    punto(c.x, c.y, c.r, CIELO.oro, Math.max(0, c.vida));
    if (c.vida <= 0) chispas.splice(i, 1);
  }
  ctx.restore();
}

function dibujar(ahora) {
  if (!ctx) return;
  const t = ahora / 1000;
  const transcurrido = quieto() ? DURACION_ENTRADA : Math.max(0, ahora - inicioEntrada);
  ctx.clearRect(0, 0, ancho, alto);
  const fondo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(ancho, alto) * 0.76);
  fondo.addColorStop(0, CIELO.centro);
  fondo.addColorStop(0.42, CIELO.medio);
  fondo.addColorStop(1, CIELO.borde);
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ancho, alto);

  for (const s of estrellas) {
    const a = s.a * (0.63 + Math.sin(t * s.tw + s.p) * 0.37);
    punto(s.x, s.y, s.r, CIELO.estrella, a);
    if (s.r > 1.1) punto(s.x, s.y, s.r * 3, CIELO.rosa, a * 0.1);
  }

  galaxia(t, progresoEntrada(transcurrido, 0, 800));
  latido(t, progresoEntrada(transcurrido, 300, 650));
  ramillete(t, transcurrido);
  destellos();
  ctx.globalAlpha = 1;
}

function bucle(ahora) {
  dibujar(ahora);
  cuadro = requestAnimationFrame(bucle);
}

function arrancarBucle() {
  if (ctx && cuadro === null) cuadro = requestAnimationFrame(bucle);
}

function pararBucle() {
  if (cuadro !== null) cancelAnimationFrame(cuadro);
  cuadro = null;
}

// ── interacción ───────────────────────────────────────────

function estallar(x, y) {
  if (quieto()) return;
  const nuevas = 50;
  if (chispas.length + nuevas > MAX_CHISPAS) {
    chispas.splice(0, chispas.length + nuevas - MAX_CHISPAS);
  }
  for (let i = 0; i < nuevas; i++) {
    const a = azar(Math.PI * 2);
    const v = azar(3.1, 0.45);
    chispas.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      r: azar(2.6, 0.6), vida: azar(1, 0.5),
    });
  }
}

function abrirCarta(contenido, activador) {
  if (!dialogo) return;
  activadorCarta = activador;
  dialogoTitulo.textContent = contenido.titulo;
  dialogoCuerpo.replaceChildren();

  const parrafos = contenido.parrafos ?? [contenido.texto];
  for (const texto of parrafos) {
    const p = document.createElement('p');
    p.textContent = texto;
    dialogoCuerpo.append(p);
  }

  dialogoFirma.textContent = contenido.firma ?? '';
  dialogoFirma.hidden = !contenido.firma;
  if (!dialogo.open) dialogo.showModal();
}

function fijarLeyenda(texto = 'Elige una flor') {
  if (leyenda) leyenda.textContent = texto;
}

function posicionarControl(boton, mensaje) {
  // Las flores pueden asomarse por el borde, pero su blanco táctil no: en
  // 320px, los centros extremos dejarían 11–13px del botón recortados.
  boton.style.left = 'clamp(22px,' + (50 + mensaje.x * 100) + '%,calc(100% - 22px))';
  boton.style.top = mensaje.y * 100 + '%';
}

function crearControles() {
  const fragmento = document.createDocumentFragment();

  for (const mensaje of MENSAJES) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'flor-mensaje';
    boton.dataset.etiqueta = mensaje.etiqueta;
    boton.setAttribute('aria-label', 'Abrir mensaje: ' + mensaje.titulo);
    posicionarControl(boton, mensaje);

    const titulo = document.createElement('span');
    titulo.className = 'flor-etiqueta';
    titulo.textContent = mensaje.titulo;
    boton.append(titulo);

    const mostrarTitulo = () => fijarLeyenda(mensaje.titulo);
    const ocultarTitulo = () => fijarLeyenda();
    boton.addEventListener('focus', mostrarTitulo);
    boton.addEventListener('blur', ocultarTitulo);
    boton.addEventListener('pointerenter', mostrarTitulo);
    boton.addEventListener('pointerleave', ocultarTitulo);
    boton.addEventListener('click', (evento) => {
      evento.stopPropagation();
      estallar(cx + mensaje.x * ancho, mensaje.y * alto);
      abrirCarta(mensaje, boton);
    });
    fragmento.append(boton);
  }

  const corazonBoton = document.createElement('button');
  corazonBoton.type = 'button';
  corazonBoton.className = 'corazon-mensaje';
  corazonBoton.setAttribute('aria-label', 'Abrir la carta para Valeria');
  corazonBoton.innerHTML = '<span class="corazon-etiqueta">Para Valeria</span>';
  corazonBoton.addEventListener('focus', () => fijarLeyenda('Para Valeria'));
  corazonBoton.addEventListener('blur', () => fijarLeyenda());
  corazonBoton.addEventListener('pointerenter', () => fijarLeyenda('Para Valeria'));
  corazonBoton.addEventListener('pointerleave', () => fijarLeyenda());
  corazonBoton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    estallar(cx, cy);
    abrirCarta(CARTA_FINAL, corazonBoton);
  });
  fragmento.append(corazonBoton);
  controles.append(fragmento);
}

function activarFallback() {
  caja.classList.add('sin-canvas');
  lienzo.hidden = true;
  controles.hidden = true;
  leyenda.hidden = true;
  fallback.hidden = false;
  const lista = fallback.querySelector('.flores-fallback-lista');

  for (const mensaje of [...MENSAJES, CARTA_FINAL]) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'flores-fallback-boton';
    boton.textContent = mensaje.titulo;
    boton.addEventListener('click', () => abrirCarta(mensaje, boton));
    lista.append(boton);
  }
}

// ── vista ─────────────────────────────────────────────────

export function pintarFlores(app) {
  raiz = app;
  app.className = 'app flores';
  app.innerHTML = `
    <article class="flores-articulo" aria-labelledby="flores-titulo">
      <header class="flores-cabecera">
        <p class="flores-kicker">Un pequeño universo</p>
        <h2 id="flores-titulo" tabindex="-1">Flores amarillas</h2>
      </header>

      <div class="flores-caja">
        <canvas class="flores-cielo" role="img"
          aria-label="Un cielo nocturno con girasoles y un corazón de estrellas"></canvas>
        <div class="flores-controles" aria-label="Mensajes entre las flores"></div>
        <p class="flores-leyenda" aria-hidden="true">Elige una flor</p>
        <div class="flores-copia">
          <p class="flores-pista"><span class="flores-pista-elige">Elige una flor · </span>toca el cielo para encender estrellas</p>
        </div>
        <section class="flores-fallback" aria-labelledby="flores-fallback-titulo" hidden>
          <h3 id="flores-fallback-titulo">Un pequeño universo para ti</h3>
          <p>El cielo no pudo dibujarse, pero sus mensajes siguen aquí.</p>
          <div class="flores-fallback-lista"></div>
        </section>
      </div>
    </article>

    <dialog class="carta-dialogo" aria-labelledby="carta-titulo">
      <article class="carta-papel">
        <p class="carta-kicker">Una flor para ti</p>
        <h3 id="carta-titulo"></h3>
        <div class="carta-cuerpo"></div>
        <p class="carta-firma" hidden></p>
        <form method="dialog">
          <button type="submit" class="btn carta-cerrar">Cerrar</button>
        </form>
      </article>
    </dialog>`;

  caja = app.querySelector('.flores-caja');
  lienzo = app.querySelector('.flores-cielo');
  controles = app.querySelector('.flores-controles');
  leyenda = app.querySelector('.flores-leyenda');
  fallback = app.querySelector('.flores-fallback');
  dialogo = app.querySelector('.carta-dialogo');
  dialogoTitulo = app.querySelector('#carta-titulo');
  dialogoCuerpo = app.querySelector('.carta-cuerpo');
  dialogoFirma = app.querySelector('.carta-firma');
  consultaMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');
  try {
    ctx = lienzo.getContext('2d');
  } catch {
    ctx = null;
  }
  // El negro del fondo sale de la misma constante que pinta el canvas. Si
  // además viviera en styles.css habría que moverlos juntos para siempre.
  caja.style.background = CIELO.fondo;

  alCerrarDialogo = () => {
    const activador = activadorCarta;
    activadorCarta = null;
    if (activador?.isConnected) activador.focus();
  };
  dialogo.addEventListener('close', alCerrarDialogo);

  if (!ctx) {
    activarFallback();
  } else {
    medir();
    crearControles();
    inicioEntrada = performance.now();
    if (quieto()) dibujar(inicioEntrada);
    else arrancarBucle();
  }

  alRedimensionar = programarMedida;
  window.addEventListener('resize', alRedimensionar, { passive: true });
  window.visualViewport?.addEventListener('resize', alRedimensionar, { passive: true });

  // Un bucle de rAF en una pestaña de fondo no se ve y sí se paga.
  alCambiarVisibilidad = () => {
    if (document.hidden) pararBucle();
    else if (!quieto()) arrancarBucle();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  alCambiarMovimiento = () => {
    pararBucle();
    chispas = [];
    if (!ctx) return;
    if (quieto()) dibujar(performance.now());
    else if (!document.hidden) {
      inicioEntrada = performance.now() - DURACION_ENTRADA;
      arrancarBucle();
    }
  };
  consultaMovimiento.addEventListener('change', alCambiarMovimiento);

  // El cielo conserva sus destellos, pero los mensajes siempre tienen un
  // control DOM de 44px: el dibujo nunca es el único camino para llegarles.
  caja.addEventListener('pointerdown', (e) => {
    if (!ctx || e.target.closest('button, a')) return;
    const r = lienzo.getBoundingClientRect();
    estallar(e.clientX - r.left, e.clientY - r.top);
  });
}

/** Apaga todo lo que esta vista dejó corriendo fuera de #app. */
export function desmontar() {
  pararBucle();
  if (cuadroMedida !== null) cancelAnimationFrame(cuadroMedida);
  cuadroMedida = null;
  activadorCarta = null;
  if (dialogo?.open) dialogo.close();
  if (alRedimensionar) window.removeEventListener('resize', alRedimensionar);
  if (alRedimensionar) window.visualViewport?.removeEventListener('resize', alRedimensionar);
  if (alCambiarVisibilidad) document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  if (alCambiarMovimiento) consultaMovimiento?.removeEventListener('change', alCambiarMovimiento);
  if (alCerrarDialogo) dialogo?.removeEventListener('close', alCerrarDialogo);
  alRedimensionar = alCambiarVisibilidad = alCambiarMovimiento = alCerrarDialogo = null;
  // Sin esto los ~1500 objetos del cielo siguen vivos colgados del módulo
  // aunque el DOM que los mostraba ya no exista.
  estrellas = polvo = corazon = flores = chispas = [];
  raiz = caja = lienzo = ctx = controles = leyenda = fallback = null;
  dialogo = dialogoTitulo = dialogoCuerpo = dialogoFirma = activadorCarta = null;
  consultaMovimiento = null;
}
