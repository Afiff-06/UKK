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
) => {
  if (tanggalKembali) {
    return parseDateOnly(tanggalKembali);
  }

  return addDays(parseDateOnly(tanggalPinjam), 7);
};

export const isPastDueDate = (
  tanggalPinjam: string,
  tanggalKembali?: string | null,
  comparedAt: Date = new Date(),
) => {
  return startOfDay(comparedAt).getTime() > getDueDate(tanggalPinjam, tanggalKembali).getTime();
};

export const getReturnStatus = (
  tanggalPinjam: string,
  tanggalKembali?: string | null,
  comparedAt: Date = new Date(),
) => {
  return isPastDueDate(tanggalPinjam, tanggalKembali, comparedAt)
    ? "terlambat"
    : "dikembalikan";
};
