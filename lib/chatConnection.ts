import * as signalR from "@microsoft/signalr";

export function crearConexionChat(): signalR.HubConnection {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const token = localStorage.getItem("fixit_token") ?? "";

  return new signalR.HubConnectionBuilder()
    .withUrl(`${apiUrl}/hubs/chat`, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect()
    .build();
}