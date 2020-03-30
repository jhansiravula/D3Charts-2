// nested sampling routines based on nestle (https://github.com/kbarbary/nestle/)

import numeric from "numeric";
import { randomNormal } from "d3-random";
import { interval } from "d3-timer";
import { mod } from "./Math";

var Nest = {};

Nest.delay = 0; // slow down iteration (for visualization)

var SQRTEPS = Math.sqrt(Number.EPSILON),
    SAMPLERS = { single: SingleEllipsoidSampler };

Nest.sample = function(loglikelihood, prior_transform, ndim, npoints, method, update_interval, npdim, maxiter, maxcall, dlogz, decline_factor) {
  // loglikelihood: function returning log(likelihood)
  // prior_transform: function translating a unit cube to the parameter space according to the prior
  // ndim: numer of parameters accepted by the likelihood function
  // npoints: number of active points
  // method: method from SAMPLERS used to select new points
  // update_interval: only update the new point selector after this number of likelihood calls
  // npdim: numer of parameters accepted by the prior_transform function
  // maxiter: maximum number of iterations
  // maxcall: maximum number of likelihood evaluations
  // dlogz: iteration will stop when the estimated contribution of the remaining prior volume to the total evidence is small
  // decline_factor: iteration will stop when the weight of newly saved samples has been has been declining for a while

  if (typeof npdim === "undefined")
    npdim = ndim;

  if (typeof maxiter === "undefined")
    maxiter = 1e6;

  if (typeof maxcall === "undefined")
    maxcall = 1e9;

  if (typeof method === "undefined")
    method = "single";

  if (!(method in SAMPLERS))
    console.error("unknown method");

  if (npoints < 2 * ndim)
    console.warn("npoints < 2 * ndim");

  if ((typeof dlogz !== "undefined") && (typeof decline_factor !== "undefined"))
    console.error("cannot specify two separate stopping criteria: decline_factor and dlogz");

  else if ((typeof dlogz === "undefined") && (typeof decline_factor === "undefined"))
    dlogz = 0.5;

  if (typeof update_interval === "undefined") {
    update_interval = Math.max(1, Math.round(0.6 * npoints));
  } else {
    update_interval = Math.round(update_interval);
    if (update_interval < 1)
      console.error("update_interval must be >= 1")
  }

  // initialize active points and calculate likelihoods
  var active_u = numeric.random([npoints, npdim]), // position in unit cube
      active_v = numeric.empty([npoints, ndim]), // real parameters
      active_logl = numeric.empty([npoints]); // log(likelihood)

  for (var i = 0; i < npoints; i++) {
    active_v[i] = prior_transform(active_u[i])
    active_logl[i] = loglikelihood(active_v[i])
  }

  var sampler = new SAMPLERS[method](loglikelihood, prior_transform, active_u);

  // initialize values for nested sampling loop
  var saved_v = [],
      saved_logl = [],
      saved_logvol = [],
      saved_logwt = [];

  var h = 0, // information
      logz = -1e300, // log(evidence)
      logvol = Math.log(1 - Math.exp(-1 / npoints)); // first point removed will have volume 1-e^(1/n)

  var ncall = npoints; // number of calls we already made

  // initialize sampler
  sampler.update(1 / npoints);

  var result = {};

  // nested sampling loop
  var ndecl = 0;
  var logwt_old = -Infinity;
  var iter = 0;
  var since_update = 0;

  var iteration = $.Deferred();

  var timer = interval(function() {

    // worst object in collection and its weight
    var worst = numeric.arginf(active_logl),
        logwt = logvol + active_logl[worst];

    // update evidence Z and information h
    var logz_new = logaddexp(logz, logwt);
    h = (Math.exp(logwt - logz_new) * active_logl[worst] + Math.exp(logz - logz_new) * (h + logz) - logz_new);
    logz = logz_new;

    // add worst object to samples
    saved_v.push(active_v[worst]);
    saved_logwt.push(logwt);
    saved_logvol.push(logvol);
    saved_logl.push(active_logl[worst]);

    // the new likelihood constraint is that of the worst object
    var loglstar = active_logl[worst];

    var expected_vol = Math.exp(-iter / npoints),
        pointvol = expected_vol / npoints;

    // update the sampler based on the current active points
    if (since_update >= update_interval) {
      sampler.update(pointvol);
      since_update = 0;
    }

    // choose a new point from within the likelihood constraint
    var new_point = sampler.new_point(loglstar);

    // replace worst point with new point
    active_u[worst] = new_point.u;
    active_v[worst] = new_point.v;
    active_logl[worst] = new_point.logl;
    ncall += new_point.ncall;
    since_update += new_point.ncall;

    // shrink interval
    logvol -= 1 / npoints;

    result = {
      niter: iter,
      logz: logz,
      logzerr: Math.sqrt(h / npoints),
      active_points: active_v,
      samples: saved_v,
      weights: numeric.exp(numeric.sub(saved_logwt, logz))
    };

    iteration.notify(result);

    // stopping criterion 1: estimated fractional remaining evidence below some threshold
    if (typeof dlogz !== "undefined") {
      var logz_remain = Math.max.apply(null, active_logl) - iter / npoints;
      if (logaddexp(logz, logz_remain) - logz < dlogz)
        iteration.resolve(result);
    }

    // stopping criterion 2: logwt has been declining for a while
    if (typeof decline_factor !== "undefined") {
      ndecl = logwt < logwt_old ? ndecl + 1 : 0;
      logwt_old = logwt;
      if (ndecl < decline_factor * npoints)
        iteration.resolve(result);
    }

    // stopping criterion 3: exceeded maximum number of calls or iterations
    if (ncall >= maxcall) iteration.resolve(result);
    if (iter >= maxiter) iteration.resolve(result);

    iter += 1;
  }, Nest.delay);

  iteration
    .done(function(result) {
      timer.stop();

      // add remaining active points
      var logvol = -saved_v.length / npoints - Math.log(npoints);
      for (var i = 0; i < npoints; i++) {
        var logwt = logvol + active_logl[i];
        var logz_new = logaddexp(logz, logwt);
        h = (Math.exp(logwt - logz_new) * active_logl[i] + Math.exp(logz - logz_new) * (h + logz) - logz_new);
        logz = logz_new;
        saved_v.push(active_v[i]);
        saved_logwt.push(logwt);
        saved_logl.push(active_logl[i]);
        saved_logvol.push(logvol);
      }

      // h should always be nonnegative
      if (h < 0) {
        if (h > -SQRTEPS)
          h = 0;
        else
          console.error("negative h encountered");
      }

      result.niter = iter;
      result.ncall = ncall;
      result.logz = logz;
      result.logzerr = Math.sqrt(h / npoints);
      result.h = h;
      result.active_points = active_v;
      result.samples = saved_v;
      result.weights = numeric.exp(numeric.sub(saved_logwt, logz));
      result.logvol = saved_logvol;
      result.logl = saved_logl;

    })
    .fail(function() {
      timer.stop();
    });

  return iteration;
};

