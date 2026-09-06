import Link from "next/link";

/**
 * Next 内蔵の 404 の置き換え。
 *
 * 既定のままだとルートレイアウトの内側に英語の 100vh ブロックが出て、
 * ヘッダーだけ日本語という継ぎ接ぎになる。削除済みのバリアントやアバターの
 * URL を開くと実際に踏むため、他の画面と同じ語彙で出す。
 */
export default function NotFound() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono text-sm text-gray-500 dark:text-gray-400">404</p>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          そのページはありません
        </h2>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        削除したバリアントやアバターの URL を開いた可能性があります。
      </p>

      <Link
        href="/"
        className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        一覧へ戻る
      </Link>
    </div>
  );
}
