import { mod } from "./Math";

function acos2(x, y, sign) {
  var cos = x / y;
  if ((cos > -1) && (cos < 1)) {
    var acos = Math.acos(cos);
    return sign >= 0 ? acos : 2 * Math.PI - acos;
  } else {
    return cos <= -1 ? Math.PI : 0;
  }
}

export function rv2oe(d, mu) {
  mu = typeof mu !== "undefined" ? mu : 1;

  var x = d.x,
      y = d.y,
      z = d.z,
      vx = d.vx,
      vy = d.vy,
      vz = d.vz;

  var r = Math.sqrt(x * x + y * y + z * z);

  var v2 = vx * vx + vy * vy + vz * vz;
  var vc2 = mu / r;
  var a = -mu / (v2 - 2 * vc2);

  var hx = (y * vz - z * vy),
      hy = (z * vx - x * vz),
      hz = (x * vy - y * vx),
      h = Math.sqrt(hx * hx + hy * hy + hz * hz);

  var dv2 = v2 - vc2;
  var vr = (x * vx + y * vy + z * vz) / r;
  var rvr = r * vr;

  var ex = (dv2 * x - rvr * vx) / mu,
      ey = (dv2 * y - rvr * vy) / mu,
      ez = (dv2 * z - rvr * vz) / mu,
      e = Math.sqrt(ex * ex + ey * ey + ez * ez);

  var inc = acos2(hz, h, 1);

  var nx = -hy,
      ny = hx,
      n = Math.sqrt(nx * nx + ny * ny);

  var Omega = acos2(nx, n, ny);

  var E = acos2(1 - r / a, e, vr);
  var M = E - e * Math.sin(E);

  if ((inc < 1.e-8) || (inc > Math.PI - 1.e-8)) {
    var pomega = acos2(ex, e, ey);
    if (inc < Math.PI / 2) {
      var omega = pomega - Omega;
    } else {
      var omega = Omega - pomega;
    }
  } else {
    var omega = acos2(nx * ex + ny * ey, n * e, ez);
  }

  return { a: a, e: e, inc: inc, Omega: Omega, omega: omega, M: M };
}

export function oe2rv(d, mu) {
  mu = typeof mu !== "undefined" ? mu : 1;

  var a = d.a,
      e = d.e,
      inc = d.inc,
      Omega = d.Omega,
      omega = d.omega,
      M = d.M;

  var f = M2f(e, M);

  var r = a * (1 - e * e) / (1 + e * Math.cos(f));
  var v0 = Math.sqrt(mu / a / (1. - e * e));

  var cO = Math.cos(Omega),
      sO = Math.sin(Omega),
      co = Math.cos(omega),
      so = Math.sin(omega),
      cf = Math.cos(f),
      sf = Math.sin(f),
      ci = Math.cos(inc),
      si = Math.sin(inc);

  var x = r * (cO * (co * cf - so * sf) - sO * (so * cf + co * sf) * ci),
      y = r * (sO * (co * cf - so * sf) + cO * (so * cf + co * sf) * ci),
      z = r * (so * cf + co * sf) * si;

  var vx = v0 * ((e + cf) * (-ci * co * sO - cO * so) - sf * (co * cO - ci * so * sO)),
      vy = v0 * ((e + cf) * (ci * co * cO - sO * so) - sf * (co * sO + ci * so * cO)),
      vz = v0 * ((e + cf) * co * si - sf * si * so);

  return { x: x, y: y, z: z, vx: vx, vy: vy, vz: vz };
}

export function meanMotion(d, mu) {
  mu = typeof mu !== "undefined" ? mu : 1;

  return d.a / Math.abs(d.a) * Math.sqrt(Math.abs(mu / (d.a * d.a * d.a)));
}

export function period(d, mu) {
  mu = typeof mu !== "undefined" ? mu : 1;

  return 2 * Math.PI / meanMotion(d, mu);
}

export function M2E(e, M, tol, maxiter) {
  tol = typeof tol !== "undefined" ? tol : 1.48e-8;
  maxiter = typeof maxiter !== "undefined" ? maxiter : 100;

  var E, F;

  if (e < 1) {
    E = e < 0.8 ? M : Math.sign(M) * Math.PI;
    F = E - e * Math.sin(E) - M;
    for (var i = 1; i <= maxiter; i++) {
      E = E - F / (1 - e * Math.cos(E));
      F = E - e * Math.sin(E) - M
      if (Math.abs(F) < tol) break;
    }
    E = mod(E + Math.PI, 2 * Math.PI) - Math.PI
  } else {
    E = Math.sign(M) * Math.log(2. * Math.abs(M) / e + 1.8);
    F = E - e * Math.sinh(E) - M;
    for (var i = 1; i <= maxiter; i++) {
      E = E - F / (1 - e * Math.cosh(E));
      F = E - e * Math.sinh(E) - M;
      if (Math.abs(F) < tol) break;
    }
  }

  return E;
}

export function M2f(e, M) {
  var E = M2E(e, M);

  if (e > 1) {
    return 2. * Math.atan(Math.sqrt((1 + e) / (e - 1)) * Math.tanh(E / 2));
  } else {
    return 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
  }
};
