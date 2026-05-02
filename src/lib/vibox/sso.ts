import "server-only";

/**
 * @deprecated 2026-05-02 — vibox 통합이 SSO/long-lived JWT 흐름에서
 * vbx_ bearer token 흐름으로 단순화됨. 이 파일은 호환성 stub만 유지.
 *
 * 실제 인증은 lib/vibox/client.ts 가 VIBOX_API_TOKEN 직접 사용.
 */

export async function getViboxAuth(): Promise<{ innerToken: string; cookieJar: string | null }> {
  throw new Error("getViboxAuth deprecated — use vbx_ token via VIBOX_API_TOKEN env");
}

export function invalidateViboxAuth(): void {
  /* no-op */
}
