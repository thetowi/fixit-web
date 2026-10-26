export const metadata = {
  title: "Términos y Condiciones | Oficy",
};

export default function TerminosPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full pb-24">
      <p className="font-mono text-xs tracking-widest text-copper-text uppercase mb-2">Legal</p>
      <h1 className="font-display text-2xl text-ink mb-1">Términos y Condiciones</h1>
      <p className="text-xs text-ink-muted mb-8">Última actualización: [completar fecha antes de publicar]</p>

      <div className="flex flex-col gap-6 text-sm text-ink/80 leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-ink [&_h2]:mb-2 [&_h2]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">

        <section>
          <h2>1. Quiénes somos y a qué se aplican estos Términos</h2>
          <p>
            Oficy (&quot;Oficy&quot;, &quot;la Plataforma&quot;, &quot;nosotros&quot;) es operada por [Razón social /
            nombre completo del titular], CUIT [completar], con domicilio en [completar domicilio legal], República
            Argentina. Estos Términos y Condiciones (&quot;Términos&quot;) regulan el uso de la aplicación y el sitio
            web de Oficy por parte de cualquier persona que se registre como Cliente o Prestador (en conjunto,
            &quot;Usuarios&quot;).
          </p>
          <p>
            Al crear una cuenta o usar Oficy de cualquier forma, aceptás estos Términos y nuestra{" "}
            <a href="/privacidad" className="text-copper-text hover:underline">Política de Privacidad</a>. Si no estás de
            acuerdo, no debés usar la Plataforma.
          </p>
        </section>

        <section>
          <h2>2. Qué es Oficy (y qué no es)</h2>
          <p>
            Oficy es un marketplace: un espacio digital que conecta a personas que necesitan un servicio de oficios
            (&quot;Clientes&quot;) con personas o profesionales independientes que los ofrecen (&quot;Prestadores&quot;).
          </p>
          <p>
            <strong className="text-ink">Oficy no presta los servicios de oficios en sí mismos</strong> (plomería,
            electricidad, albañilería, etc.), no emplea a los Prestadores, y no es parte del acuerdo de trabajo que
            se celebra entre un Cliente y un Prestador. Cada Prestador actúa como contratista independiente, responsable
            de la calidad, legalidad, seguridad y cumplimiento del trabajo que ofrece. Oficy facilita el contacto, la
            comunicación, la programación del turno y el registro del trabajo, pero no supervisa ni dirige cómo se
            realiza cada trabajo, ni recibe ni administra el dinero que el Cliente le paga al Prestador.
          </p>
        </section>

        <section>
          <h2>3. Registro y cuentas</h2>
          <ul>
            <li>Tenés que ser mayor de 18 años para registrarte en Oficy.</li>
            <li>Los datos que cargues (nombre, email, teléfono, y en el caso de Prestadores, documentación de verificación) tienen que ser reales, completos y estar actualizados.</li>
            <li>Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra en tu cuenta.</li>
            <li>Cada persona puede tener una única cuenta. Oficy puede suspender o dar de baja cuentas duplicadas, falsas o que incumplan estos Términos.</li>
          </ul>
        </section>

        <section>
          <h2>4. Verificación de Prestadores</h2>
          <p>
            Los Prestadores pueden enviar documentación (DNI, certificado de antecedentes penales, matrícula del
            rubro cuando corresponda) para obtener la insignia de &quot;Verificado&quot;. Esta verificación es
            revisada por un administrador de Oficy, pero <strong className="text-ink">no constituye una garantía
            absoluta</strong> de la idoneidad, buena conducta o legalidad de la actividad del Prestador — es una
            señal adicional de confianza, no una certificación profesional emitida por un colegio u organismo
            regulador. Oficy puede rechazar, suspender o revocar la verificación de cualquier Prestador a su
            criterio, incluso después de haberla otorgado.
          </p>
        </section>

        <section>
          <h2>5. Publicación de servicios, ofertas y contratación</h2>
          <p>
            Los precios que cargan los Prestadores son de referencia (por hora). El monto final de cada trabajo se
            acuerda entre Cliente y Prestador a través del chat de la Plataforma, mediante una oferta con un monto y
            una descripción del trabajo. Al aceptar una oferta, el Cliente y el Prestador celebran un acuerdo directo
            entre ellos — Oficy no es parte de ese acuerdo, solo provee la herramienta para formalizarlo y dejarlo
            registrado.
          </p>
        </section>

        <section>
          <h2>6. Pago del trabajo y confirmación</h2>
          <ul>
            <li>El Cliente le paga el trabajo <strong className="text-ink">directamente al Prestador</strong>, por el medio que acuerden entre ellos (efectivo, transferencia, Mercado Pago u otro). Oficy no recibe, no retiene ni administra ese dinero, y no es responsable por ese pago.</li>
            <li>Usar Oficy no tiene costo para el Cliente.</li>
            <li>Al aceptar una oferta, el Cliente recibe un <strong className="text-ink">código de cierre</strong>. Un trabajo queda confirmado cuando: (a) el Cliente lo confirma en la Plataforma; (b) el Prestador ingresa el código de cierre que le da el Cliente; o (c) el Prestador lo marca como terminado y el Cliente no lo confirma ni reporta un problema dentro de las 72 horas. El Cliente debe dar el código solo cuando el trabajo esté terminado y conforme.</li>
            <li>El Prestador puede registrar su llegada al domicilio (&quot;Llegué&quot;), compartiendo su ubicación en ese momento.</li>
          </ul>
        </section>

        <section>
          <h2>7. Plan de cobro a Prestadores</h2>
          <ul>
            <li>Oficy le cobra al Prestador un monto fijo por cada trabajo confirmado en la Plataforma, con un tope mensual. Los montos vigentes se informan en la sección &quot;Mi plan&quot; de la Plataforma. [Completar o confirmar: hoy $3.000 por trabajo, tope de $30.000 por mes].</li>
            <li>Los primeros [2] Prestadores de cada rubro designados por Oficy como &quot;Prestadores fundadores&quot; no pagan este cargo durante [12] meses desde su designación. Oficy puede retirar el beneficio ante un incumplimiento de estos Términos.</li>
            <li>El día 1 de cada mes Oficy genera un resumen con los trabajos confirmados del mes anterior. El resumen vence el día [10] y se paga por Mercado Pago u otro medio que Oficy habilite.</li>
            <li>Si el resumen no se paga dentro de los [5] días posteriores al vencimiento, la cuenta del Prestador queda suspendida: no aparece en las búsquedas ni puede chatear con Clientes (salvo en trabajos ya aceptados) hasta que regularice el pago.</li>
            <li>Oficy puede modificar los montos, el tope o las condiciones del plan con aviso previo a los Prestadores. Los cambios aplican desde el período siguiente al aviso.</li>
          </ul>
        </section>

        <section>
          <h2>8. Cancelaciones, reclamos y disputas</h2>
          <p>
            Si un trabajo no se realiza como fue acordado, el Cliente y el Prestador deben intentar resolverlo
            directamente a través del chat de la Plataforma. El Cliente puede reportar un problema desde la
            Plataforma (&quot;Hubo un problema&quot;), y el Prestador puede reportar que el Cliente no estaba en el
            domicilio. En esos casos el trabajo queda en revisión y Oficy puede intervenir para mediar.
          </p>
          <p>
            Como el pago se hace directamente entre Cliente y Prestador, <strong className="text-ink">Oficy no
            realiza reembolsos</strong> del precio del trabajo. Según el caso, Oficy puede anular el cargo del
            Prestador por ese trabajo, advertirlo, suspender su cuenta o darla de baja.
          </p>
        </section>

        <section>
          <h2>9. Calificaciones y reseñas</h2>
          <p>
            Las calificaciones reflejan la opinión honesta de quien las escribe sobre un trabajo real y contratado a
            través de Oficy. Está prohibido publicar reseñas falsas, contratar trabajos ficticios para inflar una
            calificación, o presionar a la otra parte para modificar una reseña ya publicada.
          </p>
        </section>

        <section>
          <h2>10. Conducta prohibida</h2>
          <ul>
            <li>Usar la Plataforma para actividades ilegales, fraudulentas o que pongan en riesgo a otros usuarios.</li>
            <li>Publicar contenido falso, ofensivo, discriminatorio o que infrinja derechos de terceros.</li>
            <li>Acordar por fuera de la Plataforma un trabajo con un Cliente o Prestador conocido a través de Oficy, o no registrar en la Plataforma un trabajo acordado por ella, con el fin de evitar el cargo por trabajo.</li>
            <li>Intentar compartir teléfonos, mails u otros datos de contacto antes de que se acepte una oferta. Oficy oculta automáticamente esos datos en el chat hasta ese momento y registra los intentos.</li>
            <li>Suplantar la identidad de otra persona o crear cuentas falsas.</li>
            <li>Intentar vulnerar la seguridad de la Plataforma.</li>
          </ul>
          <p>El incumplimiento de cualquiera de estos puntos puede resultar en la suspensión o baja definitiva de la cuenta, sin perjuicio de las acciones legales que correspondan.</p>
        </section>

        <section>
          <h2>11. Propiedad intelectual</h2>
          <p>
            El nombre Oficy, su logo, diseño y el software de la Plataforma son propiedad de [Razón social] o de sus
            licenciantes. Los Usuarios conservan los derechos sobre el contenido que suben (fotos de perfil, fotos de
            trabajos, comentarios de reseñas), pero le otorgan a Oficy una licencia para mostrarlo dentro de la
            Plataforma como parte normal de su funcionamiento.
          </p>
        </section>

        <section>
          <h2>12. Limitación de responsabilidad</h2>
          <p>
            Oficy actúa como intermediario tecnológico. En la máxima medida permitida por la ley aplicable, Oficy no
            es responsable por: la calidad, seguridad o resultado de los trabajos realizados por un Prestador; daños
            materiales o personales ocurridos durante la prestación de un servicio; el incumplimiento de un Cliente o
            Prestador de lo acordado entre ellos; el pago del trabajo, que se hace directamente entre Cliente y
            Prestador; ni por interrupciones del servicio de terceros (Mercado Pago, proveedores de infraestructura)
            fuera de nuestro control razonable.
          </p>
        </section>

        <section>
          <h2>13. Suspensión y baja de cuentas</h2>
          <p>
            Oficy puede suspender o dar de baja una cuenta, con o sin aviso previo, ante un incumplimiento de estos
            Términos, una denuncia fundada de otro usuario, o una sospecha razonable de fraude.
          </p>
        </section>

        <section>
          <h2>14. Modificaciones a estos Términos</h2>
          <p>
            Podemos actualizar estos Términos en cualquier momento. Los cambios importantes se van a avisar dentro de
            la Plataforma. El uso continuado de Oficy después de una actualización implica la aceptación de los
            nuevos Términos.
          </p>
        </section>

        <section>
          <h2>15. Ley aplicable y jurisdicción</h2>
          <p>
            Estos Términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a los
            tribunales ordinarios de [completar: ciudad/jurisdicción], sin perjuicio de los derechos que la Ley de
            Defensa del Consumidor (Ley 24.240) le reconozca al Usuario que actúe como consumidor.
          </p>
        </section>

        <section>
          <h2>16. Contacto</h2>
          <p>
            Ante cualquier consulta sobre estos Términos, podés escribirnos a{" "}
            <a href="mailto:legal@oficy.ar" className="text-copper-text hover:underline">legal@oficy.ar</a>.
          </p>
        </section>

        <p className="text-xs text-ink-muted mt-4 border-t border-ink/10 pt-4">
          Este documento es un borrador inicial pensado para reflejar cómo funciona Oficy hoy. Antes de publicarlo o
          de lanzar la aplicación al público, revisalo con un abogado para adaptarlo a tu estructura legal real y
          confirmar que cumple con la normativa vigente (Ley de Defensa del Consumidor, facturación del cargo a
          Prestadores, y el tratamiento de la ubicación compartida en el check-in en la Política de Privacidad).
        </p>
      </div>
    </div>
  );
}
