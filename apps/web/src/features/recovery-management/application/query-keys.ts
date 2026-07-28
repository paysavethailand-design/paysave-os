export const recoveryKeys = {
  all: ["recovery"] as const,
  cases: () => ["recovery", "cases"] as const,
  case: (caseId: string) => ["recovery", "case", caseId] as const,
  agents: () => ["recovery", "agents"] as const,
};
