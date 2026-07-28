import mongoose from "mongoose";
import { Announcement } from "../models/Announcement.js";
import { Attendance } from "../models/Attendance.js";
import { Child } from "../models/Child.js";
import { DailyReport } from "../models/DailyReport.js";
import { Expense } from "../models/Expense.js";
import { Group } from "../models/Group.js";
import { Payment } from "../models/Payment.js";
import { Salary } from "../models/Salary.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function listGroups(_req, res, next) {
  try {
    const groups = await Group.find().populate("teacher", "fullName phone").sort("name");
    const counts = await Child.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$group", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
    res.json({
      success: true,
      groups: groups.map((group) => ({
        ...group.toJSON(),
        childCount: countMap.get(group._id.toString()) || 0,
      })),
    });
  } catch (error) { next(error); }
}

export async function createGroup(req, res, next) {
  try {
    const group = await Group.create(req.body);
    await group.populate("teacher", "fullName phone");
    res.status(201).json({ success: true, group });
  } catch (error) { next(error); }
}

export async function listGroupTeachers(_req, res, next) {
  try {
    const teachers = await User.find({ role: "teacher", isActive: true })
      .select("fullName phone position")
      .sort("fullName");
    res.json({ success: true, teachers });
  } catch (error) { next(error); }
}

export async function updateGroup(req, res, next) {
  try {
    if (Object.hasOwn(req.body, "capacity")) {
      const activeChildren = await Child.countDocuments({ group: req.params.id, status: "active" });
      if (Number(req.body.capacity) < activeChildren) {
        throw new AppError(`Sig‘imni ${activeChildren} tadan kam qilib bo‘lmaydi.`, 409);
      }
    }
    const group = await Group.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("teacher", "fullName phone");
    if (!group) throw new AppError("Guruh topilmadi.", 404);
    res.json({ success: true, group });
  } catch (error) { next(error); }
}

export async function deleteGroup(req, res, next) {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) throw new AppError("Guruh topilmadi.", 404);
    const childCount = await Child.countDocuments({ group: group._id });
    if (childCount) {
      throw new AppError("Guruhda bolalar mavjud. Avval ularni boshqa guruhga o‘tkazing.", 409);
    }
    await group.deleteOne();
    res.json({ success: true, message: "Guruh o‘chirildi." });
  } catch (error) { next(error); }
}

export async function listChildren(req, res, next) {
  try {
    const filter = {};
    if (req.query.group) filter.group = req.query.group;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q?.trim()) {
      const escapedQuery = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const search = new RegExp(escapedQuery, "i");
      filter.$or = [
        { fullName: search },
        { "guardians.fullName": search },
        { "guardians.phone": search },
      ];
    }
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;
    const [children, total, summary] = await Promise.all([
      Child.find(filter).populate("group", "name monthlyFee").sort("fullName").skip(skip).limit(limit),
      Child.countDocuments(filter),
      Child.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
            boys: { $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] } },
            girls: { $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] } },
          },
        },
      ]),
    ]);
    res.json({
      success: true,
      children,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: summary[0] || { total: 0, active: 0, boys: 0, girls: 0 },
    });
  } catch (error) { next(error); }
}

export async function createChild(req, res, next) {
  try {
    const group = await Group.findById(req.body.group);
    if (!group) throw new AppError("Guruh topilmadi.", 404);
    const activeCount = await Child.countDocuments({ group: group._id, status: "active" });
    if (activeCount >= group.capacity) throw new AppError("Guruhda bo‘sh joy qolmagan.", 409);
    const child = await Child.create(req.body);
    await child.populate("group", "name monthlyFee");
    res.status(201).json({ success: true, child });
  } catch (error) { next(error); }
}

