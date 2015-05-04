"use strict";

// regression and resid should be d3 selections of the elements which should get
// plots appended to them.
// diagnostic can be:
// - "residuals" for ordinary residuals
// - "rstandard" for standardized residuals
// - "rstudent" for Studentized residuals
// - "cooks" for Cook's distances
// - "leverage" for leverage (diagonal of hat matrix)
// - "qqnorm" for normal quantile-quantile plot of residuals
// stats is an object giving d3 selections of elements which should be filled
// with F test statistics, p values, and so on. Elements can be left null if
// the statistic need not be reported.
function regressionPlots(regression, resid, data, opts, xrange, yrange,
                         diagnostic, xlab, ylab, stats) {
    xlab = xlab || "";
    ylab = ylab || "";
    stats = stats || {};

    // Reset regression and resid in case they currently have any content.
    regression.text("");
    resid.text("");

    // Scales
    var xScale = d3.scale.linear()
                         .domain(xrange)
                         .range([opts.padding, opts.width - opts.padding]);
    var yScale = d3.scale.linear()
                         .domain(yrange)
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

        d[0] = boundBetween(xScale.invert(mx), xrange[0], xrange[1]);
        d[1] = boundBetween(yScale.invert(my), yrange[1], yrange[0]);

        d3.select(this)
          .attr("cx", xScale(d[0]))
          .attr("cy", yScale(d[1]));

        var pts = regression.selectAll("circle").data();
        var r = regress(pts, minX, maxX, diagnostic);
        setStats(r);

        svg.select("line")
           .attr("x1", xScale(minX))
           .attr("x2", xScale(maxX))
           .attr("y1", yScale(r.minY))
           .attr("y2", yScale(r.maxY));

        var residData = makeResidData(pts, r.resids, diagnostic);

        rsvg.selectAll("circle")
            .data(residData)
            .attr("cx", function(d) { return rxScale(d[0]); })
            .attr("cy", function(d) { return ryScale(d[1]); });
    }

    function setStats(r) {
        if (stats.r2 !== undefined) {
            stats.r2.text(r.r2.toPrecision(2));
        }
        if (stats.fstat !== undefined) {
            stats.fstat.text(r.F.toLocaleString("en-US",
                                                {maximumSignificantDigits: 4}));
        }
        if (stats.fdf2 !== undefined) {
            stats.fdf2.text(data.length - 2);
        }
        if (stats.p !== undefined && stats.pdir !== undefined) {
            if (r.Fp <= 0.001) {
                stats.p.text("0.001");
                stats.pdir.text("<");
            } else {
                stats.p.text(r.Fp.toPrecision(2));
                stats.pdir.text("=");
            }
        }
    }

    // Draw data
    var r = regress(data, xScale.invert(opts.padding),
                    xScale.invert(opts.width - opts.padding), diagnostic);
    setStats(r);

    svg.append("line")
       .attr("x1", xScale(minX))
       .attr("x2", xScale(maxX))
       .attr("y1", yScale(r.minY))
       .attr("y2", yScale(r.maxY))
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
       .attr("stroke", opts.ptBorderColor)
       .attr("stroke-width", "0.5px")
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

    // Add axes labels
    svg.append("text")
       .attr("class", "x label")
       .attr("text-anchor", "end")
       .attr("x", opts.width - opts.padding)
       .attr("y", opts.height - opts.padding)
       .text(xlab);

    svg.append("text")
       .attr("class", "y label")
       .attr("text-anchor", "end")
       .attr("y", opts.padding)
       .attr("x", -opts.padding)
       .attr("dy", "1em")
       .attr("transform", "rotate(-90)")
       .text(ylab);

    // Now for residuals!
    var ryScale, rxScale;
    var residRange = 1.5 * d3.max(r.resids, Math.abs);
    if (diagnostic === "cooks" || diagnostic === "leverage") {
        // Leverage is bounded between 0 and 1, and 1 is a common cutoff for
        // outlying points when using Cook's distance, so make sure the scale
        // includes [0,1].
        ryScale = d3.scale.linear()
                          .domain([Math.max(1, residRange), 0])
                          .range([opts.padding, opts.height - opts.padding])
                          .nice();
        rxScale = xScale;
    } else if (diagnostic === "rstandard" || diagnostic === "residuals" ||
               diagnostic === "rstudent") {
        ryScale = d3.scale.linear()
                          .domain([residRange, -residRange])
                          .range([opts.padding, opts.height - opts.padding])
                          .nice();
        rxScale = xScale;
    } else if (diagnostic === "qqnorm") {
        ryScale = d3.scale.linear()
                          .domain([3, -3])
                          .range([opts.padding, opts.height - opts.padding])
                          .nice();
        rxScale = d3.scale.linear()
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

    var residData = makeResidData(data, r.resids, diagnostic);

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
        .attr("stroke", opts.ptBorderColor)
        .attr("stroke-width", "0.5px")
        .attr("class", "datapt")
        .on("mouseover", dataHover)
        .on("mouseout", dataHoverOut);

    // Diagnostic axes labels
    var rxlab = xlab, rylab;
    if (diagnostic === "residuals") {
        rylab = "Residuals";
    } else if (diagnostic === "rstandard") {
        rylab = "Standardized residuals";
    } else if (diagnostic === "rstudent") {
        rylab = "Studentized residuals";
    } else if (diagnostic === "cooks") {
        rylab = "Cook's distance";
    } else if (diagnostic === "leverage") {
        rylab = "Leverage";
    } else if (diagnostic === "qqnorm") {
        rxlab = "Theoretical quantiles";
        rylab = "Sample quantiles";
    }

    rsvg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", opts.width - opts.padding)
        .attr("y", opts.height - opts.padding)
        .text(rxlab);

    rsvg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", opts.padding)
        .attr("x", -opts.padding)
        .attr("dy", "1em")
        .attr("transform", "rotate(-90)")
        .text(rylab);
}

