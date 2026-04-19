import { AppShell, PageHeader, WfBtn } from '../shell';
import { Plus, FolderOpen, Wallet, Users, TrendingUp, Clock } from 'lucide-react';

export default function DashboardWireframe() {
  return (
    <AppShell active="매니지먼트">
      <PageHeader
        title="대시보드"
        subtitle="2026년 4월 19일 일요일"
        right={
          <>
            <WfBtn>전체 기간</WfBtn>
            <WfBtn primary icon={Plus}>새 프로젝트</WfBtn>
          </>
        }
      />

      {/* 탭 */}
      <div className="inline-flex gap-1 p-1 bg-white border border-ink-200 rounded-xl mb-5">
        <span className="px-5 py-2 rounded-lg bg-blue-500 text-white text-[13px] font-semibold shadow-sm">콘텐츠</span>
        <span className="px-5 py-2 rounded-lg text-ink-500 text-[13px] font-semibold">마케팅</span>
        <span className="px-5 py-2 rounded-lg text-ink-500 text-[13px] font-semibold">재무</span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { k: '진행 중 프로젝트', v: '12', h: '+2', icon: FolderOpen, tone: 'brand' },
          { k: '이번 달 회차', v: '38', h: '완료 22', icon: Clock, tone: 'ink' },
          { k: '활성 클라이언트', v: '9', h: '신규 1', icon: Users, tone: 'ink' },
          { k: '이번 달 매출', v: '₩42.1M', h: '목표 84%', icon: Wallet, tone: 'ok' },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.k} className="bg-white border border-ink-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">{m.k}</span>
                <Icon size={14} className={m.tone === 'brand' ? 'text-brand-600' : m.tone === 'ok' ? 'text-emerald-600' : 'text-ink-400'} />
              </div>
              <div className="text-[22px] font-bold text-ink-900 leading-none">{m.v}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1 inline-flex items-center gap-1">
                <TrendingUp size={10} /> {m.h}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2 컬럼 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 최근 프로젝트 */}
        <div className="col-span-2 bg-white border border-ink-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-ink-900">최근 프로젝트</h3>
            <span className="text-[12px] text-brand-600 font-medium">전체 보기 →</span>
          </div>
          <div className="divide-y divide-ink-100">
            {[
              { name: '비모 ERP 시즌2 콘텐츠', client: 'VIMO', ep: '12/20편', status: '진행', tone: 'brand' },
              { name: '도화 뮤직비디오', client: 'HYPE5', ep: '3/5편', status: '진행', tone: 'brand' },
              { name: '메뉴한컷 온보딩', client: 'Internal', ep: '—', status: '대기', tone: 'warn' },
              { name: 'Ailik 홍보 영상', client: 'Ailik', ep: '—', status: '제안', tone: 'ink' },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div
                  className="w-10 h-10 rounded-lg shrink-0"
                  style={{
                    background: ['linear-gradient(135deg,#1e3a8a,#3b82f6)', 'linear-gradient(135deg,#7c3aed,#a78bfa)', 'linear-gradient(135deg,#166534,#22c55e)', 'linear-gradient(135deg,#7c2d12,#ea580c)'][i],
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-ink-900 truncate">{p.name}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{p.client} · {p.ep}</div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    p.tone === 'brand' ? 'bg-brand-50 text-brand-600' :
                    p.tone === 'warn' ? 'bg-amber-50 text-amber-700' :
                    'bg-ink-100 text-ink-600'
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 임박 데드라인 */}
        <div className="bg-white border border-ink-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-bold text-ink-900">임박 데드라인</h3>
            <span className="text-[10px] text-ink-400 uppercase tracking-[0.1em] font-semibold">이번 주</span>
          </div>
          <div className="space-y-3">
            {[
              { name: '비모 ERP 9편 편집', due: '내일', tone: 'bad' },
              { name: '도화 MV 1차 리뷰', due: '2일 후', tone: 'warn' },
              { name: '메뉴한컷 로고 확정', due: '3일 후', tone: 'ink' },
              { name: 'Ailik 기획안 피드백', due: '5일 후', tone: 'ink' },
            ].map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`w-1 h-1 rounded-full mt-2 shrink-0 ${
                  d.tone === 'bad' ? 'bg-red-500' : d.tone === 'warn' ? 'bg-amber-500' : 'bg-ink-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-ink-900 truncate">{d.name}</div>
                  <div className={`text-[10px] mt-0.5 ${
                    d.tone === 'bad' ? 'text-red-600 font-semibold' : d.tone === 'warn' ? 'text-amber-700' : 'text-ink-500'
                  }`}>
                    {d.due}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
