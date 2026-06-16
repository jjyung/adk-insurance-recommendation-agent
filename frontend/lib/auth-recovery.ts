import { signOut } from 'next-auth/react';

/** 後端回的「token 失效」狀態碼。 */
export function isUnauthorized(status: number): boolean {
  return status === 401;
}

// 多個請求同時拿到 401 時，只觸發一次登出，避免重複導頁。
let reauthTriggered = false;

/**
 * 後端拒絕 token（401 Could not validate credentials）時呼叫：
 * next-auth 沒有 refresh，session(cookie) 又活得比後端 JWT 久，token 一旦過期 / 失效，
 * UI 仍以為你登入著、每個請求都會 401。這裡主動清掉過期的 session 並導回登入頁，
 * 把原本「看到一串看不懂的 JSON」的死胡同變成可自動恢復的流程。
 */
export function handleAuthExpired(): void {
  if (reauthTriggered) return;
  reauthTriggered = true;
  signOut({ callbackUrl: '/login?reason=expired' });
}
