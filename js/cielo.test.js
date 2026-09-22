import { describe, it, expect } from 'vitest';
import {
  puntoEspiral, radiosDelCielo, puntoCorazon, extensionesCorazon,
  tamanoFlor, tamanoFlorPorZ, recortarT, FLOR_EXT,
  ANCLA, VUELTA, DISP, BRAZOS, APLANADO, APLANADO_MAX, APLANADO_CAPA, aplanadoDelCielo,
  CORAZON_ANCHO, CORAZON_ALTO, CORAZON_CENTRO, CORAZON_U, RESPLANDOR, Z_MAX,
} from './cielo.js';

// Cajas reales, no inventadas: las dos medidas en navegador más los
// extremos que rompen cosas.
const CAJAS = [
  [320, 400], [360, 480], [414, 520], [414, 896],
  [768, 600], [1041, 703], [1422, 840], [1920, 1080],
];

const escalaDe = (ancho, alto) => Math.min(ancho, alto) / 720;

/** Distancia angular más corta entre dos ángulos, en [0, π]. */
function distanciaAngular(a, b) {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

const RADIOS = radiosDelCielo(1422, 840, escalaDe(1422, 840));

// ── puntoEspiral ─────────────────────────────────────────────

describe('puntoEspiral', () => {
  // CRÍTICA. Es el defecto que sobrevivió a dos rondas de revisión
  // adversarial leyendo prosa: ANCLA ya lleva los π de separación, y
  // sumarle brazo·(2π/BRAZOS) dejaba los dos brazos exactamente encima.
  it('los dos brazos nunca coinciden, en todo su recorrido', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      const a0 = puntoEspiral(0, t, RADIOS).a;
      const a1 = puntoEspiral(1, t, RADIOS).a;
      expect(distanciaAngular(a0, a1)).toBeGreaterThan(0.5);
    }
  });

  it('ni con la dispersión en su peor caso se solapan los envolventes', () => {
    // El brazo 0 barre [ANCLA0, ANCLA0+VUELTA] y el 1 [ANCLA1, ANCLA1+VUELTA].
    // Con ±DISP en las puntas, los dos envolventes tienen que seguir separados.
    const fin0 = ANCLA[0] + VUELTA + DISP;
    const ini1 = ANCLA[1] - DISP;
    expect(ini1).toBeGreaterThan(fin0);
    // Y el margen por lado es (π − VUELTA)/2, no π/2: los brazos barren.
    expect(DISP).toBeLessThan((Math.PI - VUELTA) / 2);
  });

  it('r es monótona creciente en t', () => {
    let previo = -Infinity;
    for (let t = 0; t <= 1; t += 0.02) {
      const { r } = puntoEspiral(0, t, RADIOS);
      expect(r).toBeGreaterThan(previo);
      previo = r;
    }
  });

  it('el aplanado afecta solo al eje y, y el parámetro pisa al valor por defecto', () => {
    const base = puntoEspiral(0, 0.5, RADIOS, { cx: 100, cy: 200 });
    const plano = puntoEspiral(0, 0.5, RADIOS, { cx: 100, cy: 200, aplanado: 0.3 });
    expect(plano.x).toBeCloseTo(base.x, 10);
    expect(plano.y).not.toBeCloseTo(base.y, 3);
    expect((plano.y - 200) / (base.y - 200)).toBeCloseTo(0.3 / RADIOS.aplanado.base, 10);
  });

  it('sin radios.aplanado cae al APLANADO por defecto', () => {
    // La rama `?? APLANADO` de puntoEspiral solo se alcanza con un objeto de
    // radios que no venga de radiosDelCielo(). Nadie lo construye a mano hoy,
    // pero si alguien lo hace el dibujo tiene que seguir siendo correcto en
    // vez de dar NaN en el eje y.
    const crudos = { r0: 10, rMax: 50 };
    const conFallback = puntoEspiral(0, 0.5, crudos, { cx: 0, cy: 0 });
    const explicito = puntoEspiral(0, 0.5, crudos, { cx: 0, cy: 0, aplanado: APLANADO });
    expect(conFallback.y).toBeCloseTo(explicito.y, 10);
    expect(Number.isFinite(conFallback.y)).toBe(true);
  });

  it('el aplanado cede en cajas altas y se mantiene en cajas anchas', () => {
    // Es lo que llena el alto en un telefono: con 0.58 fijo el disco dejaba
    // ~236px de negro arriba y ~200 abajo en una caja de 556. Medido.
    expect(aplanadoDelCielo(1422, 711)).toBeCloseTo(APLANADO_MAX, 6);
    expect(aplanadoDelCielo(336, 556)).toBeGreaterThan(0.9);
    expect(aplanadoDelCielo(414, 520)).toBeGreaterThan(APLANADO_MAX);
    // Monotona: mas alta la caja, menos aplanada la galaxia.
    let previo = 0;
    for (const alto of [300, 400, 500, 700, 900]) {
      const a = aplanadoDelCielo(400, alto);
      expect(a).toBeGreaterThanOrEqual(previo);
      previo = a;
    }
    // Y nunca se pasa del tope declarado.
    expect(aplanadoDelCielo(100, 5000)).toBeLessThanOrEqual(0.95 + 1e-9);
    // Caja degenerada: con alto <= 0 se trata como caja ancha (razon = 2),
    // no como la mas alta posible. Sin esto una caja de alto 0 daria el
    // aplanado maximo y un disco tan alto como ancho en un sitio sin alto.
    expect(aplanadoDelCielo(100, 0)).toBeCloseTo(APLANADO_MAX, 6);
    expect(aplanadoDelCielo(100, -5)).toBeCloseTo(APLANADO_MAX, 6);
  });
});

