'use client';

import { useContext } from 'react';
import { TutorialContext, TutorialContextValue } from './TutorialProvider';

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
