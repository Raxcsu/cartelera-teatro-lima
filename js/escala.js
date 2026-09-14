/**
 * escala.js — la lectura estática que acompaña el paper de Valeria.
 *
 * No importa datos.js: entrar a esta ruta no hace fetch de la cartelera y
 * puede funcionar incluso cuando la información mensual esté vencida.
 */

export function pintarEscala(app) {
  app.className = 'app escala';
  app.innerHTML = `
    <article class="escala-articulo" aria-labelledby="escala-titulo">
      <header class="escala-portada">
        <p class="escala-kicker">Un experimento de metrología afectiva</p>
        <h2 id="escala-titulo" tabindex="-1">Escala astronómica<br>del amor</h2>
        <p class="escala-intro">¿Cuánto tomaría cruzar la Vía Láctea caminando por Valeria?</p>
        <p class="escala-distancia"><strong>100 000</strong><span>años luz</span></p>
        <p class="escala-apunte">Una sola galaxia como unidad candidata para una magnitud que no parece tener límite.</p>
      </header>

      <section class="travesia" aria-labelledby="travesia-titulo">
        <p class="escala-kicker">El recorrido</p>
        <h3 id="travesia-titulo">Una marcha posible<br>en una distancia imposible</h3>
        <p>El modelo concede un paso cómodo y constante: 5 km por hora, durante 8 horas cada día.</p>
        <dl class="hitos" aria-label="Ritmo de la travesía">
          <div class="hito">
            <dt>cada día</dt>
            <dd>40 <span>km</span></dd>
          </div>
          <div class="hito">
            <dt>cada año</dt>
            <dd>14 610 <span>km</span></dd>
          </div>
        </dl>
      </section>

      <section class="resultado" aria-labelledby="resultado-titulo">
        <p class="escala-kicker">El resultado</p>
        <h3 id="resultado-titulo">La travesía pediría</h3>
        <p class="cifra-principal">64.8 <span>billones<br>de años</span></p>
        <p>Eso equivale a aproximadamente <strong>809 mil millones de vidas humanas</strong>, una detrás de otra, dedicadas a completar un único cruce.</p>
      </section>

      <section class="veredicto" aria-labelledby="veredicto-titulo">
        <p class="escala-kicker">Lo que la cifra sí dice</p>
        <h3 id="veredicto-titulo">La galaxia no mide el amor.</h3>
        <p>Mide apenas el costo de intentar usarla como regla. Después de recorrerla una vez, la pregunta seguiría abierta.</p>
        <p class="formula" aria-label="Coeficiente de Amor de Valeria mayor que uno">𝒱 &gt; 1</p>
        <p class="formula-explicacion">El diámetro de la Vía Láctea no es la respuesta: es una cota inferior.</p>
      </section>

      <section class="escala-cierre" aria-labelledby="cierre-titulo">
        <p class="escala-kicker">La conclusión</p>
        <h3 id="cierre-titulo">Aunque cambiara el camino, el destino se mantiene.</h3>
        <p>Si el experimento pudiera repetirse infinitas veces, en cada una volvería a encontrarte, a elegirte y a enamorarme de ti.</p>
      </section>

      <section class="paper" aria-labelledby="paper-titulo">
        <div class="paper-cabecera">
          <div>
            <p class="escala-kicker">El documento completo</p>
            <h3 id="paper-titulo">Sobre la escala astronómica del amor</h3>
          </div>
          <a class="btn primario" href="data/paper_cientifico/paper.pdf" target="_blank" rel="noopener noreferrer">Abrir documento completo</a>
        </div>
        <object class="lector-pdf" data="data/paper_cientifico/paper.pdf" type="application/pdf"
          title="Paper completo: Sobre la escala astronómica del amor" aria-label="Paper completo: Sobre la escala astronómica del amor">
          <p>Tu navegador no puede mostrar el PDF integrado. <a href="data/paper_cientifico/paper.pdf" target="_blank" rel="noopener noreferrer">Abrí el documento completo</a>.</p>
        </object>
      </section>
    </article>`;
}
