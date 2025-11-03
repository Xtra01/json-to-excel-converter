# JSON to Excel Converter 📊# JSON to Excel Converter 📊



**Professional JSON to Excel/CSV converter with bulk processing and advanced features****Profesyonel JSON verilerini Excel ve CSV formatlarına dönüştüren güçlü web uygulaması**



[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)---

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)## 🚀 Ne İşe Yarar?

[![Deployed](https://img.shields.io/badge/Live-json2excel.devtestenv.org-green)](https://json2excel.devtestenv.org)

Bu uygulama JSON formatındaki verilerinizi hızlı ve etkili bir şekilde Excel (XLSX) ve CSV dosyalarına dönüştürür. Özellikle büyük veri setleri ve karmaşık JSON yapıları ile çalışırken işinizi kolaylaştıran gelişmiş özellikler sunar.

> **Transform JSON data into Excel/CSV with ease. Process hundreds of files simultaneously with enterprise-grade features.**

### ✨ Ana Özellikler

---

- **🗂️ Toplu Dosya İşleme**: Aynı anda yüzlerce JSON dosyasını işleyebilir

## ✨ Key Features- **📁 Klasör Desteği**: Tüm klasör yapısını koruyarak dosyaları organize eder

- **⚙️ Gelişmiş Yapılandırma**: JSON'un nasıl düzleştirileceğini kontrol edebilirsiniz

- **📁 Bulk Processing** - Handle 90+ JSON files at once- **🔄 Array İşleme Modları**: Dizileri istediğiniz şekilde işleyebilirsiniz

- **🗂️ Folder Support** - Upload entire directories with structure preservation  - **📈 Gerçek Zamanlı İlerleme**: İşlem sırasında detaylı ilerleme takibi

- **⚙️ Advanced Configuration** - Control flattening, array handling, and more- **💾 Çoklu Export Seçenekleri**: Excel, CSV ve panoya kopyalama desteği

- **💾 Multiple Formats** - Export to XLSX, CSV, or clipboard- **🎯 Akıllı Performans**: Büyük dosyalar için optimize edilmiş işleme

- **🎯 Memory Optimized** - Smart memory management for large datasets

- **🔒 100% Private** - All processing happens in your browser---

- **📊 Real-time Preview** - See results before exporting

- **🔍 Enterprise Logging** - Comprehensive error tracking## 🎯 Hızlı Başlangıç



---### 1. Dosya Yükleme

Uygulamayı açtığınızda karşınıza çıkan ana ekranda iki seçenek var:

## 🚀 Quick Start

#### 📁 **Çoklu Dosya Seçimi**

### Local Development- Sol taraftaki "Multiple Files" butonuna tıklayın

- JSON veya TXT dosyalarınızı seçin (Ctrl+Click ile çoklu seçim)

```bash- Dosyalar otomatik olarak işlenecek

# Install dependencies

npm install#### 🗂️ **Klasör Yükleme**  

- Sağ taraftaki "Upload Folders" butonuna tıklayın

# Run development server  - Tüm klasör yapısını seçin

npm run dev- Alt klasörler dahil tüm JSON dosyaları işlenecek



# Open http://localhost:3000### 2. Ayarlar Yapılandırması

```Dosyalarınız yüklendikten sonra "Settings" bölümünde:



### Production Build#### **Delimiter (Ayırıcı)**

- JSON'daki iç içe alanları nasıl ayıracağını belirler

```bash- Örnek: `user.profile.name` → `user_profile_name` 

# Build static export- **Varsayılan**: `_` (alt çizgi)

npm run build

#### **Max Depth (Maksimum Derinlik)**

# Files generated in /out directory- JSON'da kaç seviye derine ineceğini belirler

```- **Varsayılan**: `10` seviye

- **Önerilen**: Karmaşık JSON'lar için 15, basit yapılar için 5

### Deployment to Raspberry Pi

#### **Array Mode (Dizi İşleme Modu)**

```bash- **Explode**: Her dizi elemanı ayrı sütun olur (`item_0`, `item_1`, ...)

# Copy build to Pi- **Join**: Tüm elemanlar tek sütunda birleşir (`"item1; item2; item3"`)  

scp -r out/* user@pi:/home/user/json-to-excel/out/- **First**: Sadece ilk eleman alınır



# Restart container#### **Sheet Name (Sayfa Adı)**

ssh user@pi "docker restart json2excel-static"- Excel'de oluşturulacak sayfa adını belirler

```- **Varsayılan**: `data`



------



## 📖 Usage## 📊 Export Seçenekleri



### 1. Upload Files### 🔵 **Single Sheet Export** (Tek Sayfa)

- Tüm verileri tek Excel sayfasında birleştirir

**Option A: Multiple Files**- Kaynak dosya bilgilerini otomatik ekler

1. Click "📁 Multiple Files"- **En uygun**: 50+ dosya için

2. Select JSON/TXT files (Ctrl+Click for multiple)

3. Files auto-process### 🟢 **Folder-Based Export** (Klasör Bazlı)

- Her klasör için ayrı Excel dosyası oluşturur

**Option B: Folder Upload**- Orijinal klasör yapısını korur

1. Click "🗂️ Upload Folders"  - **En uygun**: Organize edilmiş veriler için

2. Select entire folder

3. All JSON files processed recursively### 🟡 **CSV Export**

- Hafif ve hızlı dışa aktarım

### 2. Configure (Optional)- Tüm tablo uygulamalarında açılabilir

- **En uygun**: Veri analizi için

- **Delimiter**: Separator for nested fields (default: `_`)

- **Max Depth**: Nesting levels to process (default: `10`)### 🟣 **Copy to Clipboard** (Panoya Kopyala)

- **Array Mode**:- Verileri doğrudan Excel'e yapıştırabilirsiniz

  - `explode` - Each element becomes a column- Tab ile ayrılmış format

  - `join` - All elements in one column- **En uygun**: Hızlı veri transferi için

  - `first` - Only first element

---

### 3. Export

## 🛠️ Arayüz Rehberi

Choose your format:

- **📄 Single Sheet** - All data in one Excel file### 📋 **Ana Kontroller**

- **📦 Folder-Based** - Separate files per folder

- **📋 CSV** - Lightweight export#### **Dosya Listesi**

- **📎 Clipboard** - Copy & paste to Excel- ✅ **Yeşil tik**: Başarıyla işlenen dosya (satır sayısı gösterir)

- ❌ **Kırmızı X**: Hatalı dosya (hata mesajını gösterir)

---- 📁 **Klasör yolu**: Dosyanın hangi klasörden geldiğini gösterir

- ☑️ **Checkbox**: Export'a dahil edilip edilmeyeceğini belirler

## 📦 Project Structure

#### **İlerleme Çubuğu**

```İşlem sırasında gösterilen bilgiler:

Project4/- **Durum**: Processing/Completed/Error

├── src/- **İlerleme**: Kaç dosyanın işlendiği (ör: 15/50)

│   ├── components/         # React components- **Mesaj**: Şu anda ne yapıldığı

│   ├── types/             # TypeScript definitions- **Reset Butonu**: İşlemi iptal etme (kırmızı)

│   ├── utils/             # Helper functions

│   └── workers/           # Web Workers#### **Debug Panel** (Geliştirici Modu)

├── deployment/"Show Debug" butonuna tıklayarak:

│   ├── scraper/           # Server deployment configs- **Memory**: Bellek kullanımı

│   └── landing-page/      # Landing page files- **Files**: Toplam dosya sayısı  

├── scripts/- **Status**: Sistem durumu

│   └── analyze_logs.ps1   # Log analysis tool- **Mode**: İşleme modu

├── docs/- **Export Logs**: Log dosyasını indir

│   └── LOG_MANAGEMENT_GUIDE.md- **Clear Metrics**: Performans verilerini temizle

└── test-data/             # Sample JSON files

```---



---## 📁 Örnek Kullanım Senaryoları



## 🔧 Configuration### 🏢 **E-ticaret Verileri**

```json

### Processing Config// products.json

{

```typescript  "product_id": "P001",

{  "name": "Laptop",

  delimiter: '_',           // Field separator  "specs": {

  maxDepth: 10,            // Max nesting depth    "cpu": "Intel i7",

  arrayMode: 'explode',    // 'explode' | 'join' | 'first'    "ram": "16GB"

  batchSize: 100,          // Files per batch  }

  maxFileSize: 10485760    // 10MB max per file}

}```

```**Sonuç Excel**: `product_id | name | specs_cpu | specs_ram`



### Docker Deployment### 👥 **Kullanıcı Profilleri**  

```json

```yaml// users.json

version: '3.8'{

services:  "name": "John Doe",

  json2excel:  "profile": {

    image: nginx:alpine    "age": 30,

    container_name: json2excel-static    "interests": ["coding", "music"]

    ports:  }

      - "8091:80"}

    volumes:```

      - ./out:/usr/share/nginx/html:ro**Array Mode=Join**: `interests` → `"coding; music"`  

    restart: unless-stopped**Array Mode=Explode**: `interests_0` → `"coding"`, `interests_1` → `"music"`

    logging:

      driver: "json-file"### 🗂️ **Klasör Yapısı**

      options:```

        max-size: "10m"data/

        max-file: "3"├── 2023/

```│   ├── january.json

│   └── february.json

---└── 2024/

    ├── march.json

## 📊 Example    └── april.json

```

### Input JSON**Folder-Based Export**: `folder_2023.xlsx`, `folder_2024.xlsx` dosyaları oluşur



```json---

[

  {## ⚡ Performans İpuçları

    "id": 1,

    "name": "Product A",### 🎯 **Büyük Dosyalar İçin**

    "price": 99.99,- **Single Sheet Export** kullanın

    "tags": ["electronics", "sale"],- **Max Depth**'i düşük tutun (5-8)

    "details": {- **Array Mode**'u "Join" olarak ayarlayın

      "weight": "1.5kg",- Debug panel'den bellek kullanımını takip edin

      "color": "black"

    }### 🚀 **Hızlı İşleme İçin**

  }- Gereksiz dosyaları seçimden çıkarın

]- Karmaşık JSON yapıları için **Delimiter**'ı `_` olarak kullanın

```- CSV export'u Excel export'undan daha hızlıdır



### Output Excel### 💾 **Bellek Yönetimi**

- Uygulama otomatik olarak belleği optimize eder

| id | name | price | tags_0 | tags_1 | details_weight | details_color |- 50MB+ dosyalar için batch işleme devreye girer

|----|------|-------|--------|--------|----------------|---------------|- Tarayıcı belleği dolduğunda otomatik temizlik yapılır

| 1 | Product A | 99.99 | electronics | sale | 1.5kg | black |

---

---

## 🔧 Teknik Özellikler

## 🔒 Security & Privacy

### 🏗️ **Teknoloji Stack**

- ✅ **100% Client-Side** - No data sent to servers- **Frontend**: Next.js 14 + TypeScript

- ✅ **No Tracking** - Zero analytics or tracking- **Styling**: Tailwind CSS

- ✅ **Local Processing** - Everything in your browser- **Excel**: xlsx kütüphanesi

- ✅ **No Storage** - Files never saved on server- **Export**: Özel CSV generator



---### 📊 **Desteklenen Formatlar**

- **Giriş**: JSON (.json), Text (.txt)

## 📝 Logging & Monitoring- **Çıkış**: Excel (.xlsx), CSV (.csv), Clipboard



### Application Logs### ⚙️ **Gelişmiş Özellikler**

- Web Workers ile arka plan işleme

Built-in enterprise logging:- Adaptif bellek yönetimi

- Console logs for debugging- Hata yakalama ve kurtarma

- Performance metrics (memory, time, file counts)- Performans izleme

- Error tracking with stack traces- Otomatik veri validasyonu

- User action tracking

---

### Server Logs (Raspberry Pi)

## 🐛 Sorun Giderme

**Automatic Log Rotation:**

```bash### ❗ **Yaygın Hatalar**

# Runs daily at 2 AM via cron

0 2 * * * /opt/scraper/scripts/master_log_rotation.sh#### **"Processing failed" Hatası**

```- JSON formatınızı kontrol edin

- Dosya boyutunu azaltmayı deneyin

**Analyze Logs:**- Max Depth değerini düşürün

```powershell

# PowerShell log analyzer#### **"Memory limit exceeded" Hatası**

.\scripts\analyze_logs.ps1 -Service all -Download -Summary- Daha az dosya seçin

```- Tarayıcı sekmelerini kapatın

- Array Mode'u "Join" yapın

See [LOG_MANAGEMENT_GUIDE.md](docs/LOG_MANAGEMENT_GUIDE.md) for details.

#### **"No data to export" Uyarısı**

---- En az bir dosya seçili olduğundan emin olun

- Dosyaların başarıyla işlendiğini kontrol edin

## 🛠️ Troubleshooting- JSON formatının geçerli olduğunu doğrulayın



### Large Files Timeout### 🔄 **Performans Sorunları**

```typescript- **Yavaş işleme**: Batch size'ı artırın

// Reduce batch size- **Tarayıcı donması**: Daha küçük dosya grupları kullanın  

config.batchSize = 50;- **Export hatası**: Disk alanınızı kontrol edin

```

---

### Memory Issues

```typescript## 🎓 Gelişmiş Kullanım

// Enable aggressive memory management

memoryManager.setAggressiveMode(true);### 🔧 **Özel Yapılandırmalar**

```

#### **Karmaşık JSON Yapıları**

### Debug Mode```json

```javascript{

localStorage.setItem('debug', 'true');  "user": {

// Reload page    "personal": {

```      "contact": {

        "emails": ["work@example.com", "personal@example.com"]

---      }

    }

## 📄 License  }

}

