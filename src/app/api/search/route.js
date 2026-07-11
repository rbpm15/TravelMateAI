import { NextResponse } from "next/server";

const LOCAL_GEO_DB = {
  tokio: { lat: 35.6762, lon: 139.6503, display: "Tokio, Japón" },
  tokyo: { lat: 35.6762, lon: 139.6503, display: "Tokio, Japón" },
  kioto: { lat: 35.0116, lon: 135.7681, display: "Kioto, Japón" },
  kyoto: { lat: 35.0116, lon: 135.7681, display: "Kioto, Japón" },
  bali: { lat: -8.4095, lon: 115.1889, display: "Bali, Indonesia" },
  roma: { lat: 41.9028, lon: 12.4964, display: "Roma, Italia" },
  rome: { lat: 41.9028, lon: 12.4964, display: "Roma, Italia" },
  paris: { lat: 48.8566, lon: 2.3522, display: "París, Francia" },
  parís: { lat: 48.8566, lon: 2.3522, display: "París, Francia" },
  londres: { lat: 51.5074, lon: -0.1278, display: "Londres, Reino Unido" },
  london: { lat: 51.5074, lon: -0.1278, display: "Londres, Reino Unido" },
  madrid: { lat: 40.4168, lon: -3.7038, display: "Madrid, España" },
  cancun: { lat: 21.1619, lon: -86.8515, display: "Cancún, México" },
  cancún: { lat: 21.1619, lon: -86.8515, display: "Cancún, México" },
  "new york": { lat: 40.7128, lon: -74.0060, display: "Nueva York, EE. UU." },
  "nueva york": { lat: 40.7128, lon: -74.0060, display: "Nueva York, EE. UU." }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { destino, fecha_inicio, fecha_fin, presupuesto, personas, tipo_viaje } = body;

    let lat = null;
    let lon = null;
    let displayName = null;
    const cleanDestino = (destino || "").trim().toLowerCase();

    // 1. Geocodificación (Nominatim - OSM) con User-Agent
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destino)}&format=json&limit=1`, {
        headers: {
          "User-Agent": "TravelMateAI/1.0 (contact: support@travelmate.ai)"
        }
      });
      if (geoRes.ok) {
        const text = await geoRes.text();
        if (text.startsWith("[")) {
          const geoData = JSON.parse(text);
          if (geoData && geoData.length > 0) {
            lat = geoData[0].lat;
            lon = geoData[0].lon;
            displayName = geoData[0].display_name.split(",")[0];
          }
        }
      }
    } catch (e) {
      console.warn("Error en Nominatim API, intentando base de datos local:", e.message);
    }

    // Usar base de datos local si Nominatim falló
    if (!lat || !lon) {
      const localMatch = LOCAL_GEO_DB[cleanDestino];
      if (localMatch) {
        lat = localMatch.lat;
        lon = localMatch.lon;
        displayName = localMatch.display;
      } else {
        // Fallback genérico final
        lat = "35.6762";
        lon = "139.6503";
        displayName = destino ? (destino.charAt(0).toUpperCase() + destino.slice(1)) : "Destino Soñado";
      }
    }

    // 2. Clima (Open-Meteo) sin Key
    let temperatura = "22";
    try {
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (weatherRes.ok) {
        const text = await weatherRes.text();
        if (text.startsWith("{")) {
          const weatherData = JSON.parse(text);
          temperatura = weatherData.current_weather?.temperature || "22";
        }
      }
    } catch (e) {
      console.warn("Error cargando clima, usando valor por defecto:", e.message);
    }

    // 3. Atracciones y Hoteles (Overpass API - OSM) sin Key
    // Radio de 5000 metros (5km)
    const overpassQuery = `
      [out:json];
      (
        node["tourism"="hotel"](around:5000,${lat},${lon});
        node["tourism"="museum"](around:5000,${lat},${lon});
        node["historic"="monument"](around:5000,${lat},${lon});
        node["tourism"="viewpoint"](around:5000,${lat},${lon});
      );
      out tags 10;
    `;
    
    let hoteles = [];
    let atracciones = [];

    try {
      const overpassRes = await fetch(`https://overpass-api.de/api/interpreter`, {
        method: "POST",
        body: overpassQuery
      });
      if (overpassRes.ok) {
        const text = await overpassRes.text();
        if (text.startsWith("{")) {
          const overpassData = JSON.parse(text);
          if (overpassData && overpassData.elements) {
            overpassData.elements.forEach(el => {
              if (!el.tags.name) return;
              if (el.tags.tourism === "hotel") {
                hoteles.push({ nombre: el.tags.name, stars: el.tags.stars || "3" });
              } else {
                atracciones.push({ nombre: el.tags.name, tipo: el.tags.tourism || el.tags.historic });
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn("Error en Overpass API, usando fallbacks:", e.message);
    }

    // Fallback inteligente de hoteles si la API no devolvió resultados
    if (hoteles.length === 0) {
      if (tipo_viaje === "playa") {
        hoteles = [
          { nombre: `${displayName} Beach & Resort`, stars: "5" },
          { nombre: "Ocean View Hotel", stars: "4" },
          { nombre: "Posada de la Bahía", stars: "3" }
        ];
      } else if (tipo_viaje === "aventura") {
        hoteles = [
          { nombre: "Adventure Eco-Lodge", stars: "4" },
          { nombre: "Glamping del Bosque", stars: "4" },
          { nombre: "Hostal de los Exploradores", stars: "3" }
        ];
      } else {
        hoteles = [
          { nombre: `Hotel Royal ${displayName}`, stars: "4" },
          { nombre: `Boutique Grand Place`, stars: "5" },
          { nombre: "Hostel de la Estación Central", stars: "3" }
        ];
      }
    }

    // Fallback inteligente de atracciones si la API no devolvió resultados
    if (atracciones.length === 0) {
      if (tipo_viaje === "playa") {
        atracciones = [
          { nombre: "Playa Principal del Sol", tipo: "beach" },
          { nombre: "Mirador del Acantilado", tipo: "viewpoint" },
          { nombre: "Arrecife de Coral (Snorkel)", tipo: "nature" },
          { nombre: "Paseo Marítimo y Restaurantes", tipo: "recreation" }
        ];
      } else if (tipo_viaje === "aventura") {
        atracciones = [
          { nombre: "Sendero de la Cascada", tipo: "hiking" },
          { nombre: "Punto de Escalada del Cañón", tipo: "climbing" },
          { nombre: "Reserva Natural y Observación", tipo: "nature" },
          { nombre: "Mirador de la Cumbre", tipo: "viewpoint" }
        ];
      } else {
        atracciones = [
          { nombre: `Centro Histórico y Catedral`, tipo: "historic" },
          { nombre: `Museo de Arte Moderno`, tipo: "museum" },
          { nombre: `Parque Central de la Ciudad`, tipo: "park" },
          { nombre: `Mirador del Rascacielos`, tipo: "viewpoint" }
        ];
      }
    }

    // 4. Estimación de Vuelos y Presupuesto (Algoritmo simulado)
    // En la realidad, esto llamaría a ExchangeRate API y Amadeus.
    const presupuestoNum = parseFloat(presupuesto);
    const costoVueloEstimado = (presupuestoNum * 0.4).toFixed(2); // Asignamos 40% a vuelos
    const costoHotelEstimado = (presupuestoNum * 0.3).toFixed(2); // 30% a hospedaje
    const costoComidaEstimado = (presupuestoNum * 0.2).toFixed(2); // 20% comida
    const costoTransporte = (presupuestoNum * 0.1).toFixed(2); // 10% transporte local

    const itinerario = [
      { dia: "Día 1", descripcion: `Llegada a ${displayName} y visita a ${atracciones[0]?.nombre || 'el centro de la ciudad'}.` },
      { dia: "Día 2", descripcion: `Exploración de la naturaleza y recorrido por ${atracciones[1]?.nombre || 'lugares icónicos'}.` },
      { dia: "Día 3", descripcion: `Día relajante y despedida de ${displayName}.` }
    ];

    // Imagen del destino (Fallback genérico si no hay API Key de Unsplash)
    // Se recomienda añadir la key de Unsplash al .env.local para obtener fotos reales.
    const imageUrl = process.env.UNSPLASH_ACCESS_KEY 
      ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(displayName)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
      : 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1200'; // Imagen de avión genérica

    let fotoDestino = imageUrl;
    if (process.env.UNSPLASH_ACCESS_KEY) {
       try {
         const imgRes = await fetch(imageUrl);
         const imgData = await imgRes.json();
         if (imgData.results && imgData.results.length > 0) {
           fotoDestino = imgData.results[0].urls.regular;
         }
       } catch (e) {
         fotoDestino = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1200';
       }
    }

    const resultadoFinal = {
      destino: displayName,
      lat,
      lon,
      clima: `${temperatura}°C`,
      hoteles: hoteles.slice(0, 3), // Top 3
      atracciones: atracciones.slice(0, 4), // Top 4
      presupuesto_estimado: {
        total: presupuestoNum,
        vuelos: costoVueloEstimado,
        hotel: costoHotelEstimado,
        comida: costoComidaEstimado,
        transporte: costoTransporte
      },
      itinerario,
      imagen: fotoDestino
    };

    return NextResponse.json(resultadoFinal);
  } catch (error) {
    console.error("Error en API de búsqueda:", error);
    return NextResponse.json({ error: "Ocurrió un error al procesar el viaje." }, { status: 500 });
  }
}
