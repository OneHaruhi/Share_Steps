const DEMO_DATE_STORAGE_KEY = 'share-steps-demo-date';

export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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
