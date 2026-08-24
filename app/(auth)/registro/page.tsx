"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { RegistroRequest, Usuario } from "@/types/auth";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegistroRequest>({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    telefono: "",
    rol: "cliente",
  });
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      await apiFetch<Usuario>("/api/Auth/registro", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/login?registrado=true");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-6">Crear cuenta</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Nombre"
          required
          className="border rounded p-2"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <input
          type="text"
          placeholder="Apellido"
          required
          className="border rounded p-2"
          value={form.apellido}
          onChange={(e) => setForm({ ...form, apellido: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          required
          className="border rounded p-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="tel"
          placeholder="Teléfono"
          required
          className="border rounded p-2"
          value={form.telefono}
          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
        />
        <input
          type="password"
          placeholder="Contraseña"
          required
          minLength={6}
          className="border rounded p-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select
          className="border rounded p-2"
          value={form.rol}
          onChange={(e) => setForm({ ...form, rol: e.target.value as "cliente" | "prestador" })}
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
          {cargando ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}