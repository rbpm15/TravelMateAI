"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Plane, LogOut, Map, History, User } from "lucide-react";
import Link from "next/link";
import "./dashboard.css";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
      } else {
        // Redirigir al buscador si hay una búsqueda persistente pendiente de registro/login
        const cached = localStorage.getItem("travelmate_last_search");
        if (cached && pathname === "/dashboard") {
          router.push("/dashboard/buscar");
        } else {
          setLoading(false);
        }
      }
    };
    
    checkUser();
  }, [router, pathname]);

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
        <Link href="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
          <Plane className="logo-icon" color="var(--accent)" />
          <span>TravelMate AI</span>
        </Link>
        
        <nav className="sidebar-nav">
          <Link 
            href="/dashboard" 
            className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}
          >
            <User size={20} /> Mi Perfil
          </Link>
          <Link 
            href="/dashboard/buscar" 
            className={`nav-item ${pathname === "/dashboard/buscar" ? "active" : ""}`}
          >
            <Map size={20} /> Nuevo Viaje
          </Link>
          <Link 
            href="/dashboard/historial" 
            className={`nav-item ${pathname === "/dashboard/historial" ? "active" : ""}`}
          >
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
        {children}
      </main>
    </div>
  );
}
