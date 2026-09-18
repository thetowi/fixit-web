"use client";

// Código muerto de un diseño anterior del chat: llamaba a un endpoint (GET /api/ordenes/{id}/mensajes)
// y a un método de SignalR (UnirseAOrden) que nunca existieron en el backend, y no está enlazado
// desde ningún lado de la app hoy — cada orden ya usa /conversaciones/[id], que sí funciona.
// No se pudo borrar el archivo desde acá (sin acceso de borrado sobre la compu del usuario en esta
// sesión), así que se lo reemplazó por un simple redirect para que, si alguien llegara a esta URL
// vieja por cualquier motivo, no se encuentre con una pantalla rota.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatOrdenPageObsoleta() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ordenes");
  }, [router]);

  return null;
}
