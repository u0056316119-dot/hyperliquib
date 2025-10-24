// proxy.js
class HTTPProxy {
    constructor() {
        this.proxyUrl = 'http://yagey1488:tipidor228@172.245.157.109:6694';
        this.isActive = false;
    }

    async loadPage(url) {
        return new Promise(async (resolve, reject) => {
            try {
                // Проверяем URL
                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                }

                console.log('🔄 Connecting to proxy...');
                const proxyUrl = `${this.proxyUrl}/${url}`;
                
                const response = await fetch(proxyUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const html = await response.text();
                console.log('✅ Proxy connection successful');
                
                // Рендерим страницу
                this.renderPage(html, url);
                this.activate(); // Активируем перехватчик
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ Proxy connection failed:', error);
                reject(error);
            }
        });
    }

    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('🔧 Proxy interceptor activated');
        
        // Перехватываем клики по ссылкам
        document.addEventListener('click', this.handleLinkClick.bind(this));
        
        // Перехватываем формы
        document.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        // Перехватываем fetch
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
                args[0] = `${this.proxyUrl}/${url}`;
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
                headers: {}
            };
            
            if (form.method.toLowerCase() !== 'get') {
                requestOptions.body = new URLSearchParams(formData);
                requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            
            const response = await fetch(`${this.proxyUrl}/${action}`, requestOptions);
            const html = await response.text();
            
            this.renderPage(html, action);
            
        } catch (error) {
            console.error('Form submit failed:', error);
            alert(`Form submit failed: ${error.message}`);
        }
    }

    renderPage(html, originalUrl) {
        // Сохраняем скролл позицию
        const scrollY = window.scrollY;
        
        // Открываем новое содержимое
        document.open();
        document.write(html);
        document.close();
        
        // Восстанавливаем скролл
        window.scrollTo(0, scrollY);
        
        // Реактивируем прокси для нового контента
        setTimeout(() => this.activate(), 100);
        
        // Обновляем URL в адресной строке
        window.history.pushState({}, '', `/?url=${encodeURIComponent(originalUrl)}`);
    }
}
