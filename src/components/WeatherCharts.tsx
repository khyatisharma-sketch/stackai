/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import { CloudRain, Sun, Thermometer } from "lucide-react";
import { WeatherData, DailyForecastItem, HourlyForecastItem } from "../types";
import { getWeatherDetails } from "./WeatherCards";

interface WeatherChartsProps {
  data: WeatherData;
}

// Custom Tooltip for the Recharts Hourly Chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const tempVal = payload.find((p: any) => p.dataKey === "temp")?.value;
    const precipVal = payload.find((p: any) => p.dataKey === "precipProb")?.value;

    return (
      <div className="glass-card border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
        <div className="space-y-1.5">
          {tempVal !== undefined && (
            <div className="flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_6px_#f97316]" />
              <p className="text-xs font-semibold">Temperature: <span className="font-bold tabular-nums text-orange-400">{tempVal}°C</span></p>
            </div>
          )}
          {precipVal !== undefined && (
            <div className="flex items-center gap-2 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
              <p className="text-xs font-semibold">Rain Chance: <span className="font-bold tabular-nums text-sky-400">{precipVal}%</span></p>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function WeatherCharts({ data }: WeatherChartsProps) {
  // Format hourly data for the Recharts timeline
  const formattedHourlyData = data.hourly.map((item: HourlyForecastItem) => {
    const hour = new Date(item.time).getHours();
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return {
      name: `${displayHour} ${ampm}`,
      temp: Math.round(item.temp * 10) / 10,
      precipProb: item.precipProb,
    };
  });

  // Calculate the overall min and max temp across the 7-day forecast to anchor our progress bars
  const tempsMax = data.daily.map(d => d.tempMax);
  const tempsMin = data.daily.map(d => d.tempMin);
  const absoluteMin = Math.min(...tempsMin);
  const absoluteMax = Math.max(...tempsMax);
  const totalSpan = absoluteMax - absoluteMin || 1;

  // Day Name Formatter
  const getDayName = (dateStr: string, index: number) => {
    if (index === 0) return "Today";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT: 24-Hour Telemetry Timeline Chart (Recharts) */}
      <div id="hourly-chart" className="lg:col-span-7 glass-card glass-card-hover rounded-[24px] p-6 shadow-2xl flex flex-col justify-between min-h-[420px] relative overflow-hidden">
        <div className="glow-blob glow-blue w-[250px] h-[250px] -top-[50px] -left-[50px]" />
        
        <div className="z-10">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-400" />
            24-Hour Telemetry Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-normal mb-6">
            Micro-forecast displaying continuous temperature trends and synoptic precipitation probability curves.
          </p>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-72 z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedHourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPrecip" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fill: "#94a3b8", fontFamily: "JetBrains Mono" }} 
                tickLine={false} 
                axisLine={false} 
                stroke="#475569" 
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 10, fill: "#f97316", fontFamily: "JetBrains Mono" }} 
                tickLine={false} 
                axisLine={false} 
                stroke="#f97316" 
                unit="°" 
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 10, fill: "#38bdf8", fontFamily: "JetBrains Mono" }} 
                tickLine={false} 
                axisLine={false} 
                stroke="#38bdf8" 
                unit="%" 
                domain={[0, 100]} 
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Temperature Area */}
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="temp" 
                stroke="#f97316" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorTemp)" 
                name="Temperature"
              />
              {/* Rain Probability Area */}
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="precipProb" 
                stroke="#38bdf8" 
                strokeWidth={1.5} 
                fillOpacity={1} 
                fill="url(#colorPrecip)" 
                name="Rain Chance"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RIGHT: Apple Weather-style 7-Day Range Bar List */}
      <div id="weekly-forecast" className="lg:col-span-5 glass-card glass-card-hover rounded-[24px] p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
        <div className="glow-blob glow-purple w-[250px] h-[250px] -bottom-[60px] -right-[60px]" />

        <div className="z-10">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-sky-400" />
            7-Day Synoptic Outlook
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-normal mb-4">
            Day-to-day meteorological spans with visual temperature spreads.
          </p>
        </div>

        {/* 7-Day list */}
        <div className="space-y-4 z-10">
          {data.daily.map((day: DailyForecastItem, index: number) => {
            const details = getWeatherDetails(day.weatherCode, true);
            const dayName = getDayName(day.date, index);
            const shortDate = getShortDate(day.date);

            // Apple Weather span slider calculations
            const leftOffsetPercent = ((day.tempMin - absoluteMin) / totalSpan) * 100;
            const widthPercent = ((day.tempMax - day.tempMin) / totalSpan) * 100;

            return (
              <div 
                key={day.date} 
                className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0 last:pb-0"
              >
                {/* Day Info */}
                <div className="w-24 shrink-0">
                  <p className="font-bold text-white truncate">{dayName}</p>
                  <p className="text-[10px] text-slate-500 font-mono font-medium">{shortDate}</p>
                </div>

                {/* Weather icon + Rain label */}
                <div className="flex items-center gap-1.5 w-16 shrink-0 justify-center">
                  <div className="transform scale-75 shrink-0">
                    {details.icon}
                  </div>
                  {day.precipSum > 0 && (
                    <span className="text-[10px] font-bold text-sky-400 font-mono tabular-nums">
                      {Math.round(day.precipSum * 10) / 10}m
                    </span>
                  )}
                </div>

                {/* Low Temp Display */}
                <span className="text-xs font-medium text-slate-500 w-8 text-right tabular-nums">
                  {Math.round(day.tempMin)}°
                </span>

                {/* APPLE WEATHER TEMP BAR BAR */}
                <div className="flex-1 mx-3 h-1.5 bg-white/5 rounded-full relative overflow-hidden">
                  <div 
                    className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 via-orange-400 to-red-500 shadow-sm"
                    style={{
                      left: `${leftOffsetPercent}%`,
                      width: `${Math.max(8, widthPercent)}%`
                    }}
                  />
                </div>

                {/* High Temp Display */}
                <span className="text-xs font-bold text-white w-8 text-right tabular-nums">
                  {Math.round(day.tempMax)}°
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
