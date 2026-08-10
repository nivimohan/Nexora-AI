import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Zap,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Play,
  TrendingUp,
  Award,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import api from "@/lib/axios";

// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 4: Voice-Based AI Mock Interview Suite
// Custom speech engine using browser-native SpeechRecognition API to evaluate
// acoustic filler words, stutters, repetitions, and silence pauses in real time.
// ─────────────────────────────────────────────────────────────────────────────

const VIEW_PREP       = "prep";
const VIEW_LOADING    = "loading";
const VIEW_SIMULATION = "simulation";
const VIEW_CLAIMING   = "claiming";
const VIEW_CELEBRATE  = "celebrate";

export default function MockInterviewsPage({
  setActiveView,
  milestoneContext = null,
  interviewSession,
  setInterviewSession,
  setUser, // ← propagates XP/level changes to DashboardPage React state immediately
}) {
  const [view, setView] = useState(() => interviewSession?.view || VIEW_PREP);
  const [questions, setQuestions] = useState(() => interviewSession?.questions || []);
  const [currentIdx, setCurrentIdx] = useState(() => interviewSession?.currentIdx || 0);
  const [error, setError] = useState("");

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState("");
  
  // Real-time acoustic metric trackers
  const [fillerCounts, setFillerCounts] = useState(() => interviewSession?.fillerCounts || { um: 0, uh: 0, er: 0, ah: 0, like: 0, so: 0 });
  const [totalFillers, setTotalFillers] = useState(() => interviewSession?.totalFillers || 0);
  const [stutterCount, setStutterCount] = useState(() => interviewSession?.stutterCount || 0);
  const [confidencePenaltyCount, setConfidencePenaltyCount] = useState(() => interviewSession?.confidencePenaltyCount || 0);

  // Accumulated metrics across all questions
  const [sessionFillerStats, setSessionFillerStats] = useState(() => interviewSession?.sessionFillerStats || { um: 0, uh: 0, er: 0, ah: 0, like: 0, so: 0 });
  const [sessionTotalFillers, setSessionTotalFillers] = useState(() => interviewSession?.sessionTotalFillers || 0);
  const [sessionStutters, setSessionStutters] = useState(() => interviewSession?.sessionStutters || 0);
  const [sessionConfidencePenalty, setSessionConfidencePenalty] = useState(() => interviewSession?.sessionConfidencePenalty || 0);
  const [sessionTranscripts, setSessionTranscripts] = useState(() => interviewSession?.sessionTranscripts || []);

  // ── Persistent session completion tracking ──────────────────────────────────
  // When isCompleted=true, returning to this view restores VIEW_CELEBRATE immediately.
  const [isCompleted, setIsCompleted] = useState(() => interviewSession?.isCompleted || false);
  const [xpResult, setXpResult] = useState(() => interviewSession?.xpResult || null);

  const [loadingCache, setLoadingCache] = useState(false);

  const user = JSON.parse(localStorage.getItem("nexora_user") || "{}");
  const targetRole = user?.targetRole || "Software Engineer";
const demoMode =
  JSON.parse(localStorage.getItem("nexora_demo_mode") || "false")
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const isStartingRef  = useRef(false); // guard against double-start race
  const lastResultTimeRef = useRef(Date.now());
  const finalTranscriptRef = useRef(""); // accumulates all finalized text

  // ── Initialize SpeechRecognition ONCE on mount ────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser (Chrome or Edge required). " +
        "You can still type your answer in the text area below."
      );
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = "en-US";
    rec.maxAlternatives = 1;

    // ── onresult: stream interim words live, commit final segments ─────────────
    rec.onresult = (event) => {
      lastResultTimeRef.current = Date.now(); // reset silence-gap timer

      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += chunk + " ";
          analyzeSpeechText(chunk); // acoustic analysis on confirmed words only
        } else {
          interimTranscript += chunk;
        }
      }

      // Display = all committed words + live interim hypothesis
      setTranscription(finalTranscriptRef.current + interimTranscript);
    };

    // ── onerror: handle gracefully ──────────────────────────────────────────
    rec.onerror = (e) => {
      isStartingRef.current = false;

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError(
          "Microphone permission denied. Please allow mic access in your browser settings and reload."
        );
        isListeningRef.current = false;
        setIsListening(false);
        return;
      }

      if (e.error === "no-speech") return;

      if (e.error === "aborted") return;

    };

    // ── onstart: clear the starting guard ────────────────────────────────
    rec.onstart = () => {
      isStartingRef.current = false;
    };

    // ── onend: auto-restart if still supposed to be listening ───────────────
    // Uses isStartingRef to prevent the race condition where onend fires and
    // tries to re-start while the previous start() call is still pending.
    rec.onend = () => {
      if (isListeningRef.current && !isStartingRef.current) {
        isStartingRef.current = true;
        setTimeout(() => {
          if (isListeningRef.current) {
            try {
              rec.start();
            } catch (err) {
              isStartingRef.current = false;
            }
          } else {
            isStartingRef.current = false;
          }
        }, 80);
      }
    };

    recognitionRef.current = rec;

    return () => {
      isListeningRef.current = false;
      isStartingRef.current  = false;
      try { rec.stop(); } catch (_) {}
    };
  }, []); // Instantiate exactly once on mount

  // ── Acoustic Speech Analysis ────────────────────────────────────────────────────
  // Called only on FINAL (committed) speech segments — not on interim results.
  const analyzeSpeechText = (chunk) => {
    const text = chunk.toLowerCase();

    // 1. Stutter / Repetition detector (consecutive duplicate words)
    const stutterMatches = text.match(/\b(\w+)\s+\1\b/gi) || [];
    const stutterCountDelta = stutterMatches.length;

    // 2. Filler word counter
    const FILLERS = ["um", "uh", "er", "ah", "like", "so"];
    const delta = {}; 
    let chunkFillerTotal = 0;

    FILLERS.forEach((word) => {
      const matches = text.match(new RegExp(`\\b${word}\\b`, "g")) || [];
      if (matches.length > 0) {
        delta[word] = matches.length;
        chunkFillerTotal += matches.length;
      }
    });

    // Apply updates using functional state updates to avoid race conditions
    if (stutterCountDelta > 0) {
      setStutterCount((p) => p + stutterCountDelta);
      setSessionStutters((p) => p + stutterCountDelta);
    }

    if (chunkFillerTotal > 0) {
      setFillerCounts((prev) => {
        const next = { ...prev };
        Object.entries(delta).forEach(([w, n]) => { next[w] = (next[w] || 0) + n; });
        return next;
      });
      setSessionFillerStats((prev) => {
        const next = { ...prev };
        Object.entries(delta).forEach(([w, n]) => { next[w] = (next[w] || 0) + n; });
        return next;
      });
      setTotalFillers((p) => p + chunkFillerTotal);
      setSessionTotalFillers((p) => p + chunkFillerTotal);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition unavailable. Please use Chrome or Edge and allow microphone access.");
      return;
    }

    if (isListening) {
      // ── STOP ──────────────────────────────────────────────────────────────
      isListeningRef.current = false;
      isStartingRef.current  = false;
      setIsListening(false);
      try { recognitionRef.current.stop(); } catch (_) {}
    } else {
      // ── START ─────────────────────────────────────────────────────────────
      if (isStartingRef.current) return; // debounce: already pending a start

      setError("");
      // Reset per-question accumulators
      finalTranscriptRef.current = "";
      setTranscription("");
      setFillerCounts({ um: 0, uh: 0, er: 0, ah: 0, like: 0, so: 0 });
      setTotalFillers(0);
      setStutterCount(0);
      setConfidencePenaltyCount(0);
      lastResultTimeRef.current = Date.now();

      // Request mic permission first, then start recognition.
      isStartingRef.current = true;
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          isListeningRef.current = true;
          setIsListening(true);
          try {
            recognitionRef.current.start();
          } catch (err) {
            isStartingRef.current = false;
            if (err.name !== "InvalidStateError") {
              isListeningRef.current = false;
              setIsListening(false);
              setError("Could not start microphone: " + err.message);
            }
          }
        })
        .catch((err) => {
          isStartingRef.current = false;
          setError(
            "Microphone permission denied. Please allow mic access in your browser settings."
          );
        });
    }
  };

  // ── Silence Gap Detection Timer (3000 ms pause penalty) ────────────────────
  // Increments silence-pause counter once per 3-second window with no speech.
  // Resets lastResultTimeRef every time speech is detected (see onresult).
  useEffect(() => {
    let interval = null;
    if (isListening) {
      lastResultTimeRef.current = Date.now(); // reset baseline when mic starts
      interval = setInterval(() => {
        const silenceDuration = Date.now() - lastResultTimeRef.current;
        if (silenceDuration >= 3000) {
          setConfidencePenaltyCount((p) => p + 1);
          setSessionConfidencePenalty((p) => p + 1);
          lastResultTimeRef.current = Date.now(); // reset so we count per 3 s window
        }
      }, 500);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isListening]);

  // This is the single source of truth. Survives all tab switches.
  useEffect(() => {
    if (setInterviewSession) {
      setInterviewSession({
        view,
        questions,
        currentIdx,
        fillerCounts,
        totalFillers,
        stutterCount,
        confidencePenaltyCount,
        sessionFillerStats,
        sessionTotalFillers,
        sessionStutters,
        sessionConfidencePenalty,
        sessionTranscripts,
        isCompleted,
        xpResult,
      });
    }
  }, [
    view,
    questions,
    currentIdx,
    fillerCounts,
    totalFillers,
    stutterCount,
    confidencePenaltyCount,
    sessionFillerStats,
    sessionTotalFillers,
    sessionStutters,
    sessionConfidencePenalty,
    sessionTranscripts,
    isCompleted,
    xpResult,
    setInterviewSession
  ]);


  // ── Database cache check on load to prevent blank screen ───────────────────
  useEffect(() => {
    const checkDBCache = async () => {
      // If we don't have questions locally but user has an active interview in Mongo, fetch it
      if (questions.length === 0) {
        setLoadingCache(true);
        try {
          const demoMode =
  JSON.parse(localStorage.getItem("nexora_demo_mode") || "false")

const res = await api.post("/interview/generate", {
  forceRefresh: false,
  demoMode,
});
          if (res.data?.success && res.data.data?.questions) {
            setQuestions(res.data.data.questions);
            setView(VIEW_SIMULATION);
          }
        } catch (err) {
          console.warn("No active cache interview found in DB:", err);
        } finally {
          setLoadingCache(false);
        }
      }
    };
    checkDBCache();
  }, []);

  // ── Initiate Simulation / Fetch ────────────────────────────────────────────
  const handleInitiateSimulation = async (force = false) => {
    setView(VIEW_LOADING);
    setError("");
    try {
      const demoMode =
  JSON.parse(localStorage.getItem("nexora_demo_mode") || "false")

const res = await api.post("/interview/generate", {
  forceRefresh: force,
  demoMode,
});
      if (res.data?.success && res.data.data?.questions) {
        setQuestions(res.data.data.questions);
        setCurrentIdx(0);
        
        // Reset local trackers
        setTranscription("");
        setFillerCounts({ um: 0, uh: 0, er: 0, ah: 0, like: 0, so: 0 });
        setTotalFillers(0);
        setStutterCount(0);
        setConfidencePenaltyCount(0);

        // Reset session accumulators
        setSessionFillerStats({ um: 0, uh: 0, er: 0, ah: 0, like: 0, so: 0 });
        setSessionTotalFillers(0);
        setSessionStutters(0);
        setSessionConfidencePenalty(0);
        setSessionTranscripts([]);

        setView(VIEW_SIMULATION);
      } else {
        throw new Error("Failed to load interview questions.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to initialize interview.");
      setView(VIEW_PREP);
    }
  };

  // ── Next Question ➔ ────────────────────────────────────────────────────────
  const handleNextQuestion = () => {
    if (isListening && recognitionRef.current) {
      isListeningRef.current = false;
      isStartingRef.current  = false;
      setIsListening(false);
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    // Save current transcription then clear accumulators
    setSessionTranscripts((prev) => [...prev, finalTranscriptRef.current.trim() || transcription]);
    finalTranscriptRef.current = "";
    setTranscription("");
    setFillerCounts({ um: 0, uh: 0, er: 0, ah: 0, like: 0, so: 0 });
    setTotalFillers(0);
    setStutterCount(0);
    setConfidencePenaltyCount(0);
    setCurrentIdx((prev) => prev + 1);
  };

  // ── Submit Interview Telemetry ─────────────────────────────────────────────
  const handleSubmitInterview = async () => {
    if (isListening && recognitionRef.current) {
      isListeningRef.current = false;
      isStartingRef.current  = false;
      setIsListening(false);
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    // Collect the last answer from the ref, then clear it
    const lastAnswer = finalTranscriptRef.current.trim() || transcription;
    finalTranscriptRef.current = "";

    const finalTranscripts = [...sessionTranscripts, lastAnswer];
    const fullText = finalTranscripts.join("\n\n");

    // ── FRONTEND ZERO-SPEECH GUARD ────────────────────────────────────────
    // Count actual word tokens across all 3 questions.
    // Belt-and-suspenders with the backend guard: if no words spoken,
    // skip the network call entirely and show the empty-state banner.
    const totalWords = fullText.trim().split(/\s+/).filter(Boolean).length;
    if (totalWords === 0) {
      setXpResult({
        xpEarned:       0,
        totalXP:        JSON.parse(localStorage.getItem("nexora_user") || "{}").totalXP || 0,
        confidenceScore: 0,
        breakdown:      "⚠️ No speech input detected. Complete an active interview response using the microphone to collect XP points.",
      });
      setIsCompleted(true);
      setView(VIEW_CELEBRATE);
      return;
    }

    setView(VIEW_CLAIMING);
    try {
      const dm = JSON.parse(localStorage.getItem("nexora_demo_mode") || "false");
      const res = await api.post("/interview/submit", {
        fillerWordCounts: sessionFillerStats,
        transcription: fullText,
        demoMode: dm,
      });

      if (res.data?.success) {
        const resultData = res.data.data;

        // noSpeechDetected: backend zero-transcript guard fired (redundant safety net)
        if (res.data.noSpeechDetected) {
          setXpResult({ ...resultData, xpEarned: 0 });
          setIsCompleted(true);
          setView(VIEW_CELEBRATE);
          return;
        }

        setXpResult(resultData);

        // ── REAL-TIME GLOBAL XP SYNC ─────────────────────────────────────────
        // Backend returns the full updated user in res.data.data.user.
        // We push it to DashboardPage state (setUser) AND localStorage so
        // CommandCentre (DashboardHome) and CareerAnalyticsHub immediately
        // display the new totalXP and currentLevel without a page refresh.
        if (resultData?.user) {
          const updatedUser = resultData.user;
          try {
            localStorage.setItem("nexora_user", JSON.stringify(updatedUser));
          } catch (_) { /* storage quota — non-fatal */ }
          if (typeof setUser === "function") {
            setUser(updatedUser); // ← propagates to all sibling views via DashboardPage
          }
        }

        sessionStorage.setItem("roadmap_refresh", "1");
        setIsCompleted(true); // Lock session — tab switches will restore VIEW_CELEBRATE
        setView(VIEW_CELEBRATE);
      } else {
        throw new Error("Telemetry submission failed.");
      }
    } catch (err) {
      console.error("Telemetry submit error:", err);
      setError("Failed to persist simulation metrics.");
      setView(VIEW_SIMULATION);
    }
  };

  // ── Guard: restore VIEW_CELEBRATE instantly on tab-switch re-entry ──────────
  // If the session is marked complete, render the celebrate screen directly,
  // bypassing the loadingCache check and all other view guards.
  if (isCompleted && xpResult && view !== VIEW_CELEBRATE) {
    setView(VIEW_CELEBRATE);
    return null; // Brief no-op frame while state flushes
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DEFENSIVE SCREEN: CACHE INITIALIZATION / LOADING
  // ════════════════════════════════════════════════════════════════════════════

  if (loadingCache) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin text-amber-300" />
          <h3 className="text-sm font-display text-white/80">Checking cached active interview session...</h3>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: PREPARATION / ONBOARD BOARD
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_PREP) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.28)" }}
          >
            <Mic size={28} style={{ color: "#fbbf24" }} />
          </div>

          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]
                       font-display font-semibold uppercase tracking-widest border mb-4"
            style={{
              background: "rgba(251, 191, 36, 0.08)",
              borderColor: "rgba(251, 191, 36, 0.25)",
              color: "#fbbf24",
            }}
          >
            <Zap size={9} /> Feature 4 — Mock Interview
          </span>

          <h1 className="text-2xl font-display font-black text-white tracking-tight mt-2 mb-2">
            AI Vocal Mock Simulator
          </h1>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Initializing AI Vocal Board for <span className="text-white font-semibold">{targetRole}</span>...
          </p>

          <p className="text-xs text-white/45 leading-relaxed mb-8 max-w-sm mx-auto">
  {demoMode
    ? "Demo Mode is enabled. You will answer one short interview question and experience the complete evaluation flow."
    : "Prepare to speak. Gemini AI will generate 3 realistic, friendly technical questions. We will trace your conversational delivery, repetitions, and pauses in real time."}
</p>

          {error && (
            <div className="text-xs text-red-400 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <motion.button
            onClick={() => handleInitiateSimulation(false)}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl
                       text-sm font-display font-bold transition-all duration-200"
            style={{ backgroundColor: "#fbbf24", color: "#451a03" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <Play size={14} fill="currentColor" />
            [ Initiate Audio Simulation ➔ ]
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: LOADING BOARD
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_LOADING) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.25)" }}
          >
            <Loader2 size={26} style={{ color: "#fbbf24" }} className="animate-spin" />
          </div>
          <h3 className="text-lg font-display font-bold text-white">Synthesizing Mock Simulation…</h3>
          <p className="text-xs text-white/55 max-w-xs">
            Generating friendly, conversational interview questions calibrated to your skill gaps...
          </p>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: ACTIVE SIMULATION CARD
  // ════════════════════════════════════════════════════════════════════════════
  const activeQuestion = questions && questions[currentIdx];

  // Defensive fallback rendering if active question is missing to prevent tab-switching blank screens
  if (view === VIEW_SIMULATION && !activeQuestion) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin text-amber-300" />
          <h3 className="text-sm font-display text-white/80">Loading interview sequence state...</h3>
        </motion.div>
      </div>
    );
  }

  if (view === VIEW_SIMULATION && activeQuestion) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto min-h-full">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <span
            className="text-[10px] font-display font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
            style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)", color: "#fbbf24" }}
          >
            Question {currentIdx + 1} of {questions.length}
          </span>
          <span className="text-xs text-white/50 font-sans">Mock Interview Studio</span>
        </div>

        {/* Recruiter Question Box */}
        <div
          className="rounded-2xl p-6 mb-6 relative overflow-hidden"
          style={{ background: "rgba(77, 76, 125, 0.22)", border: "1px solid rgba(255, 255, 255, 0.06)" }}
        >
          <div className="flex items-center gap-2 mb-2 text-white/40">
            <Sparkles size={11} className="text-amber-400" />
            <p className="text-[10px] font-display uppercase tracking-wider">AI Recruiter Prompt</p>
          </div>
          <h2 className="text-lg font-sans font-bold text-white leading-relaxed">
            {activeQuestion.question}
          </h2>
        </div>

        {/* Real-time Acoustic Monitor Consoles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Micro Capture Terminal */}
          <div
            className="md:col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
            style={{ background: "rgba(77, 76, 125, 0.25)", border: "1px solid rgba(251, 191, 36, 0.2)" }}
          >
            <AnimatePresence>
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-2xl border"
                  style={{ borderColor: "rgba(251, 191, 36, 0.35)" }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </AnimatePresence>

            <p className={`text-[10px] uppercase tracking-wider font-bold mb-4 ${isListening ? "text-amber-400" : "text-white/40"}`}>
              {isListening ? "[ 🎙️ Recording Audio Input... ]" : "Microphone Idle"}
            </p>

            <motion.button
              onClick={toggleMic}
              className="w-16 h-16 rounded-full flex items-center justify-center relative z-10 transition-all duration-200"
              style={{
                background: isListening
                  ? "radial-gradient(circle, #fbbf24 0%, #d97706 100%)"
                  : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: isListening ? "0 0 20px rgba(251, 191, 36, 0.4)" : "none",
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic size={24} style={{ color: isListening ? "#451a03" : "#ffffff" }} />
            </motion.button>

            <p className="text-[10px] text-white/50 mt-4 leading-relaxed max-w-[130px] font-sans">
              {isListening ? "Tap to pause speech capture" : "Tap to speak your answer"}
            </p>
          </div>

          {/* Advanced Analytics Tracer */}
          <div
            className="md:col-span-2 rounded-2xl p-6 flex flex-col justify-between"
            style={{ background: "rgba(77, 76, 125, 0.15)", border: "1px solid rgba(255, 255, 255, 0.05)" }}
          >
            <div>
              <p className="text-[10px] text-white/40 font-display uppercase tracking-wider mb-2.5">
                Real-time Capture Output
              </p>
              <div className="min-h-[90px] max-h-[120px] overflow-y-auto bg-black/20 rounded-xl p-3.5 font-sans text-xs leading-relaxed text-white/70">
                {transcription || (
                  <span className="text-white/30 italic">
                    Start speaking. Your real-time vocal feedback metrics will populate below.
                  </span>
                )}
              </div>
            </div>

            {/* Performance metrics dashboard tracer */}
            <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-sans">
                <span className="text-white/60">Filler words:</span>
                <span className="text-amber-300 font-bold">{totalFillers}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(fillerCounts).map(([word, val]) => (
                  <span
                    key={word}
                    className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border text-white/60"
                    style={{
                      background: val > 0 ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.02)",
                      borderColor: val > 0 ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {word}: {val}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10px] font-sans">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-white/45">Repetitions:</span>
                  <span className={stutterCount > 0 ? "text-amber-300 font-bold" : "text-white/70"}>{stutterCount}</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-white/45">Silence Pauses:</span>
                  <span className={confidencePenaltyCount > 0 ? "text-amber-300 font-bold" : "text-white/70"}>{confidencePenaltyCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex justify-between items-center">
          <motion.button
            onClick={() => {
              if (isListening && recognitionRef.current) {
                isListeningRef.current = false;
                setIsListening(false);
                recognitionRef.current.stop();
              }
              setView(VIEW_PREP);
            }}
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
            whileHover={{ x: -2 }}
          >
            <ArrowLeft size={12} /> Quit Interview
          </motion.button>

          {currentIdx < questions.length - 1 ? (
            <motion.button
              onClick={handleNextQuestion}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl
                         text-plum text-xs font-display font-bold transition-all duration-150"
              style={{ backgroundColor: "#D8B9C3" }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Next Question ➔
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSubmitInterview}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl
                         text-plum text-xs font-display font-black tracking-wide transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                color: "#451a03",
                boxShadow: "0 0 16px rgba(251, 191, 36, 0.25)",
              }}
              whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(251, 191, 36, 0.4)" }}
              whileTap={{ scale: 0.97 }}
            >
              <CheckCircle size={13} fill="currentColor" className="text-amber-100" />
              [ Finalize Interview & Submit ➔ ]
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: TELEMETRY DISPATCH SINK
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_CLAIMING) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(251, 191, 36, 0.1)", border: "1px solid rgba(251, 191, 36, 0.25)" }}
          >
            <Loader2 size={26} style={{ color: "#fbbf24" }} className="animate-spin" />
          </div>
          <h3 className="text-lg font-display font-bold text-white">Filing Simulation Performance…</h3>
          <p className="text-xs text-white/55 max-w-xs">
            Analyzing speech pacing and evaluating conversational confidence metrics with Gemini API...
          </p>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN: CELEBRATION / RESULTS & REDIRECTIONS
  // ════════════════════════════════════════════════════════════════════════════
  if (view === VIEW_CELEBRATE && xpResult) {
    return (
      <div className="p-6 lg:p-10 flex flex-col items-center justify-center min-h-[520px] text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full flex flex-col items-center"
        >
          {/* Trophy Node */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{
              background: "rgba(251, 191, 36, 0.15)",
              border: "2px solid rgba(251, 191, 36, 0.45)",
              boxShadow: "0 0 20px rgba(251, 191, 36, 0.25)",
            }}
          >
            <Award size={28} style={{ color: "#fbbf24" }} />
          </div>

          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px]
                       font-display font-bold uppercase tracking-wider border mb-3 text-amber-300"
            style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.3)" }}
          >
            Simulation Finalized
          </span>

          <h2 className="text-2xl font-display font-black text-white leading-tight mb-2">
            Mock Performance Evaluation
          </h2>
          <p className="text-xs text-white/60 mb-6 max-w-md font-sans">
            Successfully completed the interview! System logged: <strong className="text-white">{sessionTotalFillers} fillers</strong>, <strong className="text-white">{sessionStutters} stutters</strong>, and <strong className="text-white">{sessionConfidencePenalty} silence pauses</strong>.
          </p>

          {/* Real-time Gemini evaluation feedback block */}
          {xpResult.xpEarned === 0 ? (
            /* ── No-speech empty-state banner ───────────────────────────────────── */
            <div
              className="rounded-xl p-5 mb-6 text-left border w-full max-w-lg flex items-start gap-3"
              style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.25)" }}
            >
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-300 mb-1 font-display uppercase tracking-wider">
                  No Speech Input Detected
                </p>
                <p className="text-xs text-white/70 font-sans leading-relaxed">
                  No spoken responses were captured for this session. Complete an active interview response using the microphone to collect XP points.
                </p>
              </div>
            </div>
          ) : (
            /* ── Normal feedback block ──────────────────────────────────────────── */
            <div
              className="rounded-xl p-5 mb-6 text-left border w-full max-w-lg"
              style={{ background: "rgba(255, 255, 255, 0.03)", borderColor: "rgba(255, 255, 255, 0.08)" }}
            >
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-300" /> AI Recruiter Pacing Feedback
              </h4>
              <p className="text-xs text-white/80 leading-relaxed mb-3.5 font-sans">
                {xpResult.breakdown || "Your speech was fluid and professional with good pacing!"}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 justify-between">
                <span className="text-[10px] text-white/50 font-sans">Overall Pacing Confidence Score:</span>
                <span className="text-xs font-black text-amber-300 font-display">
                  {xpResult.confidenceScore !== undefined ? xpResult.confidenceScore : 100}%
                </span>
              </div>
            </div>
          )}

          {/* XP Token Banner — conditional on whether speech was detected */}
          <div
            className="rounded-xl px-6 py-4 mb-8 text-center flex items-center gap-3 border"
            style={{
              background: xpResult.xpEarned === 0
                ? "rgba(77,76,125,0.2)"
                : "rgba(77, 76, 125, 0.3)",
              borderColor: xpResult.xpEarned === 0
                ? "rgba(255,255,255,0.08)"
                : "rgba(251, 191, 36, 0.2)",
            }}
          >
            <TrendingUp size={16} className={xpResult.xpEarned === 0 ? "text-white/30" : "text-amber-300"} />
            {xpResult.xpEarned === 0 ? (
              <span className="text-xs text-white/40 font-display italic">
                [ Attend Interview to Collect XP ]
              </span>
            ) : (
              <span className="text-xs text-white/80 font-display">
                Awarded: <strong className="text-amber-300 text-sm font-black">+{xpResult.xpEarned} XP</strong> | New Collection Total: <strong className="text-white text-sm font-black">{xpResult.totalXP} XP</strong>
              </span>
            )}
          </div>

          {/* Navigation Destination paths */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center mb-6">
            <motion.button
              onClick={() => setActiveView("daily-challenge")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl
                         text-plum text-xs font-display font-black tracking-wide transition-all duration-200"
              style={{ backgroundColor: "#D8B9C3" }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              [ Go to Daily Challenge ➔ ]
            </motion.button>
            
            <motion.button
              onClick={() => setActiveView("home")}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl
                         text-white text-xs font-display font-black tracking-wide transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              whileHover={{ scale: 1.03, background: "rgba(255,255,255,0.09)" }}
              whileTap={{ scale: 0.97 }}
            >
              [ Back to Command Centre ]
            </motion.button>
          </div>

          {/* Explicit Regenerate new loop session button */}
          <motion.button
            onClick={() => {
              setIsCompleted(false);
              handleInitiateSimulation(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-display font-semibold text-white/70 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <RotateCcw size={12} />
            [ Regenerate New Mock Interview Session 🔄 ]
          </motion.button>

        </motion.div>
      </div>
    );
  }

  return null;
}
