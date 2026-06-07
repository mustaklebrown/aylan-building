import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  getDay,
  getMonth,
  subMonths,
} from "date-fns";

export type Timeframe = "today" | "week" | "month" | "year" | "all";

export interface DatedItem {
  date?: Date | string;
  createdAt?: Date | string;
}

export function filterByTimeframe<T extends DatedItem>(
  items: T[],
  timeframe: Timeframe
): T[] {
  const now = new Date();
  
  let start: Date;
  const end: Date = endOfDay(now);

  switch (timeframe) {
    case "today":
      start = startOfDay(now);
      break;
    case "week":
      start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      break;
    case "month":
      start = startOfMonth(now);
      break;
    case "year":
      start = startOfYear(now);
      break;
    case "all":
    default:
      return items;
  }

  return items.filter((item) => {
    const itemDateRaw = item.date || item.createdAt;
    if (!itemDateRaw) return false;
    const itemDate = new Date(itemDateRaw);
    return itemDate >= start && itemDate <= end;
  });
}

export interface SaleForChart {
  date: Date | string;
  price: number;
  quantity: number;
  shippingFee?: number;
}

export function getChartDataForTimeframe(
  sales: SaleForChart[],
  timeframe: Timeframe
): Array<{ name: string; ventes: number }> {
  const now = new Date();

  if (timeframe === "today") {
    // 2-hour slots: 00:00 - 02:00, etc.
    const slots = Array.from({ length: 12 }, (_, i) => {
      const hour = i * 2;
      const label = `${hour.toString().padStart(2, "0")}h-${(hour + 2).toString().padStart(2, "0")}h`;
      return { label, startHour: hour, endHour: hour + 2, salesSum: 0 };
    });

    sales.forEach((s) => {
      const sDate = new Date(s.date);
      if (sDate >= startOfDay(now) && sDate <= endOfDay(now)) {
        const hour = sDate.getHours();
        const slot = slots.find((sl) => hour >= sl.startHour && hour < sl.endHour);
        if (slot) {
          slot.salesSum += s.price * s.quantity + (s.shippingFee || 0);
        }
      }
    });

    return slots.map((s) => ({ name: s.label, ventes: s.salesSum }));
  }

  if (timeframe === "week") {
    // Days of week: Lun - Dim
    const days = [
      { name: "Lun", dayIndex: 1 },
      { name: "Mar", dayIndex: 2 },
      { name: "Mer", dayIndex: 3 },
      { name: "Jeu", dayIndex: 4 },
      { name: "Ven", dayIndex: 5 },
      { name: "Sam", dayIndex: 6 },
      { name: "Dim", dayIndex: 0 },
    ];

    const stats = days.map((d) => ({ name: d.name, ventes: 0 }));
    const startW = startOfWeek(now, { weekStartsOn: 1 });
    const endW = endOfWeek(now, { weekStartsOn: 1 });

    sales.forEach((s) => {
      const sDate = new Date(s.date);
      if (sDate >= startW && sDate <= endW) {
        const dayIdx = getDay(sDate);
        const target = days.find((d) => d.dayIndex === dayIdx);
        if (target) {
          const stat = stats.find((st) => st.name === target.name);
          if (stat) stat.ventes += s.price * s.quantity + (s.shippingFee || 0);
        }
      }
    });

    return stats;
  }

  if (timeframe === "month") {
    // Weeks of the month (Sem 1 to Sem 5)
    const stats = [
      { name: "Sem 1", ventes: 0 },
      { name: "Sem 2", ventes: 0 },
      { name: "Sem 3", ventes: 0 },
      { name: "Sem 4", ventes: 0 },
      { name: "Sem 5", ventes: 0 },
    ];
    const startM = startOfMonth(now);
    const endM = endOfMonth(now);

    sales.forEach((s) => {
      const sDate = new Date(s.date);
      if (sDate >= startM && sDate <= endM) {
        const dayOfMonth = sDate.getDate();
        let weekIdx = Math.floor((dayOfMonth - 1) / 7); // 0-6: Sem 1, 7-13: Sem 2, etc.
        if (weekIdx > 4) weekIdx = 4;
        stats[weekIdx].ventes += s.price * s.quantity + (s.shippingFee || 0);
      }
    });

    return stats;
  }

  if (timeframe === "year") {
    // 12 Months of current year
    const monthLabels = ["Janv", "Févr", "Mars", "Avri", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
    const stats = monthLabels.map((m) => ({ name: m, ventes: 0 }));
    const startY = startOfYear(now);
    const endY = endOfYear(now);

    sales.forEach((s) => {
      const sDate = new Date(s.date);
      if (sDate >= startY && sDate <= endY) {
        const mIdx = getMonth(sDate);
        stats[mIdx].ventes += s.price * s.quantity + (s.shippingFee || 0);
      }
    });

    return stats;
  }

  // All time: Show last 6 months dynamically (similar to previous hardcoded logic but computed dynamically)
  const stats = [];
  const monthsFr = ["Janv", "Févr", "Mars", "Avril", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
  
  for (let i = 5; i >= 0; i--) {
    const targetDate = subMonths(now, i);
    const year = targetDate.getFullYear();
    const monthIndex = targetDate.getMonth();
    
    const startM = startOfMonth(targetDate);
    const endM = endOfMonth(targetDate);
    
    let sum = 0;
    sales.forEach((s) => {
      const sDate = new Date(s.date);
      if (sDate >= startM && sDate <= endM) {
        sum += s.price * s.quantity + (s.shippingFee || 0);
      }
    });
    
    stats.push({
      name: `${monthsFr[monthIndex]} ${year}`,
      ventes: sum,
    });
  }

  return stats;
}
