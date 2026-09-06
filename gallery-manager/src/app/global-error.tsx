"use client";

import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  /** Next が渡すが、ここでは使わない。理由は下のコメント。 */
  reset: () => void;
}

/**
 * ルートレイアウト自体が落ちたときの最後の受け皿。
 *
 * global-error はルートレイアウトを置き換えるので、layout.tsx が読む
 * globals.css は当たらない。ここで自分で読み込み、html と body も自分で書く。
 * 万一その CSS すら届かない場合に備えて、素の HTML でも読める構造にしてある。
 *
 * 復帰は reset ではなく再読み込みにしている。ここに来た時点でレイアウトを
 * 含む木ごと壊れており、境界を解除しても同じ状態を描き直すだけになるため。
 */
export default function GlobalError({ error }: GlobalErrorProps) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gallery Manager を表示できませんでした
          </h1>

          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 font-mono text-sm text-red-800 dark:text-red-200">
            {error.message}
          </pre>

          {error.digest && (
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
              digest: {error.digest}
            </p>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-300">
            詳しい内容は dev サーバのターミナルに出ています。
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            再読み込み
          </button>
        </main>
      </body>
    </html>
  );
}
