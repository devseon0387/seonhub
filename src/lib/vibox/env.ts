import "server-only";

/**
 * Vibox 통합 환경변수.
 *
 * .env.local:
 *   VIBOX_API_URL    = http://localhost:4200 (개발) / https://vibox.cloud (운영)
 *   VIBOX_PUBLIC_URL = 위와 동일 (공유 링크 base)
 *   VIBOX_API_TOKEN  = vbx_... (Vibox /admin/keys에서 발급, scope: notes:read,notes:write)
 *
 * 인증: vbx_ bearer token. SSO/JWT 흐름 폐기 (단순화 2026-05-02).
 */
export const VIBOX_ENV = {
  apiUrl: (process.env.VIBOX_API_URL ?? "http://localhost:4200").replace(/\/$/, ""),
  publicUrl: (process.env.VIBOX_PUBLIC_URL ?? "http://localhost:4200").replace(/\/$/, ""),
  apiToken: process.env.VIBOX_API_TOKEN ?? "",
} as const;

let warned = false;
export function assertViboxEnv(): void {
  if (!VIBOX_ENV.apiToken) {
    if (!warned) {
      console.warn(
        "[vibox] VIBOX_API_TOKEN 미설정 — vibox.cloud/admin/keys에서 발급 후 .env.local 추가",
      );
      warned = true;
    }
    throw new Error("VIBOX_API_TOKEN missing");
  }
}
