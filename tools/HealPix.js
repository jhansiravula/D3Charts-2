import { range, min, max } from "d3-array";

var eps = 1e-6;

function assert(condition, message) {
  if (!condition) {
    message = message || "Assertion Error";
    if (typeof Error !== "undefined") {
      throw new Error(message);
    }
    throw message;
  }
}

function fix(x) {
  return (x >= 0) ? Math.floor(x) : Math.ceil(x);
}

function rsqrt(x) {
  return (x <= 0) ? 0 : Math.sqrt(x);
}

export function XY2ang(XY, nside, dx, dy) {
  var xy = XY2xy(XY, nside);
  var xyz = xy2xyz(xy, nside, dx, dy);
  return xyz2ang(xyz);
}

export function ang2XY(ang, nside) {
  var xyz = ang2xyz(ang);
  var xy = xyz2xy(xyz, nside);
  return xy2XY(xy, nside);
}

function XY2xy(XY, nside) {
  assert(nside > 0);
  assert(XY >= 0);
  assert(XY < (12 * nside * nside));

  var hp = fix(XY / (nside * nside)),
      hp_frac = XY % (nside * nside);

  assert(hp >= 0);
  assert(hp < 12);

  var x = fix(hp_frac / nside);

  assert(x >= 0);
  assert(x < nside);

  var y = hp_frac % nside;

  assert(y >= 0);
  assert(y < nside);

  return {
    hp: hp,
    x: x,
    y: y
  };
}

function xy2XY(xy, nside) {
  assert(nside > 0);
  assert(xy.hp >= 0);
  assert(xy.hp < 12);
  assert(xy.x >= 0);
  assert(xy.x < nside);
  assert(xy.y >= 0);
  assert(xy.y < nside);

  return (xy.hp * nside * nside) + (xy.x * nside) + xy.y;
}

function xy2xyz(xy, nside, dx, dy) {
  var equatorial = true,
      zfactor = 1;

  var z, phi;

  var hp = xy.hp,
      x = xy.x + dx,
      y = xy.y + dy;

  if (hp <= 3) {
    if ((x + y) > nside) {
      equatorial = false;
      zfactor = 1;
    }
  }

  if (hp >= 8) {
    if ((x + y) < nside) {
      equatorial = false;
      zfactor = -1;
    }
  }

  if (equatorial) {
    var zoff = 0,
        phioff = 0;

    x /= nside;
    y /= nside;

    if (hp <= 3) {
      phioff = 1;
    } else if (hp <= 7) {
      zoff = -1;
      hp -= 4;
    } else if (hp <= 11) {
      phioff = 1;
      zoff = -2;
      hp -= 8;
    } else {
      assert(false);
    }

    z = 2 / 3 * (x + y + zoff);
    phi = Math.PI / 4 * (x - y + phioff + 2 * hp);

  } else {
    var phi_t;

    if (zfactor == -1) {
      var tmp = x;
      x = y;
      y = tmp;
      x = nside - x;
      y = nside - y;
    }

    if (y == nside && x == nside) {
      phi_t = 0;
    } else {
      phi_t = Math.PI * (nside - y) / (2 * ((nside - x) + (nside - y)));
    }

    if (phi_t < Math.PI / 4) {
      z = 1 - Math.pow(Math.PI * (nside - x) / ((2 * phi_t - Math.PI) * nside), 2) / 3;
    } else {
      z = 1 - Math.pow(Math.PI * (nside - y) / (2 * phi_t * nside), 2) / 3;
    }
    z *= zfactor;

    assert(0 <= Math.abs(z) && Math.abs(z) <= 1);

    if (hp >= 8) {
      phi = Math.PI / 2 * (hp - 8) + phi_t;
    } else {
      phi = Math.PI / 2 * hp + phi_t;
    }
  }

  if (phi < 0) {
    phi += 2 * Math.PI;
  }

  var r = Math.sqrt(1 - z * z);

  return {
    x: r * Math.cos(phi),
    y: r * Math.sin(phi),
    z: z
  };
}

