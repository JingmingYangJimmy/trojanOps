import { Libre_Caslon_Text, Source_Code_Pro, Source_Sans_3 } from 'next/font/google';

export const sans = Source_Sans_3({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-source-sans' });
export const serif = Libre_Caslon_Text({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-caslon' });
export const mono = Source_Code_Pro({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-source-code' });
