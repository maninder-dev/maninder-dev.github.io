// Topic 173: catch-all route. /pr/173/docs/a/b/c -> query.path = ['a', 'b', 'c'].
// Run: npm run ex 173        (open: /pr/173/docs/a/b/c)
// getServerSideProps is used here only so the server HTML already shows the segments.
import type { GetServerSideProps } from 'next';

type Props = { path: string[] };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => ({
  props: { path: (params?.path as string[]) ?? [] },
});

export default function Docs({ path }: Props) {
  return <main><h1>Docs catch-all</h1><p>Segments: {path.join(' / ')}</p></main>;
}
