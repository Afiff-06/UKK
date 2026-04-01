import test from "node:test";
import assert from "node:assert/strict";

import {
  canConfirmReturnDetail,
  canRequestReturnDetail,
  deriveLoanStatusFromReturnDetails,
  getLegacyDetailReturnStatus,
  isMissingDetailReturnColumnsError,
} from "../../lib/return-workflow.ts";

test("deriveLoanStatusFromReturnDetails stays dipinjam while items are still borrowed", () => {
  assert.equal(
    deriveLoanStatusFromReturnDetails({
      detailStatuses: ["dipinjam", "dikembalikan"],
      tanggalPinjam: "2026-04-01",
      tanggalKembali: "2026-04-03",
    }),
    "dipinjam",
  );
});

test("deriveLoanStatusFromReturnDetails becomes confirmation when any detail waits verification", () => {
  assert.equal(
    deriveLoanStatusFromReturnDetails({
      detailStatuses: ["dipinjam", "konfirmasi_pengembalian"],
      tanggalPinjam: "2026-04-01",
      tanggalKembali: "2026-04-03",
    }),
    "konfirmasi_pengembalian",
  );
});

test("deriveLoanStatusFromReturnDetails becomes dikembalikan when all items are returned on time", () => {
  assert.equal(
    deriveLoanStatusFromReturnDetails({
      detailStatuses: ["dikembalikan", "dikembalikan"],
      tanggalPinjam: "2026-04-01",
      tanggalKembali: "2026-04-03",
      comparedAt: new Date("2026-04-02T10:00:00+07:00"),
    }),
    "dikembalikan",
  );
});

test("deriveLoanStatusFromReturnDetails becomes terlambat when all items are returned after due date", () => {
  assert.equal(
    deriveLoanStatusFromReturnDetails({
      detailStatuses: ["dikembalikan"],
      tanggalPinjam: "2026-04-01",
      tanggalKembali: "2026-04-02",
      comparedAt: new Date("2026-04-03T10:00:00+07:00"),
    }),
    "terlambat",
  );
});

test("return-detail action guards only allow valid transitions", () => {
  assert.equal(canRequestReturnDetail("dipinjam"), true);
  assert.equal(canRequestReturnDetail("konfirmasi_pengembalian"), false);
  assert.equal(canRequestReturnDetail("dikembalikan"), false);

  assert.equal(canConfirmReturnDetail("dipinjam"), false);
  assert.equal(canConfirmReturnDetail("konfirmasi_pengembalian"), true);
  assert.equal(canConfirmReturnDetail("dikembalikan"), false);
});

test("legacy parent status can be mapped to detail status safely", () => {
  assert.equal(getLegacyDetailReturnStatus("dipinjam"), "dipinjam");
  assert.equal(
    getLegacyDetailReturnStatus("konfirmasi_pengembalian"),
    "konfirmasi_pengembalian",
  );
  assert.equal(getLegacyDetailReturnStatus("dikembalikan"), "dikembalikan");
  assert.equal(getLegacyDetailReturnStatus("terlambat"), "dikembalikan");
});

test("missing detail return columns are detected from Supabase error payloads", () => {
  assert.equal(
    isMissingDetailReturnColumnsError({
      code: "42703",
      message: 'column detail_peminjaman.status_pengembalian does not exist',
    }),
    true,
  );

  assert.equal(
    isMissingDetailReturnColumnsError({
      details: "Perhaps you meant the column detail_peminjaman.jumlah",
      hint: "status_pengembalian",
    }),
    true,
  );

  assert.equal(
    isMissingDetailReturnColumnsError({
      code: "PGRST116",
      message: "JSON object requested, multiple rows returned",
    }),
    false,
  );
});
