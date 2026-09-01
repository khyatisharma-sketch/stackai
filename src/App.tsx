/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, MapPin, Loader2, Sparkles, AlertTriangle, CloudSun, Calendar, HelpCircle,
  Clock, RefreshCw
} from "lucide-react";
import { CityInfo, WeatherData } from "./types";
import { safeFetchJson } from "./utils/api";
import { CurrentWeatherCard, AirQualityCard, WindCard, UVIndexCard, SunCycleCard } from "./components/WeatherCards";
import { WeatherCharts } from "./components/WeatherCharts";
import { IntelligencePanel } from "./components/IntelligencePanel";

const DEFAULT_CITY: CityInfo = {
  name: "Chennai",
  country: "India",
  state: "Tamil Nadu",
  lat: 13.0827,
  lon: 80.2707,
  timezone: "Asia/Kolkata",
  countryCode: "IN",
};

export default function App() {
  const [activeCity, setActiveCity] = useState<CityInfo>(DEFAULT_CITY);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CityInfo[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(false);
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLFormElement>(null);

  // 1. Fetch Weather & AQI Telemetry from full-stack backend
  const fetchTelemetry = async (city: CityInfo) => {
    setIsTelemetryLoading(true);
    setTelemetryError(null);
    try {
      const queryParams = new URLSearchParams({
        lat: city.lat.toString(),
        lon: city.lon.toString(),
        name: city.name,
        country: city.country,
        countryCode: city.countryCode,
        timezone: city.timezone,
        ...(city.state ? { state: city.state } : {})
      });

      const data: WeatherData = await safeFetchJson(`/api/weather/telemetry?${queryParams.toString()}`);
      
      // Robust payload structure verification
      if (!data || !data.city || !data.current || !data.hourly || !data.daily || !data.airQuality) {
        throw new Error("INVALID_PAYLOAD");
      }

      setWeatherData(data);
    } catch (err: any) {
      console.error("Telemetry error:", err);
      if (err.message === "INVALID_PAYLOAD") {
        setTelemetryError("Weather API returned an incomplete response. Key meteorological details were missing. Please try refreshing or select another location.");
      } else if (err instanceof TypeError || (err.message && err.message.toLowerCase().includes("fetch"))) {
        setTelemetryError("Network request failed. We couldn't establish a secure connection with the weather database. Please verify your internet connection and try again.");
      } else {
        setTelemetryError(err.message || "An unexpected error occurred while fetching meteorological telemetry vectors. Please verify your connection or try again.");
      }
    } finally {
      setIsTelemetryLoading(false);
    }
  };

  // Load weather data on mount or city change
  useEffect(() => {
    fetchTelemetry(activeCity);
  }, [activeCity]);

  // 2. Geocoding Search handler with debouncing or direct trigger
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchLoading(true);
      try {
        const data = await safeFetchJson<{ results?: CityInfo[] }>(`/api/weather/search?q=${encodeURIComponent(searchQuery)}`);
        setSuggestions(data.results || []);
        setShowSuggestions(true);
        setSearchError(null);
      } catch (err: any) {
        console.warn("Geocoding search failed:", err);
        if (err instanceof TypeError || (err.message && err.message.toLowerCase().includes("fetch"))) {
          setSearchError("Network Connection Interrupted: Failed to retrieve city autocomplete suggestions. Please check your internet connection.");
        }
      } finally {
        setIsSearchLoading(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Handle click outside to close geocoding suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Browser Geolocation handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setIsGeoLoading(true);
    setGeoError(null);
    setSearchError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const localCity: CityInfo = {
          name: "Local Coordinates",
          country: "Your Location",
          lat,
          lon,
          timezone: "auto",
          countryCode: "GPS",
        };

        setActiveCity(localCity);
        setIsGeoLoading(false);
      },
      (err) => {
        console.warn("Geolocation error:", err);
        let errorMsg = "Unable to retrieve your location.";
        if (err.code === 1) {
          errorMsg = "Location permission denied. Please enable location access in your browser.";
        }
        setGeoError(errorMsg);
        setIsGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleSelectSuggestion = (city: CityInfo) => {
    setActiveCity(city);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
  };

  // 4. Form Search Submission
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchError("Search query is empty. Please enter a city or location name to query.");
      return;
    }

    setIsSearchLoading(true);
    setSearchError(null);
    try {
      const data = await safeFetchJson<{ results?: CityInfo[] }>(`/api/weather/search?q=${encodeURIComponent(searchQuery)}`);
      const results = data.results || [];
      if (results.length > 0) {
        handleSelectSuggestion(results[0]);
      } else {
        setSearchError(`City "${searchQuery}" was not found. Please verify the spelling, try adding a country/state abbreviation (e.g. "Paris, FR"), or query a larger nearby city.`);
        setSuggestions([]);
      }
    } catch (err: any) {
      console.error("Search submission error:", err);
      if (err instanceof TypeError || (err.message && err.message.toLowerCase().includes("fetch"))) {
        setSearchError("Network Request Failed: Unable to establish a connection with the geocoding directory. Please verify your internet connection.");
      } else {
        setSearchError(err.message || "An unexpected error occurred while searching for the city. Please try again.");
      }
    } finally {
      setIsSearchLoading(false);
      setShowSuggestions(false);
    }
  };

  const handleRefresh = () => {
    fetchTelemetry(activeCity);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-100 relative overflow-x-hidden">
      {/* Background overlay glow nodes */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-500/3 rounded-full filter blur-[150px] pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-gradient-to-r from-slate-950/90 via-slate-900/85 to-indigo-950/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(56,189,248,0.3)] flex items-center justify-center">
              <CloudSun className="w-6 h-6 text-white animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-widest font-display text-white flex items-center gap-1.5">
                WEATHER INTEL
              </h1>
              <p className="text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">
                Atmospheric Telemetry & AI Synthesis
              </p>
            </div>
          </div>

          {/* Interactive Navigation & Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 w-full sm:w-auto relative" ref={searchContainerRef}>
            
            {/* Geolocation Trigger */}
            <button
              type="button"
              id="geolocation-trigger-btn"
              onClick={handleUseCurrentLocation}
              disabled={isGeoLoading}
              className="flex items-center justify-center p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer shadow-inner disabled:opacity-50 hover:text-sky-400 hover:scale-105 active:scale-95"
              title="Detect current coordinates"
            >
              {isGeoLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
              ) : (
                <MapPin className="w-5 h-5" />
              )}
            </button>

            {/* Main Geocoding Search input */}
            <div className="relative flex-1 sm:w-80 flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {isSearchLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>
                <input
                  id="location-search-input"
                  type="text"
                  placeholder="Search coordinates or cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(suggestions.length > 0)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 hover:bg-white/8 transition-all duration-300 text-white placeholder-slate-500"
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div 
                    id="search-suggestions-dropdown"
                    className="absolute left-0 right-0 mt-2 glass-card border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-fade-in"
                  >
                    {suggestions.map((item, index) => (
                      <button
                        type="button"
                        key={index}
                        id={`suggestion-item-${index}`}
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 flex flex-col justify-center transition-all cursor-pointer"
                      >
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          {item.name}
                          {item.countryCode && (
                            <span className="text-[9px] font-bold bg-white/10 text-slate-300 px-1.5 py-0.5 rounded uppercase font-mono">
                              {item.countryCode}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {item.state ? `${item.state}, ` : ""}{item.country} (Lat: {Math.round(item.lat * 100) / 100}°, Lon: {Math.round(item.lon * 100) / 100}°)
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search button */}
              <button
                type="submit"
                id="search-submit-btn"
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-450 hover:to-sky-350 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:shadow-[0_0_22px_rgba(56,189,248,0.6)] hover:scale-[1.03] active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
              >
                Search
              </button>
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={handleRefresh}
              className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer shadow-inner shrink-0 hover:text-sky-400 hover:scale-105 active:scale-95"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-5 h-5 ${isTelemetryLoading ? "animate-spin text-sky-400" : ""}`} />
            </button>
          </form>
        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* SEARCH ERRORS */}
        {searchError && (
          <div className="glass-card glass-card-hover border border-rose-500/30 rounded-[24px] p-6 shadow-2xl relative overflow-hidden animate-fade-in flex flex-col sm:flex-row items-start gap-4">
            <div className="glow-blob glow-red w-[150px] h-[150px] -top-[45px] -right-[45px] opacity-40" />
            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 shrink-0 border border-rose-500/10">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 z-10">
              <h4 className="text-sm font-bold font-mono tracking-wider text-rose-400 uppercase">Search Error</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{searchError}</p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setSearchError(null)}
                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold font-mono uppercase rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GEOLOCATION ERRORS */}
        {geoError && (
          <div className="glass-card glass-card-hover border border-amber-500/30 rounded-[24px] p-6 shadow-2xl relative overflow-hidden animate-fade-in flex flex-col sm:flex-row items-start gap-4">
            <div className="glow-blob glow-amber w-[150px] h-[150px] -top-[45px] -right-[45px] opacity-40" />
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-400 shrink-0 border border-amber-500/10">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 z-10">
              <h4 className="text-sm font-bold font-mono tracking-wider text-amber-400 uppercase">Location Request Blocked</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{geoError}</p>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => setGeoError(null)}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold font-mono uppercase rounded-xl border border-amber-500/20 transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* METEOROLOGICAL TELEMETRY ERRORS */}
        {telemetryError && (
          <div className="glass-card glass-card-hover border border-red-500/30 rounded-[24px] p-6 shadow-2xl relative overflow-hidden animate-fade-in flex flex-col sm:flex-row items-start gap-4">
            <div className="glow-blob glow-red w-[200px] h-[200px] -bottom-[60px] -right-[60px] opacity-40" />
            <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 shrink-0 border border-red-500/10">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 z-10">
              <h4 className="text-sm font-bold font-mono tracking-wider text-red-400 uppercase">Meteorological Telemetry Signal Interrupted</h4>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{telemetryError}</p>
              <div className="flex items-center gap-3 mt-4">
                <button 
                  onClick={() => fetchTelemetry(activeCity)}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold font-mono uppercase text-xs rounded-xl transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 duration-150"
                >
                  Retry Channel Synch
                </button>
                <button
                  onClick={() => setTelemetryError(null)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer"
                >
                  Clear Alert
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN TELEMETRY WORKSPACE */}
        {isTelemetryLoading && !weatherData && (
          <div className="flex flex-col items-center justify-center py-24 relative overflow-hidden">
            <div className="glow-blob glow-blue w-[300px] h-[300px]" />
            <Loader2 className="w-12 h-12 text-sky-400 animate-spin mb-4 z-10" />
            <p className="text-sm font-semibold text-white z-10">Synchronizing atmospheric channels...</p>
            <p className="text-xs text-slate-400 mt-1 animate-pulse z-10 font-mono text-center max-w-md">Retrieving worldwide barometric, air quality, and wind telemetry vectors.</p>
          </div>
        )}

        {weatherData && (
          <div className="space-y-8 animate-fade-in">
            {/* Bento Grid Layer 1: Core Weather & Air Quality */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Primary Current Weather Card */}
              <div className="lg:col-span-8">
                <CurrentWeatherCard data={weatherData} />
              </div>
              
              {/* Detailed Pollutants Air Quality Card */}
              <div className="lg:col-span-4">
                <AirQualityCard aqi={weatherData.airQuality} />
              </div>
            </div>

            {/* Bento Grid Layer 2: Secondary Indicators (Wind, UV, Daylight) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <WindCard speed={weatherData.current.windSpeed} direction={weatherData.current.windDir} />
              <UVIndexCard uv={weatherData.current.uvIndex} />
              <SunCycleCard 
                sunrise={weatherData.daily[0].sunrise} 
                sunset={weatherData.daily[0].sunset} 
                daylightHours={weatherData.daily[0].daylightHours}
                timezone={weatherData.city.timezone}
              />
            </div>

            {/* Bento Grid Layer 3: Dynamic Charts Timeline (Hourly & Weekly Forecast) */}
            <WeatherCharts data={weatherData} />

            {/* Bento Grid Layer 4: Gemini AI Weather Intelligence Hub */}
            <div className="border-t border-white/5 pt-8">
              <IntelligencePanel weatherData={weatherData} />
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-slate-950/40 text-slate-500 text-[11px] py-8 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-medium text-center sm:text-left">
            © 2026 Weather Intelligence. Meteorological telemetry provided by Open-Meteo under CC BY 4.0.
          </p>
          <p className="font-mono text-[9px] text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
            Core Nodes Connected
          </p>
        </div>
      </footer>
    </div>
  );
}