export async function updateChild(req, res, next) {
  try {
    const currentChild = await Child.findById(req.params.id);
    if (!currentChild) throw new AppError("Bola topilmadi.", 404);
    if (req.body.status === "active") {
      req.body.departureDate = null;
      req.body.departureReason = "";
    }
    const targetGroupId = req.body.group || currentChild.group;
    const targetStatus = req.body.status || currentChild.status;
    const needsCapacityCheck = targetStatus === "active" && (
      currentChild.status !== "active" || targetGroupId.toString() !== currentChild.group.toString()
    );
    if (needsCapacityCheck) {
      const group = await Group.findById(targetGroupId);
      if (!group) throw new AppError("Guruh topilmadi.", 404);
      const activeCount = await Child.countDocuments({ group: targetGroupId, status: "active" });
      if (activeCount >= group.capacity) throw new AppError("Tanlangan guruhda bo‘sh joy qolmagan.", 409);
    }
    const child = await Child.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("group", "name monthlyFee");
    res.json({ success: true, child });
  } catch (error) { next(error); }
}

export async function deleteChild(req, res, next) {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) throw new AppError("Bola topilmadi.", 404);
    child.status = "inactive";
    child.departureDate = req.body.departureDate || new Date();
    child.departureReason = req.body.departureReason || "Bog‘chadan chiqarildi";
    await child.save();
    await child.populate("group", "name monthlyFee");
    res.json({
      success: true,
      message: "Bola arxivlandi. Uning barcha tarixi saqlab qolindi.",
      child,
    });
  } catch (error) { next(error); }
}

export async function listAttendance(req, res, next) {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.month) filter.date = { $regex: `^${req.query.month}` };
    if (req.query.group) filter.group = req.query.group;
    const attendance = await Attendance.find(filter)
      .populate("child", "fullName")
      .populate("group", "name")
      .sort({ date: -1, createdAt: -1 });
    res.json({ success: true, attendance });
  } catch (error) { next(error); }
}

export async function saveAttendance(req, res, next) {
  try {
    const { child: childId, date = today(), ...values } = req.body;
    const child = await Child.findById(childId);
    if (!child) throw new AppError("Bola topilmadi.", 404);
    const attendance = await Attendance.findOneAndUpdate(
      { child: childId, date },
      { ...values, child: childId, group: child.group, date, markedBy: req.user._id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("child", "fullName").populate("group", "name");
    res.json({ success: true, attendance });
  } catch (error) { next(error); }
}

export async function listPayments(req, res, next) {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.query.child) filter.child = req.query.child;
    const arrearsFilter = req.query.month ? { month: { $lt: req.query.month } } : null;
    if (arrearsFilter && req.query.child) arrearsFilter.child = req.query.child;
    const [payments, arrears] = await Promise.all([
      Payment.find(filter)
        .populate("child", "fullName group")
        .populate("receivedBy", "fullName")
        .populate("transactions.receivedBy", "fullName")
        .sort({ month: -1 }),
      arrearsFilter
        ? Payment.aggregate([
            { $match: arrearsFilter },
            {
              $group: {
                _id: "$child",
                amount: {
                  $sum: {
                    $max: [{ $subtract: ["$amountDue", "$amountPaid"] }, 0],
                  },
                },
              },
            },
            { $match: { amount: { $gt: 0 } } },
          ])
        : [],
    ]);
    const arrearsByChild = Object.fromEntries(
      arrears.map((item) => [item._id.toString(), item.amount])
    );
    res.json({ success: true, payments, arrearsByChild });
  } catch (error) { next(error); }
}

