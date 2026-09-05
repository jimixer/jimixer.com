import { CAPTURED_AT_PATTERN } from "@jimixer/gallery-schema";

/**
 * 撮影日時は必須である。ファイル名から取れないときは人間に入力させる
 * （ファイルの更新日時は移動やコピーで変わるため、黙って使わない）。
 */

/** 例: VRChat_2026-03-15_04-14-08.830_1080x1920.png */
const VRCHAT_FILENAME = /VRChat_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/;

export function capturedAtFromFilename(fileName: string): string | null {
  const m = fileName.match(VRCHAT_FILENAME);
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}` : null;
}

/**
 * 形式と実在の両方を見る。`Date.parse` は 2026-02-30 を 3 月 2 日へ丸めて
 * 通してしまうため、UTC として往復させて一致を確かめる。
 */
export function isValidCapturedAt(value: string): boolean {
  if (!CAPTURED_AT_PATTERN.test(value)) return false;

  const parsed = new Date(`${value}Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 19) === value;
}
