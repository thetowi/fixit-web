export const metadata = {
  title: "Términos y Condiciones | FixIt",
};

export default function TerminosPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full pb-24">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Legal</p>
      <h1 className="font-display text-2xl text-ink mb-1">Términos y Condiciones</h1>
      <p className="text-xs text-ink/40 mb-8">Última actualización: [completar fecha antes de publicar]</p>

      <div className="flex flex-col gap-6 text-sm text-ink/80 leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-ink [&_h2]:mb-2 [&_h2]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">

        <section>
          <h2>1. Quiénes somos y a qué se aplican estos Términos</h2>
          <p>
            FixIt (&quot;FixIt&quot;, &quot;la Plataforma&quot;, &quot;nosotros&quot;) es operada por [Razón social /
            nombre completo del titular], CUIT [completar], con domicilio en [completar domicilio legal], República
            Argentina. Estos Términos y Condiciones (&quot;Términos&quot;) regulan el uso de la aplicación y el sitio
            web de FixIt por parte de cualquier persona que se registre como Cliente o Prestador (en conjunto,
            &quot;Usuarios&quot;).
          </p>
          <p>
            Al crear una cuenta o usar FixIt de cualquier forma, aceptás estos Términos y nuestra{" "}
            <a href="/privacidad" className="text-copper hover:underline">Política de Privacidad</a>. Si no estás de
            acuerdo, no debés usar la Plataforma.
          </p>
        </section>

        <section>
          <h2>2. Qué es FixIt (y qué no es)</h2>
          <p>
            FixIt es un marketplace: un espacio digital que conecta a personas que necesitan un servicio de oficios
            (&quot;Clientes&quot;) con personas o profesionales independientes que los ofrecen (&quot;Prestadores&quot;).
          </p>
          <p>
            <strong className="text-ink">FixIt no presta los servicios de oficios en sí mismos</strong> (plomería,
            electricidad, albañilería, etc.), no emplea a los Prestadores, y no es parte del acuerdo de trabajo que
            se celebra entre un Cliente y un Prestador. Cada Prestador actúa como contratista independiente, responsable
            de la calidad, legalidad, seguridad y cumplimiento del trabajo que ofrece. FixIt facilita el contacto, la
            comunicación, la programación del turno y el cobro del trabajo, pero no supervisa ni dirige cómo se
            realiza cada trabajo.
          </p>
        </section>

        <section>
          <h2>3. Registro y cuentas</h2>
          <ul>
            <li>Tenés que ser mayor de 18 años para registrarte en FixIt.</li>
            <li>Los datos que cargues (nombre, email, teléfono, y en el caso de Prestadores, documentación de verificación) tienen que ser reales, completos y estar actualizados.</li>
            <li>Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra en tu cuenta.</li>
            <li>Cada persona puede tener una única cuenta. FixIt puede suspender o dar de baja cuentas duplicadas, falsas o que incumplan estos Términos.</li>
          </ul>
        </section>

        <section>
          <h2>4. Verificación de Prestadores</h2>
          <p>
            Los Prestadores pueden enviar documentación (DNI, certificado de antecedentes penales, matrícula del
            rubro cuando corresponda) para obtener la insignia de &quot;Verificado&quot;. Esta verificación es
            revisada por un administrador de FixIt, pero <strong className="text-ink">no constituye una garantía
            absoluta</strong> de la idoneidad, buena conducta o legalidad de la actividad del Prestador — es una
            señal adicional de confianza, no una certificación profesional emitida por un colegio u organismo
            regulador. FixIt puede rechazar, suspender o revocar la verificación de cualquier Prestador a su
            criterio, incluso después de haberla otorgado.
          </p>
        </section>

        <section>
          <h2>5. Publicación de servicios, ofertas y contratación</h2>
          <p>
            Los precios que cargan los Prestadores son de referencia (por hora). El monto final de cada trabajo se
            acuerda entre Cliente y Prestador a través del chat de la Plataforma, mediante una oferta con un monto y
            una descripción del trabajo. Al aceptar y pagar una oferta, el Cliente y el Prestador celebran un acuerdo
            directo entre ellos — FixIt no es parte de ese acuerdo, solo provee la herramienta para formalizarlo y
            cobrarlo.
          </p>
        </section>

        <section>
          <h2>6. Pagos, comisión y retención</h2>
          <ul>
            <li>Los pagos se procesan a través de Mercado Pago. FixIt no almacena números de tarjeta ni datos financieros sensibles: eso lo maneja Mercado Pago bajo sus propios términos.</li>
            <li>Cuando un Cliente paga una oferta, el dinero <strong className="text-ink">queda retenido</strong> hasta que el trabajo se marca como completado y el Cliente lo confirma. Recién en ese momento se libera al Prestador.</li>
            <li>FixIt cobra una comisión sobre cada trabajo cobrado por un Prestador, descontada automáticamente al momento del pago. [Completar: porcentaje de comisión vigente]. Los primeros [10] trabajos cobrados por cada Prestador nuevo están exentos de esta comisión, como promoción de lanzamiento sujeta a cambios.</li>
            <li>FixIt puede modificar el porcentaje de comisión o las condiciones de la promoción en cualquier momento, con aviso previo a los Prestadores.</li>
          </ul>
        </section>

        <section>
          <h2>7. Cancelaciones, reclamos y disputas</h2>
          <p>
            Si un trabajo no se realiza como fue acordado, el Cliente y el Prestador deben intentar resolverlo
            directamente a través del chat de la Plataforma. FixIt puede intervenir para mediar o revisar un reclamo,
            pero no garantiza un resultado determinado y puede, a su criterio, liberar o retener fondos mientras el
            reclamo esté en curso. [Completar: definir y publicar acá el proceso concreto de reclamos/reembolsos
            antes del lanzamiento — hoy no hay un flujo de reembolsos construido en la Plataforma].
          </p>
        </section>

        <section>
          <h2>8. Calificaciones y reseñas</h2>
          <p>
            Las calificaciones reflejan la opinión honesta de quien las escribe sobre un trabajo real y contratado a
            través de FixIt. Está prohibido publicar reseñas falsas, contratar trabajos ficticios para inflar una
            calificación, o presionar a la otra parte para modificar una reseña ya publicada.
          </p>
        </section>

        <section>
          <h2>9. Conducta prohibida</h2>
          <ul>
            <li>Usar la Plataforma para actividades ilegales, fraudulentas o que pongan en riesgo a otros usuarios.</li>
            <li>Publicar contenido falso, ofensivo, discriminatorio o que infrinja derechos de terceros.</li>
            <li>Contactar a un Cliente o Prestador conocido a través de FixIt para acordar el pago por fuera de la Plataforma con el fin de evitar la comisión.</li>
            <li>Suplantar la identidad de otra persona o crear cuentas falsas.</li>
            <li>Intentar vulnerar la seguridad de la Plataforma.</li>
          </ul>
          <p>El incumplimiento de cualquiera de estos puntos puede resultar en la suspensión o baja definitiva de la cuenta, sin perjuicio de las acciones legales que correspondan.</p>
        </section>

        <section>
          <h2>10. Propiedad intelectual</h2>
          <p>
            El nombre FixIt, su logo, diseño y el software de la Plataforma son propiedad de [Razón social] o de sus
            licenciantes. Los Usuarios conservan los derechos sobre el contenido que suben (fotos de perfil, fotos de
            trabajos, comentarios de reseñas), pero le otorgan a FixIt una licencia para mostrarlo dentro de la
            Plataforma como parte normal de su funcionamiento.
          </p>
        </section>

        <section>
          <h2>11. Limitación de responsabilidad</h2>
          <p>
            FixIt actúa como intermediario tecnológico. En la máxima medida permitida por la ley aplicable, FixIt no
            es responsable por: la calidad, seguridad o resultado de los trabajos realizados por un Prestador; daños
            materiales o personales ocurridos durante la prestación de un servicio; el incumplimiento de un Cliente o
            Prestador de lo acordado entre ellos; ni por interrupciones del servicio de terceros (Mercado Pago,
            proveedores de infraestructura) fuera de nuestro control razonable.
          </p>
        </section>

        <section>
          <h2>12. Suspensión y baja de cuentas</h2>
          <p>
            FixIt puede suspender o dar de baja una cuenta, con o sin aviso previo, ante un incumplimiento de estos
            Términos, una denuncia fundada de otro usuario, o una sospecha razonable de fraude.
          </p>
        </section>

        <section>
          <h2>13. Modificaciones a estos Términos</h2>
          <p>
            Podemos actualizar estos Términos en cualquier momento. Los cambios importantes se van a avisar dentro de
            la Plataforma. El uso continuado de FixIt después de una actualización implica la aceptación de los
            nuevos Términos.
          </p>
        </section>

        <section>
          <h2>14. Ley aplicable y jurisdicción</h2>
          <p>
            Estos Términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a los
            tribunales ordinarios de [completar: ciudad/jurisdicción], sin perjuicio de los derechos que la Ley de
            Defensa del Consumidor (Ley 24.240) le reconozca al Usuario que actúe como consumidor.
          </p>
        </section>

        <section>
          <h2>15. Contacto</h2>
          <p>
            Ante cualquier consulta sobre estos Términos, podés escribirnos a [completar email de contacto].
          </p>
        </section>

        <p className="text-xs text-ink/40 mt-4 border-t border-ink/10 pt-4">
          Este documento es un borrador inicial pensado para reflejar cómo funciona FixIt hoy. Antes de publicarlo o
          de lanzar la aplicación al público, revisalo con un abogado para adaptarlo a tu estructura legal real y
          confirmar que cumple con la normativa vigente (Ley de Defensa del Consumidor, y cualquier regulación
          aplicable a plataformas que retienen e intermedian pagos de terceros).
        </p>
      </div>
    </div>
  );
}
