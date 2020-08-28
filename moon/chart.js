const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-fetch"),
  require("d3-timer"),
  require("d3-drag"),
  require("d3-geo"));

import versor from "versor";

import dataSrc from "./data.csv";

export const id = "moon";
export const name = "Lunar Craters";
export const readme = "Shown on this moon globe are all large lunar craters (with diameters greater than 50 km).";
export const sources = [
  { url: "https://doi.org/10.1126/science.1195050", description: "Head+ 2010" },
  { url: "http://adsabs.harvard.edu/abs/2011LPI....42.1006K", description: "Kadish+ 2011" },
  { url: "http://www.planetary.brown.edu/html_pages/LOLAcraters.html", description: "LOLA Lunar Crater Data" },
  { url: "http://youtu.be/sNUNB6CMnE8", description: ["Rotating Moon from LRO", "(Youtube)"] }
];

var timer;

export function controls() {}

export function create(el, props) {
  var width = 960,
      height = 500;

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  var graticule = d3.geoGraticule();

  var projection = d3.geoOrthographic()
    .rotate([0, 0])
    .translate([width / 2, height / 2])
    .scale(200)
    .clipAngle(90);

  var path = d3.geoPath()
    .projection(projection);

  var circle = d3.geoCircle()
    .center(d => [d.Lon, d.Lat])
    .radius(d => d.Diam_km / 2 / 1737 * 180 / Math.PI)
    .precision(20);

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "#000000");

  svg.append("path")
    .datum(graticule.outline())
    .attr("fill", "#bdbdbd")
    .attr("d", path);

  svg.append("path")
    .datum(graticule())
    .attr("class", "geo-path")
    .attr("fill", "none")
    .attr("stroke", "#252525")
    .attr("stroke-width", 0.5)
    .attr("stroke-opacity", 0.2)
    .attr("d", path);

  d3.csv(dataSrc, row).then(function(craters) {
    svg.selectAll(".crater")
      .data(craters.map(d => circle(d)))
    .enter().append("path")
      .attr("class", "crater geo-path")
      .attr("fill", "#969696")
      .attr("stroke", "#737373")
      .attr("fill-opacity", 0.5)
      .attr("d", path);

    function render() {
      d3.selectAll(".geo-path")
        .attr("d", path);
    }

    function start() {
      return d3.interval(function() {
        var origin = projection.rotate();
        origin[0] += 0.1;
        projection.rotate(origin);
        render();
      }, 20);
    }

    timer = start();

    var v0, r0, q0;
    var drag = d3.drag();

    drag.on("start", function(event) {
      timer.stop();
      v0 = versor.cartesian(projection.invert(d3.pointer(event, this)));
      r0 = projection.rotate();
      q0 = versor(r0);
    });

    drag.on("drag", function(event) {
      var v1 = versor.cartesian(projection.rotate(r0).invert(d3.pointer(event, this))),
          q1 = versor.multiply(q0, versor.delta(v0, v1)),
          r1 = versor.rotation(q1);
      projection.rotate(r1);
      render();
    });

    drag.on("end", function() {
      timer = start();
    })

    svg.call(drag);
  });

  function row(d) {
    d.Lon = +d.Lon;
    d.Lat = +d.Lat;
    d.Diam_km = +d.Diam_km;
    if (d.Diam_km > 50)
      return d;
  }
}

export function destroy() {
  if (typeof timer !== "undefined") timer.stop();
}
