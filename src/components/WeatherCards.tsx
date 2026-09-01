/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Sun, Moon, Cloud, CloudRain, CloudLightning, CloudSnow, CloudDrizzle, 
  Wind, Navigation, Droplets, Thermometer, Gauge, Eye, Compass, 
  Sunset, Sunrise, ShieldAlert, CheckCircle2, AlertTriangle, AlertOctagon, Info
} from "lucide-react";
import { WeatherData, AirQuality } from "../types";

// WMO Weather Code Mapping Helper
export function getWeatherDetails(code: number, isDay: boolean = true) {
  const mapping: Record<number, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
    0: { 
      label: "Clear Sky", 
      icon: isDay ? <Sun className="w-16 h-16 text-amber-400 animate-spin-slow" /> : <Moon className="w-16 h-16 text-indigo-200" />, 
      bg: isDay ? "from-amber-50 to-orange-100 dark:from-amber-950/20 dark:to-orange-950/10" : "from-slate-900 to-indigo-950",
      text: "text-amber-600 dark:text-amber-400"
    },
    1: { 
      label: "Mainly Clear", 
      icon: isDay ? <Sun className="w-16 h-16 text-amber-300 animate-pulse" /> : <Moon className="w-16 h-16 text-slate-300" />, 
      bg: isDay ? "from-amber-50 to-sky-100 dark:from-amber-950/20 dark:to-slate-950/10" : "from-slate-900 to-slate-950",
      text: "text-amber-500 dark:text-amber-300"
    },
    2: { 
      label: "Partly Cloudy", 
      icon: <Cloud className="w-16 h-16 text-slate-400 animate-bounce-slow" />, 
      bg: "from-sky-50 to-slate-100 dark:from-sky-950/20 dark:to-slate-950/10",
      text: "text-slate-500"
    },
    3: { 
      label: "Overcast", 
      icon: <Cloud className="w-16 h-16 text-slate-500" />, 
      bg: "from-slate-100 to-slate-200 dark:from-slate-900/40 dark:to-slate-950",
      text: "text-slate-600 dark:text-slate-400"
    },
    45: { 
      label: "Fog", 
      icon: <Eye className="w-16 h-16 text-slate-400 animate-pulse" />, 
      bg: "from-slate-100 to-zinc-200 dark:from-slate-900 dark:to-zinc-950",
      text: "text-slate-500"
    },
    48: { 
      label: "Depositing Rime Fog", 
      icon: <Eye className="w-16 h-16 text-zinc-300" />, 
      bg: "from-zinc-100 to-slate-200 dark:from-zinc-900 dark:to-slate-950",
      text: "text-zinc-500"
    },
    51: { 
      label: "Light Drizzle", 
      icon: <CloudDrizzle className="w-16 h-16 text-sky-400" />, 
      bg: "from-sky-50 to-blue-100 dark:from-sky-950/20 dark:to-blue-950/10",
      text: "text-sky-500"
    },
    53: { 
      label: "Moderate Drizzle", 
      icon: <CloudDrizzle className="w-16 h-16 text-sky-500" />, 
      bg: "from-sky-50 to-blue-150 dark:from-sky-950/20 dark:to-blue-950/15",
      text: "text-sky-600"
    },
    55: { 
      label: "Dense Drizzle", 
      icon: <CloudDrizzle className="w-16 h-16 text-sky-600" />, 
      bg: "from-sky-100 to-blue-200 dark:from-sky-900/30 dark:to-blue-900/20",
      text: "text-sky-700"
    },
    56: { 
      label: "Light Freezing Drizzle", 
      icon: <CloudSnow className="w-16 h-16 text-blue-300" />, 
      bg: "from-blue-50 to-slate-100 dark:from-blue-950/20 dark:to-slate-950/10",
      text: "text-blue-400"
    },
    57: { 
      label: "Dense Freezing Drizzle", 
      icon: <CloudSnow className="w-16 h-16 text-blue-400" />, 
      bg: "from-blue-100 to-slate-200 dark:from-blue-950/30 dark:to-slate-950/20",
      text: "text-blue-500"
    },
    61: { 
      label: "Slight Rain", 
      icon: <CloudRain className="w-16 h-16 text-blue-400" />, 
      bg: "from-blue-50 to-sky-100 dark:from-blue-950/20 dark:to-sky-950/10",
      text: "text-blue-500"
    },
    63: { 
      label: "Moderate Rain", 
      icon: <CloudRain className="w-16 h-16 text-blue-500" />, 
      bg: "from-blue-100 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/10",
      text: "text-blue-600"
    },
    65: { 
      label: "Heavy Rain", 
      icon: <CloudRain className="w-16 h-16 text-blue-600 animate-bounce" />, 
      bg: "from-blue-100 to-slate-300 dark:from-blue-950/40 dark:to-slate-900/40",
      text: "text-blue-700"
    },
    66: { 
      label: "Light Freezing Rain", 
      icon: <CloudSnow className="w-16 h-16 text-sky-300" />, 
      bg: "from-sky-50 to-blue-200 dark:from-sky-950/20 dark:to-blue-950/20",
      text: "text-sky-500"
    },
    67: { 
      label: "Heavy Freezing Rain", 
      icon: <CloudSnow className="w-16 h-16 text-blue-500" />, 
      bg: "from-blue-100 to-indigo-200 dark:from-blue-950/40 dark:to-indigo-950/30",
      text: "text-blue-600"
    },
    71: { 
      label: "Slight Snowfall", 
      icon: <CloudSnow className="w-16 h-16 text-sky-200 animate-pulse" />, 
      bg: "from-blue-50 to-slate-50 dark:from-blue-950/10 dark:to-slate-950/10",
      text: "text-sky-400"
    },
    73: { 
      label: "Moderate Snowfall", 
      icon: <CloudSnow className="w-16 h-16 text-sky-300 animate-pulse" />, 
      bg: "from-blue-100 to-slate-100 dark:from-blue-950/20 dark:to-slate-950/25",
      text: "text-sky-500"
    },
    75: { 
      label: "Heavy Snowfall", 
      icon: <CloudSnow className="w-16 h-16 text-blue-300" />, 
      bg: "from-slate-100 to-zinc-200 dark:from-slate-900 dark:to-zinc-900",
      text: "text-blue-600"
    },
    77: { 
      label: "Snow Grains", 
      icon: <CloudSnow className="w-16 h-16 text-blue-200" />, 
      bg: "from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950/10",
      text: "text-indigo-400"
    },
    80: { 
      label: "Slight Rain Showers", 
      icon: <CloudRain className="w-16 h-16 text-sky-400 animate-bounce" />, 
      bg: "from-sky-50 to-blue-100 dark:from-sky-950/10 dark:to-blue-950/10",
      text: "text-sky-500"
    },
    81: { 
      label: "Moderate Rain Showers", 
      icon: <CloudRain className="w-16 h-16 text-sky-500 animate-bounce" />, 
      bg: "from-sky-50 to-indigo-100 dark:from-sky-950/15 dark:to-indigo-950/15",
      text: "text-sky-600"
    },
    82: { 
      label: "Violent Rain Showers", 
      icon: <CloudRain className="w-16 h-16 text-indigo-600 animate-bounce" />, 
      bg: "from-indigo-100 to-slate-300 dark:from-indigo-950/30 dark:to-slate-900/30",
      text: "text-indigo-700"
    },
    85: { 
      label: "Slight Snow Showers", 
      icon: <CloudSnow className="w-16 h-16 text-sky-300" />, 
      bg: "from-sky-50 to-blue-100 dark:from-sky-950/10 dark:to-blue-950/10",
      text: "text-sky-400"
    },
    86: { 
      label: "Heavy Snow Showers", 
      icon: <CloudSnow className="w-16 h-16 text-blue-300 animate-pulse" />, 
      bg: "from-blue-100 to-slate-200 dark:from-blue-950/20 dark:to-slate-950/20",
      text: "text-blue-500"
    },
    95: { 
      label: "Thunderstorm", 
      icon: <CloudLightning className="w-16 h-16 text-amber-500 animate-pulse" />, 
      bg: "from-amber-50 to-slate-300 dark:from-amber-950/10 dark:to-slate-900/30",
      text: "text-amber-600 dark:text-amber-400"
    },
    96: { 
      label: "Thunderstorm with Hail", 
      icon: <CloudLightning className="w-16 h-16 text-amber-600 animate-pulse" />, 
      bg: "from-amber-100 to-slate-400 dark:from-amber-950/20 dark:to-slate-900/40",
      text: "text-amber-600 dark:text-amber-400"
    },
    99: { 
      label: "Heavy Thunderstorm with Hail", 
      icon: <CloudLightning className="w-16 h-16 text-red-500 animate-pulse" />, 
      bg: "from-red-50 to-slate-500 dark:from-red-950/20 dark:to-slate-900/50",
      text: "text-red-500"
    }
  };

  return mapping[code] || { 
    label: "Unknown Conditions", 
    icon: <Cloud className="w-16 h-16 text-slate-400" />, 
    bg: "from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950", 
    text: "text-slate-500" 
  };
}

