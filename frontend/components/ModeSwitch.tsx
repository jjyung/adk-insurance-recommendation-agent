'use client';

export type AppMode = 'dev' | 'user';

export interface ModeSwitchProps {
  mode: AppMode;
  onSwitch: (next: AppMode) => void;
  /** 'floating' = position:fixed 在右上角（給 Dev Mode 用）；'inline' = 跟著 container 流動（User Mode 自己擺進 topbar） */
  variant?: 'floating' | 'inline';
}

export function ModeSwitch({
  mode,
  onSwitch,
  variant = 'floating',
}: ModeSwitchProps) {
  const className =
    variant === 'floating'
      ? 'mode-switch mode-switch--floating'
      : 'mode-switch mode-switch--inline';
  return (
    <div className={className} role='group' aria-label='切換顯示模式'>
      <button
        type='button'
        className={`mode-switch__btn ${mode === 'dev' ? 'is-active' : ''}`}
        onClick={() => onSwitch('dev')}
        aria-pressed={mode === 'dev'}
      >
        開發
      </button>
      <button
        type='button'
        className={`mode-switch__btn ${mode === 'user' ? 'is-active' : ''}`}
        onClick={() => onSwitch('user')}
        aria-pressed={mode === 'user'}
      >
        使用者
      </button>
    </div>
  );
}
