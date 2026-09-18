import { apiFetch } from "@/lib/api";

// Convierte la clave pública VAPID (base64 URL-safe, como la devuelve el backend/web-push)
// al formato Uint8Array que pide PushManager.subscribe()
function claveUrlBase64AUint8Array(claveBase64: string): Uint8Array {
  const padding = "=".repeat((4 - (claveBase64.length % 4)) % 4);
  const base64 = (claveBase64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function pushSoportado(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Ya suscripto EN ESTE navegador (independientemente de si el permiso de Notification está
// otorgado — eso se chequea aparte)
export async function yaSuscriptoPush(): Promise<boolean> {
  if (!pushSoportado()) return false;
  const registro = await navigator.serviceWorker.getRegistration();
  if (!registro) return false;
  const suscripcion = await registro.pushManager.getSubscription();
  return suscripcion !== null;
}

export async function activarPush(): Promise<void> {
  if (!pushSoportado()) {
    throw new Error("Este navegador no soporta notificaciones push.");
  }

  if (Notification.permission === "denied") {
    throw new Error("Bloqueaste las notificaciones para este sitio. Habilitalas desde la configuración del navegador.");
  }

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    throw new Error("No se otorgó el permiso de notificaciones.");
  }

  const registro = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const { clave } = await apiFetch<{ clave: string }>("/api/push/clave-publica");
  if (!clave) {
    throw new Error("Las notificaciones push todavía no están configuradas del lado del servidor.");
  }

  let suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) {
    suscripcion = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveUrlBase64AUint8Array(clave),
    });
  }

  const json = suscripcion.toJSON();
  await apiFetch("/api/push/suscribirse", {
    method: "POST",
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
}

export async function desactivarPush(): Promise<void> {
  if (!pushSoportado()) return;
  const registro = await navigator.serviceWorker.getRegistration();
  if (!registro) return;

  const suscripcion = await registro.pushManager.getSubscription();
  if (!suscripcion) return;

  const endpoint = suscripcion.endpoint;
  await suscripcion.unsubscribe();
  await apiFetch("/api/push/desuscribirse", {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  });
}
