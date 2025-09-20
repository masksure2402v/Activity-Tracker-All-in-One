import { useState } from "react";
import { DashboardHeader } from "@/components/TimeTracker/DashboardHeader";
import { SunburstChart } from "@/components/TimeTracker/charts/SunburstChart/SunburstChart";
import { StatsCard } from "@/components/TimeTracker/StatsCard";
import { ActivityChart } from "@/components/TimeTracker/charts/ActivityChart";
import { AppUsageList } from "@/components/TimeTracker/AppUsageList";
import { Clock, Target, Monitor, TrendingUp } from "lucide-react";
import { useAppUsage } from "@/services/appUsageService";

const mockStatsData = {
  totalTime: "8",
  productiveTime: "--",
  mostUsedApp: "--",
  focusScore: "--",
};

const mockActivityData = [
  { name: "Work", value: 5, color: "#4ade80" },
  { name: "Entertainment", value: 1.5, color: "#f87171" },
  { name: "Social Media", value: 0.8, color: "#60a5fa" },
  { name: "Other", value: 0.7, color: "#a78bfa" },
];

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAllApps, setShowAllApps] = useState(false);

  const { appUsage, totalMinutes } = useAppUsage(currentDate);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const visibleApps = showAllApps ? appUsage : appUsage.slice(0, 3);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader currentDate={currentDate} onDateChange={setCurrentDate} />

        {/* Stats Overview */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="Total Screen Time" value={formattedTime} description="Today" icon={Clock} />
          <StatsCard
            title="Productive Time"
            value={`${mockStatsData.productiveTime}h`}
            description={`${Math.round((parseFloat(mockStatsData.productiveTime) / parseFloat(mockStatsData.totalTime)) * 100)}% of total time`}
            icon={Target}
            trend={{ value: 8, label: "from yesterday" }}
          />
          <StatsCard title="Most Used App" value={mockStatsData.mostUsedApp} description="4.2 hours today" icon={Monitor} />
          <StatsCard title="Focus Score" value={`${mockStatsData.focusScore}%`} description="Above average" icon={TrendingUp} trend={{ value: 5, label: "from yesterday" }} />
        </div> */}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ActivityChart data={mockActivityData} title="Time Distribution by Category" />
          <div>
            <AppUsageList data={visibleApps} title="Top Applications" />
            {appUsage.length > 3 && (
              <button
                onClick={() => setShowAllApps(!showAllApps)}
                className="mt-2 text-sm text-blue-500 hover:underline"
              >
                {showAllApps ? "Show Less" : "Show More"}
              </button>
            )}
          </div>
        </div>

        <div className="w-full">
          <SunburstChart title="12-Hour Activity Sunburst" currentDate={currentDate} />
        </div>
      </div>
    </div>
  );
};

export default Index;
