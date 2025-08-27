// app/api/stop/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export { stopHandler as POST } from '../mapear/route.js';
