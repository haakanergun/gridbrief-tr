export type CatalogNodeKind = "section" | "group" | "dataset";

export interface CatalogNode {
  id: number;
  label: string;
  labelEn?: string;
  kind: CatalogNodeKind;
  children: CatalogNode[];
}

export interface ElectricityCatalogRoot {
  id: number;
  label: string;
  children: CatalogNode[];
}

export interface ElectricityCatalogStats {
  sections: number;
  groups: number;
  datasets: number;
}

export interface ElectricityCatalogResponse {
  root: ElectricityCatalogRoot;
  stats: ElectricityCatalogStats;
  fetchedAt: string;
  source: string;
  mode?: "live" | "degraded-live" | "stale-live" | "auth-fallback" | "verified-snapshot";
  warnings?: string[];
}

export interface ElectricityCatalogErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
