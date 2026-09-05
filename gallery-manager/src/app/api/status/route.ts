import { NextResponse } from "next/server";

import { publishStatus } from "@/lib/publish-status";

/** 未公開の変更。sidecar を書いただけでは公開されないことを可視化する。 */
export async function GET() {
  return NextResponse.json(await publishStatus());
}
