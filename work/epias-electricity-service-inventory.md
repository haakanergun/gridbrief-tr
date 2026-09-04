# EPİAŞ Şeffaflık 2.0 Elektrik Servisleri Envanteri

Kaynak: EPİAŞ resmî `electricity-service` Swagger/OpenAPI şeması, sürüm **v1.15.15**. Erişim tarihi: 3 Eylül 2026.

- Resmî teknik doküman: https://seffaflik.epias.com.tr/electricity-service/technical/tr/index.html
- Resmî Swagger: https://seffaflik.epias.com.tr/electricity-service/technical/tr/swagger.json
- Temel URL: `https://seffaflik.epias.com.tr/electricity-service`
- Tüm tarih alanları ISO-8601, Türkiye saati/ofsetiyle (`yyyy-MM-ddTHH:mm:ss+03:00`) gönderilmelidir.
- `*` işareti Swagger DTO zorunlu alanını gösterir. `page` çoğunlukla isteğe bağlı sayfalama nesnesidir.
- Erişim sütunu yalnızca Swagger operasyonunda açıkça tanımlanan `TGT` header bilgisine dayanır. `Swagger TGT alanı yok` etiketi anonim erişim garantisi değildir; resmî teknik doküman bazı servisleri dışarıdan erişilebilir, bazılarını giriş/TGT gerektiren servisler olarak ayırır ve şemada dışa aktarım eşlerinde tutarsızlıklar vardır. Canlı çağrıyla doğrulanmalıdır.
- `organizasyon`, `UEVÇB` ve `santral` kapsamları istek filtresinden çıkarılmıştır; bunlar erişim yetkisi veya mahremiyet iddiası değildir.

## Özet

| Tür | Operasyon |
|---|---:|
| Dışa aktarım | 122 |
| Özet | 8 |
| Sözlük/meta | 6 |
| Veri | 165 |
| **Toplam** | **301** |

Swagger alanlarına göre 208 operasyonda `TGT` header açıkça zorunlu, 93 operasyonda ise `TGT` alanı yoktur. JSON/veri–özet–sözlük grubunda dağılım 163/16; dışa aktarım grubunda 45/77’dir. Bu fark özellikle dışa aktarım servislerinde dokümantasyon tutarsızlığı olabileceği için canlı erişim garantisi olarak değerlendirilmemelidir.

## Ana gösterge paneli (8)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Özet | Şeffaflık Ana Sayfası(Dashboard) Dengeleme Güç Piyasası Servisi | `GET /v1/dashboard/balancing-power-market` | `—` | TGT zorunlu | sistem/genel |
| Özet | Şeffaflık Ana Sayfası(Dashboard) Gün Öncesi Piyasası Servisi | `GET /v1/dashboard/day-ahead-market` | `—` | TGT zorunlu | sistem/genel |
| Özet | Şeffaflık Ana Sayfası(Dashboard) Gün İçi Piyasası Servisi | `GET /v1/dashboard/intra-day-market` | `—` | TGT zorunlu | sistem/genel |
| Özet | Şeffaflık Ana Sayfası(Dashboard) Piyasa Mesaj Sistemi Servisi | `GET /v1/dashboard/market-message-system` | `—` | TGT zorunlu | sistem/genel |
| Özet | Şeffaflık Ana Sayfası(Dashboard) Gerçek Zamanlı Tüketim Servisi | `GET /v1/dashboard/realtime-consumption` | `—` | TGT zorunlu | sistem/genel |
| Özet | Şeffaflık Ana Sayfası(Dashboard) Gerçek Zamanlı Üretim Servisi | `GET /v1/dashboard/realtime-generation` | `—` | TGT zorunlu | sistem/genel |
| Özet | Şeffaflık Ana Sayfası(Dashboard) Spot Gaz Piyasası Servisi | `GET /v1/dashboard/spot-gas-market` | `—` | TGT zorunlu | sistem/genel |
| Özet | Şeffaflık Ana Sayfası(Dashboard) Ağırlıklı Ortalama Fiyat Servisi | `GET /v1/dashboard/weighted-average-price` | `—` | TGT zorunlu | sistem/genel |

