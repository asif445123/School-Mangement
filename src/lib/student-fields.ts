import { Field } from "./alerts";
export const studentFields: Field[] = [
  { name: "name", label: "Student name", required: true },
  { name: "fatherName", label: "Father name" },
  { name: "gender", label: "Gender", type: "radio", options: ["Male", "Female"], required: true },
  { name: "dob", label: "Date of birth", type: "date" },
  { name: "className", label: "Class", required: true },
  { name: "rollNo", label: "Roll number" },
  { name: "phone", label: "Phone" },
  { name: "admissionDate", label: "Admission date", type: "date" },
  { name: "monthlyFee", label: "Actual monthly fee", type: "number" },
  { name: "discount", label: "Monthly discount (Rs)", type: "number" },
  { name: "previousPending", label: "Previous pending fee (Rs)", type: "number" },
  { name: "leftDate", label: "Student left date (leave empty if studying)", type: "date" },
  { name: "loginEmail", label: "Student login email (optional)", type: "email" },
  { name: "loginPassword", label: "Login password (6+ chars, leave empty to keep)", type: "password" },
];
