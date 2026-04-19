export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f2]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-[72px] h-[72px] rounded-2xl bg-[#1e3a8a] flex items-center justify-center text-white text-3xl font-black tracking-tight shadow-lg">SH</div>
        <span className="text-lg font-bold text-[#1c1917] tracking-tight">SEON Hub</span>
        <div className="flex gap-1.5 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a] animate-[bounce_1.4s_ease-in-out_infinite]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a] animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a8a] animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
      </div>
    </div>
  );
}
