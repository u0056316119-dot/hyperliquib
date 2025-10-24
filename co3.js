// proxy.js
console.log('🚀 PROXY.JS ЗАГРУЖЕН!');

class HTTPProxy {
    constructor() {
        console.log('🔄 Proxy class initialized');
        this.proxyHost = '172.245.157.109';
        this.proxyPort = '6694';
        this.proxyUser = 'yagey1488';
        this.proxyPass = 'tipidor228';
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
}

// Сразу создаем экземпляр и тестируем
console.log('🔧 Creating proxy instance...');
window.proxy = new HTTPProxy();
console.log('🧪 Running test...');
window.proxy.test();
console.log('🎯 Proxy ready!');
