var d3 = Object.assign({},
  require("d3-selection"),
  require("d3-scale"),
  require("d3-shape"),
  require("d3-array"),
  require("d3-timer"),
  require("d3-interpolate"));

import "./styles.css";

export const id = "chart-cosine";
export const name = "The Cosine Curve";
export const readme = "The relationship of \\(\\cos(x)\\) to the circle.";
export const sources = [{url: "https://en.wikipedia.org/wiki/Trigonometric_functions", description: "Trigonometric Functions (Wikipedia)"}];

var timer;

export function controls() {}

export function create(el, props) {

  var margin = {top: 20, right: 10, bottom: 20, left: 10};
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var svg = d3.select(el)
    .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    var xmin = -1.2, xmax = 6.4,
        ymin = -(height/width)*(xmax-xmin)/2, ymax = -ymin;

    var x = d3.scaleLinear().domain([xmin, xmax]).range([0, width]),
        y = d3.scaleLinear().domain([ymin, ymax]).range([height, 0]);

    svg.append("path")
      .attr("class", "axis")
      .attr("d", `M${x(xmin)},${y(0)}H${width},${y(0)}`);

    svg.append("path")
      .attr("class", "axis")
      .attr("d", `M${x(0)},${y(ymin)}V${x(0)},${y(ymax)}`);

    svg.append("circle")
      .attr("class", "axis")
      .attr("cx", x(0))
      .attr("cy", y(0))
      .attr("r", x(1) - x(0));

    var p = 0,
        dp = 0.01;

    var line = d3.line()
      .x(d => x(d))
      .y(d => y(Math.cos(d - p)))
      .curve(d3.curveBasis);

    var arc = d3.arc()
      .innerRadius(0)
      .outerRadius(x(1) - x(0))
      .startAngle(0);

    svg.append("path")
      .attr("class", "wedge")
      .attr("transform", `translate(${x(0)},${y(0)})`)
      .datum({endAngle: p})
      .attr("d", arc);

    svg.append("line")
      .attr("class", "line line-0");

    svg.append("path")
      .datum(d3.range(0, xmax, dp*xmax))
      .attr("class", "line line-1")
      .attr("d", line);

    svg.append("line")
      .attr("class", "line line-2")
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", y(1))
      .attr("y2", y(1));

    svg.selectAll(".circle")
      .data(d3.range(2))
    .enter().append("circle")
      .attr("class", "circle")
      .attr("cx", x(0))
      .attr("cy", y(1))
      .attr("r", 5);

    timer = d3.interval(function() {
        p += dp;
        if (p > 2*Math.PI-0.5*dp) p = 0;

        svg.select(".wedge")
          .datum({endAngle: p})
          .attr("d", arc);

        svg.selectAll(".line-0")
          .attr("x1", x(Math.sin(p)))
          .attr("y1", y(Math.cos(p)))
          .attr("x2", x(0))
          .attr("y2", y(Math.cos(p)));

        svg.select(".line-1")
          .attr("d", line);

        svg.select(".line-2")
          .attr("x2", x(p));

        svg.selectAll(".circle")
          .each(function(d) {
            switch (d) {
              case 0:
                d3.select(this)
                  .attr("cx", x(Math.sin(p)))
                  .attr("cy", y(Math.cos(p)));
                break;
              case 1:
                d3.select(this)
                  .attr("cx", x(p));
                break;
            }
          });
      }, 20);
}

export function destroy() {
  if (typeof timer !== "undefined") timer.stop();
}
