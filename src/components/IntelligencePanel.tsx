/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { 
  User, Dumbbell, ShieldAlert, CheckCircle2, ChevronRight, Play, Square,
  Volume2, VolumeX, Sparkles, Loader2, Calendar, ShoppingBag, Eye, Heart, HelpCircle
} from "lucide-react";
import { WeatherData, IntelligenceReport, PersonaType, PersonaConfig } from "../types";
import { safeFetchJson } from "../utils/api";

// Helper to decode 16-bit signed integer PCM data into standard browser Float32Array
function pcm16ToFloat32(arrayBuffer: ArrayBuffer): Float32Array {
  const view = new DataView(arrayBuffer);
  const length = view.byteLength / 2;
  const float32 = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const int16 = view.getInt16(i * 2, true); // little-endian
    float32[i] = int16 / 32768; // scale to -1.0 to 1.0
  }
  return float32;
}

const PERSONAS: PersonaConfig[] = [
  {
    id: "general",
    name: "General Commuter",
    icon: "👤",
    description: "Daily outfit tips, UV alerts, commuter comfort, and general workflow scheduling.",
    promptGuideline: "Daily commute, outfit layers, sunscreen levels, simple daily tasks."
  },
  {
    id: "athlete",
    name: "Runner & Athlete",
    icon: "🏃",
    description: "Aerobic safety indices, hydration targets, optimum outdoor windows, joint warnings.",
    promptGuideline: "Cardiac strain, running hours, dehydration alerts, muscle performance."
  },
  {
    id: "parent",
    name: "Family & Kids",
    icon: "👶",
    description: "Stroller insulation, shade thresholds, insect activity risk, indoor alternatives.",
    promptGuideline: "Kids protection, diapers, bug spray, heat tolerance, stroller comfort."
  },
  {
    id: "traveler",
    name: "Business Traveler",
    icon: "💼",
    description: " Luggage compression, terminal delays, formal dining attire, custom adjustment advice.",
    promptGuideline: "Flight status indicators, professional styling, packing guidelines."
  },
  {
    id: "gardener",
    name: "Gardener & Farmer",
    icon: "🌱",
    description: "Frost alerts, transpiration rates, stake tension warnings, organic pesticide windows.",
    promptGuideline: "Soil moisture, wind stress, planting suitability, greenhouse draft."
  },
  {
    id: "energy",
    name: "Energy Conscious",
    icon: "⚡",
    description: "Smart thermostat thresholds, draft ventilation, solar generation peaks, grid mitigation.",
    promptGuideline: "Air conditioner cycles, solar peak tracking, appliance scheduling."
  }
];

interface IntelligencePanelProps {
  weatherData: WeatherData;
}

