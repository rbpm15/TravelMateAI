"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plane, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "../auth.css";

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // Al hacer clic en el enlace del correo, Supabase establece la sesión automáticamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
      } else {
        // Podría ser que no haya sesión si entran directamente sin el token
        setError("No se detectó una sesión activa de recuperación. Asegúrate de haber ingresado desde el enlace de tu correo electrónico.");
      }
    });
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess("¡Contraseña restablecida con éxito! Redirigiéndote al Dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (err) {
      setError(err.message || "Error al actualizar la contraseña.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <Plane className="logo-icon animate-bounce" color="var(--accent)" />
          <span>TravelMate AI</span>
        </Link>

        <h1>Establece tu nueva contraseña</h1>
        <p style={{ marginBottom: "24px" }}>Introduce tu nueva contraseña a continuación para asegurar tu cuenta.</p>

        {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="success-msg">✔️ {success}</div>}

        <form className="auth-form" onSubmit={handleResetPassword}>
          <div className="form-group">
            <label htmlFor="new-password-input">Nueva Contraseña</label>
            <input 
              id="new-password-input"
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password-input">Confirmar Nueva Contraseña</label>
            <input 
              id="confirm-password-input"
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading || (!hasSession && !success)}>
            {loading ? "Actualizando..." : "Restablecer Contraseña"}
          </button>
        </form>

        <div className="auth-links" style={{ marginTop: "24px" }}>
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: "700" }}>Volver a Iniciar Sesión</Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="loading-screen">Cargando restablecimiento...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
