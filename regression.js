// regression and resid should be d3 selections of the elements which should get
// plots appended to them.
// diagnostic can be:
// - "residuals" for ordinary residuals
// - "rstandard" for standardized residuals
// - "cooks" for Cook's distances
// - "leverage" for leverage (diagonal of hat matrix)
function regressionPlots(regression, resid, data, opts, diagnostic) {    
    // Scales
    var xScale = d3.scale.linear()
                         .domain([0, 500])
                         .range([opts.padding, opts.width - opts.padding]);
    var yScale = d3.scale.linear()
                         .domain([400, 0])
                         .range([opts.padding, opts.height - opts.padding]);

    var xAxis = d3.svg.axis()
                      .scale(xScale)
                      .orient("bottom")
                      .ticks(5);
    var yAxis = d3.svg.axis()
                      .scale(yScale)
                      .orient("left")
                      .ticks(4);

    var minX = xScale.invert(opts.padding);
    var maxX = xScale.invert(opts.width - opts.padding);
    
    var svg = regression.append("svg")
                        .attr("width", opts.width)
                        .attr("height", opts.height);
    var rsvg = resid.append("svg")
                    .attr("width", opts.width)
                    .attr("height", opts.height);

    // Mouse behaviors
    var drag = d3.behavior.drag()
                          .origin(function(d) { return {x: xScale(d[0]),
                                                        y: yScale(d[1])}; })
                          .on("drag", dragmove);

    var dataHover = function(d, i) {
        d3.select(regression.selectAll("circle")[0][i])
          .transition()
          .attr("r", opts.hoverRadius)
          .attr("fill", opts.hoverColor);
        d3.select(resid.selectAll("circle")[0][i])
          .transition()
          .attr("r", opts.hoverRadius)
          .attr("fill", opts.hoverColor);
    };
    var dataHoverOut = function(d, i) {
        d3.select(regression.selectAll("circle")[0][i])
          .transition()
          .attr("r", opts.ptRadius)
          .attr("fill", opts.ptColor);
        d3.select(resid.selectAll("circle")[0][i])
          .transition()
          .attr("r", opts.ptRadius)
          .attr("fill", opts.ptColor);
    };
     
    function dragmove(d, i) {
        var mx = d3.event.x;
        var my = d3.event.y;

        d[0] = xScale.invert(mx);
        d[1] = yScale.invert(my);
       
        d3.select(this)
          .attr("cx", mx)
          .attr("cy", my);

        var pts = regression.selectAll("circle").data();        
        var r = regress(pts, minX, maxX, diagnostic);
       
        svg.select("line")
           .attr("x1", xScale(minX))
           .attr("x2", xScale(maxX))
           .attr("y1", yScale(r[2]))
           .attr("y2", yScale(r[3]));

        var residData = makeResidData(pts, r[4], diagnostic);

        rsvg.selectAll("circle")
            .data(residData)
            .attr("cx", function(d) { return rxScale(d[0]); })
            .attr("cy", function(d) { return ryScale(d[1]); });
    }

    // Draw data
    var r = regress(data, xScale.invert(opts.padding),
                    xScale.invert(opts.width - opts.padding), diagnostic);
    
    svg.append("line")
       .attr("x1", xScale(minX))
       .attr("x2", xScale(maxX))
       .attr("y1", yScale(r[2]))
       .attr("y2", yScale(r[3]))
       .attr("class", "rline");
     
    svg.append("g")
       .attr("id", "data")
       .selectAll("circle")
       .data(data)
       .enter()
       .append("circle")
       .attr("r", opts.ptRadius)
       .attr("cx", function(d) { return xScale(d[0]); })
       .attr("cy", function(d) { return yScale(d[1]); })
       .attr("fill", opts.ptColor)
       .attr("class", "datapt")
       .on("mouseover", dataHover)
       .on("mouseout", dataHoverOut)
       .call(drag);

    svg.append("g")
       .attr("class", "axis")
       .attr("transform", "translate(0, " + (opts.height - opts.padding + 5) + ")")
       .call(xAxis);
    svg.append("g")
       .attr("class", "axis")
       .attr("transform", "translate(" + opts.padding + ", 0)")
       .call(yAxis);

    // Now for residuals!
    var residRange = 1.5 * d3.max(r[4].map(Math.abs));
    if (diagnostic === "cooks" || diagnostic === "leverage") {
        var ryScale = d3.scale.linear()
                              .domain([residRange, 0])
                              .range([opts.padding, opts.height - opts.padding])
                              .nice();
        var rxScale = xScale;
    } else if (diagnostic === "rstandard" || diagnostic === "residuals") {
        var ryScale = d3.scale.linear()
                              .domain([residRange, -residRange])
                              .range([opts.padding, opts.height - opts.padding])
                              .nice();
        var rxScale = xScale;
    } else if (diagnostic === "qqnorm") {
        var ryScale = d3.scale.linear()
                              .domain([3, -3])
                              .range([opts.padding, opts.height - opts.padding])
                              .nice();
        var rxScale = d3.scale.linear()
                              .domain([-3, 3])
                              .range([opts.padding, opts.width - opts.padding])
                              .nice();
    }

    var rxAxis = d3.svg.axis()
                   .scale(rxScale)
                   .orient("bottom")
                   .ticks(4);

    var ryAxis = d3.svg.axis()
                       .scale(ryScale)
                       .orient("left")
                       .ticks(4);

    rsvg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (opts.height - opts.padding + 5) + ")")
        .call(rxAxis);

    rsvg.append("g")
        .attr("class", "axis ry")
        .attr("transform", "translate(" + opts.padding + ", 0)")
        .call(ryAxis);

    // Horizontal line at y = 0. Not needed for Cook's distance, Q-Q,
    // and leverage
    if (diagnostic !== "cooks" && diagnostic !== "leverage" &&
        diagnostic !== "qqnorm") {
        rsvg.append("line")
            .attr("x1", rxScale(minX))
            .attr("x2", rxScale(maxX))
            .attr("y1", ryScale(0))
            .attr("y2", ryScale(0))
            .attr("class", "rline");
    }
    if (diagnostic === "qqnorm") {
        // Add a diagonal line at y = x.
        rsvg.append("line")
            .attr("x1", rxScale(-3))
            .attr("x2", rxScale(3))
            .attr("y1", ryScale(-3))
            .attr("y2", ryScale(3))
            .attr("class", "rline");
    }

    var residData = makeResidData(data, r[4], diagnostic);

    rsvg.append("g")
        .attr("id", "resids")
        .selectAll("circle")
        .data(residData)
        .enter()
        .append("circle")
        .attr("r", opts.ptRadius)
        .attr("cx", function(d) { return rxScale(d[0]); })
        .attr("cy", function(d) { return ryScale(d[1]); })
        .attr("fill", opts.ptColor)
        .attr("class", "datapt")
        .on("mouseover", dataHover)
        .on("mouseout", dataHoverOut);
}

