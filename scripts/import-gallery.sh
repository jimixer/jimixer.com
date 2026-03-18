#!/usr/bin/env bash
# import-gallery.sh
# staging/ 配下のPNGをWebPに変換してギャラリーへ取り込む
#
# 使い方:
#   ./scripts/import-gallery.sh <avatar-id> [source-dir]
#
# 例:
#   ./scripts/import-gallery.sh milltina          # staging/ をデフォルト使用
#   ./scripts/import-gallery.sh milltina ~/tmp/shots

set -euo pipefail

AVATAR_ID="${1:?エラー: avatar-id を指定してください (例: milltina)}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="${2:-${REPO_ROOT}/staging}"
OUTPUT_DIR="${REPO_ROOT}/website/public/gallery/${AVATAR_ID}"
WEBP_QUALITY=85
MAX_WIDTH=1920

# ----

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "エラー: ディレクトリが見つかりません: $SOURCE_DIR"
  exit 1
fi

# PNG を名前順で取得 (大文字小文字両対応)
VALID_FILES=()
while IFS= read -r -d '' f; do
  VALID_FILES+=("$f")
done < <(find "$SOURCE_DIR" -maxdepth 1 -iname '*.png' -print0 | sort -z)

if [[ ${#VALID_FILES[@]} -eq 0 ]]; then
  echo "エラー: PNG ファイルが見つかりません: $SOURCE_DIR"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "変換開始: ${#VALID_FILES[@]} 枚  $SOURCE_DIR → $OUTPUT_DIR"
echo ""

IMAGE_PATHS=()
for i in "${!VALID_FILES[@]}"; do
  INDEX=$(( i + 1 ))
  PNG="${VALID_FILES[$i]}"
  OUT="${OUTPUT_DIR}/${AVATAR_ID}-$(printf '%02d' "$INDEX").webp"

  convert "$PNG" -resize "${MAX_WIDTH}x${MAX_WIDTH}>" -quality "$WEBP_QUALITY" "$OUT"
  echo "  $(basename "$PNG") → $(basename "$OUT")"

  IMAGE_PATHS+=("/gallery/${AVATAR_ID}/${AVATAR_ID}-$(printf '%02d' "$INDEX").webp")
done

echo ""
echo "完了 (${#IMAGE_PATHS[@]} 枚)"
echo ""

# gallery.json に貼り付けるエントリを出力
echo "--- gallery.json エントリ ---"
printf '{\n  "id": "%s",\n  "image": "TODO",\n  "avatarName": "アバター名",\n  "images": [\n' \
  "$AVATAR_ID"

for i in "${!IMAGE_PATHS[@]}"; do
  if [[ "$i" -lt $(( ${#IMAGE_PATHS[@]} - 1 )) ]]; then
    printf '    { "url": "%s" },\n' "${IMAGE_PATHS[$i]}"
  else
    printf '    { "url": "%s" }\n' "${IMAGE_PATHS[$i]}"
  fi
done

printf '  ]\n}\n'
