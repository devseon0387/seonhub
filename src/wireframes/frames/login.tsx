export default function LoginWireframe() {
  return (
    <div
      className="min-h-[600px] rounded-xl flex items-center justify-center p-10 border border-ink-200"
      style={{ background: '#f5f4f2' }}
    >
      <div className="w-[380px] bg-white border border-ink-200 rounded-2xl p-8 shadow-sm">
        {/* 브랜드 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-brand-600 text-white font-bold text-[18px] tracking-tight mb-3">
            SH
          </div>
          <div className="text-[18px] font-bold text-ink-900">SEON Hub</div>
          <div className="text-[12px] text-ink-500 mt-1">내부 운영 통합 허브</div>
        </div>

        {/* 입력 */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-ink-600 block mb-1">이메일</label>
            <div className="h-9 bg-white border border-ink-200 rounded-lg px-3 flex items-center text-[13px] text-ink-400">
              you@hype5.co.kr
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink-600 block mb-1">비밀번호</label>
            <div className="h-9 bg-white border border-ink-200 rounded-lg px-3 flex items-center text-[13px] text-ink-400">
              ••••••••
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-1.5 text-[11px] text-ink-600">
              <span className="w-3.5 h-3.5 border border-ink-300 rounded-[3px] bg-white" />
              로그인 상태 유지
            </label>
            <span className="text-[11px] text-brand-600">비밀번호 찾기</span>
          </div>
        </div>

        {/* 버튼 */}
        <button
          disabled
          className="w-full h-10 mt-5 rounded-lg bg-brand-600 text-white text-[13px] font-semibold cursor-default"
        >
          로그인
        </button>

        <div className="text-center mt-4 text-[11px] text-ink-400">
          SEON Hub · v1.0
        </div>
      </div>
    </div>
  );
}