// make a column Matrix of ones
function ones(n) {
    var elements = [];
    while (n--) { elements.push([1]); }
    return $M(elements);
}

// array.slice() doesn't do a deep copy, so we need this instead
// from http://stackoverflow.com/a/25100784
function deepClone(arr) {
    var len = arr.length;
    var newArr = new Array(len);
    for (var i = 0; i < len; i++) {
        if (Array.isArray(arr[i])) {
            newArr[i] = deepClone(arr[i]);
        } else {
            newArr[i] = arr[i];
        }
    }
    return newArr;
}

function regress(data, minX, maxX, diagnostics) {
    diagnostics = diagnostics || "residuals";
    
    var X = ones(data.length).augment($M(data).col(1));
    var Y = $M(data).minor(1, 2, data.length, 1);

    var S = X.transpose().multiply(X).inverse().multiply(X.transpose());

    var hat = X.multiply(S);
    var beta = S.multiply(Y);

    var intercept = beta.e(1, 1);
    var slope = beta.e(2, 1);

    var residuals = Matrix.I(data.length).subtract(hat).multiply(Y).col(1);

    if (diagnostics === "rstandard" || diagnostics === "qqnorm") {
        residuals = rstandard(residuals, hat);
    } else if (diagnostics === "cooks") {
        residuals = cooks(rstandard(residuals, hat), hat);
    } else if (diagnostics === "leverage") {
        residuals = leverage(hat);
    }
    
    return [slope, intercept, intercept + slope * minX,
            intercept + slope * maxX, residuals.elements];
}

