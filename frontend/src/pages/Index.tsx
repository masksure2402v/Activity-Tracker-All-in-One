import { useState } from "react";
import { DashboardHeader } from "@/components/TimeTracker/DashboardHeader";
import { SunburstChart } from "@/components/TimeTracker/SunburstChart";

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
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div> */}

        {/* Charts Section */}
        {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ActivityChart
            data={mockActivityData}
            title="Time Distribution by Category"
          />
          <AppUsageList
            data={mockAppUsageData}
            title="Top Applications"
          />
        </div> */}

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
