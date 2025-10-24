// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Получаем путь запроса
  const url = request.nextUrl.clone();
  
  // Меняем хост на прокси
  url.hostname = '172.238.77.184';
  url.port = '20870';
  url.protocol = 'http:';
  
  // Создаем новый запрос с авторизацией
  const response = NextResponse.rewrite(url);
  
  // Добавляем заголовок авторизации
  response.headers.set(
    'Authorization', 
    'Basic ' + Buffer.from('nnc_shop_bot_N9oPAcmO:EguGcXoO3LGqZWSU').toString('base64')
  );
  
  return response;
}

export const config = {
  matcher: '/:path*',
};
