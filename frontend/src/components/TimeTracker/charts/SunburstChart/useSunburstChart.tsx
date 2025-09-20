import { useEffect } from "react";
import * as d3 from "d3";
import {
  Segment,
  ChromeDomainSlice,
  formatHm,
  formatSecondsHm,
  processTimeMappedAppData,
} from "./sunburstUtils";

export const useSunburstChart = (
  svgRef: React.RefObject<SVGSVGElement>,
  mode: "apps" | "chromeDomains",
  appUsageData: Record<string, string[]>,
  chromeSlices: ChromeDomainSlice[] | null,
  showSecondHalf: boolean,
  currentDate: Date,
  loading: boolean
) => {
  useEffect(() => {
    if (!svgRef.current || loading) return;

    const svgSel = d3.select(svgRef.current);
    svgSel.selectAll("*").remove();

    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 2;
    const g = svgSel
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal<string, string>(d3.schemeCategory10);

    const centerText = g
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "gray")
      .attr("font-size", "16px")
      .style("font-weight", "bold")
      .text("Hover to inspect");

    const arcApps = d3.arc<Segment>().innerRadius(radius * 0.4).outerRadius(radius);
    const arcChrome = d3.arc<ChromeDomainSlice>().innerRadius(radius * 0.4).outerRadius(radius);

    if (mode === "apps") {
      const startHour = showSecondHalf ? 12 : 0;
      const segments = processTimeMappedAppData(appUsageData, startHour);

      g.selectAll("path.app")
        .data(segments)
        .enter()
        .append("path")
        .attr("class", "app")
        .attr("d", arcApps as any)
        .style("fill", (d) => color(d.name))
        .style("stroke", "white")
        .on("mouseover", function (_, d) {
          d3.select(this).style("opacity", 0.8);
          const totalMinutes = Math.round((d.endHour - d.startHour) * 60);
          centerText.text(`${d.name} (${formatHm(totalMinutes)})`);
        })
        .on("mouseout", function () {
          d3.select(this).style("opacity", 1);
          centerText.text("Hover to inspect");
        });
    } else if (mode === "chromeDomains" && chromeSlices) {
      g.selectAll("path.domain")
        .data(chromeSlices)
        .enter()
        .append("path")
        .attr("class", "domain")
        .attr("d", arcChrome as any)
        .style("fill", (d) => color(d.name))
        .style("stroke", "white")
        .on("mouseover", function (_, d) {
          d3.select(this).style("opacity", 0.85);
          centerText.text(`${d.name} (${formatSecondsHm(d.valueSec)})`);
        })
        .on("mouseout", function () {
          d3.select(this).style("opacity", 1);
          centerText.text("Hover to inspect");
        });

      centerText.text("Chrome Activity by Domain");
    }
  }, [mode, appUsageData, chromeSlices, showSecondHalf, currentDate, loading]);
};
