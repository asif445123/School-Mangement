import { loginBadge } from "@/lib/student-actions";

// The "Student login" cell of the Students tables (school + teacher views).
// When the login is a guardian login shared by brothers / sisters it says so,
// because enabling / disabling it (or changing its email or password) applies
// to every child on it, not only to this row.
export default function StudentLoginCell({ r }: { r: any }) {
  if (!r.loginEmail) return <>-</>;
  const shared = (r.loginChildCount || 0) > 1;
  const others = (r.loginSiblings || []).join(", ");
  return (
    <span>
      {r.loginEmail}{" "}
      <span className={`ml-1 rounded px-2 py-0.5 text-xs capitalize ${loginBadge[r.loginStatus]}`}>{r.loginStatus}</span>
      {shared && (
        <span
          className="ml-1 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
          title={`One guardian login for ${r.loginChildCount} children${others ? ` - also for ${others}` : ""}. The guardian sees every child's diary, fees and marks in this one portal.`}
        >
          Guardian · {r.loginChildCount} children
        </span>
      )}
    </span>
  );
}
