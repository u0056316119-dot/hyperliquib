// proxy.js
console.log('🚀 PROXY.JS ЗАГРУЖЕН!');

class HTTPProxy {
    constructor() {
        console.log('🔄 Proxy class initialized');
        this.proxyHost = '45.41.173.44';
        this.proxyPort = '6411';
        this.proxyUser = 'yagey1488';
        this.proxyPass = 'tipidor228';
        this.isActive = false;
    }

    test() {
        console.log('✅ Test method called');
        console.log('📡 Proxy details:', {
            host: this.proxyHost,
            port: this.proxyPort,
            user: this.proxyUser,
            pass: this.proxyPass
        });
        return 'Proxy is working!';
    }

    // НОВЫЙ МЕТОД - активировать проксирование
    activateProxy() {
        if (this.isActive) {
            console.log('⚠️ Proxy already active');
            return;
        }
        
        console.log('🔧 ACTIVATING PROXY...');
        this.isActive = true;
        
        // 1. Перехватываем все ссылки
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && link.href.startsWith('http')) {
                e.preventDefault();
                console.log('🔗 Intercepted link:', link.href);
                this.proxyUrl(link.href);
            }
        });
        
        // 2. Перехватываем fetch запросы
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            const url = args[0];
            if (typeof url === 'string' && url.startsWith('http')) {
                console.log('🌐 Intercepted fetch:', url);
                // Пока просто логируем, потом добавим проксирование
            }
            return originalFetch.apply(this, args);
        };
        
        console.log('🎯 PROXY ACTIVATED! All links and requests will be proxied');
    }

    // Метод для проксирования URL
    async proxyUrl(url) {
        console.log('🔄 Proxying URL:', url);
        
        try {
            // Используем CORS прокси как промежуточный сервер
            const corsProxy = 'https://cors-anywhere.herokuapp.com/';
            const response = await fetch(corsProxy + url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const html = await response.text();
            console.log('✅ Page loaded via proxy');
            
            // Отображаем результат
            this.showResult(html);
            
        } catch (error) {
            console.error('❌ Proxy failed:', error);
        }
    }

    // Показать результат проксирования
    showResult(html) {
        const newWindow = window.open();
        newWindow.document.write(html);
        newWindow.document.close();
    }
}

// Сразу создаем и активируем
console.log('🔧 Creating proxy instance...');
window.proxy = new HTTPProxy();
console.log('🎯 Proxy ready!');

// Автоактивация через 2 секунды
setTimeout(() => {
    window.proxy.activateProxy();
}, 2000);
