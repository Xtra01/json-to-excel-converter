# JSON to Excel Converter 📊

**Profesyonel JSON verilerini Excel ve CSV formatlarına dönüştüren güçlü web uygulaması**

---

## 🚀 Ne İşe Yarar?

Bu uygulama JSON formatındaki verilerinizi hızlı ve etkili bir şekilde Excel (XLSX) ve CSV dosyalarına dönüştürür. Özellikle büyük veri setleri ve karmaşık JSON yapıları ile çalışırken işinizi kolaylaştıran gelişmiş özellikler sunar.

### ✨ Ana Özellikler

- **🗂️ Toplu Dosya İşleme**: Aynı anda yüzlerce JSON dosyasını işleyebilir
- **📁 Klasör Desteği**: Tüm klasör yapısını koruyarak dosyaları organize eder
- **⚙️ Gelişmiş Yapılandırma**: JSON'un nasıl düzleştirileceğini kontrol edebilirsiniz
- **🔄 Array İşleme Modları**: Dizileri istediğiniz şekilde işleyebilirsiniz
- **📈 Gerçek Zamanlı İlerleme**: İşlem sırasında detaylı ilerleme takibi
- **💾 Çoklu Export Seçenekleri**: Excel, CSV ve panoya kopyalama desteği
- **🎯 Akıllı Performans**: Büyük dosyalar için optimize edilmiş işleme

---

## 🎯 Hızlı Başlangıç

### 1. Dosya Yükleme
Uygulamayı açtığınızda karşınıza çıkan ana ekranda iki seçenek var:

#### 📁 **Çoklu Dosya Seçimi**
- Sol taraftaki "Multiple Files" butonuna tıklayın
- JSON veya TXT dosyalarınızı seçin (Ctrl+Click ile çoklu seçim)
- Dosyalar otomatik olarak işlenecek

#### 🗂️ **Klasör Yükleme**  
- Sağ taraftaki "Upload Folders" butonuna tıklayın
- Tüm klasör yapısını seçin
- Alt klasörler dahil tüm JSON dosyaları işlenecek

### 2. Ayarlar Yapılandırması
Dosyalarınız yüklendikten sonra "Settings" bölümünde:

#### **Delimiter (Ayırıcı)**
- JSON'daki iç içe alanları nasıl ayıracağını belirler
- Örnek: `user.profile.name` → `user_profile_name` 
- **Varsayılan**: `_` (alt çizgi)

#### **Max Depth (Maksimum Derinlik)**
- JSON'da kaç seviye derine ineceğini belirler
- **Varsayılan**: `10` seviye
- **Önerilen**: Karmaşık JSON'lar için 15, basit yapılar için 5

#### **Array Mode (Dizi İşleme Modu)**
- **Explode**: Her dizi elemanı ayrı sütun olur (`item_0`, `item_1`, ...)
- **Join**: Tüm elemanlar tek sütunda birleşir (`"item1; item2; item3"`)  
- **First**: Sadece ilk eleman alınır

#### **Sheet Name (Sayfa Adı)**
- Excel'de oluşturulacak sayfa adını belirler
- **Varsayılan**: `data`

---

## 📊 Export Seçenekleri

### 🔵 **Single Sheet Export** (Tek Sayfa)
- Tüm verileri tek Excel sayfasında birleştirir
- Kaynak dosya bilgilerini otomatik ekler
- **En uygun**: 50+ dosya için

### 🟢 **Folder-Based Export** (Klasör Bazlı)
- Her klasör için ayrı Excel dosyası oluşturur
- Orijinal klasör yapısını korur
- **En uygun**: Organize edilmiş veriler için

### 🟡 **CSV Export**
- Hafif ve hızlı dışa aktarım
- Tüm tablo uygulamalarında açılabilir
- **En uygun**: Veri analizi için

### 🟣 **Copy to Clipboard** (Panoya Kopyala)
- Verileri doğrudan Excel'e yapıştırabilirsiniz
- Tab ile ayrılmış format
- **En uygun**: Hızlı veri transferi için

---

## 🛠️ Arayüz Rehberi

### 📋 **Ana Kontroller**

