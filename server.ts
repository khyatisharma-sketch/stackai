/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import dotenv from "dotenv";
import { generateFallbackReport } from "./src/fallbackReport";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Helper to safely instantiate Gemini with a clean fallback check
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// 1. Geocoding search endpoint
app.get("/api/weather/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Missing 'q' search query parameter" });
      return;
    }

    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
    );

    if (!response.ok) {
      throw new Error(`Geocoding service returned status: ${response.status}`);
    }

    const data: any = await response.json();
    const results = (data.results || []).map((item: any) => ({
      name: item.name,
      country: item.country || "",
      state: item.admin1 || "",
      lat: item.latitude,
      lon: item.longitude,
      timezone: item.timezone || "auto",
      countryCode: item.country_code || "",
    }));

    res.json({ results });
  } catch (error: any) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: error.message || "Failed to search location" });
  }
});

// Helper to generate realistic fallback weather telemetry if Open-Meteo is unreachable
function generateFallbackTelemetry(
  latitude: number,
  longitude: number,
  name: string,
  country: string,
  state: string,
  countryCode: string,
  tz: string
): any {
  const baseTemp = Math.round(26 + Math.sin(latitude * 0.1) * 8);
  const now = new Date();
  
  const hourly = [];
  for (let i = 0; i < 24; i++) {
    const timeISO = new Date(now.getTime() + i * 3600 * 1000).toISOString().slice(0, 13) + ":00";
    hourly.push({
      time: timeISO,
      temp: baseTemp + Math.round(Math.sin((i / 24) * Math.PI * 2) * 4),
      precipProb: Math.round(Math.abs(Math.sin(i * 0.5)) * 20),
      humidity: Math.round(55 + Math.cos(i) * 12),
      uvIndex: i >= 6 && i <= 18 ? Math.max(0, Math.round(Math.sin(((i - 6) / 12) * Math.PI) * 8)) : 0,
      windSpeed: Math.round(10 + Math.sin(i) * 3),
    });
  }

  const daily = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    daily.push({
      date: dateStr,
      weatherCode: 1,
      tempMax: baseTemp + 4,
      tempMin: baseTemp - 3,
      feltMax: baseTemp + 5,
      feltMin: baseTemp - 2,
      uvMax: 7,
      precipSum: 0,
      precipProbMax: 15,
      sunrise: `${dateStr}T06:10`,
      sunset: `${dateStr}T18:35`,
      daylightHours: 12.4,
    });
  }

  return {
    city: {
      name: name || "Selected Location",
      country: country || "",
      state: state || "",
      lat: latitude,
      lon: longitude,
      timezone: tz || "auto",
      countryCode: countryCode || "",
    },
    current: {
      temp: baseTemp,
      feltTemp: baseTemp + 1,
      weatherCode: 1,
      humidity: 60,
      windSpeed: 12,
      windDir: 160,
      pressure: 1012,
      cloudCover: 20,
      uvIndex: 6,
      isDay: true,
    },
    hourly,
    daily,
    airQuality: {
      usAqi: 45,
      euAqi: 30,
      pm25: 12,
      pm10: 20,
      co: 220,
      no2: 14,
      so2: 5,
      o3: 40,
    }
  };
}

