const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-shape"),
  require("d3-scale"),
  require("d3-fetch"),
  require("d3-force"),
  require("d3-collection"),
  require("d3-transition"),
  require("d3-ease"));

import * as OrbitalMechanics from "../tools/OrbitalMechanics";

import "./styles.css";
import dataSrc from "./stars.json";

export const id = "chart-orbits";
export const name = "The S-Stars: Astrometry";
export const readme = "This visualisation shows the motions of a few of the S-stars as they appear on the sky, while they orbit the supermassive black hole at the center of the Milky Way. The paths are interpolated on the fly from the measured orbital elements. The dashed circle has a diameter of just 0.5'' (or about 23 light days).";
export const sources = [
  {url: "http://dx.doi.org/10.1088/0004-637X/692/2/1075", description: "Gillessen+ 2009" }];

export function controls() {}

export function create(el, props) {
  const M0 = 4e6;
  const R0 = 8e3;
  const mu = 39487906165.75915*M0/Math.pow(R0, 3);

  var margin = {top: 30, right: 20, bottom: 10, left: 20},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var svg = d3.select(el)
    .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  var x = d3.scaleLinear().range([0, width]),
      y = d3.scaleLinear().range([height, 0]),
      aspect = width / height;

  var background = svg.append("g"),
      foreground = svg.append("g");

  background.append("ellipse")
    .attr("class", "circle");

  background.append("circle")
    .attr("class", "origin");

  var traces = [];

  d3.json(dataSrc).then(function(orbits) {
    function render(id) {
      var orbit = orbits[id];

      var P = OrbitalMechanics.period(orbit, mu);
      var t0 = orbit.t0 - P/2, dt = P / 100,
          time = d3.range(t0, t0 + P + dt, dt),
          points = time.map(t => {
            var p = OrbitalMechanics.oe2rv({
              a: orbit.a,
              e: orbit.e,
              inc: orbit.inc,
              Omega: orbit.Omega,
              omega: orbit.omega,
              M: OrbitalMechanics.meanMotion(orbit, mu) * (t - orbit.t0)
            }, mu);
            return [-p.y, p.x];
          });

      var [xmin, xmax] = d3.extent(points, d => d[0]);
      var [ymin, ymax] = d3.extent(points, d => d[1]);

      if (ymax - ymin > (xmax - xmin) / aspect) {
        x.domain([(xmax + xmin)/2 - (ymax - ymin)/2 * aspect, (xmax + xmin)/2 + (ymax - ymin)/2 * aspect]);
        y.domain([ymin, ymax]);
      } else {
        x.domain([xmin, xmax]);
        y.domain([(ymax + ymin)/2 - (xmax - xmin)/2 / aspect, (ymax + ymin)/2 + (xmax - xmin)/2 / aspect]);
      }

      background.select(".circle")
        .attr("cx", x(0))
        .attr("cy", y(0))
      .transition().duration(1000)
        .attr("rx", x(250) - x(0))
        .attr("ry", y(0) - y(250));

      background.select(".origin")
        .attr("cx", x(0))
        .attr("cy", y(0))
        .attr("r", 5);

      var line = d3.line()
        .x(d => x(d[0]))
        .y(d => y(d[1]))
        .curve(d3.curveBasis);

      traces.push({cx0: x(0), cy0: y(0), rx0: x(250) - x(0), ry0: y(0) - y(250)});
      var trace = background.selectAll(".trace").data(traces);

      trace.interrupt();

      trace.enter()
        .append("path")
          .attr("class", "trace")
          .style("stroke-width", 8)
          .transition().duration(2500).ease(d3.easeLinear)
            .attrTween("d", function() {
              var interpolate = d3.scaleQuantile().domain([0,1]).range(d3.range(1, points.length + 1));
              return t => line(points.slice(0, interpolate(t)));
          });

      trace.each(function(d) {
        var dx = x(0) - d.cx0,
            dy = y(0) - d.cy0,
            sx = (x(250) - x(0))/d.rx0,
            sy = (y(0) - y(250))/d.ry0; // = sx

        d3.select(this).attr("transform", `translate(${-x(0)*(sx-1)},${-y(0)*(sy-1)}) scale(${sx},${sy}) translate(${dx},${dy})`);
        d3.select(this).style("stroke-width", 8/sx);
      });
    }

    var simulation = d3.forceSimulation()
      .force("collision", d3.forceCollide().radius(d => d.r + 1));

    var nodes = d3.entries(orbits);
    nodes.forEach(d => d.r = 35 - d.value.mag);

    var color = d3.scaleOrdinal()
      .domain(["early-type", "late-type"])
      .range(["#1f77b4", "#d62728"]);

    var node = foreground.selectAll(".node").data(nodes).enter()
      .append("g")
        .attr("class", "node");

    node.append("circle")
      .attr("r", d => d.r)
      .style("fill", d => color(d.value.type))
      .attr("opacity", d => d.key == "S2" ? 1 : 0.66);

    node.append("text")
      .attr("text-anchor", "middle")
      .attr("y", ".3em")
      .text(d => d.key);

    node.on("click", function(d) {
      d3.select(this).select("circle").attr("opacity", 1);
      render(d.key);
    });

    simulation
      .nodes(nodes)
      .on("tick", function() {
        node.attr("transform", d => `translate(${200 + d.x},${(200 + d.y)})`);
      });

    render("S2");
  });
}

export function destroy() {}
