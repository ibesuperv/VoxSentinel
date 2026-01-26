
import React from 'react';
import { motion as motionBase } from 'framer-motion';

const motion = motionBase as any;

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  color?: 'indigo' | 'rose' | 'emerald' | 'amber' | 'zinc';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  disabled, 
  className = '', 
  variant = 'primary',
  color = 'indigo'
}) => {
  // Use explicit color strings for Tailwind detection
  const variants = {
    primary: {
      indigo: 'bg-brand-indigo text-white shadow-brand-indigo/25',
      rose: 'bg-brand-rose text-white shadow-brand-rose/25',
      emerald: 'bg-brand-emerald text-white shadow-brand-emerald/25',
      amber: 'bg-brand-amber text-white shadow-brand-amber/25',
      zinc: 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-zinc-500/25',
    },
    secondary: {
      indigo: 'bg-brand-indigo/10 text-brand-indigo',
      rose: 'bg-brand-rose/10 text-brand-rose',
      emerald: 'bg-brand-emerald/10 text-brand-emerald',
      amber: 'bg-brand-amber/10 text-brand-amber',
      zinc: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
    },
    outline: {
      indigo: 'border-2 border-brand-indigo text-brand-indigo bg-transparent',
      rose: 'border-2 border-brand-rose text-brand-rose bg-transparent',
      emerald: 'border-2 border-brand-emerald text-brand-emerald bg-transparent',
      amber: 'border-2 border-brand-amber text-brand-amber bg-transparent',
      zinc: 'border-2 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-transparent',
    },
    ghost: {
      indigo: 'text-brand-indigo bg-transparent hover:bg-brand-indigo/5',
      rose: 'text-brand-rose bg-transparent hover:bg-brand-rose/5',
      emerald: 'text-brand-emerald bg-transparent hover:bg-brand-emerald/5',
      amber: 'text-brand-amber bg-transparent hover:bg-brand-amber/5',
      zinc: 'text-zinc-500 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800',
    }
  };

  const baseStyles = "relative px-8 py-4 rounded-2xl font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const selectedStyles = variants[variant][color];

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${selectedStyles} ${className}`}
    >
      {children}
    </motion.button>
  );
};

export default Button;
