"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plane, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "../auth.css";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Capturar parámetros de la Landing Page
  const [redirectQuery] = useState(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const params = new URLSearchParams();
      const destino = searchParams.get("destino");
      const presupuesto = searchParams.get("presupuesto");
      const fecha_inicio = searchParams.get("fecha_inicio");
      const fecha_fin = searchParams.get("fecha_fin");

      if (destino) params.append("destino", destino);
      if (presupuesto) params.append("presupuesto", presupuesto);
      if (fecha_inicio) params.append("fecha_inicio", fecha_inicio);
      if (fecha_fin) params.append("fecha_fin", fecha_fin);

      return params.toString();
    }
    return "";
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data?.user && !data.session) {
      // El proyecto de Supabase tiene confirmación de email activa
      setSuccess("¡Registro exitoso! Por favor verifica tu correo electrónico para activar tu cuenta.");
      setLoading(false);
    } else {
      // Autenticación directa sin confirmación
      if (redirectQuery) {
        router.push(`/dashboard/buscar?${redirectQuery}`);
      } else {
        router.push("/dashboard");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <Plane className="logo-icon animate-bounce" color="var(--accent)" />
          <span>TravelMate AI</span>
        </Link>
        
        <h1>Crea tu cuenta</h1>
        <p>Comienza a planear tu próximo viaje increíble</p>

        {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="success-msg"><CheckCircle size={16} /> {success}</div>}

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="name-input">Nombre Completo</label>
            <input 
              id="name-input"
              type="text" 
              placeholder="Ej. María López" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
              autoComplete="name"
            />
          </div>

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
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Registrando..." : "Crear Cuenta"}
          </button>
        </form>

        <div className="auth-links">
          ¿Ya tienes cuenta? <Link href={redirectQuery ? `/login?${redirectQuery}` : "/login"}>Inicia Sesión</Link>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div className="loading-screen">Cargando registro...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
