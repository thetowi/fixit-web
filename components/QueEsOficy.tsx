"use client";

// Sección "Qué es Oficy" de la landing (21/10, a pedido del usuario, por recomendación del polo
// tecnológico: "inmediatamente debajo del primer div, algo donde expliquemos qué es Oficy, qué
// problema intenta resolver y cómo es el método para resolverlo"). Va justo debajo del hero.
//
// Muestra uno de dos videos según el perfil que elija el visitante (cliente o profesional), en
// /public/videos. Cada perfil tiene dos versiones (21/10): horizontal 16:9 para pantallas grandes
// y cuadrada para celular (en un celular el horizontal quedaba chico). Las cuatro tienen música,
// pero arrancan en silencio porque los navegadores solo dejan reproducir solo un video si está
// silenciado; el botón "Activar sonido" la prende. Se reproducen apenas el video entra en
// pantalla, en loop, y se pausan al salir; quien tiene activado "reducir movimiento" ve la
// portada y lo reproduce a mano. Las versiones en alta calidad para redes están fuera del repo
// (carpeta "Claude outputs").

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

type Perfil = "cliente" | "prestador";

const CONTENIDO: Record<
  Perfil,
  {
    etiqueta: string;
    video: string;
    poster: string;
    videoCuadrado: string;
    posterCuadrado: string;
    puntos: [string, string][];
    cta: string;
    href: string;
  }
> = {
  cliente: {
    etiqueta: "Necesito un arreglo",
    video: "/videos/oficy-clientes.mp4",
    poster: "/videos/oficy-clientes.jpg",
    videoCuadrado: "/videos/oficy-clientes-cuadrado.mp4",
    posterCuadrado: "/videos/oficy-clientes-cuadrado.jpg",
    puntos: [
      ["Profesionales verificados", "DNI, antecedentes y matrícula revisados."],
      ["Pago protegido", "La plata queda en Oficy hasta que confirmás el trabajo."],
      ["Si algo sale mal", "Reembolso si no se presenta o el trabajo no se corrige."],
    ],
    cta: "Crear cuenta gratis",
    href: "/registro",
  },
  prestador: {
    etiqueta: "Soy profesional",
    video: "/videos/oficy-profesionales.mp4",
    poster: "/videos/oficy-profesionales.jpg",
    videoCuadrado: "/videos/oficy-profesionales-cuadrado.mp4",
    posterCuadrado: "/videos/oficy-profesionales-cuadrado.jpg",
    puntos: [
      ["Clientes de tu zona", "Pedidos nuevos cerca tuyo, con chat directo."],
      ["Cobro asegurado", "El cliente paga antes de que arranques."],
      ["5 trabajos sin comisión", "Para que pruebes Oficy sin riesgo."],
    ],
    cta: "Quiero ofrecer mis servicios",
    href: "/registro?rol=prestador",
  },
};

export default function QueEsOficy() {
  const [perfil, setPerfil] = useState<Perfil>("cliente");
  const [reproduciendo, setReproduciendo] = useState(false);
  const [silencio, setSilencio] = useState(true);
  // Celular = pantalla angosta (menos de 640 px, el "sm" de Tailwind): ahí va el video cuadrado.
  const [celular, setCelular] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visible = useRef(false);
  // Si la persona pausó a mano (o pidió reducir movimiento), no lo volvemos a arrancar solos.
  const pausadoAMano = useRef(false);

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 639px)");
    const actualizar = () => setCelular(consulta.matches);
    actualizar();
    consulta.addEventListener("change", actualizar);
    return () => consulta.removeEventListener("change", actualizar);
  }, []);

  useEffect(() => {
    pausadoAMano.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        visible.current = entrada.isIntersecting;
        if (entrada.isIntersecting && !pausadoAMano.current) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.4 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  // Al cambiar de perfil (o de horizontal a cuadrado) cambia el src: se recarga, mantiene el
  // sonido como estaba y, si corresponde, sigue reproduciendo.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.muted = silencio;
    if (visible.current && !pausadoAMano.current) video.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil, celular]);

  // React no actualiza bien el atributo "muted" después del primer render: se maneja a mano.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = silencio;
  }, [silencio]);

  function alternar() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      pausadoAMano.current = false;
      video.play().catch(() => {});
    } else {
      pausadoAMano.current = true;
      video.pause();
    }
  }

  const c = CONTENIDO[perfil];

  return (
    <section aria-labelledby="que-es-oficy" className="w-full px-4 sm:px-6 py-16 sm:py-20 border-t border-ink/10">
      <div className="max-w-5xl mx-auto text-center">
        <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">Qué es Oficy</p>
        <h2 id="que-es-oficy" className="font-display text-3xl sm:text-4xl text-ink tracking-tight max-w-3xl mx-auto">
          Contratar un oficio, con la confianza de comprar online
        </h2>
        <p className="text-ink/70 leading-relaxed max-w-2xl mx-auto mt-4">
          Conectamos a quien necesita un arreglo con profesionales verificados de su zona. El precio se acuerda
          antes y la plata queda protegida hasta que el trabajo está hecho.
        </p>

        <div role="tablist" aria-label="Elegí tu perfil" className="inline-flex bg-ink/5 rounded-xl p-1 mt-8">
          {(Object.keys(CONTENIDO) as Perfil[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={perfil === p}
              onClick={() => setPerfil(p)}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm sm:text-[15px] font-medium transition-colors ${
                perfil === p ? "bg-surface text-ink shadow-sm" : "text-ink/55 hover:text-ink"
              }`}
            >
              {CONTENIDO[p].etiqueta}
            </button>
          ))}
        </div>

        <div className="relative mt-6 mx-auto max-w-4xl aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-[#1B1B18] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]">
          <video
            ref={videoRef}
            src={celular ? c.videoCuadrado : c.video}
            poster={celular ? c.posterCuadrado : c.poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={`Video: cómo funciona Oficy para ${perfil === "cliente" ? "clientes" : "profesionales"}`}
            onPlay={() => setReproduciendo(true)}
            onPause={() => setReproduciendo(false)}
            className="w-full h-full object-cover"
          />
          <div className="absolute right-3 bottom-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSilencio((s) => !s)}
              aria-pressed={!silencio}
              className="flex items-center gap-1.5 bg-black/55 text-white text-xs font-medium rounded-full px-3 py-2 backdrop-blur hover:bg-black/70 transition-colors"
            >
              {silencio ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {silencio ? "Activar sonido" : "Silenciar"}
            </button>
            <button
              type="button"
              onClick={alternar}
              className="flex items-center gap-1.5 bg-black/55 text-white text-xs font-medium rounded-full px-3 py-2 backdrop-blur hover:bg-black/70 transition-colors"
            >
              {reproduciendo ? <Pause size={14} /> : <Play size={14} />}
              {reproduciendo ? "Pausar" : "Reproducir"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl mx-auto mt-5 text-left">
          {c.puntos.map(([titulo, texto]) => (
            <div key={titulo} className="bg-surface border border-ink/10 rounded-xl p-4">
              <p className="font-medium text-ink text-sm">{titulo}</p>
              <p className="text-sm text-ink/60 leading-relaxed mt-1">{texto}</p>
            </div>
          ))}
        </div>

        <Link
          href={c.href}
          className="inline-block mt-7 bg-copper text-paper rounded px-6 py-3 font-medium hover:bg-copper-dark transition-colors"
        >
          {c.cta}
        </Link>
      </div>
    </section>
  );
}
