const parseDateTime = (date: string, time?: string | null) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = (time || "23:59").split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
};

const parseDateOnly = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getDueDate = (
  tanggalPinjam: string,
  tanggalKembali?: string | null,
  jamKembali?: string | null,
) => {
  if (tanggalKembali) {
    return parseDateTime(tanggalKembali, jamKembali);
  }

  // Default to 7 days after borrowing at end of day if no return date
  const date = addDays(parseDateOnly(tanggalPinjam), 7);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const isPastDueDate = (
  tanggalPinjam: string,
  tanggalKembali?: string | null,
  comparedAt: Date = new Date(),
  jamKembali?: string | null,
) => {
  return comparedAt.getTime() > getDueDate(tanggalPinjam, tanggalKembali, jamKembali).getTime();
};

export const getReturnStatus = (
  tanggalPinjam: string,
  tanggalKembali?: string | null,
  comparedAt: Date = new Date(),
  jamKembali?: string | null,
) => {
  return isPastDueDate(tanggalPinjam, tanggalKembali, comparedAt, jamKembali)
    ? "terlambat"
    : "dikembalikan";
};