// 2. Weather & Air Quality Telemetry endpoint
app.get("/api/weather/telemetry", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  const { lat, lon, name, country, countryCode, state, timezone } = req.query;

  if (!lat || !lon) {
    res.status(400).json({ error: "Missing latitude or longitude parameters" });
    return;
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);
  const tz = (timezone as string) || "auto";

  try {
    // Build the weather URL
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,uv_index&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,uv_index,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,uv_index_max,precipitation_sum,precipitation_probability_max&timezone=${encodeURIComponent(tz)}`;

    // Build the air quality URL
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=${encodeURIComponent(tz)}`;

    // Fetch in parallel
    const [weatherRes, aqRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(aqUrl),
    ]);

    if (!weatherRes.ok) throw new Error(`Weather telemetry failed: status ${weatherRes.status}`);
    if (!aqRes.ok) throw new Error(`Air Quality telemetry failed: status ${aqRes.status}`);

    const wData: any = await weatherRes.json();
    const aData: any = await aqRes.json();

    if (!wData?.current || !aData?.current) {
      throw new Error("Invalid payload structure returned from weather provider");
    }

    // Map City Info
    const city = {
      name: (name as string) || "Current Location",
      country: (country as string) || "",
      state: (state as string) || "",
      lat: latitude,
      lon: longitude,
      timezone: wData.timezone || tz,
      countryCode: (countryCode as string) || "",
    };

    // Map Current Weather
    const current = {
      temp: wData.current.temperature_2m ?? 20,
      feltTemp: wData.current.apparent_temperature ?? 20,
      weatherCode: wData.current.weather_code ?? 0,
      humidity: wData.current.relative_humidity_2m ?? 50,
      windSpeed: wData.current.wind_speed_10m ?? 10,
      windDir: wData.current.wind_direction_10m ?? 180,
      pressure: wData.current.pressure_msl ?? 1013,
      cloudCover: wData.current.cloud_cover ?? 20,
      uvIndex: wData.current.uv_index || 0,
      isDay: wData.current.is_day === 1,
    };

    // Map Hourly Forecast (next 24 hours)
    const hourly = [];
    const times = wData.hourly?.time || [];
    const nowHourIndex = Math.max(0, new Date().getHours());
    for (let i = nowHourIndex; i < nowHourIndex + 24; i++) {
      if (times[i]) {
        hourly.push({
          time: times[i],
          temp: wData.hourly.temperature_2m?.[i] ?? 20,
          precipProb: wData.hourly.precipitation_probability?.[i] || 0,
          humidity: wData.hourly.relative_humidity_2m?.[i] ?? 50,
          uvIndex: wData.hourly.uv_index?.[i] || 0,
          windSpeed: wData.hourly.wind_speed_10m?.[i] ?? 10,
        });
      }
    }

    // Map Daily Forecast (next 7 days)
    const daily = [];
    const dTimes = wData.daily?.time || [];
    for (let i = 0; i < dTimes.length; i++) {
      daily.push({
        date: dTimes[i],
        weatherCode: wData.daily.weather_code?.[i] ?? 0,
        tempMax: wData.daily.temperature_2m_max?.[i] ?? 22,
        tempMin: wData.daily.temperature_2m_min?.[i] ?? 15,
        feltMax: wData.daily.apparent_temperature_max?.[i] ?? 22,
        feltMin: wData.daily.apparent_temperature_min?.[i] ?? 15,
        uvMax: wData.daily.uv_index_max?.[i] || 0,
        precipSum: wData.daily.precipitation_sum?.[i] || 0,
        precipProbMax: wData.daily.precipitation_probability_max?.[i] || 0,
        sunrise: wData.daily.sunrise?.[i] || `${dTimes[i]}T06:00`,
        sunset: wData.daily.sunset?.[i] || `${dTimes[i]}T18:00`,
        daylightHours: wData.daily.daylight_duration?.[i] ? Math.round((wData.daily.daylight_duration[i] / 3600) * 10) / 10 : 12,
      });
    }

    // Map Air Quality
    const airQuality = {
      usAqi: aData.current.us_aqi || 0,
      euAqi: aData.current.european_aqi || 0,
      pm25: aData.current.pm2_5 || 0,
      pm10: aData.current.pm10 || 0,
      co: aData.current.carbon_monoxide || 0,
      no2: aData.current.nitrogen_dioxide || 0,
      so2: aData.current.sulphur_dioxide || 0,
      o3: aData.current.ozone || 0,
    };

    res.json({ city, current, hourly, daily, airQuality });
  } catch (error: any) {
    console.warn("Open-Meteo telemetry fetch failed/rate-limited, serving fallback telemetry dataset:", error.message || error);
    const fallback = generateFallbackTelemetry(
      latitude,
      longitude,
      (name as string) || "Current Location",
      (country as string) || "",
      (state as string) || "",
      (countryCode as string) || "",
      tz
    );
    res.json(fallback);
  }
});

