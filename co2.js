// proxy.js
class HTTPProxy {
    constructor() {
        this.proxyHost = '172.245.157.109';
        this.proxyPort = '6694';
        this.proxyUser = 'yagey1488';
        this.proxyPass = 'tipidor228';
        this.isActive = false;
    }

    async loadPage(url) {
        return new Promise(async (resolve, reject) => {
            try {
                // Проверяем и нормализуем URL
                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                }

                console.log('🔄 Connecting to proxy...', url);
                
                // Используем CORS прокси как промежуточное звено
                const corsProxy = 'https://cors-anywhere.herokuapp.com/';
                const targetWithAuth = `http://${this.proxyUser}:${this.proxyPass}@${this.proxyHost}:${this.proxyPort}`;
                
                // Сначала проверяем доступность прокси
                const testResponse = await fetch(`${corsProxy}${targetWithAuth}`, {
                    method: 'HEAD',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (!testResponse.ok) {
                    throw new Error(`Proxy test failed: ${testResponse.status}`);
                }

                console.log('✅ Proxy is available, loading page...');
                
                // Загружаем целевую страницу через прокси
                const response = await fetch(`${corsProxy}${url}`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Proxy-Target': targetWithAuth
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const html = await response.text();
                console.log('✅ Page loaded successfully via proxy');
                
                // Рендерим страницу
                this.renderPage(html, url);
                this.activate();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ Proxy connection failed:', error);
                reject(error);
            }
        });
    }

    // Остальные методы остаются без изменений
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('🔧 Proxy interceptor activated');
        
        document.addEventListener('click', this.handleLinkClick.bind(this));
        document.addEventListener('submit', this.handleFormSubmit.bind(this));
        this.interceptFetch();
    }

    handleLinkClick(e) {
        const link = e.target.closest('a[href]');
        if (link && this.isExternalUrl(link.href)) {
            e.preventDefault();
            this.loadPage(link.href);
        }
    }

    handleFormSubmit(e) {
        const form = e.target;
        if (form.action && this.isExternalUrl(form.action)) {
            e.preventDefault();
            this.submitForm(form);
        }
    }

    interceptFetch() {
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            const url = args[0];
            if (typeof url === 'string' && this.isExternalUrl(url)) {
                console.log('🔗 Intercepting fetch:', url);
                // Используем CORS proxy для fetch запросов
                args[0] = `https://cors-anywhere.herokuapp.com/${url}`;
            }
            return originalFetch.apply(this, args);
        };
    }

    isExternalUrl(url) {
        try {
            const urlObj = new URL(url, window.location.href);
            return !urlObj.href.startsWith(window.location.origin) && 
                   urlObj.protocol.startsWith('http');
        } catch {
            return false;
        }
    }

    async submitForm(form) {
        try {
            const formData = new FormData(form);
            const action = form.action;
            
            const requestOptions = {
                method: form.method,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };
            
            if (form.method.toLowerCase() !== 'get') {
                requestOptions.body = new URLSearchParams(formData);
                requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            
            const response = await fetch(`https://cors-anywhere.herokuapp.com/${action}`, requestOptions);
            const html = await response.text();
            
            this.renderPage(html, action);
            
        } catch (error) {
            console.error('Form submit failed:', error);
            alert(`Form submit failed: ${error.message}`);
        }
    }

    renderPage(html, originalUrl) {
        const scrollY = window.scrollY;
        
        document.open();
        document.write(html);
        document.close();
        
        window.scrollTo(0, scrollY);
        setTimeout(() => this.activate(), 100);
        window.history.pushState({}, '', `/?url=${encodeURIComponent(originalUrl)}`);
    }
}
