
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquareText, User, Mic, Headphones, Sparkles, Home as HomeIcon, LogOut, ChevronRight, X } from 'lucide-react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';

const motion = motionBase as any;

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('voxsentinel_user'));
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStorage = () => {
      setUserName(localStorage.getItem('voxsentinel_user'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  const navLinks = [
    { path: '/', label: 'Overview', icon: HomeIcon },
    { path: '/register', label: 'Enrollment', icon: Mic },
    { path: '/coach', label: 'Coaching', icon: Headphones },
    { path: '/assistant', label: 'Assistant', icon: Sparkles },
  ];

  const handleLogout = () => {
    localStorage.removeItem('voxsentinel_user');
    setUserName(null);
    setShowPopover(false);
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const handleUserClick = () => {
    setShowPopover(!showPopover);
  };

  const greetings = [
    "System Online.",
    "Biometric Verified.",
    "Ready for Session.",
    "Security Clearance: Active."
  ];

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  return (
    <div className="fixed top-6 left-0 right-0 z-50 px-6 flex justify-center">
      <nav className="glass-card px-6 h-14 rounded-full flex items-center gap-6 shadow-2xl border border-white/10 relative">
        <Link to="/" className="flex items-center gap-2 group mr-2">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 15 }}
            className="p-1.5 bg-gradient-to-tr from-brand-indigo to-brand-violet rounded-lg shadow-lg"
          >
            <MessageSquareText className="w-4 h-4 text-white" />
          </motion.div>
          <span className="font-heading font-black text-sm tracking-tight bg-gradient-to-r from-brand-indigo via-brand-rose to-brand-amber bg-clip-text text-transparent hidden sm:block">
            VOXSENTINEL
          </span>
        </Link>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-1 sm:gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all relative group ${location.pathname === link.path
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <link.icon size={14} className={location.pathname === link.path ? 'text-brand-indigo' : 'text-zinc-600 group-hover:text-zinc-400'} />
              <span className="hidden md:block">{link.label}</span>
              {location.pathname === link.path && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-0 bg-white/5 rounded-full -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </Link>
          ))}
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* User Section with Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={handleUserClick}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all border outline-none ${userName
              ? 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              : 'text-zinc-500 hover:text-white border-transparent'
              }`}
          >
            <User size={userName ? 12 : 18} className={userName ? 'text-brand-indigo' : ''} />
            {userName && (
              <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[80px]">
                {userName}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showPopover && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-4 w-64 glass-card border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-brand-indigo/20 blur-2xl rounded-full" />

                <div className="relative z-10 space-y-6">
                  {userName ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-brand-indigo uppercase tracking-[0.2em]">Active Profile</span>
                          <button onClick={() => setShowPopover(false)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
                        </div>
                        <h4 className="text-xl font-black text-white truncate">{userName}</h4>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-zinc-400 font-medium leading-relaxed"
                        >
                          {randomGreeting}
                        </motion.p>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors text-xs font-bold uppercase tracking-widest group"
                        >
                          <div className="flex items-center gap-2">
                            <LogOut size={14} className="group-hover:text-brand-rose transition-colors" />
                            <span>Sign Out</span>
                          </div>
                          <ChevronRight size={14} className="opacity-40" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-brand-rose uppercase tracking-[0.2em]">Authentication Required</span>
                          <button onClick={() => setShowPopover(false)} className="text-zinc-500 hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="p-4 bg-brand-rose/10 rounded-2xl border border-brand-rose/20">
                          <h4 className="text-sm font-black text-white mb-2 uppercase tracking-tight">No Active Biometrics</h4>
                          <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                            Enroll your vocal signature to access secure communication channels.
                          </p>
                        </div>
                        <Link
                          to="/register"
                          onClick={() => setShowPopover(false)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-indigo text-white shadow-lg shadow-brand-indigo/20 transition-all hover:scale-[1.02] active:scale-95 text-[10px] font-black uppercase tracking-widest"
                        >
                          <Mic size={14} /> Start Enrollment
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