// 1. Current Weather Primary Card
interface CurrentWeatherCardProps {
  data: WeatherData;
}

export function CurrentWeatherCard({ data }: CurrentWeatherCardProps) {
  const [localTime, setLocalTime] = useState("");
  const weatherDetails = getWeatherDetails(data.current.weatherCode, data.current.isDay);

  useEffect(() => {
    const updateTime = () => {
      try {
        const formatted = new Date().toLocaleTimeString("en-US", {
          timeZone: data.city.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });
        setLocalTime(formatted);
      } catch (e) {
        setLocalTime(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [data.city.timezone]);

  return (
    <div 
      id="current-weather-card"
      className="relative overflow-hidden rounded-[24px] glass-card glass-card-hover p-8 transition-all duration-500 flex flex-col justify-between min-h-[340px] shadow-2xl"
    >
      {/* Decorative ambient background glows matching Immersive UI */}
      <div className="glow-blob glow-blue w-[320px] h-[320px] -top-[120px] -right-[100px]" />
      <div className="glow-blob glow-indigo w-[200px] h-[200px] -bottom-[80px] -left-[60px]" />

      {/* Top row: City Name and Dynamic Local Clock */}
      <div className="flex justify-between items-start z-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {data.city.name}
            {data.city.countryCode && (
              <span className="text-xs font-semibold bg-white/10 text-sky-400 border border-white/10 px-2 py-0.5 rounded-md uppercase">
                {data.city.countryCode}
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            {data.city.state ? `${data.city.state}, ` : ""}{data.city.country}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold text-sky-400 tabular-nums">
            {localTime || "--:--:--"}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">
            Satellite Synced Time
          </p>
        </div>
      </div>

      {/* Middle row: Visual Weather Animation & Massive Temp */}
      <div className="flex items-center justify-between my-6 z-10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
            {weatherDetails.icon}
          </div>
          <div>
            <span className="text-lg font-bold tracking-wider text-sky-400 uppercase font-display block">
              {weatherDetails.label}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Feels like <strong className="text-white text-sm">{data.current.feltTemp}°C</strong>
            </p>
          </div>
        </div>
        <div className="flex items-start">
          <span className="text-7xl font-extralight tracking-tighter text-white tabular-nums temp-glow">
            {Math.round(data.current.temp)}
          </span>
          <span className="text-3xl font-light text-sky-400 mt-2 ml-1">
            °C
          </span>
        </div>
      </div>

      {/* Bottom Row: Detailed current barometers */}
      <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/10 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-sky-400">
            <Droplets className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Humidity</p>
            <p className="text-sm font-semibold text-white tabular-nums">{data.current.humidity}%</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-emerald-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Pressure</p>
            <p className="text-sm font-semibold text-white tabular-nums">{Math.round(data.current.pressure)} hPa</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-slate-400">
            <Cloud className="w-4 h-4 text-sky-300" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Cloud Cover</p>
            <p className="text-sm font-semibold text-white tabular-nums">{data.current.cloudCover}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Air Quality Detailed Dashboard
interface AirQualityCardProps {
  aqi: AirQuality;
}

export function AirQualityCard({ aqi }: AirQualityCardProps) {
  // Get US AQI classification
  const getUSClassification = (val: number) => {
    if (val <= 50) return { label: "Good", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20", progressColor: "bg-emerald-500", text: "text-emerald-400", desc: "Air quality is highly satisfactory with zero risks." };
    if (val <= 100) return { label: "Moderate", color: "bg-amber-500/20 text-amber-400 border-amber-500/20", progressColor: "bg-amber-500", text: "text-amber-400", desc: "Air quality is acceptable; mild concerns for sensitive groups." };
    if (val <= 150) return { label: "Unhealthy for Sensitive Groups", color: "bg-orange-500/20 text-orange-400 border-orange-500/20", progressColor: "bg-orange-500", text: "text-orange-400", desc: "Members of sensitive groups may feel respiratory strain." };
    if (val <= 200) return { label: "Unhealthy", color: "bg-red-500/20 text-red-400 border-red-500/20", progressColor: "bg-red-500", text: "text-red-400", desc: "Everyone may begin to feel effects. Protective measures advised." };
    if (val <= 300) return { label: "Very Unhealthy", color: "bg-purple-600/20 text-purple-400 border-purple-600/20", progressColor: "bg-purple-500", text: "text-purple-400", desc: "Health alert: high levels of industrial/atmospheric residue." };
    return { label: "Hazardous", color: "bg-rose-950/40 text-rose-400 border-rose-950/20", progressColor: "bg-rose-600", text: "text-rose-500", desc: "Emergency status. Severe environmental contaminant vectors." };
  };

  const currentClass = getUSClassification(aqi.usAqi);

  return (
    <div id="air-quality-card" className="glass-card glass-card-hover rounded-[24px] p-6 flex flex-col justify-between h-full relative overflow-hidden shadow-xl">
      <div className="glow-blob glow-purple w-[150px] h-[150px] -bottom-[30px] -right-[30px]" />
      
      <div className="z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
            Air Quality Index
          </h3>
          <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg border ${currentClass.color}`}>
            {currentClass.label}
          </span>
        </div>

        {/* Central visual indicator */}
        <div className="flex items-end justify-between py-2">
          <div>
            <div className="flex items-baseline">
              <span className="text-5xl font-light tracking-tight text-white tabular-nums temp-glow">
                {aqi.usAqi}
              </span>
              <span className="text-[10px] font-bold font-mono text-slate-500 ml-2 uppercase tracking-widest">
                US AQI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {currentClass.desc}
            </p>
          </div>
        </div>

        {/* Progress gauge slider */}
        <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden relative">
          <div 
            className={`h-full ${currentClass.progressColor} rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]`}
            style={{ width: `${Math.min(100, (aqi.usAqi / 300) * 100)}%` }}
          />
        </div>
      </div>

      {/* Breakdowns of individual pollutants */}
      <div className="grid grid-cols-3 gap-2.5 pt-5 mt-4 border-t border-white/5 z-10">
        <div className="bg-white/2 p-2 rounded-xl text-center border border-white/5">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">PM2.5</p>
          <p className="text-sm font-semibold text-white mt-0.5 tabular-nums">{Math.round(aqi.pm25)}</p>
          <p className="text-[9px] text-slate-600 font-medium">µg/m³</p>
        </div>
        <div className="bg-white/2 p-2 rounded-xl text-center border border-white/5">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">PM10</p>
          <p className="text-sm font-semibold text-white mt-0.5 tabular-nums">{Math.round(aqi.pm10)}</p>
          <p className="text-[9px] text-slate-600 font-medium">µg/m³</p>
        </div>
        <div className="bg-white/2 p-2 rounded-xl text-center border border-white/5">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">O₃</p>
          <p className="text-sm font-semibold text-white mt-0.5 tabular-nums">{Math.round(aqi.o3)}</p>
          <p className="text-[9px] text-slate-600 font-medium">µg/m³</p>
        </div>
        <div className="bg-white/2 p-2 rounded-xl text-center border border-white/5">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">CO</p>
          <p className="text-xs font-semibold text-white mt-0.5 tabular-nums">{Math.round(aqi.co)}</p>
          <p className="text-[9px] text-slate-600 font-medium">µg/m³</p>
        </div>
        <div className="bg-white/2 p-2 rounded-xl text-center border border-white/5">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">NO₂</p>
          <p className="text-xs font-semibold text-white mt-0.5 tabular-nums">{Math.round(aqi.no2)}</p>
          <p className="text-[9px] text-slate-600 font-medium">µg/m³</p>
        </div>
        <div className="bg-white/2 p-2 rounded-xl text-center border border-white/5">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">SO₂</p>
          <p className="text-xs font-semibold text-white mt-0.5 tabular-nums">{Math.round(aqi.so2)}</p>
          <p className="text-[9px] text-slate-600 font-medium">µg/m³</p>
        </div>
      </div>
    </div>
  );
}

// 3. Interactive Wind Compass Card
interface WindCardProps {
  speed: number;
  direction: number;
}

export function WindCard({ speed, direction }: WindCardProps) {
  const getWindCardinal = (deg: number) => {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index];
  };

  const cardinal = getWindCardinal(direction);

  return (
    <div id="wind-card" className="glass-card glass-card-hover rounded-[24px] p-6 flex flex-col justify-between h-full relative overflow-hidden shadow-xl">
      <div className="glow-blob glow-blue w-[150px] h-[150px] -top-[40px] -left-[40px]" />
      
      <div className="z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
            Wind Vector Direction
          </h3>
          <Wind className="w-4 h-4 text-sky-400" />
        </div>

        <div className="flex items-center gap-6 py-2">
          {/* Animated Compass Dial */}
          <div className="relative w-24 h-24 rounded-full border border-white/10 bg-white/2 flex items-center justify-center shrink-0">
            <span className="absolute top-1 text-[9px] font-bold font-mono text-slate-500">N</span>
            <span className="absolute right-1.5 text-[9px] font-bold font-mono text-slate-500">E</span>
            <span className="absolute bottom-1 text-[9px] font-bold font-mono text-slate-500">S</span>
            <span className="absolute left-1.5 text-[9px] font-bold font-mono text-slate-500">W</span>
            
            {/* Central Pivot Pointer */}
            <div 
              className="w-1 h-12 bg-sky-400 rounded-full transition-transform duration-700 ease-out flex items-start"
              style={{ transform: `rotate(${direction}deg)` }}
            >
              <div className="w-1 h-3.5 bg-red-500 rounded-full shadow-[0_0_8px_#ef4444]" />
            </div>
            <div className="absolute w-2 h-2 bg-slate-900 border border-sky-400 rounded-full shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
          </div>

          {/* Speed Data Display */}
          <div>
            <div className="flex items-baseline">
              <span className="text-4xl font-light text-white tabular-nums temp-glow">
                {Math.round(speed)}
              </span>
              <span className="text-xs font-bold text-sky-400 ml-1.5">
                km/h
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mt-2">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              {cardinal} ({direction}°)
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              {speed > 25 ? "Active meteorological drafts present." : "Calm atmospheric drift detected."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. UV Index Risk Meter Card
interface UVIndexCardProps {
  uv: number;
}

export function UVIndexCard({ uv }: UVIndexCardProps) {
  const getUVStatus = (index: number) => {
    if (index <= 2) return { label: "Low", color: "text-emerald-400", barColor: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", advice: "Safe for most. Standard shades recommended." };
    if (index <= 5) return { label: "Moderate", color: "text-amber-400", barColor: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", advice: "Apply protection. Solar intensity is medium." };
    if (index <= 7) return { label: "High", color: "text-orange-400", barColor: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]", advice: "Seek shade midday. Apply SPF 30+ immediately." };
    if (index <= 10) return { label: "Very High", color: "text-red-400", barColor: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]", advice: "Minimize exposure. Skin damage may result rapidly." };
    return { label: "Extreme", color: "text-purple-400", barColor: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]", advice: "Unprotected skin burns within minutes." };
  };

  const status = getUVStatus(uv);

  return (
    <div id="uv-card" className="glass-card glass-card-hover rounded-[24px] p-6 flex flex-col justify-between h-full relative overflow-hidden shadow-xl">
      <div className="glow-blob glow-indigo w-[150px] h-[150px] -top-[40px] -right-[40px]" />

      <div className="z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
            Ultraviolet Exposure
          </h3>
          <Sun className="w-4 h-4 text-amber-400 animate-pulse-slow" />
        </div>

        <div>
          <div className="flex items-baseline py-1">
            <span className="text-5xl font-light text-white tabular-nums temp-glow">
              {Math.round(uv * 10) / 10}
            </span>
            <span className={`text-xs font-bold font-mono ml-2.5 uppercase tracking-widest ${status.color}`}>
              {status.label}
            </span>
          </div>
          
          {/* Dynamic Multi-segment Bar */}
          <div className="grid grid-cols-5 gap-1.5 w-full mt-4">
            {[1, 2, 3, 4, 5].map((i) => {
              const isActive = i <= Math.ceil(uv / 2.4);
              return (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive ? status.barColor : "bg-white/5"
                  }`} 
                />
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            {status.advice}
          </p>
        </div>
      </div>
    </div>
  );
}

// 5. Sun Cycle / Astronomical Card
interface SunCycleCardProps {
  sunrise: string;
  sunset: string;
  daylightHours: number;
  timezone: string;
}

export function SunCycleCard({ sunrise, sunset, daylightHours, timezone }: SunCycleCardProps) {
  const [percentOfDaylight, setPercentOfDaylight] = useState(0);

  useEffect(() => {
    try {
      const parseTimeString = (iso: string) => {
        return new Date(iso).getTime();
      };

      const riseTime = parseTimeString(sunrise);
      const setTime = parseTimeString(sunset);
      const nowTime = new Date().getTime();

      if (nowTime < riseTime) {
        setPercentOfDaylight(0);
      } else if (nowTime > setTime) {
        setPercentOfDaylight(100);
      } else {
        const total = setTime - riseTime;
        const elapsed = nowTime - riseTime;
        setPercentOfDaylight(Math.round((elapsed / total) * 100));
      }
    } catch (e) {
      setPercentOfDaylight(50);
    }
  }, [sunrise, sunset]);

  const formatISOToLocalTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return "--:--";
    }
  };

  return (
    <div id="sun-cycle-card" className="glass-card glass-card-hover rounded-[24px] p-6 flex flex-col justify-between h-full relative overflow-hidden shadow-xl">
      <div className="glow-blob glow-blue w-[150px] h-[150px] -bottom-[40px] -left-[40px]" />

      <div className="z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase">
            Solar Transit Cycle
          </h3>
          <Sunset className="w-4 h-4 text-orange-400" />
        </div>

        <div className="relative py-2">
          {/* Curved Arc path for Sun */}
          <div className="h-16 w-full border-b border-dashed border-white/10 relative flex items-end overflow-hidden justify-center">
            {/* Half ellipse SVG path */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 50" preserveAspectRatio="none">
              <path 
                d="M 5,48 A 45,45 0 0,1 95,48" 
                fill="none" 
                stroke="url(#arcGradient)" 
                strokeWidth="1.5" 
                strokeDasharray="2,2" 
              />
              <defs>
                <linearGradient id="arcGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>

            {/* Sun Dot sliding on the arc */}
            <div 
              className="absolute w-4 h-4 bg-amber-400 rounded-full border-2 border-slate-950 shadow-[0_0_12px_#f59e0b] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
              style={{
                left: `${5 + (percentOfDaylight / 100) * 90}%`,
                bottom: `${Math.sin((percentOfDaylight / 100) * Math.PI) * 35}px`
              }}
            />
          </div>

          {/* Sunrise/Sunset Markers */}
          <div className="flex justify-between mt-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Sunrise className="w-3.5 h-3.5 text-sky-400" />
              <div>
                <p className="font-bold font-mono uppercase tracking-wider text-[8px] text-slate-500">Rise</p>
                <p className="font-medium font-mono text-[11px] tabular-nums">{formatISOToLocalTime(sunrise)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-right">
              <div>
                <p className="font-bold font-mono uppercase tracking-wider text-[8px] text-slate-500">Set</p>
                <p className="font-medium font-mono text-[11px] tabular-nums">{formatISOToLocalTime(sunset)}</p>
              </div>
              <Sunset className="w-3.5 h-3.5 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 mt-2 z-10 text-center">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Solar transit window: <strong className="text-sky-400 font-mono font-semibold tabular-nums">{daylightHours}h</strong> active radiation.
        </p>
      </div>
    </div>
  );
}

