// utils/periods.js
function getPeriodBounds(date, periodType = 'monthly') {
  const d = new Date(date);
  let start, end;

  if (periodType === 'monthly') {
    start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (periodType === 'weekly') {
    const day = d.getDay(); // 0 = domingo, 1 = segunda
    const diff = day === 0 ? 6 : day - 1;
    start = new Date(d);
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (periodType === 'daily') {
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    end = new Date(start);
    end.setHours(23, 59, 59, 999);
  } else {
    // yearly (simplificado)
    start = new Date(d.getFullYear(), 0, 1);
    end = new Date(d.getFullYear() + 1, 0, 0, 23, 59, 59, 999);
  }

  return { start, end };
}

module.exports = { getPeriodBounds };