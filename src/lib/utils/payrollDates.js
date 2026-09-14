function dateInputValue(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isValidPayrollDateRange(startDate, endDate) {
  function isValidDateInput(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }

  return isValidDateInput(startDate) && isValidDateInput(endDate) && startDate <= endDate;
}

export function getDefaultPayrollPeriod(currentDate = new Date()) {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  return {
    startDate: dateInputValue(previousMonthYear, previousMonth, 26),
    endDate: dateInputValue(currentYear, currentMonth, 26),
  };
}
