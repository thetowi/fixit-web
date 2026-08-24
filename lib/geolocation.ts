export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export function obtenerUbicacionActual(): Promise<Coordenadas> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu navegador no soporta geolocalización."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Necesitamos tu ubicación para buscar prestadores cerca tuyo. Habilitá el permiso en tu navegador."));
        } else {
          reject(new Error("No pudimos obtener tu ubicación. Intentá de nuevo."));
        }
      }
    );
  });
}