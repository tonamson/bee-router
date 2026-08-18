"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0D0E12]/80 backdrop-blur-md border-b border-[#282B37]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0 group"
          onClick={() => router.push("/")}
          aria-label="Navigate to home"
        >
          {/* Glowing amber hexagon bee icon */}
          <div className="relative flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-[#FFC700] via-[#F59E0B] to-[#D97706] shadow-[0_0_16px_rgba(255,199,0,0.35)] text-black transition-transform duration-200 group-hover:scale-105">
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2L3.5 6.9v10.2L12 22l8.5-4.9V6.9L12 2zm0 2.4l6.5 3.75v7.5L12 19.4l-6.5-3.75v-7.5L12 4.4z"
                opacity="0.9"
              />
              <ellipse cx="12" cy="12" rx="3" ry="4" />
              <path
                d="M7.8 9.5c.8-1.5 2.3-2.5 4.2-2.5s3.4 1 4.2 2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M10 11.5h4M9.5 13.5h5"
                stroke="#0D0E12"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold tracking-tight group-hover:text-[#FFC700] transition-colors">
            BeeRouter
          </h2>
        </button>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-8">
          <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#features">
            Features
          </a>
          <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#how-it-works">
            How it Works
          </a>
          <a
            className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors"
            href="https://github.com/decolua/9router#readme"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <a
            className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors flex items-center gap-1"
            href="https://github.com/decolua/9router"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        </div>

        {/* CTA + Mobile menu */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard")}
            className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 bg-[#FFC700] hover:bg-[#FFD633] transition-all text-black text-sm font-bold shadow-[0_0_20px_rgba(255,199,0,0.4)] hover:shadow-[0_0_25px_rgba(255,199,0,0.6)] cursor-pointer"
          >
            Open Dashboard
          </button>
          <button 
            className="md:hidden text-white cursor-pointer p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#282B37] bg-[#0D0E12]/95 backdrop-blur-md">
          <div className="flex flex-col gap-4 p-6">
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
              How it Works
            </a>
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="https://github.com/decolua/9router#readme" target="_blank" rel="noopener noreferrer">
              Docs
            </a>
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors flex items-center gap-1" href="https://github.com/decolua/9router" target="_blank" rel="noopener noreferrer">
              GitHub <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
            <button 
              onClick={() => router.push("/dashboard")}
              className="h-10 rounded-lg bg-[#FFC700] hover:bg-[#FFD633] text-black text-sm font-bold shadow-[0_0_15px_rgba(255,199,0,0.35)] cursor-pointer"
            >
              Open Dashboard
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

