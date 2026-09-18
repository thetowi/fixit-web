// Arma un link universal a Google Maps: si tenemos las coordenadas (dirección verificada), apunta
// al punto exacto; si no, cae a buscar el texto de la dirección tal cual. El formato
// "google.com/maps/search/?api=1&query=..." abre la app de Google Maps en el celular si está
// instalada, y si no, el navegador — no hace falta ninguna librería ni API key.
export function linkGoogleMaps(direccion: string | null, lat?: number | null, lon?: number | null): string {
  const query = lat != null && lon != null ? `${lat},${lon}` : direccion ?? "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