function boundBetween(x, min, max) {
    return Math.max(min, Math.min(x, max));
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
    var sigma2 = sigmahat(residuals);

    var RSS = residuals.dot(residuals);
    var mean_Y = d3.mean(Y.col(1).elements);
    var SYY = d3.sum(Y.col(1).elements, function(yi) {
        return Math.pow(yi - mean_Y, 2);
    });
    var r2 = 1 - (RSS / SYY);

    var F = (SYY - RSS) / sigma2;
    var Fp = 1 - fcdf(F, 1, residuals.dimensions() - 2);

    if (diagnostics === "rstandard" || diagnostics === "qqnorm") {
        residuals = rstandard(residuals, hat, sigma2);
    } else if (diagnostics === "rstudent") {
        residuals = studentize(rstandard(residuals, hat, sigma2));
    } else if (diagnostics === "cooks") {
        residuals = cooks(rstandard(residuals, hat, sigma2), hat);
    } else if (diagnostics === "leverage") {
        residuals = leverage(hat);
    }

    return {slope: slope, intercept: intercept,
            minY: intercept + slope * minX,
            maxY: intercept + slope * maxX,
            resids: residuals.elements,
            r2: r2, F: F, Fp: Fp};
}

// Estimate the residual variance. Argument should be a Vector.
function sigmahat(residuals) {
    return residuals.dot(residuals) / (residuals.dimensions() - 2);
}

// Studentize residuals, following formula 9.4 of Applied Linear Regression
// argument is a Vector
function studentize(residuals) {
    var n = residuals.dimensions();
    var p = 2;

    return residuals.map(function(r) {
        return r * Math.sqrt((n - p - 1) / (n - p - Math.pow(r, 2)));
    });
}

// Standardize the residuals. Pass residuals as a Vector and the hat matrix.
function rstandard(residuals, hat, s2) {
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

// The standard normal inverse cdf.
function probit(x) {
    return - Math.sqrt(2) * erfcinv(2 * x);
}

// For data from a standard normal distribution, this returns the expected value
// of the ith order statistic out of n. This follows R's ppoints().
// Note that i starts from 1, not 0.
function rankit(i, n) {
    var a;
    if (n <= 10) {
        a = 3/8;
    } else {
        a = 1/2;
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
    var residData;
    if (diagnostic === "qqnorm") {
        var len = pts.length;
        var o = order(order(resids));
        residData = o.map(function(d, i) {
            return [rankit(d + 1, len), resids[i]];
        });
    } else {
        residData = pts.map(function(d, i) {
            return [d[0], resids[i]];
        });
    }
    return residData;
}
