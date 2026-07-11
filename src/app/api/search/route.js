import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { origen, destino, fecha_inicio, fecha_fin, presupuesto, personas, tipo_viaje } = body;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "z-ai/glm-4.7-flash";

    let aiData = null;

    if (OPENROUTER_API_KEY) {
      const systemPrompt = `
Eres un experto agente de viajes de inteligencia artificial.
Debes devolver UNICAMENTE un objeto JSON válido con el siguiente formato exacto. No incluyas markdown, ni comillas invertidas, ni texto introductorio, solo el JSON puro.
{
  "destino": "String (nombre limpio de la ciudad/país)",
  "lat": Number (latitud aproximada),
  "lon": Number (longitud aproximada),
  "clima": "String (clima promedio esperado para esas fechas, ej '22°C Soleado')",
  "hoteles": [ { "nombre": "String (nombre real de hotel)", "stars": "String (ej '4')" } ],
  "atracciones": [ { "nombre": "String (lugar real)", "tipo": "String" } ],
  "restaurantes": [ { "nombre": "String (restaurante real)", "tipo": "String" } ],
  "vuelos": [ { "aerolinea": "String", "ruta": "String (ej 'Directo')", "duracion": "String", "precio": Number, "tipo": "String (ej 'Económico')" } ],
  "presupuesto_estimado": {
    "total": Number,
    "vuelos": Number,
    "hotel": Number,
    "comida": Number,
    "transporte": Number
  },
  "itinerario": [ { "dia": "String (ej 'Día 1')", "descripcion": "String (descripción detallada)" } ]
}

Reglas:
- Asegúrate de incluir 3 hoteles, 4 atracciones y 3 restaurantes REALES y populares en ese destino.
- Estima vuelos realistas desde el origen al destino para la cantidad de personas dadas.
- Si no hay origen, estima asumiendo un viaje típico.
- El presupuesto debe estar en USD y debe ser congruente con el total solicitado ($${presupuesto}).
- Adapta el itinerario a las fechas (${fecha_inicio} a ${fecha_fin}) y al tipo de viaje (${tipo_viaje}).
`;

      const userPrompt = `
Origen: ${origen || 'No especificado'}
Destino: ${destino}
Fechas: ${fecha_inicio} a ${fecha_fin}
Presupuesto Total: $${presupuesto} USD
Personas: ${personas}
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
          // Remove potential markdown code blocks if the AI disobeyed
          const jsonStr = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
          aiData = JSON.parse(jsonStr);
        } else {
          console.error("OpenRouter API error:", await response.text());
        }
      } catch (err) {
        console.error("Error connecting or parsing OpenRouter:", err);
      }
    }

    if (!aiData) {
      throw new Error("No se pudo obtener información del destino utilizando IA.");
    }

    // Unsplash Integration for a real picture
    const displayName = aiData.destino || destino;
    const imageUrl = process.env.UNSPLASH_ACCESS_KEY 
      ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(displayName)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`
      : 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=1200'; 

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

    // Prepare final response
    const resultadoFinal = {
      ...aiData,
      imagen: fotoDestino
    };

    return NextResponse.json(resultadoFinal);
  } catch (error) {
    console.error("Error en API de búsqueda:", error);
    return NextResponse.json({ error: error.message || "Ocurrió un error al procesar el viaje." }, { status: 500 });
  }
}
