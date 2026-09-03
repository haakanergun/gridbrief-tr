export type ExplorerMode = "live" | "synthetic";

export function normalizeExplorerSearch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replaceAll("ı", "i")
    .replace(/\s+/g, " ")
    .trim();
}

export type ExplorerRequest =
  | { view: "catalog"; date: string }
  | { view: "organization"; date: string; organizationId: number }
  | { view: "plant"; date: string; powerPlantId: number }
  | {
      view: "planning";
      date: string;
      organizationId?: number;
      uevcbId?: number;
      region?: "TR1";
    };

export interface ExplorerSource {
  provider: string;
  fetchedAt: string;
  timezone: "Europe/Istanbul";
  note: string;
}

export interface ExplorerOrganization {
  id: number;
  name: string;
  shortName: string | null;
  eic: string | null;
  status: string | null;
}

export interface ExplorerPlant {
  id: number;
  name: string;
  shortName: string | null;
  eic: string | null;
}

export interface ExplorerUevcb {
  id: number;
  organizationId: number | null;
  name: string;
  eic: string | null;
}

export interface ExplorerParticipation {
  id: number | null;
  organizationName: string | null;
  participantCode: string | null;
  eic: string | null;
  legalStatus: string | null;
  dayAhead: boolean | null;
  intraday: boolean | null;
  futures: boolean | null;
  yekG: boolean | null;
  naturalGas: boolean | null;
}

export interface ExplorerRegion {
  id: string;
  name: string;
}

export interface ExplorerPoint {
  timestamp: string;
  hour: string;
  matchedBids: number | null;
  matchedOffers: number | null;
  kgup: number | null;
  kudup: number | null;
  eak: number | null;
  realtimeGeneration: number | null;
  injectionQuantity: number | null;
  loadPlan: number | null;
  realtimeConsumption: number | null;
}

interface ExplorerResponseBase {
  mode: ExplorerMode;
  view: ExplorerRequest["view"];
  source: ExplorerSource;
  warnings: string[];
}

export interface CatalogExplorerResponse extends ExplorerResponseBase {
  view: "catalog";
  scope: { view: "catalog"; date: string };
  organizations: ExplorerOrganization[];
  plants: ExplorerPlant[];
  regions: ExplorerRegion[];
}

export interface OrganizationExplorerResponse extends ExplorerResponseBase {
  view: "organization";
  scope: { view: "organization"; date: string; organizationId: number };
  organization: ExplorerOrganization;
  uevcbs: ExplorerUevcb[];
  participation: ExplorerParticipation | null;
  points: ExplorerPoint[];
}

export interface PlantExplorerResponse extends ExplorerResponseBase {
  view: "plant";
  scope: { view: "plant"; date: string; powerPlantId: number };
  plant: ExplorerPlant;
  points: ExplorerPoint[];
}

export interface PlanningExplorerResponse extends ExplorerResponseBase {
  view: "planning";
  scope: {
    view: "planning";
    date: string;
    organizationId?: number;
    uevcbId?: number;
    region: "TR1";
  };
  organization: ExplorerOrganization | null;
  uevcb: ExplorerUevcb | null;
  points: ExplorerPoint[];
}

export type ExplorerResponse =
  | CatalogExplorerResponse
  | OrganizationExplorerResponse
  | PlantExplorerResponse
  | PlanningExplorerResponse;

const DEMO_ORGANIZATIONS: ExplorerOrganization[] = [
  { id: 101, name: "Marmara Enerji Demo A.Ş.", shortName: "MARMARA DEMO", eic: "SYN-ORG-101", status: "AKTİF" },
  { id: 202, name: "Anadolu Üretim Demo A.Ş.", shortName: "ANADOLU DEMO", eic: "SYN-ORG-202", status: "AKTİF" },
  { id: 303, name: "Ege Yenilenebilir Demo A.Ş.", shortName: "EGE DEMO", eic: "SYN-ORG-303", status: "AKTİF" },
];

const DEMO_PLANTS: ExplorerPlant[] = [
  { id: 1_001, name: "Kuzey Rüzgâr Demo Santrali", shortName: "KUZEY RES", eic: "SYN-PP-1001" },
  { id: 1_002, name: "Güney Güneş Demo Santrali", shortName: "GÜNEY GES", eic: "SYN-PP-1002" },
  { id: 1_003, name: "Doğu Baraj Demo Santrali", shortName: "DOĞU HES", eic: "SYN-PP-1003" },
];