// Estimate the residual variance. Argument should be a Vector.
function sigmahat(residuals) {
    return residuals.dot(residuals) / (residuals.dimensions() - 2);
}

// Standardize the residuals. Pass residuals as a Vector and the hat matrix.
function rstandard(residuals, hat) {
    var s2 = sigmahat(residuals);
    return residuals.map(function(r, i) { 
        return r / Math.sqrt(s2 * (1 - hat.e(i, i))); 
    });
}

// Calculate Cook's distance. Pass residuals as a Vector and the hat matrix.
function cooks(residuals, hat) {
    return residuals.map(function(r, i) {
        var hii = hat.e(i, i);
        return Math.pow(r, 2) * hii / (1 - hii) / 2;
    });
}

// Extract the leverage from the hat matrix, returning a Vector.
function leverage(hat) {
    return hat.diagonal();
}

// Sample from a standard normal distribution.
// Adapted from http://bl.ocks.org/mbostock/4349187
function stdnormal() {
    var x = 0, y = 0, rds, c;
    do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        rds = x * x + y * y;
    } while (rds == 0 || rds > 1);
    c = Math.sqrt(-2 * Math.log(rds) / rds); // Box-Muller transform
    return x * c; // throw away extra sample y * c
}

// Returns sampler for normal distribution with any mean and standard deviation
function normal(mean, deviation) {
    return function() {
        return mean + deviation * normal();
    };
}

// Complementary error function
// From Numerical Recipes in C 2e p221,
// as adapted in
// https://github.com/errcw/gaussian/blob/5cb185f0d7dd8a6ee6385260d032275c080792fe/lib/gaussian.js
function erfc(x) {
    var z = Math.abs(x);
    var t = 1 / (1 + z / 2);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 +
            t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
            t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
            t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
}

// Inverse complementary error function
// From Numerical Recipes 3e p265
// as adapted in
// https://github.com/errcw/gaussian/blob/5cb185f0d7dd8a6ee6385260d032275c080792fe/lib/gaussian.js
function ierfc(x) {
    if (x >= 2) { return -100; }
    if (x <= 0) { return 100; }

    var xx = (x < 1) ? x : 2 - x;
    var t = Math.sqrt(-2 * Math.log(xx / 2));
    var r = -0.70711 * ((2.30753 + t * 0.27061) /
                        (1 + t * (0.99229 + t * 0.04481)) - t);

    for (var j = 0; j < 2; j++) {
        var err = erfc(r) - xx;
        r += err / (1.12837916709551257 * Math.exp(-(r * r)) - r * err);
    }

    return (x < 1) ? r : -r;
}

// The standard normal inverse cdf.
function probit(x) {
    return - Math.sqrt(2) * ierfc(2 * x);
}

// For data from a standard normal distribution, this returns the expected value
// of the ith order statistic out of n. This follows R's ppoints().
// Note that i starts from 1, not 0.
function rankit(i, n) {
    if (n <= 10) {
        var a = 3/8;
    } else {
        var a = 1/2;
    }

    return probit((i - a) / (n + 1 - 2 * a));
}

// Return an array of indices that put arr into sorted order.
function order(arr) {
    var len = arr.length;
    return d3.range(len).sort(function(a, b) {
        return arr[a] - arr[b];
    });
}

// Produce the d3 data object for the residual plots.
function makeResidData(pts, resids, diagnostic) {
    if (diagnostic === "qqnorm") {
        var len = pts.length;
        var o = order(order(resids));
        var residData = o.map(function(d, i) {
            return [rankit(d + 1, len), resids[i]];
        });
    } else {
        var residData = pts.map(function(d, i) {
            return [d[0], resids[i]];
        });
    }
    return residData;
}
