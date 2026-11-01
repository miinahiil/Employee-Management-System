import { Router } from "express";
import { nanoid } from "nanoid";
import { getDb, logActivity } from "../db.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const db = await getDb();
  const withCounts = db.data.departments.map((d) => ({
    ...d,
    headcount: db.data.employees.filter((e) => e.departmentId === d.id && e.status !== "Resigned").length,
  }));
  res.json(withCounts);
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, code, color } = req.body || {};
  if (!name?.trim() || !code?.trim()) {
    return res.status(400).json({ error: "Department name and code are required." });
  }
  const db = await getDb();
  if (db.data.departments.some((d) => d.code.toLowerCase() === code.toLowerCase())) {
    return res.status(409).json({ error: "A department with that code already exists." });
  }
  const dept = { id: `dep_${nanoid(6)}`, name: name.trim(), code: code.trim().toUpperCase(), color: color || "#586170" };
  db.data.departments.push(dept);
  db.data.deptSeq[dept.id] = 0;
  logActivity(db, { action: "department.create", message: `Created department "${dept.name}".`, byUser: req.user.name });
  await db.write();
  res.status(201).json(dept);
});

router.put("/:id", requireAdmin, async (req, res) => {
  const db = await getDb();
  const dept = db.data.departments.find((d) => d.id === req.params.id);
  if (!dept) return res.status(404).json({ error: "Department not found." });
  const { name, color } = req.body || {};
  if (name?.trim()) dept.name = name.trim();
  if (color) dept.color = color;
  logActivity(db, { action: "department.update", message: `Updated department "${dept.name}".`, byUser: req.user.name });
  await db.write();
  res.json(dept);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const db = await getDb();
  const dept = db.data.departments.find((d) => d.id === req.params.id);
  if (!dept) return res.status(404).json({ error: "Department not found." });
  const inUse = db.data.employees.some((e) => e.departmentId === dept.id);
  if (inUse) {
    return res.status(409).json({ error: "Reassign or remove employees in this department before deleting it." });
  }
  db.data.departments = db.data.departments.filter((d) => d.id !== dept.id);
  logActivity(db, { action: "department.delete", message: `Deleted department "${dept.name}".`, byUser: req.user.name });
  await db.write();
  res.status(204).end();
});

export default router;