export async function savePayment(req, res, next) {
  try {
    const { child: childId, month, paymentAmount, ...values } = req.body;
    if (!await Child.exists({ _id: childId })) throw new AppError("Bola topilmadi.", 404);
    if (paymentAmount !== undefined) {
      const amount = Number(paymentAmount);
      if (!Number.isFinite(amount) || amount < 1000) throw new AppError("Minimal to‘lov summasi 1 000 so‘m.", 400);
      if (!["cash", "card", "transfer"].includes(values.paymentMethod)) throw new AppError("To‘lov usulini tanlang.", 400);
      const paidAt = new Date();
      const payment = await Payment.findOneAndUpdate(
        { child: childId, month },
        {
          $setOnInsert: { child: childId, month, amountDue: values.amountDue, dueDate: values.dueDate },
          $inc: { amountPaid: amount },
          $set: { paymentMethod: values.paymentMethod, receivedBy: req.user._id, paidAt },
          $push: { transactions: { amount, paymentMethod: values.paymentMethod, receivedBy: req.user._id, paidAt } },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: false }
      )
        .populate("child", "fullName group")
        .populate("transactions.receivedBy", "fullName");
      return res.json({ success: true, payment });
    }
    const payment = await Payment.findOneAndUpdate(
      { child: childId, month },
      {
        ...values,
        child: childId,
        month,
        receivedBy: values.amountPaid > 0 ? req.user._id : null,
        paidAt: values.amountPaid > 0 ? new Date() : null,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("child", "fullName group");
    res.json({ success: true, payment });
  } catch (error) { next(error); }
}

export async function listDebtors(req, res, next) {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || "")
      ? req.query.month
      : new Date().toISOString().slice(0, 7);
    const children = await Child.find({ status: "active" })
      .populate("group", "name monthlyFee")
      .sort("fullName");
    const childIds = children.map((child) => child._id);
    const payments = await Payment.find({
      child: { $in: childIds },
      month: { $lte: month },
    }).sort({ month: -1 });
    const paymentsByChild = new Map();
    for (const payment of payments) {
      const id = payment.child.toString();
      if (!paymentsByChild.has(id)) paymentsByChild.set(id, []);
      paymentsByChild.get(id).push(payment);
    }
    const debtors = children.flatMap((child) => {
      const records = paymentsByChild.get(child._id.toString()) || [];
      const currentPayment = records.find((payment) => payment.month === month);
      const currentDue = currentPayment?.amountDue ?? child.group?.monthlyFee ?? 0;
      const currentPaid = currentPayment?.amountPaid ?? 0;
      const currentDebt = Math.max(0, currentDue - currentPaid);
      const previousRecords = records.filter((payment) => payment.month < month);
      const previousDebt = previousRecords.reduce(
        (sum, payment) => sum + Math.max(0, payment.amountDue - payment.amountPaid),
        0,
      );
      const totalDebt = currentDebt + previousDebt;
      if (totalDebt <= 0) return [];
      const debtHistory = [
        ...(currentDebt > 0 ? [{
          month,
          amountDue: currentDue,
          amountPaid: currentPaid,
          debt: currentDebt,
        }] : []),
        ...previousRecords
          .filter((payment) => payment.amountDue > payment.amountPaid)
          .map((payment) => ({
            month: payment.month,
            amountDue: payment.amountDue,
            amountPaid: payment.amountPaid,
            debt: payment.amountDue - payment.amountPaid,
          })),
      ];
      const transactions = records.flatMap((payment) => payment.transactions || []);
      const lastPayment = transactions.sort(
        (a, b) => new Date(b.paidAt) - new Date(a.paidAt),
      )[0] || null;
      return [{
        child,
        currentDue,
        currentPaid,
        currentDebt,
        previousDebt,
        totalDebt,
        debtMonths: debtHistory.length,
        debtHistory,
        lastPayment: lastPayment ? {
          amount: lastPayment.amount,
          paidAt: lastPayment.paidAt,
          paymentMethod: lastPayment.paymentMethod,
        } : null,
      }];
    });
    const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.totalDebt, 0);
    const currentMonthDebt = debtors.reduce(
      (sum, debtor) => sum + debtor.currentDebt,
      0,
    );
    res.json({
      success: true,
      month,
      debtors,
      stats: {
        count: debtors.length,
        totalDebt,
        currentMonthDebt,
        overdueCount: debtors.filter((debtor) => debtor.previousDebt > 0).length,
      },
    });
  } catch (error) { next(error); }
}