## Barajlar ve hidroloji (18)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Aktif Doluluk Dışa Aktarım Servisi | `POST /v1/dams/export/active-fullness` | `basinName, damName, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Aktif Hacim Dışa Aktarım Servisi | `POST /v1/dams/export/active-volume` | `basinName, damName, page, exportType*` | TGT zorunlu | bölge/havza/yön |
| Dışa aktarım | Günlük Kot Dışa Aktarım Servisi | `POST /v1/dams/export/daily-kot` | `basinName, damName, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Günlük Hacim Dışa Aktarım Servisi | `POST /v1/dams/export/daily-volume` | `basinName, damName, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Kot Dışa Aktarım Servisi | `POST /v1/dams/export/dam-kot` | `basinName, damName, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Hacim Dışa Aktarım Servisi | `POST /v1/dams/export/dam-volume` | `basinName, damName, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Debi ve Kurulu Güç Dışa Aktarım Servisi | `POST /v1/dams/export/flow-rate-and-installed-power` | `basinName, damName, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Suyun Enerji Karşılığı Dışa Aktarım Servisi | `POST /v1/dams/export/water-energy-provision` | `basinName, damName, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Veri | Aktif Doluluk Listeleme Servisi | `POST /v1/dams/data/active-fullness` | `basinName, damName, page` | Swagger TGT alanı yok | bölge/havza/yön |
| Veri | Aktif Hacim Listeleme Servisi | `POST /v1/dams/data/active-volume` | `basinName, damName, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Havza listesini dönen servisir. | `GET /v1/dams/data/basin-list` | `—` | Swagger TGT alanı yok | sistem/genel |
| Veri | Günlük Kot Listeleme Servisi | `POST /v1/dams/data/daily-kot` | `basinName, damName, page` | Swagger TGT alanı yok | bölge/havza/yön |
| Veri | Günlük Hacim Listeleme Servisi | `POST /v1/dams/data/daily-volume` | `basinName, damName, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Kot Listeleme Servisi | `POST /v1/dams/data/dam-kot` | `basinName, damName, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Havza ismi ile Barajlar listesini dönen servisir. | `POST /v1/dams/data/dam-list` | `basinName` | TGT zorunlu | bölge/havza/yön |
| Veri | Hacim Listeleme Servisi | `POST /v1/dams/data/dam-volume` | `basinName, damName, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Debi ve Kurulu Güç Listeleme Servisi | `POST /v1/dams/data/flow-rate-and-installed-power` | `basinName, damName, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Suyun Enerji Karşılığı Listeleme Servisi | `POST /v1/dams/data/water-energy-provision` | `basinName, damName, page` | TGT zorunlu | bölge/havza/yön |

## Dengeleme Güç Piyasası (8)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Yük Atma (YAT) Talimat Miktarı Dışa Aktarım Servisi | `POST /v1/markets/bpm/export/order-summary-down` | `startDate*, endDate*, region, page, exportType*` | TGT zorunlu | bölge/havza/yön |
| Dışa aktarım | Yük Alma (YAL) Talimat Miktarları Dışa Aktarım Servisi | `POST /v1/markets/bpm/export/order-summary-up` | `startDate*, endDate*, region, page, exportType*` | TGT zorunlu | bölge/havza/yön |
| Dışa aktarım | Sistem Yönü Dışa Aktarım Servisi | `POST /v1/markets/bpm/export/system-direction` | `startDate*, endDate*, region, page, exportType*` | TGT zorunlu | bölge/havza/yön |
| Dışa aktarım | Sistem Marjinal Fiyatı Dışa Aktarım Servisi | `POST /v1/markets/bpm/export/system-marginal-price` | `startDate*, endDate*, region, page, exportType*` | TGT zorunlu | bölge/havza/yön |
| Veri | Yük Atma (YAT) Talimat Miktarı Listeleme Servisi | `POST /v1/markets/bpm/data/order-summary-down` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Yük Alma (YAL) Talimat Miktarları Listeleme Servisi | `POST /v1/markets/bpm/data/order-summary-up` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Sistem Yönü Listeleme Servisi | `POST /v1/markets/bpm/data/system-direction` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Sistem Marjinal Fiyatı Listeleme Servisi | `POST /v1/markets/bpm/data/system-marginal-price` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |

## Dengesizlik (7)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Dengeden Sorumlu Grup (DSG) Dengesizlik Miktarı Dışa Aktarım Servisi | `POST /v1/markets/imbalance/export/dsg-imbalance-quantity` | `startDate*, endDate*, region, organizationId, page, exportType*` | TGT zorunlu | organizasyon+bölge/havza/yön |
| Dışa aktarım | Dengesizlik Tutarı Dışa Aktarım Servisi | `POST /v1/markets/imbalance/export/imbalance-amount` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Dengesizlik Miktarı Dışa Aktarım Servisi | `POST /v1/markets/imbalance/export/imbalance-quantity` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Veri | Dengeden Sorumlu Grup (DSG) Dengesizlik Miktarı Listeleme Servisi | `POST /v1/markets/imbalance/data/dsg-imbalance-quantity` | `startDate*, endDate*, region, organizationId, page` | TGT zorunlu | organizasyon+bölge/havza/yön |
| Veri | DSG Organizasyon Listesi Servisi | `POST /v1/markets/imbalance/data/dsg-organization-list` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | Dengesizlik Tutarı Listeleme Servisi | `POST /v1/markets/imbalance/data/imbalance-amount` | `startDate*, endDate*, region, page` | Swagger TGT alanı yok | bölge/havza/yön |
| Veri | Dengesizlik Miktarı Listeleme Servisi | `POST /v1/markets/imbalance/data/imbalance-quantity` | `startDate*, endDate*, page` | Swagger TGT alanı yok | sistem/genel |

## Geçmişe dönük düzeltme (GDDK) (10)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | GDDK'ya Konu olan Sayaç Sayısı Dışa Aktarım Servisi | `POST /v1/markets/retroactive-adjustment/export/meter-count-subject-to-retroactive-adjustment` | `startDate*, endDate*, subscriberProfileGroupName, distributionId, page, exportType*` | TGT zorunlu | organizasyon |
| Dışa aktarım | GDDK'ya Konu olan Sayaç Hacim Verileri Dışa Aktarım Servisi | `POST /v1/markets/retroactive-adjustment/export/meter-volume` | `periodStartDate, periodEndDate, versionStartDate, versionEndDate, subscriberProfileGroup, meterReadOrgId*, page, exportType*` | TGT zorunlu | organizasyon |
| Dışa aktarım | Gddk Tutarı Dışa Aktarım Servisi | `POST /v1/markets/retroactive-adjustment/export/retroactive-adjustment-sum` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Veri | Dağıtım Liste Servisi | `GET /v1/markets/retroactive-adjustment/data/distribution-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | GDDK'ya Konu olan Sayaç Sayısı Listeleme Servisi | `POST /v1/markets/retroactive-adjustment/data/meter-count-subject-to-retroactive-adjustment` | `startDate*, endDate*, subscriberProfileGroupName, distributionId, page` | TGT zorunlu | organizasyon |
| Veri | GDDK'ya Konu olan Sayaç Hacim Verileri Listeleme Servisi | `POST /v1/markets/retroactive-adjustment/data/meter-volume` | `periodStartDate, periodEndDate, versionStartDate, versionEndDate, subscriberProfileGroup, meterReadOrgId*, page` | TGT zorunlu | organizasyon |
| Veri | Sayaç Okuyan Kurum Liste Servisi | `GET /v1/markets/retroactive-adjustment/data/organization-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | Gddk Tutarı Listeleme Servisi | `POST /v1/markets/retroactive-adjustment/data/retroactive-adjustment-sum` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Profil Abone Grubu Liste Servisi | `GET /v1/markets/retroactive-adjustment/data/subscriber-profile-group-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | GDDK Hacim Profil Abone Grubu Liste Servisi | `GET /v1/markets/retroactive-adjustment/data/volume-subscriber-profile-group-list` | `—` | TGT zorunlu | sistem/genel |

