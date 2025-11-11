import { NextResponse } from 'next/server';
import { isAutoRegisterEnabled } from '@/lib/cloudflare';

export async function GET() {
  const enabled = isAutoRegisterEnabled();
  
  return NextResponse.json({
    enabled,
  });
}
