
import React, { useState, useRef, useEffect } from 'react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
import {
  Mic,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  User,
  ChevronRight,
  XCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { encodeWAV } from '../services/audioService';
import Visualizer from '../components/Visualizer';
import Button from '../components/ui/Button';

const motion = motionBase as any;

type Step = 'NAME' | 'INSTRUCTION' | 'RECORDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

const READING_SCRIPT = (name: string) =>
  `Hello, my name is ${name}. I am using this session to enhance my professional communication skills and refine my English fluency. Effective communication is a vital asset in today's global landscape, and I am committed to developing the clarity and confidence required for high-level interactions. I understand that consistent practice is the foundation of linguistic mastery. Through this program, I aim to expand my vocabulary, improve my pronunciation, and master the nuances of professional discourse. I look forward to the progress I will make and the new opportunities that clear communication will provide. Let us proceed with this acoustic calibration and begin our session.`;

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.6, ease: "backOut", staggerChildren: 0.1 }
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.3 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<Step>('NAME');
  const [name, setName] = useState('');
  const [timer, setTimer] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEnrollingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);

  const RECORD_DURATION = 40;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      isEnrollingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioDataRef.current = [];
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioDataRef.current.push(new Float32Array(inputData));
      };
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioCtx.destination);
      setStep('RECORDING');
      setTimer(0);
      timerRef.current = window.setInterval(() => {
        setTimer(p => {
          if (p >= RECORD_DURATION) {
            stopRecording(false);
            return p;
          }
          return p + 1;
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMessage("Microphone access is required. Please adjust browser permissions.");
      setStep('ERROR');
    }
  };

  const stopRecording = (isCancel: boolean = false) => {
    if (isEnrollingRef.current) return;
    if (!isCancel) isEnrollingRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) { }
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => { });
    }
    if (isCancel) {
      isEnrollingRef.current = false;
      setStep('INSTRUCTION');
    } else {
      handleRecordingStopped();
    }
  };

  const handleRecordingStopped = async () => {
    setIsSubmitting(true);
    setStep('PROCESSING');
    try {
      const totalLength = audioDataRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      if (totalLength === 0) throw new Error("Audio signal not detected.");
      const result = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of audioDataRef.current) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      const wavBlob = encodeWAV(result, 16000);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('audio', wavBlob, 'voice_sample.wav');
      const response = await fetch('http://localhost:8000/api/enroll-voice', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        localStorage.setItem('voxsentinel_user', name);
        window.dispatchEvent(new Event('storage'));
        setStep('SUCCESS');
      } else {
        const err = await response.json().catch(() => ({}));
        setErrorMessage(err.detail || err.message || "Enrollment failed. Ensure clear audio delivery.");
        isEnrollingRef.current = false;
        setStep('ERROR');
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to establish connection with the secure verification server.");
      isEnrollingRef.current = false;
      setStep('ERROR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      <AnimatePresence mode="wait">
        {step === 'NAME' && (
          <motion.div key="name" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="glass-card p-12 rounded-[2.5rem] border border-zinc-800 shadow-xl space-y-10">
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="w-12 h-12 bg-brand-indigo rounded-xl flex items-center justify-center text-white mb-4">
                <User size={24} />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Identity Enrollment</h2>
              <p className="text-zinc-400 text-lg font-medium">Please enter your professional identifier to generate your secure profile.</p>
            </motion.div>
            <motion.div variants={itemVariants} className="space-y-6">
              <input
                type="text"
                placeholder="Full Name / ID"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-6 py-4 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-brand-indigo focus:ring-1 focus:ring-brand-indigo text-xl outline-none transition-all placeholder:text-zinc-600 font-medium text-white"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep('INSTRUCTION')}
              />
              <Button disabled={!name.trim()} onClick={() => setStep('INSTRUCTION')} className="w-full text-lg py-4 rounded-xl" color="indigo">
                Proceed to Verification <ArrowRight size={20} />
              </Button>
            </motion.div>
          </motion.div>
        )}

        {step === 'INSTRUCTION' && (
          <motion.div key="instr" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="glass-card p-12 rounded-[2.5rem] border border-zinc-800 shadow-xl space-y-8">
            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight text-white">Voice Print Registration</h2>
              <p className="text-zinc-400 text-lg font-medium">Read the script below clearly. This establishes your unique biometric baseline.</p>
            </motion.div>
            <motion.div variants={itemVariants} className="p-8 bg-zinc-900/50 rounded-2xl border border-zinc-800 text-lg text-zinc-200 leading-relaxed font-medium italic">
              "{READING_SCRIPT(name)}"
            </motion.div>
            <motion.div variants={itemVariants} className="flex flex-col gap-4">
              <Button onClick={startRecording} color="indigo" className="w-full py-4 text-xl rounded-xl">
                <Mic size={22} /> Initialize Enrollment
              </Button>
              <button onClick={() => setStep('NAME')} className="text-zinc-500 hover:text-zinc-300 text-sm font-semibold transition-colors uppercase tracking-widest">
                Modify ID
              </button>
            </motion.div>
          </motion.div>
        )}

        {step === 'RECORDING' && (
          <motion.div key="rec" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className={`glass-card p-8 md:p-12 rounded-[2.5rem] border border-zinc-800 shadow-xl text-center space-y-8 max-w-5xl mx-auto flex flex-col min-h-[70vh] ${isSubmitting ? 'pointer-events-none opacity-80' : ''}`}>
            <div className="flex justify-between items-center shrink-0">
              <div className="text-left">
                <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Enrollment Active</span>
                <p className="text-xl font-bold text-brand-indigo">{RECORD_DURATION - timer}s remaining</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => stopRecording(true)} className="p-3 rounded-lg bg-zinc-800 text-zinc-400 hover:text-brand-rose transition-colors flex items-center gap-2 font-bold text-xs uppercase">
                  <XCircle size={16} /> Cancel
                </button>
              </div>
            </div>
            <div className="flex-grow flex flex-col gap-6">
              <div className="flex-grow p-8 bg-zinc-950 border border-zinc-900 rounded-2xl text-left overflow-y-auto custom-scrollbar shadow-inner">
                <p className="text-2xl text-zinc-100 leading-relaxed font-medium">
                  {READING_SCRIPT(name)}
                </p>
              </div>
              <div className="shrink-0 h-24">
                <Visualizer analyser={analyserRef.current} isRecording={true} />
              </div>
            </div>
          </motion.div>
        )}

        {step === 'PROCESSING' && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-20 rounded-[2.5rem] text-center space-y-12">
            <div className="flex justify-center">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="w-32 h-32 rounded-full border-4 border-zinc-800 border-t-brand-indigo" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white">Processing Biometrics</h2>
              <p className="text-zinc-500 font-medium">Generating unique acoustic signature for {name}...</p>
            </div>
          </motion.div>
        )}

        {step === 'SUCCESS' && (
          <motion.div key="succ" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-16 rounded-[2.5rem] text-center space-y-10 shadow-xl">
            <div className="w-20 h-20 rounded-2xl bg-brand-emerald/10 text-brand-emerald flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-bold tracking-tight text-white">Enrollment Successful</h2>
              <p className="text-zinc-400 text-lg font-medium">Your biometric profile is active, {name}. Welcome to VoxSentinel Enterprise.</p>
            </div>
            <div className="flex flex-col gap-4">
              <Button onClick={() => window.location.hash = '#/coach'} color="indigo" className="w-full text-lg py-4 rounded-xl">
                Access Dashboard <ChevronRight size={20} />
              </Button>
              <button onClick={() => setStep('INSTRUCTION')} className="text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-2 text-xs font-bold transition-all uppercase tracking-widest">
                <RotateCcw size={14} /> Re-enroll
              </button>
            </div>
          </motion.div>
        )}

        {step === 'ERROR' && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 rounded-[2.5rem] text-center space-y-8 border-brand-rose/20">
            <div className="w-16 h-16 bg-brand-rose/10 text-brand-rose rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">Calibration Disruption</h2>
            <p className="text-zinc-300 font-medium bg-zinc-900 p-4 rounded-xl">
              {errorMessage}
            </p>
            <Button onClick={() => setStep('INSTRUCTION')} color="zinc" className="w-full py-3.5 text-md rounded-xl">
              <RefreshCw size={18} /> Restart Calibration
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegisterPage;
