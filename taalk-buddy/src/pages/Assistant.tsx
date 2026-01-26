
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Users,
  ArrowLeft,
  Activity,
  Trash2,
  User,
  Ghost,
  ShieldCheck,
  ShieldAlert,
  Zap,
  X,
  Sparkles
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

interface TurnMessage {
  id: string;
  speaker: 'user' | 'other';
  text: string;
  timestamp: number;
}

interface RealtimeStatus {
  speaker: 'user' | 'other' | 'idle';
  confidence: number;
}

interface CoachSuggestion {
  text: string;
  timestamp: number;
}

const AssistantPage: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const [turns, setTurns] = useState<TurnMessage[]>([]);
  const [userName, setUserName] = useState<string>('You');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>({ speaker: 'idle', confidence: 0 });
  const [suggestion, setSuggestion] = useState<CoachSuggestion | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('talkbuddy_user');
    if (stored) setUserName(stored);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [turns, suggestion]);

  const generateId = () => `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const stopSession = useCallback(() => {
    setIsListening(false);
    setWsReady(false);
    setRealtimeStatus({ speaker: 'idle', confidence: 0 });
    setSuggestion(null);

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
  }, []);

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  const startWebSocket = useCallback(() => {
    if (wsRef.current) return;

    // Connect to the conversation endpoint for multi-speaker tracking
    const ws = new WebSocket('ws://localhost:8000/ws/conversation');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected to Conversation Engine");
      setWsReady(true);

      // Heartbeat
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
          // data.speaker is "registered_user" or "unregistered_user"
          setRealtimeStatus({
            speaker: data.speaker === 'registered_user' ? 'user' : 'other',
            confidence: data.confidence || 0
          });
        }
        else if (data.type === 'transcription') {
          // If the user spoke, we can probably clear the suggestion as they have moved on
          if (data.speaker === 'registered_user') {
            setSuggestion(null);
          }

          setTurns(prev => [
            ...prev,
            {
              id: generateId(),
              speaker: data.speaker === 'registered_user' ? 'user' : 'other',
              text: data.text,
              timestamp: Date.now()
            }
          ]);
        }
        else if (data.type === 'coach') {
          console.log("Received coach suggestion:", data.text);
          setSuggestion({
            text: data.text,
            timestamp: Date.now()
          });

          // Auto-dismiss after 10 seconds to keep UI clean
          setTimeout(() => {
            setSuggestion(prev => {
              // Only clear if it's the same suggestion (timestamp check)
              if (prev && Date.now() - prev.timestamp >= 9500) {
                return null;
              }
              return prev;
            });
          }, 14000);
        }
      } catch (e) {
        // Ignore non-JSON
      }
    };

    ws.onclose = (event) => {
      console.warn("WebSocket closed");
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
  }, []);

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
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
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

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-w-7xl mx-auto overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 glass-card rounded-3xl mb-6 border border-white/10 shadow-xl z-30 mx-4 lg:mx-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400">
            <ArrowLeft size={20} />
          </Link>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-amber-500 animate-pulse' : 'bg-zinc-700'}`} />
            <h2 className="font-heading font-black text-[10px] uppercase tracking-widest text-zinc-400">
              {isListening ? (wsReady ? 'Analysis Active' : 'Connecting...') : 'Social Engine Standby'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <AnimatePresence mode="wait">
            {isListening && (
              <motion.div
                key="ws-status"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black border ${wsReady ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'}`}
              >
                <Activity size={12} />
                {wsReady ? 'DUAL CHANNEL' : 'OFFLINE'}
              </motion.div>
            )}

            {/* Realtime Identity Indicator */}
            {isListening && realtimeStatus.speaker !== 'idle' && (
              <motion.div
                key="identity"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${realtimeStatus.speaker === 'user'
                  ? 'bg-brand-indigo/20 text-brand-indigo border-brand-indigo/30'
                  : 'bg-zinc-700/50 text-zinc-400 border-zinc-600'
                  }`}
              >
                {realtimeStatus.speaker === 'user' ? <ShieldCheck size={12} /> : <Users size={12} />}
                {realtimeStatus.speaker === 'user' ? 'YOU' : 'GUEST'}
                <span className="opacity-50">{(realtimeStatus.confidence * 100).toFixed(0)}%</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setTurns([])}
            className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
            title="Clear History"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex-grow flex overflow-hidden px-4 lg:px-0 gap-6">
        {/* Main Chat Feed - Clean style matching Coach */}
        <div ref={scrollRef} className="flex-grow overflow-y-auto px-6 py-4 space-y-8 custom-scrollbar relative z-10">
          {turns.length === 0 && !isListening && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-20">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 4 }} className="p-10 rounded-full bg-amber-500/5">
                <Users size={80} className="text-amber-500" />
              </motion.div>
              <div className="max-w-sm">
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2 text-white">Social Assistant</h3>
                <p className="text-sm font-medium leading-relaxed text-zinc-400">
                  Activate to track your verified speech vs guest speech in real-time.
                </p>
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {turns.map((turn) => {
              const isMe = turn.speaker === 'user';

              // Styles mapping - matching Coach page
              const styles = isMe
                ? {
                  bg: 'bg-indigo-500/10',
                  border: 'border-indigo-500/20',
                  text: 'text-indigo-400',
                  icon: <User size={18} />
                }
                : {
                  bg: 'bg-zinc-900/60',
                  border: 'border-white/5',
                  text: 'text-zinc-400',
                  icon: <Ghost size={18} />
                };

              return (
                <motion.div
                  key={turn.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-4 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

                    {/* Avatar/Icon Box */}
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${isMe
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'
                      }`}>
                      {styles.icon}
                    </div>

                    <div className={`space-y-1 ${isMe ? 'text-right' : 'text-left'}`}>
                      {/* Speaker Name */}
                      <div className={`flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${styles.text}`}>
                          {isMe ? userName : 'Guest / Other'}
                        </span>
                      </div>

                      {/* Message Bubble */}
                      <div className={`glass-card px-6 py-4 rounded-3xl shadow-lg border ${styles.bg} ${styles.border} ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'
                        }`}>
                        <p className="text-lg font-medium leading-relaxed text-zinc-100">
                          {turn.text}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                          {formatTime(turn.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isListening && wsReady && (
            <div className="flex justify-center pt-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs font-bold uppercase tracking-widest"
              >
                <div className="flex gap-1">
                  <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.0 }} className="w-0.5 bg-zinc-500 rounded-full" />
                  <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-0.5 bg-zinc-500 rounded-full" />
                  <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-0.5 bg-zinc-500 rounded-full" />
                </div>
                Monitoring Conversation
              </motion.div>
            </div>
          )}
        </div>

        {/* Right Side Panel (Desktop) */}
        <div className="hidden lg:flex w-80 shrink-0 flex-col gap-4">
          <div className="flex-grow glass-card rounded-3xl border border-white/5 p-6 flex flex-col relative overflow-hidden bg-zinc-900/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-zinc-400">
                <Zap size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Live Coach</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${suggestion ? 'bg-brand-amber animate-pulse' : 'bg-zinc-800'}`} />
            </div>

            <div className="flex-grow flex flex-col justify-end">
              <AnimatePresence mode="popLayout">
                {suggestion ? (
                  <motion.div
                    key={suggestion.timestamp}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-brand-amber/10 to-transparent border border-brand-amber/20 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-amber flex items-center gap-1">
                        <Sparkles size={10} /> Suggestion
                      </span>
                      <button
                        onClick={() => setSuggestion(null)}
                        className="text-brand-amber/50 hover:text-brand-amber transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className="text-lg font-bold text-white leading-tight font-heading">
                      "{suggestion.text}"
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-1 flex-grow bg-brand-amber/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: "100%" }}
                          animate={{ width: "0%" }}
                          transition={{ duration: 10, ease: "linear" }}
                          className="h-full bg-brand-amber"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-4 opacity-30 py-10"
                  >
                    <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto flex items-center justify-center">
                      <Activity size={24} className="text-zinc-600" />
                    </div>
                    <p className="text-xs font-medium text-zinc-500 px-4">
                      Monitoring conversation flow for hesitation patterns...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay (Left unchanged for mobile users) */}
      <AnimatePresence>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="lg:hidden absolute bottom-[24rem] left-4 right-4 z-50 mx-auto max-w-lg"
          >
            <div className="glass-card p-6 rounded-3xl border border-brand-amber/40 shadow-[0_0_50px_rgba(245,158,11,0.3)] bg-zinc-900/95 backdrop-blur-2xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-brand-amber text-zinc-900 rounded-xl animate-pulse shrink-0">
                  <Zap size={24} fill="currentColor" />
                </div>
                <div className="space-y-1 flex-grow">
                  <h4 className="text-[10px] font-black text-brand-amber uppercase tracking-[0.2em]">Coach Assistance</h4>
                  <p className="text-xl font-bold text-white leading-tight">
                    "{suggestion.text}"
                  </p>
                </div>
                <button onClick={() => setSuggestion(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0">
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Controls */}
      <div className="p-8 shrink-0 flex flex-col items-center gap-6 relative z-30">
        <div className="w-full max-w-2xl h-24 flex items-center justify-center pointer-events-none mb-2">
          <AnimatePresence mode="wait">
            {isListening && (
              <Visualizer
                key="assistant-viz"
                analyser={analyserRef.current}
                isRecording={isListening}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-8">
          <Button
            onClick={toggleSession}
            color={isListening ? 'rose' : 'amber'}
            className="w-24 h-24 !rounded-full p-0 flex items-center justify-center shadow-2xl relative z-10"
          >
            {isListening ? <MicOff size={36} /> : <Mic size={36} />}
            {isListening && (
              <motion.div
                key="pulse-ring-amber"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-brand-rose rounded-full -z-10"
              />
            )}
          </Button>

          <div className="flex flex-col">
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] mb-1 ${isListening ? 'text-emerald-500' : 'text-zinc-600'}`}>
              {isListening ? 'LIVE FEED' : 'IDLE'}
            </span>
            <span className="text-3xl font-black uppercase tracking-tighter text-white">
              {isListening ? 'UNLINK' : 'LINK UP'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
