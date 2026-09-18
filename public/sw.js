// Service Worker de FixIt, solo para Web Push (no cachea nada más por ahora).
// Corre en segundo plano incluso con la pestaña cerrada; es lo que hace posible
// que llegue una notificación aunque el navegador no esté mirando la app.

self.addEventListener("push", (event) => {
  let datos = { titulo: "FixIt", cuerpo: "Tenés novedades", url: "/" };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    // si por algún motivo el payload no es JSON, nos quedamos con el default de arriba
  }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url: datos.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        if ("focus" in cliente) {
          cliente.navigate(url);
          return cliente.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