export async function listSalaries(req, res, next) {
  try {
    const month = req.query.month || today().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) throw new AppError("Oy formati noto‘g‘ri.", 400);
    const employeeFilter = {
      role: { $in: ["admin", "director", "teacher"] },
      ...(req.query.includeInactive === "true" ? {} : { isActive: true }),
    };
    const [employees, records] = await Promise.all([
      User.find(employeeFilter).select("fullName phone position salary isActive").sort("fullName"),
      Salary.find({ month: { $lte: month } })
        .populate("transactions.paidBy", "fullName")
        .sort({ month: 1, "transactions.paidAt": 1 }),
    ]);
    const recordsByEmployee = new Map();
    for (const record of records) {
      const key = record.employee.toString();
      if (!recordsByEmployee.has(key)) recordsByEmployee.set(key, []);
      recordsByEmployee.get(key).push(record);
    }
    const rows = employees.map((employee) => {
      const employeeRecords = recordsByEmployee.get(employee._id.toString()) || [];
      const previous = employeeRecords.filter((item) => item.month < month);
      const current = employeeRecords.find((item) => item.month === month);
      const previousBalance = previous.reduce((sum, item) => {
        const paid = item.transactions.reduce((total, transaction) => total + transaction.amount, 0);
        return sum + item.baseSalary + item.adjustment - paid;
      }, 0);
      const baseSalary = current?.baseSalary ?? employee.salary ?? 0;
      const adjustment = current?.adjustment ?? 0;
      const amountPaid = current?.transactions.reduce(
        (sum, transaction) => sum + transaction.amount, 0,
      ) ?? 0;
      return {
        employee,
        record: current || null,
        baseSalary,
        adjustment,
        amountDue: baseSalary + adjustment,
        amountPaid,
        previousBalance,
        balance: previousBalance + baseSalary + adjustment - amountPaid,
        transactions: current?.transactions || [],
      };
    });
    const totals = rows.reduce(
      (result, row) => ({
        due: result.due + row.amountDue,
        paid: result.paid + row.amountPaid,
        previousBalance: result.previousBalance + row.previousBalance,
        balance: result.balance + row.balance,
      }),
      { due: 0, paid: 0, previousBalance: 0, balance: 0 },
    );
    res.json({ success: true, month, rows, totals });
  } catch (error) { next(error); }
}

export async function saveSalary(req, res, next) {
  try {
    const {
      employee: employeeId, month, type = "payment",
      adjustmentAmount = 0, adjustmentNote = "",
      paymentAmount = 0, paymentMethod = "cash", note = "",
    } = req.body;
    if (!/^\d{4}-\d{2}$/.test(month || "")) throw new AppError("Oy formati noto‘g‘ri.", 400);
    const employee = await User.findById(employeeId);
    if (!employee) throw new AppError("Xodim topilmadi.", 404);
    let record = await Salary.findOne({ employee: employeeId, month });
    if (!record) {
      record = new Salary({ employee: employeeId, month, baseSalary: employee.salary || 0 });
    }
    if (type === "adjustment") {
      const normalizedAdjustment = Number(adjustmentAmount);
      if (!Number.isFinite(normalizedAdjustment) || normalizedAdjustment === 0) {
        throw new AppError("Bonus yoki jarima summasi 0 dan farqli bo‘lishi kerak.", 400);
      }
      record.adjustment += normalizedAdjustment;
      const label = normalizedAdjustment > 0 ? "Bonus" : "Jarima";
      const entry = `${label}: ${Math.abs(normalizedAdjustment).toLocaleString("uz-UZ")} so‘m${adjustmentNote ? ` — ${adjustmentNote}` : ""}`;
      record.adjustmentNote = record.adjustmentNote
        ? `${record.adjustmentNote}\n${entry}`
        : entry;
    } else if (type === "payment") {
      const normalizedPayment = Number(paymentAmount);
      if (!Number.isFinite(normalizedPayment) || normalizedPayment <= 0) {
        throw new AppError("Beriladigan pul summasi 0 dan katta bo‘lishi kerak.", 400);
      }
      record.transactions.push({
        amount: normalizedPayment, paymentMethod, note, paidBy: req.user._id,
      });
    } else {
      throw new AppError("Amal turi noto‘g‘ri.", 400);
    }
    await record.save();
    await record.populate("transactions.paidBy", "fullName");
    res.json({ success: true, record });
  } catch (error) { next(error); }
}