**AGPL v3** - GNU Affero General Public License v3.0```

- **Delimiter**: `_` 

- ✅ Free to use, modify, and distribute- **Max Depth**: `15`

- ✅ Must share source code if deployed publicly- **Array Mode**: `join`

- ✅ Must license derivatives under AGPL- **Sonuç**: `user_personal_contact_emails` → `"work@example.com; personal@example.com"`

- ❌ No warranty provided

#### **API Response Yapıları**

For commercial licensing, contact: support@devtestenv.org```json

{

---  "status": "success",

  "data": [

## 🤝 Contributing    {"id": 1, "name": "Item 1"},

    {"id": 2, "name": "Item 2"}

1. Fork the repository  ],

2. Create feature branch (`git checkout -b feature/amazing`)  "meta": {

3. Commit changes (`git commit -m 'Add feature'`)    "total": 2,

4. Push branch (`git push origin feature/amazing`)    "page": 1

5. Open Pull Request  }

}

---```

- **Delimiter**: `.`

## 🎉 Changelog- **Array Mode**: `explode`

- **Sonuç**: `data.0.id`, `data.0.name`, `data.1.id`, `data.1.name`

### v2.0.0 (November 2025)

- ✨ Bulk Processing Mode (90+ files)### 📈 **Toplu İşlem Stratejileri**

- ✨ Folder upload with structure preservation

- ✨ Enterprise logging system#### **50+ Dosya İçin**

- ✨ Memory management optimization1. "Single Sheet Export" kullanın

- ✨ PowerShell log analyzer2. İlerleme çubuğunu takip edin

- 🐛 Fixed: Column mixing with system fields3. Batch dosyaları otomatik oluşur

- 🐛 Fixed: Excel export debug data leak4. Her batch için ayrı Excel dosyası

- ⚡ Improved: Large dataset performance

#### **Klasör Yapısını Korumak İçin**

### v1.0.0 (October 2025)1. "Upload Folders" ile yükleyin

- 🎉 Initial release2. "Folder-Based Export" seçin

- ✅ JSON to Excel conversion3. Her klasör ayrı Excel olur

- ✅ PWA support4. Orijinal yapı korunur

- ✅ Responsive design

---

---

## 🔄 Güncellemeler

## 📞 Support

### **v0.1.0 - İlk Sürüm**

- **Issues**: [GitHub Issues](https://github.com/Xtra01/json-to-excel-converter/issues)- ✅ Temel JSON to Excel dönüştürme

- **Email**: support@devtestenv.org- ✅ Toplu dosya işleme

- ✅ Klasör yapısı desteği

---- ✅ Gelişmiş yapılandırma seçenekleri

- ✅ CSV export desteği

## 🙏 Credits- ✅ Performans optimizasyonları

- ✅ Hata yakalama ve raporlama

- **Next.js** - React framework

- **XLSX** - Excel generation---

- **Tailwind CSS** - Styling

- **TypeScript** - Type safety## 🤝 Katkıda Bulunma



---Bu proje açık kaynak kodlu ve geliştirmeye açıktır. Katkıda bulunmak isterseniz:



**Live Demo:** [https://json2excel.devtestenv.org](https://json2excel.devtestenv.org)1. Repository'yi fork edin

2. Yeni branch oluşturun (`git checkout -b feature/amazing-feature`)

**Made with ❤️ by Xtra01**3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)

4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

---

## 📝 Lisans

Bu proje **AGPL v3** + **Dual License** modeliyle lisanslanmıştır:

- 🆓 **Açık Kaynak**: AGPL v3 (ücretsiz, ama türev eserler de açık kaynak olmalı)
- 💼 **Ticari Kullanım**: Ayrı ticari lisans gerekli ($299-$1999)

Detaylar için `LICENSE.md` dosyasına bakın.

---

## 📁 Project Structure

```
json-to-excel-converter/
├── src/                    # Application source code
├── public/                 # Static assets
├── docs/                   # 📚 All documentation
│   ├── setup-guides/       # Installation & setup
│   ├── deployment/         # Deployment & config
│   ├── system-reports/     # System analysis
│   └── troubleshooting/    # Issue resolution
├── config/                 # Configuration examples
├── test-data/              # Sample test files
└── raspberry-pi-backup/    # Pi automation scripts
```

**📚 Documentation**: All documentation is now organized in the [`docs/`](docs/) directory. See [`docs/README.md`](docs/README.md) for complete index.

---

## 📞 Deployment

Bu uygulama Docker ile kolayca deploy edilebilir. Detaylı deployment rehberi için:

- 📋 **Deployment Guide**: [`docs/deployment/DEPLOYMENT_GUIDE.md`](docs/deployment/DEPLOYMENT_GUIDE.md)
- 🍓 **Raspberry Pi Setup**: [`docs/setup-guides/RASPBERRY_PI_KURULUM_REHBERI.md`](docs/setup-guides/RASPBERRY_PI_KURULUM_REHBERI.md)
- 🔐 **Security Guide**: [`docs/deployment/SECURITY.md`](docs/deployment/SECURITY.md)
- 📖 **Usage Guide**: [`docs/setup-guides/KULLANIM_REHBERI.md`](docs/setup-guides/KULLANIM_REHBERI.md)

### Hızlı Başlangıç

```bash
# Repository'yi klonlayın
git clone https://github.com/Xtra01/json-to-excel-converter.git
cd json-to-excel-converter

# Example dosyalarından production config oluşturun
cp config/docker-compose.example.yml docker-compose.yml
cp config/nginx.conf.example nginx.conf
cp config/.env.example .env

# Ayarları düzenleyin
nano docker-compose.yml
nano nginx.conf
nano .env

# Uygulamayı başlatın
docker compose up -d
```

**🌐 Live Demo**: https://devtestenv.org

## �📞 Destek

Sorunlarınız veya önerileriniz için:
- Issue açın: GitHub Issues
- Dokümantasyon: Bu README dosyası
- Security: `SECURITY.md` dosyasına bakın

---

**💡 İpucu**: Bu uygulamayı daha verimli kullanmak için önce küçük test dosyalarıyla deneyin, sonra büyük veri setlerinizi işleyin. Debug panel'i açık tutarak sistem performansını izleyebilirsiniz.