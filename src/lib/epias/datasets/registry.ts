import "server-only";

import type {
  CatalogDatasetCapability,
  DatasetDateCapability,
  DatasetDescriptor,
  DatasetFilterCapability,
  DatasetFilterType,
} from "../../transparency/dataset-types";

export type DatasetDateField =
  | "startDate"
  | "endDate"
  | "date"
  | "period"
  | "periodStartDate"
  | "periodEndDate"
  | "versionStartDate"
  | "versionEndDate";

export interface DatasetParameterSpec {
  key: string;
  required: boolean;
  kind: "date" | "filter" | "page";
  type?: DatasetFilterType;
}

export interface DatasetDefinition extends DatasetDescriptor {
  service: "electricity-service" | "reporting-service";
  path: string;
  parameters: DatasetParameterSpec[];
}

type RawEntry = readonly [slug: string, title: string, parameters?: string, method?: "GET"];

const DATE_FIELDS = new Set<DatasetDateField>([
  "startDate",
  "endDate",
  "date",
  "period",
  "periodStartDate",
  "periodEndDate",
  "versionStartDate",
  "versionEndDate",
]);

const INTEGER_FILTERS = new Set([
  "contractId",
  "distributionCompanyId",
  "distributionId",
  "distrubutionOrganization",
  "groupId",
  "mesajTipId",
  "meterReadOrgId",
  "meterReadingType",
  "organizationId",
  "powerPlantId",
  "powerplantId",
  "profileGroupId",
  "provinceId",
  "regionId",
  "subscriberProfileGroup",
  "uevcbId",
  "year",
]);

const INTEGER_ARRAY_FILTERS = new Set(["organizationIds", "powerPlantIds", "uevcbIds"]);

const INTEGER_YEAR_PATHS = new Set([
  "/v1/markets/pfm/data/contract-price-summary",
  "/v1/markets/pfm/data/ggf",
  "/v1/markets/pfm/data/open-position",
  "/v1/markets/pfm/data/pfm-trade-value",
  "/v1/markets/pfm/data/vep-matching-quantity",
  "/v1/renewables/data/renewables-participant",
]);

function filterType(key: string, path: string): DatasetFilterType {
  if (key === "year") return INTEGER_YEAR_PATHS.has(path) ? "integer" : "string";
  if (key === "subscriberProfileGroup" && path.endsWith("/meter-volume")) return "string";
  if (INTEGER_ARRAY_FILTERS.has(key)) return "integer[]";
  if (INTEGER_FILTERS.has(key)) return "integer";
  return "string";
}

function group(
  category: string,
  prefix: string,
  entries: readonly RawEntry[],
  service: DatasetDefinition["service"] = "electricity-service",
): DatasetDefinition[] {
  return entries.map(([slug, title, parameterList = "page", method = "POST"]): DatasetDefinition => {
    const httpMethod: "GET" | "POST" = method === "GET" ? "GET" : "POST";
    const path = `${prefix}/${slug}`;
    const parameters = httpMethod === "GET"
      ? []
      : parameterList.split(",").map((raw): DatasetParameterSpec => {
          const trimmed = raw.trim();
          const required = trimmed.endsWith("*");
          const key = required ? trimmed.slice(0, -1) : trimmed;
          if (key === "page") return { key, required: false, kind: "page" };
          if (DATE_FIELDS.has(key as DatasetDateField)) {
            return { key, required, kind: "date" };
          }
          return { key, required, kind: "filter", type: filterType(key, path) };
        });
    const availableFilters: DatasetFilterCapability[] = parameters
      .filter((parameter) => parameter.kind === "filter")
      .map((parameter) => ({
        key: parameter.key,
        required: parameter.required,
        type: parameter.type ?? "string",
      }));
    const dateFields = parameters
      .filter((parameter) => parameter.kind === "date")
      .flatMap((parameter): DatasetDateCapability[] => {
        const key = parameter.key === "periodStartDate"
          ? "startDate"
          : parameter.key === "periodEndDate"
            ? "endDate"
            : parameter.key;
        if (key === "versionStartDate" || key === "versionEndDate") return [];
        if (key !== "startDate" && key !== "endDate" && key !== "date" && key !== "period") return [];
        return [{ key, required: parameter.required }];
      })
      .filter((capability, index, all) => all.findIndex((item) => item.key === capability.key) === index);

    return {
      id: service === "reporting-service"
        ? `reports.${slug}`
        : path.slice(4).replaceAll("/data/", "/").replaceAll("/", "."),
      title,
      category,
      service,
      method: httpMethod,
      path,
      supportsPagination: parameters.some((parameter) => parameter.kind === "page"),
      dateFields,
      availableFilters,
      parameters,
    };
  });
}