function dateHash(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function hourTimestamp(date: string, hour: number): string {
  return `${date}T${hour.toString().padStart(2, "0")}:00:00+03:00`;
}

function emptyPoint(date: string, hour: number): ExplorerPoint {
  return {
    timestamp: hourTimestamp(date, hour),
    hour: `${hour.toString().padStart(2, "0")}:00`,
    matchedBids: null,
    matchedOffers: null,
    kgup: null,
    kudup: null,
    eak: null,
    realtimeGeneration: null,
    injectionQuantity: null,
    loadPlan: null,
    realtimeConsumption: null,
  };
}

function syntheticPoints(date: string, scale = 1): ExplorerPoint[] {
  const seed = dateHash(date) % 17;
  return Array.from({ length: 24 }, (_, hour) => {
    const point = emptyPoint(date, hour);
    const morning = Math.exp(-((hour - 9) ** 2) / 13);
    const evening = Math.exp(-((hour - 19) ** 2) / 10);
    const wave = Math.sin((hour + seed) * 0.62);
    const plan = scale * (510 + 135 * morning + 210 * evening + 28 * wave);
    const actual = plan * (0.96 + 0.055 * Math.sin(hour * 0.91 + seed));

    return {
      ...point,
      matchedBids: round(scale * (220 + 85 * morning + 16 * wave)),
      matchedOffers: round(scale * (205 + 92 * evening - 12 * wave)),
      kgup: round(plan),
      kudup: round(plan * (0.985 + 0.018 * Math.cos(hour * 0.77))),
      eak: round(plan * (1.13 + 0.025 * Math.sin(hour * 0.41))),
      realtimeGeneration: round(actual),
      injectionQuantity: round(actual * 0.992),
      loadPlan: round(31_500 + 5_800 * morning + 8_600 * evening + 430 * wave),
      realtimeConsumption: round(31_200 + 5_950 * morning + 8_800 * evening + 510 * wave),
    };
  });
}

function source(note: string): ExplorerSource {
  return {
    provider: "Synthetic GridBrief demo generator (EPİAŞ verisi değildir)",
    fetchedAt: new Date().toISOString(),
    timezone: "Europe/Istanbul",
    note: `AÇIKÇA SENTETİK DEMO: ${note} Bu değerler piyasa kararı için kullanılamaz.`,
  };
}

export function createSyntheticExplorerResponse(request: ExplorerRequest): ExplorerResponse {
  const common = {
    mode: "synthetic" as const,
    warnings: ["Sunucu tarafında canlı EPİAŞ erişimi etkin olmadığı için sentetik demo verisi gösteriliyor."],
  };

  if (request.view === "catalog") {
    return {
      ...common,
      view: "catalog",
      source: source("Organizasyon ve santral adları dahil tüm kayıtlar kurgusaldır."),
      scope: { view: "catalog", date: request.date },
      organizations: DEMO_ORGANIZATIONS,
      plants: DEMO_PLANTS,
      regions: [{ id: "TR1", name: "Türkiye" }],
    };
  }

  if (request.view === "organization") {
    const organization = DEMO_ORGANIZATIONS.find((item) => item.id === request.organizationId)
      ?? { ...DEMO_ORGANIZATIONS[0], id: request.organizationId };
    return {
      ...common,
      view: "organization",
      source: source("Organizasyon kapsamı ve bütün saatlik değerler kurgusaldır."),
      scope: { view: "organization", date: request.date, organizationId: request.organizationId },
      organization,
      uevcbs: [
        { id: organization.id * 10 + 1, organizationId: organization.id, name: `${organization.shortName ?? organization.name} UEVÇB 1`, eic: `SYN-UEVCB-${organization.id}-1` },
        { id: organization.id * 10 + 2, organizationId: organization.id, name: `${organization.shortName ?? organization.name} UEVÇB 2`, eic: `SYN-UEVCB-${organization.id}-2` },
      ],
      participation: {
        id: organization.id,
        organizationName: organization.name,
        participantCode: `SYN${organization.id}`,
        eic: organization.eic,
        legalStatus: "SENTETİK",
        dayAhead: true,
        intraday: true,
        futures: false,
        yekG: true,
        naturalGas: false,
      },
      points: syntheticPoints(request.date, 1),
    };
  }

  if (request.view === "plant") {
    const plant = DEMO_PLANTS.find((item) => item.id === request.powerPlantId)
      ?? { ...DEMO_PLANTS[0], id: request.powerPlantId };
    return {
      ...common,
      view: "plant",
      source: source("Santral kapsamı ve bütün saatlik değerler kurgusaldır."),
      scope: { view: "plant", date: request.date, powerPlantId: request.powerPlantId },
      plant,
      points: syntheticPoints(request.date, 0.31).map((point) => ({
        ...emptyPoint(request.date, Number(point.hour.slice(0, 2))),
        realtimeGeneration: point.realtimeGeneration,
        injectionQuantity: point.injectionQuantity,
      })),
    };
  }

  const organization = request.organizationId === undefined
    ? null
    : DEMO_ORGANIZATIONS.find((item) => item.id === request.organizationId)
      ?? { ...DEMO_ORGANIZATIONS[0], id: request.organizationId };
  const uevcb = request.uevcbId === undefined
    ? null
    : {
        id: request.uevcbId,
        organizationId: request.organizationId ?? null,
        name: `Sentetik UEVÇB ${request.uevcbId}`,
        eic: `SYN-UEVCB-${request.uevcbId}`,
      };

  return {
    ...common,
    view: "planning",
    source: source("Üretim planı filtresi kurgusaldır; tüketim serileri sistem kapsamındadır."),
    scope: {
      view: "planning",
      date: request.date,
      ...(request.organizationId === undefined ? {} : { organizationId: request.organizationId }),
      ...(request.uevcbId === undefined ? {} : { uevcbId: request.uevcbId }),
      region: request.region ?? "TR1",
    },
    organization,
    uevcb,
    points: syntheticPoints(request.date, request.uevcbId ? 0.18 : request.organizationId ? 0.65 : 1),
  };
}
