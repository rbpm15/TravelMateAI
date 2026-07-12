"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plane, Map, Calendar, Wallet, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "./page.css";

const DESTINOS_RECOMENDADOS = [
  {
    id: 1,
    nombre: "Bali, Indonesia",
    imagen: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80",
    precio: "Desde $1,150 USD",
    presupuesto: 1200,
    tipo: "aventura",
    tag: "Aventura Tropical"
  },
  {
    id: 2,
    nombre: "Kioto, Japón",
    imagen: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
    precio: "Desde $1,800 USD",
    presupuesto: 1800,
    tipo: "ciudad",
    tag: "Cultura & Templos"
  },
  {
    id: 3,
    nombre: "Costa de Amalfi, Italia",
    imagen: "https://images.unsplash.com/photo-1486916856992-e4db22c8df33?auto=format&fit=crop&w=800&q=80",
    precio: "Desde $1,400 USD",
    presupuesto: 1400,
    tipo: "playa",
    tag: "Relax & Vistas"
  }
];

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

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  
  // Estados para el buscador (con fechas separadas para activar calendario nativo)
  const [destino, setDestino] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  
  // Estados para Vista Previa
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % 5);
      }, 2500);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const loadingMessages = [
    "Contactando a nuestra IA de viajes...",
    "Buscando las mejores rutas de vuelo...",
    "Analizando opciones de alojamiento reales...",
    "Descubriendo restaurantes y atracciones locales...",
    "Armando tu itinerario personalizado..."
  ];

  useEffect(() => {
    // Verificar sesión
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleBuscar = async (e) => {
    if (e) e.preventDefault();
    
    const busquedaInfo = {
      destino: destino || "",
      fecha_inicio: fechaInicio || "",
      fecha_fin: fechaFin || "",
      presupuesto: presupuesto || ""
    };

    // Guardar búsqueda en localStorage para que persista tras registro/login
    localStorage.setItem("travelmate_last_search", JSON.stringify(busquedaInfo));

    const queryParams = new URLSearchParams(busquedaInfo).toString();

    if (session) {
      router.push(`/dashboard/buscar?${queryParams}`);
    } else {
      // Si no hay sesión, realizamos la búsqueda de vista previa directamente en la landing
      setLoading(true);
      setError(null);
      setResultados(null);
      
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destino: busquedaInfo.destino,
            fecha_inicio: busquedaInfo.fecha_inicio,
            fecha_fin: busquedaInfo.fecha_fin,
            presupuesto: busquedaInfo.presupuesto,
            personas: "1",
            tipo_viaje: "ciudad"
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "No se pudo obtener información del destino.");
        }

        const data = await response.json();
        setResultados(data);
        
        // Desplazar suavemente hasta los resultados con un offset cómodo
        setTimeout(() => {
          const element = document.getElementById("preview-results");
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
    }
  };

  const seleccionarDestinoRecomendado = (item) => {
    const hoy = new Date();
    const futura = new Date();
    futura.setDate(hoy.getDate() + 10);
    
    const fechaInicioStr = hoy.toISOString().split('T')[0];
    const fechaFinStr = futura.toISOString().split('T')[0];

    const busquedaInfo = {
      destino: item.nombre,
      presupuesto: item.presupuesto.toString(),
      fecha_inicio: fechaInicioStr,
      fecha_fin: fechaFinStr
    };

    // Guardar en localStorage
    localStorage.setItem("travelmate_last_search", JSON.stringify(busquedaInfo));

    const queryParams = new URLSearchParams(busquedaInfo).toString();

    if (session) {
      router.push(`/dashboard/buscar?${queryParams}`);
    } else {
      // Redirigir a registro con los datos
      router.push(`/register?${queryParams}`);
    }
  };

  const irARegistro = () => {
    const queryParams = new URLSearchParams({
      destino: destino || "",
      fecha_inicio: fechaInicio || "",
      fecha_fin: fechaFin || "",
      presupuesto: presupuesto || ""
    }).toString();
    router.push(`/register?${queryParams}`);
  };

  return (
    <div className="landing-page">
      <nav className="navbar container fade-in-down">
        <div className="logo">
          <Plane className="logo-icon animate-bounce" />
          <span>TravelMate AI</span>
        </div>
        <div className="auth-links">
          {session ? (
            <Link href="/dashboard" className="btn-primary">Ir a mi Panel</Link>
          ) : (
            <>
              <Link href="/login" className="btn-text">Iniciar Sesión</Link>
              <Link href="/register" className="btn-primary">Empezar gratis</Link>
            </>
          )}
        </div>
      </nav>

      <header className="hero">
        <div className="hero-content">
          <span className="badge-premium slide-in-up delay-1">✨ Planifica tus vacaciones ideales</span>
          <h1 className="slide-in-up delay-2">Encuentra tu próximo viaje</h1>
          <p className="slide-in-up delay-3">Dinos tu presupuesto y generaremos un itinerario con hoteles, clima y atracciones en segundos.</p>
          
          {loading ? (
            <div className="search-widget glass-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '10px 24px 10px 24px', width: '100%', maxWidth: '980px', margin: '0 auto', minHeight: '82px', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 166, 153, 0.08)', borderRadius: '50%', width: '44px', height: '44px', flexShrink: 0 }}>
                <Plane size={20} color="var(--accent)" style={{ animation: 'fly-spin 3s linear infinite' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: '800', color: 'var(--foreground)' }}>Preparando la magia...</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '2px 0 0 0', transition: 'all 0.3s' }}>
                  {loadingMessages[loadingStep]}
                </p>
              </div>
            </div>
          ) : (
            <form className="search-widget glass-card slide-in-up delay-4" onSubmit={handleBuscar}>
              <div className="search-input">
                <label htmlFor="destino-input"><Map size={16} /> Destino</label>
                <input 
                  id="destino-input"
                  type="text" 
                  placeholder="¿A dónde quieres ir?" 
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  required
                />
              </div>
              
              <div className="search-input">
                <label htmlFor="inicio-input"><Calendar size={16} /> Ida</label>
                <input 
                  id="inicio-input"
                  type="date" 
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                />
              </div>

              <div className="search-input">
                <label htmlFor="fin-input"><Calendar size={16} /> Regreso</label>
                <input 
                  id="fin-input"
                  type="date" 
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                />
              </div>

              <div className="search-input">
                <label htmlFor="presupuesto-input"><Wallet size={16} /> Presupuesto</label>
                <input 
                  id="presupuesto-input"
                  type="number" 
                  placeholder="$ USD" 
                  value={presupuesto}
                  onChange={(e) => setPresupuesto(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="search-btn btn-primary">Buscar</button>
            </form>
          )}
        </div>
      </header>

      {/* Indicador de error para el buscador */}
      {error && !loading && (
        <div className="search-status-container container">
          <div className="error-msg" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>⚠️ {error}</div>
        </div>
      )}

      {/* Resultados de Vista Previa para usuarios no logueados */}
      {resultados && (
        <section id="preview-results" className="preview-results container reveal-in">
          <div className="preview-results-header" style={{ backgroundImage: `url(${resultados.imagen})` }}>
            <div className="preview-results-overlay">
              <span className="badge-premium">Vista Previa del Viaje</span>
              <h2>{resultados.destino}</h2>
              <p>Clima: {resultados.clima} • Presupuesto sugerido: ${resultados.presupuesto_estimado.total} USD</p>
            </div>
          </div>

          <div className="preview-bento">
            {/* Presupuesto - Diseñado de forma premium */}
            <div className="bento-card budget-card">
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

            {/* Hoteles, Atracciones e Itinerario - Bloqueados */}
            <div className="preview-locked-area">
              <div className="bento-card blurred">
                <h3>🏨 Opciones de Hospedaje</h3>
                <div className="places-list">
                  <div className="place-item-card">
                    <div className="place-img" style={{ backgroundImage: `url(${HOTEL_IMAGES[0]})` }}></div>
                    <div className="place-details">
                      <span className="place-name">Hotel Grand Oasis Premium</span>
                      <div className="place-meta">
                        <span className="place-rating">⭐ 4 / 5</span>
                        <span className="place-badge">Hospedaje</span>
                      </div>
                    </div>
                  </div>
                  <div className="place-item-card">
                    <div className="place-img" style={{ backgroundImage: `url(${HOTEL_IMAGES[1]})` }}></div>
                    <div className="place-details">
                      <span className="place-name">Central Station Hostel & Suites</span>
                      <div className="place-meta">
                        <span className="place-rating">⭐ 3 / 5</span>
                        <span className="place-badge">Hospedaje</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bento-card blurred">
                <h3>📍 Lugares Turísticos</h3>
                <div className="places-list">
                  <div className="place-item-card">
                    <div className="place-img" style={{ backgroundImage: `url(${ATTRACTION_IMAGES[0]})` }}></div>
                    <div className="place-details">
                      <span className="place-name">Museo Nacional de Arte Histórico</span>
                      <div className="place-meta">
                        <span className="place-badge">Museo</span>
                      </div>
                    </div>
                  </div>
                  <div className="place-item-card">
                    <div className="place-img" style={{ backgroundImage: `url(${ATTRACTION_IMAGES[1]})` }}></div>
                    <div className="place-details">
                      <span className="place-name">Templo Central e Iconografía</span>
                      <div className="place-meta">
                        <span className="place-badge">Histórico</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bento-card itinerary-card full-span blurred">
                <h3>📅 Itinerario Sugerido</h3>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <h4>Día 1: Llegada</h4>
                      <p>Transfer al hotel y paseo por el centro histórico...</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Capa de Bloqueo Glassmorphic */}
              <div className="lock-overlay">
                <div className="lock-cta-card">
                  <span className="lock-icon">🔒</span>
                  <h3>Desbloquea el Itinerario Completo Gratis</h3>
                  <p>Regístrate en TravelMate AI para ver los nombres reales de los hoteles, la ubicación de las atracciones, y el itinerario diario personalizado día a día.</p>
                  <button onClick={irARegistro} className="btn-primary">Registrarse Gratis</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tarjetas de Lugares Recomendados */}
      <section className="destinations container">
        <div className="section-header reveal-in">
          <span className="badge-premium">📍 Inspiración</span>
          <h2>Destinos Más Deseados</h2>
          <p>Explora estos rincones increíbles. Al hacer clic te llevaremos directo a planear tu itinerario.</p>
        </div>

        <div className="destinations-grid">
          {DESTINOS_RECOMENDADOS.map((item, index) => (
            <div 
              key={item.id} 
              className={`dest-card reveal-in delay-${index + 1}`}
              onClick={() => seleccionarDestinoRecomendado(item)}
            >
              <div className="dest-img-wrapper">
                <div 
                  className="dest-img" 
                  style={{ backgroundImage: `url(${item.imagen})` }}
                ></div>
                <span className="dest-tag">{item.tag}</span>
              </div>
              <div className="dest-info">
                <h3>{item.nombre}</h3>
                <div className="dest-meta">
                  <span className="dest-price">{item.precio}</span>
                  <span className="dest-action">
                    Planear <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="features container">
        <div className="section-header reveal-in">
          <span className="badge-premium">⚙️ ¿Cómo funciona?</span>
          <h2>Planifica sin estrés</h2>
          <p>Olvídate de pasar horas en mil pestañas. Nosotros hacemos la búsqueda pesada por ti.</p>
        </div>

        <div className="feature-grid">
          <div className="feature-card reveal-in delay-1">
            <div className="icon-wrapper">
              <Wallet />
            </div>
            <h3>Inteligencia de Costos</h3>
            <p>Calculamos los costos estimados de hospedaje, comidas diarias y transportación local según tu presupuesto.</p>
          </div>
          <div className="feature-card reveal-in delay-2">
            <div className="icon-wrapper">
              <Map />
            </div>
            <h3>Itinerario Automatizado</h3>
            <p>Generamos planes de actividades diarios seleccionando los puntos más calificados según el tipo de viaje.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