export async function getSalaryHistory(req, res, next) {
  try {
    const employee = await User.findById(req.params.employeeId)
      .select("fullName phone position salary isActive");
    if (!employee) throw new AppError("Xodim topilmadi.", 404);
    const records = await Salary.find({ employee: employee._id })
      .populate("transactions.paidBy", "fullName")
      .sort({ month: -1 });
    let runningBalance = 0;
    const ascending = [...records].reverse().map((record) => {
      const amountPaid = record.transactions.reduce((sum, item) => sum + item.amount, 0);
      runningBalance += record.baseSalary + record.adjustment - amountPaid;
      return {
        ...record.toJSON(), amountDue: record.baseSalary + record.adjustment,
        amountPaid, balance: runningBalance,
      };
    });
    res.json({ success: true, employee, records: ascending.reverse() });
  } catch (error) { next(error); }
}

export async function listExpenses(req, res, next) {
  try {
    const filter = {};
    if (req.query.startDate || req.query.endDate) {
      filter.expenseDate = {};
      if (req.query.startDate) {
        filter.expenseDate.$gte = new Date(`${req.query.startDate}T00:00:00.000Z`);
      }
      if (req.query.endDate) {
        filter.expenseDate.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
      }
    } else if (req.query.month) {
      const start = new Date(`${req.query.month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      filter.expenseDate = { $gte: start, $lt: end };
    }
    if (req.query.category) filter.category = req.query.category;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    const expenses = await Expense.find(filter)
      .populate("createdBy", "fullName")
      .sort({ expenseDate: -1, createdAt: -1 });
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    res.json({ success: true, expenses, total });
  } catch (error) { next(error); }
}

export async function createExpense(req, res, next) {
  try {
    const { title, category, amount, paymentMethod, note } = req.body;
    const expense = await Expense.create({
      title,
      category,
      amount,
      paymentMethod,
      note,
      expenseDate: new Date(),
      createdBy: req.user._id,
    });
    await expense.populate("createdBy", "fullName");
    res.status(201).json({ success: true, expense });
  } catch (error) { next(error); }
}

export async function updateExpense(req, res, next) {
  try {
    const { title, category, amount, paymentMethod, note } = req.body;
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, category, amount, paymentMethod, note },
      { new: true, runValidators: true },
    ).populate("createdBy", "fullName");
    if (!expense) throw new AppError("Harajat topilmadi.", 404);
    res.json({ success: true, expense });
  } catch (error) { next(error); }
}

export async function deleteExpense(req, res, next) {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) throw new AppError("Harajat topilmadi.", 404);
    res.json({ success: true, message: "Harajat o‘chirildi." });
  } catch (error) { next(error); }
}

export async function listDailyReports(req, res, next) {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.child) filter.child = req.query.child;
    const reports = await DailyReport.find(filter)
      .populate("child", "fullName group")
      .populate("author", "fullName")
      .sort({ date: -1 });
    res.json({ success: true, reports });
  } catch (error) { next(error); }
}

export async function saveDailyReport(req, res, next) {
  try {
    const { child: childId, date = today(), ...values } = req.body;
    const report = await DailyReport.findOneAndUpdate(
      { child: childId, date },
      { ...values, child: childId, date, author: req.user._id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("child", "fullName group").populate("author", "fullName");
    res.json({ success: true, report });
  } catch (error) { next(error); }
}

export async function listAnnouncements(_req, res, next) {
  try {
    const announcements = await Announcement.find()
      .populate("group", "name")
      .populate("author", "fullName")
      .sort({ publishAt: -1 });
    res.json({ success: true, announcements });
  } catch (error) { next(error); }
}

export async function createAnnouncement(req, res, next) {
  try {
    const announcement = await Announcement.create({ ...req.body, author: req.user._id });
    await announcement.populate("group", "name");
    await announcement.populate("author", "fullName");
    res.status(201).json({ success: true, announcement });
  } catch (error) { next(error); }
}

export async function getDashboard(req, res, next) {
  try {
    const selectedMonth = /^\d{4}-\d{2}$/.test(req.query.month || "")
      ? req.query.month
      : today().slice(0, 7);
    const monthStart = new Date(`${selectedMonth}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    const daysInMonth = new Date(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth() + 1,
      0,
    ).getDate();
    const chartDays = Array.from(
      { length: daysInMonth },
      (_, index) => `${selectedMonth}-${String(index + 1).padStart(2, "0")}`,
    );
    const tashkentTodayParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tashkent",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    const tashkentToday =
      `${tashkentTodayParts.year}-${tashkentTodayParts.month}-${tashkentTodayParts.day}`;
    const todayStart = new Date(`${tashkentToday}T00:00:00+05:00`);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const [
      activeChildren,
      activeGroups,
      staff,
      todayAttendance,
      currentPayments,
      previousDebtRows,
      monthExpenses,
      recentPayments,
      recentExpenses,
      paymentTrend,
      salaryTrend,
      todayPaymentRows,
      todayExpenseRows,
      todaySalaryRows,
    ] = await Promise.all([
      Child.find({ status: "active" }).populate("group", "name monthlyFee capacity"),
      Group.find({ isActive: true }).populate("teacher", "fullName").sort("name"),
      User.countDocuments({ role: { $in: ["admin", "director", "teacher"] }, isActive: true }),
      Attendance.find({ date: today() }),
      Payment.find({ month: selectedMonth }),
      Payment.aggregate([
        { $match: { month: { $lt: selectedMonth } } },
        { $project: { debt: { $max: [{ $subtract: ["$amountDue", "$amountPaid"] }, 0] } } },
        { $group: { _id: null, debt: { $sum: "$debt" } } },
      ]),
      Expense.find({ expenseDate: { $gte: monthStart, $lt: monthEnd } }),
      Payment.find({ month: selectedMonth, amountPaid: { $gt: 0 } })
        .populate("child", "fullName")
        .sort({ paidAt: -1 })
        .limit(5),
      Expense.find({ expenseDate: { $gte: monthStart, $lt: monthEnd } })
        .populate("createdBy", "fullName")
        .sort({ expenseDate: -1 })
        .limit(5),
      Payment.aggregate([
        { $match: { month: selectedMonth, amountPaid: { $gt: 0 } } },
        {
          $project: {
            entries: {
              $cond: [
                { $gt: [{ $size: "$transactions" }, 0] },
                "$transactions",
                [{ amount: "$amountPaid", paidAt: "$paidAt" }],
              ],
            },
          },
        },
        { $unwind: "$entries" },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$entries.paidAt",
                timezone: "Asia/Tashkent",
              },
            },
            amount: { $sum: "$entries.amount" },
          },
        },
      ]),
      Salary.aggregate([
        { $unwind: "$transactions" },
        { $match: { "transactions.paidAt": { $gte: monthStart, $lt: monthEnd } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$transactions.paidAt",
                timezone: "Asia/Tashkent",
              },
            },
            amount: { $sum: "$transactions.amount" },
          },
        },
      ]),
      Payment.aggregate([
        {
          $project: {
            entries: {
              $cond: [
                { $gt: [{ $size: "$transactions" }, 0] },
                "$transactions",
                [{ amount: "$amountPaid", paidAt: "$paidAt" }],
              ],
            },
          },
        },
        { $unwind: "$entries" },
        { $match: { "entries.paidAt": { $gte: todayStart, $lt: todayEnd } } },
        { $group: { _id: null, amount: { $sum: "$entries.amount" } } },
      ]),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: todayStart, $lt: todayEnd } } },
        { $group: { _id: null, amount: { $sum: "$amount" } } },
      ]),
      Salary.aggregate([
        { $unwind: "$transactions" },
        { $match: { "transactions.paidAt": { $gte: todayStart, $lt: todayEnd } } },
        { $group: { _id: null, amount: { $sum: "$transactions.amount" } } },
      ]),
    ]);
    const attendanceCounts = todayAttendance.reduce((result, record) => {
      result[record.status] = (result[record.status] || 0) + 1;
      return result;
    }, {});
    const paymentByChild = new Map(
      currentPayments.map((payment) => [payment.child.toString(), payment]),
    );
    const finance = activeChildren.reduce((result, child) => {
      const payment = paymentByChild.get(child._id.toString());
      result.due += payment?.amountDue ?? child.group?.monthlyFee ?? 0;
      result.paid += payment?.amountPaid ?? 0;
      return result;
    }, { due: 0, paid: 0 });
    const previousDebt = previousDebtRows[0]?.debt || 0;
    const currentDebt = Math.max(0, finance.due - finance.paid);
    const expenseTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const salaryPaidTotal = salaryTrend.reduce((sum, item) => sum + item.amount, 0);
    const totalOutflow = expenseTotal + salaryPaidTotal;
    const childCounts = activeChildren.reduce((result, child) => {
      const groupId = child.group?._id?.toString();
      if (groupId) result[groupId] = (result[groupId] || 0) + 1;
      return result;
    }, {});
    const groups = activeGroups.map((group) => {
      const children = childCounts[group._id.toString()] || 0;
      return {
        _id: group._id,
        name: group.name,
        teacher: group.teacher?.fullName || "Biriktirilmagan",
        children,
        capacity: group.capacity,
        occupancy: group.capacity ? Math.round((children / group.capacity) * 100) : 0,
      };
    });
    const paymentTrendMap = Object.fromEntries(paymentTrend.map((item) => [item._id, item.amount]));
    const tashkentDayFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const expenseTrendMap = monthExpenses.reduce((result, expense) => {
      const parts = Object.fromEntries(
        tashkentDayFormatter
          .formatToParts(expense.expenseDate)
          .filter((part) => part.type !== "literal")
          .map((part) => [part.type, part.value]),
      );
      const day = `${parts.year}-${parts.month}-${parts.day}`;
      result[day] = (result[day] || 0) + expense.amount;
      return result;
    }, {});
    for (const item of salaryTrend) {
      expenseTrendMap[item._id] = (expenseTrendMap[item._id] || 0) + item.amount;
    }
    res.json({
      success: true,
      month: selectedMonth,
      stats: {
        children: activeChildren.length,
        groups: activeGroups.length,
        staff,
        present: attendanceCounts.present || 0,
        absent: attendanceCounts.absent || 0,
        sick: attendanceCounts.sick || 0,
        excused: attendanceCounts.excused || 0,
        unmarked: Math.max(0, activeChildren.length - todayAttendance.length),
        due: finance.due,
        paid: finance.paid,
        currentDebt,
        previousDebt,
        debt: currentDebt + previousDebt,
        expenses: totalOutflow,
        salaryExpenses: salaryPaidTotal,
        balance: finance.paid - totalOutflow,
        collectionRate: finance.due ? Math.round((finance.paid / finance.due) * 100) : 0,
        todayPayments: todayPaymentRows[0]?.amount || 0,
        todayExpenses:
          (todayExpenseRows[0]?.amount || 0) + (todaySalaryRows[0]?.amount || 0),
      },
      groups,
      recentPayments: recentPayments.map((payment) => {
        const transaction = payment.transactions?.at(-1);
        return {
          _id: payment._id,
          child: payment.child?.fullName || "—",
          amount: transaction?.amount || payment.amountPaid,
          method: transaction?.paymentMethod || payment.paymentMethod,
          paidAt: transaction?.paidAt || payment.paidAt,
        };
      }),
      recentExpenses,
      financeTrend: chartDays.map((day) => ({
        day,
        income: paymentTrendMap[day] || 0,
        expense: expenseTrendMap[day] || 0,
      })),
    });
  } catch (error) { next(error); }
}

