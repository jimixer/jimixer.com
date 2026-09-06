import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { Construct } from "constructs";

/**
 * GitHub Actions が引き受けるロール。恒久的なアクセスキーを置き換える。
 *
 * CI が走らせるのは `npm ci` と Next.js のビルドで、いずれもサードパーティの
 * コードが同じプロセスに入る。資格情報がそこに置かれている限り、侵害の経路は
 * リポジトリではなく依存ツリー全体になる。OIDC なら鍵そのものが存在せず、
 * 発行されるのはジョブ1回分の短命な資格情報に限られる。
 *
 * 権限はサイトの配信に必要な範囲だけ。**ギャラリーのバケットと原本バケットは
 * この経路から触らせない**（docs/aws-credentials.md）。
 */
export interface GitHubActionsDeployRoleProps {
  /** `owner/repo` 形式。このリポジトリ以外からは引き受けられない */
  repository: string;
  /** 信頼するブランチ。ここ以外から起動したワークフローは AssumeRole に失敗する */
  branch?: string;
  /** サイトの静的ファイルを置くバケット */
  websiteBucket: s3.IBucket;
  /** 無効化を許すディストリビューション。ギャラリー側は含めない */
  distribution: cloudfront.IDistribution;
}

/** GitHub Actions の OIDC 発行者。アカウントに1つだけ存在する */
const GITHUB_OIDC_ISSUER = "token.actions.githubusercontent.com";

export class GitHubActionsDeployRole extends Construct {
  readonly role: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    props: GitHubActionsDeployRoleProps
  ) {
    super(scope, id);

    const { repository, branch = "main", websiteBucket, distribution } = props;
    const stack = cdk.Stack.of(this);

    // プロバイダはアカウント共有の資源であり、このスタックの持ち物ではない。
    // 作成は一度きりの手作業（docs/aws-credentials.md）で、ここでは参照するだけ。
    const provider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "GitHubOidcProvider",
      `arn:aws:iam::${stack.account}:oidc-provider/${GITHUB_OIDC_ISSUER}`
    );

    this.role = new iam.Role(this, "Role", {
      roleName: "jimixer-com-github-actions",
      description: `Deploy jimixer.com from ${repository}@${branch}`,
      // 引き受けられるのは、このリポジトリの、このブランチの実行だけ。
      // sub を固定しないと同じプロバイダを使う任意のリポジトリから引き受けられる
      assumedBy: new iam.WebIdentityPrincipal(
        provider.openIdConnectProviderArn,
        {
          StringEquals: {
            [`${GITHUB_OIDC_ISSUER}:aud`]: "sts.amazonaws.com",
            [`${GITHUB_OIDC_ISSUER}:sub`]: `repo:${repository}:ref:refs/heads/${branch}`,
          },
        }
      ),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // ワークフローはバケット名とディストリビューション ID をスタックの出力から引く
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadStackOutputs",
        actions: ["cloudformation:DescribeStacks"],
        resources: [
          `arn:aws:cloudformation:${stack.region}:${stack.account}:stack/${stack.stackName}/*`,
        ],
      })
    );

    // `aws s3 sync --delete` が呼ぶのは List・Put・Delete の3つ。
    // 読み出し（GetObject）は同期の向き上いらないので与えない
    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: "ListWebsiteBucket",
        actions: ["s3:ListBucket"],
        resources: [websiteBucket.bucketArn],
      })
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: "SyncWebsiteObjects",
        actions: ["s3:PutObject", "s3:DeleteObject"],
        resources: [websiteBucket.arnForObjects("*")],
      })
    );

    distribution.grantCreateInvalidation(this.role);

    new cdk.CfnOutput(this, "DeployRoleArn", {
      value: this.role.roleArn,
      description: "Role assumed by GitHub Actions via OIDC",
    });
  }
}
