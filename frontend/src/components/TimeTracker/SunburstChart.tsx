import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Clock3 } from "lucide-react";
import * as d3 from "d3";
import axios from "axios";

// ---------- Types ----------
interface AppUsageData {
  [appName: string]: string[]; // ["YYYY-MM-DD HH:MM:SS - YYYY-MM-DD HH:MM:SS", ...]
}

interface SunburstChartProps {
  title: string;
  currentDate: Date;
}

interface Segment {
  name: string; // app name (e.g., "chrome" or "code")
  startHour: number; // decimal hours within the selected 12h window
  endHour: number;   // decimal hours within the selected 12h window
  startAngle: number;
  endAngle: number;
}

interface ChromeActivityByDomain {
  [domain: string]: string[]; // same timerange strings
}

interface ChromeDomainSlice {
  name: string;       // domain
  valueSec: number;   // total seconds for this domain
  startAngle: number; // pie slice start
  endAngle: number;   // pie slice end
}

// D3 arc will read startAngle/endAngle off the datum by default
const makeArc = <T extends { startAngle: number; endAngle: number }>(radius: number) =>
  d3.arc<T>()
    .innerRadius(radius * 0.4)
    .outerRadius(radius * 1.0);

export const SunburstChart = ({ title, currentDate }: SunburstChartProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [showSecondHalf, setShowSecondHalf] = useState(false);
  const [appUsageData, setAppUsageData] = useState<AppUsageData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // view mode: main apps vs. inside-chrome domains
  const [mode, setMode] = useState<"apps" | "chromeDomains">("apps");
  const [chromeSlices, setChromeSlices] = useState<ChromeDomainSlice[] | null>(null);

  // ---------- Data fetch: App usage (existing endpoint) ----------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dateStr = currentDate.toISOString().split("T")[0];
        const response = await axios.get<AppUsageData>(`http://localhost:5000/api/${dateStr}/sunBurst-Chart`);
        setAppUsageData(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching sunburst chart data:", err);
        setError("Failed to load app usage data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentDate]);

  // ---------- Helpers ----------
  const formatHm = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  const formatSecondsHm = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const parseRangeSeconds = (range: string): number => {
    // "YYYY-MM-DD HH:MM:SS - YYYY-MM-DD HH:MM:SS"
    const [startStr, endStr] = range.split(" - ");
    const start = new Date(startStr.replace(/-/g, "/"));
    const end = new Date(endStr.replace(/-/g, "/"));
    const diff = (end.getTime() - start.getTime()) / 1000; // seconds
    return Math.max(0, Math.round(diff));
  };

  const processTimeMappedAppData = (startHour: number): Segment[] => {
    const segments: Segment[] = [];

    Object.entries(appUsageData).forEach(([appName, timeRanges]) => {
      (timeRanges as string[]).forEach((timeRange: string) => {
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

  const buildChromeSlices = (byDomain: ChromeActivityByDomain): ChromeDomainSlice[] => {
    // Sum seconds per domain
    const entries = Object.entries(byDomain).map(([domain, ranges]) => {
      const totalSec = (ranges as string[]).reduce((acc: number, r: string) => acc + parseRangeSeconds(r), 0);
      return [domain, totalSec] as const;
    });

    const totalAll = Math.max(1, entries.reduce((acc, [, sec]) => acc + sec, 0));

    // Build cumulative angles around a full circle
    let cursor = 0;
    const slices: ChromeDomainSlice[] = entries.map(([domain, sec]) => {
      const startAngle = cursor;
      const angleSpan = (sec / totalAll) * 2 * Math.PI;
      const endAngle = startAngle + angleSpan;
      cursor = endAngle;
      return { name: domain, valueSec: sec, startAngle, endAngle };
    });

    return slices;
  };

  // ---------- Draw ----------
  useEffect(() => {
    if (!svgRef.current || loading) return;

    const hasData = Object.keys(appUsageData).length > 0 || (mode === "chromeDomains" && (chromeSlices?.length || 0) > 0);
    const svgSel = d3.select(svgRef.current);
    svgSel.selectAll("*").remove();

    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 2;

    const svg = svgSel.attr("width", width).attr("height", height);
    const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
    const color = d3.scaleOrdinal<string, string>(d3.schemeCategory10);

    if (!hasData) {
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "16px")
        .style("fill", "gray")
        .text("No data available for this time period");
      return;
    }

    const centerText = g
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "gray")
      .attr("font-size", "16px")
      .style("font-weight", "bold")
      .text("Hover to inspect");

    const arcApps = makeArc<Segment>(radius);
    const arcChrome = makeArc<ChromeDomainSlice>(radius);

    if (mode === "apps") {
      const startHour = showSecondHalf ? 12 : 0;
      const segments = processTimeMappedAppData(startHour);

      g.selectAll<SVGPathElement, Segment>("path.app")
        .data<Segment>(segments)
        .enter()
        .append("path")
        .attr("class", "app")
        .attr("d", arcApps as any)
        .style("fill", (d) => color(d.name))
        .style("stroke", "white")
        .style("stroke-width", "1px")
        .style("cursor", "pointer")
        .on("mouseover", function (event: any, d: Segment) {
          d3.select(this).style("opacity", 0.8);
          const totalMinutes = Math.round((d.endHour - d.startHour) * 60);
          centerText.text(`${d.name} (${formatHm(totalMinutes)})`);
        })
        .on("mouseout", function () {
          d3.select(this).style("opacity", 1);
          centerText.text("Hover to inspect");
        })
        .on("click", async (_event: any, d: Segment) => {
          const n = d.name.toLowerCase();
          if (n === "chrome" || n === "chrome.exe") {
            try {
              const dateStr = currentDate.toISOString().split("T")[0];
              const res = await axios.get<ChromeActivityByDomain>(`http://localhost:5000/api/${dateStr}/chrome_activity`);
              const slices = buildChromeSlices(res.data);
              setChromeSlices(slices);
              setMode("chromeDomains");
            } catch (e) {
              console.error("Failed to load chrome_activity", e);
            }
          }
        });
    } else if (mode === "chromeDomains" && chromeSlices) {
      g.selectAll<SVGPathElement, ChromeDomainSlice>("path.domain")
        .data<ChromeDomainSlice>(chromeSlices)
        .enter()
        .append("path")
        .attr("class", "domain")
        .attr("d", arcChrome as any)
        .style("fill", (d) => color(d.name))
        .style("stroke", "white")
        .style("stroke-width", "1px")
        .style("cursor", "pointer")
        .on("mouseover", function (event: any, d: ChromeDomainSlice) {
          d3.select(this).style("opacity", 0.85);
          centerText.text(`${d.name} (${formatSecondsHm(d.valueSec)})`);
        })
        .on("mouseout", function () {
          d3.select(this).style("opacity", 1);
          centerText.text("Hover to inspect");
        });

      centerText.text("Chrome Activity by Domain");
    }
  }, [showSecondHalf, currentDate, appUsageData, loading, mode, chromeSlices]);

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
              title="Back to apps view"
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
