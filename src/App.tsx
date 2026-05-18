import { useState, useEffect } from "react";
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "./lib/firebase/config";
import Dashboard from "./components/Dashboard";
import { LogIn, Search, Target, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-natural-bg flex items-center justify-center font-serif italic text-natural-accent">
        <motion.div 
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 bg-natural-accent rounded-xl flex items-center justify-center text-white">
            <Target className="w-6 h-6 animate-pulse" />
          </div>
          <span className="text-2xl tracking-tighter">Establishing connection...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans selection:bg-natural-accent selection:text-white">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
          >
            <div className="mb-16">
              <div className="flex items-center justify-center mb-8">
                <div className="w-16 h-16 bg-natural-accent rounded-2xl flex items-center justify-center text-white shadow-xl shadow-natural-accent/20">
                  <Target className="w-8 h-8" />
                </div>
              </div>
              <h1 className="text-6xl md:text-7xl font-semibold tracking-tighter text-natural-heading mb-3">
                LeadPioneer
              </h1>
              <p className="text-sm font-serif italic text-natural-text/60">AUTONOMOUS LEAD GENERATION FOR THE MODERN CRAFTSMAN</p>
            </div>

            <button
              onClick={login}
              className="group relative px-10 py-4 bg-natural-accent text-white font-medium rounded-full hover:bg-natural-accent/90 transition-all duration-300 shadow-lg shadow-natural-accent/20 flex items-center gap-3"
            >
              <LogIn className="w-5 h-5 opacity-80" />
              Initialize Portal
            </button>
            
            <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl text-left border-t border-natural-border pt-12">
              <div className="space-y-3">
                <p className="font-serif italic text-lg text-natural-heading">01 &mdash; Autonomous Scouting</p>
                <p className="text-xs leading-relaxed opacity-70">AI-driven web browsing sources leads from dozens of platforms simultaneously with human-mimicry protocols.</p>
              </div>
              <div className="space-y-3">
                <p className="font-serif italic text-lg text-natural-heading">02 &mdash; Precise Extraction</p>
                <p className="text-xs leading-relaxed opacity-70">Advanced parsing isolates job scope, regional relevance, and verified budget metrics from raw list data.</p>
              </div>
              <div className="space-y-3">
                <p className="font-serif italic text-lg text-natural-heading">03 &mdash; Regional Mastery</p>
                <p className="text-xs leading-relaxed opacity-70">Map your geographic priority zones and let the agent haunt local boards for high-value opportunities.</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <Dashboard user={user} onLogout={logout} />
        )}
      </AnimatePresence>
    </div>
  );
}