#### **Dosya Listesi**
- ✅ **Yeşil tik**: Başarıyla işlenen dosya (satır sayısı gösterir)
- ❌ **Kırmızı X**: Hatalı dosya (hata mesajını gösterir)
- 📁 **Klasör yolu**: Dosyanın hangi klasörden geldiğini gösterir
- ☑️ **Checkbox**: Export'a dahil edilip edilmeyeceğini belirler

#### **İlerleme Çubuğu**
İşlem sırasında gösterilen bilgiler:
- **Durum**: Processing/Completed/Error
- **İlerleme**: Kaç dosyanın işlendiği (ör: 15/50)
- **Mesaj**: Şu anda ne yapıldığı
- **Reset Butonu**: İşlemi iptal etme (kırmızı)

#### **Debug Panel** (Geliştirici Modu)
"Show Debug" butonuna tıklayarak:
- **Memory**: Bellek kullanımı
- **Files**: Toplam dosya sayısı  
- **Status**: Sistem durumu
- **Mode**: İşleme modu
- **Export Logs**: Log dosyasını indir
- **Clear Metrics**: Performans verilerini temizle

---

## 📁 Örnek Kullanım Senaryoları

### 🏢 **E-ticaret Verileri**
```json
// products.json
{
  "product_id": "P001",
  "name": "Laptop",
  "specs": {
    "cpu": "Intel i7",
    "ram": "16GB"
  }
}
```
**Sonuç Excel**: `product_id | name | specs_cpu | specs_ram`

### 👥 **Kullanıcı Profilleri**  
```json
// users.json
{
  "name": "John Doe",
  "profile": {
    "age": 30,
    "interests": ["coding", "music"]
  }
}
```
**Array Mode=Join**: `interests` → `"coding; music"`  
**Array Mode=Explode**: `interests_0` → `"coding"`, `interests_1` → `"music"`

### 🗂️ **Klasör Yapısı**
```
data/
├── 2023/
│   ├── january.json
│   └── february.json
└── 2024/
    ├── march.json
    └── april.json
```
**Folder-Based Export**: `folder_2023.xlsx`, `folder_2024.xlsx` dosyaları oluşur

---

## ⚡ Performans İpuçları

### 🎯 **Büyük Dosyalar İçin**
- **Single Sheet Export** kullanın
- **Max Depth**'i düşük tutun (5-8)
- **Array Mode**'u "Join" olarak ayarlayın
- Debug panel'den bellek kullanımını takip edin

### 🚀 **Hızlı İşleme İçin**
- Gereksiz dosyaları seçimden çıkarın
- Karmaşık JSON yapıları için **Delimiter**'ı `_` olarak kullanın
- CSV export'u Excel export'undan daha hızlıdır

### 💾 **Bellek Yönetimi**
- Uygulama otomatik olarak belleği optimize eder
- 50MB+ dosyalar için batch işleme devreye girer
- Tarayıcı belleği dolduğunda otomatik temizlik yapılır

---

## 🔧 Teknik Özellikler

### 🏗️ **Teknoloji Stack**
- **Frontend**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS
- **Excel**: xlsx kütüphanesi
- **Export**: Özel CSV generator

### 📊 **Desteklenen Formatlar**
- **Giriş**: JSON (.json), Text (.txt)
- **Çıkış**: Excel (.xlsx), CSV (.csv), Clipboard

### ⚙️ **Gelişmiş Özellikler**
- Web Workers ile arka plan işleme
- Adaptif bellek yönetimi
- Hata yakalama ve kurtarma
- Performans izleme
- Otomatik veri validasyonu

---

## 🐛 Sorun Giderme

### ❗ **Yaygın Hatalar**

#### **"Processing failed" Hatası**
- JSON formatınızı kontrol edin
- Dosya boyutunu azaltmayı deneyin
- Max Depth değerini düşürün

#### **"Memory limit exceeded" Hatası**
- Daha az dosya seçin
- Tarayıcı sekmelerini kapatın
- Array Mode'u "Join" yapın

#### **"No data to export" Uyarısı**
- En az bir dosya seçili olduğundan emin olun
- Dosyaların başarıyla işlendiğini kontrol edin
- JSON formatının geçerli olduğunu doğrulayın