function SingleEllipsoidSampler(loglikelihood, prior_transform, points) {
  // bound active points in a single ellipsoid and sample randomly from within this ellipsoid

  this.loglikelihood = loglikelihood;
  this.prior_transform = prior_transform;
  this.points = points;

  this.enlarge = 1.2;
}

SingleEllipsoidSampler.prototype.update = function(pointvol) {
  // calculate the bounding ellipsoid

  this.ell = bounding_ellipsoid(this.points, pointvol);
  this.ell.scale_to_vol(this.ell.vol * this.enlarge);
};

SingleEllipsoidSampler.prototype.new_point = function(loglstar) {
  // draw a new point from within the likelihood constraint

  var ncall = 0;
  var logl = -Infinity
  while (logl < loglstar) {
    while (true) {
      var u = this.ell.sample();
      if (u.every(ui => ui > 0 && ui < 1))
        break;
    }
    var v = this.prior_transform(u);
    logl = this.loglikelihood(v);
    ncall += 1;
  }

  return { u: u, v: v, logl: logl, ncall: ncall };
};

function Ellipsoid(ctr, a) {
  // n-dimensional ellipsoid

  this.n = ctr.length;
  this.ctr = ctr; // center coordinates
  this.a = a; // inverse covariance matrix of points contained

  this.vol = vol_prefactor(this.n) / Math.sqrt(numeric.det(a));

  // calculate the principle axes
  var eigen = numeric.eig(a);
  this.axlens = numeric.div(1, numeric.sqrt(eigen.lambda.x));
  this.axes = numeric.dot(eigen.E.x, numeric.diag(this.axlens));
}

Ellipsoid.prototype.scale_to_vol = function(vol) {
  // rescale the ellipsoid to satisfy a target volume

  var f = Math.pow(vol / this.vol, 1. / this.n);
  this.a = numeric.mul(Math.pow(f, -2), this.a);
  this.axlens = numeric.mul(f, this.axlens);
  this.axes = numeric.mul(f, this.axes);
  this.vol = vol;
};