const DATASETS: DatasetDefinition[] = [
  ...group("Barajlar ve Hidroloji", "/v1/dams/data", [
    ["active-fullness", "Aktif Doluluk", "basinName,damName,page"],
    ["active-volume", "Aktif Hacim", "basinName,damName,page"],
    ["basin-list", "Havza Listesi", "", "GET"],
    ["daily-kot", "Günlük Kot", "basinName,damName,page"],
    ["daily-volume", "Günlük Hacim", "basinName,damName,page"],
    ["dam-kot", "Baraj Kotu", "basinName,damName,page"],
    ["dam-list", "Baraj Listesi", "basinName"],
    ["dam-volume", "Baraj Hacmi", "basinName,damName,page"],
    ["flow-rate-and-installed-power", "Debi ve Kurulu Güç", "basinName,damName,page"],
    ["water-energy-provision", "Suyun Enerji Karşılığı", "basinName,damName,page"],
  ]),
  ...group("Dengeleme Güç Piyasası", "/v1/markets/bpm/data", [
    ["order-summary-down", "Yük Atma (YAT) Talimat Miktarı", "startDate*,endDate*,region,page"],
    ["order-summary-up", "Yük Alma (YAL) Talimat Miktarı", "startDate*,endDate*,region,page"],
    ["system-direction", "Sistem Yönü", "startDate*,endDate*,region,page"],
    ["system-marginal-price", "Sistem Marjinal Fiyatı", "startDate*,endDate*,region,page"],
  ]),
  ...group("Dengesizlik", "/v1/markets/imbalance/data", [
    ["dsg-imbalance-quantity", "Dengeden Sorumlu Grup Dengesizlik Miktarı", "startDate*,endDate*,region,organizationId,page"],
    ["dsg-organization-list", "DSG Organizasyon Listesi", "startDate*,endDate*"],
    ["imbalance-amount", "Dengesizlik Tutarı", "startDate*,endDate*,region,page"],
    ["imbalance-quantity", "Dengesizlik Miktarı", "startDate*,endDate*,page"],
  ]),
  ...group("Geçmişe Dönük Düzeltme", "/v1/markets/retroactive-adjustment/data", [
    ["distribution-list", "Dağıtım Listesi", "", "GET"],
    ["meter-count-subject-to-retroactive-adjustment", "GDDK'ya Konu Sayaç Sayısı", "startDate*,endDate*,subscriberProfileGroupName,distributionId,page"],
    ["meter-volume", "GDDK'ya Konu Sayaç Hacmi", "periodStartDate,periodEndDate,versionStartDate,versionEndDate,subscriberProfileGroup,meterReadOrgId*,page"],
    ["organization-list", "Sayaç Okuyan Kurum Listesi", "", "GET"],
    ["retroactive-adjustment-sum", "GDDK Tutarı", "startDate*,endDate*,page"],
    ["subscriber-profile-group-list", "Profil Abone Grubu Listesi", "", "GET"],
    ["volume-subscriber-profile-group-list", "GDDK Hacim Profil Abone Grubu Listesi", "", "GET"],
  ]),
  ...group("Piyasa Mesaj Sistemi ve AUF", "/v1/markets/data", [
    ["market-message-system", "Piyasa Mesaj Sistemi", "startDate*,endDate*,regionId*,mesajTipId,organizationId,uevcbId,powerPlantId,page"],
    ["maximum-settlement-price", "Azami Uzlaştırma Fiyatı (AUF)", "startDate*,endDate*,page"],
    ["power-plant-list-by-organization-id", "Piyasa Mesaj Sistemi Santral Listesi", "startDate*,endDate*"],
    ["uevcb-list-by-power-plant-id", "Piyasa Mesaj Sistemi UEVÇB Listesi", "startDate*,powerPlantId*"],
    ["umm-message-type-list", "Piyasa Mesaj Sistemi Mesaj Tipi Listesi", "", "GET"],
    ["umm-region-list", "Piyasa Mesaj Sistemi Bölge Listesi", "", "GET"],
  ]),
  ...group("Gün İçi Piyasası", "/v1/markets/idm/data", [
    ["bid-offer-quantities", "GİP Teklif Edilen Alış Satış Miktarları", "startDate*,endDate*,page"],
    ["matching-quantity", "GİP Eşleşme Miktarı", "startDate*,endDate*,organizationId,page"],
    ["min-max-bid-price", "GİP Min-Maks Alış Teklif Fiyatı", "startDate*,endDate*,page"],
    ["min-max-matching-price", "GİP Min-Maks Eşleşme Fiyatı", "startDate*,endDate*,page"],
    ["min-max-sales-offer-price", "GİP Min-Maks Satış Teklif Fiyatı", "startDate*,endDate*,page"],
    ["trade-value", "GİP İşlem Hacmi", "startDate*,endDate*,page"],
    ["transaction-history", "GİP İşlem Akışı", "startDate*,endDate*,page"],
    ["weighted-average-price", "GİP Ağırlıklı Ortalama Fiyat", "startDate*,endDate*,page"],
  ]),
  ...group("Gün Öncesi Piyasası", "/v1/markets/dam/data", [
    ["amount-of-block-buying", "GÖP Blok Alış Miktarı", "startDate*,endDate*,page"],
    ["amount-of-block-selling", "GÖP Blok Satış Miktarı", "startDate*,endDate*,page"],
    ["clearing-quantity", "GÖP Eşleşme Miktarı", "startDate*,endDate*,organizationId,page"],
    ["clearing-quantity-organization-list", "GÖP Eşleşme Miktarı Organizasyon Listesi", "period*"],
    ["day-ahead-market-trade-volume", "GÖP İşlem Hacmi", "startDate*,endDate*,page"],
    ["flexible-offer-buying-quantity", "GÖP Esnek Alış Teklif Miktarı", "startDate*,endDate*,page"],
    ["flexible-offer-selling-quantity", "GÖP Esnek Satış Teklif Miktarı", "startDate*,endDate*,page"],
    ["interim-mcp", "Kesinleşmemiş Piyasa Takas Fiyatı (K.PTF)", "startDate*,page"],
    ["interim-mcp-published-status", "K.PTF Yayınlanma Durumu", "", "GET"],
    ["matched-flexible-offer-quantity", "GÖP Esnek Teklif Eşleşme Miktarı", "startDate*,endDate*,region,page"],
    ["mcp", "Piyasa Takas Fiyatı (PTF)", "startDate*,endDate*,page"],
    ["price-independent-bid", "GÖP Fiyattan Bağımsız Alış Teklifi", "startDate*,endDate*,page"],
    ["price-independent-offer", "GÖP Fiyattan Bağımsız Satış Teklifi", "startDate*,endDate*,page"],
    ["side-payments", "GÖP Fark Tutarı", "startDate*,endDate*,region,page"],
    ["submitted-bid-order-volume", "GÖP Teklif Edilen Alış Miktarı", "startDate*,endDate*,page"],
    ["submitted-sales-order-volume", "GÖP Teklif Edilen Satış Miktarı", "startDate*,endDate*,page"],
    ["supply-demand", "GÖP Arz-Talep", "date*,page"],
    ["supply-demand-chart-data", "Arz-Talep Grafik Verisi", "date*,page"],
    ["supply-demand-chart-ptf-data", "Arz-Talep Grafik Saatlik PTF", "date*"],
  ]),
  ...group("İkili Anlaşmalar", "/v1/markets/bilateral-contracts/data", [
    ["amount-of-bilateral-contracts", "EÜAŞ-GTŞ İkili Anlaşmalar", "startDate*,endDate*,page"],
    ["bilateral-contracts-bid-quantity", "İkili Anlaşma Alış Miktarı", "startDate*,endDate*,organizationId,page"],
    ["bilateral-contracts-offer-quantity", "İkili Anlaşma Satış Miktarı", "startDate*,endDate*,organizationId,page"],
  ]),
  ...group("İletim ve Enterkonneksiyon", "/v1/transmission/data", [
    ["capacity-demand", "Kapasite Talepleri", "startDate*,endDate*,direction*,page"],
    ["capacity-demand-direction", "Kapasite Talepleri Yön Listesi", "", "GET"],
    ["congestion-cost", "Kısıt Maliyeti", "startDate*,endDate*,page,region,orderType*,priceType*"],
    ["entso-w-organization", "ENTSO-E (W) Kodları", "period*,organizationId,page"],
    ["entso-w-uevcb", "ENTSO-E (W) UEVÇB", "period*,provinceId,uevcbName,page"],
    ["international-line-events", "Enterkonneksiyon Arıza Bakım Bildirimleri", "startDate*,endDate*,page"],
    ["iskk-list", "İletim Sistemi Kayıp Katsayısı (ISKK)", "startDate*,endDate*,region,page"],
    ["line-capacities", "Hat Kapasiteleri", "startDate*,endDate*,direction*,page"],
    ["line-capacities-direction", "Hat Kapasiteleri Yön Listesi", "", "GET"],
    ["nominal-capacity", "Nomine Kapasite", "startDate*,endDate*,page"],
    ["organization-list", "ENTSO-E (X) Kodları", "period*,organizationId,page"],
    ["tcat-pre-month-forecast", "Enterkonneksiyon Kapasitesi Ay Öncesi Tahmini", "startDate*,endDate*,page"],
    ["tcat-pre-year-forecast", "Enterkonneksiyon Kapasitesi Yıl Öncesi Tahmini", "startDate*,endDate*,page"],
    ["zero-balance", "Sıfır Bakiye Düzeltme Tutarı", "startDate*,endDate*,page"],
  ]),
  ...group("Piyasa Katılımcıları", "/v1/markets/general-data/data", [
    ["market-participants", "Piyasa Katılımcıları", "organizationId,page"],
    ["market-participants-organization-filter-list", "Piyasa Katılımcıları Organizasyon Filtresi", "", "GET"],
    ["participant-count-based-upon-license-type", "Lisans Türüne Göre Katılımcı Sayısı", "startDate*,page"],
  ]),
  ...group("Tüketim ve Tüketici", "/v1/consumption/data", [
    ["consumer-quantity", "Tüketici Sayısı", "period*,provinceId,profileGroupId,page"],
    ["consumer-sector-list", "Profil Grubu Listesi", "", "GET"],
    ["consumption-quantity", "Tüketim Miktarları", "period*,provinceId,profileGroupId,page"],
    ["demand-forecast", "Talep Tahmini", "distrubutionOrganization,page"],
    ["distribution-region", "Dağıtım Bölgesi", "", "GET"],
    ["eligible-consumer-count", "İl ve İlçe Serbest Tüketici Sayısı", "period*,provinceId,profileGroupName,districtName,page"],
    ["eligible-consumer-quantity", "Serbest Tüketici Tüketim Miktarı", "startDate*,endDate*,page"],
    ["get-distribution-companies", "Dağıtım Şirketleri", "", "GET"],
    ["load-estimation-plan", "Yük Tahmin Planı", "startDate*,endDate*,page"],
    ["main-tariff-group-list", "Ana Tarife Grubu", "", "GET"],
    ["meter-count", "Sayaç Adedi", "page"],
    ["monthly-index", "Aylık Endeks", "startDate*,endDate*,groupId*,page"],
    ["multiple-factor", "Çarpan Değeri", "period*,distributionId*,meterReadingType*,subscriberProfileGroup*,page"],
    ["multiple-factor-bulk", "Toplu Çarpan Değeri", "period*,distributionId*"],
    ["multiple-factor-distribution", "Dağıtım Firmaları", "period*"],
    ["multiple-factor-meter-reading-type", "Sayaç Okuma Tipi", "", "GET"],
    ["multiple-factor-profile-group", "Çarpan Profil Abone Grubu", "period*,distributionId"],
    ["percentage-consumption-info", "Yüzdesel Tüketim Bilgileri", "period*,provinceId,page"],
    ["planned-power-outage-info", "Planlı Kesinti Bilgisi", "period*,page,distributionCompanyId,provinceId"],
    ["profile-subscription-group-list", "Profil Abone Grubu", "period*,provinceId,districtName"],
    ["realtime-consumption", "Gerçek Zamanlı Tüketim", "startDate*,endDate*,page"],
    ["st-adedi", "Serbest Tüketici Adedi", "startDate*,endDate*,page"],
    ["st-uecm", "Serbest Tüketici Uzlaştırmaya Esas Çekiş Miktarı", "period*,page"],
    ["uecm", "Uzlaştırmaya Esas Çekiş Miktarı (UEÇM)", "startDate*,endDate*,region,page"],
    ["unplanned-power-outage-info", "Plansız Kesinti Bilgisi", "period*,page,distributionCompanyId,provinceId"],
    ["withdrawal-quantity-under-supply-liability", "Tedarik Yükümlülüğü UEÇM", "startDate*,endDate*,page"],
  ]),
  ...group("Üretim ve Üretim Planlama", "/v1/generation/data", [
    ["aic", "Emre Amade Kapasite (EAK)", "startDate*,endDate*,region*,organizationId,uevcbId,page"],
    ["dpp", "Kesinleşmiş Günlük Üretim Planı (KGÜP)", "startDate*,endDate*,region*,organizationId,uevcbId,page"],
    ["dpp-bulk", "UEVÇB Bazlı Toplu KGÜP", "date*,region*,uevcbIds*,page"],
    ["dpp-first-version", "KGÜP İlk Versiyon", "startDate*,endDate*,region*,organizationId,uevcbId,page"],
    ["injection-quantity", "Uzlaştırmaya Esas Veriş Miktarı (UEVM)", "startDate*,endDate*,powerplantId,page"],
    ["injection-quantity-powerplant-list", "UEVM Santral Listesi", "", "GET"],
    ["licensed-powerplant-investment-list", "Lisanslı Santral Yatırımları", "startDate*,endDate*,page"],
    ["organization-list", "Üretim Organizasyon Listesi", "startDate*,endDate*"],
    ["powerplant-list", "Santral Listesi", "", "GET"],
    ["powerplant-list-for-date-range", "Tarih Aralığına Göre Santral Listesi", "startDate*,endDate*"],
    ["realtime-generation", "Gerçek Zamanlı Üretim", "startDate*,endDate*,powerPlantId,page"],
    ["realtime-generation-bulk", "Santral Bazlı Toplu Gerçek Zamanlı Üretim", "date*,powerPlantIds*,page"],
    ["region-list", "Üretim Bölge Listesi", "", "GET"],
    ["sbfgp", "Kesinleştirilmiş Uzlaştırma Dönemi Üretim Planı (KUDÜP)", "startDate*,endDate*,region*,organizationId,uevcbId,page"],
    ["uevcb-list", "UEVÇB Listesi", "startDate*,organizationId*"],
    ["uevcb-list-bulk", "Toplu UEVÇB Listesi", "startDate*,organizationIds*"],
  ]),
  ...group("Vadeli Elektrik Piyasası", "/v1/markets/pfm/data", [
    ["contract-price-summary", "VEP Kontrat Fiyatları Özeti", "startDate*,endDate*,year,deliveryPeriod,loadType,page"],
    ["delivery-period-list", "VEP Teslimat Dönemi Listesi", "startDate*,endDate*"],
    ["delivery-year-list", "VEP Teslimat Yılı Listesi", "startDate*,endDate*"],
    ["ggf", "VEP Günlük Gösterge Fiyatı", "startDate*,endDate*,year,deliveryPeriod,loadType,page"],
    ["ggf-delivery-period-list", "GGF Teslimat Dönemi Listesi", "startDate*,endDate*"],
    ["load-type-list", "VEP Yük Tipi Listesi", "startDate*,endDate*"],
    ["offer-price", "VEP Teklif Fiyatları", "page"],
    ["open-position", "VEP Açık Pozisyon", "startDate*,endDate*,year,deliveryPeriod,loadType,page"],
    ["pfm-trade-value", "VEP İşlem Hacmi", "startDate*,endDate*,year,deliveryPeriod,loadType,page"],
    ["pfm-transaction-history", "VEP İşlem Akışı", "startDate*,endDate*,year,deliveryPeriod,loadType,page"],
    ["th-delivery-period-list", "VEP İşlem Akışı Teslimat Dönemi Listesi", "startDate*,endDate*"],
    ["vep-matching-quantity", "VEP Eşleşme Miktarı", "startDate*,endDate*,year,deliveryPeriod,loadType,page"],
  ]),
  ...group("Yan Hizmetler", "/v1/markets/ancillary-services/data", [
    ["primary-frequency-capacity-amount", "Primer Frekans Rezerv Miktarı", "startDate*,endDate*,page"],
    ["primary-frequency-capacity-price", "Primer Frekans Kontrolü (PFK) Fiyatı", "startDate*,endDate*,page"],
    ["secondary-frequency-capacity-amount", "Sekonder Frekans Rezerv Miktarı", "startDate*,endDate*,page"],
    ["secondary-frequency-capacity-price", "Sekonder Frekans Kontrolü (SFK) Fiyatı", "startDate*,endDate*,page"],
  ]),
  ...group("YEK-G", "/v1/markets/yek-g/data", [
    ["bilateral-contract-list", "YEK-G İkili Anlaşma Miktarları", "startDate*,endDate*,page"],
    ["cancelation-quantity", "YEK-G İtfa İşlem Miktarları", "startDate*,endDate*,page"],
    ["expiry-quantity", "İlga Edilen YEK-G Belge Miktarı", "startDate*,endDate*,page"],
    ["exported-document-quantity", "İhraç Edilen YEK-G Belge Miktarı", "startDate*,endDate*,page"],
    ["market-bid-ask-quantity", "YEK-G Piyasa Alış Satış Teklif Miktarı", "startDate*,endDate*,page"],
    ["min-max-match-amount-list", "YEK-G Min-Maks Eşleşme Fiyatı", "startDate*,endDate*,page"],
    ["trading-volume", "YEK-G Piyasa İşlem Hacmi", "startDate*,endDate*,page"],
    ["weighted-average-price", "YEK-G Ağırlıklı Ortalama Fiyat", "startDate*,endDate*,page"],
    ["withdrawal-quantity", "İptal Edilen YEK-G Belge Miktarı", "startDate*,endDate*,page"],
    ["yekg-matching-quantity", "YEK-G Piyasa Eşleşme Miktarı", "startDate*,endDate*,page"],
  ]),
  ...group("Yenilenebilirler ve YEKDEM", "/v1/renewables/data", [
    ["generation-forecast", "Üretim Tahmini", "startDate*,endDate*,page"],
    ["imbalance-cost", "Yenilenebilir Dengesizlik Maliyeti", "startDate*,endDate*,page"],
    ["imbalance-quantity", "Yenilenebilir Dengesizlik Miktarı", "startDate*,endDate*,page"],
    ["licensed-generation-cost", "YEK Bedeli (YEKBED)", "startDate*,endDate*,region,page"],
    ["licensed-powerplant-list", "Lisanslı Santral Listesi", "period*"],
    ["licensed-realtime-generation", "YEKDEM Gerçek Zamanlı Üretim", "startDate*,endDate*,powerPlantId,page"],
    ["new-installed-capacity", "YEKDEM Son Tarih Sonrası Kurulu Güç", "period*"],
    ["old-installed-capacity", "YEKDEM Son Tarih ve Öncesi Kurulu Güç", "period*"],
    ["portfolio-income", "YEKDEM Portföy Geliri", "startDate*,endDate*,page"],
    ["renewable-sm-licensed-injection-quantity", "YEKDEM Uzlaştırmaya Esas Veriş Miktarı", "startDate*,endDate*,region,page"],
    ["renewables-participant", "YEKDEM Katılımcı Listesi", "year*,page"],
    ["renewables-participant-year-list", "YEKDEM Katılımcı Yıl Listesi", "", "GET"],
    ["renewables-support-mechanism-income", "YEK Geliri (YG)", "startDate*,endDate*,region,page"],
    ["res-generation-and-forecast", "RES Üretim ve Tahmin", "startDate*,endDate*,page"],
    ["spot-order", "Yenilenebilir Spot Teklifi", "startDate*,endDate*,page"],
    ["total-cost", "Toplam Gider (YEKTOB)", "startDate*,endDate*,page"],
    ["unit-cost", "YEKDEM Birim Maliyeti", "startDate*,endDate*,page"],
    ["unlicensed-generation-amount", "Lisanssız Üretim Miktarı", "startDate*,endDate*,region,page"],
    ["unlicensed-generation-cost", "Lisanssız Üretim Bedeli", "startDate*,endDate*,region,page"],
  ]),
  ...group("Elektrik Piyasası Raporları", "/v1/data", [
    ["ptf-smf-sdf", "PTF, SMF ve SDF Listeleme", "startDate*,endDate*,page"],
    ["daily-report", "Günlük Rapor", "startDate*,endDate*,page"],
    ["periodic-price-averages", "Dönemsel Fiyat Ortalamaları", "page"],
    ["periodic-price-volume", "Dönemsel Piyasa Hacimleri", "page"],
    ["eligible-consumer-and-meter-increases", "Serbest Tüketici ve Sayaç Artışları", "", "GET"],
    ["mcp-smp-averages", "PTF ve SMF Fiyat Ortalamaları", "startDate*,endDate*,page"],
    ["smp-mcp-multiple-daytime-avg", "PTF ve SMF Üç Zamanlı Ortalamaları", "page"],
    ["daily-prices", "Günlük Fiyatlar", "date*,page"],
    ["dgp-talimat-agr-ort", "DGP Ağırlıklı Talimat Ortalamaları", "date*,page"],
    ["electricity-market-volume-physically", "Fiziksel Elektrik Piyasası Hacimleri", "startDate*,endDate*,page"],
    ["dgp-talimat", "DGP Talimatları", "date*,page"],
    ["idm-contract-summary", "GİP Kontrat Özeti", "startDate*,endDate*,page"],
    ["idm-order-list", "GİP Emir Listesi", "startDate*,endDate*,contractId*,page"],
  ], "reporting-service"),
];

