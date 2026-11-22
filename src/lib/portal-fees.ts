// Projection for the guardian portal's fee query (see /api/my).
//
// It lists exactly the voucher fields the portal renders, and nothing under
// `whatsapp`. That is deliberate: `whatsapp.lockUntil` and `whatsapp.lockToken`
// are `select: false` (see src/models/fee.ts), so `select("-whatsapp")` made
// Mongoose send MongoDB `{ whatsapp: 0, "whatsapp.lockUntil": 0,
// "whatsapp.lockToken": 0 }`, and Mongo rejects a parent excluded together
// with its children:
//   Path collision at whatsapp.lockUntil remaining portion lockUntil
// which crashed the Guardian Portal for every child. An inclusion projection
// can never collide with those hidden paths, and keeps the send-lease token
// out of the browser regardless.
export const PORTAL_FEE_FIELDS =
  "student month chalanNo actualFee discount admissionFee annualCharges amount paid status receivedDate payments";
