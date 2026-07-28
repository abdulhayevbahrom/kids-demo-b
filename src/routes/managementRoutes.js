import { Router } from "express";
import {
  createAnnouncement,
  createChild,
  createGroup,
  createExpense,
  deleteChild,
  deleteGroup,
  deleteExpense,
  getDashboard,
  getReports,
  listAnnouncements,
  listAttendance,
  listChildren,
  listDailyReports,
  listDebtors,
  listGroups,
  listExpenses,
  listGroupTeachers,
  listPayments,
  listSalaries,
  getSalaryHistory,
  saveAttendance,
  saveDailyReport,
  savePayment,
  saveSalary,
  updateChild,
  updateGroup,
  updateExpense,
} from "../controllers/managementController.js";
import { allowPermission, protect } from "../middleware/auth.js";

export const managementRouter = Router();
managementRouter.use(protect);

managementRouter.get("/dashboard", allowPermission("dashboard"), getDashboard);
managementRouter.get("/reports", allowPermission("reports"), getReports);

managementRouter.route("/groups")
  .get(allowPermission("groups"), listGroups)
  .post(allowPermission("groups"), createGroup);
managementRouter.get("/groups/teachers", allowPermission("groups"), listGroupTeachers);
managementRouter.route("/groups/:id")
  .patch(allowPermission("groups"), updateGroup)
  .delete(allowPermission("groups"), deleteGroup);

managementRouter.route("/children")
  .get(allowPermission("children"), listChildren)
  .post(allowPermission("children"), createChild);
managementRouter.route("/children/:id")
  .patch(allowPermission("children"), updateChild)
  .delete(allowPermission("children"), deleteChild);

managementRouter.route("/attendance")
  .get(allowPermission("attendance"), listAttendance)
  .post(allowPermission("attendance"), saveAttendance);

managementRouter.route("/payments")
  .get(allowPermission("payments"), listPayments)
  .post(allowPermission("payments"), savePayment);
managementRouter.get("/debtors", allowPermission("debtors"), listDebtors);

managementRouter.route("/salaries")
  .get(allowPermission("salaries"), listSalaries)
  .post(allowPermission("salaries"), saveSalary);
managementRouter.get(
  "/salaries/:employeeId/history",
  allowPermission("salaries"),
  getSalaryHistory,
);

managementRouter.route("/expenses")
  .get(allowPermission("expenses"), listExpenses)
  .post(allowPermission("expenses"), createExpense);
managementRouter.route("/expenses/:id")
  .patch(allowPermission("expenses"), updateExpense)
  .delete(allowPermission("expenses"), deleteExpense);

managementRouter.route("/daily-reports")
  .get(allowPermission("daily"), listDailyReports)
  .post(allowPermission("daily"), saveDailyReport);

managementRouter.route("/announcements")
  .get(allowPermission("announcements"), listAnnouncements)
  .post(allowPermission("announcements"), createAnnouncement);