## Genel piyasa / PYS / AUF (8)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Veri | Piyasa Mesaj Sistemi Listeleme Servisi | `POST /v1/markets/data/market-message-system` | `startDate*, endDate*, regionId*, mesajTipId, organizationId, uevcbId, powerPlantId, page` | TGT zorunlu | organizasyon+UEVÇB+santral+bölge/havza/yön |
| Veri | Azami Uzlaştırma Fiyatı (AUF) Listeleme Servisi | `POST /v1/markets/data/maximum-settlement-price` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Piyasa Mesaj Sistemi Santral Listeleme Servisi | `POST /v1/markets/data/power-plant-list-by-organization-id` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | Piyasa Mesaj Sistemi Uevçb Listeleme Servisi | `POST /v1/markets/data/uevcb-list-by-power-plant-id` | `startDate*, powerPlantId*` | TGT zorunlu | santral |
| Veri | Piyasa Mesaj Sistemi Mesaj Tipi Listeleme Servisi | `GET /v1/markets/data/umm-message-type-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | Piyasa Mesaj Sistemi Bölge Listeleme Servisi | `GET /v1/markets/data/umm-region-list` | `—` | TGT zorunlu | sistem/genel |
| Dışa aktarım | Piyasa Mesaj Sistemi Dışa Aktarım Servisi | `POST /v1/markets/export/market-message-system` | `startDate*, endDate*, regionId*, mesajTipId, organizationId, uevcbId, powerPlantId, page, exportType*` | TGT zorunlu | organizasyon+UEVÇB+santral+bölge/havza/yön |
| Dışa aktarım | Azami Uzlaştırma Fiyatı (AUF) Dışa Aktarım Servisi | `POST /v1/markets/export/maximum-settlement-price` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |

## Gün İçi Piyasası (16)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | GİP Teklif Edilen Alış Satış Miktarları Dışa Aktarım Servisi | `POST /v1/markets/idm/export/bid-offer-quantities` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | GİP Eşleşme Miktarı Dışa Aktarım Servisi | `POST /v1/markets/idm/export/matching-quantity` | `startDate*, endDate*, organizationId, page, exportType*` | Swagger TGT alanı yok | organizasyon |
| Dışa aktarım | GİP Min - Maks Alış Teklif Fiyatı Dışa Aktarım Servisi | `POST /v1/markets/idm/export/min-max-bid-price` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | GİP Min - Maks Eşleşme Fiyat Dışa Aktarım Servisi | `POST /v1/markets/idm/export/min-max-matching-price` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | GİP Min - Maks Satış Teklif Fiyatı Dışa Aktarım Servisi | `POST /v1/markets/idm/export/min-max-sales-offer-price` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | GİP İşlem Hacmi Dışa Aktarım Servisi | `POST /v1/markets/idm/export/trade-value` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GİP İşlem Akışı Dışa Aktarım Servisi | `POST /v1/markets/idm/export/transaction-history` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | GİP Ağırlıklı Ortalama Fiyat Dışa Aktarım Servisi | `POST /v1/markets/idm/export/weighted-average-price` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Veri | GİP Teklif Edilen Alış Satış Miktarları Listeleme Servisi | `POST /v1/markets/idm/data/bid-offer-quantities` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GİP Eşleşme Miktarı Listeleme Servisi | `POST /v1/markets/idm/data/matching-quantity` | `startDate*, endDate*, organizationId, page` | TGT zorunlu | organizasyon |
| Veri | GİP Min - Maks Alış Teklif Fiyatı Listeleme Servisi | `POST /v1/markets/idm/data/min-max-bid-price` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GİP Min - Maks Eşleşme Fiyat Listeleme Servisi | `POST /v1/markets/idm/data/min-max-matching-price` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GİP Min - Maks Satış Teklif Fiyatı Listeleme Servisi | `POST /v1/markets/idm/data/min-max-sales-offer-price` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GİP İşlem Hacmi Listeleme Servisi | `POST /v1/markets/idm/data/trade-value` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GİP İşlem Akışı Listeleme Servisi | `POST /v1/markets/idm/data/transaction-history` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GİP Ağırlıklı Ortalama Fiyat Listeleme Servisi | `POST /v1/markets/idm/data/weighted-average-price` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |

## Gün Öncesi Piyasası (34)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | GÖP Blok Alış Miktarı Dışa Aktarım Servisi | `POST /v1/markets/dam/export/amount-of-block-buying` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Blok Satış Miktarı Dışa Aktarım Servisi | `POST /v1/markets/dam/export/amount-of-block-selling` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Eşleşme Miktarı Dışa Aktarım Servisi | `POST /v1/markets/dam/export/clearing-quantity` | `startDate*, endDate*, organizationId, page, exportType*` | Swagger TGT alanı yok | organizasyon |
| Dışa aktarım | GÖP İşlem Hacmi Dışa Aktarım Servisi | `POST /v1/markets/dam/export/day-ahead-market-trade-volume` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Esnek Alış Teklif Miktarı Dışa Aktarım Servisi | `POST /v1/markets/dam/export/flexible-offer-buying-quantity` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Esnek Satış Teklif Miktarı Dışa Aktarım Servisi | `POST /v1/markets/dam/export/flexible-offer-selling-quantity` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Kesinleşmemiş Piyasa Takas Fiyatı (K.PTF) Dışa Aktarım Servisi | `POST /v1/markets/dam/export/interim-mcp` | `startDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Esnek Teklif Eşleşme Miktarları Dışa Aktarım Servisi | `POST /v1/markets/dam/export/matched-flexible-offer-quantity` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Piyasa Takas Fiyatı (PTF) Listesi Dışa Aktarım Servisi | `POST /v1/markets/dam/export/mcp` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Fiyattan Bağımsız Alış Teklifi Dışa Aktarım Servisi | `POST /v1/markets/dam/export/price-independent-bid` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Fiyattan Bağımsız Satış Teklifi Dışa Aktarım Servisi | `POST /v1/markets/dam/export/price-independent-offer` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Fark Tutarı Dışa Aktarım Servisi | `POST /v1/markets/dam/export/side-payments` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | GÖP Teklif Edilen Alış Miktarları Dışa Aktarım Servisi | `POST /v1/markets/dam/export/submitted-bid-order-volume` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Teklif Edilen Satış Miktarları Dışa Aktarım Servisi | `POST /v1/markets/dam/export/submitted-sales-order-volume` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | GÖP Arz-Talep Dışa Aktarım Servisi | `POST /v1/markets/dam/export/supply-demand` | `date*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Veri | GÖP Blok Alış Miktarı Listeleme Servisi | `POST /v1/markets/dam/data/amount-of-block-buying` | `startDate*, endDate*, page` | Swagger TGT alanı yok | sistem/genel |
| Veri | GÖP Blok Satış Miktarı Listeleme Servisi | `POST /v1/markets/dam/data/amount-of-block-selling` | `startDate*, endDate*, page` | Swagger TGT alanı yok | sistem/genel |
| Veri | GÖP Eşleşme Miktarı Listeleme Servisi | `POST /v1/markets/dam/data/clearing-quantity` | `startDate*, endDate*, organizationId, page` | TGT zorunlu | organizasyon |
| Veri | Göp Eşleşme Miktarı Organizasyon Listeleme Servisi | `POST /v1/markets/dam/data/clearing-quantity-organization-list` | `period*` | TGT zorunlu | sistem/genel |
| Veri | GÖP İşlem Hacmi Listeleme Servisi | `POST /v1/markets/dam/data/day-ahead-market-trade-volume` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GÖP Esnek Alış Teklif Miktarı Listeleme Servisi | `POST /v1/markets/dam/data/flexible-offer-buying-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GÖP Esnek Satış Teklif Miktarı Listeleme Servisi | `POST /v1/markets/dam/data/flexible-offer-selling-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Kesinleşmemiş Piyasa Takas Fiyatı (K.PTF) Listeme Servisi | `POST /v1/markets/dam/data/interim-mcp` | `startDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Kesinleşmemiş Piyasa Takas Fiyatı (K.PTF) yayınlanma durumunu dönen servis | `GET /v1/markets/dam/data/interim-mcp-published-status` | `—` | TGT zorunlu | sistem/genel |
| Veri | GÖP Esnek Teklif Eşleşme Miktarları Listeleme Servisi | `POST /v1/markets/dam/data/matched-flexible-offer-quantity` | `startDate*, endDate*, region, page` | Swagger TGT alanı yok | bölge/havza/yön |
| Veri | Piyasa Takas Fiyatı (PTF) Listeleme Servisi | `POST /v1/markets/dam/data/mcp` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GÖP Fiyattan Bağımsız Alış Teklifi Listeleme Servisi | `POST /v1/markets/dam/data/price-independent-bid` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GÖP Fiyattan Bağımsız Satış Teklifi Listeleme Servisi | `POST /v1/markets/dam/data/price-independent-offer` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GÖP Fark Tutarı Listeleme Servisi | `POST /v1/markets/dam/data/side-payments` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | GÖP Teklif Edilen Alış Miktarları Listeleme Servisi | `POST /v1/markets/dam/data/submitted-bid-order-volume` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GÖP Teklif Edilen Satış Miktarları Listeleme Servisi | `POST /v1/markets/dam/data/submitted-sales-order-volume` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | GÖP Arz-Talep Listeleme Servisi | `POST /v1/markets/dam/data/supply-demand` | `date*, page` | Swagger TGT alanı yok | sistem/genel |
| Veri | Arz Talep Grafik Verisi Veri Listeleme Servisi | `POST /v1/markets/dam/data/supply-demand-chart-data` | `date*, page` | Swagger TGT alanı yok | sistem/genel |
| Veri | Arz Talep Grafik Saatlik Ptf Verisi Servisi | `POST /v1/markets/dam/data/supply-demand-chart-ptf-data` | `date*` | TGT zorunlu | sistem/genel |

