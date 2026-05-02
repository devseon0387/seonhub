import { NextResponse } from "next/server";
import { listFiles } from "@/lib/vibox/client";
import { ViboxError } from "@/lib/vibox/types";

/**
 * GET /api/notes/files
 *
 * Vibox /api/integration/files proxy. NoteSidebar 가 호출해 폴더 트리 데이터.
 *
 * Query: path (default /notes), recursive=true|false, includeMeta=true|false
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") ?? "/notes";
  const recursive = searchParams.get("recursive") === "true";
  const includeMeta = searchParams.get("includeMeta") === "true";

  try {
    const data = await listFiles({ path, recursive, includeMeta });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ViboxError) {
      return NextResponse.json(
        { error: e.code, message: e.message, status: e.status },
        { status: e.status === 404 ? 404 : 502 },
      );
    }
    return NextResponse.json(
      { error: "internal", message: (e as Error).message ?? "unknown" },
      { status: 502 },
    );
  }
}
