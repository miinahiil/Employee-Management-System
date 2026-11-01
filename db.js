import { JSONFilePreset } from "lowdb/node";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, "data.json");

const DEPARTMENTS = [
  { id: "dep_eng", name: "Engineering", code: "ENG", color: "#2F6F63" },
  { id: "dep_dsg", name: "Design", code: "DSG", color: "#6B5CA5" },
  { id: "dep_prd", name: "Product", code: "PRD", color: "#C98A3B" },
  { id: "dep_sls", name: "Sales", code: "SLS", color: "#B5482F" },
  { id: "dep_mkt", name: "Marketing", code: "MKT", color: "#3B6EA5" },
  { id: "dep_hr", name: "HR", code: "HR", color: "#A5527B" },
  { id: "dep_fin", name: "Finance", code: "FIN", color: "#6E7B3F" },
];

const defaultData = {
  users: [
    {
      id: "usr_admin",
      name: "Lena Kowalski",
      email: "admin@corvid.io",
      // password: admin123
      passwordHash: bcrypt.hashSync("admin123", 10),
      role: "admin",
    },
    {
      id: "usr_viewer",
      name: "Guest Viewer",
      email: "viewer@corvid.io",
      // password: viewer123
      passwordHash: bcrypt.hashSync("viewer123", 10),
      role: "viewer",
    },
  ],
  departments: DEPARTMENTS,
  employees: [
    {
      id: nanoid(8), code: "ENG-0001", name: "Amara Chen", email: "amara.chen@corvid.io",
      departmentId: "dep_eng", role: "Senior Frontend Developer", status: "Active",
      salary: 128000, joinDate: "2022-03-14", avatarUrl: null,
    },
    {
      id: nanoid(8), code: "PRD-0001", name: "Diego Ferreira", email: "diego.f@corvid.io",
      departmentId: "dep_prd", role: "Product Manager", status: "Active",
      salary: 141000, joinDate: "2021-11-02", avatarUrl: null,
    },
    {
      id: nanoid(8), code: "DSG-0001", name: "Priya Natarajan", email: "priya.n@corvid.io",
      departmentId: "dep_dsg", role: "Product Designer", status: "On Leave",
      salary: 112000, joinDate: "2023-01-09", avatarUrl: null,
    },
    {
      id: nanoid(8), code: "SLS-0001", name: "Owen Blackwood", email: "owen.b@corvid.io",
      departmentId: "dep_sls", role: "Account Executive", status: "Active",
      salary: 98000, joinDate: "2020-06-23", avatarUrl: null,
    },
    {
      id: nanoid(8), code: "HR-0001", name: "Lena Kowalski", email: "lena.k@corvid.io",
      departmentId: "dep_hr", role: "HR Business Partner", status: "Active",
      salary: 104000, joinDate: "2019-09-17", avatarUrl: null,
    },
    {
      id: nanoid(8), code: "ENG-0002", name: "Marcus Webb", email: "marcus.w@corvid.io",
      departmentId: "dep_eng", role: "Backend Developer", status: "Resigned",
      salary: 118000, joinDate: "2021-02-11", avatarUrl: null,
    },
  ],
  activity: [],
  seq: 3, // next Engineering sequence number etc. handled per-department below
  deptSeq: { dep_eng: 3, dep_dsg: 2, dep_prd: 2, dep_sls: 2, dep_mkt: 1, dep_hr: 2, dep_fin: 1 },
};

export async function getDb() {
  const db = await JSONFilePreset(dbFile, defaultData);
  return db;
}

export function logActivity(db, { action, message, byUser }) {
  db.data.activity.unshift({
    id: nanoid(8),
    action,
    message,
    byUser,
    timestamp: new Date().toISOString(),
  });
  db.data.activity = db.data.activity.slice(0, 200);
}