## İkili anlaşmalar (6)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | EÜAŞ - GTŞ İkili Anlaşmalar Dışa Aktarım Servisi | `POST /v1/markets/bilateral-contracts/export/amount-of-bilateral-contracts` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | İkili Anlaşma (İA) Alış Miktarı Dışa Aktarım Servisi | `POST /v1/markets/bilateral-contracts/export/bilateral-contracts-bid-quantity` | `startDate*, endDate*, organizationId, page, exportType*` | Swagger TGT alanı yok | organizasyon |
| Dışa aktarım | İkili Anlaşma (İA) Satış Miktarı Dışa Aktarım Servisi | `POST /v1/markets/bilateral-contracts/export/bilateral-contracts-offer-quantity` | `startDate*, endDate*, organizationId, page, exportType*` | Swagger TGT alanı yok | organizasyon |
| Veri | EÜAŞ - GTŞ İkili Anlaşmalar Listeleme Servisi | `POST /v1/markets/bilateral-contracts/data/amount-of-bilateral-contracts` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | İkili Anlaşma (İA) Alış Miktarı Listeleme Servisi | `POST /v1/markets/bilateral-contracts/data/bilateral-contracts-bid-quantity` | `startDate*, endDate*, organizationId, page` | TGT zorunlu | organizasyon |
| Veri | İkili Anlaşma (İA) Satış Miktarı Listeleme Servisi | `POST /v1/markets/bilateral-contracts/data/bilateral-contracts-offer-quantity` | `startDate*, endDate*, organizationId, page` | TGT zorunlu | organizasyon |

## İletim ve enterkonneksiyon (26)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Kapasite Talepleri Dışa Aktarım Servisi | `POST /v1/transmission/export/capacity-demand-export` | `startDate*, endDate*, direction*, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Kısıt Maliyeti Dışa Aktarım Servisi | `POST /v1/transmission/export/congestion-cost` | `startDate*, endDate*, page, region, orderType*, priceType*, exportType*` | TGT zorunlu | bölge/havza/yön |
| Dışa aktarım | ENTSO-E (W) Kodları Dışa Aktarım Servisi | `POST /v1/transmission/export/entso-w-organization` | `period*, organizationId, page, exportType*` | Swagger TGT alanı yok | organizasyon |
| Dışa aktarım | ENTSO-E (W) UEVCB Listesi Dışa Aktarım Servisi | `POST /v1/transmission/export/entso-w-uevcb` | `period*, provinceId, uevcbName, page, exportType*` | Swagger TGT alanı yok | UEVÇB+bölge/havza/yön |
| Dışa aktarım | Enterkonneksiyon Arıza Bakım Bildirimleri Dışa Aktarım Servisi | `POST /v1/transmission/export/international-line-events` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | İletim Sistemi Kayıp Katsayısı (ISKK) Dışa Aktarım Servisi | `POST /v1/transmission/export/iskk-list` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Hat Kapasiteleri Dışa Aktarım Servisi | `POST /v1/transmission/export/line-capacities` | `startDate*, endDate*, direction*, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Nomine Kapasite Dışa Aktarım Servisi | `POST /v1/transmission/export/nominal-capacity` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | ENTSO-E (X) Kodları Dışa Aktarım Servisi | `POST /v1/transmission/export/organization-list` | `period*, organizationId, page, exportType*` | Swagger TGT alanı yok | organizasyon |
| Dışa aktarım | Enterkonneksiyon Kapasitesine İlişkin Ay Öncesi Tahminler Dışa Aktarım Servisi | `POST /v1/transmission/export/tcat-pre-month-forecast` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Enterkonneksiyon Kapasitesine İlişkin Yıl Öncesi Tahminler Dışa Aktarım Servisi | `POST /v1/transmission/export/tcat-pre-year-forecast` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Sıfır Bakiye Düzeltme Tutarı Aylık Dışa Aktarım Servisi | `POST /v1/transmission/export/zero-balance` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Veri | Kapasite Talepleri Listeleme Servisi | `POST /v1/transmission/data/capacity-demand` | `startDate*, endDate*, direction*, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Kapasite talepleri yön servisleri  | `GET /v1/transmission/data/capacity-demand-direction` | `—` | TGT zorunlu | sistem/genel |
| Veri | Kısıt Maliyeti Listeleme Servisi | `POST /v1/transmission/data/congestion-cost` | `startDate*, endDate*, page, region, orderType*, priceType*` | TGT zorunlu | bölge/havza/yön |
| Veri | ENTSO-E (W) Kodları Listeleme Servisi | `POST /v1/transmission/data/entso-w-organization` | `period*, organizationId, page` | TGT zorunlu | organizasyon |
| Veri | ENTSO-E (W) UEVCB Listeleme Servisi | `POST /v1/transmission/data/entso-w-uevcb` | `period*, provinceId, uevcbName, page` | TGT zorunlu | UEVÇB+bölge/havza/yön |
| Veri | Enterkonneksiyon Arıza Bakım Bildirimleri Listeleme Servisi | `POST /v1/transmission/data/international-line-events` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | İletim Sistemi Kayıp Katsayısı (ISKK) Listeleme Servisi | `POST /v1/transmission/data/iskk-list` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Hat Kapasiteleri listeleme servisi | `POST /v1/transmission/data/line-capacities` | `startDate*, endDate*, direction*, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Hat kapasiteleri yön listeleme servisi | `GET /v1/transmission/data/line-capacities-direction` | `—` | TGT zorunlu | sistem/genel |
| Veri | Nomine Kapasite Listeleme Servisi | `POST /v1/transmission/data/nominal-capacity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | ENTSO-E (X) Kodları Listeleme Servisi | `POST /v1/transmission/data/organization-list` | `period*, organizationId, page` | TGT zorunlu | organizasyon |
| Veri | Enterkonneksiyon Kapasitesine İlişkin Ay Öncesi Tahminler Listeleme Servisi | `POST /v1/transmission/data/tcat-pre-month-forecast` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Enterkonneksiyon Kapasitesine İlişkin Yıl Öncesi Tahminler Listeleme Servisi | `POST /v1/transmission/data/tcat-pre-year-forecast` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Sıfır Bakiye Düzeltme Tutarı Aylık Listeleme Servisi | `POST /v1/transmission/data/zero-balance` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |

## Menü ve sayfa metadatası (3)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Sözlük/meta | Menü ağacı | `GET /v1/menu/get-menu-tree` | `—` | TGT zorunlu | sistem/genel |
| Sözlük/meta | Sayfa Ayarları | `POST /v1/menu/get-page-settings` | `menuId` | TGT zorunlu | sistem/genel |
| Sözlük/meta | Sayfa Son Güncelleme Zamanı | `POST /v1/menu/get-page-update-date` | `menuId` | TGT zorunlu | sistem/genel |

## Ortak coğrafi sözlükler (3)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Sözlük/meta | Ana Tarih Servisi | `GET /v1/main/date-init` | `—` | TGT zorunlu | sistem/genel |
| Sözlük/meta | İlçe Listeleme Servisi | `POST /v1/main/district-list` | `provinceId*` | TGT zorunlu | bölge/havza/yön |
| Sözlük/meta | Şehir Listeleme Servisi | `GET /v1/main/province-list` | `—` | TGT zorunlu | sistem/genel |

## Piyasa katılımcıları (5)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Piyasa Katılımcıları Dışa Aktarım Servisi | `POST /v1/markets/general-data/export/market-participants` | `organizationId, page, exportType*` | TGT zorunlu | organizasyon |
| Dışa aktarım | Lisans Türüne Göre Katılımcı Sayısı Dışa Aktarım Servisi | `POST /v1/markets/general-data/export/participant-count-based-upon-license-type` | `startDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Veri | Piyasa Katılımcıları Listeleme Servisi | `POST /v1/markets/general-data/data/market-participants` | `organizationId, page` | TGT zorunlu | organizasyon |
| Veri | Piyasa Katılımcıları Organizasyon Filtre Listesi Servisi | `GET /v1/markets/general-data/data/market-participants-organization-filter-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | Lisans Türüne Göre Katılımcı Sayısı Listeleme Servisi | `POST /v1/markets/general-data/data/participant-count-based-upon-license-type` | `startDate*, page` | TGT zorunlu | sistem/genel |

