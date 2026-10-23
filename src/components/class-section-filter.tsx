"use client";

// Class -> Section pickers shared by the Students pages (school and teacher portals).
export default function ClassSectionFilter({ classes, sections, className, section, onClass, onSection, allClasses = "All classes" }: {
  classes: string[]; sections: string[]; className: string; section: string;
  onClass: (v: string) => void; onSection: (v: string) => void; allClasses?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="input w-auto min-w-[132px] py-2" aria-label="Class" value={className} onChange={(e) => onClass(e.target.value)}>
        <option value="">{allClasses}</option>
        {classes.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="input w-auto min-w-[126px] py-2" aria-label="Section" value={section} onChange={(e) => onSection(e.target.value)} disabled={!sections.length}>
        <option value="">{sections.length ? "All sections" : "No section"}</option>
        {sections.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
