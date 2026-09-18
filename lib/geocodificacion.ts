// Autocompletado/geocodificación de direcciones usando Nominatim, el buscador gratuito de
// OpenStreetMap (mismo proveedor que ya usamos para el mapa de Cobertura del prestador — no
// hace falta ninguna API key nueva). Nominatim pide un uso "razonable" (nada de ráfagas), por
// eso el componente que llama a esto debe hacerlo con debounce, nunca en cada tecla.

// Se devuelven la calle y la localidad por separado (no ya combinadas en un solo string) para
// que el formulario pueda meter el número de la casa entre las dos ("Calle 1234, Localidad") —
// el número lo carga el usuario aparte, en su propio campo, con la opción de marcar "Sin número".
export interface SugerenciaDireccion {
  calle: string;
  localidad: string; // puede venir vacío si Nominatim no nos dio ese dato para este resultado
  lat: number;
  lon: number;
}

interface DireccionNominatim {
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
  state?: string;
}

function extraerCalleYLocalidad(address: DireccionNominatim, displayNameFallback: string): { calle: string; localidad: string } {
  const localidad = address.city || address.town || address.village || address.municipality || address.suburb || "";

  // Si Nominatim no nos dio "road" (raro, pero puede pasar con resultados que no son una calle),
  // usamos el primer segmento del display_name como mejor esfuerzo en vez de dejarlo vacío
  const calle = address.road || displayNameFallback.split(",")[0]?.trim() || displayNameFallback;

  return { calle, localidad };
}

export async function buscarDirecciones(consulta: string): Promise<SugerenciaDireccion[]> {
  if (consulta.trim().length < 4) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", consulta);
  url.searchParams.set("countrycodes", "ar"); // FixIt opera en Argentina
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");

  try {
    const respuesta = await fetch(url.toString(), {
      headers: { "Accept-Language": "es" },
    });
    if (!respuesta.ok) return [];

    const datos: { display_name: string; lat: string; lon: string; address?: DireccionNominatim }[] =
      await respuesta.json();

    return datos.map((d) => {
      const { calle, localidad } = extraerCalleYLocalidad(d.address ?? {}, d.display_name);
      return { calle, localidad, lat: parseFloat(d.lat), lon: parseFloat(d.lon) };
    });
  } catch {
    // si falla la búsqueda (red, Nominatim caído, etc.) simplemente no mostramos sugerencias;
    // el usuario todavía puede tipear la dirección a mano, solo que queda sin verificar
    return [];
  }
}
