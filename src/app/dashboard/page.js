"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plane, LogOut, Map, History, Star, User } from "lucide-react";
import "./dashboard.css";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        
        // Redirigir al buscador si hay una búsqueda persistente pendiente de registro/login
        const cached = localStorage.getItem("travelmate_last_search");
        if (cached) {
          router.push("/dashboard/buscar");
        } else {
          setLoading(false);
        }
      }
    };
    
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return <div className="loading-screen">Cargando tu panel...</div>;
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <Plane className="logo-icon" color="var(--accent)" />
          <span>TravelMate AI</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link href="/dashboard" className="nav-item active">
            <User size={20} /> Mi Perfil
          </Link>
          <Link href="/dashboard/buscar" className="nav-item new-trip">
            <Map size={20} /> Nuevo Viaje
          </Link>
          <Link href="/dashboard/historial" className="nav-item">
            <History size={20} /> Historial
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-content">
        <header className="dashboard-header">
          <h1>Hola, {user?.user_metadata?.full_name || "Viajero"} 👋</h1>
          <p>¿A dónde vamos hoy?</p>
        </header>

        <section className="dashboard-grid">
          {/* Quick Search Widget */}
          <div className="dashboard-card quick-search">
            <h2>Planear un nuevo viaje</h2>
            <p className="subtitle">Encuentra el mejor destino basado en tu presupuesto actual.</p>
            <Link href="/dashboard/buscar" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
              Comenzar a planear
            </Link>
          </div>

          {/* Recommended section */}
          <div className="dashboard-card">
            <h2><Star size={20} color="var(--accent)" style={{marginRight: 8, display: 'inline-block', verticalAlign: 'middle'}}/> Recomendados para ti</h2>
            <div className="recommended-list">
              <div className="recommended-item">
                <div className="rec-img" style={{backgroundImage: "url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400')"}}></div>
                <div className="rec-info">
                  <h4>Bali, Indonesia</h4>
                  <p>Desde $1,200 USD</p>
                </div>
              </div>
              <div className="recommended-item">
                <div className="rec-img" style={{backgroundImage: "url('https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=400')"}}></div>
                <div className="rec-info">
                  <h4>París, Francia</h4>
                  <p>Desde $1,500 USD</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* History snippet */}
          <div className="dashboard-card full-width">
            <h2><History size={20} style={{marginRight: 8, display: 'inline-block', verticalAlign: 'middle'}}/> Viajes Recientes</h2>
            <div className="empty-state">
              <p>Aún no has planeado ningún viaje.</p>
              <Link href="/dashboard/buscar" className="btn-text" style={{color: 'var(--accent)', marginTop: '8px', display: 'inline-block'}}>
                Haz tu primera búsqueda →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
