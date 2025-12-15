# Odaklanma Takibi - Focus Tracker

Dijital dikkat dağınıklığıyla mücadele etmek için tasarlanmış, kullanıcı odaklı bir mobil uygulama. Pomodoro tekniği ile çalışan zamanlayıcı, dikkat dağınıklığı takibi ve detaylı raporlama özellikleri sunar.

## Özellikler

### Ana Özellikler

- **Ayarlanabilir Zamanlayıcı**: 5 dakikadan 60 dakikaya kadar özelleştirilebilir odaklanma seansları
- **Kategori Yönetimi**: Seanslarınızı kategorilere ayırın (Ders Çalışma, Kodlama, Proje, Kitap Okuma, Diğer)
- **Dikkat Dağınıklığı Takibi**: AppState API ile uygulamadan her ayrılışınızı otomatik takip eder
- **Detaylı Raporlar**: Odaklanma sürelerinizi ve performansınızı görselleştirin
- **Grafik Desteği**: Son 7 günlük çubuk grafik ve kategorilere göre pasta grafik
- **Dark/Light Mode**: Göz dostu tema desteği

### Akıllı Özellikler

- Uygulama arka plana gittiğinde sayacı otomatik duraklat
- Geri döndüğünüzde devam etmek isteyip istemediğinizi sorar
- Seans tamamlandığında görsel özet ekranı
- Gerçek zamanlı animasyonlu zamanlayıcı

## Ekran Görüntüleri

### Ana Sayfa - Zamanlayıcı

- Büyük, görsel zamanlayıcı göstergesi
- Süre ve kategori seçimi
- Başlat, Duraklat, Bitir butonları
- Dikkat dağınıklığı sayacı

### Raporlar Ekranı

- Bugün ve toplam odaklanma süreleri
- Toplam dikkat dağınıklığı sayısı
- Son 7 günlük çubuk grafik (dakika bazında)
- Kategorilere göre pasta grafik (yüzde dağılımı)

## Teknolojiler

- **Framework**: React Native + Expo (~54.0)
- **Router**: Expo Router (~6.0)
- **Database**: Expo SQLite (~16.0)
- **Charts**: react-native-chart-kit + react-native-svg
- **UI Components**: @react-native-picker/picker
- **Navigation**: @react-navigation/native + @react-navigation/bottom-tabs
- **Language**: TypeScript (~5.9)

## Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Expo CLI
- iOS Simulator veya Android Emulator (ya da fiziksel cihaz)

### Adımlar

1. **Projeyi klonlayın**

```bash
git clone https://github.com/Burakodbs/OdaklanmaTakibi.git
cd OdaklanmaTakibi
```

1. **Bağımlılıkları yükleyin**

```bash
npm install
```

1. **Uygulamayı çalıştırın**

```bash
# Development sunucusunu başlat
npm start

# Android'de çalıştır
npm run android

# iOS'ta çalıştır (macOS gerekli)
npm run ios

# Web'de çalıştır (sınırlı özellikler)
npm run web
```

## Proje Yapısı

```text
OdaklanmaTakibi/
├── app/                          # Ana uygulama dosyaları
│   ├── (tabs)/                   # Tab navigator ekranları
│   │   ├── _layout.tsx          # Tab layout yapılandırması
│   │   ├── index.tsx            # Zamanlayıcı ekranı (Ana Sayfa)
│   │   ├── explore.tsx          # Raporlar ekranı (Dashboard)
│   │   └── goals.tsx            # Hedefler ekranı (bonus)
│   ├── _layout.tsx              # Root layout
│   └── modal.tsx                # Modal ekranı
├── assets/                       # Görseller ve statik dosyalar
│   └── images/
├── components/                   # Yeniden kullanılabilir bileşenler
│   ├── themed-text.tsx          # Temalı text bileşeni
│   ├── themed-view.tsx          # Temalı view bileşeni
│   ├── haptic-tab.tsx           # Haptic feedback tab
│   ├── external-link.tsx        # Dış link bileşeni
│   └── ui/                      # UI bileşenleri
│       ├── collapsible.tsx
│       ├── icon-symbol.tsx
│       └── icon-symbol.ios.tsx
├── constants/                    # Sabit değerler
│   └── theme.ts                 # Tema renkleri ve yapılandırması
├── hooks/                        # Custom React hooks
│   ├── use-color-scheme.ts      # Renk şeması hook
│   ├── use-color-scheme.web.ts  # Web için renk şeması
│   └── use-theme-color.ts       # Tema rengi hook
├── services/                     # Servisler
│   └── database.ts              # SQLite veritabanı servisi
├── utils/                        # Yardımcı fonksiyonlar
│   └── constants.ts             # Uygulama sabitleri
├── app.json                      # Expo yapılandırması
├── package.json                  # Bağımlılıklar
├── tsconfig.json                # TypeScript yapılandırması
├── babel.config.js              # Babel yapılandırması
├── metro.config.js              # Metro bundler yapılandırması
└── eslint.config.js             # ESLint yapılandırması
```

