const d3 = Object.assign({},
  require("d3-selection"),
  require("d3-array"),
  require("d3-timer"),
  require("d3-scale"));

export const id = "nbody";
export const name = "N-Body Simulation";
export const readme = "This animation shows the progress of a direct n-body simulation of 100 particles, which are set up to move around a massive central object.";
export const sources= [
  { url: "https://github.com/hannorein/rebound", description: "rebound (H. Rein)" }
];

var simulationTimer;
var renderTimer;

export function controls() {}

export function create(el, props) {
  var margin = { top: 20, right: 10, bottom: 20, left: 10 };
  var width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var svg = d3.select(el).append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  var box = 10;

  // constants

  var m_unit = 5.97219e+27,
      l_unit = 14959787070000,
      t_unit = 31556926;

  var G = 6.672e-8 * m_unit * t_unit * t_unit / l_unit / l_unit / l_unit;

  // set up simulation

  var dt0 = 0.05, softening = 0.01;

  var t = 0, dt = dt0, particles = [];

  function Particle(x,y,z,vx,vy,vz,ax,ay,az,m) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ax = ax;
    this.ay = ay;
    this.m = m;
  }

  function calculate_gravity() {

    for (var i = 0; i < particles.length; i++) {
      particles[i].ax = 0;
      particles[i].ay = 0;
    }

    for (var i = 0; i < particles.length; i++) {
      for (var j = 0; j < particles.length; j++) {
        if (i == j) continue;

        var dx = particles[i].x - particles[j].x,
            dy = particles[i].y - particles[j].y;

        var r = Math.sqrt(dx*dx + dy*dy + softening*softening);
        var acc = -G * particles[j].m / (r*r*r);

        particles[i].ax += acc * dx;
        particles[i].ay += acc * dy;
      }
    }
  }

  function integrator_part1() {
      for (var i = 0; i < particles.length; i++) {
        particles[i].x += 0.5 * dt * particles[i].vx;
        particles[i].y += 0.5 * dt * particles[i].vy;
      }
      t += dt / 2.;
  }

  function integrator_part2() {
      for (var i = 0; i < particles.length; i++) {
        particles[i].vx += dt * particles[i].ax;
        particles[i].vy += dt * particles[i].ay;
        particles[i].x  += 0.5 * dt * particles[i].vx;
        particles[i].y  += 0.5 * dt * particles[i].vy;
      }
      t += dt / 2.;
  }

  // initial conditions

  function uniform(min, max) {
    return Math.random() * (max - min) + min;
  }

  function powerlaw(min, max, slope) {
    var y = uniform(0, 1);
    return Math.pow((Math.pow(max, slope + 1) - Math.pow(min, slope + 1)) * y + Math.pow(min, slope + 1), 1 / (slope + 1));
  }

  var star = new Particle();
  star.x  = 0; star.y = 0;   star.z = 0;
  star.vx = 0; star.vy = 0; star.vz = 0;
  star.ax = 0; star.ay = 0; star.az = 0;
  star.m  = 1;
  particles.push(star);

  var disc_particles = 100,
      disc_mass = 0.2;

  while (particles.length < disc_particles) {
    var r = powerlaw(box / 15, box / 2, -1.5);
    var phi = uniform(0, 2*Math.PI);

    var p = new Particle();
    p.x = r * Math.cos(phi);
    p.y = r * Math.sin(phi);

    var mu = star.m + disc_mass * (Math.pow(r, -3/2) - Math.pow(box/10, -3/2)) / (Math.pow(box/2/1.2, -3/2) - Math.pow(box/10, -3/2));
    var vk = Math.sqrt(G*mu/r);

    p.vx =  vk * Math.sin(phi);
    p.vy = -vk * Math.cos(phi);

    p.ax = 0;
    p.ay = 0;

    p.m  = disc_mass / disc_particles;

    particles.push(p);
  }

  // redraw particles

  var x = d3.scaleLinear()
    .domain([-box / 2, box / 2])
    .range([0, width]);

  var y = d3.scaleLinear()
    .domain([-box / 2 * height / width, box / 2 * height / width])
    .range([0, height]);

  var color = d3.scaleOrdinal()
    .domain([0, 1])
    .range(["#969696", "black"]);

  function render() {
    svg.selectAll("circle")
      .data(particles)
      .join("circle")
        .style("fill", d => color(d.m))
        .attr("cx", d => x(d.x))
        .attr("cy", d => y(d.y))
        .attr("r", 3);
  }

  // advance simulation

  function tick() {
    integrator_part1();
    calculate_gravity();
    integrator_part2();
  }

  // start animation

  simulationTimer = d3.interval(tick, dt);
  renderTimer = d3.interval(render, 50);
}

export function destroy() {
  if (typeof simulationTimer !== "undefined") simulationTimer.stop();
  if (typeof renderTimer !== "undefined") renderTimer.stop();
}
