import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { contentDir } from "./content";

const run = promisify(execFile);

/**
 * git が真実である以上、sidecar を書いただけでは公開されない。
 * ツールが「完了」と言い、実際にはサイトに出ていない状態を作らないために、
 * 未コミットの変更をそのまま見せる（docs/gallery-architecture.md §1）。
 */
export interface PublishStatus {
  /** 未コミットのファイル。空ならサイトと一致している。 */
  pending: string[];
  /** git が使えない場合は判定不能として扱う。 */
  available: boolean;
}

export async function publishStatus(): Promise<PublishStatus> {
  try {
    const { stdout } = await run("git", ["status", "--porcelain", "--", contentDir()]);
    const pending = stdout
      .split("\n")
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
    return { pending, available: true };
  } catch {
    return { pending: [], available: false };
  }
}
