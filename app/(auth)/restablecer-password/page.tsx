"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { RestablecerPasswordRequest } from "@/types/auth";

function RestablecerPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailInicial = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nuevaPassword !== confirmarPassword) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    try {
      const body: RestablecerPasswordRequest = { email, codigo, nuevaPassword };
      await apiFetch<void>("/api/Auth/restablecer-password", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push("/login?passwordRestablecida=true");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Último paso</p>
      <h1 className="font-display text-2xl text-ink mb-2">Elegí una contraseña nueva</h1>
      <p className="text-ink/60 mb-6">
        Ingresá el código de 6 dígitos que te mandamos a{" "}
        <span className="font-medium text-ink">{email || "tu email"}</span> y tu contraseña nueva.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-surface border border-ink/10 rounded-lg p-5">
        <input
          type="email"
          placeholder="Email"
          required
          className="border border-ink/20 rounded p-2 bg-paper"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="Código de 6 dígitos"
          required
          maxLength={6}
          pattern="[0-9]{6}"
          className="border border-ink/20 rounded p-2 bg-paper text-center text-2xl tracking-[0.5em] font-mono placeholder:text-sm placeholder:tracking-normal placeholder:font-sans"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
        <input
          type="password"
          placeholder="Contraseña nueva"
          required
          minLength={6}
          className="border border-ink/20 rounded p-2 bg-paper"
          value={nuevaPassword}
          onChange={(e) => setNuevaPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Repetí la contraseña nueva"
          required
          minLength={6}
          className="border border-ink/20 rounded p-2 bg-paper"
          value={confirmarPassword}
          onChange={(e) => setConfirmarPassword(e.target.value)}
        />

        {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={cargando || codigo.length !== 6}
          className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
        >
          {cargando ? "Guardando..." : "Guardar contraseña nueva"}
        </button>
      </form>

      <p className="text-sm text-ink/50 mt-4 text-center">
        ¿No te llegó el código?{" "}
        <a href={`/recuperar-password`} className="text-copper hover:underline">Pedir uno nuevo</a>
      </p>
    </div>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense>
      <RestablecerPasswordForm />
    </Suspense>
  );
}