## Veritabanı Şeması

### Sessions Table

```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  duration INTEGER NOT NULL,      -- saniye cinsinden
  distractions INTEGER NOT NULL,  -- dikkat dağınıklığı sayısı
  date TEXT NOT NULL,             -- ISO 8601 formatında
  completed INTEGER NOT NULL      -- 0 veya 1 (boolean)
);
```

### Achievements Table

```sql
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  unlockedAt TEXT NOT NULL
);
```

## Kullanım

### Odaklanma Seansı Başlatma

1. Ana sayfada (Zamanlayıcı) istediğiniz süreyi seçin (5-60 dakika)
1. Çalışmanız için uygun kategoriyi seçin
1. "Başlat" butonuna basın
1. Odaklanmaya başlayın.

### Dikkat Dağınıklığı Takibi

- Seans sırasında uygulamadan çıkarsanız (başka uygulama, ana ekran vb.)
- Sistem otomatik olarak dikkat dağınıklığı sayar ve sayacı durdurur
- Geri döndüğünüzde devam etmek isteyip istemediğiniz sorulur

### Seans Bitirme

- **"Duraklat"**: Sayacı geçici olarak durdurur
- **"Bitir"**: Seansı sonlandırır ve veritabanına kaydeder
- **"Sıfırla"**: Sayacı başlangıç değerine döndürür

### Raporları İnceleme

1. Alt menüden **"Raporlar"** sekmesine geçin
1. Genel istatistiklerinizi görün:

- Bugünkü toplam odaklanma süresi
- Tüm zamanların toplam süresi
- Toplam dikkat dağınıklığı

1. Grafikleri inceleyin:

- Son 7 günlük performans (çubuk grafik)
- Kategori dağılımı (pasta grafik)

## 🔧 Geliştirici Notları

### Test Verisi Ekleme

Raporları test etmek için örnek veri ekleyebilirsiniz:

```typescript
import { database } from '@/services/database';

// 30 günlük test verisi ekle
await database.addFakeData();

// Tüm verileri temizle
await database.clearAllData();
```

### AppState API Kullanımı

Dikkat dağınıklığı takibi için React Native'in AppState API'sini kullanıyoruz:

```typescript
useEffect(() => {
  const subscription = AppState.addEventListener('change', nextAppState => {
    if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
      // Uygulama arka plana gitti
      if (isRunningRef.current) {
        setDistractions(prev => prev + 1);
        handlePause();
      }
    }
  });
  return () => subscription.remove();
}, []);
```

## Minimum Gereksinimler (MVP)

- 2 ana ekran: Zamanlayıcı ve Raporlar
- Tab navigator: Alt menü ile navigasyon
- Ayarlanabilir sayaç: 5-60 dakika arası seçenekler
- Başlat/Duraklat/Bitir butonları
- Kategori seçimi: 5 farklı kategori
- Seans özeti
- AppState takibi: Otomatik dikkat dağınıklığı tespiti
- Veritabanı: SQLite ile kalıcı veri saklama
- Genel istatistikler: Bugün, toplam ve dağınıklık verileri
- Çubuk grafik: Son 7 günlük performans
- Pasta grafik: Kategori dağılımı
- Expo kullanımı ve component bazlı yapı

## Gelecek Özellikler (Roadmap)

- [ ] Push bildirimleri
- [ ] Günlük hedef belirleme
- [ ] Streak (ardışık gün) sistemi
- [ ] Başarı rozetleri (achievements)
- [ ] Widget desteği
- [ ] İstatistik dışa aktarma (CSV/PDF)
- [ ] Sosyal paylaşım özellikleri
- [ ] Özelleştirilebilir temalar
- [ ] Ses ve titreşim ayarları
- [ ] Uluslararasılaştırma (i18n)

## Bilinen Sorunlar

- Web versiyonunda SQLite çalışmadığı için veriler saklanamıyor
- iOS'ta dark mode geçişi bazı durumlarda gecikebilir

## Katkıda Bulunma

1. Fork edin
1. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
1. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
1. Branch'inizi push edin (`git push origin feature/amazing-feature`)
1. Pull Request açın

### Commit Mesajı Formatı

- `feat:` Yeni özellik
- `fix:` Hata düzeltme
- `docs:` Dokümantasyon
- `style:` Kod formatı
- `refactor:` Kod yeniden yapılandırma
- `test:` Test ekleme/düzeltme
- `chore:` Genel bakım

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Geliştirici

Burak Odabaş

- GitHub: [@Burakodbs](https://github.com/Burakodbs)

## Teşekkürler

- React Native ve Expo ekiplerine
- react-native-chart-kit geliştiricilerine
- Tüm açık kaynak katkıda bulunanlara

---

Mobil Programlama Dersi Projesi - 2025
