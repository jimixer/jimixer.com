import { isValidCapturedAt } from "./captured-at";

export interface UploadEntry {
  fileName: string;
  capturedAt: string;
  body: Buffer;
}

/**
 * multipart から写真と撮影日時の組を取り出す。
 *
 * `file` と `capturedAt` は同じ順序で並ぶ前提。撮影日時はクライアントが
 * ファイル名から埋めるか人間が入力しており、ここでは値の妥当性だけを見る。
 * 1 件でも不正なら、1 枚も処理せずに落とす。
 */
export async function readUploads(form: FormData): Promise<UploadEntry[]> {
  const files = form.getAll("file").filter((value): value is File => value instanceof File);
  const capturedAts = form.getAll("capturedAt").map(String);

  const entries: UploadEntry[] = [];
  for (const [index, file] of files.entries()) {
    const capturedAt = capturedAts[index] ?? "";
    if (!isValidCapturedAt(capturedAt)) {
      throw new Error(`${file.name}: 撮影日時が未入力または不正です`);
    }
    entries.push({
      fileName: file.name,
      capturedAt,
      body: Buffer.from(await file.arrayBuffer()),
    });
  }
  return entries;
}
