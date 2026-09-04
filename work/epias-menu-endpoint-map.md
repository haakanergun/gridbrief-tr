# EPİAŞ Şeffaflık 2.0 elektrik menüsü → servis eşlemesi

Bu çalışma 3 Eylül 2026'da canlı TGT oturumuyla alınan **ELEKTRİK** menüsündeki 134 seçilebilir ekranı, EPİAŞ'ın resmî OpenAPI şemalarıyla eşler. Uygulamanın bir kullanıcı isteğini URL'ye dönüştüren genel bir proxy kurmaması gerekir: yalnızca burada yer alan sabit `menuId`/endpoint eşleşmeleri çağrılmalıdır.

## Kaynak ve kapsam

- Elektrik ana servis kökü: `https://seffaflik.epias.com.tr/electricity-service`
- Elektrik OpenAPI: `https://seffaflik.epias.com.tr/electricity-service/technical/tr/swagger.json` (v1.15.15)
- Rapor servis kökü: `https://seffaflik.epias.com.tr/reporting-service`
- Rapor OpenAPI: `https://seffaflik.epias.com.tr/reporting-service/technical/tr/swagger.json`
- Menü kaynağı: `GET /v1/menu/get-menu-tree` (TGT ile canlı doğrulandı)

`R` = request DTO, `S` = response DTO. `S.items[]` şeması, endpoint'in satır alanlarının resmî kaynağıdır; adaptör bu alanları önceden belirlenmiş bir tablo sözleşmesine dönüştürmeli, istemciden alan adı/URL/method almamalıdır. Sayfalı POST'larda `page` isteğe bağlı sayfalama nesnesidir. Tarih alanları EPİAŞ'ın istediği Türkiye piyasa saatindeki ISO-8601 değeri olmalıdır.

## Kapsam sonucu

| Durum | Menü kalemi | Açıklama |
|---|---:|---|
| Kesin endpoint + DTO eşleşmesi | 132 | Electricity-service veya reporting-service şemasında bire bir eşleşir. |
| Tarih-kuralına bağlı endpoint ailesi | 1 | `59` Kurulu Güç, resmî eski/yeni endpoint ayrımını gerektirir. |
| JSON adapter olarak eşlenemeyen | 1 | `254` Elektrik Piyasası Bültenleri; iki resmî Swagger'da veri endpoint'i yok. |

## Ortak istek ve yanıt kuralları

- `startDate`, `endDate`: sadece adaptorun izin verdiği gün aralığında; `endDate >= startDate`.
- `page`: sunucuda sınırlandırılmış (`number`, `size`); istemcinin JSON gövdesi serbestçe iletilmez.
- Organizasyon, UEVÇB, santral, bölge gibi filtreler yalnız endpoint DTO'sunda varsa gönderilir. Adı benzer görünen alanlar değiştirilemez: örneğin normal UEVM DTO'su `powerplantId`, gerçek-zamanlı üretim DTO'su `powerPlantId` kullanır.
- Her normalleştirilmiş yanıt `source`, `retrievedAt`, `requestScope`, `warnings`, `columns`, `rows` taşımalıdır; boş/null değer `0` yapılmaz.

## Elektrik piyasaları (60)

