export type Rol = "Cliente" | "Prestador" | "Admin";

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