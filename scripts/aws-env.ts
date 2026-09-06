/**
 * AWS を触るスクリプトの入口で、資格情報の出所を確かめる。
 *
 * npm script は自分でプロファイルを宣言するので、そちらから実行する限りここは
 * 素通りする。残るのは `npx tsx scripts/...` の直呼びで、その場合 `.envrc` が
 * 読み込まれていなければ `default` プロファイルに落ちる。エラーが 403 の形でしか
 * 出ないため原因が分かりにくく、最悪の場合は意図しない場所へ書き込む。
 */
export function requireAwsEnv(): void {
  if (process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID) return;

  throw new Error(
    [
      "AWS の資格情報が特定できません（AWS_PROFILE も AWS_ACCESS_KEY_ID も未設定）。",
      "npm script はプロファイルを自分で宣言するので、そちらから実行してください。",
      "",
      "  npm run gallery:upload-derivatives",
      "",
      "直に tsx で走らせるなら、プロファイルは呼び出し側で与えてください。",
      "",
      "  direnv exec . npx tsx scripts/upload-derivatives.ts",
      "",
      "詳細は docs/aws-credentials.md を参照してください。",
    ].join("\n")
  );
}