export function IntelligencePanel({ weatherData }: IntelligencePanelProps) {
  const [activePersona, setActivePersona] = useState<PersonaType>("general");
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Checklist Interactive State
  const [checklist, setChecklist] = useState<{ task: string; completed: boolean; reason: string }[]>([]);

  // TTS Audio States
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Fetch Weather Intelligence when activePersona or weatherData changes
  useEffect(() => {
    let active = true;

    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      setReport(null);
      stopTts(); // stop active speech if persona changes

      try {
        const data: IntelligenceReport = await safeFetchJson("/api/weather/intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weatherData, persona: activePersona })
        });

        if (active) {
          setReport(data);
          setChecklist(data.checklist.map(item => ({ ...item, completed: false })));
        }
      } catch (err: any) {
        if (active) {
          console.error("Failed to generate report:", err);
          setError(err.message || "An unexpected error occurred while communicating with Gemini API.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchReport();

    return () => {
      active = false;
    };
  }, [activePersona, weatherData]);

  // Audio Cleanup on Unmount
  useEffect(() => {
    return () => {
      stopTts();
    };
  }, []);

  const handleToggleTask = (index: number) => {
    setChecklist(prev => 
      prev.map((item, i) => i === index ? { ...item, completed: !item.completed } : item)
    );
  };

  // Stop TTS Voice
  const stopTts = () => {
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.warn("Error during audio teardown:", e);
    }
    setIsTtsPlaying(false);
  };

  // Play TTS Voice
  const handlePlayTts = async () => {
    if (isTtsPlaying) {
      stopTts();
      return;
    }

    if (!report?.summary) return;

    setIsTtsLoading(true);
    setError(null);

    const verbalText = `Hello, here is your tailored weather intelligence update for ${weatherData.city.name}. Current conditions indicate ${weatherData.current.temp} degrees, feels like ${weatherData.current.feltTemp} degrees. Summary: ${report.summary}`;

    let playSuccess = false;

    try {
      const { audio } = await safeFetchJson<{ audio: string }>("/api/weather/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: verbalText })
      });

      if (audio) {
        // Stop any existing context
        stopTts();

          // Convert base64 back into ArrayBuffer
          const binaryString = window.atob(audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const arrayBuffer = bytes.buffer;

          // Convert 16-bit PCM little-endian into float32 array
          const float32Data = pcm16ToFloat32(arrayBuffer);

          // Create browser AudioContext
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass({ sampleRate: 24000 }); // Gemini TTS is natively 24kHz
          audioCtxRef.current = audioCtx;

          // Copy decoded PCM array into AudioBuffer channel
          const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
          buffer.copyToChannel(float32Data, 0);

          const source = audioCtx.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtx.destination);
          sourceNodeRef.current = source;

          source.onended = () => {
            setIsTtsPlaying(false);
          };

          source.start(0);
          setIsTtsPlaying(true);
          playSuccess = true;
        }
    } catch (err: any) {
      console.warn("Gemini TTS voice brief service unavailable, attempting browser fallback...", err);
    }

    if (!playSuccess) {
      try {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          stopTts();

          const utterance = new SpeechSynthesisUtterance(verbalText);
          const voices = window.speechSynthesis.getVoices();
          // Select preferred English speaking voice if available
          const preferredVoice = voices.find(v => v.lang.startsWith("en-") && v.name.toLowerCase().includes("google")) ||
                                 voices.find(v => v.lang.startsWith("en-")) ||
                                 voices[0];
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
          utterance.rate = 1.05;
          utterance.pitch = 1.0;

          utterance.onend = () => {
            setIsTtsPlaying(false);
          };
          utterance.onerror = (e) => {
            console.warn("Browser SpeechSynthesis playback error:", e);
            setIsTtsPlaying(false);
          };

          window.speechSynthesis.speak(utterance);
          setIsTtsPlaying(true);
        } else {
          setError("Speech Synthesis is unsupported in this browser environment.");
        }
      } catch (synthErr) {
        console.error("Local SpeechSynthesis failure:", synthErr);
        setError("Unable to launch voice brief. Both cloud and local synthesis pipelines failed.");
      }
    }

    setIsTtsLoading(false);
  };

  const getImpactBadgeColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case "low": return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/40";
      case "medium": return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200/40";
      case "high": return "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-200/40";
      case "critical": return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200/40 animate-pulse";
      default: return "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/40";
    }
  };

  const getSuitabilityColor = (suitability: string) => {
    switch (suitability.toLowerCase()) {
      case "excellent": return "text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded";
      case "good": return "text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded";
      case "poor": return "text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded";
      default: return "text-slate-500";
    }
  };

  return (
    <div id="weather-intelligence-hub" className="space-y-8">
      {/* SECTION 1: Persona Navigator */}
      <div className="glass-card glass-card-hover rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
        <div className="glow-blob glow-blue w-[200px] h-[200px] -top-[50px] -right-[50px]" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4 z-10 relative">
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
              INTELLIGENCE ANALYTICS TARGETS
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-normal">
              Calibrate the AI Synthesis to specific profiles, thermal requirements, and atmospheric limits.
            </p>
          </div>

          {/* Voice Anchor Player */}
          {report && (
            <button 
              id="voice-anchor-button"
              disabled={isTtsLoading}
              onClick={handlePlayTts}
              className={`flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                isTtsPlaying 
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" 
                  : "bg-sky-500 hover:bg-sky-450 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
              } disabled:opacity-50`}
            >
              {isTtsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isTtsPlaying ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {isTtsLoading ? "Synthesizing..." : isTtsPlaying ? "Stop Briefing" : "Play Voice Brief"}
            </button>
          )}
        </div>

        {/* Horizontal Scroll Grid of Personas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 z-10 relative">
          {PERSONAS.map((p) => {
            const isActive = activePersona === p.id;
            return (
              <button
                key={p.id}
                id={`persona-btn-${p.id}`}
                onClick={() => setActivePersona(p.id)}
                className={`flex flex-col text-left p-4 rounded-xl border text-xs transition-all cursor-pointer ${
                  isActive 
                    ? "bg-sky-500/10 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-sky-400/20" 
                    : "bg-white/2 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10"
                }`}
              >
                <span className="text-2xl mb-2">{p.icon}</span>
                <span className={`font-bold tracking-tight block ${isActive ? "text-sky-400" : "text-white"}`}>
                  {p.name}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 leading-snug line-clamp-2">
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: AI Report Layout */}
      {isLoading && (
        <div className="glass-card border border-dashed border-white/10 rounded-[24px] p-16 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden shadow-2xl">
          <div className="glow-blob glow-blue w-[300px] h-[300px]" />
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-4 z-10" />
          <p className="text-sm font-semibold text-white z-10 font-display">
            Consulting Meteorological Core...
          </p>
          <p className="text-xs text-slate-400 mt-2 animate-pulse z-10 font-mono text-center max-w-md">
            {activePersona === "athlete" && "Analyzing cardiac stress levels under current humidity..."}
            {activePersona === "gardener" && "Evaluating relative transpiration and plant dew thresholds..."}
            {activePersona === "parent" && "Assessing UV skin hazard coefficients..."}
            {activePersona === "energy" && "Determining solar loading factors and HVAC coefficients..."}
            {activePersona === "traveler" && "Checking wind vector limits for potential luggage and flight delays..."}
            {activePersona === "general" && "Compiling daily dress code index and exposure ratings..."}
          </p>
        </div>
      )}

      {error && (
        <div className="glass-card border border-red-500/20 rounded-[24px] p-6 flex items-start gap-4 shadow-xl">
          <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold font-mono tracking-wider text-red-400 uppercase">
              METEOROLOGICAL SYNTHESIS INTERRUPTED
            </h4>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {error}
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-3">
              Check your <code>GEMINI_API_KEY</code> environment variable setup.
            </p>
          </div>
        </div>
      )}

      {report && !isLoading && (
        <div className="space-y-6 animate-fade-in">
          {report.isFallback && (
            <div className="glass-card border border-sky-500/20 rounded-[24px] p-5 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center gap-4">
              <div className="glow-blob glow-blue w-[150px] h-[150px] -top-[45px] -right-[45px] opacity-30" />
              <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400 shrink-0 border border-sky-500/10">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 z-10 text-center sm:text-left">
                <h4 className="text-xs font-bold font-mono tracking-wider text-sky-400 uppercase">
                  Rule-Based Meteorological Engine Active
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  A high-fidelity meteorological intelligence report is currently being served via local rules. To unlock full AI-driven reasoning (tailored summaries, advanced scheduling, and voice audio guides), please configure your <strong className="text-sky-300">GEMINI_API_KEY</strong> under <strong className="text-sky-300">Settings &gt; Secrets</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Structural Cards (Impacts, Recommendations, Checklist) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* 1. Tactical Intelligence Summary */}
            <div className="relative overflow-hidden rounded-[24px] glass-card glass-card-hover p-6 shadow-2xl">
              <div className="glow-blob glow-indigo w-[300px] h-[300px] -bottom-[100px] -right-[100px]" />
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider text-sky-400 uppercase mb-3 z-10 relative">
                <Sparkles className="w-4 h-4 text-sky-400 animate-spin-slow" />
                TAILORED SYNTHESIS SUMMARY
              </div>
              <p className="text-sm font-light text-slate-100 leading-relaxed tracking-wide z-10 relative">
                "{report.summary}"
              </p>
              
              {/* Bullets highlights */}
              <div className="mt-5 pt-4 border-t border-white/5 space-y-2 z-10 relative">
                {report.highlights.map((hl, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 font-medium">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full mt-1.5 shrink-0 shadow-[0_0_6px_#38bdf8]" />
                    <span>{hl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Checklist (Interactive Dashboard) */}
            <div id="ai-checklist-panel" className="glass-card glass-card-hover rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <div className="glow-blob glow-purple w-[150px] h-[150px] -top-[40px] -right-[40px]" />
              
              <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2 z-10 relative">
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                AI ACTION CHRONOLOGY
              </h4>
              <div className="space-y-3 z-10 relative">
                {checklist.map((item, index) => (
                  <div 
                    key={index} 
                    onClick={() => handleToggleTask(index)}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                      item.completed 
                        ? "bg-white/1 border-white/5 opacity-50" 
                        : "bg-white/2 border-white/5 hover:bg-white/5 hover:border-sky-500/20"
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={item.completed} 
                      onChange={() => {}} // handled by div click
                      className="mt-1 h-4 w-4 rounded border-white/10 bg-slate-950 text-sky-500 focus:ring-sky-500 cursor-pointer shrink-0"
                    />
                    <div>
                      <p className={`text-xs font-bold text-white ${item.completed ? "line-through text-slate-500" : ""}`}>
                        {item.task}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {item.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Operational Impact Indicators */}
            <div className="glass-card glass-card-hover rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <div className="glow-blob glow-blue w-[150px] h-[150px] -bottom-[40px] -left-[40px]" />

              <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2 z-10 relative">
                <ShieldAlert className="w-4 h-4 text-orange-400" />
                PROFILE STRESS MATRIX
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 z-10 relative">
                {report.impactAnalysis.map((imp, i) => (
                  <div key={i} className="bg-white/2 rounded-xl p-4 border border-white/5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-white truncate pr-2">
                          {imp.category}
                        </span>
                        <span className={`text-[8px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg border ${getImpactBadgeColor(imp.impact)}`}>
                          {imp.impact}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {imp.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Activity timeline & Full markdown brief */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* 4. Layering & Gear recommendation widget */}
            <div className="glass-card glass-card-hover rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <div className="glow-blob glow-indigo w-[150px] h-[150px] -top-[40px] -right-[40px]" />

              <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2 z-10 relative">
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                OUTFIT & GEAR PROTOCOLS
              </h4>
              <div className="space-y-4 z-10 relative">
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-2">Thermodynamic Layering</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.recommendations.clothing.map((cloth, i) => (
                      <span key={i} className="text-xs font-semibold text-white bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                        {cloth}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono mb-2">Technical Gear Loadout</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.recommendations.gear.map((g, i) => (
                      <span key={i} className="text-xs font-semibold text-sky-400 bg-sky-400/10 border border-sky-400/10 px-2.5 py-1 rounded-lg shadow-sm">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Hour-by-Hour Activity Planner Timeline */}
            <div className="glass-card glass-card-hover rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <div className="glow-blob glow-purple w-[150px] h-[150px] -bottom-[40px] -right-[40px]" />

              <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2 z-10 relative">
                <Calendar className="w-4 h-4 text-purple-400" />
                OPTIMIZED CHRONO TIMELINE
              </h4>
              <div className="relative border-l border-white/10 pl-4 space-y-5 ml-2.5 z-10 relative">
                {report.recommendations.activityPlanner.map((act, i) => (
                  <div key={i} className="relative text-xs">
                    {/* timeline node icon */}
                    <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full border border-slate-950 bg-sky-400 shadow-[0_0_6px_#38bdf8] flex items-center justify-center" />
                    
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          {act.timeWindow}
                        </span>
                        <span className={`text-[8px] font-bold font-mono uppercase tracking-wider ${getSuitabilityColor(act.suitability)}`}>
                          {act.suitability}
                        </span>
                      </div>
                      <p className="font-bold text-white mt-0.5">
                        {act.activity}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {act.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Comprehensive Full Markdown Briefing */}
            <div className="glass-card glass-card-hover rounded-[24px] p-6 shadow-2xl relative overflow-hidden">
              <div className="glow-blob glow-blue w-[150px] h-[150px] -top-[40px] -left-[40px]" />

              <h4 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2 z-10 relative">
                <Eye className="w-4 h-4 text-slate-500" />
                EXECUTIVE INTELLIGENCE BRIEF
              </h4>
              
              <div className="markdown-body text-xs text-slate-300 leading-relaxed space-y-3 prose dark:prose-invert z-10 relative">
                <Markdown>{report.markdownText}</Markdown>
              </div>
            </div>

          </div>
          </div>
        </div>
      )}
    </div>
  );
}
