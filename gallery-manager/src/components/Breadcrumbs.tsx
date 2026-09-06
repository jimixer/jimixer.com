import Link from "next/link";

export interface Crumb {
  label: string;
  /** 省略したものが現在地。リンクにしない。 */
  href?: string;
}

interface BreadcrumbsProps {
  /** トップより下だけを渡す。末尾が現在地。 */
  items: Crumb[];
}

/**
 * 現在地とそこへ至る道筋を示す。
 *
 * URL からは組み立てない。パスに出るのは slug（`milltina-slim`）で、画面に
 * 出したいのは表示名（`Slim`）であり、表示名を知っているのはコンテンツを
 * 読んだページだけだからである。トップへの導線は常にあるので、先頭は
 * ここで補う。
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const crumbs: Crumb[] = [{ label: "トップ", href: "/" }, ...items];

  return (
    <nav aria-label="パンくずリスト">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
                /
              </span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-gray-700 dark:text-gray-200">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
