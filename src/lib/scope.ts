import { fail, getSessionUser, schoolIdOf } from "./auth";
import { access, resources } from "@/models";

// Resolves the logged-in user, checks role permission and returns the school every query must be limited to.
// Teachers are additionally limited to the classes (and sections) they are assigned to -
// that filter is applied in /api/[resource] with studentRights() from ./student-scope.
export async function scope(resource: string, write: boolean): Promise<any> {
  const cfg = resources[resource];
  if (!cfg) return { error: fail("Not found", 404) };
  const user = await getSessionUser();
  if (!user) return { error: fail("Not logged in", 401) };
  const schoolId = schoolIdOf(user);
  if (!schoolId || !access[resource][write ? "write" : "read"].includes(user.role)) return { error: fail("You do not have access", 403) };
  return { cfg, user, schoolId };
}
