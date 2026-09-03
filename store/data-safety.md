# WordSpark — Play Console "Data Safety" Cevap Anahtarı

Senaryo: **AdMob'lu sürüm** (Google Mobile Ads SDK dahil, analitik SDK yok, hesap yok, tüm oyun verisi lokal).
Dayanak: Google'ın resmi AdMob veri beyanı rehberi — SDK'nın otomatik topladıkları: IP adresi, reklam kimliği/cihaz tanımlayıcıları, uygulama içi reklam etkileşimleri, tanılama verisi ([developers.google.com/admob/android/privacy/play-data-disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure), [Play Console yardım](https://support.google.com/googleplay/android-developer/answer/10787469)).

> Not: Lokal (cihazdan çıkmayan) veriler Play tanımına göre "collected" SAYILMAZ — bu yüzden oyun ilerlemesi/istatistikler formda hiç beyan edilmez. Beyan edilen her şey AdMob SDK'sından gelir.

## Bölüm 1 — Genel sorular

| Soru | Cevap |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (AdMob nedeniyle) |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (AdMob TLS kullanır) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — "Users can request deletion" işaretle; silme talebi kanalı olarak privacy policy'deki e-postayı (sales@nocturndev.com) göster. (Hesap olmadığı için hesap-silme URL'si gerekmiyor; lokal veri kullanıcı tarafından uygulama verisi temizlenerek silinebilir — formun açıklama alanında belirt.) |

## Bölüm 2 — Data types (işaretlenecek kutular)

### Location
- **Approximate location** → ✅ Collected (IP'den çıkarım — AdMob rehberi bunu beyan etmenizi ister), ❌ Not shared*, Ephemeral: No
  - Purpose: **Advertising or marketing**, Fraud prevention/security/compliance
  - Optional/Required: **Required** (reklam gösterimi için otomatik)
- Precise location → ❌

### Personal info / Financial info / Health / Messages / Photos / Audio / Files / Calendar / Contacts
- **Hepsi ❌** (hiçbiri toplanmıyor)

### App activity
- **App interactions** → ✅ Collected (reklamla etkileşim/görüntüleme verisi)
  - Purpose: **Advertising or marketing**, Fraud prevention/security/compliance
- Diğer alt maddeler (in-app search history, installed apps, other user-generated content, other actions) → ❌

### Web browsing → ❌

### App info and performance
- **Diagnostics** → ✅ Collected
  - Purpose: **Fraud prevention, security, and compliance**; Analytics (SDK performansı)
- Crash logs / Other app performance data → ❌ (kendi crash SDK'mız yok; AdMob beyan rehberinde zorunlu değil)

### Device or other IDs
- **Device or other IDs** → ✅ Collected (Android Advertising ID + cihaz tanımlayıcıları)
  - Purpose: **Advertising or marketing**, Fraud prevention/security/compliance

\* **"Shared" konusunda:** Google resmi rehberde, AdMob "service provider" istisnası kapsamında değerlendirilebildiği için bu verilerin "shared" olarak işaretlenmesinin genellikle gerekmediğini belirtir; sorumluluk geliştiricidedir. Güvenli taraf: hepsinde **Collected = Yes, Shared = No** işaretle (Google'a aktarım "service provider" istisnasına girer). Kendi sunucumuz olmadığı için başka hiçbir paylaşım yok.

## Bölüm 3 — Her veri tipi için ortak cevaplar

| Soru | Cevap |
|---|---|
| Is this data collected, shared, or both? | **Collected** |
| Is this data processed ephemerally? | **No** |
| Is data collection required or optional? | **Required** (kullanıcı reklamları atlayamaz; kişiselleştirme Android ayarından kapatılabilir ama toplama devam eder) |

## Bölüm 4 — İlgili diğer Console formları (unutma)

1. **Ads declaration:** "Yes, my app contains ads" → işaretle (App content > Ads).
2. **Advertising ID declaration (Android 13+):** "Does your app use advertising ID?" → **Yes**; AndroidManifest'te `com.google.android.gms.permission.AD_ID` izninin bulunduğundan emin ol (Google Mobile Ads SDK bunu otomatik ekler).
3. **Target audience & content:** Hedef yaş grubunu **13+** seç (sınav kitlesi). "Appeal to children" sorusunda uygulamanın çocuklara yönelik olmadığını beyan et — 13 altı seçilirse Families Policy + reklam kimliği yasağı devreye girer, AdMob konfigürasyonu zorlaşır.
4. **Privacy policy URL:** `privacy-policy.html`'in yayınlanacağı URL'yi hem Store listing hem Data safety bölümüne gir (zorunlu — AdMob içeren tüm uygulamalar için).
5. **AdMob tarafında:** EEA/UK için UMP SDK ile GDPR onay mesajı yapılandır (AdMob > Privacy & messaging). 2024 sonrası EEA'da reklam göstermek için zorunlu.

## Hızlı özet (formda ✅ olan her şey)
- Approximate location — Advertising, Fraud prevention
- App interactions — Advertising, Fraud prevention
- Diagnostics — Fraud prevention, Analytics
- Device or other IDs — Advertising, Fraud prevention
- Encrypted in transit: Yes · Deletion request: Yes · Diğer tüm kategoriler: No

Kaynaklar: [AdMob Play data disclosure](https://developers.google.com/admob/android/privacy/play-data-disclosure) · [Data safety form yardımı](https://support.google.com/googleplay/android-developer/answer/10787469)
