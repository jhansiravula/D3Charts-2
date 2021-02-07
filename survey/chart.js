const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-scale"),
  require("d3-axis"));

export const id = "survey";

export const name = "Likert Scale";
export const readme = "This chart demonstrates the visualization of survey results on a Likert scale using diverging stacked bar charts.";
export const sources = [
  { url: "https://en.wikipedia.org/wiki/Likert_scale", description: ["Likert Scale", "(Wikipedia)"] }
];

export function controls() {}

export function create(el, props) {
  var margin = { top: 50, right: 25, bottom: 25, left: 25 };
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  var color = ["#e66101", "#fdb863", "#f7f7f7", "#b2abd2", "#5e3c99"],
      label = ["strongly disagree", "disagree", "neutral", "agree", "strongly agree"];

  var data = [[0,1,8,15,12],[0,4,12,14,6],[0,5,1,13,17],[1,8,8,15,4],[0,28,5,3,0]]
    .map(function(d) {
      var N = d3.sum(d);
      var x0 = -(d[0] + d[1] + d[2]/2)/N;
      return d.map(n => ({ x0: x0, x1: x0 += n/N }));
    });

  var x = d3.scaleLinear()
    .domain([-1 , 1])
    .range([0, width]);

  var y = d3.scaleBand()
    .domain(d3.range(0, data.length))
    .range([0, height])
    .paddingInner(0.2)
    .paddingOuter(0.2);

  var item = svg.selectAll(".item")
    .data(data)
    .join("g")
      .attr("class", "item")
      .attr("transform", (d, i) => `translate(0,${y(i)})`);

  item.selectAll("rect")
    .data(d => d)
    .join("rect")
      .attr("x", d => x(d.x0))
      .attr("width", d => x(d.x1) - x(d.x0))
      .attr("height", y.bandwidth())
      .style("fill", (d, i) => color[i]);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom().scale(x).ticks(5).tickFormat(d => `${100 * Math.abs(d)}%`));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${width/2},0)`)
    .call(d3.axisLeft().scale(y));

  svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(0,${-margin.top})`)
    .call(legend);

  function legend(selection) {
    var x = d3.scaleBand()
      .domain(d3.range(5))
      .range([0, width]);

    var item = selection.selectAll("g")
      .data(x.domain())
      .join("g")
        .attr("transform", (d, i) => `translate(${x(i)},0)`);

    item.append("rect")
      .attr("width", 20)
      .attr("height", 20)
      .style("fill", i => color[i]);

    item.append("text")
      .attr("alignment-baseline", "middle")
      .attr("x", 20)
      .attr("y", 10)
      .attr("dx", 5)
      .text(i => label[i]);
  }
}

export function destroy() {}
