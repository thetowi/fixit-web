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