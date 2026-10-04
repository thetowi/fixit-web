export interface PerfilPropio {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  rol: string;
  fotoPerfilUrl: string | null;
  verificado: boolean;
  direccion: string | null;
  direccionVerificada: boolean;
  latitud: number | null;
  longitud: number | null;
  radioAlcanceKm: number | null;
  // Datos de cobro del prestador (29/09, separado en cbu+alias el 04/10 para más seguridad —
  // espejo de fixit-mobile/src/types/perfilPropio.ts).
  cbu: string | null;
  alias: string | null;
  titularCuentaCobro: string | null;
  // 0 = Domingo ... 6 = Sábado (mismo orden que el array DIAS ya usado en esta pantalla para Horarios).
  diaPreferidoDeCobro: number | null;
}

export interface ActualizarPerfilRequest {
  nombre: string;
  apellido: string;
  telefono: string;
  direccion?: string;
  // Solo se mandan cuando el usuario eligió una sugerencia del autocompletado de direcciones
  direccionLat?: number;
  direccionLon?: number;
}

export interface ActualizarDatosCobroRequest {
  cbu: string;
  alias: string;
  titularCuentaCobro: string;
  diaPreferidoDeCobro?: number | null;
}