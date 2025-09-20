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

    // Time labels group
    const paddingFromEdge = 12; // small offset from outer edge
    const labelsGroup = g.append("g").attr("class", "time-labels");

    const placeLabels = (secondHalf: boolean) => {
      const texts = secondHalf ? ["12", "15", "18", "21"] : ["00", "3", "6", "9"];

      // clear previous if any
      labelsGroup.selectAll("text").remove();

      // top (index 0)
      labelsGroup
        .append("text")
        .attr("class", "time-label top")
        .attr("x", 0)
        .attr("y", -radius + paddingFromEdge)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "gray")
        .attr("font-size", "16px")
        .style("font-weight", "bold")
        .text(texts[0]);

      // right (index 1)
      labelsGroup
        .append("text")
        .attr("class", "time-label right")
        .attr("x", radius - paddingFromEdge)
        .attr("y", 0)
        .attr("text-anchor", "start")
        .attr("dy", "0.35em")
        .attr("fill", "gray")
        .attr("font-size", "16px")
        .style("font-weight", "bold")
        .text(texts[1]);

      // bottom (index 2)
      labelsGroup
        .append("text")
        .attr("class", "time-label bottom")
        .attr("x", 0)
        .attr("y", radius - paddingFromEdge)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "gray")
        .attr("font-size", "16px")
        .style("font-weight", "bold")
        .text(texts[2]);

      // left (index 3)
      labelsGroup
        .append("text")
        .attr("class", "time-label left")
        .attr("x", -radius + paddingFromEdge)
        .attr("y", 0)
        .attr("text-anchor", "end")
        .attr("dy", "0.35em")
        .attr("fill", "gray")
        .attr("font-size", "16px")
        .style("font-weight", "bold")
        .text(texts[3]);
    };

    // initial placement based on showSecondHalf
    placeLabels(showSecondHalf);

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

      // bring time labels to front
      labelsGroup.raise();
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

      // bring time labels to front
      labelsGroup.raise();
    }

    // no explicit cleanup required because we removeAll at start of effect
  }, [mode, appUsageData, chromeSlices, showSecondHalf, currentDate, loading]);
};
