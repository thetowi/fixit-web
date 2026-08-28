"use client";

import { useEffect, useState } from "react";
import { Joyride, type EventData, type Step } from "react-joyride";
import { apiFetch } from "@/lib/api";
import { obtenerUsuario, guardarSesion } from "@/lib/auth";

const PASOS_CLIENTE: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "¡Bienvenido a FixIt!",
    content: "Te mostramos rápido cómo encontrar el servicio que necesitás.",
  },
  {
    target: "[data-tour='nav-buscar']",
    title: "Buscar",
    content: "Buscá prestadores por categoría y cercanía a tu ubicación.",
  },
  {
    target: "[data-tour='nav-explorar']",
    title: "Explorar",
    content: "O navegá por categoría sin necesidad de dar tu ubicación.",
  },
  {
    target: "[data-tour='nav-ordenes']",
    title: "Mis órdenes",
    content: "Acá vas a ver el estado de los trabajos que contrataste, y podés chatear con el prestador.",
  },
  {
    target: "[data-tour='nav-cuenta']",
    title: "Mi cuenta",
    content: "Completá tus datos y foto de perfil cuando quieras.",
  },
];

const PASOS_PRESTADOR: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "¡Bienvenido a FixIt!",
    content: "Te mostramos rápido cómo empezar a recibir trabajos.",
  },
  {
    target: "[data-tour='nav-servicios']",
    title: "Mis servicios",
    content: "Cargá las categorías que ofrecés, con precio de referencia.",
  },
  {
    target: "[data-tour='nav-acerca']",
    title: "Acerca de mí",
    content: "Contá tu experiencia y subí fotos de trabajos realizados — ayuda a que te elijan.",
  },
  {
    target: "[data-tour='nav-agenda']",
    title: "Agenda",
    content: "Definí tus horarios de disponibilidad y programá tus turnos.",
  },
  {
    target: "[data-tour='nav-ordenes']",
    title: "Mis órdenes",
    content: "Acá vas a ver los pedidos que te lleguen, y podés chatear con el cliente.",
  },
];

export default function TourOnboarding() {
  const [correr, setCorrer] = useState(false);
  const [pasos, setPasos] = useState<Step[]>([]);

  useEffect(() => {
    const usuario = obtenerUsuario();
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
      try {
        await apiFetch("/api/usuarios/tutorial-visto", { method: "PUT" });
        const usuario = obtenerUsuario();
        const token = localStorage.getItem("fixit_token");
        if (usuario && token) {
          guardarSesion(token, { ...usuario, tutorialVisto: true });
        }
      } catch {
        // Si falla el guardado, no bloqueamos al usuario
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
        skip: "Saltar",
      }}
      options={{
        primaryColor: "#B5651D",
        textColor: "#1B1B18",
        backgroundColor: "#EFEEE6",
        arrowColor: "#EFEEE6",
        zIndex: 10000,
        showProgress: true,
        buttons: ["back", "close", "primary", "skip"],
      }}
    />
  );
}