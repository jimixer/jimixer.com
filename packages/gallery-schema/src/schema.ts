import { z } from "zod";

/**
 * ディスク上のファイル形状を定義する。
 *
 * ドメイン型（`types.ts`）とは別物である。ファイルには識別子を書かず、
 * アバター ID とバリアント ID は配置（ファイル名・ディレクトリ名）から与える。
 * 例外は写真の `id` で、これは URL の導出元であり配置から独立していなければ
 * ならないため、ファイル本体に持つ（docs/adr/0002 を参照）。
 */

/** アバター ID とバリアント ID。URL に現れるため人間が読める形に限る。 */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** 写真 ID。不透明であることが要件なので、意味を持つ文字列を弾く。 */
export const PHOTO_ID_PATTERN = /^[0-9a-z]{10}$/;

/** ローカル時刻の ISO8601。タイムゾーンは持たない（撮影地は常に同一のため）。 */
export const CAPTURED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

const slug = z.string().regex(SLUG_PATTERN, "英小文字・数字・ハイフンのみ使用できます");

export const avatarFileSchema = z
  .object({
    displayName: z.string().min(1),
    author: z.string().min(1),
    sourceUrl: z.string().url(),
  })
  .strict();

export const variantFileSchema = z
  .object({
    avatar: slug,
    displayName: z.string().min(1),
    coverPhotoId: z.string().regex(PHOTO_ID_PATTERN),
  })
  .strict();

export const photoFileSchema = z
  .object({
    id: z.string().regex(PHOTO_ID_PATTERN),
    capturedAt: z
      .string()
      .regex(CAPTURED_AT_PATTERN, "YYYY-MM-DDTHH:mm:ss 形式で指定してください"),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    caption: z.string().min(1).optional(),
    dominantColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/, "#rrggbb 形式で指定してください")
      .optional(),
  })
  .strict();

export type AvatarFile = z.infer<typeof avatarFileSchema>;
export type VariantFile = z.infer<typeof variantFileSchema>;
export type PhotoFile = z.infer<typeof photoFileSchema>;

/** 検証エラーを 1 行にまとめる。どのファイルのどのフィールドかを読めるようにする。 */
export function formatIssues(where: string, error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${where}: ${path} — ${issue.message}` : `${where}: ${issue.message}`;
  });
}
