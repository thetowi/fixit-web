// "Tesorero" (01/10): rol nuevo, independiente de Admin — ver backlog, panel /tesoreria. No hay
// registro público para él, lo crea un Admin a mano desde /admin.
export type Rol = "Cliente" | "Prestador" | "Admin" | "Tesorero";

export interface RegistroRequest {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono: string;
  rol: "cliente" | "prestador";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  tutorialVisto: boolean;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface LoginGoogleRequest {
  idToken: string;
}
export interface LoginGoogleResponse {
  token?: string;
  usuario?: Usuario;
  requiereRol: boolean;
  emailPendiente?: string;
  nombrePendiente?: string;
  idTokenPendiente?: string;
}

export interface CompletarRegistroGoogleRequest {
  idToken: string;
  rol: "cliente" | "prestador";
}

export interface ConfirmarEmailRequest {
  email: string;
  codigo: string;
}

export interface ReenviarCodigoRequest {
  email: string;
}

export interface SolicitarRecuperacionRequest {
  email: string;
}

export interface RestablecerPasswordRequest {
  email: string;
  codigo: string;
  nuevaPassword: string;
}