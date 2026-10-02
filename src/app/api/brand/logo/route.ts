import { NextResponse } from "next/server";

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1c1c21"/>
      <stop offset="1" stop-color="#09090b"/>
    </linearGradient>
    <linearGradient id="red" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f43f5e"/>
      <stop offset="1" stop-color="#b91c1c"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#bg)"/>
  <rect x="96" y="96" width="320" height="320" rx="54" fill="none" stroke="url(#red)" stroke-width="26"/>
  <polygon points="208,168 208,344 336,256" fill="url(#red)"/>
  <circle cx="372" cy="372" r="22" fill="url(#red)"/>
</svg>`;

export function GET() {
  return new NextResponse(LOGO_SVG.trim(), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}