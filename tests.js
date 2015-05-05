"use strict";

// Some example data.
var pts = [[30, 30],
           [200, 200],
           [37, 84],
           [83, 103],
           [142, 121],
           [421, 333],
           [321, 231],
           [382, 292],
           [401, 342]];

QUnit.test("Regression parameters", function(assert) {
    var r = regress(pts, 0, 100, false);
    assert.close(r.slope, 0.7034474, 0.0001, "Slope");

    assert.close(r.intercept, 35.2385151, 0.0001, "Intercept");
});

QUnit.test("Residuals", function(assert) {
    var resid = regress(pts, 0, 100, "residuals").resids;

    var tr = [-26.341936, 24.072009, 22.733932, 9.375352, -14.128043,
              1.610138, -30.045124, -11.955414, 24.679086];

    resid.forEach(function(r, i) { assert.close(r, tr[i], 0.0001); });
});

QUnit.test("Standardized residuals", function(assert) {
    var resid = regress(pts, 0, 100, "rstandard").resids;

    var rs = [-1.35870657, 1.10710724, 1.16188467, 0.45623499, -0.66111754,
              0.08336545, -1.41670947, -0.59103025, 1.24558785];

    resid.forEach(function(r, i) { assert.close(r, rs[i], 0.0001); });
});

QUnit.test("Studentized residuals", function(assert) {
    var resid = regress(pts, 0, 100, "rstudent").resids;

    var rs = [-1.46599541, 1.12853526, 1.19732900, 0.42881521, -0.63212888,
              0.07721975, -1.55302518, -0.56137388, 1.30710681];

    resid.forEach(function(r, i) { assert.close(r, rs[i], 0.0001); });
});

QUnit.test("Cook's distances", function(assert) {
    var resid = regress(pts, 0, 100, "cooks").resids;

    var cooks = [0.387248925, 0.078819617, 0.265738405, 0.027428980,
                 0.036797217, 0.001495353, 0.186983985, 0.053097688,
                 0.278641554];

    resid.forEach(function(r, i) { assert.close(r, cooks[i], 0.0001); });
});

QUnit.test("Leverage", function(assert) {
    var resid = regress(pts, 0, 100, "leverage").resids;

    var lev = [0.2955443, 0.1139567, 0.2824821, 0.2085788, 0.1441133,
               0.3008606, 0.1570612, 0.2331340, 0.2642690];

    resid.forEach(function(r, i) { assert.close(r, lev[i], 0.0001); });
});

QUnit.test("Probit function", function(assert) {
    assert.close(probit(0.5), 0, 0.001);
    assert.close(probit(0.7), 0.5244, 0.001);
    assert.close(probit(0.3), -0.5244, 0.001);
    assert.close(probit(0.99), 2.326, 0.001);
    assert.close(probit(0.01), -2.326, 0.001);
});

QUnit.test("Rankit function", function(assert) {
    assert.close(rankit(1, 9), -1.494, 0.001);
    assert.close(rankit(4, 9), -0.274, 0.001);
});

QUnit.test("Array ordering", function(assert) {
    var arr = [1, 4, -2, 3, 7];
    var out = [2, 0, 3, 1, 4];

    var len = arr.length;
    var o = order(arr);
    for (var i = 0; i < len; i++) {
        assert.equal(out[i], o[i]);
    }
});

QUnit.test("QQNorm for residuals", function(assert) {
    var resids = regress(pts, 0, 100, "rstandard").resids;
    var d = makeResidData(pts, resids, "qqnorm");

    var out = [-0.9319713, 0.5716375, 0.9319713, 0.2743915, -0.5716375,
               0.0, -1.4941549, -0.2743915, 1.4941549];

    d.forEach(function(r, i) { assert.close(r[0], out[i], 0.001); });
});

QUnit.test("R^2", function(assert) {
    var r2 = regress(pts, 0, 100, "rstandard").r2;

    assert.close(r2, 0.96437, 0.001);
});

QUnit.test("F distribution", function(assert) {
    assert.close(1 - fcdf(10, 1, 7), 0.0158778, 0.0001);
    assert.close(1 - fcdf(10, 4, 7), 0.005072761, 0.0001);
    assert.close(1 - fcdf(30, 1, 4), 0.005408479, 0.0001);
});

QUnit.test("F statistic", function(assert) {
    var r = regress(pts, 0, 100, "rstandard");

    assert.close(r.F, 189.4675, 0.0001);
    assert.close(r.Fp, 2.519807e-06, 1e-9);
});
