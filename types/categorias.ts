import { EstadoVerificacion } from "./verificacion";

export interface Categoria {
  id: number;
  nombre: string;
  icono: string | null;
}

export interface PrestadorCategoria {
  id: number;
  categoriaId: number;
  categoriaNombre: string;
  descripcion: string | null;
  precioReferencia: number | null;
  // Estado de la matrícula de ESTE rubro (22/09) — mientras no esté Aprobado, no aparece en
  // /buscar ni /explorar aunque el rubro ya esté cargado acá.
  estadoVerificacion: EstadoVerificacion;
  motivoRechazoVerificacion: string | null;
}

export interface AgregarCategoriaRequest {
  categoriaId: number;
  descripcion?: string;
  precioReferencia?: number;
}
