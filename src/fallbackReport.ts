/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeatherData, IntelligenceReport, PersonaType } from "./types";

function getWeatherDesc(code: number): string {
  const mapping: { [key: number]: string } = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return mapping[code] || "Unspecified weather";
}

function getAQIDesc(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function getAQIWarning(aqi: number): string {
  if (aqi <= 50) return "Atmospheric particulate suspension is extremely clean and safe for all.";
  if (aqi <= 100) return "Acceptable air composition, though highly sensitive individuals should observe symptoms.";
  if (aqi <= 150) return "Elevated PM2.5 and gas mixtures may trigger minor respiratory resistance in sensitive demographics.";
  return "Elevated atmospheric chemical density. Minimize extended outdoor exposure or wear high-filtration protection.";
}

export function generateFallbackReport(weatherData: WeatherData, persona: PersonaType): IntelligenceReport {
  const current = weatherData.current;
  const city = weatherData.city;
  const aq = weatherData.airQuality;
  const uv = current.uvIndex;
  const temp = current.temp;

  // 1. Executive Summary
  let summary = `Meteorological telemetry for ${city.name} indicates ${temp}°C (${getWeatherDesc(current.weatherCode).toLowerCase()}) with a wind velocity of ${current.windSpeed} km/h and ${current.humidity}% relative humidity. Air quality is registered at US AQI ${aq.usAqi} (${getAQIDesc(aq.usAqi)}), with a UV index of ${uv}. `;
  
  switch (persona) {
    case "athlete":
      summary += `Prioritize scheduling intensive cardio around prime thermodynamic windows, keeping hydration rates elevated, and safeguarding your respiratory tract from particulate loads.`;
      break;
    case "parent":
      summary += `Focus on optimizing shade coordinates for stroller walks, planning protective skin barriers against ultraviolet spikes, and maintaining regular fluid schedules for children.`;
      break;
    case "traveler":
      summary += `Focus on adjusting travel timelines for sudden thermal transitions, packing versatile garments, and optimizing business clothing layering structures.`;
      break;
    case "gardener":
      summary += `Focus on managing soil moisture levels against transpiration rates, securing sensitive stalks against wind shear, and planning organic pesticide applications.`;
      break;
    case "energy":
      summary += `Align high-demand thermal appliance cycles with peak cooling windows and solar absorption limits to insulate your local electricity budget.`;
      break;
    default:
      summary += `Focus on preparing commute layers, tracking solar ultraviolet thresholds, and planning daily activities against the thermodynamic profile.`;
  }

  // 2. Highlights
  const highlights: string[] = [
    `Solar Irradiation Peak: Today's UV Index reaches ${uv}. ${uv >= 6 ? "Critical ultraviolet load requires protective shielding and sunblock." : "Low-to-moderate solar radiation detected; minimal risk under standard schedules."}`,
    `Chemical Air Mixture: US AQI is ${aq.usAqi} (${getAQIDesc(aq.usAqi)}). ${getAQIWarning(aq.usAqi)}`,
    `Thermal Profile: Base temperature is ${temp}°C, feeling like ${current.feltTemp}°C. ${temp >= 30 ? "Substantial ambient heat load is expected. Stay in shaded spaces." : temp < 15 ? "Cooler thermal gradient detected. Layer up before heading out." : "Excellent room-temperature equilibrium; comfortable for typical routines."}`,
    `Wind Dynamics: Lateral wind currents are moving at ${current.windSpeed} km/h. ${current.windSpeed >= 20 ? "Elevated mechanical wind force. Secure lightweight structures." : "Calm aerodynamic draft."}`
  ];

  // 3. Impact Analysis
  const impactAnalysis: { category: string; impact: "low" | "medium" | "high" | "critical"; description: string }[] = [];
  
  if (persona === "athlete") {
    impactAnalysis.push({
      category: "Aerobic Performance",
      impact: aq.usAqi > 100 ? "high" : temp > 30 ? "medium" : "low",
      description: aq.usAqi > 100 
        ? `High pollution load (AQI ${aq.usAqi}) increases respiratory strain. Restrict heavy exertion to well-ventilated indoor spaces.` 
        : `Normal respiratory threshold. Safe for heavy cardiovascular loading.`
    });
    impactAnalysis.push({
      category: "Thermal Strain",
      impact: temp > 32 ? "high" : temp > 28 ? "medium" : "low",
      description: temp > 28 
        ? `Ambient temperatures of ${temp}°C accelerate metabolic heat buildup. Regular cooling and electrolyte replenishment are vital.` 
        : `Ideal temperature ranges allow for comfortable biomechanical work with standard water cycles.`
    });
  } else if (persona === "parent") {
    impactAnalysis.push({
      category: "Dermal Protection",
      impact: uv >= 6 ? "high" : uv >= 3 ? "medium" : "low",
      description: uv >= 6 
        ? `Very strong UV peak of ${uv} demands broad-spectrum SPF 30+, hats, and stroller shades to guard young, sensitive skin layers.` 
        : `Standard sunscreen application and normal shade options provide plenty of defense.`
    });
    impactAnalysis.push({
      category: "Kids Thermal Comfort",
      impact: temp > 30 || temp < 14 ? "medium" : "low",
      description: temp > 30 
        ? `Warm ambient heat demands light, loose-fitting cotton clothing and constant active fluid replenishment.` 
        : temp < 14 
          ? `Cooler draft requires a light fleece or windbreaker layers for strollers.` 
          : `Perfect indoor/outdoor balance for general play schedules.`
    });
  } else if (persona === "traveler") {
    impactAnalysis.push({
      category: "Commuter & Transit Friction",
      impact: current.windSpeed > 25 || current.weatherCode >= 51 ? "medium" : "low",
      description: current.weatherCode >= 51 
        ? `Precipitation risk may lead to road delays, wet pavement, and minor travel friction. Adjust timing by 10-15 minutes.` 
        : `Clear or dry atmospheric conditions should keep transit channels moving smoothly.`
    });
    impactAnalysis.push({
      category: "Luggage Versatility",
      impact: Math.abs(temp - 20) > 10 ? "medium" : "low",
      description: temp < 15 
        ? `Cool environment: Pack compression knits, modular sweaters, and windproof outer layers.` 
        : temp > 30 
          ? `Warm environment: Focus on packing linen, high-breathability fibers, and solar shades.` 
          : `Mild environment: Versatile standard business casual dress code applies.`
    });
  } else if (persona === "gardener") {
    impactAnalysis.push({
      category: "Transpiration Loss",
      impact: temp > 30 && current.humidity < 50 ? "high" : "low",
      description: temp > 30 && current.humidity < 50 
        ? `High evaporation forces plants to lose moisture rapidly. Schedule thorough watering before 9:00 AM or after 6:00 PM.` 
        : `Stable humidity keeps soil moisture evaporation at standard rates.`
    });
    impactAnalysis.push({
      category: "Physical Plant Stress",
      impact: current.windSpeed > 20 ? "medium" : "low",
      description: current.windSpeed > 20 
        ? `Wind speed at ${current.windSpeed} km/h poses a minor hazard for fragile climbing vines. Check stakes and support ties.` 
        : `Minimal mechanical stress from localized air currents.`
    });
  } else if (persona === "energy") {
    impactAnalysis.push({
      category: "Cooling Demand Peaks",
      impact: temp > 32 ? "high" : temp > 28 ? "medium" : "low",
      description: temp > 28 
        ? `Thermodynamic loading of ${temp}°C requires smart cooling. Pre-cool rooms early in the morning and close thermal curtains.` 
        : `Thermostatic load is optimal. Natural ventilation can completely replace active mechanical compressor operations.`
    });
    impactAnalysis.push({
      category: "Solar Photovoltaic Return",
      impact: current.cloudCover < 20 ? "high" : current.cloudCover < 50 ? "medium" : "low",
      description: current.cloudCover < 30 
        ? `Minimal cloud cover of ${current.cloudCover}% yields optimal photovoltaic solar reception. Run heavy appliances during peak noon.` 
        : `Scattered clouds will temporarily shade arrays; expect minor fluctuations in clean power yields.`
    });
  } else {
    // General Persona
    impactAnalysis.push({
      category: "Transit Comfort",
      impact: temp > 30 ? "medium" : "low",
      description: temp > 30 
        ? `Warm ambient temperature peaks of ${temp}°C. Choose breathable light fabrics to avoid moisture accumulation during travel.` 
        : `Very mild ambient conditions make outdoor walks and general commuting comfortable.`
    });
    impactAnalysis.push({
      category: "Respiratory Integrity",
      impact: aq.usAqi > 100 ? "medium" : "low",
      description: aq.usAqi > 100 
        ? `AQI of ${aq.usAqi} indicates mild pollutant buildup. Sensitive groups should avoid strenuous physical activity during rush hours.` 
        : `Optimal air quality indices allow for unrestricted aerobic exposure.`
    });
  }

  // Always fill remaining categories to ensure 3 impacts
  if (impactAnalysis.length < 3) {
    impactAnalysis.push({
      category: "Immunological Defense",
      impact: uv >= 6 ? "medium" : "low",
      description: uv >= 6 
        ? `High ultraviolet load of ${uv} demands basic cellular protective care like consistent hydration and antioxidant intake.` 
        : `Atmospheric radiation levels are low, keeping systemic physical stress minimal.`
    });
  }
  if (impactAnalysis.length < 3) {
    impactAnalysis.push({
      category: "Barometric Pressure Change",
      impact: current.pressure < 1008 ? "medium" : "low",
      description: current.pressure < 1008 
        ? `Slightly low barometric pressure (${current.pressure} hPa) could trigger minor migraines or joint aches in sensitive individuals.` 
        : `Stable atmospheric pressure levels keep somatic balance steady.`
    });
  }

  // 4. Action Checklist
  const checklist: { task: string; reason: string }[] = [];
  
  if (persona === "athlete") {
    checklist.push(
      { task: "Hydration Pre-loading", reason: "Consume 500ml of fluid with electrolytes 60 minutes prior to outdoor athletic work." },
      { task: "Time workouts for cool periods", reason: "The heat index is lowest in early morning hours, which helps reduce peak core body strain." },
      { task: "Map indoor workout loops", reason: aq.usAqi > 100 ? "Avoid heavy particulate inhalation in polluted air." : "Keep these ready in case of unexpected convective showers." }
    );
  } else if (persona === "parent") {
    checklist.push(
      { task: "Apply broad-spectrum sun protection", reason: `The peak UV index of ${uv} demands physical barriers for sensitive young skin.` },
      { task: "Pack cooling hydration packs", reason: "Children have higher thermal absorption rates; pack iced water or cold fruit slices." },
      { task: "Plan indoor backup play", reason: "Prepare localized indoor environments to bypass peak thermal and ultraviolet radiation windows." }
    );
  } else if (persona === "traveler") {
    checklist.push(
      { task: "Assemble modular dress layers", reason: "Enables rapid styling adjustments between air-conditioned vehicles and warm outdoor streets." },
      { task: "Pack technical travel shields", reason: `Keep lightweight umbrellas and compact solar shades in your carry-on luggage.` },
      { task: "Audit commuter timetables", reason: "Verify localized transit networks early to dodge potential weather-related scheduling bottlenecks." }
    );
  } else if (persona === "gardener") {
    checklist.push(
      { task: "Deep early watering", reason: "Water roots early to lock in moisture before thermal evaporation rates rise." },
      { task: "Inspect physical stakes and ties", reason: `Wind speeds of ${current.windSpeed} km/h require strong supports for climbing flora.` },
      { task: "Apply organic mulch blankets", reason: "Reduces thermal shock to soil and preserves root dampness during temperature peaks." }
    );
  } else if (persona === "energy") {
    checklist.push(
      { task: "Schedule thermal pre-cooling", reason: `Pre-cool between 5 AM and 9 AM to minimize peak afternoon HVAC system strain.` },
      { task: "Shift heavy appliance usage", reason: `Run dishwashers and laundry at peak solar generation hours to utilize clean energy.` },
      { task: "Utilize passive shade strategies", reason: "Lower curtains on east-facing windows in the morning and west-facing windows in the afternoon." }
    );
  } else {
    checklist.push(
      { task: "Wear modular light clothing", reason: `Temp averages of ${temp}°C are best handled with flexible, light fabrics.` },
      { task: "Configure sun protective shades", reason: `Carry sunglasses and hats to defend against today's peak UV index of ${uv}.` },
      { task: "Perform deep breathing exercises", reason: "Helps maximize cardiorespiratory endurance during standard daily transits." }
    );
  }

  // 5. Recommendations
  const clothing: string[] = [];
  const gear: string[] = [];
  
  if (temp > 30) {
    clothing.push("Ultra-lightweight open-weave cotton shirts", "Loose athletic shorts or linen trousers", "Ventilated mesh footwear");
    gear.push("Polyester hydration flask", "Wide-brimmed solar hat", "Polarized UV-blocking sunglasses");
  } else if (temp < 15) {
    clothing.push("Thermal base layer", "Merino wool knitwear", "Wind-resistant shell jacket");
    gear.push("Insulated travel thermos", "Compact travel umbrella", "Tactile touchscreen gloves");
  } else {
    clothing.push("Breathable linen or light cotton shirt", "Chino trousers or summer skirt", "Flexible light sneakers");
    gear.push("Reusable glass infuser bottle", "Classic polarized eyewear", "Compact daily shoulder pack");
  }

  if (aq.usAqi > 100) {
    gear.push("High-filtration respirator mask (N95 or PM2.5 level)");
  }

  // 6. Activity Planner
  const activityPlanner: { timeWindow: string; activity: string; suitability: "excellent" | "good" | "poor"; reason: string }[] = [
    {
      timeWindow: "06:00 - 09:00",
      activity: persona === "athlete" ? "Outdoor cardio workouts" : persona === "gardener" ? "Soil irrigation & pruning" : "Early outdoor walks",
      suitability: temp > 30 ? "excellent" : "good",
      reason: "Atmospheric temperatures are at their daily low, and wind speeds are gentle."
    },
    {
      timeWindow: "11:00 - 15:00",
      activity: persona === "energy" ? "Heavy solar-powered appliance runs" : "Indoor administrative work",
      suitability: uv >= 6 ? "poor" : "good",
      reason: `Peak solar UV radiation reaching index ${uv}. Direct exposure should be avoided to minimize skin strain.`
    },
    {
      timeWindow: "17:00 - 20:00",
      activity: "Social activities and gentle commuting",
      suitability: "excellent",
      reason: "Ultraviolet rays are gone, and cooling breezes help lower thermal loads."
    }
  ];

  // 7. Markdown Report
  let markdownText = `# 📊 WEATHER INTELLIGENCE ANALYSIS BRIEF
*Target Profile: ${persona.toUpperCase()} | Location: ${city.name} (${city.country})*

---

### 🔍 Executive Meteorological Synopsis
The real-time localized atmospheric telemetry for **${city.name}** reveals a thermal reading of **${temp}°C**, which feels like **${current.feltTemp}°C**. The lateral air velocity is registered at **${current.windSpeed} km/h**, and the barometric pressure is **${current.pressure} hPa**.

Air chemical indices show a **US AQI of ${aq.usAqi}**, which places air cleanliness in the **${getAQIDesc(aq.usAqi).toUpperCase()}** tier. Localized ultraviolet rays have peaked at **UV Index ${uv}**.

---

### 🛡️ Tailored Persona Tactical Guidance
For the **${persona.replace(/^\w/, (c) => c.toUpperCase())}** user profile, today's conditions present specific operational factors:

1. **Thermodynamic Management**: Ensure proper hydration and choose appropriate layers based on the local thermal profile.
2. **Atmospheric Purity**: ${aq.usAqi > 100 ? "Elevated particulate concentrations demand protective masks for extended outdoor activities." : "Pristine air quality allows for clear, safe deep breathing."}
3. **Solar Exposure Limits**: ${uv >= 6 ? "Intense UV radiation requires proper physical shields and sunscreen applications." : "Moderate solar load is safe for short outdoor walks."}

---

### 📋 Operational Checklist & Prioritization
*   **[Priority 1]**: ${checklist[0].task} — *${checklist[0].reason}*
*   **[Priority 2]**: ${checklist[1].task} — *${checklist[1].reason}*
*   **[Priority 3]**: ${checklist[2].task} — *${checklist[2].reason}*

---

*Brief generated using local meteorological telemetry logic. Configure your \`GEMINI_API_KEY\` in Settings > Secrets to unlock full generative LLM insights.*`;

  return {
    summary,
    highlights,
    impactAnalysis,
    checklist,
    recommendations: {
      clothing,
      gear,
      activityPlanner
    },
    markdownText,
    isFallback: true
  };
}
