export const f = { variable: "--font-display" };
export const chart = (k, c) => `  --color-${k}: ${c};`;
export const Bar = () => <rect fill="var(--color-revenue)" />;
