import React, { useMemo } from 'react';

const AnimatedBackground: React.FC = () => {
  // Generate a random set of particles
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const size = Math.random() * 8 + 4; // 4px to 12px
      const left = Math.random() * 100; // 0% to 100%
      const animationDuration = Math.random() * 15 + 10; // 10s to 25s
      const delay = Math.random() * 15; // 0s to 15s
      
      // We mix some colors for variety: cyan, sky, fuchsia
      const colorOptions = ['bg-cyan-400', 'bg-sky-400', 'bg-fuchsia-400'];
      const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

      return {
        id: i,
        size,
        left,
        animationDuration,
        delay,
        color
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-gradient-to-br from-slate-900 via-sky-900 to-fuchsia-900">
      {/* Dynamic gradient overlay to make it look smooth and vibrant */}
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 to-fuchsia-500/20 mix-blend-overlay"></div>
      
      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className={`absolute rounded-full opacity-0 animate-float ${p.color} shadow-[0_0_15px_rgba(255,255,255,0.5)]`}
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            animationDuration: `${p.animationDuration}s`,
            animationDelay: `${p.delay}s`,
          }}
        ></div>
      ))}
      
      {/* Subtle pulsing background glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/30 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/30 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }}></div>
    </div>
  );
};

export default AnimatedBackground;