### 🔄 **Performans Sorunları**
- **Yavaş işleme**: Batch size'ı artırın
- **Tarayıcı donması**: Daha küçük dosya grupları kullanın  
- **Export hatası**: Disk alanınızı kontrol edin

---

## 🎓 Gelişmiş Kullanım

### 🔧 **Özel Yapılandırmalar**

#### **Karmaşık JSON Yapıları**
```json
{
  "user": {
    "personal": {
      "contact": {
        "emails": ["work@example.com", "personal@example.com"]
      }
    }
  }
}
```
- **Delimiter**: `_` 
- **Max Depth**: `15`
- **Array Mode**: `join`
- **Sonuç**: `user_personal_contact_emails` → `"work@example.com; personal@example.com"`

#### **API Response Yapıları**
```json
{
  "status": "success",
  "data": [
    {"id": 1, "name": "Item 1"},
    {"id": 2, "name": "Item 2"}
  ],
  "meta": {
    "total": 2,
    "page": 1
  }
}
```
- **Delimiter**: `.`
- **Array Mode**: `explode`
- **Sonuç**: `data.0.id`, `data.0.name`, `data.1.id`, `data.1.name`

### 📈 **Toplu İşlem Stratejileri**

#### **50+ Dosya İçin**
1. "Single Sheet Export" kullanın
2. İlerleme çubuğunu takip edin
3. Batch dosyaları otomatik oluşur
4. Her batch için ayrı Excel dosyası

#### **Klasör Yapısını Korumak İçin**
1. "Upload Folders" ile yükleyin
2. "Folder-Based Export" seçin
3. Her klasör ayrı Excel olur
4. Orijinal yapı korunur

---

## 🔄 Güncellemeler

### **v0.1.0 - İlk Sürüm**
- ✅ Temel JSON to Excel dönüştürme
- ✅ Toplu dosya işleme
- ✅ Klasör yapısı desteği
- ✅ Gelişmiş yapılandırma seçenekleri
- ✅ CSV export desteği
- ✅ Performans optimizasyonları
- ✅ Hata yakalama ve raporlama

---

## 🤝 Katkıda Bulunma

Bu proje açık kaynak kodlu ve geliştirmeye açıktır. Katkıda bulunmak isterseniz:

1. Repository'yi fork edin
2. Yeni branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

---

## 📝 Lisans

Bu proje **AGPL v3** + **Dual License** modeliyle lisanslanmıştır:

- 🆓 **Açık Kaynak**: AGPL v3 (ücretsiz, ama türev eserler de açık kaynak olmalı)
- 💼 **Ticari Kullanım**: Ayrı ticari lisans gerekli ($299-$1999)

Detaylar için `LICENSE.md` dosyasına bakın.

---

## � Deployment

Bu uygulama Docker ile kolayca deploy edilebilir. Detaylı deployment rehberi için:

- 📋 **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- 🍓 **Raspberry Pi Setup**: `RASPBERRY_PI_KURULUM_REHBERI.md`
- 🔐 **Security Guide**: `SECURITY.md`
- 📖 **Usage Guide**: `KULLANIM_REHBERI.md`

### Hızlı Başlangıç

```bash
# Repository'yi klonlayın
git clone https://github.com/your-username/json-to-excel-converter.git
cd json-to-excel-converter

# Example dosyalarından production config oluşturun
cp docker-compose.example.yml docker-compose.yml
cp nginx.conf.example nginx.conf

# Ayarları düzenleyin
nano docker-compose.yml
nano nginx.conf

# Uygulamayı başlatın
docker compose up -d
```

## �📞 Destek

Sorunlarınız veya önerileriniz için:
- Issue açın: GitHub Issues
- Dokümantasyon: Bu README dosyası
- Security: `SECURITY.md` dosyasına bakın

---

**💡 İpucu**: Bu uygulamayı daha verimli kullanmak için önce küçük test dosyalarıyla deneyin, sonra büyük veri setlerinizi işleyin. Debug panel'i açık tutarak sistem performansını izleyebilirsiniz.