Ellipsoid.prototype.contains = function(x) {
  // check if a point is contained in the ellipsoid

  var delta = numeric.sub(x, this.ctr);
  return numeric.dot(numeric.dot(delta, this.a), delta) <= 1.0;
};

Ellipsoid.prototype.randoffset = function() {
  // randomly distributed offset from ellipsoid center

  return numeric.dot(this.axes, randsphere(this.n));
};

Ellipsoid.prototype.sample = function() {
  // draw a sample randomly distributed within the ellipsoid

  return numeric.add(this.ctr, this.randoffset())
};

function bounding_ellipsoid(x, pointvol) {
  // bounding ellipsoid for a set of points

  if (typeof pointvol === "undefined")
    pointvol = 0;

  var dims = numeric.dim(x),
      npoints = dims[0],
      ndim = dims[1];

  // special case of a single point
  if (npoints === 1) {
    var r = Math.pow(pointvol / vol_prefactor(ndim), 1 / ndim);
    return new Ellipsoid(x[0], numeric.mul(1 / Math.pow(r, 2), numeric.identity(ndim)));
  }

  // calculate covariance of the points
  var ctr = numeric.mean(x, 0);
  var delta = numeric.sub(x, ctr);
  var cov = covariance_matrix(delta);

  // rescale assuming the points are uniformly distributed within the ellipsoid
  cov = numeric.mul(cov, ndim + 2);

  // (ensure that the covariane matrix is nonsingular)

  // matrix defining the ellipsoid
  var a = numeric.inv(cov);

  // calculate expansion factor necessary to bound each point
  var fmax = -Infinity;
  for (var i = 0; i < npoints; i++) {
    var f = numeric.dot(delta[i], numeric.dot(a, delta[i]));
    fmax = Math.max(fmax, f);
  }

  // ensure that all points are definitely bounded
  if (fmax > 1 - SQRTEPS) a = numeric.mul((1 - SQRTEPS) / fmax, a);

  var ell = new Ellipsoid(ctr, a);

  // ensure a minimum volume
  var v = npoints * pointvol;
  if (ell.vol < v) ell.scale_to_vol(v);

  return ell;
}

function vol_prefactor(n) {
  // volume constant for an n-dimensional sphere

  if (mod(n, 2) == 0) {
    var f = 1;
    for (var i = 2; i <= n; i += 2)
      f *= (2 * Math.PI / i);
  } else {
    var f = 2;
    for (var i = 3; i <= n; i += 2)
      f *= (2 * Math.PI / i);
  }

  return f;
}

function randsphere(n) {
  // draw a random point within an n-dimensional unit sphere

  var z = numeric._random([n], 0, randomNormal());
  return numeric.mul(z, Math.pow(Math.random(), 1. / n) / Math.sqrt(numeric.sum(numeric.pow(z, 2))))
}

function covariance_matrix(x, ddof) {
  // estimate the covariance of a set of data points

  if (typeof ddof === "undefined")
    ddof = 1;

  var dims = numeric.dim(x);
  if (dims.length === 1)
    x = numeric.reshape(x, [dims[0], 1]); // need at least a 2-d array
  x = numeric.sub(x, numeric.mean(x, 0));

  return numeric.mul(1 / (dims[0] - ddof), numeric.dot(numeric.transpose(x), x))
}

function logaddexp(x, y) {
  // logarithm of the sum of exponentiations of the inputs

  if (x === y) {
    return x + Math.log(2);
  } else {
    var d = x - y;
    if (d > 0) {
      return x + Math.log1p(Math.exp(-d));
    } else if (d <= 0) {
      return y + Math.log1p(Math.exp(d));
    } else {
      return d;
    }
  }
}

Nest.resample_equal = function(samples, weights) {
  // resample the samples to have equal weight

  var n = weights.length;

  var positions = [],
      sum = 0,
      cumulative_sum = [];

  for (var i = 0; i < n; i++) {
    positions.push((Math.random() + i) / n);
    cumulative_sum.push(sum += weights[i]);
  }

  if (sum - 1 > SQRTEPS)
    console.error("weights do not sum to 1");

  var index = numeric.zeros([n]),
      i = 0,
      j = 0;

  while (i < n) {
    if (positions[i] < cumulative_sum[j]) {
      index[i] = j;
      i += 1;
    } else {
      j += 1;
    }
  }

  return index.map(k => samples[k])
};

export default Nest;