const BY_ID = new Map(DATASETS.map((dataset) => [dataset.id, dataset]));

if (BY_ID.size !== DATASETS.length) {
  throw new Error("EPİAŞ dataset registry contains duplicate dataset IDs.");
}

export function listDatasetDefinitions(): readonly DatasetDefinition[] {
  return DATASETS;
}

export function getDatasetDefinition(datasetId: string): DatasetDefinition | null {
  return BY_ID.get(datasetId) ?? null;
}

export function listCatalogDatasetMappings(): ReadonlyArray<{
  menuId: number;
  datasetId: string;
}> {
  return [...MENU_ID_TO_DATASET_ID].map(([menuId, datasetId]) => ({ menuId, datasetId }));
}

export function resolveCatalogDataset(
  menuId: number,
  label: string,
  trail: readonly string[],
): CatalogDatasetCapability | null {
  if (!Number.isSafeInteger(menuId) || menuId < 0 || !label.trim()) return null;
  const datasetId = MENU_ID_TO_DATASET_ID.get(menuId);
  const definition = datasetId ? BY_ID.get(datasetId) : undefined;
  if (!datasetId || !definition) return null;
  // Menu IDs are upstream-owned. Requiring the versioned label fingerprint
  // prevents a recycled ID from silently calling an unrelated endpoint.
  const inputLabelFingerprint = labelFingerprint(label);
  const matchingAliases = (CATALOG_IDENTITY_ALIASES_V2026_09_04[menuId] ?? [])
    .filter((alias) => inputLabelFingerprint === labelFingerprint(alias.label));
  const matchesVersionedAlias = matchingAliases.some(
    (alias) => trailFingerprint(trail) === trailFingerprint(alias.trail),
  );
  const matchesRegistryTitle = matchingAliases.length === 0
    && inputLabelFingerprint === labelFingerprint(definition.title);
  if (!matchesRegistryTitle && !matchesVersionedAlias) return null;
  return { menuId, datasetId, label, trail: [...trail] };
}

