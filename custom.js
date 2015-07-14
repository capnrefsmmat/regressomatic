"use strict";

function dataCallback(opts) {
    return function() {
        d3.select("#logx").property("checked", false);
        d3.select("#reg").property("xlogged", false);
        d3.select("#logy").property("checked", false);
        d3.select("#reg").property("ylogged", false);
        loadData(this.value, d3.select("#diagnostic").property("value"), opts);
    };
}

function diagnosticCallback(opts) {
    var reg = d3.select("#reg");
    return function() {
        plot(d3.selectAll("#reg circle").data(),
             d3.select("#diagnostic").property("value"), opts,
             reg.property("xlab"), reg.property("ylab"), true);
    };
}

// name is a filename in the data/ directory, without file extension.
// data files should have no headers. First column will be treated as
// x, second column as y.
function loadData(name, diagnostic, opts) {
    d3.text("data/" + name + ".csv", makePlotCallback(diagnostic, opts));
}

function makePlotCallback(diagnostic, opts) {
    return function(text) {
        var data = d3.csv.parseRows(text);

        var names = data.shift();

        var reg = d3.select("#reg");

        reg.property("xlab", names[0]);
        reg.property("ylab", names[1]);

        data = data.map(function(row) {
            return [+row[0], +row[1]];
        });

        plot(data, diagnostic, opts, names[0], names[1], true);
    };
}

// if reset is true, recalculate the x and y range
function plot(data, diagnostic, opts, xlab, ylab, reset) {
    reset = reset || false;

    var reg = d3.select("#reg");
    var resid = d3.select("#resid");

    if (d3.select("#logx").property("checked") && !reg.property("xlogged")) {
        data = data.map(function(row) {
            return [Math.log(row[0]), row[1]];
        });
        reg.property("xlogged", true);
    } else if (!d3.select("#logx").property("checked")
               && reg.property("xlogged")) {
        data = data.map(function(row) {
            return [Math.exp(row[0]), row[1]];
        });
        reg.property("xlogged", false);
    }
    if (d3.select("#logy").property("checked") && !reg.property("ylogged")) {
        data = data.map(function(row) {
            return [row[0], Math.log(row[1])];
        });
        reg.property("ylogged", true);
    } else if (!d3.select("#logy").property("checked")
               && reg.property("ylogged")) {
        data = data.map(function(row) {
            return [row[0], Math.exp(row[1])];
        });
        reg.property("ylogged", false);
    }

    if (reg.property("xlogged")) {
        xlab = "log(" + xlab + ")";
    }
    if (reg.property("ylogged")) {
        ylab = "log(" + ylab + ")";
    }
    var xrange, yrange;

    if (reset || reg.property("xrange") === undefined) {
        xrange = d3.extent(data, function(row) { return row[0]; });
        yrange = d3.extent(data, function(row) { return row[1]; });

        // Only allow log scale if all observations are positive
        if (yrange[0] <= 0 && !reg.property("ylogged")) {
            d3.select("#logy").property("disabled", true);
            d3.select("#logylab").attr("class", "disable");
        } else {
            d3.select("#logy").property("disabled", false);
            d3.select("#logylab").attr("class", "");
        }
        if (xrange[0] <= 0 && !reg.property("xlogged")) {
            d3.select("#logx").property("disabled", true);
            d3.select("#logxlab").attr("class", "disable");
        } else {
            d3.select("#logx").property("disabled", false);
            d3.select("#logxlab").attr("class", "");
        }

        var xwidth = xrange[1] - xrange[0];
        var ywidth = yrange[1] - yrange[0];

        xrange = [xrange[0] - 0.1*xwidth, xrange[1] + 0.1*xwidth];
        yrange = [yrange[1] + 0.1*ywidth, yrange[0] - 0.1*ywidth];

        reg.property("xrange", xrange);
        reg.property("yrange", yrange);
    } else {
        xrange = reg.property("xrange");
        yrange = reg.property("yrange");
    }

    d3.select("#dependent").text(ylab);
    d3.select("#independent").text(xlab);

    regressionPlots(reg, resid, data, opts, xrange, yrange, diagnostic,
                    xlab, ylab,
                   {r2: d3.select("#r2"),
                    fdf2: d3.select("#fdf2"), fstat: d3.select("#fstat"),
                    p: d3.select("#pval"), pdir: d3.select("#pdir"),
                    slope: d3.select("#slope"),
                    intercept: d3.select("#intercept")});
}
