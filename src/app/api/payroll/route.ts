import { NextRequest, NextResponse } from "next/server";
import { fail, getSessionUser } from "@/lib/auth";
import { isValidDate, isValidMonth } from "@/lib/attendance";
import { monthlyRows, timingKey } from "@/lib/staff-attendance";
import { roundMoney, salaryTotals, validAmount } from "@/lib/payroll";
import Payroll from "@/models/payroll";
import User from "@/models/user";
import StaffAttendance from "@/models/staff-attendance";
import StaffTiming from "@/models/staff-timing";
import PaymentAccount from "@/models/payment-account";

const activeStaff = (school: any) => ({ school, role: "teacher", activeStatus: { $ne: "Inactive" } });
const bankFilter = (school: any) => ({ school, type: "bank", active: true });
const findLedger = async (school: any, staff: any, name: string) =>
  await Payroll.findOne({ school, staff }) || new Payroll({ school, staff, name });

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (me?.role !== "school") return fail("Access denied", 403);
  const month = req.nextUrl.searchParams.get("month");
  if (!isValidMonth(month)) return fail("Enter a valid month");
  const [ledgers, staff, banks] = await Promise.all([
    Payroll.find({ school: me._id }).lean(), User.find(activeStaff(me._id)).select("name").sort({ name: 1 }).lean(),
    PaymentAccount.find(bankFilter(me._id)).select("bankName title").sort({ title: 1 }).lean(),
  ]);
  const rows = [], advances = [];
  for (const l of ledgers as any[]) {
    for (const a of l.advances) advances.push({ ...a, name: l.name, balance: roundMoney(a.amount - a.recovered) });
    const r = l.salaries.find((r: any) => r.month === month);
    if (!r) continue;
    const { net, advance } = salaryTotals(r, l.advances);
    rows.push({ ...r, staff: l.staff, version: l.__v, net, advance });
  }
  return NextResponse.json({ month, staff, banks, rows: rows.sort((a,b) => a.name.localeCompare(b.name)),
    advances: advances.sort((a,b) => b.date.localeCompare(a.date)) });
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (me?.role !== "school") return fail("Access denied", 403);
  const school = me._id;
  const body = await req.json().catch(() => null);
  if (!body) return fail("Invalid request");
  const { action, month } = body;
  try {
    if (action === "advance") {
      const { staff, date, amount, installment, mode, bank, note } = body;
      if (!/^[a-f\d]{24}$/i.test(staff) || !isValidDate(date) || !validAmount(amount) || !amount ||
          !validAmount(installment) || !installment || installment > amount || !["Cash", "Bank"].includes(mode))
        return fail("Choose staff, date and mode, and enter a positive amount and installment (up to the advance amount).");
      const person = await User.findOne({ ...activeStaff(school), _id: staff });
      if (!person) return fail("Staff not found", 404);
      let bankName = "";
      if (mode === "Bank") {
        const account = /^[a-f\d]{24}$/i.test(bank) && await PaymentAccount.findOne({ ...bankFilter(school), _id: bank });
        if (!account) return fail("Select an active school bank account");
        bankName = `${account.bankName} — ${account.title}`;
      }
      const ledger = await findLedger(school, staff, person.name);
      ledger.name = person.name;
      ledger.advances.push({ date, amount, installment, mode, bank: bankName, note: String(note || "").slice(0, 300), recovered: 0 });
      await ledger.save();
    } else if (!isValidMonth(month)) return fail("Enter a valid month");
    else if (action === "process") {
      const [people, records, timings] = await Promise.all([
        User.find(activeStaff(school)).select("name designation type monthlySalary fixedAllowance").lean(),
        StaffAttendance.find({ school, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).lean(),
        StaffTiming.find({ school }).lean(),
      ]);
      const summary = monthlyRows(people, records, new Map(timings.map((t: any) => [timingKey(t.designation), t])));
      for (const p of summary) {
        const ledger = await findLedger(school, p._id, p.name);
        const row = ledger.salaries.find((r: any) => r.month === month);
        if (row?.paidOn) continue;
        ledger.name = p.name;
        const fields = { month, name: p.name, designation: p.designation || p.type || "Teacher", basic: p.monthlySalary || 0,
          allowances: p.fixedAllowance || 0, attendance: p.deduction, absent: p.absent, leave: p.leave, late: p.lateDays, early: p.earlyDays };
        if (row) Object.assign(row, fields);
        else ledger.salaries.push({ ...fields, bonus: 0, overtime: 0, other: 0 });
        await ledger.save();
      }
    } else if (action === "adjust" || action === "pay") {
      if (!/^[a-f\d]{24}$/i.test(body.staff)) return fail("Invalid staff");
      const ledger = await Payroll.findOne({ school, staff: body.staff });
      const row = ledger?.salaries.find((r: any) => r.month === month);
      if (!row) return fail("Process salaries first", 404);
      if (row.paidOn || ledger.__v !== body.version) return fail("Payroll changed. Reload and review this row.", 409);
      if (action === "adjust") {
        if (![body.bonus, body.overtime, body.other].every(validAmount)) return fail("Enter non-negative amounts with up to two decimal places");
        Object.assign(row, { bonus: body.bonus, overtime: body.overtime, other: body.other });
      } else {
        const { advance, net, payments } = salaryTotals(row, ledger.advances);
        if (net < 0) return fail("Deductions exceed earnings");
        for (const a of ledger.advances) a.recovered = roundMoney(a.recovered + (payments.get(String(a._id)) || 0));
        row.recovered = advance;
        row.paidOn = new Date();
      }
      await ledger.save();
    } else return fail("Unknown payroll action");
  } catch (e) {
    if (e.name === "VersionError" || e.code === 11000) return fail("Payroll changed. Reload and try again.", 409);
    throw e;
  }
  return NextResponse.json({ ok: true });
}