function labelFingerprint(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9ışgüöç]+/g, "");
}

function trailFingerprint(trail: readonly string[]): string {
  return trail.map(labelFingerprint).join(">");
}

interface CatalogIdentityAlias {
  label: string;
  trail: readonly string[];
}

const ELECTRICITY_ROOT_TRAIL = ["ELEKTRİK"] as const;

function officialTrail(...parts: string[]): readonly string[] {
  return [...ELECTRICITY_ROOT_TRAIL, ...parts];
}

/**
 * Exact Turkish label/trail identities observed in the official EPİAŞ
 * electricity menu on 2026-09-04. These aliases are deliberately keyed by
 * the already allowlisted menu ID; they never introduce an endpoint or allow
 * a label belonging to another branch of the catalog.
 */
const CATALOG_IDENTITY_ALIASES_V2026_09_04: Readonly<
  Partial<Record<number, readonly CatalogIdentityAlias[]>>
> = Object.freeze({
  50: [{ label: "Dengesizlik Maliyeti", trail: officialTrail("YEKDEM") }],
  51: [{ label: "Dengesizlik Miktarı", trail: officialTrail("YEKDEM") }],
  57: [{ label: "Spot Teklifi", trail: officialTrail("YEKDEM") }],
  58: [{ label: "Birim Maliyeti", trail: officialTrail("YEKDEM") }],
  92: [{ label: "Dönemlik Fiyat Ortalamaları", trail: officialTrail("ELEKTRİK PİYASASI RAPORLARI") }],
  93: [{ label: "Dönemlik Piyasa Hacimleri", trail: officialTrail("ELEKTRİK PİYASASI RAPORLARI") }],
  95: [{ label: "SMF ve PTF Fiyat Ortalamaları", trail: officialTrail("ELEKTRİK PİYASASI RAPORLARI") }],
  96: [{ label: "SMF ve PTF 3 Zamanlı Fiyat Ortalamaları", trail: officialTrail("ELEKTRİK PİYASASI RAPORLARI") }],
  98: [{ label: "Elektrik Piyasa Hacimleri Fiziksel", trail: officialTrail("ELEKTRİK PİYASASI RAPORLARI") }],
  108: [{
    label: "GÖP Teklif Edilen Alış Miktarları",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Gün Öncesi Piyasası (GÖP)"),
  }],
  109: [{
    label: "GÖP Teklif Edilen Satış Miktarları",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Gün Öncesi Piyasası (GÖP)"),
  }],
  115: [{
    label: "GÖP Esnek Teklif Eşleşme Miktarları",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Gün Öncesi Piyasası (GÖP)"),
  }],
  121: [
    {
      label: "GİP Min - Maks Eşleşme Fiyat",
      trail: officialTrail("ELEKTRİK PİYASALARI", "Gün İçi Piyasası (GİP)"),
    },
    {
      label: "GİP Min-Maks Eşleşme Fiyatı",
      trail: officialTrail("ELEKTRİK PİYASALARI", "Gün İçi Piyasası"),
    },
  ],
  129: [{
    label: "VEP Kontrat Fiyatları Özet",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Vadeli Elektrik Piyasası (VEP)"),
  }],
  134: [{
    label: "Yük Alma (YAL) Talimat Miktarları",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Dengeleme Güç Piyasası (DGP)"),
  }],
  141: [{
    label: "Org. YEK-G Piyasa Ağırlıklı Ortalama Fiyat",
    trail: officialTrail("ELEKTRİK PİYASALARI", "YEK-G Sistemi ve Org. Piyasa"),
  }],
  142: [{
    label: "Org. YEK-G Piyasa Eşleşme Miktarları",
    trail: officialTrail("ELEKTRİK PİYASALARI", "YEK-G Sistemi ve Org. Piyasa"),
  }],
  143: [{
    label: "YEK-G Min-Max Eşleşme Fiyatları",
    trail: officialTrail("ELEKTRİK PİYASALARI", "YEK-G Sistemi ve Org. Piyasa"),
  }],
  144: [{
    label: "YEK-G Org. Piyasa İşlem Hacmi",
    trail: officialTrail("ELEKTRİK PİYASALARI", "YEK-G Sistemi ve Org. Piyasa"),
  }],
  145: [{
    label: "YEK-G Org. Piyasa Alış/Satış Teklif Miktarı",
    trail: officialTrail("ELEKTRİK PİYASALARI", "YEK-G Sistemi ve Org. Piyasa"),
  }],
  146: [{
    label: "Primer Frekans Kontrolü (PFK) Fiyat",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Yan Hizmetler"),
  }],
  148: [{
    label: "Sekonder Frekans Kontrolü (SFK) Fiyat",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Yan Hizmetler"),
  }],
  150: [{
    label: "İkili Anlaşma (İA) Alış Miktarı",
    trail: officialTrail("ELEKTRİK PİYASALARI", "İkili Anlaşmalar"),
  }],
  151: [{
    label: "İkili Anlaşma (İA) Satış Miktarı",
    trail: officialTrail("ELEKTRİK PİYASALARI", "İkili Anlaşmalar"),
  }],
  155: [{
    label: "Dengeden Sorumlu Grup (DSG) Dengesizlik Miktarı",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Dengesizlik"),
  }],
  156: [{
    label: "GDDK'ya Konu olan Sayaç Sayısı",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Geriye Dönük Düzeltme Kalemi (GDDK)"),
  }],
  158: [{
    label: "GDDK'ya Konu olan Sayaç Hacim Verileri",
    trail: officialTrail("ELEKTRİK PİYASALARI", "Geriye Dönük Düzeltme Kalemi (GDDK)"),
  }],
  165: [{
    label: "Uzlaştırma Esas Veriş Miktarı (UEVM)",
    trail: officialTrail("ELEKTRİK ÜRETİM", "Gerçekleşen Üretim"),
  }],
  171: [{
    label: "Tedarik Yükümlülüğü Kapsamındaki Uzlaştırmaya Esas Çekiş Miktarı (UEÇM)",
    trail: officialTrail("ELEKTRİK TÜKETİM", "Gerçekleşen Tüketim"),
  }],
  177: [{
    label: "İl, İlçe ST Adedi",
    trail: officialTrail("ELEKTRİK TÜKETİM", "Serbest Tüketici"),
  }],
  183: [{
    label: "Gerçek Zamanlı Üretim",
    trail: officialTrail("YEKDEM", "Lisanslı Üretim Miktarı"),
  }],
  184: [{
    label: "Uzlaştırma Esas Veriş Miktarı (UEVM)",
    trail: officialTrail("YEKDEM", "Lisanslı Üretim Miktarı"),
  }],
  185: [{
    label: "Sıfır Bakiye Düzeltme Tutarı Aylık",
    trail: officialTrail("ELEKTRİK İLETİM", "Sıfır Bakiye"),
  }],
  189: [{
    label: "Enterkonneksiyon Kapasitesine İlişkin Yıl Öncesi Tahminler",
    trail: officialTrail("ELEKTRİK İLETİM", "Enterkonneksiyon Kapasitesine İlişkin Tahminler"),
  }],
  190: [{
    label: "Enterkonneksiyon Kapasitesine İlişkin Ay Öncesi Tahminler",
    trail: officialTrail("ELEKTRİK İLETİM", "Enterkonneksiyon Kapasitesine İlişkin Tahminler"),
  }],
  191: [{ label: "Kot", trail: officialTrail("BARAJLAR", "Baraj Bilgileri") }],
  192: [{ label: "Hacim", trail: officialTrail("BARAJLAR", "Baraj Bilgileri") }],
  248: [
    {
      label: "PİYASA MESAJ SİSTEMİ",
      trail: ELECTRICITY_ROOT_TRAIL,
    },
    {
      label: "PİYASA MESAJ SİSTEMİ",
      trail: officialTrail("PİYASA MESAJ SİSTEMİ"),
    },
  ],
  253: [{ label: "GİP Teklif Listesi", trail: officialTrail("ELEKTRİK PİYASASI RAPORLARI") }],
  257: [{
    label: "DGP Talimatları (Ağırlıklı Ortalama)",
    trail: officialTrail("ELEKTRİK PİYASASI RAPORLARI"),
  }],
  258: [{
    label: "Kesinleşmiş Günlük Üretim Planı (KGÜP) – İlk Versiyon",
    trail: officialTrail("ELEKTRİK ÜRETİM", "Planlama"),
  }],
});

