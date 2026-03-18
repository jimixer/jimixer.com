/**
 * URL Rewrite Function
 *
 * Purpose:
 *   - Redirect URLs without trailing slash to URLs with trailing slash
 *   - Append index.html to directory URLs for S3 static hosting
 *
 * Trigger: CloudFront Viewer Request
 * Cost: ~$0.10 per 1,000,000 requests
 *
 * Examples:
 *   /notes  → 301 Redirect → /notes/
 *   /notes/ → Rewrite      → /notes/index.html
 *   /style.css → Pass through (no change)
 */
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // スラッシュで終わらないパスで、拡張子がない場合
  // (例: /notes, /gallery)
  if (!uri.endsWith('/') && !uri.includes('.')) {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: uri + '/' }
      }
    };
  }

  // スラッシュで終わる場合、index.htmlを追加
  // (例: /notes/ → /notes/index.html)
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  }

  return request;
}
