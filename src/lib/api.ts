export async function api(url: string, options: any = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: res.status, data });
  return data;
}
export const money = (n: number) => "Rs " + Number(n || 0).toLocaleString();
export const currentMonth = () => new Date().toISOString().slice(0, 7);
export const today = () => new Date().toISOString().slice(0, 10);
export const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const gradeOf = (pct: number) => (pct >= 80 ? "A+" : pct >= 70 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F");
