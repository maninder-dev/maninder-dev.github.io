// Topic 173: optional catch-all. Matches /pr/173/shop (filters undefined) and /pr/173/shop/x/y.
// Run: npm run ex 173        (open: /pr/173/shop/x/y)
import type { GetServerSideProps } from 'next';

type Props = { filters: string[] };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => ({
  props: { filters: (params?.filters as string[] | undefined) ?? [] },
});

export default function Shop({ filters }: Props) {
  return <main><h1>Shop</h1><p>Filters: {filters.length ? filters.join(', ') : 'none'}</p></main>;
}
