'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FolderOpen, Settings, Briefcase, Trash2,
  Megaphone, LogOut, ClipboardCheck, Building2,
  Wallet, Receipt, FileText, Target, Shield, Layers, Menu, X, Calendar,
  MessageSquarePlus,
} from 'lucide-react';
import DashboardContent from '@/components/DashboardContent';
import GlobalFAB from '@/components/GlobalFAB';
import GlobalSearch from '@/components/GlobalSearch';
import TutorialProvider from '@/components/tutorial/TutorialProvider';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import NotificationDropdown from '@/components/NotificationDropdown';
import CustomCursor from '@/components/CustomCursor';
import FeedbackModal from '@/components/FeedbackModal';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getMyProfile, getProjectById, getProjectEpisodes } from '@/lib/supabase/db';

// ── 타입 정의
type NavLink    = { type: 'link';    href: string; label: string; icon: React.ElementType; badge?: string; sub?: SubLink[] };
type NavDivider = { type: 'divider' };
type NavItem    = NavLink | NavDivider;
type SubLink    = { href: string; label: string; icon: React.ElementType; badge?: string };
type Section    = { key: string; icon: React.ElementType; label: string; items: NavItem[] };

const isLink = (i: NavItem): i is NavLink => i.type === 'link';

// ── 섹션 정의 (레일 탭 기준)
const SECTIONS: Section[] = [
  {
    key: 'main',
    icon: LayoutDashboard,
    label: '메인',
    items: [
      { type: 'link', href: '/management', label: '매니지먼트', icon: ClipboardCheck  },
      { type: 'link', href: '/projects',   label: '프로젝트',   icon: FolderOpen      },
      { type: 'divider' },
      { type: 'link', href: '/clients',    label: '클라이언트', icon: Briefcase       },
      { type: 'link', href: '/partners',   label: '파트너',     icon: Users           },
      { type: 'divider' },
      { type: 'link', href: '/feedback',   label: '개선사항',   icon: MessageSquarePlus },
    ],
  },
  {
    key: 'manage',
    icon: Building2,
    label: '경영',
    items: [
      { type: 'link', href: '/finance',    label: '재무',       icon: Wallet,   badge: '준비중' },
      { type: 'link', href: '/settlement', label: '정산',       icon: Receipt,  badge: '준비중', sub: [
        { href: '/settlement/history', label: '월별 내역', icon: Calendar },
      ] },
      { type: 'link', href: '/contracts',    label: '계약',       icon: FileText, badge: '준비중' },
      { type: 'link', href: '/strategy',   label: '전략',       icon: Target,   badge: '준비중' },
      { type: 'link', href: '/operations', label: '운영',       icon: Layers,   badge: '준비중' },
      { type: 'divider' },
      { type: 'link', href: '/marketing',  label: '마케팅',     icon: Megaphone, badge: '준비중' },
    ],
  },
];

// ── 시스템 항목 (레일 하단에 직접 배치)
const SYSTEM_ITEMS: NavLink[] = [
  { type: 'link', href: '/settings', label: '설정',   icon: Settings },
  { type: 'link', href: '/trash',    label: '휴지통', icon: Trash2   },
];

