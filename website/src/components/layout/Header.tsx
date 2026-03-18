"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname?.startsWith(path);
  };

  const navLinks = [
    { href: "/gallery/", label: "Gallery" },
    { href: "/notes/", label: "Notes" },
    { href: "/stack/", label: "Stack" },
  ];

  return (
    <header className="fixed top-4 right-4 z-50">
      {/* デスクトップ版 */}
      <div className="hidden md:flex items-center gap-6 bg-black/70 backdrop-blur-sm border border-white/10 rounded px-6 py-3">
        {pathname !== "/" && (
          <>
            <Link
              href="/"
              className="text-lg font-mono font-bold text-white hover:text-orange-500 transition"
            >
              jimixer.com
            </Link>
            <div className="h-4 w-px bg-white/20" />
          </>
        )}
        <nav className="flex items-center gap-4 text-sm font-mono">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition ${
                isActive(link.href)
                  ? "text-orange-500 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* モバイル版 */}
      <div className="md:hidden">
        {/* ハンバーガーボタン */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex flex-col gap-1.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded p-3"
          aria-label="Menu"
        >
          <span
            className={`block w-5 h-0.5 bg-white transition-transform ${
              isMenuOpen ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-white transition-opacity ${
              isMenuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-white transition-transform ${
              isMenuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <nav className="absolute top-full right-0 mt-2 bg-neutral-900 border border-white/10 rounded shadow-lg min-w-[160px] overflow-hidden">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className={`block px-4 py-3 text-sm font-mono transition ${
                pathname === "/"
                  ? "bg-white/5 font-bold text-orange-500"
                  : "text-neutral-400 hover:bg-white/5"
              }`}
            >
              Home
            </Link>
            <div className="h-px bg-white/10" />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 text-sm font-mono transition ${
                  isActive(link.href)
                    ? "bg-white/5 font-bold text-orange-500"
                    : "text-neutral-400 hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
