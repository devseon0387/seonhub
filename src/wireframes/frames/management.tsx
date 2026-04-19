import { AppShell, PageHeader, WfBtn } from '../shell';
import { Plus, AlertTriangle, MoreHorizontal } from 'lucide-react';

export default function ManagementWireframe() {
  return (
    <AppShell active="매니지먼트">
      <PageHeader
        title="매니지먼트"
        subtitle="2026년 4월 19일 일요일"
        right={<WfBtn primary icon={Plus}>회차 추가</WfBtn>}
      />

      {/* 탭 */}
      <div className="inline-flex gap-1 p-1 bg-white border border-ink-200 rounded-xl mb-5">
        <span className="px-5 py-2 rounded-lg bg-blue-500 text-white text-[13px] font-semibold shadow-sm">메인</span>
        <span className="px-5 py-2 rounded-lg text-ink-500 text-[13px] font-semibold inline-flex items-center gap-1.5">
          미기입
          <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
            <AlertTriangle size={9} /> 3
          </span>
        </span>
        <span className="px-5 py-2 rounded-lg text-ink-500 text-[13px] font-semibold">리포트</span>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-ink-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-ink-200 bg-ink-50 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
          <div className="col-span-3">프로젝트 / 회차</div>
          <div className="col-span-2">담당 매니저</div>
          <div className="col-span-2">작업</div>
          <div className="col-span-1">상태</div>
          <div className="col-span-1 text-right">금액</div>
          <div className="col-span-2">데드라인</div>
          <div className="col-span-1" />
        </div>

        {[
          { p: '비모 ERP', e: '9편 · 오프닝 편집', mgr: '이선', task: '편집', status: '진행', statusTone: 'brand', amt: '₩800,000', due: '내일', dueTone: 'bad' },
          { p: '비모 ERP', e: '10편 · 촬영', mgr: '이선', task: '촬영', status: '대기', statusTone: 'warn', amt: '₩1,200,000', due: '3일 후', dueTone: 'ink' },
          { p: '도화 MV', e: '1편 · 피치', mgr: '김OO', task: '기획', status: '진행', statusTone: 'brand', amt: '₩500,000', due: '2일 후', dueTone: 'warn' },
          { p: '도화 MV', e: '2편 · 레코딩', mgr: '김OO', task: '촬영', status: '완료', statusTone: 'ok', amt: '₩900,000', due: '—', dueTone: 'ink' },
          { p: '메뉴한컷', e: '온보딩 01', mgr: '—', task: '디자인', status: '미기입', statusTone: 'bad', amt: '—', due: '미정', dueTone: 'ink' },
          { p: 'Ailik', e: '프리뷰 01', mgr: '박OO', task: '편집', status: '진행', statusTone: 'brand', amt: '₩600,000', due: '5일 후', dueTone: 'ink' },
        ].map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink-100 last:border-b-0 items-center text-[12px] hover:bg-ink-50"
          >
            <div className="col-span-3">
              <div className="font-semibold text-ink-900">{r.p}</div>
              <div className="text-[11px] text-ink-500 mt-0.5">{r.e}</div>
            </div>
            <div className="col-span-2 text-ink-700">{r.mgr}</div>
            <div className="col-span-2 text-ink-700">{r.task}</div>
            <div className="col-span-1">
              <span
                className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                  r.statusTone === 'brand' ? 'bg-brand-50 text-brand-600' :
                  r.statusTone === 'warn' ? 'bg-amber-50 text-amber-700' :
                  r.statusTone === 'ok' ? 'bg-emerald-50 text-emerald-700' :
                  r.statusTone === 'bad' ? 'bg-red-50 text-red-700' :
                  'bg-ink-100 text-ink-600'
                }`}
              >
                {r.status}
              </span>
            </div>
            <div className="col-span-1 text-right font-semibold text-ink-900 tabular-nums">{r.amt}</div>
            <div className={`col-span-2 text-[11px] ${
              r.dueTone === 'bad' ? 'text-red-600 font-semibold' :
              r.dueTone === 'warn' ? 'text-amber-700' : 'text-ink-500'
            }`}>
              {r.due}
            </div>
            <div className="col-span-1 text-right text-ink-400">
              <MoreHorizontal size={14} className="inline" />
            </div>
          </div>
        ))}
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-4 gap-3 mt-4">
        {[
          { k: '오늘 진행', v: '4', tone: 'brand' },
          { k: '이번 주', v: '12', tone: 'ink' },
          { k: '미기입', v: '3', tone: 'bad' },
          { k: '합계 금액', v: '₩4.0M', tone: 'ok' },
        ].map((m) => (
          <div key={m.k} className="bg-white border border-ink-200 rounded-xl p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">{m.k}</div>
            <div className={`text-[20px] font-bold mt-1 ${
              m.tone === 'brand' ? 'text-brand-600' :
              m.tone === 'bad' ? 'text-red-600' :
              m.tone === 'ok' ? 'text-emerald-600' :
              'text-ink-900'
            }`}>
              {m.v}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
