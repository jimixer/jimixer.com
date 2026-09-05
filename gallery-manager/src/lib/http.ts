import { NextResponse } from "next/server";

/** 失敗の理由をそのまま返す。握り潰すと原因が UI から見えなくなる。 */
export function fail(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function failFrom(error: unknown, status = 500): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  return NextResponse.json({ error: message }, { status });
}
