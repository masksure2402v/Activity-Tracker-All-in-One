import { useState } from "react";
import { DashboardHeader } from "@/components/TimeTracker/DashboardHeader";
import { SunburstChart } from "@/components/TimeTracker/SunburstChart";
import { StatsCard } from "@/components/TimeTracker/StatsCard"
import { ActivityChart } from "@/components/TimeTracker/ActivityChart";
import { AppUsageList } from "@/components/TimeTracker/AppUsageList"
import { Clock, Target, Monitor, TrendingUp } from "lucide-react";

// Mock Stats Data
const mockStatsData = {
  totalTime: "8", // hours
  productiveTime: "5.5", // hours
  mostUsedApp: "VS Code",
  focusScore: 78,
};

// Mock Activity Data
const mockActivityData = [
  { name: "Work", value: 5, color: "#4ade80" },
  { name: "Entertainment", value: 1.5, color: "#f87171" },
  { name: "Social Media", value: 0.8, color: "#60a5fa" },
  { name: "Other", value: 0.7, color: "#a78bfa" },
];

// Mock App Usage Data
const mockAppUsageData = [
  { name: "VS Code", time: 4.3, percentage: 54, category: "Development" },
  { name: "Chrome", time: 2.2, percentage: 28, category: "Productivity" },
  { name: "Spotify", time: 1.1, percentage: 14, category: "Entertainment" },
  { name: "Slack", time: 0.4, percentage: 5, category: "Communication" },
];

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader 
          currentDate={currentDate} 
          onDateChange={setCurrentDate} 
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Screen Time"
            value={`${mockStatsData.totalTime}h`}
            description="Today"
            icon={Clock}
            trend={{ value: 12, label: "from yesterday" }}
          />
          <StatsCard
            title="Productive Time"
            value={`${mockStatsData.productiveTime}h`}
            description={`${Math.round((parseFloat(mockStatsData.productiveTime) / parseFloat(mockStatsData.totalTime)) * 100)}% of total time`}
            icon={Target}
            trend={{ value: 8, label: "from yesterday" }}
          />
          <StatsCard
            title="Most Used App"
            value={mockStatsData.mostUsedApp}
            description="4.2 hours today"
            icon={Monitor}
          />
          <StatsCard
            title="Focus Score"
            value={`${mockStatsData.focusScore}%`}
            description="Above average"
            icon={TrendingUp}
            trend={{ value: 5, label: "from yesterday" }}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ActivityChart
            data={mockActivityData}
            title="Time Distribution by Category"
          />
          <AppUsageList
            data={mockAppUsageData}
            title="Top Applications"
          />
        </div>

        <div className="w-full">
          <SunburstChart 
            title="12-Hour Activity Sunburst"
            currentDate={currentDate}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