## Tüketim ve tüketici (43)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Tüketici Sayısı Dışa Aktarım Servisi | `POST /v1/consumption/export/consumer-quantity` | `period*, provinceId, profileGroupId, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Tüketim Miktarları Dışa Aktarım Servisi | `POST /v1/consumption/export/consumption-quantity` | `period*, provinceId, profileGroupId, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Talep Tahmini Dışa Aktarım Servisidir. | `POST /v1/consumption/export/demand-forecast-export` | `distrubutionOrganization, page, exportType*` | Swagger TGT alanı yok | organizasyon |
| Dışa aktarım | İl, İlçe ST Adedi Dışa Aktarım Servisi | `POST /v1/consumption/export/eligible-consumer-count` | `period*, provinceId, profileGroupName, districtName, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Serbest Tüketici Tüketim Miktarı Dışa Aktarım Servisi | `POST /v1/consumption/export/eligible-consumer-quantity` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | Yük Tahmin Planı Dışa Aktarım Servisi | `POST /v1/consumption/export/load-estimation-plan` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Sayaç Adedi Listeleme Servisi Dışa Aktarım Servisi | `POST /v1/consumption/export/meter-count-export` | `page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Aylık Endeks Dışa Aktarım Servisi | `POST /v1/consumption/export/monthly-index` | `startDate*, endDate*, groupId*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | Çarpan Değeri Dışa Aktarım Servisi | `POST /v1/consumption/export/multiple-factor` | `period*, distributionId*, meterReadingType*, subscriberProfileGroup*, page, exportType*` | Swagger TGT alanı yok | organizasyon |
| Dışa aktarım | Yüzdesel Tüketim Bilgileri Listeleme Servisi Dışa Aktarım Servisi | `POST /v1/consumption/export/percentage-consumption-info` | `period*, provinceId, page, exportType*` | TGT zorunlu | bölge/havza/yön |
| Dışa aktarım | Planlı Kesinti Bilgisi Dışa Aktarım Servisi | `POST /v1/consumption/export/planned-power-outage-info` | `period*, page, distributionCompanyId, provinceId, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Gerçek Zamanlı Tüketim Dışa Aktarım Servisi | `POST /v1/consumption/export/realtime-consumption` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Serbest Tüketici Adedi Dışa Aktarım Servisi | `POST /v1/consumption/export/st-adedi` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Serbest Tüketici Uzlaştırmaya Esas Çekiş Miktarı Dışa Aktarım Servisi | `POST /v1/consumption/export/st-uecm` | `period*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Uzlaştırmaya Esas Çekiş Miktarı (UEÇM) Dışa Aktarım Servisi | `POST /v1/consumption/export/uecm-export` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Plansız Kesinti Bilgisi Dışa Aktarım Servisi | `POST /v1/consumption/export/unplanned-power-outage-info` | `period*, page, distributionCompanyId, provinceId, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Tedarik Yükümlülüğü Kapsamındaki Uzlaştırmaya Esas Çekiş Miktarı (UEÇM) Dışa Aktarım Servisi | `POST /v1/consumption/export/withdrawal-quantity-under-supply-liability` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Veri | Tüketici Sayısı Listeleme Servisi | `POST /v1/consumption/data/consumer-quantity` | `period*, provinceId, profileGroupId, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Profil Grubu Listeleme Servisi | `GET /v1/consumption/data/consumer-sector-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | Tüketim Miktarları Listeleme Servisi | `POST /v1/consumption/data/consumption-quantity` | `period*, provinceId, profileGroupId, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Talep Tahmini Listeleme Servisi | `POST /v1/consumption/data/demand-forecast` | `distrubutionOrganization, page` | Swagger TGT alanı yok | organizasyon |
| Veri | Dağıtım Bölgesi Servisi | `GET /v1/consumption/data/distribution-region` | `—` | Swagger TGT alanı yok | sistem/genel |
| Veri | İl, İlçe ST Adedi Listeleme Servisi | `POST /v1/consumption/data/eligible-consumer-count` | `period*, provinceId, profileGroupName, districtName, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Serbest Tüketici Tüketim Miktarı Listeleme Servisi | `POST /v1/consumption/data/eligible-consumer-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Dağıtım Şirketlerinin Alındığı Servis | `GET /v1/consumption/data/get-distribution-companies` | `—` | TGT zorunlu | sistem/genel |
| Veri | Yük Tahmin Planı Listeleme Servisi | `POST /v1/consumption/data/load-estimation-plan` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Ana Tarife Grubu | `GET /v1/consumption/data/main-tariff-group-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | Sayaç Adedi Listeleme Servisi | `POST /v1/consumption/data/meter-count` | `page` | Swagger TGT alanı yok | sistem/genel |
| Veri | Aylık Endeks Listeleme Servisi | `POST /v1/consumption/data/monthly-index` | `startDate*, endDate*, groupId*, page` | TGT zorunlu | sistem/genel |
| Veri | Çarpan Değeri Listeleme Servisi | `POST /v1/consumption/data/multiple-factor` | `period*, distributionId*, meterReadingType*, subscriberProfileGroup*, page` | TGT zorunlu | organizasyon |
| Veri | ${VALUE_MULTIPLE_FACTOR_BULK_DATA} | `POST /v1/consumption/data/multiple-factor-bulk` | `period*, distributionId*` | TGT zorunlu | organizasyon |
| Veri | Dağıtım Firmaları Listeleme Servisi | `POST /v1/consumption/data/multiple-factor-distribution` | `period*` | TGT zorunlu | sistem/genel |
| Veri | Sayaç Okuma Tipi Listeleme Servisi | `GET /v1/consumption/data/multiple-factor-meter-reading-type` | `—` | TGT zorunlu | sistem/genel |
| Veri | Profil Abone Grubu Listeleme Servisi | `POST /v1/consumption/data/multiple-factor-profile-group` | `period*, distributionId` | TGT zorunlu | organizasyon |
| Veri | Yüzdesel Tüketim Bilgileri Listeleme Servisi | `POST /v1/consumption/data/percentage-consumption-info` | `period*, provinceId, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Planlı Kesinti Bilgisi Listeleme Servisi | `POST /v1/consumption/data/planned-power-outage-info` | `period*, page, distributionCompanyId, provinceId` | TGT zorunlu | bölge/havza/yön |
| Veri | Profil Abone Grubu Listeleme Servisi | `POST /v1/consumption/data/profile-subscription-group-list` | `period*, provinceId, districtName` | TGT zorunlu | bölge/havza/yön |
| Veri | Gerçek Zamanlı Tüketim Listeleme Servisi | `POST /v1/consumption/data/realtime-consumption` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Serbest Tüketici Adedi Listeleme Servisi | `POST /v1/consumption/data/st-adedi` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Serbest Tüketici Uzlaştırmaya Esas Çekiş Miktarı Listeleme Servisi | `POST /v1/consumption/data/st-uecm` | `period*, page` | TGT zorunlu | sistem/genel |
| Veri | Uzlaştırmaya Esas Çekiş Miktarı (UEÇM) Listeleme Servisi | `POST /v1/consumption/data/uecm` | `startDate*, endDate*, region, page` | Swagger TGT alanı yok | bölge/havza/yön |
| Veri | Plansız Kesinti Bilgisi Listeleme Servisi | `POST /v1/consumption/data/unplanned-power-outage-info` | `period*, page, distributionCompanyId, provinceId` | TGT zorunlu | bölge/havza/yön |
| Veri | Tedarik Yükümlülüğü Kapsamındaki Uzlaştırmaya Esas Çekiş Miktarı (UEÇM) Listeleme Servisi | `POST /v1/consumption/data/withdrawal-quantity-under-supply-liability` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |

## Üretim ve üretim planlama (23)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Emre Amade Kapasite (EAK) Dışa Aktarım Servisi | `POST /v1/generation/export/aic` | `startDate*, endDate*, region*, organizationId, uevcbId, page, exportType*` | Swagger TGT alanı yok | organizasyon+UEVÇB+bölge/havza/yön |
| Dışa aktarım | Kesinleşmiş Günlük Üretim Planı (KGÜP) Dışa Aktarım Servisi | `POST /v1/generation/export/dpp` | `startDate*, endDate*, region*, organizationId, uevcbId, page, exportType*` | Swagger TGT alanı yok | organizasyon+UEVÇB+bölge/havza/yön |
| Dışa aktarım | Kesinleşmiş Günlük Üretim Planı (KGÜP) Dışa Aktarım Servisi | `POST /v1/generation/export/dpp-first-version` | `startDate*, endDate*, region*, organizationId, uevcbId, page, exportType*` | Swagger TGT alanı yok | organizasyon+UEVÇB+bölge/havza/yön |
| Dışa aktarım | Uzlaştırma Esas Veriş Miktarı (UEVM) Dışarı Aktarım Servisi | `POST /v1/generation/export/injection-quantity` | `startDate*, endDate*, powerplantId, page, exportType*` | Swagger TGT alanı yok | santral |
| Dışa aktarım | Lisanslı Santral Yatırımları Dışa Aktarım Servisi | `POST /v1/generation/export/licensed-powerplant-investment-list` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Gerçek Zamanlı Üretim Dışa Aktarım Servisi | `POST /v1/generation/export/realtime-generation` | `startDate*, endDate*, powerPlantId, page, exportType*` | Swagger TGT alanı yok | santral |
| Dışa aktarım | Kesinleştirilmiş Uzlaştırma Dönemi Üretim Planı (KUDÜP) Dışa Aktarım Servisi | `POST /v1/generation/export/sbfgp` | `startDate*, endDate*, region*, organizationId, uevcbId, page, exportType*` | Swagger TGT alanı yok | organizasyon+UEVÇB+bölge/havza/yön |
| Veri | Emre Amade Kapasite (EAK) Listeleme Servisi | `POST /v1/generation/data/aic` | `startDate*, endDate*, region*, organizationId, uevcbId, page` | TGT zorunlu | organizasyon+UEVÇB+bölge/havza/yön |
| Veri | Kesinleşmiş Günlük Üretim Planı (KGÜP) Listeleme Servisi | `POST /v1/generation/data/dpp` | `startDate*, endDate*, region*, organizationId, uevcbId, page` | TGT zorunlu | organizasyon+UEVÇB+bölge/havza/yön |
| Veri | Uevçb Bazlı Toplu Kgüp Listeleme Servisi | `POST /v1/generation/data/dpp-bulk` | `date*, region*, uevcbIds*, page` | TGT zorunlu | UEVÇB+bölge/havza/yön |
| Veri | Kesinleşmiş Günlük Üretim Planı (KGÜP) İlk Versiyon Listeleme Servisi | `POST /v1/generation/data/dpp-first-version` | `startDate*, endDate*, region*, organizationId, uevcbId, page` | TGT zorunlu | organizasyon+UEVÇB+bölge/havza/yön |
| Veri | Uzlaştırma Esas Veriş Miktarı (UEVM) Listeleme Servisi | `POST /v1/generation/data/injection-quantity` | `startDate*, endDate*, powerplantId, page` | TGT zorunlu | santral |
| Veri | Uzlaştırma Esas Veriş Miktarı (UEVM) Santral Listesi Servisi | `GET /v1/generation/data/injection-quantity-powerplant-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | Lisanslı Santral Yatırımları Listeleme Servisi | `POST /v1/generation/data/licensed-powerplant-investment-list` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Organizasyon Listesi Getirme Servisi | `POST /v1/generation/data/organization-list` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | Santral Listeleme Servisi | `GET /v1/generation/data/powerplant-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | Tarih Araligina Gore Santral Listeleme Servisi | `POST /v1/generation/data/powerplant-list-for-date-range` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | Gerçek Zamanlı Üretim Listeleme Servisi | `POST /v1/generation/data/realtime-generation` | `startDate*, endDate*, powerPlantId, page` | TGT zorunlu | santral |
| Veri | Santral Bazlı Toplu Gerçek Zamanlı Uretim Listeleme Servisi | `POST /v1/generation/data/realtime-generation-bulk` | `date*, powerPlantIds*, page` | TGT zorunlu | santral |
| Veri | Bölge Listesi Getirme Servisi | `GET /v1/generation/data/region-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | Kesinleştirilmiş Uzlaştırma Dönemi Üretim Planı (KUDÜP) Listeleme Servisi | `POST /v1/generation/data/sbfgp` | `startDate*, endDate*, region*, organizationId, uevcbId, page` | TGT zorunlu | organizasyon+UEVÇB+bölge/havza/yön |
| Veri | Uevçb Listeleme Servisi | `POST /v1/generation/data/uevcb-list` | `startDate*, organizationId*` | TGT zorunlu | organizasyon |
| Veri | Toplu UEVÇB Listeleme servisi | `POST /v1/generation/data/uevcb-list-bulk` | `startDate*, organizationIds*` | TGT zorunlu | organizasyon |

