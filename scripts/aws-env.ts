/**
 * AWS を触るスクリプトの入口で、資格情報の出所を確かめる。
 *
 * `.envrc`（direnv）が読み込まれていないと `default` プロファイルに落ち、
 * 別の権限で走ってしまう。エラーが 403 の形でしか出ないため原因が分かりにくく、
 * 最悪の場合は意図しない場所へ書き込む。ここで止めて指示を出す。
 */
export function requireAwsEnv(): void {
  if (process.env.AWS_PROFILE || process.env.AWS_ACCESS_KEY_ID) return;

  throw new Error(
    [
      "AWS の資格情報が特定できません（AWS_PROFILE も AWS_ACCESS_KEY_ID も未設定）。",
      "このリポジトリでは .envrc で AWS_PROFILE を設定しています。",
      "",
      "  direnv allow          # 初回のみ",
      "  direnv exec . npm run gallery:upload-derivatives",
      "",
      "詳細は .envrc.example と README を参照してください。",
    ].join("\n")
  );
}
