export const demo = {
  students: [
    { name: "Ali Raza", fatherName: "Raza Ahmed", className: "5", rollNo: "1", monthlyFee: 1500 },
    { name: "Ayesha Khan", fatherName: "Khalid Khan", className: "5", rollNo: "2", monthlyFee: 1500 },
    { name: "Hamza Malik", fatherName: "Malik Nawaz", className: "6", rollNo: "1", monthlyFee: 1800 },
    { name: "Fatima Noor", fatherName: "Noor Ahmad", className: "6", rollNo: "2", monthlyFee: 1800 },
  ],
  fees: [
    { chalanNo: "202610-1", student: "Ali Raza", month: "2026-10", amount: 1500, paid: 1500, status: "paid" },
    { chalanNo: "202610-2", student: "Ayesha Khan", month: "2026-10", amount: 1500, paid: 500, status: "partial" },
    { chalanNo: "202610-3", student: "Hamza Malik", month: "2026-10", amount: 1800, paid: 0, status: "unpaid" },
    { chalanNo: "202610-4", student: "Fatima Noor", month: "2026-10", amount: 1800, paid: 1800, status: "paid" },
  ],
  diary: [
    { date: "2026-10-15", className: "5", subject: "Maths", text: "Exercise 4.2 questions 1 to 10." },
    { date: "2026-10-15", className: "6", subject: "English", text: "Write a paragraph on 'My School'." },
  ],
  papers: [
    { title: "Maths Monthly Test", type: "test", className: "5", subject: "Maths", totalMarks: 25 },
    { title: "Mid Term English", type: "exam", className: "6", subject: "English", totalMarks: 75 },
  ],
  results: [
    { student: "Ali Raza", paper: "Maths Monthly Test", obtained: 22, total: 25 },
    { student: "Ayesha Khan", paper: "Maths Monthly Test", obtained: 18, total: 25 },
  ],
};