## Vadeli Elektrik Piyasası (19)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | VEP Kontrat Fiyatları Özet Dışa Aktarım Servisi | `POST /v1/markets/pfm/export/contract-price-summary` | `startDate*, endDate*, year, deliveryPeriod, loadType, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | VEP Günlük Gösterge Fiyatı Dışa Aktarım Servisi | `POST /v1/markets/pfm/export/ggf` | `startDate*, endDate*, year, deliveryPeriod, loadType, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | VEP Teklif Fiyatları Dışa Aktarım Servisi | `POST /v1/markets/pfm/export/offer-price` | `page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | VEP Açık Pozisyon Dışa Aktarım Servisi | `POST /v1/markets/pfm/export/open-position` | `startDate*, endDate*, year, deliveryPeriod, loadType, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | VEP İşlem Hacmi Dışa Aktarım Servisi | `POST /v1/markets/pfm/export/pfm-trade-value` | `startDate*, endDate*, year, deliveryPeriod, loadType, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | VEP İşlem Akışı Dışa Aktarım Servisi | `POST /v1/markets/pfm/export/pfm-transaction-history` | `startDate*, endDate*, year, deliveryPeriod, loadType, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | VEP Eşleşme Miktarı Dışa Aktarım Servisi | `POST /v1/markets/pfm/export/vep-matching-quantity` | `startDate*, endDate*, year, deliveryPeriod, loadType, page, exportType*` | TGT zorunlu | sistem/genel |
| Veri | VEP Kontrat Fiyatları Özet Listeleme Servisi | `POST /v1/markets/pfm/data/contract-price-summary` | `startDate*, endDate*, year, deliveryPeriod, loadType, page` | TGT zorunlu | sistem/genel |
| Veri | Teslimat Dönemi Listeleme Servisi | `POST /v1/markets/pfm/data/delivery-period-list` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | Teslimat Yılı Listeme Servisi | `POST /v1/markets/pfm/data/delivery-year-list` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | VEP Günlük Gösterge Fiyatı Listeleme Servisi | `POST /v1/markets/pfm/data/ggf` | `startDate*, endDate*, year, deliveryPeriod, loadType, page` | TGT zorunlu | sistem/genel |
| Veri | GGF Teslimat Dönemi Listesi | `POST /v1/markets/pfm/data/ggf-delivery-period-list` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | Yük Tipi Listeme Servisi | `POST /v1/markets/pfm/data/load-type-list` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | VEP Teklif Fiyatları Listeleme Servisi | `POST /v1/markets/pfm/data/offer-price` | `page` | TGT zorunlu | sistem/genel |
| Veri | VEP Açık Pozisyon Listeleme Servisi | `POST /v1/markets/pfm/data/open-position` | `startDate*, endDate*, year, deliveryPeriod, loadType, page` | TGT zorunlu | sistem/genel |
| Veri | VEP İşlem Hacmi Listeleme Servisi | `POST /v1/markets/pfm/data/pfm-trade-value` | `startDate*, endDate*, year, deliveryPeriod, loadType, page` | TGT zorunlu | sistem/genel |
| Veri | VEP İşlem Akışı Listeleme Servisi | `POST /v1/markets/pfm/data/pfm-transaction-history` | `startDate*, endDate*, year, deliveryPeriod, loadType, page` | TGT zorunlu | sistem/genel |
| Veri | VEP İşlem Akışı Teslimat Dönemi Listesi | `POST /v1/markets/pfm/data/th-delivery-period-list` | `startDate*, endDate*` | TGT zorunlu | sistem/genel |
| Veri | VEP Eşleşme Miktarı Listeleme Servisi | `POST /v1/markets/pfm/data/vep-matching-quantity` | `startDate*, endDate*, year, deliveryPeriod, loadType, page` | TGT zorunlu | sistem/genel |

