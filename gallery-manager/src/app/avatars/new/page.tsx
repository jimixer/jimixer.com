import { AvatarForm } from "@/components/AvatarForm";

export default function NewAvatarPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">アバターを追加</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        販売物としてのモデルを登録します。作者クレジットと入手元はここに属します。
      </p>
      <AvatarForm />
    </div>
  );
}
