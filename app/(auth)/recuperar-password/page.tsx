"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { SolicitarRecuperacionRequest } from "@/types/auth";

export default function RecuperarPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const body: SolicitarRecuperacionRequest = { email };
      await apiFetch<void>("/api/Auth/solicitar-recuperacion", {
        method: "POST",
        body: JSON.stringify(body),
      });
      // El backend siempre responde 204 acá, exista o no la cuenta (a propósito, para no revelar
      // qué emails están registrados) — por eso mostramos el mismo mensaje genérico en los dos
      // casos y dejamos avanzar al siguiente paso sin importar el resultado real.
      setEnviado(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 w-full">
        <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">Revisá tu email</p>
        <h1 className="font-display text-2xl text-ink mb-2">Te mandamos un código</h1>
        <p className="text-ink/60 mb-6">
          Si existe una cuenta con contraseña asociada a <span className="font-medium text-ink">{email}</span>, te
          va a llegar un código de 6 dígitos para elegir una contraseña nueva.
        </p>

        <a
          href={`/restablecer-password?email=${encodeURIComponent(email)}`}
          className="block text-center bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors"
        >
          Ya tengo el código
        </a>

        <p className="text-sm text-ink/50 mt-4 text-center">
          ¿No te llegó nada? Revisá la carpeta de spam, o{" "}
          <button onClick={() => setEnviado(false)} className="text-copper hover:underline">
            probá de nuevo
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 w-full">
      <p className="font-mono text-xs tracking-widest text-copper uppercase mb-2">¿Olvidaste tu contraseña?</p>
      <h1 className="font-display text-2xl text-ink mb-2">Recuperá tu cuenta</h1>
      <p className="text-ink/60 mb-6">
        Ingresá el email con el que te registraste en Oficy y te mandamos un código para elegir una contraseña nueva.
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

        {error && <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={cargando}
          className="bg-copper text-paper rounded p-2 font-medium hover:bg-copper-dark transition-colors disabled:opacity-40"
        >
          {cargando ? "Enviando..." : "Enviar código"}
        </button>
      </form>

      <p className="text-sm text-ink/50 mt-4 text-center">
        <a href="/login" className="text-copper hover:underline">Volver a iniciar sesión</a>
      </p>
    </div>
  );
}
