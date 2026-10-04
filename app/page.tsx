"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MessageCircle,
  ShieldCheck,
  Wrench,
  BadgeCheck,
  CircleDollarSign,
  HardHat,
  Trophy,
  Eye,
  Globe,
} from "lucide-react";
// Logos reales de Apple/Google Play para los botones de tienda (03/10, a pedido del usuario) —
// lucide-react no tiene logos de marca, así que usamos react-icons/si (paquete "Simple Icons"),
// que sí los tiene. Hay que instalarlo: ver nota en el mensaje de chat.
import { SiApple, SiGoogleplay } from "react-icons/si";
import { apiFetch } from "@/lib/api";
import { obtenerUsuario } from "@/lib/auth";
import { Categoria } from "@/types/categorias";
import { TrabajoDestacado, EstadisticasPublicas } from "@/types/publico";
import IconoLucide from "@/components/IconoLucide";
import Estrellas from "@/components/Estrellas";
import LandingFooter from "@/components/LandingFooter";
import FaqAcordeon, { PreguntaFrecuente } from "@/components/FaqAcordeon";
import TrabajoEnCursoPreview from "@/components/TrabajoEnCursoPreview";
import ContadorAnimado from "@/components/ContadorAnimado";
import ChatEnVivoPreview from "@/components/ChatEnVivoPreview";
import GrillaRubros from "@/components/GrillaRubros";
import TypewriterRubros from "@/components/TypewriterRubros";
import { irAlDashboard } from "@/lib/dominio";

// Palabras del eyebrow del hero mientras todavía no llegaron las categorías reales del backend
// (o si esa llamada falla) — mismo texto que estaba antes hardcodeado ahí.
const RUBROS_EYEBROW_POR_DEFECTO = ["Plomería", "Electricidad", "Gas", "Jardinería", "y más"];

// Botones "Disponible en App Store / Play Store" del hero (03/10, a pedido del usuario).
// TODO: reemplazar estos dos links placeholder por los reales apenas la app esté publicada en
// cada tienda — hoy (03/10) ninguna de las dos build de producción existe todavía: iOS sigue
// bloqueado por el "Enrollment pending" de Apple Developer y Android todavía no tiene el build
// de producción armado para Play Store (ver claude/backlog.md, puntos de iOS/Android). Mientras
// tanto quedan clickeables e igual de vistosos que el resto, para no tener que volver a tocar el
// diseño cuando llegue el link real — solo hay que pisar estas dos constantes.
const URL_APP_STORE = "https://apps.apple.com/app/TODO-reemplazar-cuando-este-publicada";
const URL_PLAY_STORE = "https://play.google.com/store/apps/details?id=TODO-reemplazar-cuando-este-publicada";

const PREGUNTAS_FRECUENTES: PreguntaFrecuente[] = [
  {
    pregunta: "¿Cómo funciona el pago? ¿Es seguro?",
    respuesta:
      "Vos pagás desde la app con Mercado Pago y esa plata queda retenida en Oficy, no en la cuenta del prestador. Recién se libera cuando marcás el trabajo como completado, así que nunca pagás por un trabajo que no se hizo.",
  },
  {
    pregunta: "¿Qué pasa si el prestador no se presenta?",
    respuesta:
      "Si programaste un turno y el prestador no lo inicia dentro de la hora, te reembolsamos el 100% de forma automática, sin que tengas que reclamar nada.",
  },
  {
    pregunta: "¿Cómo verifican a los prestadores?",
    respuesta:
      "Cada prestador tiene que subir su DNI y sus antecedentes penales, revisados por un administrador antes de poder ofrecer servicios. Los que tienen la insignia de verificado ya pasaron ese control.",
  },
  {
    pregunta: "¿Cuánto cuesta usar Oficy como cliente?",
    respuesta:
      "Nada. Buscar, chatear y coordinar con un prestador es gratis. Solo pagás el trabajo que contratás, al precio que acuerdes con el profesional.",
  },
  {
    pregunta: "¿Y si soy prestador, cuánto me cobran de comisión?",
    respuesta:
      "Tus primeros 10 trabajos cobrados no tienen ninguna comisión de Oficy. Después de eso, se descuenta una comisión chica sobre cada trabajo, siempre transparente antes de aceptar.",
  },
  {
    pregunta: "¿Puedo coordinar todo por chat antes de contratar?",
    respuesta:
      "Sí. Podés escribirle directo al prestador, mandar fotos del problema y acordar precio y horario antes de pagar nada.",
  },
];

