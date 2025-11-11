import { NextResponse } from 'next/server';

export async function GET() {
  // Check the environment variable server-side
  const enabled = process.env.ALLOW_AUTO_REGISTER === 'TRUE';
  
  return NextResponse.json({
    enabled,
  });
}
