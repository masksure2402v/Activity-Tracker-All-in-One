import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Clock3 } from "lucide-react";
import axios from "axios";
import { useSunburstChart } from "./useSunburstChart";
import { ChromeDomainSlice, buildChromeSlices } from "./sunburstUtils";

interface AppUsageData {
  [appName: string]: string[];
}

interface SunburstChartProps {
  title: string;
  currentDate: Date;
}

export const SunburstChart = ({ title, currentDate }: SunburstChartProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [showSecondHalf, setShowSecondHalf] = useState(false);
  const [appUsageData, setAppUsageData] = useState<AppUsageData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"apps" | "chromeDomains">("apps");
  const [chromeSlices, setChromeSlices] = useState<ChromeDomainSlice[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dateStr = currentDate.toISOString().split("T")[0];
        const response = await axios.get<AppUsageData>(
          `http://localhost:5000/api/${dateStr}/sunBurst-Chart`
        );
        setAppUsageData(response.data);
        setError(null);
      } catch (err) {
        setError("Failed to load app usage data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentDate]);

  useSunburstChart(svgRef, mode, appUsageData, chromeSlices, showSecondHalf, currentDate, loading);

  return (
    <Card className="card-hover glass-effect border-white/20">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {mode === "apps" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSecondHalf((s) => !s)}
              className="flex items-center space-x-2"
            >
              {showSecondHalf ? <Clock className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              <span>{showSecondHalf ? "12:00 - 24:00" : "00:00 - 12:00"}</span>
            </Button>
          )}
          {mode === "chromeDomains" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode("apps")}
              className="flex items-center space-x-2"
            >
              Back
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex justify-center">
        {loading ? (
          <div className="flex items-center justify-center h-[500px] w-[500px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[500px] w-[500px]">
            <p className="text-destructive">{error}</p>
          </div>
        ) : (
          <svg ref={svgRef}></svg>
        )}
      </CardContent>
    </Card>
  );
};