|menuId|Menü etiketi (EN)|Method + path|R|S|İstek alanları / güven|
|---:|---|---|---|---|---|
|102|Market Clearing Price (MCP)|POST `/v1/markets/dam/data/mcp`|PtfRequestDto|PtfResponseDto|startDate*, endDate*, page · kesin|
|103|Interim MCP|POST `/v1/markets/dam/data/interim-mcp`|InterimMcpRequestDto|InterimMcpResponseDto|startDate*, page · kesin|
|104|DAM Trade Value|POST `/v1/markets/dam/data/day-ahead-market-trade-volume`|DayAheadMarketTradeVolumeRequestDto|DayAheadMarketTradeVolumeResponseDto|startDate*, endDate*, page · kesin|
|105|DAM Price Independent Sales Order|POST `/v1/markets/dam/data/price-independent-offer`|PriceIndependentOfferRequestDto|PriceIndependentOfferResponseDto|startDate*, endDate*, page · kesin|
|106|DAM Price Independent Bid Order|POST `/v1/markets/dam/data/price-independent-bid`|PriceIndependentBidRequestDto|PriceIndependentBidResponseDto|startDate*, endDate*, page · kesin|
|107|DAM Supply-Demand|POST `/v1/markets/dam/data/supply-demand`|SupplyDemandRequestDto|SupplyDemandResponseDto|date*, page · kesin|
|108|DAM Submitted Bid Order Volume|POST `/v1/markets/dam/data/submitted-bid-order-volume`|SubmittedBidOrderVolumeRequestDto|SubmittedBidOrderVolumeResponseDto|startDate*, endDate*, page · kesin|
|109|DAM Submitted Sales Order Volume|POST `/v1/markets/dam/data/submitted-sales-order-volume`|SubmittedSalesOrderVolumeRequestDto|SubmittedSalesOrderVolumeResponseDto|startDate*, endDate*, page · kesin|
|110|DAM Block Bid|POST `/v1/markets/dam/data/amount-of-block-buying`|AmountOfBlockBuyingRequestDto|AmountOfBlockBuyingResponseDto|startDate*, endDate*, page · kesin|
|111|DAM Block Offer|POST `/v1/markets/dam/data/amount-of-block-selling`|AmountOfBlockSellingRequestDto|AmountOfBlockSellingResponseDto|startDate*, endDate*, page · kesin|
|112|DAM Matching Quantity|POST `/v1/markets/dam/data/clearing-quantity`|ClearingQuantityRequestDto|ClearingQuantityResponseDto|startDate*, endDate*, organizationId, page · kesin|
|113|DAM Flexible Buying Offer Quantity|POST `/v1/markets/dam/data/flexible-offer-buying-quantity`|FlexibleOfferBuySellRequestDto|FlexibleOfferBuyResponseDto|startDate*, endDate*, page · kesin|
|114|DAM Flexible Selling Offer Quantity|POST `/v1/markets/dam/data/flexible-offer-selling-quantity`|FlexibleOfferBuySellRequestDto|FlexibleOfferSellResponseDto|startDate*, endDate*, page · kesin|
|115|DAM Matched Flexible Offer Quantity|POST `/v1/markets/dam/data/matched-flexible-offer-quantity`|MatchedFlexibleOfferQuantityRequestDto|MatchedFlexibleOfferQuantityResponseDto|startDate*, endDate*, region, page · kesin|
|116|DAM Side Payment|POST `/v1/markets/dam/data/side-payments`|SidePaymentRequestDto|SidePaymentResponseDto|startDate*, endDate*, region, page · kesin|
|117|IDM Weighted Average Price|POST `/v1/markets/idm/data/weighted-average-price`|WeightedAveragePriceRequestDto|WeightedAveragePriceResponseDto|startDate*, endDate*, page · kesin|
|118|IDM Matching Quantity|POST `/v1/markets/idm/data/matching-quantity`|MatchingQuantityRequestDto|MatchingQuantityResponseDto|startDate*, endDate*, page · kesin|
|119|IDM Min-Max Bid Price|POST `/v1/markets/idm/data/min-max-bid-price`|MinMaxAskPriceRequestDto|MinMaxAskPriceResponseDto|startDate*, endDate*, page · kesin|
|120|IDM Min-Max Offer Price|POST `/v1/markets/idm/data/min-max-sales-offer-price`|MinMaxOfferPriceRequestDto|MinMaxOfferPriceResponseDto|startDate*, endDate*, page · kesin|
|121|IDM Min-Max Matching Price|POST `/v1/markets/idm/data/min-max-matching-price`|MinMaxMatchingPriceRequestDto|MinMaxMatchingPriceResponseDto|startDate*, endDate*, page · kesin|
|122|IDM Bid/Offer Quantities|POST `/v1/markets/idm/data/bid-offer-quantities`|BidOfferQuantitiesRequestDto|BidOfferQuantitiesResponseDto|startDate*, endDate*, page · kesin|
|123|IDM Trade Value|POST `/v1/markets/idm/data/trade-value`|TradeValueRequestDto|TradeValueResponseDto|startDate*, endDate*, page · kesin|
|124|IDM Transaction History|POST `/v1/markets/idm/data/transaction-history`|TransactionHistoryGipRequestDto|TransactionHistoryGipResponseDto|startDate*, endDate*, page · kesin|
|125|PFM Daily Index Price|POST `/v1/markets/pfm/data/ggf`|DailyIndexPriceRequestDto|DailyIndexPriceResponseDto|startDate*, endDate*, year, deliveryPeriod, loadType, page · kesin|
|126|PFM Matching Quantity|POST `/v1/markets/pfm/data/vep-matching-quantity`|VepMatchingQuantityRequestDto|VepMatchingQuantityResponseDto|startDate*, endDate*, year, deliveryPeriod, loadType, page · kesin|
|127|PFM Trade Value|POST `/v1/markets/pfm/data/pfm-trade-value`|TradeVolumeRequestDto|TradeVolumeResponseDto|startDate*, endDate*, year, deliveryPeriod, loadType, page · kesin|
|128|PFM Transaction History|POST `/v1/markets/pfm/data/pfm-transaction-history`|TransactionHistoryRequestDto|TransactionHistoryResponseDto|startDate*, endDate*, year, deliveryPeriod, loadType, page · kesin|
|129|PFM Contract Price Summary|POST `/v1/markets/pfm/data/contract-price-summary`|ContractPriceSummaryRequestDto|ContractPriceSummaryResponseDto|startDate*, endDate*, year, deliveryPeriod, loadType, page · kesin|
|130|PFM Open Position|POST `/v1/markets/pfm/data/open-position`|VepOpenPositionRequestDto|VepOpenPositionResponseDto|startDate*, endDate*, year, deliveryPeriod, loadType, page · kesin|
|131|PFM Order Prices|POST `/v1/markets/pfm/data/offer-price`|VepOfferPriceRequestDto|VepOfferPriceReponseDto|page · kesin|
|132|System Marginal Price|POST `/v1/markets/bpm/data/system-marginal-price`|SystemMarginalPriceRequestDto|SystemMarginalPriceResponseDto|startDate*, endDate*, region, page · kesin|
|133|System Direction|POST `/v1/markets/bpm/data/system-direction`|SystemDirectionRequestDto|SystemDirectionResponseDto|startDate*, endDate*, region, page · kesin|
|134|Up Regulation Instructions|POST `/v1/markets/bpm/data/order-summary-up`|OrderSummaryUpRequestDto|OrderSummaryUpResponseDto|startDate*, endDate*, region, page · kesin|
|135|Down Regulation Instructions|POST `/v1/markets/bpm/data/order-summary-down`|OrderSummaryDownRequestDto|OrderSummaryDownResponseDto|startDate*, endDate*, region, page · kesin|
|136|Issued YEK-G documents|POST `/v1/markets/yek-g/data/exported-document-quantity`|YekgExportedDocumentQuantityRequestDto|YekgExportedDocumentQuantityResponseDto|startDate*, endDate*, page · kesin|
|137|YEK-G expiry quantity|POST `/v1/markets/yek-g/data/expiry-quantity`|YekgRepealAmountRequestDto|YekgRepealAmountResponseDto|startDate*, endDate*, page · kesin|
|138|YEK-G withdrawal quantity|POST `/v1/markets/yek-g/data/withdrawal-quantity`|WithdrawalQuantityRequestDto|WithdrawalQuantityResponseDto|startDate*, endDate*, page · kesin|
|139|YEK-G bilateral contracts|POST `/v1/markets/yek-g/data/bilateral-contract-list`|BilateralContractAmountRequestDto|BilateralContractAmountResponseDto|startDate*, endDate*, page · kesin|
|140|YEK-G redemption quantity|POST `/v1/markets/yek-g/data/cancelation-quantity`|YekgRedemptionAmountRequestDto|YekgRedemptionAmountResponseDto|startDate*, endDate*, page · kesin|
|141|YEK-G weighted average price|POST `/v1/markets/yek-g/data/weighted-average-price`|YekgWeightedAveragePriceRequestDto|YekgWeightedAveragePriceResponseDto|startDate*, endDate*, page · kesin|
|142|YEK-G matching quantity|POST `/v1/markets/yek-g/data/yekg-matching-quantity`|YekgMatchAmountRequestDto|YekgMatchAmountResponseDto|startDate*, endDate*, page · kesin|
|143|YEK-G min/max matching price|POST `/v1/markets/yek-g/data/min-max-match-amount-list`|YekgMinMaxMatchAmountRequestDto|YekgMinMaxMatchAmountResponseDto|startDate*, endDate*, page · kesin|
|144|YEK-G organized-market trading volume|POST `/v1/markets/yek-g/data/trading-volume`|YekgTradingVolumeRequestDto|YekgTradingVolumeResponseDto|startDate*, endDate*, page · kesin|
|145|YEK-G organized-market bid/ask|POST `/v1/markets/yek-g/data/market-bid-ask-quantity`|YekgOrderQuantityRequestDto|YekgOrderQuantityResponseDto|startDate*, endDate*, page · kesin|
|146|Primary frequency capacity price|POST `/v1/markets/ancillary-services/data/primary-frequency-capacity-price`|FrequencyCapacityAmountAndPriceRequestDto|PrimaryFrequencyCapacityPriceResponseDto|startDate*, endDate*, page · kesin|
|147|Primary frequency capacity amount|POST `/v1/markets/ancillary-services/data/primary-frequency-capacity-amount`|FrequencyCapacityAmountAndPriceRequestDto|PrimaryFrequencyCapacityAmountResponseDto|startDate*, endDate*, page · kesin|
|148|Secondary frequency capacity price|POST `/v1/markets/ancillary-services/data/secondary-frequency-capacity-price`|FrequencyCapacityAmountAndPriceRequestDto|SecondaryFrequencyCapacityPriceResponseDto|startDate*, endDate*, page · kesin|
|149|Secondary frequency capacity amount|POST `/v1/markets/ancillary-services/data/secondary-frequency-capacity-amount`|FrequencyCapacityAmountAndPriceRequestDto|SecondaryFrequencyCapacityAmountResponseDto|startDate*, endDate*, page · kesin|
|150|Bilateral contracts bid quantity|POST `/v1/markets/bilateral-contracts/data/bilateral-contracts-bid-quantity`|BilateralContractBuyRequestDto|BilateralContractBuyResponseDto|startDate*, endDate*, page · kesin|
|151|Bilateral contracts offer quantity|POST `/v1/markets/bilateral-contracts/data/bilateral-contracts-offer-quantity`|BilateralContractSellRequestDto|BilateralContractSellResponseDto|startDate*, endDate*, page · kesin|
|152|EÜAŞ-authorized retailers bilateral amount|POST `/v1/markets/bilateral-contracts/data/amount-of-bilateral-contracts`|AmountOfBilateralContractsRequestDto|AmountOfBilateralContractsResponseDto|startDate*, endDate*, page · kesin|
|153|Imbalance quantity|POST `/v1/markets/imbalance/data/imbalance-quantity`|ImbalanceQuantityRequestDto|ImbalanceQuantityResponseDto|startDate*, endDate*, page · kesin|
|154|Imbalance cost|POST `/v1/markets/imbalance/data/imbalance-amount`|ImbalanceAmountRequestDto|ImbalanceAmountResponseDto|startDate*, endDate*, region, page · kesin|
|155|Balance Responsible Group imbalance|POST `/v1/markets/imbalance/data/dsg-imbalance-quantity`|DsgImbalanceQuantityRequestDto|DsgImbalanceQuantityResponseDto|startDate*, endDate*, region, organizationId, page · kesin|
|156|Meter count subject to retroactive adjustment|POST `/v1/markets/retroactive-adjustment/data/meter-count-subject-to-retroactive-adjustment`|MeterCountSubjectToRetroactiveAdjustmentRequestDto|MeterCountSubjectToRetroactiveAdjustmentResponseDto|startDate*, endDate*, subscriberProfileGroupName, distributionId, page · kesin|
|157|Retroactive adjustment sum|POST `/v1/markets/retroactive-adjustment/data/retroactive-adjustment-sum`|RetroactiveAdjustmentSumRequestDto|RetroactiveAdjustmentSumResponseDto|startDate*, endDate*, page · kesin|
|158|Meter volume subject to retroactive adjustment|POST `/v1/markets/retroactive-adjustment/data/meter-volume`|MeterVolumeRequestDto|MeterVolumeResponseDto|periodStartDate, periodEndDate, versionStartDate, versionEndDate, subscriberProfileGroup, meterReadOrgId*, page · kesin|
|36|Maximum Settlement Price|POST `/v1/markets/data/maximum-settlement-price`|MaximumSettlementPriceRequestDto|MaximumSettlementPriceResponseDto|startDate*, endDate*, page · kesin|
|159|Participant count by license type|POST `/v1/markets/general-data/data/participant-count-based-upon-license-type`|ParticipantCountBasedUponLicenseTypeRequestDto|ParticipantCountBasedUponLicenseTypeResponseDto|startDate*, page · kesin|
|160|Market participants|POST `/v1/markets/general-data/data/market-participants`|MarketParticipantsRequestDto|MarketParticipantsResponseDto|organizationId, page · kesin|

