// pure helper functions
export const formatHm = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};

export const formatSecondsHm = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

export const parseRangeSeconds = (range: string): number => {
  const [startStr, endStr] = range.split(" - ");
  const start = new Date(startStr.replace(/-/g, "/"));
  const end = new Date(endStr.replace(/-/g, "/"));
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
};

export interface Segment {
  name: string;
  startHour: number;
  endHour: number;
  startAngle: number;
  endAngle: number;
}

export interface ChromeDomainSlice {
  name: string;
  valueSec: number;
  startAngle: number;
  endAngle: number;
}

export const processTimeMappedAppData = (
  appUsageData: Record<string, string[]>,
  startHour: number
): Segment[] => {
  const segments: Segment[] = [];
  Object.entries(appUsageData).forEach(([appName, timeRanges]) => {
    timeRanges.forEach((timeRange) => {
      const [startStr, endStr] = timeRange.split(" - ");
      const [, startTime] = startStr.split(" ");
      const [, endTime] = endStr.split(" ");
      const [sh, sm, ss] = startTime.split(":").map(Number);
      const [eh, em, es] = endTime.split(":").map(Number);

      let start = sh + sm / 60 + ss / 3600;
      let end = eh + em / 60 + es / 3600;

      if (start < startHour) start = startHour;
      if (end > startHour + 12) end = startHour + 12;

      if (start < end) {
        const startAngle = ((start - startHour) / 12) * 2 * Math.PI;
        const endAngle = ((end - startHour) / 12) * 2 * Math.PI;
        segments.push({
          name: appName.replace(".exe", ""),
          startHour: start,
          endHour: end,
          startAngle,
          endAngle,
        });
      }
    });
  });
  return segments;
};

export const buildChromeSlices = (
  byDomain: Record<string, string[]>
): ChromeDomainSlice[] => {
  const entries = Object.entries(byDomain).map(([domain, ranges]) => {
    const totalSec = ranges.reduce((acc, r) => acc + parseRangeSeconds(r), 0);
    return [domain, totalSec] as const;
  });

  const totalAll = Math.max(1, entries.reduce((acc, [, sec]) => acc + sec, 0));
  let cursor = 0;

  return entries.map(([domain, sec]) => {
    const startAngle = cursor;
    const angleSpan = (sec / totalAll) * 2 * Math.PI;
    const endAngle = startAngle + angleSpan;
    cursor = endAngle;
    return { name: domain, valueSec: sec, startAngle, endAngle };
  });
};
