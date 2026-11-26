const PAYROLL_HIDDEN_ORG_IDS = new Set([
  // TODO: replace with real org IDs
  "b1ec9f30-dcab-4a96-a30c-0f694c5eaa65",
  "ORG_ID_PLACEHOLDER_2",
]);

const PAYROLL_RESTRICTED_ROLES = new Set(["hr", "manager"]);

export function isPayrollHiddenForUser(user) {
  const role = String(user?.role || "").trim().toLowerCase();
  const orgId = String(user?.org_id ?? "").trim();

  if (!role || !orgId) return false;
  if (!PAYROLL_RESTRICTED_ROLES.has(role)) return false;
  return PAYROLL_HIDDEN_ORG_IDS.has(orgId);
}

