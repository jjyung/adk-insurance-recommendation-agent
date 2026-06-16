'use client';

import { useEffect, useState } from 'react';
import { AdkWorkbench } from '../components/adk-workbench';
import { UserMode } from '../components/user-mode/UserMode';
import { type AppMode } from '../components/ModeSwitch';

const STORAGE_KEY = 'app-mode';

export default function Page() {
  const [mode, setMode] = useState<AppMode>('dev');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dev' || stored === 'user') setMode(stored);
  }, []);

  const switchMode = (next: AppMode) => {
    setMode(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  if (mode === 'dev') {
    return <AdkWorkbench mode={mode} onSwitchMode={switchMode} />;
  }

  return <UserMode mode={mode} onSwitchMode={switchMode} />;
}
