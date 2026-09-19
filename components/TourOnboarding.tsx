"use client";

import { useEffect, useState } from "react";
import { Joyride, type EventData, type Step } from "react-joyride";
import { apiFetch } from "@/lib/api";
import { obtenerUsuario, guardarSesion } from "@/lib/auth";
import { pedirAbrirMenuMovil, pedirCerrarMenuMovil } from "@/lib/menuMovilTour";

// Mismo breakpoint "md" de Tailwind que usa Navbar.tsx para esconder los links de escritorio y
// mostrar el botón de hamburguesa — por debajo de este ancho, los links viven en el drawer.
const ANCHO_MOBILE = "(max-width: 767px)";
// Un poco más que la transición de 300ms del drawer en Navbar.tsx, para que el link ya esté en
// su posición final antes de que Joyride calcule dónde dibujar el spotlight y el tooltip.
const ESPERA_TRANSICION_MENU_MS = 350;

function esMobil(): boolean {
  return typeof window !== "undefined" && window.matchMedia(ANCHO_MOBILE).matches;
}

// Paso que apunta a un link del Navbar. En mobile ese link vive escondido dentro del menú
// hamburguesa (cerrado por default) y no tiene el mismo atributo que la versión de escritorio
// (son dos <Link> distintos en el DOM — ver Navbar.tsx) — por eso, en mobile apuntamos al
// elemento con `data-tour-mobile` en vez de `data-tour`, y antes de mostrar el paso le pedimos al
// Navbar que abra el menú (ver lib/menuMovilTour.ts), esperando a que termine de deslizarse.
function pasoDeNav(clave: string, contenido: Pick<Step, "title" | "content">): Step {
  return {
    ...contenido,
    target: () =>
      document.querySelector<HTMLElement>(
        esMobil() ? `[data-tour-mobile='${clave}']` : `[data-tour='${clave}']`
      ),
    before: async () => {
      if (esMobil()) {
        pedirAbrirMenuMovil();
        await new Promise((resolve) => setTimeout(resolve, ESPERA_TRANSICION_MENU_MS));
      } else {
        pedirCerrarMenuMovil();
      }
    },
  };
}

// Paso centrado en pantalla (bienvenida, explicación de pago) — no depende de ningún link del
// Navbar, así que de paso cerramos el menú mobile por si había quedado abierto de un paso anterior.
function pasoCentrado(contenido: Pick<Step, "title" | "content">): Step {
  return {
    ...contenido,
    target: "body",
    placement: "center",
    before: async () => {
      pedirCerrarMenuMovil();
    },
  };
}

const PASOS_CLIENTE: Step[] = [
  pasoCentrado({
    title: "¡Bienvenido a FixIt!",
    content: "Te mostramos rápido cómo encontrar el servicio que necesitás y cómo funciona el pago.",
  }),
  pasoDeNav("nav-buscar", {
    title: "Buscar",
    content: "Buscá prestadores por categoría, cerca tuyo.",
  }),
  pasoDeNav("nav-explorar", {
    title: "Explorar",
    content: "O navegá por categoría sin compartir tu ubicación.",
  }),
  pasoCentrado({
    title: "Tu pago, protegido",
    content:
      "Cuando contratás un trabajo, el pago queda retenido por FixIt. El prestador lo recibe recién cuando vos confirmás que el trabajo está terminado.",
  }),
  pasoDeNav("nav-mensajes", {
    title: "Mensajes",
    content: "Todas tus conversaciones con prestadores en un solo lugar, con aviso cuando te llega algo nuevo.",
  }),
  pasoDeNav("nav-ordenes", {
    title: "Mis órdenes",
    content: "Seguí el estado de tus trabajos y filtrá por mes o estado. Ahí también confirmás cuando un trabajo termina.",
  }),
  pasoDeNav("nav-cuenta", {
    title: "Mi cuenta",
    content: "Completá tus datos y foto de perfil cuando quieras.",
  }),
];

