# Odaklanma Takibi - Focus Tracker

Dijital dikkat dağınıklığıyla mücadele etmek için tasarlanmış, kullanıcı odaklı bir mobil uygulama.

## Özellikler

### Ana Özellikler

- **Ayarlanabilir Zamanlayıcı**: 5 dakikadan 60 dakikaya kadar özelleştirilebilir odaklanma seansları
- **Kategori Yönetimi**: Seanslarınızı kategorilere ayırın (Ders Çalışma, Kodlama, Proje, Kitap Okuma, Diğer)
- **Dikkat Dağınıklığı Takibi**: AppState API ile uygulamadan her ayrılışınızı otomatik takip eder
- **Detaylı Raporlar**: Odaklanma sürelerinizi ve performansınızı görselleştirin
- **Grafik Desteği**: Son 7 günlük çubuk grafik ve kategorilere göre pasta grafik

### Akıllı Özellikler

- Uygulama arka plana gittiğinde sayacı otomatik duraklat
- Geri döndüğünüzde devam etmek isteyip istemediğinizi sorar
- Seans tamamlandığında görsel özet ekranı

## Ekranlar

- Zamanlayıcı: Süre/kategori seçimi, başlat/duraklat/bitir, dağınıklık sayacı
- Raporlar: Günlük/toplam süreler, son 7 gün grafiği, kategori dağılımı
- Hedefler: Günlük hedef belirleme, ilerleme çubuğu, ardışık gün (streak), rozetler

## Teknolojiler

- Framework: React Native 0.81.5 + Expo 54.0.29
- Router: Expo Router 6.0.19
- Database: Expo SQLite 16.0.10
- Charts: react-native-chart-kit + react-native-svg
- UI Components: @react-native-picker/picker
- Navigation: @react-navigation/native + @react-navigation/bottom-tabs
- Dil: TypeScript 5.9.2

## Kurulum

Gereksinimler: Node.js 18+, npm veya yarn, Expo CLI. Mobil test için Android Studio (SDK ile) veya macOS üzerinde Xcode.

Kurulum adımları:

```bash
git clone https://github.com/Burakodbs/OdaklanmaTakibi.git
cd OdaklanmaTakibi
npm install
```

## Çalıştırma

Geliştirme ve test için aşağıdaki komutları kullanın:

```bash
# Geliştirme sunucusu (QR ile Expo Go veya emulator)
npm start

# Android (emulator veya bağlı cihazda native build)
npm run android

# iOS (yalnızca macOS üzerinde)
npm run ios

```

Notlar:

- Android için Android Studio ve SDK kurulu olmalıdır. iOS için Xcode gerekir (macOS).
- Fiziksel cihazda test için geliştirici seçeneklerini ve USB hata ayıklamayı etkinleştirin.
- `npm start` sonrası Metro arayüzünden platform kısayollarını kullanabilirsiniz.

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

- Zamanlayıcıyı 5-60 dakika arasında seçin ve başlatın.
- Gerekirse duraklatın/yeniden başlatın; uygulama arka plana gidince sayaç durur ve dağınıklık artar.
- Seansı bitirerek kaydedin.
- Raporlar sekmesinde günlük/toplam süreleri ve grafikleri görüntüleyin.
