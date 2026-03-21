import { fetchNotes } from "@/lib/rss-parser";
import Image from "next/image";
import ExternalLinkIcon from "@/components/icons/ExternalLinkIcon";

export const dynamic = 'force-static';
export const revalidate = false;

export default async function NotesPage() {
  const notes = await fetchNotes();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-mono font-bold mb-2">Notes</h1>
        <p className="text-neutral-400">
          noteに投稿している記事の一覧です。思ったことを記録しています。
        </p>
      </div>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-neutral-500">記事がまだありません。</p>
        ) : (
          notes.map((note, index) => (
            <a
              key={index}
              href={note.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-6 border border-white/10 hover:border-orange-500 transition rounded-lg"
            >
              <div className="flex gap-4">
                {note.thumbnail && (
                  <div className="relative flex-shrink-0 w-32 h-32 bg-neutral-800 rounded overflow-hidden">
                    <Image
                      fill
                      src={note.thumbnail}
                      alt={note.title}
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold mb-2 truncate flex items-center gap-2">
                    {note.title}
                    <ExternalLinkIcon className="flex-shrink-0 w-4 h-4 text-neutral-500" />
                  </h2>
                  <p className="text-sm text-neutral-500 mb-2">
                    {new Date(note.pubDate).toLocaleDateString("ja-JP")}
                  </p>
                  <p className="text-neutral-300 line-clamp-2">
                    {note.description}
                  </p>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
