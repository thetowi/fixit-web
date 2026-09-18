// Notificaciones nativas del navegador (API Notification) para avisar de mensajes nuevos
// cuando la pestaña de FixIt no está activa. No requiere ningún backend: solo funciona
// mientras el navegador esté abierto (a diferencia de un push real, que llegaría incluso
// con el navegador cerrado — eso queda para más adelante, ver backlog "Web Push").

export const TITULO_BASE = "FixIt";

export function pedirPermisoNotificaciones(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {
      // si el navegador rechaza el pedido por algún motivo, simplemente no vamos a poder notificar
    });
  }
}

export function mostrarNotificacionNavegador(titulo: string, opciones?: NotificationOptions): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Solo tiene sentido interrumpir con una notificación del sistema si la pestaña no se está mirando
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  try {
    const notificacion = new Notification(titulo, { icon: "/logo-icon.png", ...opciones });
    notificacion.onclick = () => {
      window.focus();
      notificacion.close();
    };
  } catch {
    // algunos navegadores/contextos pueden rechazar la construcción directa de Notification; lo ignoramos
  }
}