const MENU_ID_TO_DATASET_ID = new Map<number, string>([
  [36, "markets.maximum-settlement-price"],
  [40, "generation.licensed-powerplant-investment-list"],
  [49, "renewables.portfolio-income"],
  [50, "renewables.imbalance-cost"],
  [51, "renewables.imbalance-quantity"],
  [52, "renewables.res-generation-and-forecast"],
  [54, "renewables.unlicensed-generation-amount"],
  [55, "renewables.unlicensed-generation-cost"],
  [56, "renewables.generation-forecast"],
  [57, "renewables.spot-order"],
  [58, "renewables.unit-cost"],
  [60, "renewables.licensed-generation-cost"],
  [61, "renewables.renewables-support-mechanism-income"],
  [62, "renewables.total-cost"],
  [63, "renewables.renewables-participant"],
  [67, "transmission.international-line-events"],
  [69, "transmission.line-capacities"],
  [70, "transmission.capacity-demand"],
  [71, "transmission.nominal-capacity"],
  [72, "dams.daily-kot"],
  [73, "dams.active-fullness"],
  [74, "dams.active-volume"],
  [75, "dams.daily-volume"],
  [76, "dams.water-energy-provision"],
  [89, "transmission.entso-w-organization"],
  [90, "reports.ptf-smf-sdf"],
  [91, "reports.daily-report"],
  [92, "reports.periodic-price-averages"],
  [93, "reports.periodic-price-volume"],
  [94, "reports.eligible-consumer-and-meter-increases"],
  [95, "reports.mcp-smp-averages"],
  [96, "reports.smp-mcp-multiple-daytime-avg"],
  [97, "reports.daily-prices"],
  [98, "reports.electricity-market-volume-physically"],
  [99, "reports.dgp-talimat"],
  [101, "reports.idm-contract-summary"],
  [102, "markets.dam.mcp"],
  [103, "markets.dam.interim-mcp"],
  [104, "markets.dam.day-ahead-market-trade-volume"],
  [105, "markets.dam.price-independent-offer"],
  [106, "markets.dam.price-independent-bid"],
  [107, "markets.dam.supply-demand"],
  [108, "markets.dam.submitted-bid-order-volume"],
  [109, "markets.dam.submitted-sales-order-volume"],
  [110, "markets.dam.amount-of-block-buying"],
  [111, "markets.dam.amount-of-block-selling"],
  [112, "markets.dam.clearing-quantity"],
  [113, "markets.dam.flexible-offer-buying-quantity"],
  [114, "markets.dam.flexible-offer-selling-quantity"],
  [115, "markets.dam.matched-flexible-offer-quantity"],
  [116, "markets.dam.side-payments"],
  [117, "markets.idm.weighted-average-price"],
  [118, "markets.idm.matching-quantity"],
  [119, "markets.idm.min-max-bid-price"],
  [120, "markets.idm.min-max-sales-offer-price"],
  [121, "markets.idm.min-max-matching-price"],
  [122, "markets.idm.bid-offer-quantities"],
  [123, "markets.idm.trade-value"],
  [124, "markets.idm.transaction-history"],
  [125, "markets.pfm.ggf"],
  [126, "markets.pfm.vep-matching-quantity"],
  [127, "markets.pfm.pfm-trade-value"],
  [128, "markets.pfm.pfm-transaction-history"],
  [129, "markets.pfm.contract-price-summary"],
  [130, "markets.pfm.open-position"],
  [131, "markets.pfm.offer-price"],
  [132, "markets.bpm.system-marginal-price"],
  [133, "markets.bpm.system-direction"],
  [134, "markets.bpm.order-summary-up"],
  [135, "markets.bpm.order-summary-down"],
  [136, "markets.yek-g.exported-document-quantity"],
  [137, "markets.yek-g.expiry-quantity"],
  [138, "markets.yek-g.withdrawal-quantity"],
  [139, "markets.yek-g.bilateral-contract-list"],
  [140, "markets.yek-g.cancelation-quantity"],
  [141, "markets.yek-g.weighted-average-price"],
  [142, "markets.yek-g.yekg-matching-quantity"],
  [143, "markets.yek-g.min-max-match-amount-list"],
  [144, "markets.yek-g.trading-volume"],
  [145, "markets.yek-g.market-bid-ask-quantity"],
  [146, "markets.ancillary-services.primary-frequency-capacity-price"],
  [147, "markets.ancillary-services.primary-frequency-capacity-amount"],
  [148, "markets.ancillary-services.secondary-frequency-capacity-price"],
  [149, "markets.ancillary-services.secondary-frequency-capacity-amount"],
  [150, "markets.bilateral-contracts.bilateral-contracts-bid-quantity"],
  [151, "markets.bilateral-contracts.bilateral-contracts-offer-quantity"],
  [152, "markets.bilateral-contracts.amount-of-bilateral-contracts"],
  [153, "markets.imbalance.imbalance-quantity"],
  [154, "markets.imbalance.imbalance-amount"],
  [155, "markets.imbalance.dsg-imbalance-quantity"],
  [156, "markets.retroactive-adjustment.meter-count-subject-to-retroactive-adjustment"],
  [157, "markets.retroactive-adjustment.retroactive-adjustment-sum"],
  [158, "markets.retroactive-adjustment.meter-volume"],
  [159, "markets.general-data.participant-count-based-upon-license-type"],
  [160, "markets.general-data.market-participants"],
  [161, "generation.dpp"],
  [162, "generation.sbfgp"],
  [163, "generation.aic"],
  [164, "generation.realtime-generation"],
  [165, "generation.injection-quantity"],
  [166, "consumption.load-estimation-plan"],
  [167, "consumption.demand-forecast"],
  [168, "consumption.realtime-consumption"],
  [169, "consumption.uecm"],
  [170, "consumption.st-uecm"],
  [171, "consumption.withdrawal-quantity-under-supply-liability"],
  [172, "consumption.percentage-consumption-info"],
  [173, "consumption.multiple-factor"],
  [174, "consumption.meter-count"],
  [175, "consumption.st-adedi"],
  [176, "consumption.eligible-consumer-quantity"],
  [177, "consumption.eligible-consumer-count"],
  [178, "consumption.monthly-index"],
  [179, "consumption.planned-power-outage-info"],
  [180, "consumption.unplanned-power-outage-info"],
  [181, "consumption.consumer-quantity"],
  [182, "consumption.consumption-quantity"],
  [183, "renewables.licensed-realtime-generation"],
  [184, "renewables.renewable-sm-licensed-injection-quantity"],
  [185, "transmission.zero-balance"],
  [186, "transmission.iskk-list"],
  [187, "transmission.congestion-cost"],
  [188, "transmission.organization-list"],
  [189, "transmission.tcat-pre-year-forecast"],
  [190, "transmission.tcat-pre-month-forecast"],
  [191, "dams.dam-kot"],
  [192, "dams.dam-volume"],
  [193, "dams.flow-rate-and-installed-power"],
  [248, "markets.market-message-system"],
  [253, "reports.idm-order-list"],
  [257, "reports.dgp-talimat-agr-ort"],
  [258, "generation.dpp-first-version"],
]);

const versionedAliasMenuIds = Object.keys(CATALOG_IDENTITY_ALIASES_V2026_09_04).map(Number);
if (versionedAliasMenuIds.length !== 41) {
  throw new Error("EPİAŞ 2026-09-04 catalog identity alias set is incomplete.");
}
for (const menuId of versionedAliasMenuIds) {
  if (!MENU_ID_TO_DATASET_ID.has(menuId)) {
    throw new Error(`EPİAŞ catalog identity alias references unmapped menu ID ${menuId}.`);
  }
}
