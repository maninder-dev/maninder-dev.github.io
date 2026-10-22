// Topic 169: React Security (XSS)  (Full-Stack Handbook, Part 8)
// Run: npm run ex 169
// What it shows: JSX escapes a <script>/<img onerror> string into harmless text;
// dangerouslySetInnerHTML injects raw HTML unless DOMPurify sanitizes it first; and href values
// are validated so javascript: URLs never reach the DOM.
import DOMPurify from 'dompurify';

export function Comment({ text }) {
  return <p data-testid="comment">{text}</p>; // escaped
}

export function UnsafePost({ html }) {
  return <div data-testid="post" dangerouslySetInnerHTML={{ __html: html }} />; // raw: dangerous
}

export function SafePost({ html }) {
  return <div data-testid="post" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

export const safeHref = (link) => (/^https?:\/\//i.test(link) ? link : '#');

export function Website({ link }) {
  return <a href={safeHref(link)} rel="noopener noreferrer" target="_blank">Website</a>;
}
