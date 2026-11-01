import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import { getDb, logActivity } from "../db.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, WEBP, or GIF images are allowed."));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate);

function makeCode(db, departmentId) {
  const dept = db.data.departments.find((d) => d.id === departmentId);
  const prefix = dept ? dept.code : "GEN";
  db.data.deptSeq[departmentId] = (db.data.deptSeq[departmentId] || 0) + 1;
  return `${prefix}-${String(db.data.deptSeq[departmentId]).padStart(4, "0")}`;
}

function validateEmployee(body, { partial = false } = {}) {
  const errors = {};
  if (!partial || body.name !== undefined) {
    if (!body.name?.trim()) errors.name = "Full name is required.";
  }
  if (!partial || body.email !== undefined) {
    if (!body.email?.trim()) errors.email = "Work email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(body.email)) errors.email = "Enter a valid email address.";
  }
  if (!partial || body.role !== undefined) {
    if (!body.role?.trim()) errors.role = "Job title is required.";
  }
  if (!partial || body.departmentId !== undefined) {
    if (!body.departmentId?.trim()) errors.departmentId = "Department is required.";
  }
  if (body.salary !== undefined && body.salary !== null && body.salary !== "") {
    if (isNaN(Number(body.salary)) || Number(body.salary) < 0) errors.salary = "Salary must be a positive number.";
  }
  return errors;
}

// GET /api/employees?search=&department=&status=&page=&limit=&sort=
router.get("/", async (req, res) => {
  const db = await getDb();
  const { search = "", department = "All", status = "All", sort = "name-asc", page = 1, limit = 10 } = req.query;

  let list = db.data.employees.map((e) => ({
    ...e,
    department: db.data.departments.find((d) => d.id === e.departmentId) || null,
  }));

  const q = String(search).trim().toLowerCase();
  if (q) {
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
    );
  }
  if (department !== "All") list = list.filter((e) => e.departmentId === department);
  if (status !== "All") list = list.filter((e) => e.status === status);

  const [sortKey, sortDir] = String(sort).split("-");
  list.sort((a, b) => {
    let av, bv;
    if (sortKey === "name") { av = a.name; bv = b.name; }
    else if (sortKey === "joinDate") { av = a.joinDate; bv = b.joinDate; }
    else if (sortKey === "salary") { av = a.salary || 0; bv = b.salary || 0; }
    else { av = a.name; bv = b.name; }
    if (av < bv) return sortDir === "desc" ? 1 : -1;
    if (av > bv) return sortDir === "desc" ? -1 : 1;
    return 0;
  });

  const total = list.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const start = (pageNum - 1) * limitNum;
  const pageItems = list.slice(start, start + limitNum);

  res.json({ items: pageItems, total, page: pageNum, limit: limitNum, totalPages: Math.max(1, Math.ceil(total / limitNum)) });
});

router.get("/export", async (req, res) => {
  const db = await getDb();
  const rows = db.data.employees.map((e) => {
    const dept = db.data.departments.find((d) => d.id === e.departmentId);
    return [e.code, e.name, e.email, dept?.name || "", e.role, e.status, e.salary ?? "", e.joinDate];
  });
  const header = ["Code", "Name", "Email", "Department", "Role", "Status", "Salary", "Join Date"];
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=employees.csv");
  res.send(csv);
});

router.post("/", requireAdmin, async (req, res) => {
  const errors = validateEmployee(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const db = await getDb();
  if (!db.data.departments.some((d) => d.id === req.body.departmentId)) {
    return res.status(400).json({ errors: { departmentId: "Unknown department." } });
  }

  const employee = {
    id: nanoid(8),
    code: makeCode(db, req.body.departmentId),
    name: req.body.name.trim(),
    email: req.body.email.trim(),
    departmentId: req.body.departmentId,
    role: req.body.role.trim(),
    status: req.body.status || "Active",
    salary: req.body.salary ? Number(req.body.salary) : null,
    joinDate: req.body.joinDate || new Date().toISOString().slice(0, 10),
    avatarUrl: null,
  };
  db.data.employees.unshift(employee);
  logActivity(db, { action: "employee.create", message: `Added ${employee.name} (${employee.code}).`, byUser: req.user.name });
  await db.write();

  const dept = db.data.departments.find((d) => d.id === employee.departmentId);
  res.status(201).json({ ...employee, department: dept });
});

router.put("/:id", requireAdmin, async (req, res) => {
  const db = await getDb();
  const employee = db.data.employees.find((e) => e.id === req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found." });

  const errors = validateEmployee(req.body, { partial: true });
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  if (req.body.departmentId && !db.data.departments.some((d) => d.id === req.body.departmentId)) {
    return res.status(400).json({ errors: { departmentId: "Unknown department." } });
  }

  const fields = ["name", "email", "departmentId", "role", "status", "joinDate"];
  for (const f of fields) {
    if (req.body[f] !== undefined) employee[f] = typeof req.body[f] === "string" ? req.body[f].trim() : req.body[f];
  }
  if (req.body.salary !== undefined) {
    employee.salary = req.body.salary === "" || req.body.salary === null ? null : Number(req.body.salary);
  }

  logActivity(db, { action: "employee.update", message: `Updated ${employee.name}'s record.`, byUser: req.user.name });
  await db.write();

  const dept = db.data.departments.find((d) => d.id === employee.departmentId);
  res.json({ ...employee, department: dept });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const db = await getDb();
  const employee = db.data.employees.find((e) => e.id === req.params.id);
  if (!employee) return res.status(404).json({ error: "Employee not found." });

  db.data.employees = db.data.employees.filter((e) => e.id !== req.params.id);
  logActivity(db, { action: "employee.delete", message: `Removed ${employee.name} (${employee.code}).`, byUser: req.user.name });
  await db.write();
  res.status(204).end();
});

router.post("/:id/avatar", requireAdmin, (req, res) => {
  upload.single("avatar")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const db = await getDb();
    const employee = db.data.employees.find((e) => e.id === req.params.id);
    if (!employee) return res.status(404).json({ error: "Employee not found." });
    employee.avatarUrl = `/uploads/${req.file.filename}`;
    logActivity(db, { action: "employee.avatar", message: `Updated ${employee.name}'s photo.`, byUser: req.user.name });
    await db.write();
    res.json({ avatarUrl: employee.avatarUrl });
  });
});

export default router;
