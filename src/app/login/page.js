"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plane, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "../auth.css";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Capturar parámetros de la Landing Page
  const [redirectQuery, setRedirectQuery] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    const destino = searchParams.get("destino");
    const presupuesto = searchParams.get("presupuesto");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");

    if (destino) params.append("destino", destino);
    if (presupuesto) params.append("presupuesto", presupuesto);
    if (fecha_inicio) params.append("fecha_inicio", fecha_inicio);
    if (fecha_fin) params.append("fecha_fin", fecha_fin);

    const queryStr = params.toString();
    if (queryStr) {
      setRedirectQuery(queryStr);
    }
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (redirectQuery) {
        router.push(`/dashboard/buscar?${redirectQuery}`);
      } else {
        router.push("/dashboard");
      }
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setSuccess("¡Enlace de recuperación enviado! Revisa tu correo electrónico.");
    } catch (err) {
      setError(err.message || "Error al enviar correo de recuperación.");
    } finally {
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
        
        {isForgotPassword ? (
          <>
            <h1>¿Olvidaste tu contraseña?</h1>
            <p>Introduce tu correo electrónico para recibir un enlace de recuperación.</p>

            {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}
            {success && <div className="success-msg">✔️ {success}</div>}

            <form className="auth-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label htmlFor="email-input">Correo Electrónico</label>
                <input 
                  id="email-input"
                  type="email" 
                  placeholder="tu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  autoComplete="email"
                />
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Enlace de Recuperación"}
              </button>
            </form>

            <div className="auth-links">
              <button 
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(null); setSuccess(null); }}
                style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: "700", cursor: "pointer", fontSize: "0.95rem" }}
              >
                ← Volver a Iniciar Sesión
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>Bienvenido de nuevo</h1>
            <p>Inicia sesión para continuar planeando tus viajes</p>

            {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}

            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email-input">Correo Electrónico</label>
                <input 
                  id="email-input"
                  type="email" 
                  placeholder="tu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  autoComplete="email"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password-input">Contraseña</label>
                <input 
                  id="password-input"
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  autoComplete="current-password"
                />
                <div style={{ textAlign: "right", marginTop: "4px" }}>
                  <button 
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); setSuccess(null); }}
                    style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </form>

            <div className="auth-links">
              ¿No tienes una cuenta? <Link href={redirectQuery ? `/register?${redirectQuery}` : "/register"}>Regístrate</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="loading-screen">Cargando acceso...</div>}>
      <LoginContent />
    </Suspense>
  );
}