const PASOS_PRESTADOR: Step[] = [
  pasoCentrado({
    title: "¡Bienvenido a FixIt!",
    content: "Te mostramos rápido cómo empezar a recibir trabajos y cobrarlos.",
  }),
  pasoDeNav("nav-cuenta", {
    title: "Mi cuenta",
    content: "Ahí organizás todo en pestañas: tus servicios, tu experiencia, zona de cobertura, horarios y verificación.",
  }),
  pasoDeNav("nav-cuenta", {
    title: "Cobrar tus trabajos",
    content:
      "En la pestaña Cobros conectás tu propia cuenta de Mercado Pago. FixIt deposita ahí tu parte y descuenta su comisión automáticamente — tus primeros 10 trabajos son sin comisión.",
  }),
  pasoDeNav("nav-agenda", {
    title: "Agenda",
    content: "Elegí vista semana o mes, y programá tus turnos tocando un horario libre.",
  }),
  pasoDeNav("nav-mensajes", {
    title: "Mensajes",
    content: "Todas tus conversaciones con clientes en un solo lugar, con aviso cuando te llega algo nuevo.",
  }),
  pasoDeNav("nav-ordenes", {
    title: "Mis órdenes",
    content:
      "Vas a ver los pedidos que te lleguen. El pago del cliente queda retenido hasta que el trabajo se marca como terminado — ahí se libera para vos.",
  }),
];

export default function TourOnboarding() {
  const [correr, setCorrer] = useState(false);
  const [pasos, setPasos] = useState<Step[]>([]);

  useEffect(() => {
    const usuario = obtenerUsuario();
    // Si ya lo vio (marcado en el backend, ver handleEvent más abajo), no lo mostramos de nuevo.
    if (!usuario || usuario.tutorialVisto) return;
    if (usuario.rol !== "Cliente" && usuario.rol !== "Prestador") return;

    setPasos(usuario.rol === "Cliente" ? PASOS_CLIENTE : PASOS_PRESTADOR);
    const timer = setTimeout(() => setCorrer(true), 500);
    return () => clearTimeout(timer);
  }, []);

  async function handleEvent(data: EventData) {
    const { status } = data;
    if (status === "finished" || status === "skipped") {
      setCorrer(false);
      pedirCerrarMenuMovil(); // por si el tour terminó con el menú mobile todavía abierto
      // Se guarda tanto en el backend (para que no vuelva a aparecer en otro dispositivo o tras
      // volver a loguearse) como en la sesión local (para que desaparezca ya mismo en esta pestaña).
      try {
        await apiFetch("/api/usuarios/tutorial-visto", { method: "PUT" });
      } catch {
        // Si falla el guardado en el backend, igual lo ocultamos localmente más abajo — no
        // bloqueamos al usuario, aunque en su próximo login podría volver a verlo.
      }
      const usuario = obtenerUsuario();
      const token = localStorage.getItem("fixit_token");
      if (usuario && token) {
        guardarSesion(token, { ...usuario, tutorialVisto: true });
      }
    }
  }

  if (pasos.length === 0) return null;

  return (
    <Joyride
      steps={pasos}
      run={correr}
      continuous
      onEvent={handleEvent}
      locale={{
        back: "Atrás",
        close: "Cerrar",
        last: "Empezar",
        next: "Siguiente",
        nextWithProgress: "Siguiente ({current} de {total})",
        skip: "Saltar",
      }}
      options={{
        // Colores por variable CSS (no hexadecimales fijos) para que el tutorial respete el modo
        // oscuro de la app en vez de mostrarse siempre con la paleta clara.
        primaryColor: "var(--copper)",
        textColor: "var(--ink)",
        backgroundColor: "var(--surface)",
        arrowColor: "var(--surface)",
        overlayColor: "rgba(27, 27, 24, 0.55)",
        spotlightRadius: 8,
        zIndex: 10000,
        showProgress: true,
        buttons: ["back", "close", "primary", "skip"],
      }}
      styles={{
        tooltip: {
          borderRadius: 16,
          padding: 20,
          fontFamily: "var(--font-sans)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.25)",
        },
        tooltipTitle: {
          fontFamily: "var(--font-display)",
          fontSize: 17,
          fontWeight: 700,
          marginBottom: 4,
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.5,
          padding: "8px 0 0",
          textAlign: "left",
        },
        buttonPrimary: {
          backgroundColor: "var(--copper)",
          color: "#fff",
          borderRadius: 999,
          padding: "8px 18px",
          fontSize: 13,
          fontWeight: 600,
        },
        buttonBack: {
          color: "var(--ink)",
          opacity: 0.6,
          fontSize: 13,
        },
        buttonSkip: {
          color: "var(--ink)",
          opacity: 0.45,
          fontSize: 13,
        },
        buttonClose: {
          color: "var(--ink)",
          opacity: 0.4,
        },
      }}
    />
  );
}
