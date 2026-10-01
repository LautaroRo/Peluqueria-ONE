"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "./estilos.css";

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo entrar.");
      setPassword("");
    } catch {
      setError("Sin conexión. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login">
      <form className="login-tarjeta" onSubmit={entrar}>
        <p className="login-logo">ONE</p>
        <p className="etiqueta">Panel de administración</p>

        <div className="campo login-campo">
          <input
            id="pass"
            type={ver ? "text" : "password"}
            placeholder=" "
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <label htmlFor="pass">Contraseña</label>
          <button type="button" className="login-ver" onClick={() => setVer((v) => !v)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}>
            {ver ? "Ocultar" : "Ver"}
          </button>
        </div>

        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-blanco" disabled={cargando || !password}>
          {cargando ? <span className="cargando-icono" /> : "Entrar"}
        </button>
      </form>
    </main>
  );
}