## Yan hizmetler (8)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Primer Frekans Rezerv Miktarı Dışa Aktarım Servisi | `POST /v1/markets/ancillary-services/export/primary-frequency-capacity-amount` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | Primer Frekans Kontrolü (PFK) Fiyat Dışa Aktarım Servisi | `POST /v1/markets/ancillary-services/export/primary-frequency-capacity-price` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | Sekonder Frekans Rezerv Miktarı Dışa Aktarım Servisi | `POST /v1/markets/ancillary-services/export/secondary-frequency-capacity-amount` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | Sekonder Frekans Kontrolü (SFK) Fiyat Dışa Aktarım Servisi | `POST /v1/markets/ancillary-services/export/secondary-frequency-capacity-price` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Veri | Primer Frekans Rezerv Miktarı Listeleme Servisi | `POST /v1/markets/ancillary-services/data/primary-frequency-capacity-amount` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Primer Frekans Kontrolü (PFK) Fiyat Listeleme Servisi | `POST /v1/markets/ancillary-services/data/primary-frequency-capacity-price` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Sekonder Frekans Rezerv Miktarı Listeleme Servisi | `POST /v1/markets/ancillary-services/data/secondary-frequency-capacity-amount` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Sekonder Frekans Kontrolü (SFK) Fiyat Listeleme Servisi | `POST /v1/markets/ancillary-services/data/secondary-frequency-capacity-price` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |

## YEK-G (20)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | YEK-G İkili Anlaşma Miktarları Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/bilateral-contract-list` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | YEK-G İtfa İşlem Miktarları Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/cancelation-quantity` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | İlga edilen YEK-G Belge Miktarı Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/expiry-quantity` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | İhraç edilen YEK-G Belge Miktarı Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/exported-document-quantity` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | YEK-G Org. Piyasa Alış/Satış Teklif Miktarı Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/market-bid-ask-quantity` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | YEK-G Min-Max Eşleşme Fiyatları Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/min-max-match-amount-list` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | YEK-G Org. Piyasa İşlem Hacmi Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/trading-volume` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | Org. YEK-G Piyasa Ağırlıklı Ortalama Fiyat Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/weighted-average-price` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | İptal edilen YEK-G Belge Miktarı Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/withdrawal-quantity` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Dışa aktarım | Org. YEK-G Piyasa Eşleşme Miktarları Dışa Aktarım Servisi | `POST /v1/markets/yek-g/export/yekg-matching-quantity` | `startDate*, endDate*, page, exportType*` | TGT zorunlu | sistem/genel |
| Veri | YEK-G İkili Anlaşma Miktarları Listeleme Servisi | `POST /v1/markets/yek-g/data/bilateral-contract-list` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | YEK-G İtfa İşlem Miktarları Listeleme Servisi | `POST /v1/markets/yek-g/data/cancelation-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | İlga edilen YEK-G Belge Miktarı Listeleme Servisi | `POST /v1/markets/yek-g/data/expiry-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | İhraç edilen YEK-G Belge Miktarı Listeleme Servisi | `POST /v1/markets/yek-g/data/exported-document-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | YEK-G Org. Piyasa Alış/Satış Teklif Miktarı Listeleme Servisi | `POST /v1/markets/yek-g/data/market-bid-ask-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | YEK-G Min-Max Eşleşme Fiyatları Listeleme Servisi | `POST /v1/markets/yek-g/data/min-max-match-amount-list` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | YEK-G Org. Piyasa İşlem Hacmi Listeleme Servisi | `POST /v1/markets/yek-g/data/trading-volume` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Org. YEK-G Piyasa Ağırlıklı Ortalama Fiyat Listeleme Servisi | `POST /v1/markets/yek-g/data/weighted-average-price` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | İptal edilen YEK-G Belge Miktarı Listeleme Servisi | `POST /v1/markets/yek-g/data/withdrawal-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Org. YEK-G Piyasa Eşleşme Miktarları Listeleme Servisi | `POST /v1/markets/yek-g/data/yekg-matching-quantity` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |

## Yenilenebilirler ve YEKDEM (36)

| Tür | Kullanıcıya gösterilecek ad | Metot ve endpoint | Temel parametreler | Şema erişimi | Veri kapsamı |
|---|---|---|---|---|---|
| Dışa aktarım | Üretim Tahmini Dışa Aktarım Servisi | `POST /v1/renewables/export/generation-forecast` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Dengesizlik Maliyeti Dışa Aktarım Servisi | `POST /v1/renewables/export/imbalance-cost` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Dengesizlik  Miktarı Dışa Aktarım Servisi | `POST /v1/renewables/export/imbalance-quantity` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | YEK Bedeli (YEKBED) Dışa Aktarım Servisi | `POST /v1/renewables/export/licensed-generation-cost` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | YEKDEM Gerçek Zamanlı Üretim Dışa Aktarım Servisi | `POST /v1/renewables/export/licensed-realtime-generation` | `startDate*, endDate*, powerPlantId, page, exportType*` | Swagger TGT alanı yok | santral |
| Dışa aktarım | Kurulu Güç YEKDEM Son Tarih Sonrası Veri İçin Dışa Aktarım Servisi | `POST /v1/renewables/export/new-installed-capacity` | `period*, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Kurulu Güç YEKDEM Son Tarih ve Öncesi Verisi İçin Dışa Aktarım Servisi | `POST /v1/renewables/export/old-installed-capacity` | `period*, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Yekdem Portföy Geliri Dışa Aktarım Servisi | `POST /v1/renewables/export/portfolio-income` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Uzlaştırma Esas Veriş Miktarı (UEVM) Dışa Aktarım Servisi | `POST /v1/renewables/export/renewable-sm-licensed-injection-quantity` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | YEKDEM Katılımcı Listesi Dışa Aktarım Servisi | `POST /v1/renewables/export/renewables-participant` | `year*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | YEK Geliri (YG) Dışa Aktarım Servisi | `POST /v1/renewables/export/renewables-support-mechanism-income` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | RES Üretim ve Tahmin Dışa Aktarım Servisi | `POST /v1/renewables/export/res-generation-and-forecast` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Spot Teklifi Dışa Aktarım Servisi | `POST /v1/renewables/export/spot-order` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Toplam Gider (YEKTOB) Dışa Aktarım Servisi | `POST /v1/renewables/export/total-cost` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Birim Maliyeti Dışa Aktarım Servisi | `POST /v1/renewables/export/unit-cost` | `startDate*, endDate*, page, exportType*` | Swagger TGT alanı yok | sistem/genel |
| Dışa aktarım | Lisanssız Üretim Miktarı Dışa Aktarım Servisi | `POST /v1/renewables/export/unlicensed-generation-amount` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Dışa aktarım | Lisanssız Üretim Bedeli Dışa Aktarım Servisi | `POST /v1/renewables/export/unlicensed-generation-cost` | `startDate*, endDate*, region, page, exportType*` | Swagger TGT alanı yok | bölge/havza/yön |
| Veri | Üretim Tahmini Data Listeleme Servisi | `POST /v1/renewables/data/generation-forecast` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Dengesizlik Maliyeti Listeleme Servisi | `POST /v1/renewables/data/imbalance-cost` | `startDate*, endDate*, page` | Swagger TGT alanı yok | sistem/genel |
| Veri | Dengesizlik Miktarı Listeleme Servisi | `POST /v1/renewables/data/imbalance-quantity` | `startDate*, endDate*, page` | Swagger TGT alanı yok | sistem/genel |
| Veri | YEK Bedeli (YEKBED) Listeleme Servisi | `POST /v1/renewables/data/licensed-generation-cost` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Lisanslı Santral Listeleme Servisi | `POST /v1/renewables/data/licensed-powerplant-list` | `period*` | TGT zorunlu | sistem/genel |
| Veri | YEKDEM Gerçek Zamanlı Üretim Listeleme Servisi | `POST /v1/renewables/data/licensed-realtime-generation` | `startDate*, endDate*, powerPlantId, page` | TGT zorunlu | santral |
| Veri | Kurulu Güç YEKDEM Son Tarih Sonrası Veri Listeleme Servisi | `POST /v1/renewables/data/new-installed-capacity` | `period*` | TGT zorunlu | sistem/genel |
| Veri | Kurulu Güç YEKDEM Son Tarih ve Öncesi Veri Listeleme Servisi | `POST /v1/renewables/data/old-installed-capacity` | `period*` | TGT zorunlu | sistem/genel |
| Veri | Yekdem Portföy Geliri Listeleme Servisi | `POST /v1/renewables/data/portfolio-income` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Uzlaştırma Esas Veriş Miktarı (UEVM) Listeleme Servisi | `POST /v1/renewables/data/renewable-sm-licensed-injection-quantity` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | YEKDEM Katılımcı Listesi Listeleme Servisi | `POST /v1/renewables/data/renewables-participant` | `year*, page` | TGT zorunlu | sistem/genel |
| Veri | YEKDEM Katılımcı Listesi Yıl Listesi Servisi | `GET /v1/renewables/data/renewables-participant-year-list` | `—` | TGT zorunlu | sistem/genel |
| Veri | YEK Geliri (YG) Listeleme Servisi | `POST /v1/renewables/data/renewables-support-mechanism-income` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | RES Üretim ve Tahmin Listeleme Servisi | `POST /v1/renewables/data/res-generation-and-forecast` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Spot Teklifi Listeleme Servisi | `POST /v1/renewables/data/spot-order` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Toplam Gider (YEKTOB) Listeleme Servisi | `POST /v1/renewables/data/total-cost` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Birim Maliyeti Listeleme Servisi | `POST /v1/renewables/data/unit-cost` | `startDate*, endDate*, page` | TGT zorunlu | sistem/genel |
| Veri | Lisanssız Üretim Miktarı Listeleme Servisi | `POST /v1/renewables/data/unlicensed-generation-amount` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |
| Veri | Lisanssız Üretim Bedeli Listeleme Servisi | `POST /v1/renewables/data/unlicensed-generation-cost` | `startDate*, endDate*, region, page` | TGT zorunlu | bölge/havza/yön |

