// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const proxyUrl = new URL(request.url);
  proxyUrl.hostname = '172.238.77.184';
  proxyUrl.port = '20870';
  proxyUrl.protocol = 'http:';
  
  const auth = Buffer.from('nnc_shop_bot_N9oPAcmO:EguGcXoO3LGqZWSU').toString('base64');
  
  return NextResponse.rewrite(proxyUrl.toString(), {
    headers: {
      'Authorization': `Basic ${auth}`,
      // Убираем подмену IP - показываем реальный IP прокси
      'X-Forwarded-For': request.headers.get('x-forwarded-for') || request.ip,
      'X-Real-IP': request.headers.get('x-real-ip') || request.ip
    }
  });
}

export const config = {
  matcher: '/:path*',
};
