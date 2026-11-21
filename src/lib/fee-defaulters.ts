import { formatMonth, rupees } from "./chalan";

export type FeeDefaulter = {
  student: any;
  studentId: string;
  balance: number;
  latestMonth: string;
  pendingVoucherCount: number;
  whatsapp?: any;
  revision?: number;
};

// One reminder row per student. Summing each voucher's remaining amount avoids
// counting the generic fees API's derived `previous` balance more than once.
export function buildFeeDefaulters(fees: any[]): FeeDefaulter[] {
  const grouped = new Map<string, FeeDefaulter>();

  for (const fee of fees || []) {
    const student = fee?.student;
    const studentId = String(student?._id || (typeof student === "string" ? student : ""));
    const balance = Math.max(0, (Number(fee?.amount) || 0) - (Number(fee?.paid) || 0));
    if (!studentId || !student || typeof student === "string" || balance <= 0) continue;

    const month = String(fee.month || "");
    const current = grouped.get(studentId);
    if (current) {
      current.balance += balance;
      current.pendingVoucherCount += 1;
      if (month >= current.latestMonth) {
        current.latestMonth = month;
        current.whatsapp = fee.whatsapp;
        current.revision = fee.revision;
      }
    } else {
      grouped.set(studentId, {
        student,
        studentId,
        balance,
        latestMonth: month,
        pendingVoucherCount: 1,
        whatsapp: fee.whatsapp,
        revision: fee.revision,
      });
    }
  }

  return [...grouped.values()]
    .map((row) => ({ ...row, balance: Math.round(row.balance * 100) / 100 }))
    .sort((a, b) =>
      String(a.student.className || "").localeCompare(String(b.student.className || ""), undefined, { numeric: true }) ||
      String(a.student.section || "").localeCompare(String(b.student.section || ""), undefined, { numeric: true }) ||
      String(a.student.name || "").localeCompare(String(b.student.name || "")),
    );
}

export function feeReminderMessage(row: FeeDefaulter, schoolName = "the school") {
  const month = formatMonth(row.latestMonth);
  return `Dear Parent/Guardian, this is a reminder that ${row.student.name}'s outstanding school fee balance is ${rupees(row.balance)} (latest pending month: ${month}). Please arrange payment or contact ${schoolName}. Thank you.`;
}