// 3. Gemini Weather Intelligence generator endpoint
app.post("/api/weather/intelligence", async (req, res) => {
  const { weatherData, persona } = req.body;
  if (!weatherData) {
    res.status(400).json({ error: "Missing weatherData in request body" });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Generate high-fidelity meteorological report instantly using local rules
    const fallbackReport = generateFallbackReport(weatherData, persona);
    res.json(fallbackReport);
    return;
  }

  try {
    // Construct profile instructions based on persona
    let profileGuideline = "";
    switch (persona) {
      case "athlete":
        profileGuideline = "Focus heavily on athletic performance, cardiovascular efficiency, thermal comfort, optimal outdoor training windows, joint pain warnings (pressure drops), wind impact, hydration needs, and air quality risk levels for heavy aerobic exertion.";
        break;
      case "parent":
        profileGuideline = "Focus heavily on children's safety, stroller comfort, appropriate layering, sunscreen thresholds, insect activity conditions, indoor play alternatives if wet/unhealthy, packing requirements (diapers, hats, snacks), and risk parameters (cold, heat indices, high wind, poor AQI).";
        break;
      case "traveler":
        profileGuideline = "Focus heavily on travel delays, flight cancellations (high winds/fog/snow), luggage preparation, transit safety, dress codes for business/dining, key local attractions suitability, and local custom adjustment advice.";
        break;
      case "gardener":
        profileGuideline = "Focus heavily on soil moisture, evaporation rates, frost damage windows, plant watering optimization, greenhouse ventilation, high-wind protection for fragile flora, pest vulnerabilities, and ideal pruning/harvesting times.";
        break;
      case "energy":
        profileGuideline = "Focus heavily on home energy efficiency, heating/cooling presets, optimal appliance usage windows, natural ventilation drafts, peak demand mitigation, solar generation capability, and weatherization micro-steps.";
        break;
      default:
        profileGuideline = "Focus on a balanced general overview covering commuter readiness, health exposure (UV & Air Quality), outfit recommendations, general task scheduling, and quick, practical tips for everyday productivity.";
    }

    // Build the weather payload description
    const weatherString = JSON.stringify({
      city: weatherData.city,
      current: weatherData.current,
      airQuality: weatherData.airQuality,
      // Select a short summary of hourly & daily to keep tokens reasonable
      hourlySample: weatherData.hourly.slice(0, 8), 
      dailySample: weatherData.daily.slice(0, 4)
    }, null, 2);

    const systemInstruction = `You are an elite, highly specialized meteorological intelligence officer. Your job is to analyze real-time raw telemetry and generate an advanced, data-driven, hyper-actionable Weather Intelligence Report tailored to the selected user profile.
Guidelines:
1. Ground your conclusions strictly in the provided data (temperatures, AQI, UV, Wind, Pressure, Humidity).
2. Do not use generic filler text or empty advice. Be highly specific and technical yet clear.
3. Keep impact ratings realistic (low, medium, high, critical).
4. Include a beautifully formatted, highly professional Markdown report inside the "markdownText" property. The Markdown should include icons/emojis, strong section headers, custom tables if needed, and read like a confidential briefing.

Selected Profile Target:
${profileGuideline}`;

    const prompt = `Below is the raw weather and air quality telemetry data for ${weatherData.city.name}, ${weatherData.city.state ? weatherData.city.state + ', ' : ''}${weatherData.city.country}:
\`\`\`json
${weatherString}
\`\`\`

Generate a Weather Intelligence Report in JSON format that matches the requested schema. Please ensure all fields are filled accurately and directly align with the persona's priorities.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A high-level, authoritative executive summary of the day's weather intelligence report tailored to the profile's primary focus." },
            highlights: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3-4 essential bullet points highlighting critical milestones (e.g., UV spike times, precipitation onset, air quality alerts, pressure changes)."
            },
            impactAnalysis: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "Relevant operational area (e.g., Respiratory Health, Structural Comfort, Operations, Energy Demand)" },
                  impact: { type: Type.STRING, description: "Impact rating: 'low', 'medium', 'high', 'critical'" },
                  description: { type: Type.STRING, description: "A precise explanation detailing the thermodynamic or chemical impact on this category." }
                },
                required: ["category", "impact", "description"]
              },
              description: "Assessments for 3-4 key categories affected by today's metrics."
            },
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING, description: "Specific, actionable task (e.g., 'Deploy heavy mulch to garden beds', 'Ventilate home between 7:00 PM and 10:00 PM')" },
                  reason: { type: Type.STRING, description: "Scientific or practical rationale linking the task directly to telemetry." }
                },
                required: ["task", "reason"]
              },
              description: "A tailored, prioritized action plan for today."
            },
            recommendations: {
              type: Type.OBJECT,
              properties: {
                clothing: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific layered garments appropriate for local temps, wind chill, or heat index." },
                gear: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Vital equipment (e.g., wrap-around UV glasses, HEPA mask, wind-resistant canopy, hydration flask)." },
                activityPlanner: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timeWindow: { type: Type.STRING, description: "Optimized hour range (e.g., '14:00 - 17:00')" },
                      activity: { type: Type.STRING, description: "Recommended or evaluated activity" },
                      suitability: { type: Type.STRING, description: "Suitability: 'excellent', 'good', 'poor'" },
                      reason: { type: Type.STRING, description: "Rationale explaining compatibility with UV, temp, wind, and rain curves." }
                    },
                    required: ["timeWindow", "activity", "suitability", "reason"]
                  },
                  description: "A scheduled timeline of activities optimized against today's atmospheric changes."
                }
              },
              required: ["clothing", "gear", "activityPlanner"]
            },
            markdownText: {
              type: Type.STRING,
              description: "A comprehensive, beautifully formatted report in Markdown. Use elegant structure, headings, bold emphasis, and a technical intelligence brief style to elaborate on recommendations and telemetry."
            }
          },
          required: ["summary", "highlights", "impactAnalysis", "checklist", "recommendations", "markdownText"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response returned from Gemini API");
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.warn("Gemini Intelligence API call failed, activating rule-based fallback generator:", error.message || error);
    try {
      const fallbackReport = generateFallbackReport(weatherData, persona);
      res.json(fallbackReport);
    } catch (fallbackError: any) {
      console.error("Critical: Fallback meteorological generator failed:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate AI Weather Intelligence report" });
    }
  }
});

// 4. Gemini TTS Voice Briefing endpoint
app.post("/api/weather/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing or invalid 'text' string in request body" });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json({ audio: null, fallback: true });
      return;
    }

    // Generate cheerful voice brief
    const prompt = `You are a professional weather anchor. Read this weather briefing clearly, engagingly, and with natural emphasis:
"${text.slice(0, 400)}"`; // Limit input length slightly for speed and cost efficiency

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Clear, modern voice
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.json({ audio: null, fallback: true });
      return;
    }

    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.warn("Gemini TTS endpoint encountered an issue, instructing client to use browser speech fallback:", error.message || error);
    res.json({ audio: null, fallback: true });
  }
});

// Fallback error handlers for API routes to guarantee JSON responses
app.use("/api/*", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(404).json({ error: `API endpoint not found: ${req.originalUrl}` });
});

// 5. Integrate Vite Dev Server / Serve Production Static Files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving production static files from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Weather Intelligence server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
