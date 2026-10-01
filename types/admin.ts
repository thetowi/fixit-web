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

export interface EditarCategoriaRequest {
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

// Rol Tesorero (01/10) — lo crea un Admin a mano desde /admin, ver AdminController.CrearTesorero.
export interface CrearTesoreroRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
}