import { getReturnStatus } from "./peminjaman-status.ts";

export type DetailReturnStatus =
  | "dipinjam"
  | "konfirmasi_pengembalian"
  | "dikembalikan";

export type LoanReturnStatus =
  | "dipinjam"
  | "konfirmasi_pengembalian"
  | "dikembalikan"
  | "terlambat";

interface DeriveLoanStatusInput {
  detailStatuses: Array<DetailReturnStatus | null | undefined>;
  tanggalPinjam: string;
  tanggalKembali?: string | null;
  jamKembali?: string | null;
  comparedAt?: Date;
}

export const normalizeDetailStatus = (
  status: DetailReturnStatus | null | undefined,
): DetailReturnStatus => {
  if (status === "konfirmasi_pengembalian" || status === "dikembalikan") {
    return status;
  }

  return "dipinjam";
};

export const getLegacyDetailReturnStatus = (
  loanStatus: string | null | undefined,
): DetailReturnStatus => {
  if (loanStatus === "konfirmasi_pengembalian") {
    return "konfirmasi_pengembalian";
  }

  if (loanStatus === "dikembalikan" || loanStatus === "terlambat") {
    return "dikembalikan";
  }

  return "dipinjam";
};

export const isMissingDetailReturnColumnsError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const parts = ["message", "details", "hint", "code"]
    .map((key) => {
      const value = (error as Record<string, unknown>)[key];
      return typeof value === "string" ? value : "";
    })
    .join(" ")
    .toLowerCase();

  return (
    parts.includes("status_pengembalian") ||
    parts.includes("diajukan_pengembalian_pada") ||
    parts.includes("dikonfirmasi_pengembalian_pada")
  );
};

export const deriveLoanStatusFromReturnDetails = ({
  detailStatuses,
  tanggalPinjam,
  tanggalKembali,
  jamKembali,
  comparedAt,
}: DeriveLoanStatusInput): LoanReturnStatus => {
  const statuses = detailStatuses.map(normalizeDetailStatus);

  if (statuses.length === 0) {
    return "dipinjam";
  }

  if (statuses.every((status) => status === "dikembalikan")) {
    return getReturnStatus(
      tanggalPinjam,
      tanggalKembali,
      comparedAt,
      jamKembali,
    );
  }

  if (statuses.some((status) => status === "konfirmasi_pengembalian")) {
    return "konfirmasi_pengembalian";
  }

  return "dipinjam";
};

export const canRequestReturnDetail = (
  status: DetailReturnStatus | null | undefined,
) => normalizeDetailStatus(status) === "dipinjam";

export const canConfirmReturnDetail = (
  status: DetailReturnStatus | null | undefined,
) => normalizeDetailStatus(status) === "konfirmasi_pengembalian";
