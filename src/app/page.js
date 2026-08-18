"use client";
import { useRouter } from "next/navigation";
import Navigation from "./components/Navigation";
import HeroSection from "./components/HeroSection";
import FlowAnimation from "./components/FlowAnimation";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import GetStarted from "./components/GetStarted";
import Footer from "./components/Footer";
import AnimatedBackground from "./components/AnimatedBackground";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative text-white font-sans overflow-x-hidden antialiased bg-[#0D0E12] selection:bg-[#FFC700] selection:text-black min-h-screen">
      {/* Animated Honeycomb Background */}
      <AnimatedBackground />

      <div className="relative z-10">
        <Navigation />
        
        <main>
          {/* Hero with Flow Animation */}
          <div className="relative">
            <HeroSection />
            <div className="flex justify-center pb-20 px-4">
              <FlowAnimation />
            </div>
          </div>
          
          <GetStarted />
          <HowItWorks />
          <Features />
          
          {/* CTA Section */}
          <section className="py-32 px-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#FFC700]/5 via-transparent to-transparent pointer-events-none" />
            <div className="max-w-4xl mx-auto text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFC700]/10 border border-[#FFC700]/30 text-xs font-semibold text-[#FFC700] mb-6">
                <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
                Get Started in Seconds
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-white">
                Ready to Supercharge Your AI Stack?
              </h2>
              <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of developers routing their AI workloads through BeeRouter with ultra-low latency. Open source, local-first, and 100% free.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => router.push("/dashboard")}
                  className="w-full sm:w-auto h-14 px-10 rounded-xl bg-[#FFC700] hover:bg-[#FFD633] text-black text-lg font-bold transition-all shadow-[0_0_25px_rgba(255,199,0,0.5)] hover:shadow-[0_0_35px_rgba(255,199,0,0.7)] hover:scale-105 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[22px]">bolt</span>
                  Open Dashboard
                </button>
                <a 
                  href="https://github.com/tonamson/bee-router#readme" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-14 px-10 rounded-xl border border-[#282B37] bg-[#16181F] hover:bg-[#1F222B] hover:border-[#FFC700]/40 text-white text-lg font-bold transition-all hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[22px]">menu_book</span>
                  Read Documentation
                </a>
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
      
      {/* Global styles for float and dash animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -16; }
        }
      `}</style>
    </div>
  );
}

