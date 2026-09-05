import type { Avatar } from "@jimixer/gallery-schema";
import Link from "next/link";

interface AvatarRowProps {
  avatar: Avatar;
  variantCount: number;
}

export function AvatarRow({ avatar, variantCount }: AvatarRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{avatar.displayName}</p>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
          {avatar.author} ·{" "}
          <a
            href={avatar.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-700 dark:hover:text-gray-200"
          >
            {avatar.sourceUrl}
          </a>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          バリアント {variantCount}
        </span>
        <Link
          href={`/avatars/${avatar.id}/edit`}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          編集
        </Link>
      </div>
    </div>
  );
}
