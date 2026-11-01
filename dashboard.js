import { Router } from "express";
import { getDb } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

router.get("/stats", async (req, res) => {
  const db = await getDb();
  const employees = db.data.employees;
  const departments = db.data.departments;

  const byStatus = { Active: 0, "On Leave": 0, Resigned: 0 };
  employees.forEach((e) => { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });

  const byDepartment = departments.map((d) => ({
    name: d.name,
    color: d.color,
    count: employees.filter((e) => e.departmentId === d.id).length,
  }));

  const byYear = {};
  employees.forEach((e) => {
    const year = (e.joinDate || "").slice(0, 4);
    if (year) byYear[year] = (byYear[year] || 0) + 1;
  });
  const hiringTrend = Object.entries(byYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, count]) => ({ year, count }));

  const avgSalary = employees.length
    ? Math.round(employees.reduce((sum, e) => sum + (e.salary || 0), 0) / employees.filter((e) => e.salary).length) || 0
    : 0;

  res.json({
    total: employees.length,
    active: byStatus.Active,
    onLeave: byStatus["On Leave"],
    resigned: byStatus.Resigned,
    departmentCount: departments.length,
    avgSalary,
    byStatus,
    byDepartment,
    hiringTrend,
  });
});

router.get("/activity", async (req, res) => {
  const db = await getDb();
  res.json(db.data.activity.slice(0, 30));
});

export default router;
