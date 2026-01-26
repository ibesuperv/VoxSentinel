import React, { useState, useEffect } from 'react';
import { motion as motionBase } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Mic, Sparkles } from 'lucide-react';

const motion = motionBase as any;

interface ComingSoonProps {
  title: string;
  description: string;
}

const ComingSoonPage: React.FC<ComingSoonProps> = ({ title, description }) => {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('voxsentinel_user'));

  useEffect(() => {
    const handleStorage = () => {
      setUserName(localStorage.getItem('voxsentinel_user'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <div className="max-w-xl mx-auto text-center py-20 space-y-10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-zinc-900 text-zinc-600 mb-4 border border-zinc-800"
      >
        <Lock size={40} />
      </motion.div>

      <div className="space-y-4">
        <h1 className="text-4xl font-heading font-extrabold text-zinc-100">
          {title} is <span className="text-brand-indigo">Locked</span>
        </h1>
        <p className="text-lg text-zinc-400 leading-relaxed font-medium">
          {userName ? `Almost there, ${userName}. ` : ''}{description}
        </p>
      </div>

      <div className="flex flex-col gap-6 pt-10">
        {!userName ? (
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 py-4 px-8 rounded-2xl font-bold bg-brand-indigo text-white hover:bg-brand-indigo/90 transition-all shadow-xl shadow-brand-indigo/20"
          >
            <Mic size={20} /> Complete Voice Registration
          </Link>
        ) : (
          <div className="py-4 px-8 rounded-2xl font-bold bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20 flex items-center justify-center gap-2">
            <Sparkles size={20} /> Identity Verified
          </div>
        )}
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-200 font-bold transition-colors uppercase tracking-widest text-xs"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    </div>
  );
};

export default ComingSoonPage;