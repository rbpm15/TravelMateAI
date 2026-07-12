"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { History, Star } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [dates, setDates] = useState({ inicio: "", fin: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });

    const hoy = new Date();
    const futura = new Date();
    futura.setDate(hoy.getDate() + 7);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDates({
      inicio: hoy.toISOString().split('T')[0],
      fin: futura.toISOString().split('T')[0]
    });
  }, []);

  return (
    <>
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
            <Link 
              href={`/dashboard/buscar?destino=${encodeURIComponent("Bali, Indonesia")}&presupuesto=1200&fecha_inicio=${dates.inicio}&fecha_fin=${dates.fin}&tipo_viaje=aventura`}
              style={{textDecoration: 'none', color: 'inherit'}}
            >
              <div className="recommended-item">
                <div className="rec-img" style={{backgroundImage: "url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400')"}}></div>
                <div className="rec-info">
                  <h4>Bali, Indonesia</h4>
                  <p>Desde $1,200 USD</p>
                </div>
              </div>
            </Link>

            <Link 
              href={`/dashboard/buscar?destino=${encodeURIComponent("París, Francia")}&presupuesto=1500&fecha_inicio=${dates.inicio}&fecha_fin=${dates.fin}&tipo_viaje=ciudad`}
              style={{textDecoration: 'none', color: 'inherit'}}
            >
              <div className="recommended-item">
                <div className="rec-img" style={{backgroundImage: "url('https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=400')"}}></div>
                <div className="rec-info">
                  <h4>París, Francia</h4>
                  <p>Desde $1,500 USD</p>
                </div>
              </div>
            </Link>
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
    </>
  );
}
