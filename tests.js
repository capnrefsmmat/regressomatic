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

QUnit.test("regression parameters", function(assert) {
    var r = regress(pts, 0, 100, false);
    assert.close(r[0], 0.703, 0.1, "Slope");
    
    assert.close(r[1], 35.24, 0.1, "Intercept");
});

QUnit.test("residuals", function(assert) {
    var resid = regress(pts, 0, 100, false)[4];
    
    // Check just a few of the residuals
    assert.close(resid[0], -26.34, 0.1, "residual 0");
    assert.close(resid[4], -14.13, 0.1, "residual 4");
});

QUnit.test("standardized residuals", function(assert) {
    var resid = regress(pts, 0, 100, true)[4];
    
    // Check just a few of the residuals
    assert.close(resid[0], -1.359, 0.01, "residual 0");
    assert.close(resid[4], -0.66, 0.01, "residual 4");
});