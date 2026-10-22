'use client';
// Topic 189: a browser-only component (touches window during render), so it must not run on the server.
export default function MapView() {
  return <p>Map rendered in the browser at {window.innerWidth}px wide.</p>;
}
