# 📚 JSON to Excel Converter - Kullanım Rehberi

**🎯 Baştan sona kolay anlaşılır kullanım kılavuzu**

---

## 🌟 Hoş Geldiniz!

Bu rehber size JSON to Excel Converter uygulamasını nasıl kullanacağınızı adım adım gösterecek. Her şey çok basit ve kullanıcı dostu! 😊

---

## 🚀 İlk Adımlar

### 1️⃣ **Uygulamaya Giriş**

🌐 **Web Tarayıcınızda** şu adresi açın: [https://devtestenv.org](https://devtestenv.org)

Karşınıza böyle bir ekran çıkacak:
```
📊 JSON to Excel Converter
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 Multiple Files    🟢 Upload Folders
   [Dosya Seç]        [Klasör Seç]
```

### 2️⃣ **Ne Yapmak İstiyorsunuz?**

İki farklı yöntem var:

| 🔵 **Tek Tek Dosyalar** | 🟢 **Tüm Klasör** |
|--------------------------|-------------------|
| • Belirli dosyalar seçmek | • Klasör yapısını korumak |
| • Hızlı işlem | • Organize veri |
| • 5-10 dosya için ideal | • 50+ dosya için ideal |

---

## 📁 Yöntem 1: Tek Tek Dosya Seçimi

### Adım 1: Dosyaları Seçin 📋
1. **"Multiple Files"** butonuna tıklayın 🔵
2. Açılan pencerede JSON dosyalarınızı seçin
3. **Çoklu seçim için**: `Ctrl` tuşuna basılı tutup dosyalara tıklayın
4. **"Aç"** butonuna tıklayın

```
💡 İpucu: JSON (.json) ve TXT (.txt) dosyaları desteklenir
```

### Adım 2: Dosya Listesini Kontrol Edin ✅
Yüklenen dosyalar şöyle görünecek:

```
📄 users.json          ✅ (150 rows)     ☑️
📄 products.json       ✅ (87 rows)      ☑️
📄 broken.json         ❌ (Invalid JSON) ☐
```

**Anlamları:**
- ✅ = Başarıyla işlendi
- ❌ = Hata var (JSON formatı bozuk)
- ☑️ = Export'a dahil edilecek
- ☐ = Export'a dahil edilmeyecek

### Adım 3: Ayarları Yapın ⚙️
**"Settings"** bölümünü açın:

#### 🔤 **Delimiter (Ayırıcı)**
JSON'daki iç içe alanları nasıl birleştireceğinizi belirler:

```json
// Örnek JSON:
{
  "user": {
    "profile": {
      "name": "Ahmet"
    }
  }
}
```

| Delimiter | Sonuç |
|-----------|--------|
| `_` (varsayılan) | `user_profile_name` |
| `.` | `user.profile.name` |
| `-` | `user-profile-name` |

#### 🔢 **Max Depth (Derinlik)**
JSON'da kaç seviye derine ineceğinizi belirler:

```
🥇 Basit JSON'lar: 5 seviye
🥈 Normal veriler: 10 seviye (varsayılan)  
🥉 Karmaşık API'ler: 15 seviye
```

#### 📊 **Array Mode (Dizi İşleme)**
Dizileri nasıl işleyeceğinizi seçin:

```json
// Örnek: "hobbies": ["okuma", "spor", "müzik"]
```

| Mode | Sonuç | Ne Zaman Kullanılır |
|------|--------|-------------------|
| **Explode** | `hobbies_0: okuma`<br>`hobbies_1: spor`<br>`hobbies_2: müzik` | Detaylı analiz için |
| **Join** | `hobbies: okuma; spor; müzik` | Genel görünüm için |  
| **First** | `hobbies: okuma` | Sadece ilk eleman önemli |

---

## 🗂️ Yöntem 2: Klasör Yükleme

### Adım 1: Klasör Seçin 📂
1. **"Upload Folders"** butonuna tıklayın 🟢
2. İstediğiniz klasörü seçin
3. **Alt klasörler** de otomatik dahil edilir

```
📁 veriler/
├── 📁 2023/
│   ├── 📄 ocak.json
│   └── 📄 subat.json
└── 📁 2024/
    ├── 📄 mart.json
    └── 📄 nisan.json
```

### Adım 2: Klasör Yapısını İnceleyin 🔍
Yüklenen dosyalar klasör yolları ile gösterilir:

```
📁 veriler/2023/ocak.json     ✅ (45 rows)
📁 veriler/2023/subat.json    ✅ (52 rows)
📁 veriler/2024/mart.json     ✅ (38 rows)
📁 veriler/2024/nisan.json    ✅ (41 rows)
```

---

## 💾 Export İşlemi

Artık verilerinizi dışa aktarma zamanı! 4 farklı seçeneğiniz var:

### 🔵 **Single Sheet Export** (Tek Sayfa)
**En popüler seçenek!** 🌟

✅ **Ne yapar:**
- Tüm dosyaları tek Excel'de birleştirir
- Her satırda kaynak dosya bilgisi eklenir
- Tüm veriler tek sayfada düzenlenir

👍 **Ne zaman kullanılır:**
- 10+ dosyanız var
- Genel analiz yapmak istiyorsunuz
- Tüm verileri birlikte görmek istiyorsunuz

```
📊 Sonuç Örneği:
| source_file     | user_name | user_age | product_name |
|-----------------|-----------|----------|--------------|
| users.json      | Ahmet     | 25       |              |
| users.json      | Fatma     | 30       |              |
| products.json   |           |          | Laptop       |
```

### 🟢 **Folder-Based Export** (Klasör Bazlı)
**Organize kalmanın yolu!** 📁

✅ **Ne yapar:**
- Her klasör için ayrı Excel dosyası
- Orijinal yapı korunur
- Düzenli ve kategorize veriler

👍 **Ne zaman kullanılır:**
- Klasörlere göre organize veriler
- Ayrı ayrı analiz yapmak istiyorsunuz
- Orijinal yapıyı korumak istiyorsunuz

```
📥 Sonuç:
folder_2023.xlsx    (ocak + şubat verileri)
folder_2024.xlsx    (mart + nisan verileri)
```

### 🟡 **CSV Export** (Hafif Format)
**Hız odaklı seçenek!** ⚡

✅ **Ne yapar:**
- Hafif ve hızlı
- Tüm programlarda açılır
- Büyük veriler için ideal

👍 **Ne zaman kullanılır:**
- Çok büyük veri setleri
- Google Sheets'te çalışacaksınız
- Hızlı transfer gerekiyor

### 🟣 **Copy to Clipboard** (Panoya Kopyala)
**Anlık transfer!** ⚡

✅ **Ne yapar:**
- Verileri kopyalar
- Doğrudan Excel'e yapıştırabilirsiniz
- Dosya indirmeden çalışır

👍 **Ne zaman kullanılır:**
- Hızlı test için
- Küçük veri setleri
- Anlık kullanım

---

## 📈 İlerleme Takibi

İşlem sırasında ekranınızda şunları göreceksiniz:

```
🔄 Processing Files...          75%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Processed: 15/20 files
🕐 Current: analyzing products.json
```

**Göstergeler:**
- 🔄 = İşlem devam ediyor
- ✅ = Başarıyla tamamlandı  
- ❌ = Hata oluştu
- 🕐 = Şu anki durum
- % = Genel ilerleme

---

## 🎯 Pratik Örneler

### Örnek 1: E-ticaret Verileri 🛒

**Senario:** Online mağazanızın ürün ve müşteri verileri var

```json
// products.json
{
  "id": "P001",
  "name": "Gaming Laptop", 
  "category": {
    "main": "Elektronik",
    "sub": "Bilgisayar"
  },
  "specs": {
    "cpu": "Intel i7",
    "ram": "32GB"
  },
  "tags": ["gaming", "high-performance", "rgb"]
}
```

**Önerilen Ayarlar:**
- Delimiter: `_`
- Max Depth: `10`  
- Array Mode: `join` (tag'ler için)

**Sonuç Excel:**
```
| id   | name         | category_main | category_sub | specs_cpu | specs_ram | tags                        |
|------|--------------|---------------|--------------|-----------|-----------|----------------------------|
| P001 | Gaming Laptop| Elektronik    | Bilgisayar   | Intel i7  | 32GB      | gaming; high-performance; rgb |
```

### Örnek 2: Kullanıcı Profilleri 👥

**Senario:** Sosyal medya uygulamanızın kullanıcı verileri

```json
// users.json
{
  "username": "ahmet123",
  "profile": {
    "personal": {
      "age": 28,
      "city": "İstanbul"
    },
    "social": {
      "followers": 1250,
      "following": 89
    }
  },
  "interests": ["teknoloji", "spor", "seyahat"]
}
```

**Önerilen Ayarlar:**
- Delimiter: `_`
- Array Mode: `explode` (ilgi alanları detaylı analiz için)

**Sonuç Excel:**
```
| username | profile_personal_age | profile_personal_city | profile_social_followers | interests_0 | interests_1 | interests_2 |
|----------|---------------------|----------------------|-------------------------|-------------|-------------|-------------|
| ahmet123 | 28                  | İstanbul             | 1250                    | teknoloji   | spor        | seyahat     |
```

### Örnek 3: API Yanıt Verileri 🌐

**Senario:** REST API'den gelen karmaşık veriler

```json
// api_response.json
{
  "status": "success",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "user": {
      "id": 12345,
      "profile": {
        "name": "Fatma Yılmaz",
        "contacts": {
          "emails": ["fatma@email.com", "work@company.com"],
          "phones": ["+90555123456", "+90212987654"]
        }
      }
    },
    "metadata": {
      "source": "mobile_app",
      "version": "2.1.4"
    }
  }
}
```

**Önerilen Ayarlar:**
- Delimiter: `.` (API yapısı için)
- Max Depth: `15` (çok derinlik var)
- Array Mode: `join` (iletişim bilgileri için)

---

## 🔧 Debug ve Sorun Giderme

### Debug Panel Açma 🕵️
**"Show Debug"** butonuna tıklayın:

```
🖥️ System Status
━━━━━━━━━━━━━━━━
💾 Memory: 145.2MB / 2GB
📁 Files: 15 processed
✅ Status: All systems operational  
⚙️ Mode: Bulk processing active

🔧 Actions:
[Export Logs] [Clear Metrics] [Reset System]
```

### Yaygın Sorunlar ve Çözümler 🚨

#### ❌ **"Processing failed" Hatası**

**Neden olabilir:**
- JSON formatı bozuk
- Dosya çok büyük  
- Bellek yetersiz

**Çözümler:**
```
1️⃣ JSON formatını kontrol edin:
   • Parantezler kapalı mı?
   • Virgüller doğru yerde mi?
   • Tırnak işaretleri eşleşiyor mu?

2️⃣ Dosya boyutunu azaltın:
   • 10MB üstü dosyaları bölin
   • Gereksiz alanları temizleyin

3️⃣ Ayarları değiştirin:
   • Max Depth: 5'e düşürün
   • Array Mode: "first" yapın
```

#### ⚠️ **"Memory limit exceeded" Uyarısı**

**Çözümler:**
```
1️⃣ Daha az dosya seçin (maksimum 20)
2️⃣ Tarayıcı sekmelerini kapatın
3️⃣ Array Mode: "join" yapın
4️⃣ Sayfayı yenileyin (F5)
```

#### 📤 **Export Çalışmıyor**

**Kontrol Listesi:**
```
☑️ En az 1 dosya seçili mi?
☑️ Dosyalar başarıyla işlendi mi? (✅)
☑️ Tarayıcı pop-up'ları engelliyor mu?
☑️ Disk alanınız yeterli mi?
```

---

## 💡 Pro İpuçları

### ⚡ **Performans İpuçları**

1️⃣ **Büyük Veri Setleri İçin:**
```
• Single Sheet Export kullanın
• Max Depth: 8 ve altında tutun  
• Array Mode: "join" seçin
• 50 dosyadan fazlasını tek seferde işlemeyin
```

2️⃣ **Hız İçin:**
```
• Gereksiz dosyaları seçimden çıkarın
• CSV export Excel'den daha hızlıdır
• Debug panel'i kapalı tutun
```

3️⃣ **Kalite İçin:**
```
• JSON dosyalarınızı önce validate edin
• Delimiter olarak "_" kullanın
• Test dosyalarıyla deneme yapın
```

### 🎨 **Organizasyon İpuçları**

**Dosya İsimlendirme:**
```
✅ İyi: users_2024_january.json
✅ İyi: products_elektronik_kategori.json
❌ Kötü: data1.json, temp.json
```

**Klasör Yapısı:**
```
📁 proje_verileri/
├── 📁 kullanicilar/
│   ├── 2023_data.json
│   └── 2024_data.json
├── 📁 urunler/
│   ├── elektronik.json
│   └── giyim.json
└── 📁 siparisler/
    └── monthly_orders.json
```

---

## 🎓 İleri Seviye Kullanım

### 🔬 **Karmaşık JSON Yapıları**

**Çok Derinlikli Yapılar:**
```json
{
  "company": {
    "departments": {
      "it": {
        "teams": {
          "frontend": {
            "members": [
              {
                "name": "Ali",
                "skills": ["React", "Vue", "Angular"]
              }
            ]
          }
        }
      }
    }
  }
}
```

**Önerilen Strateji:**
```
1️⃣ İlk önce Max Depth: 5 ile test edin
2️⃣ Sonucu inceleyin, eksik veri var mı?
3️⃣ Gerekirse Max Depth'i artırın
4️⃣ Array Mode'u "explode" yapın (detaylı analiz için)
```

### 🔄 **Batch İşleme Stratejisi**

**50+ Dosya İçin:**
```
🥇 1. Grup: İlk 25 dosya → Test ve sonuç kontrolü
🥈 2. Grup: Sonraki 25 dosya → Ayarları optimize edin  
🥉 3. Grup: Kalan dosyalar → Final export
```

**100+ Dosya İçin:**
```
📊 Single Sheet Export ZORUNLU
⚙️ Max Depth: 6 maksimum
📱 Array Mode: "join" önerilir
💾 Bellek kullanımını takip edin
```

---

## 🎯 Gerçek Hayat Senaryoları

### 📊 **Veri Analisti**
**Durum:** Günlük rapor verileri analiz etmek istiyorsunuz

```
1️⃣ Klasör yükleme ile aylık verileri alın
2️⃣ Folder-Based Export ile aylara göre ayırın
3️⃣ Her ay için ayrı Excel analizi yapın
4️⃣ Pivot tablolar oluşturun
```

### 💼 **İş Geliştirme Uzmanı**  
**Durum:** CRM sisteminden müşteri verilerini analiz etmek

```
1️⃣ Multiple Files ile müşteri JSON'larını seçin
2️⃣ Array Mode: "explode" (detaylı iletişim bilgileri)
3️⃣ Single Sheet Export (tüm müşteriler birlikte)
4️⃣ Excel'de filtreleme ve segmentasyon
```

### 🏪 **E-ticaret Yöneticisi**
**Durum:** Ürün katalog verilerini güncelleme

```
1️⃣ Klasör yükleme (kategori klasörleri)  
2️⃣ Delimiter: "_" (temiz sütun isimleri)
3️⃣ Folder-Based Export (kategori bazlı Excel'ler)
4️⃣ Her kategori için ayrı güncelleme planı
```

---

## 📱 Mobil Kullanım

### 📲 **Tablet ve Telefon İpuçları**

**Dosya Seçimi:**
```
📁 Tablet: Normal kullanım, tüm özellikler çalışır
📱 Telefon: Küçük dosyalar önerin (5MB altı)
```

**Interface Uyumu:**
```
✅ Tüm butonlar dokunmaya optimize
✅ Drag & drop destekleniyor
✅ İlerleme çubukları mobil uyumlu
```

**Performans:**
```
📱 Telefon: Maximum 10 dosya
📲 Tablet: Maximum 30 dosya  
💾 Bellek kullanımı otomatik optimize
```

---

## 🔐 Güvenlik ve Gizlilik

### 🛡️ **Verileriniz Güvende**

```
✅ Tüm işlemler tarayıcınızda yapılır
✅ Veriler sunucuya gönderilmez
✅ İşlem bittikten sonra otomatik temizlenir
✅ HTTPS şifreleme aktif
```

**Öneriler:**
```
🔒 Hassas veriler için VPN kullanın
🔒 İşlem bittikten sonra tarayıcı geçmişini temizleyin
🔒 Shared bilgisayarlarda "Private/Incognito" mode kullanın
```

---

## 🆘 Acil Durum Rehberi

### 🚨 **Tarayıcı Dondu**

**Adımlar:**
```
1️⃣ Sakin olun, veri kaybı yok
2️⃣ Ctrl+Shift+Esc → Task Manager
3️⃣ Tarayıcı process'ini "End Task"
4️⃣ Tarayıcıyı yeniden başlatın
5️⃣ Uygulamaya geri dönün
```

### ⚠️ **Export Başarısız**

**Hızlı Çözüm:**
```
1️⃣ Daha az dosya seçin (yarıya indirin)
2️⃣ CSV Export deneyin (daha hafif)
3️⃣ Sayfayı yenileyin (F5)
4️⃣ Yeniden deneyin
```

### 💽 **Disk Alanı Yetersiz**

**Çözümler:**
```
1️⃣ Temp dosyaları temizleyin
2️⃣ İndirilenler klasörünü boşaltın  
3️⃣ Copy to Clipboard kullanın (dosya oluşturmaz)
4️⃣ Küçük batch'ler halinde işleyin
```

---

## 🏆 Başarı İpuçları

### ⭐ **Mükemmel Sonuçlar İçin**

```
🎯 Hedef belirleme: Ne analiz edeceksiniz?
📋 Veri hazırlığı: JSON'ları validate edin
⚙️ Ayar optimizasyonu: İhtiyaca göre düzenleyin
📊 Test etme: Küçük örnekle başlayın
🚀 Toplu işlem: Büyük veri setlerini işleyin
```

### 📈 **Verimlilik Artırma**

```
⏰ Zaman kazanma:
  • Önceden ayar profillerinizi belirleyin
  • Aynı tür veriler için aynı ayarları kullanın
  • Klavye kısayollarını öğrenin

🎯 Doğruluk artırma:
  • Her zaman test dosyalarıyla başlayın
  • Sonuçları Excel'de kontrol edin
  • Delimiter seçimini dikkatli yapın
```

---

## 🎉 Tebrikler!

Bu rehberi okuduğunuz için tebrikler! 🎊 

Artık JSON to Excel Converter'ı profesyonel seviyede kullanabilirsiniz. 

**📞 Destek gerekirse:**
- 🐛 Hata bulursanız → GitHub Issues
- 💡 Öneriniz varsa → Feature Requests  
- ❓ Sorunuz varsa → Bu rehberi tekrar okuyun

**🚀 Keyifli veri analizi!**

---

*Son güncelleme: Ekim 2024 | Sürüm: v1.0*