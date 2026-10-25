# Wordglint — iOS yayın adımları (Developer hesabı sahibi için)

Gereken: Mac + Xcode (App Store'dan, ücretsiz) + Apple Developer hesabı.
CocoaPods gerekmez (Swift Package Manager).

## 1. Projeyi aç
```
git clone https://github.com/yigiterturk-dev/wordspark.git   # ya da gönderilen zip
cd wordspark/native
npm install
npm run sync            # web dosyalarını iOS projesine kopyalar
open ios/App/App.xcodeproj
```

## 2. Xcode'da imzalama
- Sol üstte **App** hedefi → **Signing & Capabilities**
- **Team**: kendi Developer hesabını seç
- **Bundle Identifier**: `com.nocturndev.wordspark` (alınmışsa kendine göre değiştir, ör. `com.SENINAD.wordspark`)
- iPhone'a takıp ▶ ile bir kez çalıştırıp dene

## 3. App Store Connect'te uygulama kaydı
appstoreconnect.apple.com → Apps → **+** → New App
- Platform: iOS · Name: **Wordglint: English Vocabulary** (alınmışsa "Wordglint – Vocabulary")
- Primary language: English (U.S.) · Bundle ID: 2. adımdaki · SKU: `wordspark-ios-1`

Doldurulacaklar:
| Alan | Değer |
|---|---|
| Category | Education (ikincil: Word) |
| Price | Free |
| Age rating | Anketin hepsine "None" → 4+ |
| App Privacy | **Data Not Collected** (uygulama hiçbir veri toplamıyor, hiçbir sunucuya bağlanmıyor; font bile gömülü) |
| Privacy Policy URL | https://nocturndev.com/wordspark/privacy.html |
| Support URL | https://nocturndev.com/wordspark/support.html |
| Description / keywords | `listing-ios-en.md` |
| Screenshots (6.9") | `screenshots-6.9/` klasörü (1320×2868) |
| App icon | Projede hazır; 1024'lük: `app-icon-1024.png` |
| Export compliance | Info.plist'te "şifreleme yok" ayarlı, soru gelmez |

## 4. Yükleme
Xcode → üst menüde cihaz olarak **Any iOS Device (arm64)** seç → **Product → Archive**
→ Organizer açılır → **Distribute App → App Store Connect → Upload**.
~15 dk sonra build App Store Connect'te görünür → sürüm sayfasında build'i seç → **Submit for Review**.

## Bu sürümde bilerek kapalı olanlar
- **Satın alma ve reklam yok**: iOS'ta tüm paketler ücretsiz açık. (Web sürümündeki satın al/reklam ekranları iOS'ta hiç görünmez.)
- **Düello linki yok**: iOS'ta link üretemediği için buton gizli.
Review notuna yazılabilir: *"All content is free and available offline. No account, no data collection."*
