import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(217, 91%, 60%)" rx="20"/><text x="50" y="70" font-size="60" text-anchor="middle" fill="white" font-family="Arial, sans-serif">A</text></svg>';
  
  return new NextResponse(svgIcon, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}


