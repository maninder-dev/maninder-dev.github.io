'use client';
// Topic 189: next/dynamic with ssr: false. The server HTML contains only the loading text; the
// MapView chunk is downloaded and rendered in the browser. (ssr: false is an error in a Server Component.)
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

export default function MapLoader() {
  return <MapView />;
}