export async function getReports(req, res, next) {
  try {
    const month = req.query.month || today().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) throw new AppError("Oy formati noto‘g‘ri.", 400);
    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    const [attendance, paymentRows, expenseRows, salaryRows, byGroup, childStats, staff] =
      await Promise.all([
        Attendance.aggregate([
          { $match: { date: { $regex: `^${month}` } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Payment.find({ month }).populate("child", "fullName").sort({ amountPaid: -1 }),
        Expense.find({ expenseDate: { $gte: monthStart, $lt: monthEnd } })
          .populate("createdBy", "fullName").sort({ expenseDate: -1 }),
        Salary.aggregate([
          { $unwind: "$transactions" },
          { $match: { "transactions.paidAt": { $gte: monthStart, $lt: monthEnd } } },
          {
            $lookup: {
              from: "users", localField: "employee", foreignField: "_id", as: "employeeData",
            },
          },
          { $unwind: "$employeeData" },
          {
            $project: {
              _id: "$transactions._id",
              employee: "$employeeData.fullName",
              amount: "$transactions.amount",
              method: "$transactions.paymentMethod",
              note: "$transactions.note",
              paidAt: "$transactions.paidAt",
            },
          },
          { $sort: { paidAt: -1 } },
        ]),
        Group.aggregate([
          { $match: { isActive: true } },
          {
            $lookup: {
              from: "children",
              let: { groupId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$group", "$$groupId"] },
                        { $eq: ["$status", "active"] },
                      ],
                    },
                  },
                },
                { $count: "count" },
              ],
              as: "activeChildren",
            },
          },
          {
            $project: {
              _id: 0,
              name: 1,
              capacity: 1,
              children: {
                $ifNull: [{ $arrayElemAt: ["$activeChildren.count", 0] }, 0],
              },
            },
          },
          { $sort: { name: 1 } },
        ]),
        Child.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
            },
          },
        ]),
        User.countDocuments({
          role: { $in: ["admin", "director", "teacher"] }, isActive: true,
        }),
      ]);
    const payments = paymentRows.reduce(
      (result, payment) => {
        result.due += payment.amountDue;
        result.paid += payment.amountPaid;
        return result;
      },
      { due: 0, paid: 0 },
    );
    const expenses = expenseRows.reduce((sum, expense) => sum + expense.amount, 0);
    const salaries = salaryRows.reduce((sum, payment) => sum + payment.amount, 0);
    const totalExpenses = expenses + salaries;
    res.json({
      success: true,
      month,
      attendance: Object.fromEntries(attendance.map((item) => [item._id, item.count])),
      payments: {
        ...payments,
        debt: Math.max(0, payments.due - payments.paid),
      },
      finance: {
        income: payments.paid,
        expenses,
        salaries,
        totalExpenses,
        balance: payments.paid - totalExpenses,
      },
      summary: {
        children: childStats[0]?.total || 0,
        activeChildren: childStats[0]?.active || 0,
        groups: byGroup.length,
        staff,
      },
      byGroup,
      expenseRows,
      salaryRows,
    });
  } catch (error) { next(error); }
}
