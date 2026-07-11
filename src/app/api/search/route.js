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
    const { origen, destino, fecha_inicio, fecha_fin, presupuesto, personas, tipo_viaje } = body;

    // Helper para Haversine
    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    };

    let lat = null, lon = null, displayName = null;
    let origenLat = null, origenLon = null, origenName = null;

    const cleanDestino = (destino || "").trim().toLowerCase();
    
    // Geocodificar Origen si existe
    if (origen && origen.trim() !== "") {
      try {
        const geoOrigen = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origen)}&format=json&limit=1`, {
          headers: { "User-Agent": "TravelMateAI/1.0 (contact: support@travelmate.ai)" }
        });
        if (geoOrigen.ok) {
          const text = await geoOrigen.text();
          if (text.startsWith("[")) {
            const data = JSON.parse(text);
            if (data.length > 0) {
              origenLat = parseFloat(data[0].lat);
              origenLon = parseFloat(data[0].lon);
              origenName = data[0].display_name.split(",")[0];
            }
          }
        }
      } catch (e) {
        console.warn("Error geocodificando origen:", e.message);
      }
    }

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
            lat = parseFloat(geoData[0].lat);
            lon = parseFloat(geoData[0].lon);
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
        lat = 35.6762;
        lon = 139.6503;
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

    // 3. Atracciones, Hoteles y Restaurantes (Overpass API - OSM) sin Key
    // Radio de 20000 metros (20km)
    const overpassQuery = `
      [out:json];
      (
        node["tourism"="hotel"](around:20000,${lat},${lon});
        node["tourism"="museum"](around:20000,${lat},${lon});
        node["historic"="monument"](around:20000,${lat},${lon});
        node["tourism"="viewpoint"](around:20000,${lat},${lon});
        node["amenity"="restaurant"](around:20000,${lat},${lon});
      );
      out tags 30;
    `;
    
    let hoteles = [];
    let atracciones = [];
    let restaurantes = [];

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
            // Filtrar nombres repetidos
            const seenNames = new Set();
            overpassData.elements.forEach(el => {
              const name = el.tags.name;
              if (!name || seenNames.has(name)) return;
              seenNames.add(name);
              
              if (el.tags.tourism === "hotel") {
                hoteles.push({ nombre: name, stars: el.tags.stars || "3" });
              } else if (el.tags.amenity === "restaurant") {
                restaurantes.push({ nombre: name, tipo: el.tags.cuisine || "Comida Local" });
              } else {
                atracciones.push({ nombre: name, tipo: el.tags.tourism || el.tags.historic });
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn("Error en Overpass API:", e.message);
    }

    // Si no hay atracciones, buscar atracciones reales en Wikipedia GeoSearch
    if (atracciones.length === 0) {
      try {
        const wikiRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=10000&gscoord=${lat}|${lon}&format=json`);
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.query && wikiData.query.geosearch) {
            atracciones = wikiData.query.geosearch.slice(0, 5).map(item => ({
              nombre: item.title,
              tipo: "Lugar de interés"
            }));
          }
        }
      } catch (e) {
        console.warn("Error en Wikipedia API:", e.message);
      }
    }
    
    // Si Wikipedia también falla o no hay internet, no inventamos lugares irreales, 
    // solo ponemos actividades descriptivas reales
    if (atracciones.length === 0) {
      atracciones = [
        { nombre: `Centro histórico y calles principales`, tipo: "Exploración" },
        { nombre: `Mercado tradicional local`, tipo: "Cultura" },
        { nombre: `Parque o reserva natural de la región`, tipo: "Naturaleza" }
      ];
    }

    if (hoteles.length === 0) {
      hoteles = [
        { nombre: `Opciones de alojamiento céntricas en ${displayName}`, stars: "Variado" },
        { nombre: `Hospedaje local y Airbnbs`, stars: "Variado" }
      ];
    }

    if (restaurantes.length === 0) {
      restaurantes = [
        { nombre: `Restaurantes típicos cerca de la plaza central`, tipo: "Gastronomía Local" },
        { nombre: `Mercados de comida tradicional`, tipo: "Económico y Auténtico" }
      ];
    }

    // 4. Estimación de Vuelos y Presupuesto
    const presupuestoNum = parseFloat(presupuesto) || 0;
    let vuelos = [];
    let costoVueloTotal = 0;
    
    // Si hay origen y destino válidos, calcular distancia y vuelo real aproximado
    if (origenLat && origenLon && lat && lon) {
      const distanciaKm = getDistanceFromLatLonInKm(origenLat, origenLon, lat, lon);
      
      // Costo aproximado: Base $50 + $0.08 por Km
      let precioVueloAprox = 50 + (distanciaKm * 0.08);
      
      // Duración aproximada: 800 km/h + 1h de despegue/aterrizaje
      let duracionHoras = (distanciaKm / 800) + 1;
      let duracionStr = duracionHoras < 2 ? "1h - 2h" : `${Math.floor(duracionHoras)}h - ${Math.ceil(duracionHoras + 1)}h`;
      
      let ruta = "Directo";
      if (distanciaKm > 4000) ruta = "1 Escala";
      if (distanciaKm > 10000) ruta = "2 Escalas";
      
      vuelos.push({
        aerolinea: "Múltiples Aerolíneas",
        ruta: ruta,
        duracion: duracionStr,
        precio: precioVueloAprox.toFixed(0),
        tipo: "Mejor Opción"
      });
      
      // Opción económica
      if (distanciaKm > 1000) {
        vuelos.push({
          aerolinea: "Aerolíneas Low Cost",
          ruta: distanciaKm > 4000 ? "2 Escalas" : "1 Escala",
          duracion: `${Math.ceil(duracionHoras + 2)}h`,
          precio: (precioVueloAprox * 0.75).toFixed(0),
          tipo: "Económico"
        });
      }
      
      costoVueloTotal = precioVueloAprox * parseFloat(personas || 1);
    } else {
      // Si no hay origen, usamos las opciones por defecto o informamos
      vuelos.push({
        aerolinea: "Ingresa tu origen",
        ruta: "Para estimar vuelos",
        duracion: "-",
        precio: (presupuestoNum * 0.4).toFixed(0),
        tipo: "Referencia"
      });
      costoVueloTotal = presupuestoNum * 0.4;
    }

    const presupuestoRestante = Math.max(0, presupuestoNum - costoVueloTotal);
    const costoHotelEstimado = (presupuestoRestante * 0.5).toFixed(2); // 50% de lo que sobra para hospedaje
    const costoComidaEstimado = (presupuestoRestante * 0.3).toFixed(2); // 30% comida
    const costoTransporte = (presupuestoRestante * 0.2).toFixed(2); // 20% transporte y extras

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
      restaurantes: restaurantes.slice(0, 3), // Top 3
      vuelos,
      presupuesto_estimado: {
        total: presupuestoNum,
        vuelos: costoVueloTotal,
        hotel: parseFloat(costoHotelEstimado),
        comida: parseFloat(costoComidaEstimado),
        transporte: parseFloat(costoTransporte)
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
