var d3 = Object.assign({},
  require("d3-selection"),
  require("d3-fetch"),
  require("d3-scale"),
  require("d3-drag"),
  require("d3-geo"),
  require("d3-timer"));

import versor from "versor";

import dataSrc from "./data.csv";

export const id = "chart-stars";
export const name = "Star Chart";
export const readme = "An interactive star chart created for a tutorial session at .Astronomy 8.";
export const sources = [
  {url: "http://bl.ocks.org/mbostock/c7e85d2b47d11982db38", description: "block #c7e85d2b47d11982db38"},
  {url: "http://tdc-www.harvard.edu/catalogs/bsc5.html", description: "Yale Bright Star Catalog"}];

var timers;

export function controls() {}

export function create(el, props) {
  var width = 960,
      height = 500;

  var projection = d3.geoStereographic()
    .scale(400)
    .clipAngle(120)
    .translate([width/2, height/2]);

  var path = d3.geoPath()
    .projection(projection);

  var graticule = d3.geoGraticule();
  
  var lambda = d3.scaleLinear()
    .domain([0, width])
    .range([-180, 180]);
  
  var phi = d3.scaleLinear()
    .domain([0, height])
    .range([90, -90]);
  
  var radius = d3.scaleLinear()
    .domain([-1, 5])
    .range([8, 1]);
  
  var color = d3.scaleLinear()
    .domain([-0.2, 0.5, 1.6])
    .range(["#e6f0ff", "#ffffff", "fff5e6"])
    .clamp(true);     

  var svg = d3.select(el)
    .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

  svg.append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .style("fill", "black");      

  svg.append("path")
    .attr("class", "graticule")
    .datum(graticule())
    .style("fill", "none")
    .style("stroke", "white")
    .style("stroke-opacity", 0.2);

  svg.append("g")
    .attr("class", "stars")
    .style("fill", "white")
    .style("stroke", "black");  

  d3.csv(dataSrc, row).then(function(data) {
    function render() {
      svg.select(".graticule")
        .attr("d", path);
    
      var stars = svg.select(".stars").selectAll("circle")
        .data(data.map(d => {
          var p = projection([-d.ra, d.dec]);
          d[0] = p[0], d[1] = p[1];   
          return d;   
        }));
      
      stars.enter().append("circle")
        .attr("r", d => radius(d.magnitude))
        .style("fill", d => color(d.color))
        .attr("opacity", () => 0.5 * (1 + Math.random()))
      .merge(stars)
        .attr("cx", d => d[0])
        .attr("cy", d => d[1]);
    }

    render();

    var v0, r0, q0;
    var drag = d3.drag();
  
    drag.on("start", function() {
      v0 = versor.cartesian(projection.invert(d3.mouse(this)));
      r0 = projection.rotate();
      q0 = versor(r0);
    });
    
    drag.on("drag", function() {
      var v1 = versor.cartesian(projection.rotate(r0).invert(d3.mouse(this))),
          q1 = versor.multiply(q0, versor.delta(v0, v1)),
          r1 = versor.rotation(q1);
      projection.rotate(r1);
      render();
    });
  
    svg.call(drag);

    timers = [];

    svg.select(".stars").selectAll("circle")
      .each(function() {
        var circle = d3.select(this);
        var dt = 300 * (1 + Math.random());
        var timer = d3.interval(function() {
          circle.transition()
            .duration(dt)
            .attr("opacity", 0.5 * (1 + Math.random()));
        }, dt);
        timers.push(timer);
      });
  });

  function row(d) {
    d.ra = (+d.RAh + d.RAm/60 + d.RAs/3600) * (360/24);
    d.dec = (+d.DEd + d.DEm/60 + d.DEs/3600);
    d[0] = d.ra; d[1] = d.dec;
    d.magnitude = +d.Vmag;
    d.color = +d.BmV;
    return d;
  }
}

export function destroy() {
  if (typeof timers !== "undefined") {
    while (timers.length > 0) timers.pop().stop();
  }
}
