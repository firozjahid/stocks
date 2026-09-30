import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Layers,
  Volume2,
  VolumeX,
  Cpu,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { WaltonLogo } from './WaltonLogo.js';

// Web Audio API futuristic sound synthesizer
function playCyberBeep(frequency = 880, type: OscillatorType = 'sine', duration = 0.08) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio restrictions
  }
}

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cyber Matrix / Circuit Canvas Background Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Matrix characters: hex code, circuit symbols, Walton AC R&I terms
    const chars = '01WALTONACRIHEX2026R32CYBERNODE#%&@*+=~XYZ9876543210';
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = new Array(columns).fill(1).map(() => Math.floor(Math.random() * -50));

    // Circuit grid particles
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    }
    const particles: Particle[] = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      size: Math.random() * 2 + 1,
    }));

    const render = () => {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.22)';
      ctx.fillRect(0, 0, width, height);

      // Draw faint cyber grid lines
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 44;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Matrix Digital Rain in cyan, emerald, and electric blue
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (Math.random() > 0.42) {
          const text = chars[Math.floor(Math.random() * chars.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          ctx.fillStyle = drops[i] % 4 === 0 ? '#67e8f9' : drops[i] % 3 === 0 ? '#10b981' : '#0284c7';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#06b6d4';
          ctx.fillText(text, x, y);
          ctx.shadowBlur = 0;
        }

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      // Draw connected network particles
      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 110) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.14 * (1 - dist / 110)})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (soundEnabled) playCyberBeep(1200, 'triangle', 0.12);

    try {
      setLoading(true);
      await login(employeeId.trim(), password.trim());
      if (soundEnabled) playCyberBeep(1760, 'sine', 0.2);
    } catch (err: any) {
      if (soundEnabled) playCyberBeep(320, 'sawtooth', 0.25);
      setError(err?.message || 'Access Denied: Invalid Employee ID or Passcode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 overflow-hidden font-sans select-none">
      {/* Background Interactive Matrix Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />

      {/* Cyber Overlay Vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-slate-950/60 to-slate-950 z-1 pointer-events-none" />

      {/* Futuristic Audio Mute Toggle (Subtle Top-Right Floating Icon) */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-5 right-5 z-20 p-2 rounded-xl text-slate-400 hover:text-cyan-400 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 backdrop-blur-md transition shadow-lg"
        title={soundEnabled ? 'Mute Cyber Audio FX' : 'Enable Cyber Audio FX'}
      >
        {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
      </button>

      {/* Centered Sleek Cyber Security Gateway */}
      <div className="relative z-10 max-w-md w-full rounded-2xl border border-cyan-500/30 bg-slate-900/90 backdrop-blur-xl shadow-[0_0_60px_rgba(6,182,212,0.2)] p-7 sm:p-9 overflow-hidden">
        
        {/* Tactical Corner Reticle Brackets */}
        <div className="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-3 right-3 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400" />
        <div className="absolute bottom-3 left-3 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400" />

        {/* Laser Sweep Scan Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[pulse_2.5s_infinite]" />

        {/* Brand & System Title */}
        <div className="text-center mb-6">
          <div className="mb-3.5 flex justify-center">
            <div className="p-2.5 px-4 rounded-2xl bg-white shadow-[0_0_35px_rgba(6,182,212,0.4)] border border-cyan-400/40 inline-flex items-center justify-center">
              <WaltonLogo className="h-12 sm:h-14" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-[25px] font-black tracking-tight text-white mt-1 drop-shadow-sm">
            R.A.C R&amp;I Store Center
          </h1>
          <div className="text-xs font-mono font-semibold tracking-wide text-cyan-300 mt-1 uppercase">
            Walton Hi-Tech Industries PLC.
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Spare Parts &amp; Tools Management System
          </p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
          {/* Employee ID / Username Field */}
          <div>
            <label className="font-semibold text-slate-300 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Employee ID / Username</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">e.g. 1007, 12467, 38250</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                required
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="Enter Employee ID or Username"
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 group-hover:border-cyan-500/60 focus:border-cyan-400 rounded-xl font-mono text-sm text-cyan-200 placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 transition shadow-inner"
              />
              <div className="absolute right-3.5 top-3.5 text-[10px] font-mono text-cyan-500/70 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                USER
              </div>
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="font-semibold text-slate-300 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Password</span>
              </span>
              <span className="text-[10px] text-cyan-400/90 font-mono font-semibold">
                Default: Your ID
              </span>
            </label>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 group-hover:border-cyan-500/60 focus:border-cyan-400 rounded-xl font-mono text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-cyan-400 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.35)] transition transform active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-4"
          >
            <Zap className="w-4 h-4 text-cyan-200" />
            <span className="text-xs uppercase tracking-wider">
              {loading ? 'Authenticating...' : 'Authenticate & Enter Gateway'}
            </span>
            <ArrowRight className="w-4 h-4 text-cyan-200" />
          </button>
        </form>

        {/* Software Development Credit inside card */}
        <div className="pt-4 border-t border-slate-800/80 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-cyan-400 font-mono text-[11px] font-semibold tracking-wide shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Software Development by Jahid AC R&amp;I (ID-38250)</span>
          </div>
        </div>
      </div>

      {/* Bottom Page Footer Credit */}
      <footer className="mt-6 text-center text-slate-500 text-xs font-mono">
        <div>Walton AC Research &amp; Innovation Department</div>
        <div className="text-cyan-400/90 font-semibold mt-1">Software Development by Jahid AC R&amp;I (ID-38250)</div>
      </footer>
    </div>
  );
};
