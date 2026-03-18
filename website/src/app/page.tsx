import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      {/* Background Image with overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero/main-avatar.webp')" }}
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-end px-8 md:px-16">
        <div className="text-right space-y-8 max-w-xl">
          <div className="space-y-2">
            <h1 className="text-6xl md:text-7xl font-mono font-bold text-white tracking-tight">
              jimixer
            </h1>
            <p className="text-xl md:text-2xl font-mono text-gray-300">
              .com
            </p>
          </div>

          <div className="space-y-1 text-gray-400 font-sans text-sm md:text-base">
            <p>Internet being</p>
            <p>VRChat player</p>
            <p>Web developer</p>
          </div>

          <div className="pt-8 flex flex-col gap-3 items-end">
            <Link
              href="/gallery/"
              className="px-6 py-2 border border-white/30 hover:bg-white/10 text-white font-mono text-sm transition"
            >
              Gallery →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
