// PWA Install Prompt Handler
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    // Detect if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('✅ PWA is already installed');
      return;
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('🎯 PWA Install prompt triggered');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA was installed successfully');
      this.isInstalled = true;
      this.hideInstallButton();
    });

    // Check if iOS Safari
    if (this.isIOSSafari()) {
      this.showIOSInstructions();
    }

    // Auto-prompt after user interaction
    this.setupAutoPrompt();
  }

  showInstallButton() {
    // Create install button if not exists
    let installBtn = document.getElementById('pwa-install-btn');
    if (!installBtn) {
      installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.innerHTML = '📱 Ana Ekrana Ekle';
      installBtn.className = `
        fixed bottom-4 right-4 z-50 
        bg-blue-600 hover:bg-blue-700 
        text-white px-4 py-2 rounded-lg shadow-lg
        font-medium text-sm transition-all duration-300
        animate-bounce
      `;
      installBtn.onclick = () => this.installApp();
      document.body.appendChild(installBtn);
    }
    installBtn.style.display = 'block';
  }

  hideInstallButton() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }

  async installApp() {
    if (!this.deferredPrompt) {
      console.log('❌ No deferred prompt available');
      return;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted PWA installation');
      } else {
        console.log('❌ User dismissed PWA installation');
      }
      
      // Reset the deferred prompt
      this.deferredPrompt = null;
      this.hideInstallButton();
    } catch (error) {
      console.error('❌ PWA install failed:', error);
    }
  }

  isIOSSafari() {
    const ua = window.navigator.userAgent;
    const iOS = !!ua.match(/iPad|iPhone|iPod/);
    const webkit = !!ua.match(/WebKit/);
    return iOS && webkit && !ua.match(/CriOS|EdgiOS|FxiOS/);
  }

  showIOSInstructions() {
    // Show iOS specific instructions
    setTimeout(() => {
      const iosPrompt = document.createElement('div');
      iosPrompt.id = 'ios-install-prompt';
      iosPrompt.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div class="bg-white rounded-t-lg p-6 w-full animate-slide-up">
            <h3 class="text-lg font-bold mb-2">📱 Ana Ekrana Ekle</h3>
            <p class="text-sm text-gray-600 mb-4">
              1. Safari'de paylaş butonuna ( ⬆️ ) tıklayın<br>
              2. "Ana Ekrana Ekle" seçeneğini bulun<br>
              3. "Ekle" butonuna basın
            </p>
            <button onclick="document.getElementById('ios-install-prompt').remove()" 
                    class="w-full bg-blue-600 text-white py-2 rounded">
              Anladım
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(iosPrompt);
    }, 3000);
  }

  setupAutoPrompt() {
    let userInteractions = 0;
    const requiredInteractions = 3;

    const trackInteraction = () => {
      userInteractions++;
      if (userInteractions >= requiredInteractions && this.deferredPrompt && !this.isInstalled) {
        setTimeout(() => {
          this.showInstallNotification();
        }, 2000);
        
        // Remove listeners after showing prompt
        document.removeEventListener('click', trackInteraction);
        document.removeEventListener('scroll', trackInteraction);
      }
    };

    document.addEventListener('click', trackInteraction);
    document.addEventListener('scroll', trackInteraction);
  }

  showInstallNotification() {
    const notification = document.createElement('div');
    notification.id = 'install-notification';
    notification.innerHTML = `
      <div class="fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm animate-fade-in">
        <div class="flex items-start">
          <div class="flex-1">
            <h4 class="font-bold text-sm">📱 Uygulamayı Yükle</h4>
            <p class="text-xs mt-1 opacity-90">Daha hızlı erişim için ana ekranına ekle</p>
          </div>
          <button onclick="document.getElementById('install-notification').remove()" 
                  class="ml-2 text-white opacity-75 hover:opacity-100">✕</button>
        </div>
        <div class="mt-3 flex gap-2">
          <button onclick="pwaInstaller.installApp(); document.getElementById('install-notification').remove();" 
                  class="bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium">Yükle</button>
          <button onclick="document.getElementById('install-notification').remove()" 
                  class="text-white opacity-75 text-xs">Sonra</button>
        </div>
      </div>
    `;
    document.body.appendChild(notification);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      const notif = document.getElementById('install-notification');
      if (notif) notif.remove();
    }, 10000);
  }

  // Check PWA engagement criteria
  checkInstallCriteria() {
    const criteria = {
      hasServiceWorker: 'serviceWorker' in navigator,
      hasManifest: document.querySelector('link[rel="manifest"]') !== null,
      isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
      hasIcons: true, // We have icons in manifest
      hasStartUrl: true, // We have start_url in manifest
      userEngaged: true // We'll track this separately
    };

    console.log('PWA Install Criteria:', criteria);
    return Object.values(criteria).every(Boolean);
  }
}

// CSS for animations
const styles = `
  @keyframes bounce {
    0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
    40%, 43% { transform: translate3d(0,-30px,0); }
    70% { transform: translate3d(0,-15px,0); }
    90% { transform: translate3d(0,-4px,0); }
  }
  
  @keyframes slide-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-bounce { animation: bounce 2s infinite; }
  .animate-slide-up { animation: slide-up 0.3s ease-out; }
  .animate-fade-in { animation: fade-in 0.3s ease-out; }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Initialize PWA Installer
const pwaInstaller = new PWAInstaller();

// Export for global access
window.pwaInstaller = pwaInstaller;