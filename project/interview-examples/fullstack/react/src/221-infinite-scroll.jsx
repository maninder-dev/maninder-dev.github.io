// Topic 221: React Coding Questions - infinite scroll  (Full-Stack Handbook, Part 11)
// Run: npm run ex 221
// What it shows: an IntersectionObserver watches a sentinel below the list and loads the next
// page when it becomes visible; it disconnects when there is nothing more to load.
import { useCallback, useEffect, useRef, useState } from 'react';

export function useInfiniteScroll(loadMore, hasMore) {
  const ref = useRef(null);
  useEffect(() => {
    if (!hasMore) return;
    const obs = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), {
      rootMargin: '200px', // start loading a little before the user reaches the end
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [loadMore, hasMore]);
  return ref;
}

export function useFeed(fetchPage, totalPages) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const loading = useRef(false);
  const loadMore = useCallback(async () => {
    if (loading.current) return; // ignore repeated intersections while a page is loading
    loading.current = true;
    const next = await fetchPage(page + 1);
    setItems((prev) => [...prev, ...next]);
    setPage((p) => p + 1);
    loading.current = false;
  }, [fetchPage, page]);
  return { items, loadMore, hasMore: page < totalPages };
}

export function Feed({ fetchPage, totalPages }) {
  const { items, loadMore, hasMore } = useFeed(fetchPage, totalPages);
  const sentinel = useInfiniteScroll(loadMore, hasMore);
  return (
    <>
      <ul>{items.map((p) => <li key={p.id}>{p.title}</li>)}</ul>
      {hasMore ? <div ref={sentinel} data-testid="sentinel" /> : <p>No more posts</p>}
    </>
  );
}
