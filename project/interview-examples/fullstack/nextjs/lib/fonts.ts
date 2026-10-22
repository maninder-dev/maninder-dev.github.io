// Topic 189: next/font/local self-hosts a font file at build time. Unlike next/font/google it makes
// no network request, so the build works offline. The .woff2 comes from @fontsource/inter (OFL).
import localFont from 'next/font/local';

export const inter = localFont({
  src: '../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2',
  display: 'swap',
  variable: '--font-inter',
});
