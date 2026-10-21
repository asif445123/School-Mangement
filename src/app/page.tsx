import Link from "next/link";
import { FaMoneyBillWave, FaBook, FaFileAlt, FaChartBar } from "react-icons/fa";

const features = [
  { icon: <FaMoneyBillWave />, title: "Fee Chalan & Receiving", text: "Generate monthly chalans, receive fees and print copies." },
  { icon: <FaBook />, title: "Daily Diary", text: "Write class-wise homework and notes every day." },
  { icon: <FaFileAlt />, title: "Test & Exam Papers", text: "Create, store and print test and exam papers." },
  { icon: <FaChartBar />, title: "Marks & Reports", text: "Enter marks and view fee and result reports." },
];
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-slate-900 sm:text-5xl">School Management System</h1>
      <p className="mx-auto mt-4 max-w-2xl text-slate-600">Monthly fee chalan, fee receiving, daily diary, test and exam papers, marks entry and reports — all in one place.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/login" className="btn">Login</Link>
        <Link href="/demo" className="btn-light">View Demo</Link>
        <Link href="/contact" className="btn-light">Contact us</Link>
      </div>
      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <article key={f.title} className="card text-left">
            <div className="text-2xl text-blue-600">{f.icon}</div>
            <h2 className="mt-3 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{f.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
