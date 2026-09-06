"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * ページ描画中の例外の受け皿。
 *
 * これが無いと Next の GlobalError まで落ち、ルートレイアウトごと差し替わった
 * 英語の白画面になる。このツールは全ページが loadGallery を通るので、
 * sidecar を 1 行書き損じただけでその状態になっていた。
 *
 * GalleryContentError は message に不正な箇所の一覧を改行区切りで持つ。
 * 検証モジュールは node 専用でクライアントに持ち込めないため型では判別せず、
 * 改行を保ったまま出して読ませる。
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * サーバ側で落ちた場合、reset だけでは手元の RSC ペイロードを描き直すだけで
   * 同じエラーに戻る。sidecar を直してから押すのが前提なので、読み直してから
   * 境界を解除する。
   */
  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        表示できませんでした
      </h2>

      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 font-mono text-sm text-red-800 dark:text-red-200">
        {error.message}
      </pre>

      {error.digest && (
        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
          digest: {error.digest}
        </p>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-300">
        同じ内容が dev サーバのターミナルにも出ています。sidecar を直したら再試行
        してください。
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          再試行
        </button>
        <Link
          href="/"
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          一覧へ戻る
        </Link>
      </div>
    </div>
  );
}
