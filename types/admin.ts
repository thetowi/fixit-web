export interface CategoriaAdmin {
  id: number;
  nombre: string;
  icono: string | null;
  activa: boolean;
}

export interface CrearCategoriaRequest {
  nombre: string;
  icono?: string;
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  verificado: boolean;
  creadoEn: string;
}