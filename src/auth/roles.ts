/**
 * Phase 2B canonical application roles.
 *
 * Exactly two mutually exclusive roles. No hierarchy.
 */

export const APP_ROLES = ["customer", "admin"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const DEFAULT_APP_ROLE = "customer" satisfies AppRole;

/**
 * Better Auth `user.additionalFields.role` definition.
 *
 * `input: false` is mandatory so ordinary user/API/provider input cannot
 * choose `admin`. `defaultValue` is application-layer behavior only.
 */
export const APP_ROLE_ADDITIONAL_FIELD = {
  type: ["customer", "admin"],
  required: false,
  defaultValue: DEFAULT_APP_ROLE,
  input: false,
  returned: true,
} as const;

/**
 * Runtime narrowing for stored/session role values.
 * TypeScript types are not the security boundary.
 */
export function isAppRole(value: unknown): value is AppRole {
  return value === "customer" || value === "admin";
}
