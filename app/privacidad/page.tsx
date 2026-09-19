export const metadata = {
  title: "Política de Privacidad | FixIt",
};

export default function PrivacidadPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full pb-24">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Legal</p>
      <h1 className="font-display text-2xl text-ink mb-1">Política de Privacidad</h1>
      <p className="text-xs text-ink/40 mb-8">Última actualización: [completar fecha antes de publicar]</p>

      <div className="flex flex-col gap-6 text-sm text-ink/80 leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-ink [&_h2]:mb-2 [&_h2]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">

        <section>
          <h2>1. Responsable del tratamiento</h2>
          <p>
            Esta Política de Privacidad describe cómo FixIt (&quot;FixIt&quot;, &quot;la Plataforma&quot;,
            &quot;nosotros&quot;), operada por [Razón social / nombre completo del titular], CUIT [completar], con
            domicilio en [completar domicilio legal], República Argentina, recopila, usa, comparte y protege los
            datos personales de quienes usan la aplicación y el sitio web de FixIt como Cliente o Prestador
            (&quot;Usuarios&quot;).
          </p>
          <p>
            Al crear una cuenta o usar FixIt de cualquier forma, aceptás esta Política y nuestros{" "}
            <a href="/terminos" className="text-copper hover:underline">Términos y Condiciones</a>.
          </p>
        </section>

        <section>
          <h2>2. Qué datos recopilamos</h2>
          <ul>
            <li><strong className="text-ink">Datos de identificación y contacto:</strong> nombre, email, teléfono, y, en el caso de Prestadores, DNI y otra documentación de verificación (certificado de antecedentes penales, matrícula del rubro cuando corresponda).</li>
            <li><strong className="text-ink">Datos de ubicación:</strong> dirección o zona de cobertura que cargás, y tu ubicación aproximada si nos das permiso para usarla al buscar prestadores cerca tuyo.</li>
            <li><strong className="text-ink">Contenido que subís:</strong> foto de perfil, fotos de trabajos, reseñas y calificaciones.</li>
            <li><strong className="text-ink">Mensajes:</strong> el contenido de las conversaciones del chat entre Cliente y Prestador dentro de la Plataforma.</li>
            <li><strong className="text-ink">Datos de pago:</strong> FixIt no almacena números de tarjeta ni datos financieros sensibles. Los pagos se procesan a través de Mercado Pago, que maneja esos datos bajo su propia política de privacidad. FixIt sí recibe y guarda información sobre las transacciones (montos, fechas, estado del pago) para llevar el registro de tus órdenes.</li>
            <li><strong className="text-ink">Datos técnicos y de uso:</strong> información del dispositivo, dirección IP, y datos guardados localmente en tu navegador o app (ver sección 8, Cookies y almacenamiento local).</li>
          </ul>
        </section>

        <section>
          <h2>3. Para qué usamos tus datos</h2>
          <ul>
            <li>Crear y administrar tu cuenta, y verificar tu identidad cuando corresponda.</li>
            <li>Conectar Clientes y Prestadores, mostrar resultados de búsqueda relevantes y facilitar la comunicación entre ambos.</li>
            <li>Procesar pagos, retener y liberar fondos según el estado de cada trabajo, y calcular la comisión de FixIt.</li>
            <li>Enviarte notificaciones sobre tus órdenes, mensajes y turnos agendados.</li>
            <li>Mejorar la Plataforma, prevenir fraude y hacer cumplir nuestros Términos y Condiciones.</li>
            <li>Cumplir con obligaciones legales o requerimientos de autoridades competentes.</li>
          </ul>
        </section>

        <section>
          <h2>4. Con quién compartimos tus datos</h2>
          <p>
            <strong className="text-ink">FixIt no vende tus datos personales a terceros.</strong> Compartimos datos
            únicamente en la medida necesaria para que la Plataforma funcione:
          </p>
          <ul>
            <li><strong className="text-ink">Con otros Usuarios:</strong> tu nombre, foto, calificaciones y, cuando corresponda, tu ubicación o zona de cobertura son visibles para la contraparte de un trabajo (Cliente o Prestador) o de una búsqueda.</li>
            <li><strong className="text-ink">Mercado Pago:</strong> para procesar cobros y pagos.</li>
            <li><strong className="text-ink">Proveedores de infraestructura:</strong> como el hosting, la base de datos (por ejemplo, Supabase) y servicios de almacenamiento de imágenes, que procesan datos en nuestro nombre bajo acuerdos de confidencialidad.</li>
            <li><strong className="text-ink">Autoridades:</strong> cuando la ley lo exija o para responder a un requerimiento judicial válido.</li>
          </ul>
        </section>

        <section>
          <h2>5. Conservación de datos</h2>
          <p>
            Conservamos tus datos mientras tu cuenta esté activa y por el tiempo adicional necesario para cumplir
            obligaciones legales, contables o fiscales, o para resolver disputas relacionadas con trabajos ya
            realizados. Si eliminás tu cuenta, podemos conservar cierta información (por ejemplo, historial de
            transacciones) durante el plazo que exija la normativa aplicable.
          </p>
        </section>

        <section>
          <h2>6. Tus derechos</h2>
          <p>
            De acuerdo con la Ley de Protección de Datos Personales (Ley 25.326), tenés derecho a acceder, rectificar,
            actualizar o suprimir tus datos personales, así como a revocar el consentimiento que hayas dado para su
            tratamiento. Para ejercer estos derechos, escribinos a [completar email de contacto]. También podés
            presentar un reclamo ante la Agencia de Acceso a la Información Pública, el organismo de control de esta
            ley, si considerás que tus derechos no fueron respetados.
          </p>
        </section>

        <section>
          <h2>7. Seguridad</h2>
          <p>
            Tomamos medidas técnicas y organizativas razonables para proteger tus datos contra accesos no
            autorizados, pérdida o alteración. Ningún sistema es 100% seguro, así que no podemos garantizar una
            protección absoluta, pero trabajamos para mantener nuestras prácticas de seguridad actualizadas.
          </p>
        </section>

        <section>
          <h2>8. Cookies y almacenamiento local</h2>
          <p>
            FixIt usa almacenamiento local del navegador (por ejemplo, <code>localStorage</code>) para mantener tu
            sesión iniciada, recordar tu preferencia de tema (claro/oscuro) y saber si ya viste el tutorial de
            bienvenida. No usamos estas tecnologías para rastrearte en otros sitios ni para publicidad de terceros.
          </p>
        </section>

        <section>
          <h2>9. Menores de edad</h2>
          <p>
            FixIt no está dirigido a menores de 18 años y no recopilamos intencionalmente datos de menores. Si
            creemos que una cuenta pertenece a un menor, podemos suspenderla.
          </p>
        </section>

        <section>
          <h2>10. Cambios a esta Política</h2>
          <p>
            Podemos actualizar esta Política en cualquier momento. Los cambios importantes se van a avisar dentro de
            la Plataforma. El uso continuado de FixIt después de una actualización implica la aceptación de la nueva
            versión.
          </p>
        </section>

        <section>
          <h2>11. Contacto</h2>
          <p>
            Ante cualquier consulta sobre esta Política o sobre tus datos personales, podés escribirnos a [completar
            email de contacto].
          </p>
        </section>

        <p className="text-xs text-ink/40 mt-4 border-t border-ink/10 pt-4">
          Este documento es un borrador inicial pensado para reflejar cómo funciona FixIt hoy. Antes de publicarlo o
          de lanzar la aplicación al público, revisalo con un abogado para adaptarlo a tu estructura legal real y
          confirmar que cumple con la Ley de Protección de Datos Personales (Ley 25.326) y cualquier otra normativa
          aplicable.
        </p>
      </div>
    </div>
  );
}
