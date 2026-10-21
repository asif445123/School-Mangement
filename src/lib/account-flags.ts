// Reads an account type's check marks; older records saved with the previous dropdowns still work.
export const typeFlags = (t: any) => ({
  receivable: !!(t?.isReceivable ?? t?.nature === "receivable"),
  payable: !!(t?.isPayable ?? t?.nature === "payable"),
  income: !!(t?.isIncome ?? t?.dashboard === "income"),
  expense: !!(t?.isExpense ?? t?.dashboard === "expense"),
});
