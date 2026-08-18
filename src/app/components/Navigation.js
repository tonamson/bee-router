"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
          <div className="relative flex items-center justify-center size-9 transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/logo.png?v=2"
              alt="BeeRouter Logo"
              width={36}
              height={36}
              className="object-contain"
              priority
              unoptimized
            />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-white text-xl font-bold tracking-tight group-hover:text-[#FFC700] transition-colors">
              BeeRouter
            </h2>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#FFC700]/10 text-[#FFC700] border border-[#FFC700]/20">
              OPEN SOURCE
            </span>
          </div>
        </button>

        {/* Desktop menu */}
        <div className="hidden lg:flex items-center gap-7">
          <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#simulator">
            Simulator
          </a>
          <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#quickstart">
            Quickstart
          </a>
          <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#benchmarks">
            Benchmarks
          </a>
          <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#how-it-works">
            Architecture
          </a>
          <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#features">
            Features
          </a>
          <a
            className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors flex items-center gap-1"
            href="https://github.com/tonamson/bee-router"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        </div>

        {/* CTA + Mobile menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/login")}
            className="hidden sm:flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#16181F] border border-transparent hover:border-[#282B37] transition-all cursor-pointer"
          >
            Sign in
          </button>
          <button 
            onClick={() => router.push("/dashboard")}
            className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 bg-[#FFC700] hover:bg-[#FFD633] transition-all text-black text-sm font-bold shadow-[0_0_20px_rgba(255,199,0,0.4)] hover:shadow-[0_0_25px_rgba(255,199,0,0.6)] cursor-pointer"
          >
            Open Dashboard
          </button>
          <button 
            className="lg:hidden text-white cursor-pointer p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#282B37] bg-[#0D0E12]/95 backdrop-blur-md">
          <div className="flex flex-col gap-4 p-6">
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#simulator" onClick={() => setMobileMenuOpen(false)}>
              Simulator
            </a>
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#quickstart" onClick={() => setMobileMenuOpen(false)}>
              Quickstart
            </a>
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#benchmarks" onClick={() => setMobileMenuOpen(false)}>
              Benchmarks
            </a>
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
              Architecture
            </a>
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors" href="#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a className="text-gray-300 hover:text-[#FFC700] text-sm font-medium transition-colors flex items-center gap-1" href="https://github.com/tonamson/bee-router" target="_blank" rel="noopener noreferrer">
              GitHub <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/login");
                }}
                className="h-10 rounded-lg border border-[#282B37] bg-[#16181F] hover:bg-[#1F222B] text-white text-sm font-semibold flex items-center justify-center cursor-pointer transition-colors"
              >
                Sign in
              </button>
              <button 
                onClick={() => router.push("/dashboard")}
                className="h-10 rounded-lg bg-[#FFC700] hover:bg-[#FFD633] text-black text-sm font-bold shadow-[0_0_15px_rgba(255,199,0,0.35)] cursor-pointer"
              >
                Open Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
