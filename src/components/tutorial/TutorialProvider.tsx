'use client';

import { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { TUTORIAL_STEPS, TutorialPageKey, TutorialStep } from './tutorialSteps';

export interface TutorialContextValue {
  isActive: boolean;
  currentStepIndex: number;
  steps: TutorialStep[];
  pageKey: TutorialPageKey | null;
  startTutorial: (pageKey: TutorialPageKey) => void;
  nextStep: () => void;
  prevStep: () => void;
  skip: () => void;
}

export const TutorialContext = createContext<TutorialContextValue | null>(null);

const STORAGE_PREFIX = 'vm_tutorial_';

function getPageKey(pathname: string): TutorialPageKey | null {
  if (pathname === '/management' || pathname === '/') return 'management';
  if (pathname === '/projects') return 'projects';
  if (pathname === '/clients') return 'clients';
  if (pathname === '/partners') return 'partners';
  // /projects/[id]/episodes/[episodeId] — episodeDetail (must check before projectDetail)
  if (/^\/projects\/[^/]+\/episodes\/[^/]+$/.test(pathname)) return 'episodeDetail';
  // /projects/[id] — projectDetail
  if (/^\/projects\/[^/]+$/.test(pathname)) return 'projectDetail';
  return null;
}

export default function TutorialProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [pageKey, setPageKey] = useState<TutorialPageKey | null>(null);
  const autoStartedRef = useRef<Set<string>>(new Set());

  const steps = pageKey ? TUTORIAL_STEPS[pageKey] : [];

  const startTutorial = useCallback((key: TutorialPageKey) => {
    setPageKey(key);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const completeTutorial = useCallback(() => {
    if (pageKey) {
      localStorage.setItem(STORAGE_PREFIX + pageKey, 'done');
    }
    setIsActive(false);
    setCurrentStepIndex(0);
    setPageKey(null);
  }, [pageKey]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(i => i + 1);
    } else {
      completeTutorial();
    }
  }, [currentStepIndex, steps.length, completeTutorial]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
    }
  }, [currentStepIndex]);

  const skip = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  // 첫 방문 시 자동 시작 (800ms 딜레이)
  useEffect(() => {
    const key = getPageKey(pathname);
    if (!key) return;
    if (autoStartedRef.current.has(key)) return;

    const done = localStorage.getItem(STORAGE_PREFIX + key);
    if (done) return;

    autoStartedRef.current.add(key);
    const timer = setTimeout(() => {
      startTutorial(key);
    }, 800);
    return () => clearTimeout(timer);
  }, [pathname, startTutorial]);

  // FAB "replay-tutorial" 이벤트 리스닝
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'replay-tutorial') {
        const key = getPageKey(pathname);
        if (key) {
          localStorage.removeItem(STORAGE_PREFIX + key);
          startTutorial(key);
        }
      }
    };
    window.addEventListener('fab:action', handler);
    return () => window.removeEventListener('fab:action', handler);
  }, [pathname, startTutorial]);

  // 페이지 이동 시 활성 튜토리얼 종료
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (isActive) {
        setIsActive(false);
        setCurrentStepIndex(0);
        setPageKey(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <TutorialContext.Provider
      value={{ isActive, currentStepIndex, steps, pageKey, startTutorial, nextStep, prevStep, skip }}
    >
      {children}
    </TutorialContext.Provider>
  );
}
