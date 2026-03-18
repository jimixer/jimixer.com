export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          アバター一覧
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          ここにアバター一覧が表示されます
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>開発中:</strong> ローカル環境でgallery-managerを構築中です。
          将来的にAWS CDK管理下でのデプロイを検討します。
        </p>
      </div>
    </div>
  );
}
