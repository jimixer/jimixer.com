import type { OriginalExtension, Photo } from "@jimixer/gallery-schema";
import {
  ORIGINAL_EXTENSIONS,
  originalKey,
  originalPrefix,
  photoKey,
} from "@jimixer/gallery-schema";
import { deletePhoto as removeSidecar, newPhotoId, writePhoto } from "@jimixer/gallery-schema/content";
import { ALL_DERIVATIVES, measureOriginal, renderDerivative } from "@jimixer/gallery-schema/images";

import { isValidCapturedAt } from "./captured-at";
import { contentDir } from "./content";
import { deleteDerivatives, hasOriginal, putDerivative, putOriginal } from "./s3";

const CONTENT_TYPES: Record<OriginalExtension, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export interface AddPhotoInput {
  variantId: string;
  /** ISO8601 のローカル時刻。呼び出し側が必ず決めてから渡す。 */
  capturedAt: string;
  fileName: string;
  body: Buffer;
}

function extensionOf(fileName: string): OriginalExtension {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const known = ORIGINAL_EXTENSIONS.find((e) => e === ext);
  if (!known) {
    throw new Error(`対応していない形式です: ${fileName}`);
  }
  return known;
}

/**
 * 写真 1 枚を追加する。
 *
 * 順序が契約そのものである。
 *   1. 撮影日時が決まっていること（決まらない写真は存在させない）
 *   2. 原本の保管が成功すること。失敗したら以降を実行しない（docs/adr/0003）
 *   3. 派生物を生成して公開する
 *   4. 最後に sidecar を書く
 *
 * 4 を最後にすることで、途中で落ちた写真は「未登録」に倒れる。S3 に孤児が
 * 残ることはあるが、原本があるので作り直せるし、整合性チェックで検出できる。
 */
export async function addPhoto(input: AddPhotoInput): Promise<Photo> {
  if (!isValidCapturedAt(input.capturedAt)) {
    throw new Error(`撮影日時が不正です: ${input.capturedAt}`);
  }

  const ext = extensionOf(input.fileName);
  const measured = await measureOriginal(input.body);
  const id = newPhotoId();

  await putOriginal(originalKey(id, ext), input.body, CONTENT_TYPES[ext]);

  // OG も含めて全種類を作る。どの写真もカバーになりうる
  for (const name of ALL_DERIVATIVES) {
    await putDerivative(photoKey(id, name), await renderDerivative(input.body, name));
  }

  const photo: Photo = {
    id,
    variantId: input.variantId,
    capturedAt: input.capturedAt,
    ...measured,
  };
  await writePhoto(contentDir(), photo);
  return photo;
}

/**
 * 写真をサイトから降ろす。sidecar と派生物を消し、**原本は残す**。
 * 「サイトから降ろす」と「原本を捨てる」は別の操作である（docs/adr/0003）。
 */
export async function removePhoto(photo: Photo): Promise<void> {
  await removeSidecar(contentDir(), photo);
  await deleteDerivatives(ALL_DERIVATIVES.map((name) => photoKey(photo.id, name)));
}

/** 原本が揃っているかを確かめる。公開前の事前条件の検査に使う。 */
export function originalIsStored(photoId: string): Promise<boolean> {
  return hasOriginal(originalPrefix(photoId));
}
