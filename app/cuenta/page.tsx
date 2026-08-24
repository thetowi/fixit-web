"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { obtenerUsuario, cerrarSesion } from "@/lib/auth";

interface MeResponse {
  id: string;
  email: string;
  rol: string;
}

export default function CuentaPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const usuario = obtenerUsuario();
    if (!usuario) {
      router.push("/login");
      return;
    }

    apiFetch<MeResponse>("/api/Auth/me")
      .then(setMe)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Error inesperado");
      });
  }, [router]);

  function handleLogout() {
    cerrarSesion();
    router.push("/login");
  }

  if (error) return <p className="text-red-600 p-6">{error}</p>;
  if (!me) return <p className="p-6">Cargando...</p>;

  return (
    <div className="max-w-md mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold mb-4">Mi cuenta</h1>
      <p><strong>Email:</strong> {me.email}</p>
      <p><strong>Rol:</strong> {me.rol}</p>
      <button onClick={handleLogout} className="mt-6 bg-black text-white rounded p-2">
        Cerrar sesión
      </button>
    </div>
  );
}