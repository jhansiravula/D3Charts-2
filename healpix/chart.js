const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-scale"),
  require("d3-random"),
  require("d3-fetch"),
  require("d3-collection"),
  require("d3-timer"),
  require("d3-geo"),
  require("d3-geo-projection"));

import * as HealPix from "../tools/HealPix";

import dataSrc from "./data.csv";

export const id = "healpix";
export const name = "HealPix";
export const readme = "Example of a HealPix grid, mapped using different projections.";
export const sources = [
  { url: "http://tdc-www.harvard.edu/catalogs/bsc5.html", description: "Yale Bright Star Catalog" },
  { url: "https://github.com/healpy/healpy", description: "Healpy" }
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

  svg.append("path")
    .datum(d3.geoGraticule().outline)
    .attr("class", "graticule")
    .style("stroke", "black")
    .style("stroke-width", 3);

  var deg2rad = x => x * Math.PI / 180,
      rad2deg = x => x * 180 / Math.PI;

  var options = [
    { name: "Aitoff", projection: d3.geoAitoff() },
    { name: "Baker", projection: d3.geoBaker() },
    { name: "Boggs", projection: d3.geoBoggs() },
    { name: "Bottomley", projection: d3.geoBottomley() },
    { name: "Craster", projection: d3.geoCraster() },
    { name: "CylindricalEqualArea", projection: d3.geoCylindricalEqualArea() },
    { name: "Eckert1", projection: d3.geoEckert1() },
    { name: "Eckert3", projection: d3.geoEckert3() },
    { name: "Eisenlohr", projection: d3.geoEisenlohr() },
    { name: "Foucaut", projection: d3.geoFoucaut() },
    { name: "Gilbert", projection: d3.geoGilbert() },
    { name: "Ginzburg9", projection: d3.geoGinzburg9() },
    { name: "Gringorten", projection: d3.geoGringorten() },
    { name: "Hammer", projection: d3.geoHammer() },
    { name: "Lagrange", projection: d3.geoLagrange() },
    { name: "Mollweide", projection: d3.geoMollweide() },
    { name: "NaturalEarth1", projection: d3.geoNaturalEarth1() },
    { name: "Nicolosi", projection: d3.geoNicolosi() }
  ].reverse();

  function getProjection() {
    var option = options.pop();
    options.unshift(option);
    //console.log(option.name);
    return option.projection;
  }

  d3.csv(dataSrc, row).then(function(stars) {
    var nside = 6;

    var counts = {};
    stars.forEach(star => {
      var XY = HealPix.ang2XY(star, nside);
      counts[XY] = (counts[XY] || 0) + 1;
    });

    var features = d3.entries(counts).map(d => {
      var XY = +d.key;
      var boundary = HealPix.boundary(XY, nside, 3);
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: boundary.map(ang => {
            var lon = rad2deg(ang.lon),
                lat = rad2deg(ang.lat);
            return [180 - lon, lat];
          })
        },
        properties: {
          "XY": XY,
          "value": d.value
        }
      };
    });

    var extent = d3.extent(features, d => d.properties.value),
        color = d3.scaleLinear().domain(extent).range(["#fff", "#1f77b4"]);

    var projection = getProjection();

    svg.selectAll(".graticule")
      .style("fill", color(extent[0]))
      .attr("d", d3.geoPath(projection));

    svg.selectAll(".healpix")
      .data(features, d => d.properties.XY)
    .enter().append("path")
      .attr("d", d3.geoPath(projection))
      .style("stroke", "gray")
      .style("fill", d => color(d.properties.value));

    var dt = 2000;
    timer = d3.interval(function() {
      svg.transition()
        .duration(dt)
        .each(function() {
          d3.select(this).selectAll("path")
            .attr("stroke-opacity", 1)
            .transition()
            .delay(2 / 6 * dt)
            .duration(1 / 6 * dt)
            .attr("stroke-opacity", 0)
            .transition()
            .duration(2 / 6 * dt)
            .attrTween("d", projectionTween(projection, projection = getProjection()))
            .transition()
            .duration(1 / 6 * dt)
            .attr("stroke-opacity", 1)
            .transition();
        });
    }, dt);
  });

  function row(d) {
    d.lon = deg2rad(+d.glon);
    d.lat = deg2rad(+d.glat);
    return d;
  }

  function projectionTween(projection0, projection1) {
    return function(d) {
      var t = 0;

      var projection = d3.geoProjection(project)
        .scale(1)
        .translate([width / 2, height / 2]);

      var path = d3.geoPath(projection);

      function project(lon, lat) {
        lon = rad2deg(lon), lat = rad2deg(lat);
        var p0 = projection0([lon, lat]),
            p1 = projection1([lon, lat]);
        return [(1 - t) * p0[0] + t * p1[0], (1 - t) * -p0[1] + t * -p1[1]];
      }

      return function(_) {
        t = _;
        return path(d);
      };
    };
  }
}

export function destroy() {
  if (typeof timer !== "undefined") timer.stop();
}
