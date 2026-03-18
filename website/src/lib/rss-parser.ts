import { XMLParser } from "fast-xml-parser";
import type { NoteItem } from "@/types/note";

const RSS_URL = "https://note.com/jimixer/rss";

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  "media:thumbnail"?: {
    "@_url": string;
  };
  "content:encoded"?: string;
}

interface RSSFeed {
  rss: {
    channel: {
      item: RSSItem | RSSItem[];
    };
  };
}

export async function fetchNotes(): Promise<NoteItem[]> {
  try {
    const response = await fetch(RSS_URL, {
      next: { revalidate: 0 }, // ビルド時に毎回取得
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const result: RSSFeed = parser.parse(xmlText);
    const items = Array.isArray(result.rss.channel.item)
      ? result.rss.channel.item
      : [result.rss.channel.item];

    return items.map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      description: extractDescription(item.description || ""),
      thumbnail: item["media:thumbnail"]?.["@_url"] || extractImageFromHtml(item["content:encoded"]),
    }));
  } catch (error) {
    // ビルド時のエラーはNext.jsが自動でログ出力
    // 本番では何もせず空配列を返してgraceful degradation
    return [];
  }
}

function extractDescription(html: string): string {
  // HTMLタグを除去してプレーンテキストに
  return html.replace(/<[^>]*>/g, "").substring(0, 150);
}

function extractImageFromHtml(html?: string): string | undefined {
  if (!html) return undefined;
  const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
  return imgMatch?.[1];
}