## GridBrief ilk sürümü için önerilen 12 yüksek değerli veri servisi

| Öncelik | Ürün modülü | Endpoint | Güvenli ilk temsil |
|---:|---|---|---|
| 1 | GÖP fiyatı / PTF | `POST /v1/markets/dam/data/mcp` | Saatlik çizgi, ortalama/min/maks KPI ve önceki güne göre değişim. |
| 2 | DGP fiyatı / SMF | `POST /v1/markets/bpm/data/system-marginal-price` | SMF–PTF makası, sistem yönüyle renklenen risk bandı. |
| 3 | GİP fiyatı | `POST /v1/markets/idm/data/weighted-average-price` | Saatlik ağırlıklı ortalama ve PTF’ye göre prim/iskonto. |
| 4 | Gerçek zamanlı tüketim | `POST /v1/consumption/data/realtime-consumption` | Sistem talep eğrisi; veri açıklamasındaki yaklaşık iki saatlik gecikmeyi görünür etiketle göster. |
| 5 | Yük tahmin planı | `POST /v1/consumption/data/load-estimation-plan` | Gerçekleşen–tahmin karşılaştırması ve MAPE/MAE; veri bulunmayan geleceği gerçekleşmiş gibi çizme. |
| 6 | Gerçek zamanlı üretim | `POST /v1/generation/data/realtime-generation` | Kaynak kırılımı ve seçili santral; resmî açıklamadaki santral verisi yayın gecikmesini görünür etiketle göster. |
| 7 | KGÜP | `POST /v1/generation/data/dpp` | Organizasyon → UEVÇB filtresiyle saatlik plan ve toplam MWh. |
| 8 | KUDÜP | `POST /v1/generation/data/sbfgp` | KGÜP ile yan yana revizyon eğrisi ve saatlik fark. |
| 9 | EAK | `POST /v1/generation/data/aic` | Planın kapasiteye oranı, aşağı/yukarı marj ve limit ihlali uyarısı. |
| 10 | UEVM | `POST /v1/generation/data/injection-quantity` | Santral bazlı gerçekleşen üretim; KGÜP/KUDÜP sapmasıyla birlikte. DTO anahtarının burada `powerplantId`, gerçek zamanlı üretimde ise `powerPlantId` olduğuna dikkat et. |
| 11 | Piyasa Mesaj Sistemi | `POST /v1/markets/data/market-message-system` | Organizasyon/UEVÇB/santral bazlı kullanılabilirlik olay zaman çizelgesi; üretim grafiğine olay işaretleri ekle. |
| 12 | DSG dengesizliği | `POST /v1/markets/imbalance/data/dsg-imbalance-quantity` | Organizasyon bazlı pozitif/negatif dengesizlik, maliyet risk göstergesi ve dönem kıyası. |

Bu modüllerin filtrelerini beslemek için `organization-list`, `uevcb-list`, `powerplant-list`, `region-list`, `umm-message-type-list` ve `umm-region-list` sözlük servisleri de arka planda kullanılmalıdır.

Demo/adaptör kuralı: örnek veri her kartta açıkça **Demo veri** olarak etiketlenmeli; canlı ve örnek seriler aynı KPI içinde karıştırılmamalı; endpoint, veri dönemi, son güncelleme ve hata/fallback nedeni kullanıcıya gösterilmelidir.
