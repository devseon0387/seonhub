'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FolderOpen, Settings, Briefcase, Trash2, Megaphone, LogOut, Menu, X, ClipboardCheck, ChevronDown, Building2, Wallet, Receipt, FileText, Target } from 'lucide-react';
import DashboardContent from '@/components/DashboardContent';
import NavItem from '@/components/NavItem';
import GlobalSearch from '@/components/GlobalSearch';
import NotificationDropdown from '@/components/NotificationDropdown';
import CustomCursor from '@/components/CustomCursor';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const isCustomerActive = pathname.startsWith('/partners') || pathname.startsWith('/clients');
  const [isCustomerOpen, setIsCustomerOpen] = useState(isCustomerActive);
  const isOperationsActive = pathname.startsWith('/finance') || pathname.startsWith('/settlement') || pathname.startsWith('/contract') || pathname.startsWith('/strategy');
  const [isOperationsOpen, setIsOperationsOpen] = useState(isOperationsActive);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUserEmail(user.email ?? '');
      }
    };
    checkAuth();
  }, [router]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            router.push('/dashboard');
            break;
          case '2':
            e.preventDefault();
            router.push('/management');
            break;
          case '3':
            e.preventDefault();
            router.push('/projects');
            break;
          case '4':
            e.preventDefault();
            router.push('/marketing');
            break;
          case '5':
            e.preventDefault();
            router.push('/partners');
            break;
          case '6':
            e.preventDefault();
            router.push('/clients');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // 사용자 이니셜 (이메일 첫 글자)
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '관';

  return (
    <div className="flex h-screen bg-gray-50 cursor-none">
      <CustomCursor />
      {/* 모바일 햄버거 메뉴 버튼 */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="메뉴 열기"
      >
        <Menu size={24} className="text-gray-700" />
      </button>

      {/* 모바일 오버레이 */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside className={`
        w-64 bg-white border-r border-gray-200
        fixed lg:static inset-y-0 left-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full overflow-visible">
          {/* 로고 */}
          <div className="p-6 border-b border-gray-200 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">VIDEO MOMENT</h1>
              <p className="text-sm text-gray-500 mt-1">관리자 대시보드</p>
            </div>
            {/* 모바일 닫기 버튼 */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="메뉴 닫기"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* 검색 & 알림 */}
          <div className="p-4 border-b border-gray-200 overflow-visible">
            <div className="flex items-center gap-2 overflow-visible">
              <div className="flex-1">
                <GlobalSearch />
              </div>
              <NotificationDropdown />
            </div>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem href="/dashboard" icon={<LayoutDashboard size={20} />} onClick={() => setIsMobileMenuOpen(false)}>
              대시보드
            </NavItem>
            <NavItem href="/management" icon={<ClipboardCheck size={20} />} onClick={() => setIsMobileMenuOpen(false)}>
              매니지먼트
            </NavItem>
            <NavItem href="/projects" icon={<FolderOpen size={20} />} onClick={() => setIsMobileMenuOpen(false)}>
              프로젝트
            </NavItem>
            <div className="h-px bg-gray-100 mx-2 my-1" />
            <NavItem href="/marketing" icon={<Megaphone size={20} />} onClick={() => setIsMobileMenuOpen(false)}>
              <div className="flex items-center gap-2">
                <span>마케팅</span>
                <span className="text-xs text-gray-400">(준비 중)</span>
              </div>
            </NavItem>
            {/* 고객 관리 그룹 */}
            <div>
              <button
                onClick={() => setIsCustomerOpen(o => !o)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isCustomerActive ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Users size={20} />
                  <span className="font-medium">고객 관리</span>
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isCustomerOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isCustomerOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1 pb-1">
                      <Link
                        href="/partners"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                          pathname.startsWith('/partners') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Users size={17} />
                        <span className="font-medium text-sm">파트너</span>
                      </Link>
                      <Link
                        href="/clients"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                          pathname.startsWith('/clients') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Briefcase size={17} />
                        <span className="font-medium text-sm">클라이언트</span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-px bg-gray-100 mx-2 my-1" />
            {/* 경영·운영 그룹 */}
            <div>
              <button
                onClick={() => setIsOperationsOpen(o => !o)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isOperationsActive ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Building2 size={20} />
                  <span className="font-medium">경영·운영</span>
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isOperationsOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOperationsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1 pb-1">
                      <Link
                        href="/finance"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                          pathname.startsWith('/finance') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Wallet size={17} />
                        <span className="font-medium text-sm">재무</span>
                      </Link>
                      <Link
                        href="/settlement"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                          pathname.startsWith('/settlement') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Receipt size={17} />
                        <span className="font-medium text-sm">정산</span>
                      </Link>
                      <Link
                        href="/contract"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                          pathname.startsWith('/contract') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <FileText size={17} />
                        <span className="font-medium text-sm">계약</span>
                        <span className="text-xs text-gray-400">(준비 중)</span>
                      </Link>
                      <Link
                        href="/strategy"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                          pathname.startsWith('/strategy') ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Target size={17} />
                        <span className="font-medium text-sm">전략</span>
                        <span className="text-xs text-gray-400">(준비 중)</span>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-px bg-gray-100 mx-2 my-1" />
            <NavItem href="/trash" icon={<Trash2 size={20} />} onClick={() => setIsMobileMenuOpen(false)}>
              휴지통
            </NavItem>
            <NavItem href="/settings" icon={<Settings size={20} />} onClick={() => setIsMobileMenuOpen(false)}>
              설정
            </NavItem>
          </nav>

          {/* 사용자 정보 */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {userInitial}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">관리자</p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">{userEmail}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-auto w-full lg:w-auto">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
          <DashboardContent>{children}</DashboardContent>
        </div>
      </main>
    </div>
  );
}
