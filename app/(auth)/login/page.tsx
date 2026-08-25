"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { apiFetch, ApiError } from "@/lib/api";
import {
  LoginRequest,
  LoginResponse,
  LoginGoogleRequest,
  LoginGoogleResponse,
  CompletarRegistroGoogleRequest,
} from "@/types/auth";
import { guardarSesion } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginRequest>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // Estado para cuando Google nos dice "este usuario es nuevo, falta elegir rol"
  const [pendienteDeRol, setPendienteDeRol] = useState<{
    idToken: string;
    nombre: string;
  } | null>(null);
  const [rolElegido, setRolElegido] = useState<"cliente" | "prestador">("cliente");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const resultado = await apiFetch<LoginResponse>("/api/Auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      guardarSesion(resultado.token, resultado.usuario);
      router.push("/cuenta");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: CredentialResponse) {
    setError(null);
    if (!credentialResponse.credential) {
      setError("No pudimos obtener tu credencial de Google.");
      return;
    }

    const body: LoginGoogleRequest = { idToken: credentialResponse.credential };

    try {
      const resultado = await apiFetch<LoginGoogleResponse>("/api/Auth/google", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (resultado.requiereRol) {
        // Usuario nuevo: mostramos el selector de rol antes de completar el registro
        setPendienteDeRol({
          idToken: resultado.idTokenPendiente!,
          nombre: resultado.nombrePendiente ?? "",
        });
        return;
      }

      guardarSesion(resultado.token!, resultado.usuario!);
      router.push("/cuenta");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al iniciar sesión con Google");
    }
  }

  async function handleCompletarRegistro(e: React.FormEvent) {
    e.preventDefault();
    if (!pendienteDeRol) return;

    setError(null);
    setCargando(true);

    const body: CompletarRegistroGoogleRequest = {
      idToken: pendienteDeRol.idToken,
      rol: rolElegido,
    };

    try {
      const resultado = await apiFetch<LoginResponse>("/api/Auth/google/completar", {
        method: "POST",
        body: JSON.stringify(body),
      });
      guardarSesion(resultado.token, resultado.usuario);
      router.push("/cuenta");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al completar el registro");
    } finally {
      setCargando(false);
    }
  }

  // Pantalla intermedia: elegir rol después del primer login con Google
  if (pendienteDeRol) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6">
        <h1 className="text-2xl font-bold mb-2">¡Hola, {pendienteDeRol.nombre}!</h1>
        <p className="text-gray-600 mb-6">Antes de continuar, contanos qué querés hacer en FixIt.</p>

        <form onSubmit={handleCompletarRegistro} className="flex flex-col gap-4">
          <select
            className="border rounded p-2"
            value={rolElegido}
            onChange={(e) => setRolElegido(e.target.value as "cliente" | "prestador")}
          >
            <option value="cliente">Quiero contratar servicios</option>
            <option value="prestador">Quiero ofrecer servicios</option>
          </select>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="bg-black text-white rounded p-2 disabled:opacity-50"
          >
            {cargando ? "Creando cuenta..." : "Continuar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Iniciar sesión</h1>

      <div className="mb-4">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("No pudimos iniciar sesión con Google.")}
          text="continue_with"
          width="100%"
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <div className="flex-1 border-t" />
        O CON TU EMAIL
        <div className="flex-1 border-t" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          required
          className="border rounded p-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Contraseña"
          required
          className="border rounded p-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="bg-black text-white rounded p-2 disabled:opacity-50"
        >
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}