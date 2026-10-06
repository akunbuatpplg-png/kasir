import { route } from '@/lib/server';

export const dynamic = 'force-dynamic';

export const GET = route(async (req, { user }) => user);