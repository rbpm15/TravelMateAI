"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MapPin, Calendar, Users, Wallet, Check, AlertCircle } from "lucide-react";
import "./buscar.css";
import Link from "next/link";

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

function BuscarViajeContent() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    destino: "",
    fecha_inicio: "",
    fecha_fin: "",
    presupuesto: "",
    personas: "1",
    tipo_viaje: "ciudad",
  });

  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState(null);
  const [guardado, setGuardado] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Leer parámetros de búsqueda al cargar de forma dinámica (incluyendo fechas y localStorage)
  useEffect(() => {
    const destinoParam = searchParams.get("destino");
    const presupuestoParam = searchParams.get("presupuesto");
    const inicioParam = searchParams.get("fecha_inicio");
    const finParam = searchParams.get("fecha_fin");

    if (destinoParam || presupuestoParam || inicioParam || finParam) {
      const nuevoData = {
        ...formData,
        destino: destinoParam || "",
        presupuesto: presupuestoParam || "",
        fecha_inicio: inicioParam || "",
        fecha_fin: finParam || ""
      };
      setFormData(nuevoData);

      // Si vienen ambos parámetros obligatorios, ejecutar búsqueda automáticamente
      if (destinoParam && presupuestoParam) {
        ejecutarBusquedaAutomatica(nuevoData);
      }
    } else {
      // Intentar recuperar de localStorage si no hay parámetros de búsqueda en la URL
      const cached = localStorage.getItem("travelmate_last_search");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.destino && parsed.presupuesto) {
            const nuevoData = {
              ...formData,
              destino: parsed.destino || "",
              presupuesto: parsed.presupuesto || "",
              fecha_inicio: parsed.fecha_inicio || "",
              fecha_fin: parsed.fecha_fin || "",
            };
            setFormData(nuevoData);
            ejecutarBusquedaAutomatica(nuevoData);

            // Limpiar localStorage una vez cargada para evitar bucles de ejecución
            localStorage.removeItem("travelmate_last_search");
          }
        } catch (e) {
          console.error("Error cargando búsqueda persistente:", e);
        }
      }
    }
  }, [searchParams]);

  const ejecutarBusquedaAutomatica = async (datos) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener información del destino.");
      }

      const data = await response.json();
      setResultados(data);

      // Desplazar suavemente hasta los resultados con un offset cómodo
      setTimeout(() => {
        const element = document.getElementById("search-results-section");
        if (element) {
          const yOffset = -100; // Dejar 100px de margen superior
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGuardado(false);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("No se pudo obtener información del destino.");
      }

      const data = await response.json();
      setResultados(data);

      // Desplazar suavemente hasta los resultados con un offset cómodo
      setTimeout(() => {
        const element = document.getElementById("search-results-section");
        if (element) {
          const yOffset = -100; // Dejar 100px de margen superior
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 150);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarViaje = async () => {
    try {
      setSaveError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from('consultas').insert([
        {
          user_id: session.user.id,
          destino: resultados.destino,
          fecha_inicio: formData.fecha_inicio || new Date().toISOString().split('T')[0],
          fecha_fin: formData.fecha_fin || new Date().toISOString().split('T')[0],
          presupuesto_usuario: parseFloat(formData.presupuesto),
          num_personas: parseInt(formData.personas),
          tipo_viaje: formData.tipo_viaje,
          resultados: resultados
        }
      ]);

      if (error) throw error;
      setGuardado(true);
    } catch (err) {
      console.error("Error guardando viaje:", err.message || err);
      if (err.message?.includes("public.consultas") || err.message?.includes("relation") || err.message?.includes("schema cache")) {
        setSaveError("⚠️ La tabla 'consultas' no existe en tu base de datos de Supabase. Por favor ejecuta el script de SQL para crearla.");
      } else {
        setSaveError(`❌ Error al guardar: ${err.message || err}`);
      }
    }
  };

  return (
    <div className="buscar-container">
      {!resultados ? (
        <div className="form-wrapper slide-in-up">
          <Link href="/dashboard" className="btn-back">← Volver al Panel</Link>
          <h1>Planear Nuevo Viaje</h1>
          <p>Configura tu viaje y nuestra IA encontrará las mejores opciones.</p>

          {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}

          <form onSubmit={handleSearch} className="trip-form">
            <div className="form-group">
              <label htmlFor="destino-input"><MapPin size={16} /> Destino</label>
              <input
                id="destino-input"
                type="text"
                name="destino"
                placeholder="Ej. Kioto, Japón"
                value={formData.destino}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="inicio-input"><Calendar size={16} /> Fecha Ida</label>
                <input
                  id="inicio-input"
                  type="date"
                  name="fecha_inicio"
                  value={formData.fecha_inicio}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="fin-input"><Calendar size={16} /> Fecha Regreso</label>
                <input
                  id="fin-input"
                  type="date"
                  name="fecha_fin"
                  value={formData.fecha_fin}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="presupuesto-input"><Wallet size={16} /> Presupuesto Total (USD)</label>
                <input
                  id="presupuesto-input"
                  type="number"
                  name="presupuesto"
                  placeholder="2000"
                  min="100"
                  value={formData.presupuesto}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="personas-input"><Users size={16} /> Personas</label>
                <select id="personas-input" name="personas" value={formData.personas} onChange={handleInputChange}>
                  <option value="1">1 Persona</option>
                  <option value="2">2 Personas (Pareja)</option>
                  <option value="4">4 Personas (Familia)</option>
                  <option value="6">6+ Personas (Grupo)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tipo-input">Tipo de Viaje</label>
              <select id="tipo-input" name="tipo_viaje" value={formData.tipo_viaje} onChange={handleInputChange}>
                <option value="ciudad">Ciudad / Cultura</option>
                <option value="playa">Playa / Relax</option>
                <option value="aventura">Aventura / Naturaleza</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Analizando destinos y precios..." : "Generar Itinerario"}
            </button>
          </form>
        </div>
      ) : (
        <div className="results-wrapper reveal-in" id="search-results-section">
          <div className="results-header" style={{ backgroundImage: `url(${resultados.imagen})` }}>
            <div className="results-header-overlay">
              <button className="btn-glass" onClick={() => setResultados(null)}>← Nueva búsqueda</button>
              <h1>{resultados.destino}</h1>
              <p>Presupuesto Total: ${resultados.presupuesto_estimado.total} USD • Clima esperado: {resultados.clima}</p>
            </div>
          </div>

          <div className="results-bento">
            {/* Presupuesto */}
            <div className="bento-card budget-card slide-in-up delay-1">
              <h3>Desglose de Presupuesto</h3>

              {/* Barra segmentada de presupuesto total */}
              <div className="budget-bar-chart">
                <div className="budget-bar-segment flights" style={{ width: "40%" }} title="Vuelos (40%)"></div>
                <div className="budget-bar-segment hotel" style={{ width: "30%" }} title="Hoteles (30%)"></div>
                <div className="budget-bar-segment food" style={{ width: "20%" }} title="Comida (20%)"></div>
                <div className="budget-bar-segment transport" style={{ width: "10%" }} title="Transporte (10%)"></div>
              </div>

              <div className="budget-list">
                <div className="budget-row">
                  <div className="budget-row-info">
                    <div className="budget-icon-wrapper flights">✈️</div>
                    <div className="budget-row-text">
                      <span className="budget-category">Vuelos</span>
                      <span className="budget-percentage">40% del total</span>
                    </div>
                  </div>
                  <div className="budget-row-value">
                    <strong>${resultados.presupuesto_estimado.vuelos} USD</strong>
                  </div>
                </div>
                <div className="budget-progress-bg">
                  <div className="budget-progress-fill flights" style={{ width: "40%" }}></div>
                </div>

                <div className="budget-row">
                  <div className="budget-row-info">
                    <div className="budget-icon-wrapper hotel">🏨</div>
                    <div className="budget-row-text">
                      <span className="budget-category">Hoteles</span>
                      <span className="budget-percentage">30% del total</span>
                    </div>
                  </div>
                  <div className="budget-row-value">
                    <strong>${resultados.presupuesto_estimado.hotel} USD</strong>
                  </div>
                </div>
                <div className="budget-progress-bg">
                  <div className="budget-progress-fill hotel" style={{ width: "30%" }}></div>
                </div>

                <div className="budget-row">
                  <div className="budget-row-info">
                    <div className="budget-icon-wrapper food">🍝</div>
                    <div className="budget-row-text">
                      <span className="budget-category">Comida</span>
                      <span className="budget-percentage">20% del total</span>
                    </div>
                  </div>
                  <div className="budget-row-value">
                    <strong>${resultados.presupuesto_estimado.comida} USD</strong>
                  </div>
                </div>
                <div className="budget-progress-bg">
                  <div className="budget-progress-fill food" style={{ width: "20%" }}></div>
                </div>

                <div className="budget-row">
                  <div className="budget-row-info">
                    <div className="budget-icon-wrapper transport">🚇</div>
                    <div className="budget-row-text">
                      <span className="budget-category">Transporte</span>
                      <span className="budget-percentage">10% del total</span>
                    </div>
                  </div>
                  <div className="budget-row-value">
                    <strong>${resultados.presupuesto_estimado.transporte} USD</strong>
                  </div>
                </div>
                <div className="budget-progress-bg">
                  <div className="budget-progress-fill transport" style={{ width: "10%" }}></div>
                </div>
              </div>
            </div>

            {/* Hoteles */}
            <div className="bento-card slide-in-up delay-2">
              <h3>🏨 Opciones de Hospedaje</h3>
              {resultados.hoteles.length > 0 ? (
                <div className="places-list">
                  {resultados.hoteles.map((h, i) => (
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
            <div className="bento-card slide-in-up delay-3">
              <h3>📍 Lugares Turísticos</h3>
              {resultados.atracciones.length > 0 ? (
                <div className="places-list">
                  {resultados.atracciones.map((a, i) => (
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
            <div className="bento-card itinerary-card full-span slide-in-up delay-4">
              <h3>📅 Itinerario Sugerido</h3>
              <div className="timeline">
                {resultados.itinerario.map((item, index) => (
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

          <div className="action-bar-wrapper" style={{ marginTop: '24px' }}>
            <div className="action-bar">
              {guardado ? (
                <button className="btn-success" disabled><Check size={18} /> Viaje Guardado</button>
              ) : (
                <button className="btn-primary" onClick={guardarViaje}>Guardar Viaje en Historial</button>
              )}
              <Link href="/dashboard" className="btn-secondary">Volver al Dashboard</Link>
            </div>
            {saveError && (
              <div className="error-msg" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{saveError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuscarViaje() {
  return (
    <Suspense fallback={<div className="loading-state">Cargando buscador...</div>}>
      <BuscarViajeContent />
    </Suspense>
  );
}
