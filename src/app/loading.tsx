export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f2]">
      <div className="flex flex-col items-center gap-4">
        <svg width={72} height={72} viewBox="0 0 134 108" fill="none">
          <path d="M0 10 L40 10 L67 54 L40 54 L27 34 L27 98 L0 98Z" fill="#ea580c" />
          <path d="M134 10 L94 10 L67 54 L94 54 L107 34 L107 98 L134 98Z" fill="#1c1917" />
        </svg>
        <span className="text-lg font-bold text-[#1c1917] tracking-tight">비모 ERP</span>
        <div className="flex gap-1.5 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-[bounce_1.4s_ease-in-out_infinite]" />
          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
      </div>
    </div>
  );
}
