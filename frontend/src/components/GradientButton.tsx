import React, { ButtonHTMLAttributes } from 'react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'danger';
}

const GradientButton: React.FC<GradientButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const baseClasses = "relative w-full py-3 rounded-full font-bold text-white transition-all duration-300 transform shadow-lg overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed";
  
  const gradients = {
    primary: "bg-gradient-to-r from-sky-400 to-fuchsia-500 hover:from-sky-300 hover:to-fuchsia-400 hover:shadow-fuchsia-500/30",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 hover:shadow-red-500/30"
  };

  return (
    <button 
      className={`${baseClasses} ${gradients[variant]} ${!props.disabled ? 'hover:scale-[1.02]' : ''} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {/* Glossy top highlight for extra glass feel */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-full"></div>
    </button>
  );
};

export default GradientButton;
