"use client";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#0D0E12]">
      {/* Honeycomb Grid pattern */}
      <div 
        className="absolute inset-0 opacity-40" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill-rule='evenodd' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l11 6.35 11-6.35V17.9l-11-6.35L3 17.9zM0 49l13.99-8.08L28 49v-4.62l-14.01-8.1L0 44.38V49zm0-49l13.99 8.08L28 0v4.62l-14.01 8.1L0 4.62V0z' fill='%23FFC700' fill-opacity='0.04' fill-rule='nonzero'/%3E%3C/svg%3E")`,
          backgroundSize: '28px 49px'
        }}
      />
      
      {/* Linear fine grid overlay for tech depth */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(to right, #FFC700 1px, transparent 1px), linear-gradient(to bottom, #FFC700 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Ambient glowing amber & gold orbs */}
      <div className="absolute -top-24 left-1/4 w-[650px] h-[650px] bg-[#FFC700]/12 rounded-full blur-[140px] animate-blob" />
      <div className="absolute top-1/3 -right-20 w-[550px] h-[550px] bg-[#F59E0B]/10 rounded-full blur-[130px] animate-blob-delayed-1" />
      <div className="absolute -bottom-24 left-1/3 w-[600px] h-[600px] bg-[#D97706]/8 rounded-full blur-[140px] animate-blob-delayed-2" />
      
      {/* Subtle radial vignette */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(circle at 50% 30%, transparent 0%, rgba(13, 14, 18, 0.75) 100%)'
        }}
      />

      {/* Global CSS keyframes for floating ambient orbs */}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { 
            transform: translate(0, 0) scale(1);
          }
          33% { 
            transform: translate(30px, -40px) scale(1.08);
          }
          66% { 
            transform: translate(-25px, 25px) scale(0.95);
          }
        }
        .animate-blob {
          animation: blob 18s ease-in-out infinite;
        }
        .animate-blob-delayed-1 {
          animation: blob 22s ease-in-out 3s infinite;
        }
        .animate-blob-delayed-2 {
          animation: blob 26s ease-in-out 6s infinite;
        }
      `}</style>
    </div>
  );
}

