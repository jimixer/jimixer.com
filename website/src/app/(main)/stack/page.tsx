export default function StackPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-mono font-bold mb-2">Stack</h1>
        <p className="text-neutral-400">
          このサイトの技術スタック。
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Frontend</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-4 border border-white/10 rounded">
            <strong>Next.js</strong> — App Router + Static Export
          </div>
          <div className="p-4 border border-white/10 rounded">
            <strong>Tailwind CSS</strong> — ユーティリティファーストCSS
          </div>
          <div className="p-4 border border-white/10 rounded">
            <strong>TypeScript</strong> — 型安全性の確保
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Infrastructure</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-4 border border-white/10 rounded">
            <strong>AWS S3</strong> — 静的ファイルホスティング
          </div>
          <div className="p-4 border border-white/10 rounded">
            <strong>CloudFront</strong> — CDN + HTTPS配信
          </div>
          <div className="p-4 border border-white/10 rounded">
            <strong>Route 53</strong> — DNS管理
          </div>
          <div className="p-4 border border-white/10 rounded">
            <strong>ACM</strong> — SSL/TLS証明書
          </div>
          <div className="p-4 border border-white/10 rounded">
            <strong>AWS CDK</strong> — Infrastructure as Code
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">CI/CD</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-4 border border-white/10 rounded">
            <strong>GitHub Actions</strong> — 自動ビルド & デプロイ
          </div>
          <div className="p-4 border border-white/10 rounded">
            <strong>Daily Rebuild</strong> — note RSS更新の自動反映
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Content Source</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-4 border border-white/10 rounded">
            <strong>note RSS</strong> — 記事フィード (
            <a
              href="https://note.com/jimixer/rss"
              className="text-orange-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://note.com/jimixer/rss
            </a>
            )
          </div>
          <div className="p-4 border border-white/10 rounded">
            <strong>Local Markdown & Assets</strong> — VRChatギャラリー画像
          </div>
        </div>
      </section>
    </div>
  );
}
