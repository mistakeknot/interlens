import React, { useEffect, useRef } from 'react';
import { useLensTimeline } from './useLenses';
import * as d3 from 'd3';

const LensTimeline = () => {
  const { timeline, loading, error } = useLensTimeline();
  const svgRef = useRef(null);

  useEffect(() => {
    if (!timeline || timeline.length === 0) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 900 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleLinear()
      .domain([1, 196])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(['headline', 'weekly'])
      .range([0, height])
      .padding(0.3);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    g.append("g")
      .call(d3.axisLeft(y));

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Lens Type");

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom})`)
      .style("text-anchor", "middle")
      .text("Episode Number");

    // Color scale
    const color = d3.scaleOrdinal()
      .domain(['headline', 'weekly'])
      .range(['#FF6B6B', '#4ECDC4']);

    // Add dots for each lens
    timeline.forEach(episode => {
      if (episode.headline) {
        g.append("circle")
          .attr("cx", x(episode.episode))
          .attr("cy", y('headline') + y.bandwidth() / 2)
          .attr("r", 4)
          .style("fill", color('headline'))
          .style("opacity", 0.8)
          .on("mouseover", function(event) {
            // Tooltip
            const tooltip = d3.select("body").append("div")
              .attr("class", "d3-tooltip")
              .style("opacity", 0);

            tooltip.transition()
              .duration(200)
              .style("opacity", .9);
            
            tooltip.html(`<strong>Episode ${episode.episode}</strong><br/>Headline: ${episode.headline}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function() {
            d3.selectAll(".d3-tooltip").remove();
          });
      }

      if (episode.weekly) {
        g.append("circle")
          .attr("cx", x(episode.episode))
          .attr("cy", y('weekly') + y.bandwidth() / 2)
          .attr("r", 4)
          .style("fill", color('weekly'))
          .style("opacity", 0.8)
          .on("mouseover", function(event) {
            const tooltip = d3.select("body").append("div")
              .attr("class", "d3-tooltip")
              .style("opacity", 0);

            tooltip.transition()
              .duration(200)
              .style("opacity", .9);
            
            tooltip.html(`<strong>Episode ${episode.episode}</strong><br/>Weekly: ${episode.weekly}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function() {
            d3.selectAll(".d3-tooltip").remove();
          });
      }
    });

    // Add legend
    const legend = g.append("g")
      .attr("transform", `translate(${width - 100}, 20)`);

    ['headline', 'weekly'].forEach((type, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("circle")
        .attr("r", 4)
        .attr("cx", 0)
        .attr("cy", 0)
        .style("fill", color(type));

      legendRow.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .style("font-size", "12px")
        .text(type.charAt(0).toUpperCase() + type.slice(1));
    });

  }, [timeline]);

  if (loading) {
    return <div className="timeline-loading">Loading timeline...</div>;
  }

  if (error) {
    return <div className="timeline-error">Error loading timeline: {error}</div>;
  }

  return (
    <div className="lens-timeline">
      <h2>Lens Timeline</h2>
      <p>Distribution of headline and weekly lenses across FLUX episodes</p>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default LensTimeline;