import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfMonth, subMonths } from "date-fns";

function daysInMonth(year: number, month1: number) {
  return new Date(year, month1, 0).getDate(); // month1 is 1-based
}

function addOneMonth(month: number, year: number): { month: number; year: number } {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function GET() {
  const now = new Date();
  const todayMonth = now.getMonth() + 1; // 1-based
  const todayYear  = now.getFullYear();
  const todayDay   = now.getDate();

  const monthStart = new Date(todayYear, todayMonth - 1, 1);
  const tomorrow   = new Date(todayYear, todayMonth - 1, todayDay + 1);

  // 1. Today's net: all transactions this month up to and including today
  const [incomeAgg, expenseAgg] = await Promise.all([
    db.transaction.aggregate({
      where: { type: "income",  date: { gte: monthStart, lt: tomorrow } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { type: "expense", date: { gte: monthStart, lt: tomorrow } },
      _sum: { amount: true },
    }),
  ]);
  const todayNet = (incomeAgg._sum.amount ?? 0) - (expenseAgg._sum.amount ?? 0);

  // 2. Avg daily non-recurring expense — last 3 complete months
  const threeMonthsAgo    = startOfMonth(subMonths(now, 3));
  const currentMonthStart = startOfMonth(now);

  const nonRecurringAgg = await db.transaction.aggregate({
    where: {
      type: "expense",
      recurring: false,
      date: { gte: threeMonthsAgo, lt: currentMonthStart },
    },
    _sum: { amount: true },
  });

  const totalDays3Months = [1, 2, 3].reduce((s, i) => {
    const d = subMonths(now, i);
    return s + new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }, 0);

  const totalNonRecurring = nonRecurringAgg._sum.amount ?? 0;
  const avgDailyExpense   = totalDays3Months > 0 ? totalNonRecurring / totalDays3Months : 0;

  // 3. Active recurring rules with current-month generation status
  const activeRules = await db.recurringRule.findMany({
    where: { active: true },
    include: { generations: { where: { month: todayMonth, year: todayYear } } },
  });

  // 4. Build data points
  const m1 = addOneMonth(todayMonth, todayYear);
  const m2 = addOneMonth(m1.month, m1.year);

  let balance = todayNet;

  // Adjust for overdue uncommitted rules (dayOfMonth <= today, no generation this month)
  for (const rule of activeRules) {
    if (rule.generations.length === 0 && rule.dayOfMonth <= todayDay) {
      balance += rule.type === "income" ? rule.amount : -rule.amount;
    }
  }

  const points: { label: string; balance: number; isToday: boolean }[] = [
    { label: "Today", balance: Math.round(balance), isToday: true },
  ];

  // Remaining days of current month
  const thisMonthDays = daysInMonth(todayYear, todayMonth);
  for (let d = todayDay + 1; d <= thisMonthDays; d++) {
    balance -= avgDailyExpense;
    for (const rule of activeRules) {
      if (rule.generations.length === 0 && rule.dayOfMonth === d) {
        balance += rule.type === "income" ? rule.amount : -rule.amount;
      }
    }
    points.push({ label: "", balance: Math.round(balance), isToday: false });
  }

  // Next 2 full months — all active rules apply (no generation records exist yet)
  for (const { month, year } of [m1, m2]) {
    const days = daysInMonth(year, month);
    for (let d = 1; d <= days; d++) {
      balance -= avgDailyExpense;
      for (const rule of activeRules) {
        const ruleDay = Math.min(rule.dayOfMonth, days);
        if (ruleDay === d) {
          balance += rule.type === "income" ? rule.amount : -rule.amount;
        }
      }
      const label = d === 1 ? `${MONTH_NAMES[month - 1]} 1` : "";
      points.push({ label, balance: Math.round(balance), isToday: false });
    }
  }

  // Assumption text (months used for avg)
  const avgMonthNames = [3, 2, 1]
    .map(i => subMonths(now, i).toLocaleString("en-ZA", { month: "short", year: "numeric" }))
    .join(", ");

  const assumptionText = avgDailyExpense > 0
    ? `Variable spending estimated at ${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(avgDailyExpense)}/day (${avgMonthNames} average, non-committed only). Committed payments applied on scheduled dates.`
    : `No variable spending history found in the last 3 months. Forecast shows committed payments only.`;

  return NextResponse.json({ todayNet, avgDailyExpense, points, assumptionText });
}
