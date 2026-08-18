"use client";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[#282B37] bg-[#0D0E12] pt-16 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4 group inline-flex">
              {/* Glowing amber hexagon bee icon */}
              <div className="relative flex items-center justify-center size-8 rounded-xl bg-gradient-to-br from-[#FFC700] via-[#F59E0B] to-[#D97706] shadow-[0_0_14px_rgba(255,199,0,0.35)] text-black transition-transform duration-200 group-hover:scale-105">
                <svg className="size-4.5" viewBox="0 0 24 24" fill="currentColor">
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
              <h3 className="text-white text-lg font-bold group-hover:text-[#FFC700] transition-colors">
                BeeRouter
              </h3>
            </Link>
            <p className="text-gray-400 text-sm max-w-xs mb-6 leading-relaxed">
              The smartest unified AI gateway and routing proxy. Connect, orchestrate, and route AI requests across multiple providers with zero latency.
            </p>
            <div className="flex items-center gap-3">
              <a
                className="w-8 h-8 rounded-lg bg-[#16181F] border border-[#282B37] flex items-center justify-center text-gray-400 hover:text-[#FFC700] hover:border-[#FFC700]/40 transition-colors"
                href="https://github.com/tonamson/bee-router"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
              >
                <span className="material-symbols-outlined text-[18px]">code</span>
              </a>
            </div>
          </div>
          
          {/* Product */}
          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-white text-sm">Product</h4>
            <a className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors" href="#features">
              Features
            </a>
            <Link className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors" href="/dashboard">
              Web Dashboard
            </Link>
            <Link className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors" href="/dashboard/combos">
              Model Combos
            </Link>
            <Link className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors" href="/dashboard/quota">
              Quota Tracker
            </Link>
          </div>
          
          {/* Resources */}
          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-white text-sm">Resources</h4>
            <a
              className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors"
              href="https://github.com/tonamson/bee-router#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentation
            </a>
            <a
              className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors"
              href="https://github.com/tonamson/bee-router"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Repo
            </a>
            <a
              className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors"
              href="https://www.npmjs.com/package/bee-router"
              target="_blank"
              rel="noopener noreferrer"
            >
              NPM Package
            </a>
          </div>
          
          {/* Legal */}
          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-white text-sm">Open Source</h4>
            <a
              className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors"
              href="https://github.com/tonamson/bee-router/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              MIT License
            </a>
            <a
              className="text-gray-400 hover:text-[#FFC700] text-sm transition-colors"
              href="https://github.com/tonamson/bee-router"
              target="_blank"
              rel="noopener noreferrer"
            >
              Changelog
            </a>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="border-t border-[#282B37] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© {currentYear} BeeRouter. Built for developers with passion.</p>
          <div className="flex gap-6">
            <a
              className="hover:text-white transition-colors"
              href="https://github.com/tonamson/bee-router"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              className="hover:text-white transition-colors"
              href="https://www.npmjs.com/package/bee-router"
              target="_blank"
              rel="noopener noreferrer"
            >
              NPM
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

