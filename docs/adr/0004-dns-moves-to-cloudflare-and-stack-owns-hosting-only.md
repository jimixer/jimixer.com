# jimixer.com の DNS を Cloudflare へ移し、JimixerComStack は配信基盤だけを持つ

`jimixer.com` の DNS を Route 53 から Cloudflare のゾーンへ移す。ドメインの登録は Route 53 Domains に残し、ネームサーバーだけを書き換える。`JimixerComStack` は DNS のレコードを持たず、サイトとギャラリーの配信基盤（S3、CloudFront、デプロイロール）だけを持つ。

状態は採用（2026-09-30）。

## 背景

ゲーム（burage01 リポジトリ）を `jimixer.com` のサブドメインで公開する。ゲームは Cloudflare Workers で動かし、web と API を1つの Worker で配信する（burage01 の `docs/adr/0028`）。

Worker にカスタムドメインを付けるには、そのドメインのゾーンが Cloudflare 上に必要である。Route 53 から `*.workers.dev` へ CNAME を向けても、Cloudflare はそのホスト名を受け付けず、証明書も発行しない。

`JimixerComStack` が DNS について持っていたのは、`jimixer.com` と `gallery.jimixer.com` の A（Alias）レコード2本だけである。Hosted Zone は `HostedZone.fromLookup` で、ACM 証明書は `fromCertificateArn` で、どちらも外から参照している。ACM の検証用 CNAME はスタックの外にある。

## 決定

- Cloudflare のゾーンに次の3本を置く。すべて DNS only（プロキシはオフ）にする
  - `jimixer.com`: `DistributionDomainName`（CloudFront）への CNAME。apex なので CNAME flattening で応答される
  - `gallery.jimixer.com`: `GalleryDistributionDomainName` への CNAME
  - ACM の検証用 CNAME: Route 53 にある値をそのまま移す
- `JimixerComStack` から2つの `ARecord` と `HostedZone.fromLookup` を外す。CloudFront の `domainNames` と証明書は、配信に必要なのでスタックに残す
- ゲームのサブドメインは、各ゲームのリポジトリが自分の `wrangler.jsonc` で宣言する。このリポジトリにはゲームのレコードを置かない
- Cloudflare 側のレコードはダッシュボードで管理する。3本だけなので IaC にしない

プロキシをオフにするのは、CloudFront の前に Cloudflare の CDN を重ねないためである。

## 棄却した案

- **DNS を Route 53 に残し、ゲームの Worker の前に CloudFront を置く**: DNS と証明書の管理が CDK の中で完結する。一方で、ゲームへのリクエストの経路に2社が挟まり、ゲーム側から見えるクライアントの IP が CloudFront のものになる
- **DNS を Route 53 に残し、ゲームを Cloudflare Pages で配信する**: Pages は外部 DNS からの CNAME でカスタムドメインを受け付ける。これまでの方式だが、Cloudflare は新規に Workers を推奨しており、ゲーム側の構成要素も増える
- **Cloudflare for SaaS**: 配管のためだけの別ドメインを取得して維持することになる

## 帰結

- `JimixerComStack` を変更しても DNS は変わらない。CloudFront のディストリビューションを作り直してドメイン名が変わった場合は、Cloudflare 側の CNAME を手で書き換える
- ACM 証明書（`jimixer.com` と `*.jimixer.com`）を自動で更新するには、Cloudflare へ移した検証用 CNAME が要る。このレコードを消すと、証明書の期限切れまで気付きにくい
- ゲームを増やしても、このリポジトリを変更しなくてよい
- DNS の管理画面が AWS と Cloudflare の2か所に分かれる。登録と証明書は AWS、レコードは Cloudflare に置く
- ネームサーバーの切り替えが行き渡るまで最大48時間かかる。その間は新旧のゾーンが同じ答えを返すようにする

## 追記（2026-10-03）

Cloudflare のダッシュボードの推奨に従い、次のレコードを足した。

- メールは使わないので、受信を拒否してなりすましを防ぐ。Null MX（`0 .`）、SPF（`v=spf1 -all`）、`_dmarc` の DMARC（`p=reject`）の3本。メールを使うことになったらこの3本を外す
- `www.jimixer.com` は、プロキシ有効のダミーの AAAA（`100::`）と Single Redirect のルールで `https://jimixer.com` へ 301 で転送する。パスとクエリは保つ。プロキシを使うのは www だけで、CloudFront の前に Cloudflare を重ねないという決定は変わらない

移行の手順と、2026-09-30 時点のレコードの棚卸しは、burage01 リポジトリの `.scratch/workers-static-assets/` にある。
