import * as signalR from "@microsoft/signalr";

// 03/11 (RO-01): reintentar siempre (antes se rendía a los ~40 s sin conexión y el chat quedaba
// muerto hasta recargar) y leer el token en cada intento (no el que había al crear la conexión).
const reintentarSiempre: signalR.IRetryPolicy = {
  nextRetryDelayInMilliseconds: (ctx) => Math.min(2000 * (ctx.previousRetryCount + 1), 10000),
};

export function crearConexionChat(): signalR.HubConnection {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return new signalR.HubConnectionBuilder()
    .withUrl(`${apiUrl}/hubs/chat`, {
      accessTokenFactory: () => localStorage.getItem("fixit_token") ?? "",
    })
    .withAutomaticReconnect(reintentarSiempre)
    .build();
}
