
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
import LandingPage from './pages/Home';
import RegisterPage from './pages/Register';
import CoachPage from './pages/Coach';
import AssistantPage from './pages/Assistant';
import Navbar from './components/Navbar';

const motion = motionBase as any;

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-7xl mx-auto px-4 py-8"
    >
      {children}
    </motion.div>
  );
};

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col transition-colors duration-300 bg-[#030305] text-zinc-100 selection:bg-brand-indigo selection:text-white">
        <Navbar />
        <main className="flex-grow pt-24">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={
                <PageWrapper>
                  <LandingPage />
                </PageWrapper>
              } />
              <Route path="/register" element={
                <PageWrapper>
                  <RegisterPage />
                </PageWrapper>
              } />
              <Route path="/coach" element={
                <PageWrapper>
                  <CoachPage />
                </PageWrapper>
              } />
              <Route path="/assistant" element={
                <PageWrapper>
                  <AssistantPage />
                </PageWrapper>
              } />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}

export default App;
