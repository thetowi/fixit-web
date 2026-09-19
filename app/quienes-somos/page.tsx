export const metadata = {
  title: "Quiénes somos | FixIt",
};

export default function QuienesSomosPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16 p-6 w-full pb-24">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Nuestra historia</p>
      <h1 className="font-display text-2xl text-ink mb-8">Quiénes somos</h1>

      <div className="flex flex-col gap-5 text-sm text-ink/80 leading-relaxed">
        <p>
          FixIt nació en 2026 en Paraná, Entre Ríos, de la mano de dos hermanos: Tobias Triano y
          Misael Triano.
        </p>

        <p>
          A Tobias siempre le gustó la programación y los sistemas, y estuvo a cargo del desarrollo
          de la aplicación de punta a punta. A Misael siempre le gustaron las ventas, y hoy está a
          cargo de la distribución del producto y de la satisfacción de cada cliente.
        </p>

        <p>
          La idea surgió de algo bien concreto: numerosas malas experiencias propias contratando
          servicios de oficios para la casa. Un electricista que no volvía a atender el teléfono,
          un trabajo sin ninguna garantía, la incertidumbre de no saber si la persona que ibas a
          dejar entrar a tu casa era de confianza o no. Con el tiempo nos dimos cuenta de que no
          era un problema nuestro nada más: es un rubro entero que quedó atrás en el tiempo, que
          nunca se actualizó como correspondía, sin protección para ninguna de las dos partes y sin
          dar el salto a la digitalización que ya tuvieron tantos otros sectores.
        </p>

        <p>
          De ahí nació FixIt: una herramienta digital pensada para beneficiar tanto al Cliente como
          al Prestador, dándole a la relación algo que hoy no existe en este rubro — transparencia,
          seguridad y una valoración pública real. Que un prestador tenga un perfil visible, con sus
          trabajos y sus calificaciones a la vista de cualquiera, y no dependa solamente de que
          &quot;alguien lo conoce por el boca en boca&quot;. Que sea una persona registrada, correcta
          y honesta — y que eso no lo sepamos solo nosotros, sino que lo pueda ver cualquiera antes
          de contratarlo.
        </p>

        <p>
          Eso es FixIt hoy: un intento honesto de resolver, con tecnología, un problema que vivimos
          en carne propia.
        </p>
      </div>
    </div>
  );
}
