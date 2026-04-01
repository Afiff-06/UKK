import test from "node:test";
import assert from "node:assert/strict";

import { getReportStatStyles } from "../../lib/report-stat-styles.ts";

test("report stat styles return concrete tailwind classes", () => {
  assert.deepEqual(getReportStatStyles("blue"), {
    card: "bg-blue-50",
    iconWrapper: "bg-blue-100",
    icon: "text-blue-600",
  });

  assert.deepEqual(getReportStatStyles("green"), {
    card: "bg-green-50",
    iconWrapper: "bg-green-100",
    icon: "text-green-600",
  });

  assert.deepEqual(getReportStatStyles("orange"), {
    card: "bg-orange-50",
    iconWrapper: "bg-orange-100",
    icon: "text-orange-600",
  });
});

test("report stat styles fall back safely for unknown colors", () => {
  assert.deepEqual(getReportStatStyles("unknown"), {
    card: "bg-gray-50",
    iconWrapper: "bg-gray-100",
    icon: "text-gray-600",
  });
});
