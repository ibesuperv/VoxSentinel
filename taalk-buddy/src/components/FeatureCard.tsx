import React from 'react';
import { motion as motionBase } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Link } from 'react-router-dom';

const motion = motionBase as any;

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  btnLabel: string;
  delay?: number;
  themeColor: 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet';
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  path, 
  btnLabel, 
  delay = 0,
  themeColor 
}) => {
  const themes = {
    indigo: { 
      bg: 'bg-indigo-500/10', 
      text: 'text-indigo-400', 
      border: 'hover:border-indigo-500/50' 
    },
    rose: { 
      bg: 'bg-rose-500/10', 
      text: 'text-rose-400', 
      border: 'hover:border-rose-500/50' 
    },
    emerald: { 
      bg: 'bg-emerald-500/10', 
      text: 'text-emerald-400', 
      border: 'hover:border-emerald-500/50' 
    },
    amber: { 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-400', 
      border: 'hover:border-amber-500/50' 
    },
    violet: { 
      bg: 'bg-violet-500/10', 
      text: 'text-violet-400', 
      border: 'hover:border-violet-500/50' 
    },
  };

  const theme = themes[themeColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, type: 'spring' }}
      whileHover={{ y: -10 }}
      className={`glass-card p-10 rounded-[2.5rem] border border-zinc-800 transition-all ${theme.border} group relative overflow-hidden h-full flex flex-col`}
    >
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-20 ${theme.bg}`} />
      
      <div className={`mb-8 inline-flex p-5 rounded-2xl ${theme.bg} ${theme.text} shadow-inner self-start`}>
        <Icon size={32} />
      </div>

      <h3 className="text-3xl font-heading font-bold mb-4 tracking-tight text-white">
        {title}
      </h3>
      
      <p className="text-zinc-400 mb-10 text-lg leading-relaxed font-medium flex-grow">
        {description}
      </p>

      <Link 
        to={path}
        className={`inline-flex items-center gap-2 font-black uppercase tracking-widest text-xs ${theme.text} hover:gap-4 transition-all group-hover:underline decoration-2 underline-offset-4`}
      >
        {btnLabel} <ArrowRight size={16} />
      </Link>
    </motion.div>
  );
};

export default FeatureCard;