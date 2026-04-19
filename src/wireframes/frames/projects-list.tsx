import { AppShell, PageHeader, WfBtn } from '../shell';
import { Plus, Search, ChevronDown } from 'lucide-react';

export default function ProjectsListWireframe() {
  return (
    <AppShell active="프로젝트">
      <PageHeader
        title="프로젝트"
        subtitle="총 24건 · 활성 12 · 대기 3 · 보관 7"
        right={
          <>
            <div className="inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-white border border-ink-200 text-[12px] text-ink-400 w-56">
              <Search size={13} />프로젝트 검색
            </div>
            <WfBtn>최근순<ChevronDown size={12} className="inline ml-1" /></WfBtn>
            <WfBtn primary icon={Plus}>새 프로젝트</WfBtn>
          </>
        }
      />

      {/* 상태 칩 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[
          { l: '활성 · 12', active: true },
          { l: '대기 · 3' },
          { l: '휴면 · 2' },
          { l: '보관 · 7' },
        ].map((c, i) => (
          <span
            key={i}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border ${
              c.active
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-ink-500 border-ink-200'
            }`}
          >
            {c.l}
          </span>
        ))}
      </div>

      {/* 타입 */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {[
          { l: '전체 타입', active: true },
          { l: '영상' },
          { l: '개발' },
          { l: '콘텐츠' },
        ].map((c, i) => (
          <span
            key={i}
            className={`px-3 py-1 rounded-full text-[11px] font-medium border ${
              c.active
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-500 border-ink-200'
            }`}
          >
            {c.l}
          </span>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { name: '비모 ERP 시즌2 콘텐츠', client: 'VIMO', type: '영상', status: '진행', ep: '12/20편', pct: 60, grad: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', tone: 'brand' },
          { name: '도화 뮤직비디오', client: 'HYPE5', type: '영상', status: '진행', ep: '3/5편', pct: 45, grad: 'linear-gradient(135deg,#7c3aed,#a78bfa)', tone: 'brand' },
          { name: '메뉴한컷 온보딩', client: 'Internal', type: '콘텐츠', status: '대기', ep: '—', pct: 10, grad: 'linear-gradient(135deg,#166534,#22c55e)', tone: 'warn' },
          { name: 'Ailik 홍보 영상', client: 'Ailik', type: '영상', status: '제안', ep: '—', pct: 0, grad: 'linear-gradient(135deg,#7c2d12,#ea580c)', tone: 'ink' },
        ].map((p, i) => (
          <div key={i} className="bg-white border border-ink-200 rounded-2xl p-4 hover:border-ink-300 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: p.grad }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] font-bold text-ink-900 truncate">{p.name}</div>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                      p.tone === 'brand' ? 'bg-brand-50 text-brand-600' :
                      p.tone === 'warn' ? 'bg-amber-50 text-amber-700' :
                      'bg-ink-100 text-ink-600'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="text-[11px] text-ink-500 mt-0.5">{p.client} · {p.type} · {p.ep}</div>
              </div>
            </div>

            {/* 진행률 */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-ink-500">진행률</span>
                <span className="text-ink-900 font-semibold tabular-nums">{p.pct}%</span>
              </div>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full" style={{ width: `${p.pct}%` }} />
              </div>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-ink-100 text-[11px] text-ink-500">
              <span>담당 2명</span>
              <span>2일 전 수정</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