// ── radiosDelCielo ───────────────────────────────────────────

describe('radiosDelCielo', () => {
  it('cumple la invariante r0 + rMax === radioUtil en toda caja', () => {
    for (const [ancho, alto] of CAJAS) {
      const r = radiosDelCielo(ancho, alto, escalaDe(ancho, alto));
      expect(r.r0 + r.rMax).toBeCloseTo(r.radioUtil, 10);
    }
  });

  it('el disco entra en la caja en los DOS ejes', () => {
    for (const [ancho, alto] of CAJAS) {
      const r = radiosDelCielo(ancho, alto, escalaDe(ancho, alto));
      const total = r.r0 + r.rMax;
      expect(total).toBeLessThanOrEqual(ancho * 0.47 + 1e-9);
      expect(total * r.aplanado.max).toBeLessThanOrEqual(alto * 0.47 + 1e-9);
    }
  });

  it('en caja angosta recorta r0 y achica el corazón en vez de salirse', () => {
    const anchaSuelta = radiosDelCielo(1920, 1080, escalaDe(1920, 1080));
    const angosta = radiosDelCielo(320, 400, escalaDe(320, 400));
    expect(angosta.r0).toBeCloseTo(angosta.radioUtil * 0.38, 10);
    expect(angosta.escalaCorazon).toBeLessThan(escalaDe(320, 400));
    expect(angosta.escalaCorazon).toBeLessThan(anchaSuelta.escalaCorazon);
  });

  it('con caja degenerada no devuelve NaN ni negativos', () => {
    for (const [ancho, alto] of [[0, 0], [1, 1], [1, 1000], [1000, 1]]) {
      const r = radiosDelCielo(ancho, alto, escalaDe(ancho, alto));
      for (const v of [r.radioUtil, r.r0, r.rMax]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
      expect(Number.isFinite(r.escalaCorazon)).toBe(true);
    }
  });
});

// ── el corazón ───────────────────────────────────────────────

describe('puntoCorazon / extensionesCorazon', () => {
  it('las extensiones salen de muestrear la curva, no de literales', () => {
    // La prueba vuelve a muestrear por su cuenta: si alguien cambia la
    // curva, las constantes tienen que seguirla en vez de mentir.
    const propio = extensionesCorazon(1440);
    expect(CORAZON_ANCHO).toBeCloseTo(propio.ancho, 1);
    expect(CORAZON_ALTO).toBeCloseTo(propio.alto, 1);
    expect(CORAZON_CENTRO).toBeCloseTo(propio.centro, 1);
    // Los valores reales, y NO los que daba la cuenta a mano.
    //
    // A mano se asumía que los extremos en y caen en θ=0 y θ=π, o sea
    // y ∈ [-5, 17], y de ahí salían alto=11 y centro=6. Es falso: el
    // mínimo está en θ≈0.289π y vale -11.92. El error en `centro` eran
    // 3.46 unidades, o sea ~21px de corazón corrido a escala 1. Esta
    // prueba es la que lo encontró; tres rondas de revisión sobre el
    // texto no lo vieron.
    expect(CORAZON_ANCHO).toBeCloseTo(16, 3);
    expect(CORAZON_ALTO).toBeCloseTo(14.46, 1);
    expect(CORAZON_CENTRO).toBeCloseTo(2.54, 1);
    expect(CORAZON_ALTO).not.toBeCloseTo(11, 0);
    expect(CORAZON_CENTRO).not.toBeCloseTo(6, 0);
  });

  it('la curva recentrada reparte su alto arriba y abajo por igual', () => {
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < 720; i++) {
      const { y } = puntoCorazon((i / 720) * Math.PI * 2);
      yMin = Math.min(yMin, y);
      yMax = Math.max(yMax, y);
    }
    expect(Math.abs(yMax)).toBeCloseTo(Math.abs(yMin), 2);
  });
});

