export interface ServicioOfrecido {
  categoriaId: number;
  categoriaNombre: string;
  descripcion: string | null;
  precioReferencia: number | null;
}

export interface PerfilPrestador {
  id: string;
  nombre: string;
  apellido: string;
  verificado: boolean;
  fotoPerfilUrl: string | null;
  miembroDesde: string;
  servicios: ServicioOfrecido[];
}