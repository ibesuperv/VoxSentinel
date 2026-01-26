
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  ShieldCheck,
  ShieldAlert,
  User,
  Sparkles,
  Settings2,
  Volume2,
  ArrowLeft,
  Wifi,
  WifiOff,
  Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Visualizer from '../components/Visualizer';

const motion = motionBase as any;

const WORKLET_CODE = `
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      this.port.postMessage(new Float32Array(channelData));
    }
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
`;

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isVerified: boolean;
  timestamp: Date;
}

interface VerificationStatus {
  status: 'VERIFIED' | 'NOT VERIFIED' | 'IDLE';
  confidence: number;
}

const CoachPage: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [verification, setVerification] = useState<VerificationStatus>({ status: 'IDLE', confidence: 0 });
  const [isAiThinking, setIsAiThinking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  const verificationRef = useRef(verification);
  const isAiThinkingRef = useRef(isAiThinking);

  useEffect(() => { verificationRef.current = verification; }, [verification]);
  useEffect(() => { isAiThinkingRef.current = isAiThinking; }, [isAiThinking]);

  // Preload voices
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      window.speechSynthesis.cancel(); // Cleanup any pending speech
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const stopSession = useCallback(() => {
    console.log("Stopping Session - Cleaning up resources");
    setIsListening(false);
    setWsReady(false);
    setIsAiThinking(false);

    // Stop speaking immediately
    window.speechSynthesis.cancel();

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }

    setVerification({ status: 'IDLE', confidence: 0 });
  }, []);

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  const speakResponse = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    // Cancel any current speech to ensure low latency for new response
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Priority list for English Male voices (Microsoft David, Daniel, Alex, Google UK English Male)
    // We search for voices containing specific male names or "Male" in the name
    const maleKeywords = ['David', 'Daniel', 'Alex', 'Mark', 'George', 'Male'];

    const englishVoices = voices.filter(v => v.lang.startsWith('en'));

    const maleVoice = englishVoices.find(v =>
      maleKeywords.some(keyword => v.name.includes(keyword))
    );

    // Fallback: Use the first English voice found if no specific male voice exists
    const selectedVoice = maleVoice || englishVoices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Adjust rate and pitch for a "quick" and authoritative coach-like feel
    utterance.rate = 1.15; // Slightly faster than default
    utterance.pitch = 0.95; // Slightly lower pitch for male preference

    window.speechSynthesis.speak(utterance);
  }, []);

  const startWebSocket = useCallback(() => {
    if (wsRef.current) return;

    const ws = new WebSocket('ws://localhost:8000/ws/talk');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected to Aura Engine");
      setWsReady(true);

      // Heartbeat: Send a tiny JSON ping every 10s to prevent 'keepalive ping timeout'
      heartbeatIntervalRef.current = window.setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 10000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          setVerification({
            status: data.status === 'VERIFIED' ? 'VERIFIED' : 'NOT VERIFIED',
            confidence: data.confidence || 0
          });
        }
        else if (data.type === 'transcription') {
          setIsAiThinking(true); // AI is now processing this speech
          setMessages(prev => [
            ...prev,
            {
              id: generateId(),
              role: 'user',
              text: data.text,
              isVerified: verificationRef.current.status === 'VERIFIED',
              timestamp: new Date()
            }
          ]);
        }
        else if (data.type === 'response') {
          setIsAiThinking(false); // AI is done thinking

          // Trigger TTS
          speakResponse(data.text);

          setMessages(prev => [
            ...prev,
            {
              id: generateId(),
              role: 'ai',
              text: data.text,
              isVerified: true,
              timestamp: new Date()
            }
          ]);
        }
      } catch (e) {
        // Silently handle binary or non-JSON if needed
      }
    };

    ws.onclose = (event) => {
      console.warn("WebSocket closed:", event.reason || "Unknown reason");
      setWsReady(false);
      wsRef.current = null;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setWsReady(false);
    };
  }, [speakResponse]);

  const startSession = async () => {
    if (isListening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(url);

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event) => {
        // Optimization: Don't flood the server with audio bytes if AI is already thinking/responding
        if (wsRef.current?.readyState === WebSocket.OPEN && !isAiThinkingRef.current) {
          wsRef.current.send(event.data.buffer);
        }
      };

      source.connect(analyser);
      analyser.connect(workletNode);

      startWebSocket();
      setIsListening(true);
    } catch (err) {
      console.error('Session failed to start:', err);
      alert('Microphone access is required.');
    }
  };

  const toggleSession = () => isListening ? stopSession() : startSession();

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-5xl mx-auto overflow-hidden relative group">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />
      <div className="absolute inset-0 bg-radial-[circle_800px_at_50%__-100px] from-brand-indigo/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 glass-card rounded-3xl mb-6 border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400">
            <ArrowLeft size={20} />
          </Link>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-zinc-700'}`} />
            <h2 className="font-heading font-black text-[10px] uppercase tracking-widest text-zinc-400">
              {isListening ? (wsReady ? 'System Linked' : 'Reconnecting...') : 'Aura Standby'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <AnimatePresence mode="wait">
            {isListening && (
              <motion.div
                key="ws-badge"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black border ${wsReady ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}
              >
                {wsReady ? <Wifi size={12} /> : <WifiOff size={12} />}
                {wsReady ? 'ACTIVE' : 'STALLED'}
              </motion.div>
            )}

            {isListening && verification.status !== 'IDLE' && (
              <motion.div
                key="verify-badge"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${verification.status === 'VERIFIED'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
              >
                {verification.status === 'VERIFIED' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                {verification.status === 'VERIFIED' ? 'Verified' : 'Unmatched'}
                <span className="opacity-40 ml-1">{(verification.confidence * 100).toFixed(0)}%</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button className="p-2 text-zinc-500 hover:text-white transition-colors">
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-grow overflow-y-auto px-6 py-4 space-y-8 custom-scrollbar">
        {messages.length === 0 && !isListening && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-20">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 40, ease: "linear" }} className="p-10 rounded-full bg-indigo-500/5">
              <Sparkles size={80} className="text-indigo-500" />
            </motion.div>
            <div className="max-w-sm">
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2 text-white">Private Practice</h3>
              <p className="text-sm font-medium leading-relaxed text-zinc-400">Sync with AI. Your speech is verified in real-time.</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id || `temp-${Math.random()}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${msg.role === 'user'
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>

                <div className={`space-y-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`glass-card px-6 py-4 rounded-3xl shadow-xl backdrop-blur-xl border ${msg.role === 'user'
                      ? 'rounded-tr-none bg-brand-indigo/10 border-brand-indigo/20 text-white'
                      : 'rounded-tl-none bg-zinc-900/40 border-white/10 text-zinc-100'
                    }`}>
                    <p className="text-lg font-medium leading-relaxed text-zinc-100">
                      {msg.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-1 justify-end">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isAiThinking && (
          <motion.div
            key="thinking-indicator"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-amber-400/50 italic text-sm font-medium px-14"
          >
            <Sparkles size={14} className="animate-pulse" /> AI is formulating a response...
          </motion.div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-8 shrink-0 flex flex-col items-center gap-6 relative">
        {/* Visualizer Container - Increased height to prevent overlap */}
        <div className="w-full max-w-2xl h-24 flex items-center justify-center pointer-events-none mb-2">
          <AnimatePresence mode="wait">
            {isListening && (
              <Visualizer
                key="active-viz"
                analyser={analyserRef.current}
                isRecording={isListening && !isAiThinking}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-8">
          <Button
            onClick={toggleSession}
            color={isListening ? 'rose' : 'indigo'}
            className="w-24 h-24 !rounded-full p-0 flex items-center justify-center shadow-2xl relative z-10"
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
            {isListening && (
              <>
                <motion.div
                  key="pulse-ring-1"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 bg-brand-rose/50 rounded-full -z-10"
                />
                <motion.div
                  key="pulse-ring-2"
                  animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeInOut" }}
                  className="absolute inset-0 bg-brand-rose/30 rounded-full -z-10"
                />
              </>
            )}
            {!isListening && (
              <div className="absolute inset-0 bg-brand-indigo/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
          </Button>

          <div className="flex flex-col">
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] mb-1 ${isListening ? (wsReady ? 'text-green-500' : 'text-amber-500') : 'text-zinc-600'}`}>
              {isListening ? (wsReady ? 'LISTEN MODE' : 'SYNCING...') : 'VOICE ENTRY'}
            </span>
            <span className="text-3xl font-black uppercase tracking-tighter text-white">
              {isListening ? 'LOCK SESH' : 'OPEN SESH'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] pt-4">
          <Volume2 size={12} /> {isListening ? 'Neural Link Hot' : 'System Safe'}
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <Sparkles size={12} /> {messages.length} Exchanges
        </div>
      </div>
    </div>
  );
};

export default CoachPage;
