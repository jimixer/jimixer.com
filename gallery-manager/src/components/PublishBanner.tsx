import { publishStatus } from "@/lib/publish-status";

/**
 * git が真実である以上、写真を追加しただけではサイトに出ない。
 * 「アップロード成功」と「公開済み」を取り違えないための表示。
 */
export async function PublishBanner() {
  const { pending, available } = await publishStatus();

  if (!available) return null;
  if (pending.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
        未公開の変更はありません。
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
        未公開の変更が {pending.length} 件あります
      </p>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
        画像は S3 に上がっていますが、サイトに反映するには commit と push が必要です。
      </p>
      <ul className="mt-2 space-y-0.5 font-mono text-xs text-amber-800 dark:text-amber-300">
        {pending.slice(0, 10).map((file) => (
          <li key={file}>{file}</li>
        ))}
        {pending.length > 10 && <li>… 他 {pending.length - 10} 件</li>}
      </ul>
    </div>
  );
}
