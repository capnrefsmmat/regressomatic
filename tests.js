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
    assert.close(r[0], 0.703, 0.1, "Slope");

    assert.close(r[1], 35.24, 0.1, "Intercept");
});

QUnit.test("Residuals", function(assert) {
    var resid = regress(pts, 0, 100, "residuals")[4];

    // Check just a few of the residuals
    assert.close(resid[0], -26.34, 0.1, "residual 0");
    assert.close(resid[4], -14.13, 0.1, "residual 4");
});

QUnit.test("Standardized residuals", function(assert) {
    var resid = regress(pts, 0, 100, "rstandard")[4];

    // Check just a few of the residuals
    assert.close(resid[0], -1.359, 0.01, "residual 0");
    assert.close(resid[4], -0.66, 0.01, "residual 4");
});

QUnit.test("Cook's distances", function(assert) {
    var resid = regress(pts, 0, 100, "cooks")[4];

    assert.close(resid[0], 0.387, 0.01, "Cook's distance 0");
    assert.close(resid[4], 0.037, 0.01, "Cook's distance 4");
});

QUnit.test("Leverage", function(assert) {
    var resid = regress(pts, 0, 100, "leverage")[4];

    assert.close(resid[0], 0.296, 0.01, "Leverage 0");
    assert.close(resid[4], 0.144, 0.01, "Leverage 4");
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
