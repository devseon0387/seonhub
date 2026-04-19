'use client';

import type { TutorialContextValue } from './TutorialProvider';

export function useTutorial(): TutorialContextValue {
  return {
    isActive: false,
    currentStepIndex: 0,
    steps: [],
    pageKey: null,
    startTutorial: () => {},
    nextStep: () => {},
    prevStep: () => {},
    skip: () => {},
  };
}
