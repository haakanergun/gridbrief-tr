export type DatasetScalar = string | number | boolean | null;

export type DatasetCell = DatasetScalar | DatasetScalar[] | Record<string, unknown>;

export type DatasetColumnType = "datetime" | "number" | "boolean" | "text" | "object";

export interface DatasetPageInput {
  number?: number;
  size?: number;
}

export interface DatasetQueryInput {
  datasetId: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  period?: string;
  filters?: Record<string, unknown>;
  page?: DatasetPageInput;
}

export type DatasetFilterType = "integer" | "number" | "string" | "integer[]" | "string[]";

export interface DatasetFilterCapability {
  key: string;
  type: DatasetFilterType;
  required: boolean;
}

export interface DatasetDateCapability {
  key: "startDate" | "endDate" | "date" | "period";
  required: boolean;
}

export interface DatasetDescriptor {
  id: string;
  title: string;
  category: string;
  service: "electricity-service" | "reporting-service";
  method: "GET" | "POST";
  supportsPagination: boolean;
  dateFields: DatasetDateCapability[];
  availableFilters: DatasetFilterCapability[];
}

export interface DatasetColumn {
  key: string;
  label: string;
  type: DatasetColumnType;
  nullable: boolean;
}

export interface DatasetQueryScope {
  startDate?: string;
  endDate?: string;
  date?: string;
  period?: string;
  filters: Record<string, string | number | string[] | number[]>;
  page: { number: number; size: number };
}

export interface DatasetQuality {
  status: "complete" | "partial" | "empty";
  rowCount: number;
  columnCount: number;
  nullableCells: number;
  observedAt: string;
}

export interface DatasetSource {
  provider: "EPİAŞ Şeffaflık Platformu 2.0";
  service: "electricity-service" | "reporting-service";
  endpoint: string;
  upstreamVersion: "v1.15.15" | "v1.3.26";
  retrievedAt: string;
}

export interface DatasetPagination {
  number: number;
  size: number;
  returnedRows: number;
  hasMore: boolean | null;
}

export interface DatasetQueryResponse {
  dataset: DatasetDescriptor;
  scope: DatasetQueryScope;
  columns: DatasetColumn[];
  rows: Array<Record<string, DatasetCell>>;
  quality: DatasetQuality;
  source: DatasetSource;
  warnings: string[];
  pagination: DatasetPagination | null;
}

export interface DatasetQueryErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface CatalogDatasetCapability {
  menuId: number;
  datasetId: string;
  label: string;
  trail: string[];
}

export interface UnsupportedCatalogDataset {
  menuId: number;
  label: string;
  trail: string[];
  status: "date-rule-unverified" | "external-document" | "unmapped";
  reason: string;
  externalUrl?: string;
}