const RAIL_W  = 52;   // 아이콘 레일 너비
const PANEL_W = 200;  // 슬라이드 패널 너비

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [activeSection, setActiveSection] = useState<string | null>('main');
  const [userEmail,     setUserEmail    ] = useState('');
  const [myRole,        setMyRole       ] = useState('manager');
  const [expanded,      setExpanded     ] = useState<string | null>(null);
  const [mobileMenu,    setMobileMenu  ] = useState(false);
  const [feedbackOpen,  setFeedbackOpen] = useState(false);

  // breadcrumb 동적 이름
  const [breadcrumbProject, setBreadcrumbProject] = useState<string | null>(null);
  const [breadcrumbEpisode, setBreadcrumbEpisode] = useState<string | null>(null);

  useEffect(() => {
    const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
    if (!projectMatch) {
      setBreadcrumbProject(null);
      setBreadcrumbEpisode(null);
      return;
    }
    const projectId = projectMatch[1];
    if (projectId === 'new') { setBreadcrumbProject(null); setBreadcrumbEpisode(null); return; }

    getProjectById(projectId).then(p => setBreadcrumbProject(p?.title ?? null));

    const episodeMatch = pathname.match(/^\/projects\/[^/]+\/episodes\/([^/]+)/);
    if (episodeMatch) {
      const epId = episodeMatch[1];
      getProjectEpisodes(projectId).then(episodes => {
        const ep = episodes.find(e => e.id === epId);
        setBreadcrumbEpisode(ep ? `${ep.episodeNumber}편 ${ep.title}` : null);
      });
    } else {
      setBreadcrumbEpisode(null);
    }
  }, [pathname]);

  // fab:action → feedback 이벤트 리스닝
  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === 'feedback') setFeedbackOpen(true);
    };
    window.addEventListener('fab:action', handler);
    return () => window.removeEventListener('fab:action', handler);
  }, []);

  const panelOpen = activeSection !== null;
  const totalW    = RAIL_W + (panelOpen ? PANEL_W : 0);

  // 패널 상태를 CSS 변수로 노출 → 하위 페이지에서 maxWidth 조절에 사용
  useEffect(() => {
    document.documentElement.style.setProperty('--doc-max-w', panelOpen ? '960px' : '1200px');
  }, [panelOpen]);

  // 현재 경로에 맞는 섹션 자동 선택
  useEffect(() => {
    for (const sec of SECTIONS) {
      const links = sec.items.filter(isLink);
      const allHrefs = links.flatMap(i => [i.href, ...(i.sub ? i.sub.map(s => s.href) : [])]);
      if (allHrefs.some(h => pathname === h || pathname.startsWith(h + '/'))) {
        setActiveSection(sec.key);
        return;
      }
    }
    // 시스템 항목 경로면 섹션 패널 닫기
    if (SYSTEM_ITEMS.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))) {
      setActiveSection(null);
    }
    // 모바일 메뉴 자동 닫기
    setMobileMenu(false);
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      if (process.env.NODE_ENV === 'development') {
        setUserEmail('dev@local.com'); setMyRole('admin'); return;
      }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const stay    = localStorage.getItem('vm_stay_logged_in');
      const session = sessionStorage.getItem('vm_active_session');
      if (!stay && !session) { await supabase.auth.signOut(); router.push('/login'); return; }
      setUserEmail(user.email ?? '');
      getMyProfile().then(p => {
        if (p) {
          // 승인되지 않은 사용자 차단 (admin은 항상 허용)
          if (p.role !== 'admin' && p.approved !== true) {
            supabase.auth.signOut();
            router.push('/login');
            return;
          }
          setMyRole(p.role);
        }
      });
    };
    checkAuth();
  }, [router]);


  const handleLogout = async () => {
    localStorage.removeItem('vm_stay_logged_in');
    sessionStorage.removeItem('vm_active_session');
    await createClient().auth.signOut();
    window.location.href = '/login';
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '관';
  const currentSection = SECTIONS.find(s => s.key === activeSection) ?? null;

  return (
    <TutorialProvider>
    <div style={{ cursor: 'none', minHeight: '100vh', background: '#f5f4f2' }}>
      {/* 글로벌 검색 (Cmd+K / FAB로 열림, 버튼 UI는 숨기고 모달 리스너만 유지) */}
      <div style={{ position: 'fixed', width: 0, height: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ pointerEvents: 'auto' }}><GlobalSearch /></div>
      </div>
      {/* 커스텀 툴팁 + 모바일 반응형 CSS */}
      <style>{`
        [data-rail-tip] { position: relative; }
        [data-rail-tip]::after {
          content: attr(data-rail-tip);
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: #1c1917;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 100;
        }
        [data-rail-tip]:hover::after { opacity: 1; }
        @media (max-width: 768px) {
          .vm-rail, .vm-panel { display: none !important; }
          .vm-header { left: 0 !important; }
          .vm-main { margin-left: 0 !important; }
          .vm-hamburger { display: flex !important; }
        }
      `}</style>
      <CustomCursor />

      {/* ══════════════════════════════════════════
          아이콘 레일 — 항상 보이는 왼쪽 세로 바
      ══════════════════════════════════════════ */}
      <div
        className="vm-rail"
        style={{
          position:      'fixed',
          top:           0,
          left:          0,
          bottom:        0,
          width:         RAIL_W,
          zIndex:        50,
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          background:    '#1c1917',
          paddingTop:    '0',
          paddingBottom: '0',
        }}
      >
        {/* 로고 */}
        <Link
          href="/management"
          style={{
            width:          '100%',
            height:         '56px',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            textDecoration: 'none',
            borderBottom:   '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <img
            src="/logo-white.png"
            alt="VIMO"
            style={{
              width:  '28px',
              height: '28px',
              objectFit: 'contain',
            }}
          />
        </Link>

        {/* 섹션 아이콘들 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: '2px', width: '100%' }}>
          {SECTIONS.map(sec => {
            const Icon      = sec.icon;
            const isSel     = activeSection === sec.key;
            // 이 섹션에 활성 경로가 있는지
            const hasActive = sec.items.filter(isLink).some(i => {
              if (pathname === i.href || pathname.startsWith(i.href + '/')) return true;
              if (i.sub) return i.sub.some(s => pathname.startsWith(s.href));
              return false;
            });

            return (
              <button
                key={sec.key}
                onClick={() => setActiveSection(isSel ? null : sec.key)}
                data-rail-tip={sec.label}
                style={{
                  position:       'relative',
                  width:          '36px',
                  height:         '36px',
                  borderRadius:   '10px',
                  border:         'none',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                  background:     isSel ? 'rgba(234,88,12,0.18)' : 'transparent',
                  color:          isSel ? '#ea580c' : hasActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                  transition:     'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = hasActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'; } }}
              >
                <Icon size={19} />
                {/* 활성 경로 있으면 오렌지 점 */}
                {hasActive && !isSel && (
                  <span style={{ position: 'absolute', top: '5px', right: '5px', width: '5px', height: '5px', borderRadius: '50%', background: '#ea580c' }} />
                )}
              </button>
            );
          })}

          {/* 관리자 전용 */}
          {myRole === 'admin' && (
            <Link
              href="/settings/users"
              data-rail-tip="계정 관리"
              style={{
                position:       'relative',
                width:          '36px',
                height:         '36px',
                borderRadius:   '10px',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color:          'rgba(255,255,255,0.3)',
                transition:     'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
            >
              <Shield size={18} />
            </Link>
          )}
        </div>

        {/* 하단 — 시스템 + 로그아웃 + 유저 아바타 */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: '2px' }}>
          {/* 설정 / 휴지통 */}
          {SYSTEM_ITEMS.map(item => {
            const SysIcon = item.icon;
            const sysActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                data-rail-tip={item.label}
                style={{
                  position:       'relative',
                  width:          '36px',
                  height:         '36px',
                  borderRadius:   '10px',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  background:     sysActive ? 'rgba(234,88,12,0.18)' : 'transparent',
                  color:          sysActive ? '#ea580c' : 'rgba(255,255,255,0.35)',
                  transition:     'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!sysActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                onMouseLeave={e => { if (!sysActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; } }}
              >
                <SysIcon size={18} />
              </Link>
            );
          })}

          <div style={{ height: '4px' }} />

          <button
            onClick={handleLogout}
            data-rail-tip="로그아웃"
            style={{
              position:       'relative',
              width:          '36px',
              height:         '36px',
              borderRadius:   '10px',
              border:         'none',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'pointer',
              background:     'transparent',
              color:          'rgba(255,255,255,0.25)',
              transition:     'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}
          >
            <LogOut size={17} />
          </button>

          <div
            data-rail-tip={userEmail}
            style={{
              position:       'relative',
              width:          '30px',
              height:         '30px',
              borderRadius:   '9px',
              background:     '#ea580c',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '11px',
              fontWeight:     700,
              color:          '#fff',
              flexShrink:     0,
            }}
          >
            {userInitial}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          슬라이드 패널 — 섹션 선택 시 열림
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {panelOpen && currentSection && (
          <motion.div
            className="vm-panel"
            key={activeSection}
            initial={{ x: -PANEL_W, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -PANEL_W, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position:      'fixed',
              top:           0,
              left:          RAIL_W,
              bottom:        0,
              width:         PANEL_W,
              zIndex:        45,
              display:       'flex',
              flexDirection: 'column',
              background:    '#ffffff',
              borderRight:   '1px solid #ede9e6',
              boxShadow:     '4px 0 16px rgba(0,0,0,0.06)',
            }}
          >
            {/* 패널 헤더 */}
            <div
              style={{
                height:      '56px',
                flexShrink:  0,
                display:     'flex',
                alignItems:  'flex-end',
                padding:     '0 16px 12px',
                borderBottom:'1px solid #f0ece9',
              }}
            >
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ea580c', lineHeight: 1 }}>
                  {currentSection.label}
                </p>
              </div>
            </div>

            {/* 패널 네비게이션 */}
            <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
              {currentSection.items.map((item, idx) => {
                if (item.type === 'divider') {
                  return <div key={`div-${idx}`} style={{ height: '1px', background: '#f0ece9', margin: '6px 10px' }} />;
                }

                const Icon     = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/') ||
                  (item.sub?.some(s => pathname.startsWith(s.href)) ?? false);
                const hasSub   = !!item.sub?.length;
                const isExp    = expanded === item.href;

                return (
                  <div key={item.href}>
                    {hasSub ? (
                      <button
                        onClick={() => setExpanded(isExp ? null : item.href)}
                        style={{
                          width:          '100%',
                          display:        'flex',
                          alignItems:     'center',
                          gap:            '9px',
                          padding:        '8px 10px',
                          borderRadius:   '9px',
                          border:         'none',
                          cursor:         'pointer',
                          marginBottom:   '1px',
                          transition:     'background 0.12s, color 0.12s',
                          background:     isActive ? '#ea580c' : 'transparent',
                          color:          isActive ? '#ffffff' : '#44403c',
                        }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#f5f3f1'; } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; } }}
                      >
                        <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
                        <span style={{ fontSize: '15px', fontWeight: isActive ? 600 : 400, flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{item.label}</span>
                        {item.badge && <PanelBadge label={item.badge} active={isActive} />}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.4, transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }}>
                          <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        style={{
                          display:        'flex',
                          alignItems:     'center',
                          gap:            '9px',
                          padding:        '8px 10px',
                          borderRadius:   '9px',
                          textDecoration: 'none',
                          marginBottom:   '1px',
                          transition:     'background 0.12s, color 0.12s',
                          background:     isActive ? '#ea580c' : 'transparent',
                          color:          isActive ? '#ffffff' : '#44403c',
                        }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#f5f3f1'; } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; } }}
                      >
                        <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
                        <span style={{ fontSize: '15px', fontWeight: isActive ? 600 : 400, flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                        {item.badge && <PanelBadge label={item.badge} active={isActive} />}
                      </Link>
                    )}

                    {/* 서브메뉴 */}
                    <AnimatePresence initial={false}>
                      {hasSub && isExp && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ paddingLeft: '10px', paddingBottom: '2px' }}>
                            {item.sub!.map((s: SubLink) => {
                              const SubIcon   = s.icon;
                              const subActive = pathname.startsWith(s.href);
                              return (
                                <Link
                                  key={s.href}
                                  href={s.href}
                                  style={{
                                    display:        'flex',
                                    alignItems:     'center',
                                    gap:            '8px',
                                    padding:        '7px 10px',
                                    borderRadius:   '8px',
                                    background:     subActive ? '#fef4ed' : 'transparent',
                                    color:          subActive ? '#ea580c' : '#78716c',
                                    textDecoration: 'none',
                                    fontSize:       '14px',
                                    fontWeight:     subActive ? 600 : 400,
                                    marginBottom:   '1px',
                                    transition:     'background 0.12s, color 0.12s',
                                  }}
                                  onMouseEnter={e => { if (!subActive) { e.currentTarget.style.background = '#f5f3f1'; e.currentTarget.style.color = '#44403c'; } }}
                                  onMouseLeave={e => { if (!subActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#78716c'; } }}
                                >
                                  <SubIcon size={14} style={{ flexShrink: 0, opacity: subActive ? 1 : 0.6 }} />
                                  <span style={{ whiteSpace: 'nowrap' }}>{s.label}</span>
                                  {s.badge && <PanelBadge label={s.badge} active={false} />}
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            {/* 패널 하단 — 브랜드 워드마크 */}
            <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid #f0ece9' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#d6cec8', letterSpacing: '0.1em' }}>VIMO ERP <span style={{ fontWeight: 500, color: '#e0d9d3' }}>v0.1.1</span></p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          상단 헤더
      ══════════════════════════════════════════ */}
      <header
        className="vm-header"
        style={{
          position:    'fixed',
          top:         0,
          left:        totalW,
          right:       0,
          height:      '56px',
          zIndex:      30,
          display:     'flex',
          alignItems:  'center',
          padding:     '0 24px',
          gap:         '12px',
          background:  '#ffffff',
          borderBottom:'1px solid #ede9e6',
          transition:  'left 0.2s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* 모바일 햄버거 */}
        <button
          className="vm-hamburger"
          onClick={() => setMobileMenu(v => !v)}
          style={{
            display:    'none',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      '#44403c',
            padding:    '4px',
          }}
        >
          <Menu size={20} />
        </button>

        {(() => {
          // 시스템 항목 체크
          const sysItem = SYSTEM_ITEMS.find(i => pathname === i.href || pathname.startsWith(i.href + '/'));
          if (sysItem) {
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <span style={{ color: '#a8a29e', fontWeight: 500 }}>시스템</span>
                <span style={{ color: '#d6cec8' }}>/</span>
                <span style={{ fontWeight: 600, color: '#1c1917' }}>{sysItem.label}</span>
              </div>
            );
          }
          // 일반 섹션 체크
          for (const sec of SECTIONS) {
            const links = sec.items.filter(isLink);
            for (const link of links) {
              const allHrefs = [{ href: link.href, label: link.label }, ...(link.sub ?? [])];
              const found = allHrefs.find(h => pathname === h.href || pathname.startsWith(h.href + '/'));
              if (found) {
                const isProjectSubpage = found.label === '프로젝트' && pathname !== '/projects';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                    <button
                      onClick={() => setActiveSection(activeSection === sec.key ? null : sec.key)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: '#a8a29e', fontWeight: 500, fontSize: '14px',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ea580c'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#a8a29e'; }}
                    >
                      {sec.label}
                    </button>
                    <span style={{ color: '#d6cec8' }}>/</span>
                    {isProjectSubpage ? (
                      <Link href="/projects" style={{ color: '#a8a29e', fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ea580c'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#a8a29e'; }}
                      >
                        {found.label}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 600, color: '#1c1917' }}>{found.label}</span>
                    )}
                    {isProjectSubpage && breadcrumbProject && !breadcrumbEpisode && (
                      <>
                        <span style={{ color: '#d6cec8' }}>/</span>
                        <span style={{ fontWeight: 600, color: '#1c1917' }}>{breadcrumbProject}</span>
                      </>
                    )}
                    {isProjectSubpage && breadcrumbEpisode && (
                      <>
                        <span style={{ color: '#d6cec8' }}>/</span>
                        {breadcrumbProject && (
                          <Link href={`/projects/${pathname.match(/^\/projects\/([^/]+)/)?.[1]}`} style={{ color: '#a8a29e', fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ea580c'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#a8a29e'; }}
                          >
                            {breadcrumbProject}
                          </Link>
                        )}
                        <span style={{ color: '#d6cec8' }}>/</span>
                        <span style={{ fontWeight: 600, color: '#1c1917' }}>{breadcrumbEpisode}</span>
                      </>
                    )}
                  </div>
                );
              }
            }
          }
          return null;
        })()}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NotificationDropdown />
        </div>
      </header>

      {/* ══════════════════════════════════════════
          모바일 오버레이 메뉴
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position:   'fixed',
              inset:      0,
              zIndex:     60,
              background: '#ffffff',
              overflowY:  'auto',
              padding:    '0',
            }}
          >
            {/* 닫기 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f0ece9' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#1c1917' }}>메뉴</span>
              <button onClick={() => setMobileMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716c', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* 섹션들 */}
            <div style={{ padding: '12px 16px' }}>
              {SECTIONS.map(sec => (
                <div key={sec.key} style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.08em', padding: '4px 8px', textTransform: 'uppercase' }}>{sec.label}</p>
                  {sec.items.filter(isLink).map(item => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 8px', borderRadius: '10px', textDecoration: 'none',
                          background: active ? '#ea580c' : 'transparent',
                          color: active ? '#fff' : '#44403c',
                          fontSize: '14px', fontWeight: active ? 600 : 400,
                          marginBottom: '2px',
                        }}
                      >
                        <Icon size={16} style={{ opacity: active ? 1 : 0.5 }} />
                        <span>{item.label}</span>
                        {item.badge && <PanelBadge label={item.badge} active={active} />}
                      </Link>
                    );
                  })}
                </div>
              ))}

              {/* 시스템 */}
              <div style={{ borderTop: '1px solid #f0ece9', paddingTop: '12px', marginTop: '4px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#a8a29e', letterSpacing: '0.08em', padding: '4px 8px', textTransform: 'uppercase' }}>시스템</p>
                {SYSTEM_ITEMS.map(item => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 8px', borderRadius: '10px', textDecoration: 'none',
                        background: active ? '#ea580c' : 'transparent',
                        color: active ? '#fff' : '#44403c',
                        fontSize: '14px', fontWeight: active ? 600 : 400,
                        marginBottom: '2px',
                      }}
                    >
                      <Icon size={16} style={{ opacity: active ? 1 : 0.5 }} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* 로그아웃 */}
              <div style={{ borderTop: '1px solid #f0ece9', paddingTop: '12px', marginTop: '12px' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 8px', borderRadius: '10px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ef4444', fontSize: '14px', fontWeight: 500, width: '100%',
                  }}
                >
                  <LogOut size={16} />
                  <span>로그아웃</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          메인 컨텐츠
      ══════════════════════════════════════════ */}
      <main
        className="vm-main"
        style={{
          marginLeft: totalW,
          marginTop:  '56px',
          minHeight:  'calc(100vh - 56px)',
          transition: 'margin-left 0.2s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <DashboardContent>{children}</DashboardContent>
        </div>
      </main>
      <GlobalFAB />
      <TutorialOverlay />
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
    </TutorialProvider>
  );
}

function PanelBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      fontSize:    '10px',
      fontWeight:  600,
      padding:     '2px 7px',
      borderRadius:'999px',
      whiteSpace:  'nowrap',
      flexShrink:  0,
      background:  active ? 'rgba(255,255,255,0.25)' : '#fef4ed',
      color:       active ? '#ffffff' : '#ea580c',
    }}>
      {label}
    </span>
  );
}
