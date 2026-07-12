import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { origen, destino, fecha_inicio, fecha_fin, presupuesto, personas, tipo_viaje } = body;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "z-ai/glm-4.7-flash";

    let aiData = null;
    let fotoDestino = null;
    let usedCache = false;

    const cleanDestino = (destino || "").trim().toLowerCase();

    // 1. Intentar obtener de Caché
    try {
      const { data, error } = await supabase
        .from('destinos_cache')
        .select('*')
        .ilike('destino', `%${cleanDestino}%`)
        .eq('tipo_viaje', tipo_viaje)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data && !error) {
        aiData = {
          destino: data.destino,
          lat: data.lat,
          lon: data.lon,
          clima: data.clima,
          hoteles: data.hoteles || [],
          atracciones: data.atracciones || [],
          restaurantes: data.restaurantes || [],
          itinerario: data.itinerario || []
        };
        fotoDestino = data.imagen;
        usedCache = true;
      }
    } catch (e) {
      console.warn("Error o caché no encontrado:", e.message);
    }

    // 2. Si no hay cache, consultar IA a través de OpenRouter
    if (!aiData && OPENROUTER_API_KEY) {
      const systemPrompt = `
Eres un experto agente de viajes de inteligencia artificial.
Debes devolver UNICAMENTE un objeto JSON válido con el siguiente formato exacto. No incluyas markdown, ni comillas invertidas, ni texto introductorio, solo el JSON puro.
{
  "destino": "String (nombre limpio de la ciudad/país)",
  "lat": Number (latitud aproximada de la ciudad),
  "lon": Number (longitud aproximada),
  "clima": "String (clima promedio en esas fechas, ej '22°C')",
  "hoteles": [ { "nombre": "String", "stars": "String" } ],
  "atracciones": [ { "nombre": "String", "tipo": "String" } ],
  "restaurantes": [ { "nombre": "String", "tipo": "String" } ],
  "itinerario": [ { "dia": "String (ej 'Día 1')", "descripcion": "String" } ]
}

Reglas:
- Incluye 3 hoteles, 4 atracciones y 3 restaurantes REALES y populares en ese destino.
- El itinerario debe ser congruente con las fechas (${fecha_inicio} a ${fecha_fin}) y el tipo de viaje (${tipo_viaje}).
`;

      const userPrompt = `
Destino: ${destino}
Tipo de viaje: ${tipo_viaje}
`;

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0].message.content.trim();
          const jsonStr = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
          aiData = JSON.parse(jsonStr);
        } else {
          console.error("OpenRouter Error", await response.text());
        }
      } catch (err) {
        console.error("Error connecting or parsing OpenRouter:", err);
      }
    }

    if (!aiData) {
      throw new Error("No se pudo obtener información del destino utilizando IA.");
    }

    // 3. Unsplash Integration for a real picture
    if (!fotoDestino) {
      const displayName = aiData.destino || destino;
      const imageUrl = process.env.UNSPLASH_ACCESS_KEY 
        ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(displayName)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
        : 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1200'; 

      fotoDestino = imageUrl;
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

      // Guardar en cache global para el futuro si es data nueva
      if (!usedCache) {
        try {
          await supabase.from('destinos_cache').insert([{
            destino: aiData.destino || destino,
            tipo_viaje: tipo_viaje,
            lat: aiData.lat,
            lon: aiData.lon,
            clima: aiData.clima,
            hoteles: aiData.hoteles,
            atracciones: aiData.atracciones,
            restaurantes: aiData.restaurantes,
            itinerario: aiData.itinerario,
            imagen: fotoDestino
          }]);
        } catch (e) {
          console.error("No se pudo guardar en destinos_cache:", e.message);
        }
      }
    }

    // 4. Cálculos Dinámicos basados en Origen y Presupuesto
    const presupuestoNum = parseFloat(presupuesto) || 0;
    const numPersonas = parseInt(personas) || 1;
    let vuelos = [];
    let costoVueloTotal = 0;

    // Haversine formula
    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    };

    let origenLat = null;
    let origenLon = null;

    if (origen && origen.trim() !== "" && aiData.lat && aiData.lon) {
      try {
        const geoOrigen = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origen)}&format=json&limit=1`, {
          headers: { "User-Agent": "TravelMateAI/1.0 (contact: support@travelmate.ai)" }
        });
        if (geoOrigen.ok) {
          const text = await geoOrigen.text();
          if (text.startsWith("[")) {
            const data = JSON.parse(text);
            if (data && data.length > 0) {
              origenLat = parseFloat(data[0].lat);
              origenLon = parseFloat(data[0].lon);
            }
          }
        }
      } catch (e) {
        console.warn("Error geocodificando origen:", e.message);
      }
    }

    if (origenLat && origenLon && aiData.lat && aiData.lon) {
      const distanciaKm = getDistanceFromLatLonInKm(origenLat, origenLon, aiData.lat, aiData.lon);
      
      let precioVueloUnitario = 50 + (distanciaKm * 0.08);
      let duracionHoras = (distanciaKm / 800) + 1;
      let duracionStr = duracionHoras < 2 ? "1h - 2h" : `${Math.floor(duracionHoras)}h - ${Math.ceil(duracionHoras + 1)}h`;
      
      let ruta = "Directo";
      if (distanciaKm > 4000) ruta = "1 Escala";
      if (distanciaKm > 10000) ruta = "2 Escalas";
      
      vuelos.push({
        aerolinea: "Mejor Opción",
        ruta: ruta,
        duracion: duracionStr,
        precio: precioVueloUnitario.toFixed(0),
        tipo: "Regular"
      });
      costoVueloTotal = precioVueloUnitario * numPersonas;
    } else {
      vuelos.push({
        aerolinea: origen ? "Buscando conexiones..." : "Sin Origen",
        ruta: "Pendiente",
        duracion: "-",
        precio: (presupuestoNum * 0.35).toFixed(0),
        tipo: "Estimado"
      });
      costoVueloTotal = presupuestoNum * 0.35;
    }

    const presupuestoRestante = Math.max(0, presupuestoNum - costoVueloTotal);
    const costoHotelEstimado = (presupuestoRestante * 0.5).toFixed(2); 
    const costoComidaEstimado = (presupuestoRestante * 0.3).toFixed(2);
    const costoTransporte = (presupuestoRestante * 0.2).toFixed(2);

    const resultadoFinal = {
      ...aiData,
      imagen: fotoDestino,
      vuelos,
      presupuesto_estimado: {
        total: presupuestoNum,
        vuelos: costoVueloTotal,
        hotel: parseFloat(costoHotelEstimado),
        comida: parseFloat(costoComidaEstimado),
        transporte: parseFloat(costoTransporte)
      }
    };

    return NextResponse.json(resultadoFinal);
  } catch (error) {
    console.error("Error en API de búsqueda:", error);
    return NextResponse.json({ error: error.message || "Ocurrió un error al procesar el viaje." }, { status: 500 });
  }
}
