import { useEffect, useState } from "react";

interface AppUsage {
  name: string;
  percentage: number;
  time: number;
}

const fetchAppUsageData = async (dateStr: string) => {
  const res = await fetch(`http://127.0.0.1:5000/api/${dateStr}/top-applications`);
  if (!res.ok) throw new Error("Failed to fetch app usage");
  return res.json();
};

export const useAppUsage = (currentDate: Date) => {
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);

  useEffect(() => {
    const dateStr = currentDate.toISOString().split("T")[0];

    const loadData = async () => {
      try {
        const data = await fetchAppUsageData(dateStr);
        setAppUsage(data);

        const minutes = data.reduce(
          (sum: number, app: AppUsage) => sum + (app.time || 0),
          0
        );
        setTotalMinutes(minutes);
      } catch (err) {
        console.error("Error fetching app usage:", err);
      }
    };

    loadData();
  }, [currentDate]);

  return { appUsage, totalMinutes };
};
