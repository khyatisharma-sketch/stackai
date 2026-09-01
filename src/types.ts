/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CityInfo {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
  timezone: string;
  countryCode: string;
}

export interface CurrentWeather {
  temp: number;
  feltTemp: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  pressure: number;
  cloudCover: number;
  uvIndex: number;
  isDay: boolean;
}

export interface HourlyForecastItem {
  time: string;
  temp: number;
  precipProb: number;
  humidity: number;
  uvIndex: number;
  windSpeed: number;
}

export interface DailyForecastItem {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  feltMax: number;
  feltMin: number;
  uvMax: number;
  precipSum: number;
  precipProbMax: number;
  sunrise: string;
  sunset: string;
  daylightHours: number;
}

export interface AirQuality {
  usAqi: number;
  euAqi: number;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  so2: number;
  o3: number;
}

export interface WeatherData {
  city: CityInfo;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  airQuality: AirQuality;
}

export interface IntelligenceReport {
  summary: string;
  highlights: string[];
  impactAnalysis: {
    category: string;
    impact: "low" | "medium" | "high" | "critical";
    description: string;
  }[];
  checklist: {
    task: string;
    completed?: boolean;
    reason: string;
  }[];
  recommendations: {
    clothing: string[];
    gear: string[];
    activityPlanner: {
      timeWindow: string;
      activity: string;
      suitability: "excellent" | "good" | "poor";
      reason: string;
    }[];
  };
  markdownText: string; // fallback or full formatted copy
  isFallback?: boolean;
}

export type PersonaType = "general" | "athlete" | "parent" | "traveler" | "gardener" | "energy";

export interface PersonaConfig {
  id: PersonaType;
  name: string;
  icon: string;
  description: string;
  promptGuideline: string;
}