## Üretim (7) ve tüketim (17)

|menuId|Menü etiketi (EN)|Method + path|R|S|İstek alanları / güven|
|---:|---|---|---|---|---|
|258|FDPP first version|POST `/v1/generation/data/dpp-first-version`|KgupRequestDto|KgupResponseDto|startDate*, endDate*, region*, organizationId, uevcbId, page · kesin|
|161|FDPP|POST `/v1/generation/data/dpp`|KgupRequestDto|KgupResponseDto|startDate*, endDate*, region*, organizationId, uevcbId, page · kesin|
|162|SBFGP|POST `/v1/generation/data/sbfgp`|KudupRequestDto|KudupResponseDto|startDate*, endDate*, region*, organizationId, uevcbId, page · kesin|
|163|AIC|POST `/v1/generation/data/aic`|EakRequestDto|EakResponseDto|startDate*, endDate*, region*, organizationId, uevcbId, page · kesin|
|164|Real-time generation|POST `/v1/generation/data/realtime-generation`|RealtimeGenerationRequestDto|RealtimeGenerationResponseDto|startDate*, endDate*, powerPlantId, page · kesin|
|165|Injection quantity|POST `/v1/generation/data/injection-quantity`|InjectionQuantityRequestDto|InjectionQuantityResponseDto|startDate*, endDate*, powerplantId, page · kesin|
|40|Licensed power-plant investments|POST `/v1/generation/data/licensed-powerplant-investment-list`|LicensedPowerPlantInvestmentRequestDto|LicensedPowerPlantInvestmentResponseDto|startDate*, endDate*, page · kesin|
|166|Load forecast plan|POST `/v1/consumption/data/load-estimation-plan`|LoadEstimationPlanRequestDto|LoadEstimationPlanResponseDto|startDate*, endDate*, page · kesin|
|167|Demand forecast|POST `/v1/consumption/data/demand-forecast`|DemandForecastRequestDto|DemandForecastResponseDto|distrubutionOrganization, page · kesin (resmî DTO'daki yazım korunur)|
|168|Real-time consumption|POST `/v1/consumption/data/realtime-consumption`|RealTimeConsumptionRequestDto|RealTimeConsumptionResponseDto|startDate*, endDate*, page · kesin|
|169|Withdrawal quantity|POST `/v1/consumption/data/uecm`|UecmRequestDto|UecmResponseDto|startDate*, endDate*, page · kesin|
|170|Eligible-customer withdrawal quantity|POST `/v1/consumption/data/st-uecm`|StUecmRequestDto|StUecmResponseDto|period*, page · kesin|
|171|Withdrawal under supply liability|POST `/v1/consumption/data/withdrawal-quantity-under-supply-liability`|SwvRequestDto|WquslResponseDataDto|startDate*, endDate*, page · kesin|
|172|Percentage consumption information|POST `/v1/consumption/data/percentage-consumption-info`|PercentageConsumptionInfoRequestDto|PercentageConsumptionInfoResponseDto|period*, page · kesin|
|173|Multiple factor|POST `/v1/consumption/data/multiple-factor`|MultipleFactorRequestDto|MultipleFactorResponseDto|period*, distribution, profile group, meter type, page · kesin|
|174|Meter count|POST `/v1/consumption/data/meter-count`|MeterCountRequestDto|MeterCountResponseDto|page · kesin|
|175|Eligible customer count|POST `/v1/consumption/data/st-adedi`|StAdediRequestDto|StAdediResponseDto|startDate*, endDate*, page · kesin|
|176|Eligible customer quantity|POST `/v1/consumption/data/eligible-consumer-quantity`|EligibleConsumerQuantityRequestDto|EligibleConsumerQuantityResponseDto|startDate*, endDate*, page · kesin|
|177|City/district eligible customer count|POST `/v1/consumption/data/eligible-consumer-count`|EligibleConsumerCountRequestDto|EligibleConsumerCountResponseDto|period*, page · kesin|
|178|Monthly index|POST `/v1/consumption/data/monthly-index`|MonthlySupplyPriceIndexRequestDto|MonthlySupplyPriceIndexResponseDto|groupId*, page · kesin|
|179|Planned outage information|POST `/v1/consumption/data/planned-power-outage-info`|PowerOutageRequest|PowerOutageResponseDto|period*, page · kesin|
|180|Unplanned outage information|POST `/v1/consumption/data/unplanned-power-outage-info`|PowerOutageRequest|PowerOutageResponseDto|period*, page · kesin|
|181|Consumer quantity|POST `/v1/consumption/data/consumer-quantity`|ConsumerQuantityRequestDto|ConsumerQuantityResponseDto|period*, page · kesin|
|182|Consumption quantity|POST `/v1/consumption/data/consumption-quantity`|ConsumptionQuantityRequestDto|ConsumptionQuantityResponseDto|period*, page · kesin|

## YEKDEM (16), iletim (11), barajlar (8) ve PMS (1)

|menuId|Menü etiketi (EN)|Method + path|R|S|İstek alanları / güven|
|---:|---|---|---|---|---|
|49|RSM portfolio income|POST `/v1/renewables/data/portfolio-income`|PortfolioIncomeRequestDto|PortfolioIncomeResponseDto|startDate*, endDate*, page · kesin|
|50|RSM imbalance cost|POST `/v1/renewables/data/imbalance-cost`|ImbalanceCostRequestDto|ImbalanceCostResponseDto|startDate*, endDate*, page · kesin|
|51|RSM imbalance quantity|POST `/v1/renewables/data/imbalance-quantity`|ImbalanceQuantityRequestDto|ImbalanceQuantityWrapperResponseDto|startDate*, endDate*, page · kesin|
|52|WPP generation and forecast|POST `/v1/renewables/data/res-generation-and-forecast`|RenewableResGenerationAndForecastRequestDto|RenewableResGenerationAndForecastResponseDto|startDate*, endDate*, page · kesin|
|183|YEKDEM real-time generation|POST `/v1/renewables/data/licensed-realtime-generation`|LicencedRealtimeGenerationRequestDto|LicencedRealtimeGenerationResponseDto|startDate*, endDate*, powerPlantId, page · kesin|
|184|YEKDEM injection quantity|POST `/v1/renewables/data/renewable-sm-licensed-injection-quantity`|RenewableLicencedGenerationAmountRequestDto|RenewableLicencedGenerationAmountResponseDto|startDate*, endDate*, region, page · kesin|
|54|License-exempt feed-in amount|POST `/v1/renewables/data/unlicensed-generation-amount`|RenewableUnlicencedGenerationAmountRequestDto|RenewableUnlicencedGenerationAmountResponseDto|startDate*, endDate*, region, page · kesin|
|55|License-exempt feed-in cost|POST `/v1/renewables/data/unlicensed-generation-cost`|YekdemLuyRequestDto|YekdemLuyResponseDto|startDate*, endDate*, region, page · kesin|
|56|Generation forecast|POST `/v1/renewables/data/generation-forecast`|RenewableSmForecastRequestDto|RenewableSmForecastResponseDto|startDate*, endDate*, page · kesin|
|57|Spot order|POST `/v1/renewables/data/spot-order`|RenewableSmSpotOrderRequestDto|RenewableSmSpotOrderResponseDto|startDate*, endDate*, page · kesin|
|58|Unit cost|POST `/v1/renewables/data/unit-cost`|RenewableSmUnitCostRequestDto|RenewableSmUnitCostResponseDto|startDate*, endDate*, page · kesin|
|59|Installed capacity|POST `/v1/renewables/data/new-installed-capacity` or `/old-installed-capacity`|InstalledCapacityRequest|InstalledCapacityResponseInstalledCapacityNewDto / OldDto|period*; adaptör tarih-kesit kuralını resmî sayfa ayarından doğrulamalı · kesin endpoint ailesi|
|60|Licensed generation feed-in cost|POST `/v1/renewables/data/licensed-generation-cost`|YekdemYekbedRequestDto|YekdemYekbedResponseDto|startDate*, endDate*, region, page · kesin|
|61|RSM income|POST `/v1/renewables/data/renewables-support-mechanism-income`|YekdemYekGeliriRequestDto|YekdemYekGeliriResponseDto|startDate*, endDate*, region, page · kesin|
|62|Total cost|POST `/v1/renewables/data/total-cost`|YekdemYektobRequestDto|YekdemYektobResponseDto|startDate*, endDate*, page · kesin|
|63|RSM participant list|POST `/v1/renewables/data/renewables-participant`|RenewablesParticipantRequestDto|RenewablesParticipantResponseDto|year*, page · kesin|
|185|Monthly zero balance adjustment|POST `/v1/transmission/data/zero-balance`|ZeroBalanceMonthlyRequestDto|ZeroBalanceMonthlyResponseDto|startDate*, endDate*, page · kesin|
|186|Transmission loss factor|POST `/v1/transmission/data/iskk-list`|IskkListRequestDto|IskkResponseDto|startDate*, endDate*, page · kesin|
|187|Congestion cost|POST `/v1/transmission/data/congestion-cost`|CongestionCostRequestDto|CongestionCostResponseDto|startDate*, endDate*, page · kesin|
|188|ENTSO-E (X) codes|POST `/v1/transmission/data/organization-list`|EntsOrganizationRequestDto|EntsOrganizationResponseDto|startDate*, endDate*, page · kesin|
|89|ENTSO-E (W) codes|POST `/v1/transmission/data/entso-w-organization`|EntsOrganizationRequestDto|EntsowResponseDto|startDate*, endDate*, page · kesin|
|67|Interconnection failure/maintenance|POST `/v1/transmission/data/international-line-events`|InternationalLineEventRequestDto|InternationalLineEventResponseDto|startDate*, endDate*, page · kesin|
|189|Yearly interconnection forecast|POST `/v1/transmission/data/tcat-pre-year-forecast`|TcatPreYearForecastRequestDto|TcatPreYearForecastResponseDto|startDate*, endDate*, page · kesin|
|190|Monthly interconnection forecast|POST `/v1/transmission/data/tcat-pre-month-forecast`|TcatPreMonthForecastRequestDto|TcatPreMonthForecastResponseDto|startDate*, endDate*, page · kesin|
|69|Interconnection line capacities|POST `/v1/transmission/data/line-capacities`|InterconnectionLineCapacitiesRequestDto|InterconnectionLineCapacitiesResponseDto|startDate*, endDate*, page · kesin|
|70|Interconnection capacity requests|POST `/v1/transmission/data/capacity-demand`|CapacityDemandRequestDto|CapacityDemandResponseDto|startDate*, endDate*, page · kesin|
|71|Nominal capacity|POST `/v1/transmission/data/nominal-capacity`|NominalCapacityRequestDto|NominalCapacityResponseDto|startDate*, endDate*, page · kesin|
|72|Daily Kot|POST `/v1/dams/data/daily-kot`|DailyKotRequestDto|DailyKotResponseDto|basinName, damName, page · kesin|
|73|Active fullness|POST `/v1/dams/data/active-fullness`|ActiveFullnessRequestDto|ActiveFullnessResponseDto|basinName, damName, page · kesin|
|74|Active volume|POST `/v1/dams/data/active-volume`|ActiveVolumeRequestDto|ActiveVolumeWrappedResponse|basinName, damName, page · kesin|
|75|Daily volume|POST `/v1/dams/data/daily-volume`|DailyVolumeRequestDto|DailyVolumeResponseDto|basinName, damName, page · kesin|
|76|Water energy provision|POST `/v1/dams/data/water-energy-provision`|WaterEnergyProvisionRequestDto|WaterEnergyProvisionResponseDto|basinName, damName, page · kesin|
|191|Dam Kot|POST `/v1/dams/data/dam-kot`|DamDataRequestDto|KotResponseDto|basinName, damName, page · kesin|
|192|Dam volume|POST `/v1/dams/data/dam-volume`|DamDataRequestDto|VolumeResponseDto|basinName, damName, page · kesin|
|193|Dam flow rate/install capacity|POST `/v1/dams/data/flow-rate-and-installed-power`|DamDataRequestDto|FlowRateAndInstalledPowerResponse|basinName, damName, page · kesin|
|248|Market Message System|POST `/v1/markets/data/market-message-system`|MarketMessageSystemRequestDto|MarketMessageSystemResponseDto|startDate*, endDate*, regionId*, mesajTipId, organizationId, uevcbId, powerPlantId, page · kesin|

## Raporlar (13; reporting-service) ve bülten (1)

|menuId|Menü etiketi (EN)|Method + path|R|S|Güven|
|---:|---|---|---|---|---|
|90|MCP/SMP/imbalance listing|POST `/v1/data/ptf-smf-sdf`|PtfSmfSdfRequestDto|PtfSmfSdfResponseDto|kesin, reporting-service|
|91|Daily report|POST `/v1/data/daily-report`|DailyReportRequestDto|DailyReportResponseDto|kesin, reporting-service|
|92|Periodic price averages|POST `/v1/data/periodic-price-averages`|PtfSmfDonemlikAgirlikliOrtalamaRequestDto|PtfSmfDonemlikAgirlikliOrtalamaResponseDto|kesin, reporting-service|
|93|Periodic market volumes|POST `/v1/data/periodic-price-volume`|PeriodicPriceVolumeRequestDto|PeriodicPriceVolumeResponseDto|kesin, reporting-service|
|94|Eligible consumer/meter increases|GET `/v1/data/eligible-consumer-and-meter-increases`|—|SerbestTuketiciSayacArtisResponseDto|kesin, reporting-service|
|95|MCP/SMP price averages|POST `/v1/data/mcp-smp-averages`|PtfSmfOrtalamalariRequest|PtfSmfGunlukAgirlikliOrtalamaResponseDto|kesin, reporting-service|
|96|MCP/SMP three-time averages|POST `/v1/data/smp-mcp-multiple-daytime-avg`|PtfSmfUcZamanliAgirlikliOrtalamaRequestDto|PtfSmfUcZamanliAgirlikliOrtalamaResponseDto|kesin, reporting-service|
|97|Daily prices|POST `/v1/data/daily-prices`|GunlukFiyatRequestDto|GunlukFiyatResponseDto|kesin, reporting-service|
|257|BPM weighted instructions|POST `/v1/data/dgp-talimat-agr-ort`|DgpTalimatAgrOrtRequestDto|DgpTalimatAgrOrtResponseDto|kesin, reporting-service|
|98|Physical electricity market volumes|POST `/v1/data/electricity-market-volume-physically`|ElektrikPiyasaHacimFizikselRequestDto|ElektrikPiyasaHacimFizikselResponseDto|kesin, reporting-service|
|99|BPM instructions|POST `/v1/data/dgp-talimat`|DgpTalimatRequestDto|DgpTalimatResponseDto|kesin, reporting-service|
|101|IDM contract summary|POST `/v1/data/idm-contract-summary`|GipKontratOzetRequestDto|GipKontratOzetResponseDto|kesin, reporting-service|
|253|IDM order list|POST `/v1/data/idm-order-list`|GipKontratTekliflerRequestDto|GipKontratTekliflerResponseDto|kesin, reporting-service|
|254|Electricity market bulletins|Resmî insan-arayüzü sayfası: `https://www.epias.com.tr/spot-elektrik-piyasasi/elektrik-piyasasi-bultenler/`|HTML form + PDF link|PDF|**JSON adapter değil.** Sayfa günlük/haftalık/aylık/yıllık sekmeleri ve tarih için WordPress POST formu yayımlar; 3 Eylül 2026 incelemesinde günlük PDF bağlantısı `https://www.epias.com.tr/wp-content/uploads/2026/09/epias-bulten-02.09.2026.pdf` idi. Bu URL günlük olarak değişir; iki Swagger'da da bülten endpoint'i bulunmaz. İnsan-kullanıcıya dış bağlantı verilebilir, ancak kırılgan HTML/PDF kazıyıcısı canlı veri adaptörü diye sunulmamalı.|

## Adaptör öncelik sırası

1. `102`, `132`, `117`, `168`, `166`, `164`, `161`, `162`, `163`, `165`, `248`, `155`: piyasa katılımcısı kararını doğrudan etkileyen fiyat, plan, gerçekleşme ve mesaj verileri.
2. `104`, `112`, `153`–`160`, `183`–`184`: portföy/kapsam/katılımcı analizini tamamlayan veriler.
3. Kalan electricity-service tabloları: aynı güvenli registry şablonuyla aile aile eklenir.
4. Rapor servisi ve `254`: farklı servis kökü/ayrı sözleşme nedeniyle electricity-service adaptöründen ayrı test edilir.

## Açık noktalar

- Her DTO'nun `items[]` alanlarını UI'da otomatik yayımlamak yerine, alan/ad/birim eşlemesini seçilmiş her ekran için gözden geçirmek gerekir. Swagger DTO ismi endpoint eşleşmesini kanıtlar; anlamlı sütun etiketi/birim kanıtı değildir.
- Menüdeki `59 Installed Capacity` iki resmî endpointin tarih eşiğine bağlı birleşimidir. Eşik doğrulanmadan adaptör bunu tek kesintisiz seri olarak sunmamalıdır.
- Bülten ekranı (`254`) için endpoint keşfi, belgelenmiş URL ve yetki modeli olmadan yapılmamalıdır. Mevcut kanıt yalnız resmî WordPress sayfası ve değişken günlük PDF linkidir; JSON/webMCP aracı değildir.
