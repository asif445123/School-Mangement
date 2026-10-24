import { Field } from "./alerts";
export const studentFields: Field[] = [
  { name: "name", label: "Student name", required: true },
  { name: "fatherName", label: "Father name" },
  { name: "gender", label: "Gender", type: "radio", options: ["Male", "Female"], required: true },
  { name: "dob", label: "Date of birth", type: "date" },
  { name: "className", label: "Class", required: true },
  { name: "section", label: "Section (leave empty if the school has none)" },
  { name: "rollNo", label: "Roll number" },
  { name: "phone", label: "Phone" },
  { name: "admissionDate", label: "Admission date", type: "date" },
  { name: "monthlyFee", label: "Actual monthly fee", type: "number" },
  { name: "discount", label: "Monthly discount (Rs)", type: "number" },
  { name: "previousPending", label: "Previous pending fee (Rs)", type: "number" },
  { name: "leftDate", label: "Student left date (leave empty if studying)", type: "date" },
  // Brothers / sisters: give every child of a guardian the SAME login email and
  // that one login becomes the guardian portal for all of them (see lib/guardian).
  { name: "loginEmail", label: "Guardian / student login email - use the SAME email for brothers & sisters so the guardian sees all children in ONE portal (optional)", type: "email" },
  { name: "loginPassword", label: "Login password (6+ chars, leave empty to keep - brothers/sisters share the guardian's password)", type: "password" },
];
// Fees belong to the school, and a teacher's class + section are fixed by his account
export const feeFieldNames = ["monthlyFee", "discount", "previousPending"];
export const teacherStudentFields = studentFields.filter((f) => !feeFieldNames.includes(f.name) && f.name !== "className" && f.name !== "section");
