import React, { useState, useEffect } from 'react';
import { motion as motionBase } from 'framer-motion';
import { Mic, Headphones, Sparkles, Flame, Server, AppWindow, Container, Zap } from 'lucide-react';
import FeatureCard from '../components/FeatureCard';

const motion = motionBase as any;

const Home: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('voxsentinel_user'));

  useEffect(() => {
    const handleStorage = () => {
      setUserName(localStorage.getItem('voxsentinel_user'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <div className="space-y-32 pb-32 relative">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-[circle_800px_at_50%_200px] from-brand-indigo/10 via-transparent to-transparent pointer-events-none" />

      <header className="text-center max-w-5xl mx-auto space-y-10 pt-20 relative z-10">
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 -left-10 hidden md:block opacity-40"
        >
          <div className="w-24 h-24 bg-brand-amber blur-3xl rounded-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "circOut" }}
          className="space-y-10"
        >
          <div className="flex justify-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-zinc-900/80 backdrop-blur-md shadow-xl border border-brand-indigo/30"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-brand-indigo blur-sm animate-pulse" />
                <Sparkles className="text-brand-indigo w-4 h-4 fill-brand-indigo relative z-10" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-300">
                {userName ? `System Active, ${userName}` : 'Secure Communications'}
              </span>
            </motion.div>
          </div>

          <h1 className="text-7xl md:text-[9rem] font-heading font-black tracking-tighter leading-[0.85] uppercase text-white drop-shadow-2xl">
            {userName ? (
              <>
                Communication <br />
                <span className="text-white">Intelligence.</span>
              </>
            ) : (
              <>
                Next Gen <br />
                <span className="text-white text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500">Vocal Security.</span>
              </>
            )}
          </h1>

          <p className="text-2xl md:text-3xl text-zinc-200 leading-relaxed max-w-2xl mx-auto font-medium tracking-tight drop-shadow-lg">
            {userName
              ? `Identity verified, ${userName}. Your secure communication channel is active and ready for neural analysis.`
              : `VoxSentinel is an enterprise-grade biometric communication platform. Secure, real-time coaching for high-stakes environments.`
            }
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center items-center gap-6"
        >
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">VoxSentinel Enterprise v1.0</p>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 relative z-10">
        <FeatureCard
          title="Enrollment"
          description={userName ? "Biometric signature calibrated. Identity verification active." : "Enroll your unique vocal biometric signature. Secure, encrypted, and personal."}
          icon={Mic}
          path="/register"
          btnLabel={userName ? "Recalibrate" : "Begin Enrollment"}
          themeColor="rose"
          delay={0.2}
        />
        <FeatureCard
          title="Coaching"
          description="Adaptive Speech Analysis. Receive real-time feedback on tonal clarity and rhetorical precision."
          icon={Headphones}
          path="/coach"
          btnLabel="Start Session"
          themeColor="indigo"
          delay={0.4}
        />
        <FeatureCard
          title="Assistant"
          description="Omni-Directional Intelligence. Real-time context retrieval and verified multi-speaker tracking."
          icon={Sparkles}
          path="/assistant"
          btnLabel="Launch Assistant"
          themeColor="amber"
          delay={0.6}
        />
      </div>

      <div className="py-20 px-4 relative z-10">
        <h3 className="text-center text-3xl font-heading font-black tracking-tight text-white mb-12 uppercase">System Architecture</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { title: "Inference Engine", desc: "FastAPI + PyTorch", detail: "High-Performance Neural Audio Processing", icon: Server },
            { title: "Client Interface", desc: "React + Vite", detail: "Responsive Real-time Visualization", icon: AppWindow },
            { title: "Infrastructure", desc: "Docker + CUDA", detail: "Containerized GPU Acceleration", icon: Container },
            { title: "Transport Layer", desc: "WebSockets", detail: "Low-Latency <50ms Stream", icon: Zap }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/80 hover:border-brand-indigo/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-brand-indigo/20 flex items-center justify-center text-zinc-400 group-hover:text-brand-indigo transition-colors mb-4 mx-auto">
                <item.icon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-wider text-zinc-300 mb-1 group-hover:text-white transition-colors">{item.title}</h4>
              <p className="text-brand-indigo font-bold text-xs mb-2 group-hover:text-brand-indigo/80">{item.desc}</p>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed group-hover:text-zinc-400">{item.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center py-20 px-10 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-linear-to-r from-brand-indigo/5 via-brand-rose/5 to-brand-amber/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <h2 className="text-4xl font-black tracking-tighter uppercase mb-6 text-zinc-50">Precision Engineered.</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {['Biometrics', 'NeuralNetworks', 'LowLatency', 'Encrypted', 'Enterprise'].map((tag) => (
            <span key={tag} className="px-5 py-2 rounded-full border border-zinc-800 text-xs font-black uppercase tracking-widest text-zinc-500">
              #{tag}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Home;