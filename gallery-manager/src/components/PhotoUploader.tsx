"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { capturedAtFromFilename } from "@/lib/captured-at";

interface Pending {
  file: File;
  preview: string;
  capturedAt: string;
}

interface PhotoUploaderProps {
  /** 選んだ写真を送る。成功したら呼び出し側が画面を更新する。 */
  onSubmit: (entries: { file: File; capturedAt: string }[]) => Promise<void>;
  submitLabel: string;
  disabled?: boolean;
}

/**
 * 写真の選択と撮影日時の確定。
 *
 * 撮影日時は必須である。VRChat のファイル名から取れたときは初期値として
 * 埋めるが、取れないファイル（加工でリネームしたものなど）は人間が入力する。
 * ファイルの更新日時は移動やコピーで変わるので、黙って使わない。
 */
export function PhotoUploader({ onSubmit, submitLabel, disabled }: PhotoUploaderProps) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((files: File[]) => {
    setPending((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        capturedAt: capturedAtFromFilename(file.name) ?? "",
      })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    disabled: disabled || busy,
  });

  const missing = pending.filter((p) => !p.capturedAt).length;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(pending.map(({ file, capturedAt }) => ({ file, capturedAt })));
      pending.forEach((p) => URL.revokeObjectURL(p.preview));
      setPending([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
        } ${disabled || busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input {...getInputProps()} />
        <p className="text-gray-600 dark:text-gray-300">
          {isDragActive
            ? "ここにドロップ..."
            : "写真をドラッグ&ドロップ、またはクリックして選択"}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">PNG, JPG, WebP</p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((item, index) => (
            <div
              key={item.preview}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt=""
                className="h-16 w-16 object-cover rounded bg-gray-100 dark:bg-gray-700"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-700 dark:text-gray-200">
                  {item.file.name}
                </p>
                <input
                  type="datetime-local"
                  step={1}
                  value={item.capturedAt}
                  onChange={(e) =>
                    setPending((prev) =>
                      prev.map((p, i) =>
                        i === index ? { ...p, capturedAt: e.target.value } : p
                      )
                    )
                  }
                  className={`mt-1 rounded border px-2 py-1 text-sm bg-transparent ${
                    item.capturedAt
                      ? "border-gray-300 dark:border-gray-600"
                      : "border-red-500"
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setPending((prev) => prev.filter((_, i) => i !== index))
                }
                className="text-sm text-red-600 hover:text-red-700 px-2"
              >
                除外
              </button>
            </div>
          ))}

          {missing > 0 && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {missing} 件の撮影日時が未入力です。ファイル名から読み取れなかったものは手で入力してください。
            </p>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={busy || missing > 0 || disabled}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
          >
            {busy ? "処理中..." : `${submitLabel}（${pending.length} 枚）`}
          </button>
        </div>
      )}
    </div>
  );
}
