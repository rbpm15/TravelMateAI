"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import "./historial.css";

// Reutilizamos parte de los estilos de "buscar"
import "../buscar/buscar.css";

// Imágenes de alta calidad de Unsplash para dar ganas de viajar
const HOTEL_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=500&q=80"
];

const ATTRACTION_IMAGES = [
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=500&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=500&q=80"
];

export default function Historial() {
  const [viajes, setViajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    fetchHistorial();
  }, []);

  const fetchHistorial = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('consultas')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn("⚠️ Advertencia: La tabla 'consultas' no existe en tu base de datos de Supabase. Por favor ejecuta el script de SQL para crearla.");
          setViajes([]);
          return;
        }
        throw error;
      }
      setViajes(data || []);
    } catch (err) {
      console.error("Error cargando historial:", err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    return new Date(fecha).toLocaleDateString('es-ES', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
  };

  if (loading) return <div className="loading-state">Cargando tu historial de viajes...</div>;

  return (
    <div className="historial-container">
      {!selectedTrip ? (
        <>
          <div className="historial-header">
            <Link href="/dashboard" className="btn-back">← Volver al Panel</Link>
            <h1>Tus Viajes Guardados</h1>
            <p>Aquí puedes consultar todos los itinerarios que has planeado.</p>
          </div>

          {viajes.length === 0 ? (
            <div className="empty-state">
              <MapPin size={48} color="var(--text-secondary)" style={{marginBottom: 16, opacity: 0.5}} />
              <h3>Aún no tienes viajes</h3>
              <p>Comienza a planificar tu próxima aventura.</p>
              <Link href="/dashboard/buscar" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
                Planear mi primer viaje
              </Link>
            </div>
          ) : (
            <div className="viajes-grid">
              {viajes.map((viaje) => (
                <div key={viaje.id} className="viaje-card" onClick={() => setSelectedTrip(viaje)}>
                  <div 
                    className="viaje-img" 
                    style={{ backgroundImage: `url(${viaje.resultados?.imagen || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=400'})` }}
                  >
                    <div className="viaje-overlay">
                      <h3>{viaje.destino}</h3>
                    </div>
                  </div>
                  <div className="viaje-info">
                    <div className="info-row">
                      <Calendar size={16} />
                      <span>{formatearFecha(viaje.fecha_inicio)} - {formatearFecha(viaje.fecha_fin)}</span>
                    </div>
                    <div className="info-row">
                      <strong>Presupuesto:</strong>
                      <span>${viaje.presupuesto_usuario} USD</span>
                    </div>
                    <button className="btn-text" style={{ color: 'var(--accent)', marginTop: 12 }}>
                      Ver detalles →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Vista de Detalle (Bento Box Reutilizado) */
        <div className="results-wrapper">
          <button className="btn-back" onClick={() => setSelectedTrip(null)} style={{marginBottom: 16}}>
            <ArrowLeft size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: 4}}/> 
            Volver al Historial
          </button>
          
          <div className="results-header" style={{ backgroundImage: `url(${selectedTrip.resultados?.imagen})` }}>
            <div className="results-header-overlay">
              <h1>{selectedTrip.destino}</h1>
              <p>Fechas: {formatearFecha(selectedTrip.fecha_inicio)} - {formatearFecha(selectedTrip.fecha_fin)}</p>
            </div>
          </div>

          <div className="results-bento">
            {/* Presupuesto */}
            <div className="bento-card budget-card">
              <h3>Desglose de Presupuesto</h3>
              <div className="budget-item">
                <span>✈️ Vuelos</span>
                <strong>${selectedTrip.resultados?.presupuesto_estimado?.vuelos}</strong>
              </div>
              <div className="budget-item">
                <span>🏨 Hoteles</span>
                <strong>${selectedTrip.resultados?.presupuesto_estimado?.hotel}</strong>
              </div>
              <div className="budget-item">
                <span>🍝 Comida</span>
                <strong>${selectedTrip.resultados?.presupuesto_estimado?.comida}</strong>
              </div>
              <div className="budget-item">
                <span>🚇 Transporte</span>
                <strong>${selectedTrip.resultados?.presupuesto_estimado?.transporte}</strong>
              </div>
            </div>

            {/* Hoteles */}
            <div className="bento-card">
              <h3>🏨 Opciones de Hospedaje</h3>
              {selectedTrip.resultados?.hoteles?.length > 0 ? (
                <div className="places-list">
                  {selectedTrip.resultados.hoteles.map((h, i) => (
                    <div key={i} className="place-item-card">
                      <div 
                        className="place-img" 
                        style={{ backgroundImage: `url(${HOTEL_IMAGES[i % HOTEL_IMAGES.length]})` }}
                      ></div>
                      <div className="place-details">
                        <span className="place-name">{h.nombre}</span>
                        <div className="place-meta">
                          <span className="place-rating">⭐ {h.stars} / 5</span>
                          <span className="place-badge">Hospedaje</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p>No se encontraron hoteles con nombre en esta área.</p>}
            </div>

            {/* Atracciones */}
            <div className="bento-card">
              <h3>📍 Lugares Turísticos</h3>
              {selectedTrip.resultados?.atracciones?.length > 0 ? (
                <div className="places-list">
                  {selectedTrip.resultados.atracciones.map((a, i) => (
                    <div key={i} className="place-item-card">
                      <div 
                        className="place-img" 
                        style={{ backgroundImage: `url(${ATTRACTION_IMAGES[i % ATTRACTION_IMAGES.length]})` }}
                      ></div>
                      <div className="place-details">
                        <span className="place-name">{a.nombre}</span>
                        <div className="place-meta">
                          <span className="place-badge">{a.tipo || "Atracción"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p>No se encontraron atracciones destacadas.</p>}
            </div>

            {/* Itinerario */}
            <div className="bento-card itinerary-card full-span">
              <h3>📅 Itinerario Sugerido</h3>
              <div className="timeline">
                {selectedTrip.resultados?.itinerario?.map((item, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <h4>{item.dia}</h4>
                      <p>{item.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