// Landing publicitaria (24/09, ampliada 25/09 con estadísticas reales, FAQ, footer propio e
// insignias de confianza — a pedido del usuario: "que se vea más lindo... más como tegu.ar").
// Esto es "/" — 100% vidriera pública, sin datos de sesión de nadie. El dashboard operativo de
// antes se movió a "/app" (ver ese archivo) y acá abajo, si alguien YA tiene sesión iniciada, lo
// mandamos directo para allá.
export default function LandingPage() {
  const router = useRouter();
  const [listo, setListo] = useState(false);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [trabajos, setTrabajos] = useState<TrabajoDestacado[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPublicas | null>(null);

  useEffect(() => {
    // Nota (28/09, split de dominios): esto solo detecta la sesión cuando "/" se sirve en el
    // mismo origen que guardó el token — es decir, en desarrollo local o en cualquier host sin
    // el subdominio de la app. En producción, "/" vive en oficy.ar y el token queda guardado en
    // el localStorage de app.oficy.ar (otro origen), así que obtenerUsuario() acá siempre da
    // null — un visitante con sesión iniciada que entra directo a oficy.ar ve la landing en vez
    // de que lo mandemos al dashboard. Queda como mejora pendiente (necesitaría una cookie
    // compartida o una consulta al backend en vez de leer localStorage); no es un caso roto, es
    // una comodidad que se perdió al separar los dominios.
    if (obtenerUsuario()) {
      irAlDashboard(router, "replace");
      return;
    }
    setListo(true);
  }, [router]);

  useEffect(() => {
    apiFetch<Categoria[]>("/api/Categorias").then(setCategorias).catch(() => {});
    apiFetch<TrabajoDestacado[]>("/api/publico/trabajos-destacados").then(setTrabajos).catch(() => {});
    apiFetch<EstadisticasPublicas>("/api/publico/estadisticas").then(setEstadisticas).catch(() => {});
  }, []);

  // Mientras se confirma que no hay sesión, no mostramos nada (evita el parpadeo de ver la landing
  // medio segundo antes de saltar a /app si la persona ya estaba logueada).
  if (!listo) return null;

  return (
    <div className="flex-1 flex flex-col items-center">
      {/* Hero */}
      <div className="w-full px-6 pt-20 pb-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <TypewriterRubros
              palabras={
                categorias.length > 0 ? categorias.map((c) => c.nombre) : RUBROS_EYEBROW_POR_DEFECTO
              }
              className="font-mono text-xs tracking-widest text-copper uppercase mb-3 min-h-[1.2em] inline-block"
            />
            <h1 className="font-display text-4xl sm:text-5xl text-ink tracking-tight mb-4 max-w-xl">
              El oficio que necesitás, a la vuelta de la esquina
            </h1>
            <p className="text-ink/70 mb-8 max-w-lg">
              Contanos qué necesitás arreglar, elegí un profesional verificado cerca tuyo y pagá con
              confianza desde la app. Sin llamadas eternas ni presupuestos a ciegas.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Link
                href="/registro"
                className="bg-copper text-paper rounded px-6 py-3 font-medium hover:bg-copper-dark transition-colors"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/explorar"
                className="border border-ink/20 text-ink rounded px-6 py-3 font-medium hover:border-ink/40 transition-colors"
              >
                Ver rubros disponibles
              </Link>
            </div>
            <p className="text-xs text-ink/45 mt-4">
              ¿Ya tenés cuenta? <Link href="/login" className="text-copper hover:underline">Iniciá sesión</Link>
            </p>

            {/* Insignias de confianza (25/09) */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 mt-9 pt-6 border-t border-ink/10 w-full">
              {[
                { Icono: ShieldCheck, texto: "Pago protegido" },
                { Icono: BadgeCheck, texto: "Prestadores verificados" },
                { Icono: MessageCircle, texto: "Chat directo" },
                { Icono: CircleDollarSign, texto: "Buscar es gratis" },
              ].map(({ Icono, texto }) => (
                <div key={texto} className="flex items-center gap-2 text-ink/55">
                  <Icono size={16} strokeWidth={1.9} className="text-copper shrink-0" />
                  <span className="text-xs font-medium">{texto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup visual del hero (25/09, animado 25/09 a pedido del usuario: "que se vayan
              mandando mensajes... como medio en vivo" — ver ChatEnVivoPreview.tsx). En vez de
              dejar el hero solo con texto, una tarjeta tipo "chat" que muestra en concreto cómo
              se ve pedir un servicio — no tenemos fotos reales de trabajos para mostrar, así que
              optamos por algo fiel a la app en vez de una imagen de stock genérica. */}
          <div className="w-full max-w-sm mx-auto lg:mx-0">
            <ChatEnVivoPreview />
          </div>
        </div>

        {/* Tagline de origen (25/09, a pedido del usuario: destacar que Oficy es de Paraná) —
            grande, debajo del grid del hero (texto + mockup), pero todavía dentro de la sección
            del hero, antes de la barra de estadísticas. "Paraná" resaltado en cobre a propósito. */}
        <p className="text-center font-display text-2xl sm:text-3xl text-ink tracking-tight mt-14">
          Desde <span className="text-copper">Paraná</span>, hacia toda Argentina
        </p>

        {/* Botones de tienda + "Continuar en web" (03/10, a pedido del usuario) — debajo del
            tagline de origen, cerrando el hero. Los dos de tienda usan un link placeholder (ver
            URL_APP_STORE/URL_PLAY_STORE arriba) hasta que la app esté publicada de verdad. */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <a
            href={URL_APP_STORE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 border border-ink/20 rounded-xl px-5 py-2.5 hover:border-ink/40 transition-colors"
          >
            <SiApple size={20} className="text-ink/80" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] text-ink/50">Disponible en</span>
              <span className="text-sm font-medium text-ink">App Store</span>
            </span>
          </a>
          <a
            href={URL_PLAY_STORE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 border border-ink/20 rounded-xl px-5 py-2.5 hover:border-ink/40 transition-colors"
          >
            <SiGoogleplay size={18} className="text-ink/80" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] text-ink/50">Disponible en</span>
              <span className="text-sm font-medium text-ink">Play Store</span>
            </span>
          </a>
          {/* Va al subdominio operativo (app.oficy.ar), no a una ruta interna de "/" — por eso es
              un <a> normal y no un <Link> (mismo split de dominios que el resto del sitio, ver
              claude/backlog.md). */}
          <a
            href="https://app.oficy.ar/login"
            className="flex items-center gap-2 bg-copper text-paper rounded-xl px-5 py-2.5 font-medium hover:bg-copper-dark transition-colors"
          >
            <Globe size={18} />
            Continuar en web
          </a>
        </div>
      </div>

      {/* Barra de estadísticas reales (25/09, animada 25/09 a pedido del usuario: "que vaya de 0
          hasta donde llegue el numero" apenas la sección entra en pantalla — ver ContadorAnimado). */}
      {estadisticas && (
        <div className="w-full bg-ink px-6 py-8">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
            <div>
              <ContadorAnimado
                valor={estadisticas.trabajosCompletados}
                className="font-display text-3xl sm:text-4xl text-safety"
              />
              <p className="text-xs sm:text-sm text-paper/60 mt-1">Trabajos completados</p>
            </div>
            <div>
              <ContadorAnimado
                valor={estadisticas.prestadoresVerificados}
                className="font-display text-3xl sm:text-4xl text-safety"
              />
              <p className="text-xs sm:text-sm text-paper/60 mt-1">Prestadores verificados</p>
            </div>
            <div>
              <ContadorAnimado
                valor={estadisticas.rubrosDisponibles}
                className="font-display text-3xl sm:text-4xl text-safety"
              />
              <p className="text-xs sm:text-sm text-paper/60 mt-1">Rubros disponibles</p>
            </div>
          </div>
        </div>
      )}

      {/* Cómo funciona */}
      <div className="w-full bg-surface border-b border-ink/10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Era un "eyebrow" chico (font-mono text-xs) haciendo de único título de la sección —
              ese estilo en el resto de la página siempre va EMPAREJADO con un título grande abajo
              (ver "¿Sos un profesional del oficio?" más abajo); acá no había nada grande, así que
              se veía chico comparado con el resto (03/10, reportado por el usuario). */}
          <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight mb-8 text-center">
            Cómo funciona
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-copper/10 flex items-center justify-center text-copper">
                <Search size={22} strokeWidth={1.8} />
              </div>
              <p className="font-medium text-ink">1. Contanos qué necesitás</p>
              <p className="text-sm text-ink/60">
                Elegí el rubro y buscá prestadores verificados cerca de tu domicilio.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-copper/10 flex items-center justify-center text-copper">
                <MessageCircle size={22} strokeWidth={1.8} />
              </div>
              <p className="font-medium text-ink">2. Chateá y coordiná</p>
              <p className="text-sm text-ink/60">
                Hablá directo con el profesional, acordá el trabajo y agendá un turno.
              </p>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-copper/10 flex items-center justify-center text-copper">
                <ShieldCheck size={22} strokeWidth={1.8} />
              </div>
              <p className="font-medium text-ink">3. Pagá con confianza</p>
              <p className="text-sm text-ink/60">
                El pago queda retenido hasta que confirmás que el trabajo se completó.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trabajo en curso en vivo (25/09, a pedido del usuario: "que se vea como lo visualizaría
          un usuario") — muestra la pantalla real que ve el cliente mientras el prestador está
          trabajando en su domicilio, para que alguien nuevo entienda de entrada qué se siente
          usar Oficy, no solo que lo lea en texto. */}
      <div className="w-full px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="flex flex-col items-center md:items-start text-center md:text-left order-2 md:order-1">
            <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3">
              Mientras el trabajo pasa
            </p>
            <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight mb-4 max-w-sm">
              Mirá en vivo cómo avanza el trabajo en tu domicilio
            </h2>
            <p className="text-ink/70 max-w-sm">
              Apenas el prestador llega y arranca, la app te muestra un timer en vivo con el
              tiempo transcurrido — así sabés que está trabajando, sin tener que llamarlo ni
              preguntarle cómo va.
            </p>
          </div>
          <div className="order-1 md:order-2">
            <TrabajoEnCursoPreview />
          </div>
        </div>
      </div>

      {/* Rubros disponibles (25/09: son solo de referencia visual, a pedido del usuario — no
          navegan a /explorar/{id} como antes, porque desde la landing pública no queremos mandar
          directo a buscar prestadores de ese rubro puntual). La animación "wipe" cobre al hover
          y la de entrada en cascada (para mobile, donde no hay hover) viven en GrillaRubros.tsx. */}
      {categorias.length > 0 && (
        <div className="w-full max-w-4xl px-6 py-16">
          <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight mb-8 text-center">
            Rubros disponibles
          </h2>
          <GrillaRubros categorias={categorias} />
        </div>
      )}

      {/* Trabajos reales (24/09, al estilo "Trabajos hechos en Tegu") */}
      {trabajos.length > 0 && (
        <div className="w-full bg-surface border-y border-ink/10 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight mb-8 text-center">
              Trabajos hechos en Oficy
            </h2>
            {/* Desde el 27/09 cada tarjeta muestra la identidad completa del prestador (foto,
                nombre, promedio general) y linkea a su perfil — antes lo mostraba anonimizado. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {trabajos.map((t, i) => (
                <Link
                  key={i}
                  href={`/prestador/${t.prestadorId}`}
                  className="bg-paper border border-ink/10 rounded-lg overflow-hidden flex flex-col hover:border-copper/40 transition-colors"
                >
                  {t.fotosResena.length > 0 ? (
                    // grid-cols fijo en 3 dejaba columnas vacías cuando la reseña tenía 1 o 2
                    // fotos (03/10, reportado por el usuario con una captura) — la cantidad de
                    // columnas tiene que seguir a la cantidad real de fotos, hasta un máximo de 3.
                    <div
                      className={`grid gap-0.5 h-28 bg-ink/5 overflow-hidden ${
                        t.fotosResena.length === 1
                          ? "grid-cols-1"
                          : t.fotosResena.length === 2
                            ? "grid-cols-2"
                            : "grid-cols-3"
                      }`}
                    >
                      {t.fotosResena.slice(0, 3).map((url, j) => (
                        // Con 1 sola foto, la fila de la grilla crecía al tamaño natural de la
                        // imagen (el truco de "h-28 + object-cover" no alcanza si la celda no
                        // tiene su propio recorte) y tapaba el texto de abajo (03/10, reportado
                        // por el usuario). Cada celda ahora es "relative" + la foto "absolute
                        // inset-0", así la imagen no participa del cálculo de alto de la grilla.
                        <div key={j} className="relative w-full h-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Foto del trabajo"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-28 bg-copper/10 flex items-center justify-center text-copper">
                      <IconoLucide nombre={t.categoriaIcono} size={28} strokeWidth={1.5} />
                    </div>
                  )}

                  <div className="p-5 flex flex-col gap-3 flex-1">
                    <div className="min-w-0">
                      <p className="font-medium text-ink text-sm truncate">{t.categoriaNombre}</p>
                      <p className="text-xs text-ink/50 truncate">{t.descripcion}</p>
                    </div>
                    <p className="text-sm text-ink/75 leading-snug">&ldquo;{t.comentario}&rdquo;</p>

                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-ink/10">
                      <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-display text-ink shrink-0 overflow-hidden">
                        {t.prestadorFotoPerfilUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.prestadorFotoPerfilUrl} alt={t.prestadorNombreCompleto} className="w-full h-full object-cover" />
                        ) : (
                          t.prestadorNombreCompleto[0]
                        )}
                      </div>
                      <span className="text-xs text-ink/70 truncate flex-1">{t.prestadorNombreCompleto}</span>
                      {t.prestadorPromedioGeneral != null && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Estrellas valor={t.prestadorPromedioGeneral} tamaño="text-xs" />
                          <span className="text-xs text-ink/50">
                            {t.prestadorPromedioGeneral.toFixed(1)} ({t.prestadorCantidadCalificaciones})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sección prestadores */}
      <div className="w-full px-6 py-16">
        <div className="max-w-3xl mx-auto bg-ink text-paper rounded-2xl p-10 flex flex-col items-center text-center gap-4">
          <span className="w-12 h-12 rounded-full bg-paper/10 flex items-center justify-center">
            <Wrench size={22} strokeWidth={1.8} />
          </span>
          <h2 className="font-display text-2xl">¿Sos un profesional del oficio?</h2>
          <p className="text-paper/70 max-w-md">
            Sumate como prestador, recibí pedidos de clientes cerca tuyo y cobrá tus primeros 10
            trabajos sin comisión de Oficy.
          </p>
          <Link
            href="/registro?rol=prestador"
            className="bg-safety text-ink rounded px-6 py-3 font-medium hover:brightness-95 transition mt-2"
          >
            Quiero ofrecer mis servicios
          </Link>
        </div>
      </div>

      {/* Visión de Oficy (25/09, a pedido del usuario: mostrar hacia dónde va la plataforma —
          seguros, garantías, premios y transparencia. Ojo: todo en tiempo futuro ("va a", "vas a")
          a propósito, porque son mejoras en camino, no algo activo hoy — no queremos que se lea
          como una promesa vigente que todavía no podemos cumplir. */}
      <div className="w-full bg-ink text-paper px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <p className="font-mono text-xs tracking-widest text-copper uppercase mb-3 text-center">
            Hacia dónde vamos
          </p>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight mb-4 text-center">
            La visión de Oficy
          </h2>
          <p className="text-paper/70 max-w-lg mx-auto text-center mb-10">
            Esto recién empieza. Así seguimos construyendo una plataforma en la que prestadores y
            clientes puedan confiar de verdad:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <span className="w-11 h-11 rounded-full bg-paper/10 flex items-center justify-center shrink-0">
                <HardHat size={20} strokeWidth={1.8} className="text-safety" />
              </span>
              <div>
                <p className="font-medium mb-1">Seguros</p>
                <p className="text-sm text-paper/65">
                  Todos los prestadores van a estar cubiertos por un seguro de trabajo estilo ART
                  mientras estén haciendo un servicio, para que trabajen tranquilos y vos también.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-11 h-11 rounded-full bg-paper/10 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} strokeWidth={1.8} className="text-safety" />
              </span>
              <div>
                <p className="font-medium mb-1">Garantías</p>
                <p className="text-sm text-paper/65">
                  Si el arreglo no resolvió tu problema como esperabas, vas a contar con una
                  garantía sobre el trabajo realizado, sin vueltas.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-11 h-11 rounded-full bg-paper/10 flex items-center justify-center shrink-0">
                <Trophy size={20} strokeWidth={1.8} className="text-safety" />
              </span>
              <div>
                <p className="font-medium mb-1">Premios y objetivos</p>
                <p className="text-sm text-paper/65">
                  Al llegar a 50 trabajos completados en tu rubro vas a recibir un kit de
                  indumentaria de trabajo (borceguíes, pantalón y camisa) — el primero de varios
                  premios por cumplir objetivos.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-11 h-11 rounded-full bg-paper/10 flex items-center justify-center shrink-0">
                <Eye size={20} strokeWidth={1.8} className="text-safety" />
              </span>
              <div>
                <p className="font-medium mb-1">Transparencia</p>
                <p className="text-sm text-paper/65">
                  Clientes y prestadores van a poder ver todo el proceso en todo momento: Oficy
                  funciona como mediador de confianza entre las partes, para que el prestador
                  trabaje seguro y con la indumentaria correcta, y vos valores su trabajo sabiendo
                  que estás cubierto ante cualquier imprevisto.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-paper/40 text-center mt-10">
            Estas mejoras están en camino y se van a ir sumando a la plataforma.
          </p>
        </div>
      </div>

      {/* Preguntas frecuentes (25/09) */}
      <div className="w-full bg-surface border-y border-ink/10 px-6 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Mismo ajuste que "Cómo funciona"/"Rubros disponibles"/"Trabajos hechos en Oficy" de
              arriba (03/10) — era el único título de la sección usando el estilo de etiqueta
              chica. */}
          <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight mb-8 text-center">
            Preguntas frecuentes
          </h2>
          <FaqAcordeon preguntas={PREGUNTAS_FRECUENTES} />
        </div>
      </div>

      {/* CTA final */}
      <div className="w-full px-6 py-20">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-4">
          <h2 className="font-display text-2xl text-ink">Publicá lo que necesitás</h2>
          <p className="text-ink/70">Recibí atención de profesionales verificados. Gratis y sin compromiso.</p>
          <Link
            href="/registro"
            className="bg-copper text-paper rounded px-6 py-3 font-medium hover:bg-copper-dark transition-colors"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </div>

      {/* Footer publicitario propio de la landing (25/09) — el Footer.tsx global (chico, legal +
          toggle de tema) se sigue renderizando después de esto vía app/layout.tsx, ese no cambia. */}
      <LandingFooter categorias={categorias} />
    </div>
  );
}
