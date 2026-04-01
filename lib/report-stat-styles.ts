const REPORT_STAT_STYLE_MAP = {
  blue: {
    card: "bg-blue-50",
    iconWrapper: "bg-blue-100",
    icon: "text-blue-600",
  },
  green: {
    card: "bg-green-50",
    iconWrapper: "bg-green-100",
    icon: "text-green-600",
  },
  orange: {
    card: "bg-orange-50",
    iconWrapper: "bg-orange-100",
    icon: "text-orange-600",
  },
  gray: {
    card: "bg-gray-50",
    iconWrapper: "bg-gray-100",
    icon: "text-gray-600",
  },
} as const;

export type ReportStatColor = keyof typeof REPORT_STAT_STYLE_MAP;

export function getReportStatStyles(color: string) {
  return REPORT_STAT_STYLE_MAP[color as ReportStatColor] ?? REPORT_STAT_STYLE_MAP.gray;
}
