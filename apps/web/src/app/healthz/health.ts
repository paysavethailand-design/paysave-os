export interface HealthzPayload {
  readonly status: "ok";
  readonly service: "paysave-web";
  readonly timestamp: string;
}

export function buildHealthzPayload(timestamp = new Date().toISOString()): HealthzPayload {
  return {
    status: "ok",
    service: "paysave-web",
    timestamp,
  };
}
