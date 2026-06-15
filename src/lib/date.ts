const DEMO_DATE_STORAGE_KEY = 'share-steps-demo-date';

function formatDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateString(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayDateString() {
  return formatDateString(new Date());
}

export function getInitialDemoDate() {
  const storedDate = window.localStorage.getItem(DEMO_DATE_STORAGE_KEY);
  return storedDate && isValidDateString(storedDate) ? storedDate : getTodayDateString();
}

export function saveDemoDate(date: string) {
  if (!isValidDateString(date)) {
    return;
  }

  window.localStorage.setItem(DEMO_DATE_STORAGE_KEY, date);
}

export function resetDemoDate() {
  window.localStorage.removeItem(DEMO_DATE_STORAGE_KEY);
  return getTodayDateString();
}

export type StepHistoryPeriod = 'week' | 'month';

export function getStepHistoryDates(dateString: string, period: StepHistoryPeriod) {
  const selectedDate = parseDateString(dateString);
  let startDate: Date;
  let numberOfDays: number;

  if (period === 'week') {
    const daysFromMonday = (selectedDate.getDay() + 6) % 7;
    startDate = new Date(selectedDate);
    startDate.setDate(selectedDate.getDate() - daysFromMonday);
    numberOfDays = 7;
  } else {
    startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    numberOfDays = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  }

  return Array.from({ length: numberOfDays }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return formatDateString(date);
  });
}

function isValidDateString(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  );
}