function xyz2xy(xyz, nside) {
  var hp, x, y, dx, dy;
  var xx, yy;

  assert(nside > 0);

  var phi = Math.atan2(xyz.y, xyz.x);

  if (phi < 0) {
    phi += 2 * Math.PI;
  }

  var phi_t = phi % (0.5 * Math.PI);

  assert(phi_t >= 0);

  if ((xyz.z >= 2 / 3) || (xyz.z <= -2 / 3)) {
    var north, zfactor;

    if (xyz.z >= 2 / 3) {
      north = true;
      zfactor = 1;
    } else {
      north = false;
      zfactor = -1;
    }

    var kx = rsqrt((1 - xyz.z * zfactor) * 3 * Math.pow(nside * (2 * phi_t - Math.PI) / Math.PI, 2)),
        ky = rsqrt((1 - xyz.z * zfactor) * 3 * Math.pow(nside * 2 * phi_t / Math.PI, 2));

    if (north) {
      xx = nside - kx;
      yy = nside - ky;
    } else {
      xx = ky;
      yy = kx;
    }

    x = Math.min(nside - 1, Math.floor(xx));
    y = Math.min(nside - 1, Math.floor(yy));

    assert(x >= 0);
    assert(x < nside);
    assert(y >= 0);
    assert(y < nside);

    dx = xx - x;
    dy = yy - y;

    var sector = (phi - phi_t) / (0.5 * Math.PI),
        offset = Math.round(sector);

    assert(Math.abs(sector - offset) < eps);

    offset = ((offset % 4) + 4) % 4;

    assert(offset >= 0);
    assert(offset <= 3);

    if (north) {
      hp = offset;
    } else {
      hp = 8 + offset;
    }

  } else {
    var zunits = (xyz.z + 2 / 3) / (4 / 3),
        phiunits = phi_t / (0.5 * Math.PI);

    var u1 = zunits + phiunits,
        u2 = zunits - phiunits + 1;

    assert(u1 >= 0);
    assert(u1 <= 2);
    assert(u2 >= 0);
    assert(u2 <= 2);

    xx = u1 * nside;
    yy = u2 * nside;

    var sector = (phi - phi_t) / (0.5 * Math.PI),
        offset = Math.round(sector);

    assert(Math.abs(sector - offset) < eps);

    offset = ((offset % 4) + 4) % 4;

    assert(offset >= 0);
    assert(offset <= 3);

    if (xx >= nside) {
      xx -= nside;
      if (yy >= nside) {
        yy -= nside;
        hp = offset;
      } else {
        hp = ((offset + 1) % 4) + 4;
      }
    } else {
      if (yy >= nside) {
        yy -= nside;
        hp = offset + 4;
      } else {
        hp = 8 + offset;
      }
    }

    assert(xx >= -eps);
    assert(xx < (nside + eps));
    assert(yy >= -eps);
    assert(yy < (nside + eps));

    x = Math.max(0, Math.min(nside - 1, Math.floor(xx)));
    y = Math.max(0, Math.min(nside - 1, Math.floor(yy)));

    assert(x >= 0);
    assert(x < nside);
    assert(y >= 0);
    assert(y < nside);

    dx = xx - x;
    dy = yy - y;
  }

  return {
    hp: hp,
    x: x,
    y: y,
    dx: dx,
    dy: dy
  };
}

function xyz2lon(xyz) {
  var lon = Math.atan2(xyz.y, xyz.x);

  if (lon < 0) {
    lon += 2 * Math.PI;
  }

  return lon;
}

function xyz2lat(xyz) {
  return Math.asin(xyz.z);
}

function xyz2ang(xyz) {
  return {
    lon: xyz2lon(xyz),
    lat: xyz2lat(xyz)
  };
}

function ang2x(ang) {
  return Math.cos(ang.lat) * Math.cos(ang.lon);
}

function ang2y(ang) {
  return Math.cos(ang.lat) * Math.sin(ang.lon);
}

function ang2z(ang) {
  return Math.sin(ang.lat);
}

function ang2xyz(ang) {
  return {
    x: ang2x(ang),
    y: ang2y(ang),
    z: ang2z(ang)
  };
}

export function boundary(XY, nside, n) {
  n = typeof n !== "undefined" ? n : 10;

  var edge = range(0, 1 + 1 / n, 1 / n);

  var outline = []
    .concat(edge.map(function(dy) { return XY2ang(XY, nside, 0, dy); }))
    .concat(edge.map(function(dx) { return XY2ang(XY, nside, dx, 1); }))
    .concat(edge.reverse().map(function(dy) { return XY2ang(XY, nside, 1, dy); }))
    .concat(edge.map(function(dx) { return XY2ang(XY, nside, dx, 0); }));

  outline.forEach(function(d) {
    if (d.lon == 0) d.lon += eps;
  });

  return outline;
}
