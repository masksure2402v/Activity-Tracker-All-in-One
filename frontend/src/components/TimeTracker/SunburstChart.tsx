import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Clock3 } from "lucide-react";
import * as d3 from "d3";
import axios from "axios";

interface AppUsageData {
  [appName: string]: string[];
}

interface SunburstChartProps {
  title: string;
  currentDate: Date;
}

interface HierarchyNode extends d3.HierarchyNode<any> {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export const SunburstChart = ({ title, currentDate }: SunburstChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [showSecondHalf, setShowSecondHalf] = useState(false);
  const [appUsageData, setAppUsageData] = useState<AppUsageData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dateStr = currentDate.toISOString().split('T')[0];
        const response = await axios.get(`http://localhost:5000/api/${dateStr}/sunBurst-Chart`);
        setAppUsageData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching sunburst chart data:', err);
        setError('Failed to load app usage data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentDate]);

  const processTimeMappedAppData = (startHour: number): any[] => {
    const segments: {
      name: string;
      startHour: number;
      endHour: number;
      startAngle: number;
      endAngle: number;
    }[] = [];

    Object.entries(appUsageData).forEach(([appName, timeRanges]) => {
      timeRanges.forEach(timeRange => {
        const [startStr, endStr] = timeRange.split(' - ');
        const [, startTime] = startStr.split(' ');
        const [, endTime] = endStr.split(' ');

        const [sh, sm, ss] = startTime.split(':').map(Number);
        const [eh, em, es] = endTime.split(':').map(Number);

        let start = sh + sm / 60 + ss / 3600;
        let end = eh + em / 60 + es / 3600;

        if (start < startHour) start = startHour;
        if (end > startHour + 12) end = startHour + 12;

        if (start < end) {
          const startAngle = ((start - startHour) / 12) * 2 * Math.PI;
          const endAngle = ((end - startHour) / 12) * 2 * Math.PI;

          segments.push({
            name: appName.replace('.exe', ''),
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

  useEffect(() => {
    if (!svgRef.current || loading || Object.keys(appUsageData).length === 0) return;
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 2;

    const startHour = showSecondHalf ? 12 : 0;
    const segments = processTimeMappedAppData(startHour);

    if (segments.length === 0) {
      const svg = d3.select(svgRef.current)
        .attr("width", width)
        .attr("height", height);

      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("fill", "gray")
        .text("No data available for this time period");
      return;
    }

    const arc = d3.arc<any>()
      .innerRadius(radius * 0.4)    // Thicker ring (was 0.4)
      .outerRadius(radius * 1.0)   // Nearly full width

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Center text (updates on hover)
    const centerText = g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "gray")
      .attr("font-size", "16px")
      .style("font-weight", "bold")
      .text("Hover to inspect");

    const formatDuration = (start: number, end: number) => {
      const totalMinutes = Math.round((end - start) * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h}h ${m}m`;
    };

    g.selectAll("path")
      .data(segments)
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", d => color(d.name))
      .style("stroke", "white")
      .style("stroke-width", "1px")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .style("opacity", 0.8);

        centerText.text(`${d.name} (${formatDuration(d.startHour, d.endHour)})`);
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget)
          .style("opacity", 1);

        centerText.text("Hover to inspect");
      });

  }, [showSecondHalf, currentDate, appUsageData, loading]);


  return (
    <Card className="card-hover glass-effect border-white/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSecondHalf(!showSecondHalf)}
            className="flex items-center space-x-2"
          >
            {showSecondHalf ? <Clock className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            <span>{showSecondHalf ? "12:00 - 24:00" : "00:00 - 12:00"}</span>
          </Button>
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
          <div className="relative">
            <svg ref={svgRef}></svg>
            <div
              ref={tooltipRef}
              className="absolute pointer-events-none opacity-0 transition-opacity duration-200 z-50"
              style={{
                backgroundColor: "transparent",
                border: "none",
              }}
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
