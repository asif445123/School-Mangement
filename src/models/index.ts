import Student from "./student";
import Fee from "./fee";
import Diary from "./diary";
import Paper from "./paper";
import Mark from "./mark";
import AccountType from "./account-type";
import Account from "./account";
import Entry from "./entry";
import GrEntry from "./gr-entry";

export const resources: Record<string, { model: any; populate?: any }> = {
  students: { model: Student },
  fees: { model: Fee, populate: "student" },
  diary: { model: Diary },
  papers: { model: Paper },
  marks: { model: Mark },
  accountTypes: { model: AccountType },
  accounts: { model: Account, populate: "accountType" },
  entries: { model: Entry, populate: { path: "account", populate: { path: "accountType" } } },
  grRegister: { model: GrEntry },
};
// Who may read / write each resource (admin never touches school data; students use /api/my)
export const access: Record<string, { read: string[]; write: string[] }> = {
  students: { read: ["school", "teacher"], write: ["school", "teacher"] },
  fees: { read: ["school"], write: ["school"] },
  diary: { read: ["school", "teacher"], write: ["school", "teacher"] },
  papers: { read: ["school", "teacher"], write: ["school", "teacher"] },
  marks: { read: ["school", "teacher"], write: ["school", "teacher"] },
  accountTypes: { read: ["school"], write: ["school"] },
  accounts: { read: ["school"], write: ["school"] },
  entries: { read: ["school"], write: ["school"] },
  grRegister: { read: ["school"], write: ["school"] },
};
