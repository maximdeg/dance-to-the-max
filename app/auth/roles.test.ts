import { describe, expect, it } from "vitest";
import { isStaff, isSuperAdmin, type Role } from "./roles";

describe("role gate", () => {
  const cases: ReadonlyArray<[Role, boolean, boolean]> = [
    // role, isSuperAdmin, isStaff
    ["subscriber", false, false],
    ["admin", false, true],
    ["super_admin", true, true],
  ];

  it.each(cases)(
    "%s → superAdmin=%s staff=%s",
    (role, superAdmin, staff) => {
      expect(isSuperAdmin(role)).toBe(superAdmin);
      expect(isStaff(role)).toBe(staff);
    },
  );
});
