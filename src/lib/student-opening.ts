import Fee from "@/models/fee";

// "Previous pending fee" typed on a student becomes an opening chalan (month 0000-00).
// Every later chalan then shows it as previous pending, and payments clear it first.
export async function syncOpening(student: any, schoolId: any) {
  const amount = Number(student.previousPending) || 0;
  const open = await Fee.findOne({ student: student._id, school: schoolId, month: "0000-00" });
  if (!open) {
    if (amount > 0) await Fee.create({ school: schoolId, student: student._id, month: "0000-00", chalanNo: `OPEN-${student.rollNo || String(student._id).slice(-4)}`, actualFee: amount, discount: 0, amount });
  } else if (open.paid === 0 && open.amount !== amount) {
    if (amount > 0) { open.amount = amount; open.actualFee = amount; await open.save(); }
    else await open.deleteOne();
  }
}