// ── las flores ───────────────────────────────────────────────

const FLORES = [
  { id: 'tu-luz', brazo: 0, t: 0.30 },
  { id: 'cada-dia', brazo: 0, t: 0.58 },
  { id: 'volveria-a-elegirte', brazo: 0, t: 0.88 },
  { id: 'mi-princesa', brazo: 1, t: 0.20 },
  { id: 'lugar-favorito', brazo: 1, t: 0.52 },
  { id: 'que-sea-especial', brazo: 1, t: 0.84 },
];

describe('flores sobre los brazos', () => {
  it('las seis caen enteras dentro de la caja, en toda caja', () => {
    for (const [ancho, alto] of CAJAS) {
      const radios = radiosDelCielo(ancho, alto, escalaDe(ancho, alto));
      const caja = { ancho, alto, cx: ancho * 0.5, cy: alto * 0.53 };
      for (const f of FLORES) {
        const t = recortarT(f.brazo, f.t, radios, caja);
        const p = puntoEspiral(f.brazo, t, radios, { cx: caja.cx, cy: caja.cy });
        const tam = tamanoFlor(t, radios);
        expect(p.x - tam * FLOR_EXT.lado, `${f.id} @ ${ancho}x${alto}`).toBeGreaterThanOrEqual(0);
        expect(p.x + tam * FLOR_EXT.lado, `${f.id} @ ${ancho}x${alto}`).toBeLessThanOrEqual(ancho);
        expect(p.y - tam * FLOR_EXT.arriba, `${f.id} @ ${ancho}x${alto}`).toBeGreaterThanOrEqual(0);
        expect(p.y + tam * FLOR_EXT.abajo, `${f.id} @ ${ancho}x${alto}`).toBeLessThanOrEqual(alto);
      }
    }
  });

  it('el brazo 0 cae a la derecha y el brazo 1 a la izquierda, en todo su recorrido', () => {
    for (let t = 0; t <= 1; t += 0.02) {
      expect(Math.cos(puntoEspiral(0, t, RADIOS).a)).toBeGreaterThan(0);
      expect(Math.cos(puntoEspiral(1, t, RADIOS).a)).toBeLessThan(0);
    }
  });

  it('el tamaño es una fracción constante del disco, no dependa de la caja', () => {
    const razones = CAJAS.map(([ancho, alto]) => {
      const r = radiosDelCielo(ancho, alto, escalaDe(ancho, alto));
      return tamanoFlor(0.5, r) / (r.r0 + r.rMax);
    });
    for (const razon of razones) expect(razon).toBeCloseTo(razones[0], 10);
  });

  it('la fórmula de reserva por z da la misma escala relativa que la de t', () => {
    // Existe para que recortar el paso de las flores-sobre-los-brazos siga
    // arreglando el tamaño. z=0 es la flor más cercana, z=Z_MAX la más lejana.
    expect(tamanoFlorPorZ(0, RADIOS)).toBeCloseTo(tamanoFlor(0, RADIOS), 10);
    expect(tamanoFlorPorZ(Z_MAX, RADIOS)).toBeCloseTo(tamanoFlor(1, RADIOS), 10);
    // Y no se sale de rango con un z fuera de lo esperado.
    expect(tamanoFlorPorZ(99, RADIOS)).toBeCloseTo(tamanoFlor(1, RADIOS), 10);
    expect(tamanoFlorPorZ(-5, RADIOS)).toBeCloseTo(tamanoFlor(0, RADIOS), 10);
  });

  it('recortarT respeta el desvio con el que se va a dibujar', () => {
    // Si el recorte valida un punto y el dibujo usa otro, la flor se sale
    // igual y el clamp miente. Paso un desvio grande y compruebo que el
    // punto RESUELTO, con ese mismo desvio, entra en la caja.
    const radios = radiosDelCielo(1422, 840, escalaDe(1422, 840));
    const caja = { ancho: 1422, alto: 840, cx: 711, cy: 445 };
    for (const disp of [-0.75, -0.2, 0.22, 0.65, 0.75]) {
      for (let brazo = 0; brazo < BRAZOS; brazo++) {
        const t = recortarT(brazo, 0.95, radios, caja, disp);
        const p = puntoEspiral(brazo, t, radios, { cx: caja.cx, cy: caja.cy, disp });
        const tam = tamanoFlor(t, radios);
        expect(p.x - tam * FLOR_EXT.lado, `brazo ${brazo} disp ${disp}`).toBeGreaterThanOrEqual(0);
        expect(p.x + tam * FLOR_EXT.lado, `brazo ${brazo} disp ${disp}`).toBeLessThanOrEqual(caja.ancho);
        expect(p.y - tam * FLOR_EXT.arriba, `brazo ${brazo} disp ${disp}`).toBeGreaterThanOrEqual(0);
        expect(p.y + tam * FLOR_EXT.abajo, `brazo ${brazo} disp ${disp}`).toBeLessThanOrEqual(caja.alto);
      }
    }
  });

  it('recortarT termina siempre y nunca baja de 0.1', () => {
    // Caja imposible: nada entra, así que el clamp tiene que tocar su piso
    // y devolver el control en vez de girar para siempre.
    const radios = radiosDelCielo(1422, 840, escalaDe(1422, 840));
    const cajaImposible = { ancho: 10, alto: 10, cx: 5, cy: 5 };
    for (let brazo = 0; brazo < BRAZOS; brazo++) {
      const t = recortarT(brazo, 1, radios, cajaImposible);
      expect(t).toBeGreaterThanOrEqual(0.1);
      expect(t).toBeLessThanOrEqual(1);
      expect(Number.isFinite(t)).toBe(true);
    }
  });
});

// ── las constantes acopladas ─────────────────────────────────

describe('constantes que tienen que moverse juntas', () => {
  it('APLANADO_MAX es de verdad el mayor de todos los aplanados', () => {
    for (const a of [...APLANADO_CAPA, APLANADO]) {
      expect(a).toBeLessThanOrEqual(APLANADO_MAX);
    }
  });

  it('la capa de atrás es la más aplanada', () => {
    expect(APLANADO_CAPA[1]).toBeLessThan(APLANADO_CAPA[0]);
  });

  it('r0 es exactamente el corazón con su resplandor cuando hay sitio', () => {
    const escala = escalaDe(1422, 840);
    const r = radiosDelCielo(1422, 840, escala);
    expect(r.r0).toBeCloseTo(CORAZON_ANCHO * CORAZON_U * RESPLANDOR * escala, 6);
    expect(r.escalaCorazon).toBeCloseTo(escala, 10);
  });
});
