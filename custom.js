"use strict";

function dataCallback(opts) {
    return function() {
        loadData(this.value, d3.select("#diagnostic").property("value"), opts);
    };
}

function diagnosticCallback(opts) {
    return function() {
        plot(d3.selectAll("#reg circle").data(),
             d3.select("#diagnostic").property("value"), opts);
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
        var data = d3.csv.parseRows(text, function(row) {
            return [+row[0], +row[1]];
        });
        plot(data, diagnostic, opts, true);
    };
}

// if reset is true, recalculate the x and y range
function plot(data, diagnostic, opts, reset) {
    reset = reset || false;

    var reg = d3.select("#reg");
    var resid = d3.select("#resid");

    var xrange, yrange;

    if (reset || reg.property("xrange") === undefined) {
        var xmin = d3.min(data, function(row) { return row[0]; });
        var xmax = d3.max(data, function(row) { return row[0]; });

        var ymin = d3.min(data, function(row) { return row[1]; });
        var ymax = d3.max(data, function(row) { return row[1]; });

        var xwidth = xmax - xmin;
        var ywidth = ymax - ymin;

        xrange = [xmin - 0.1*xwidth, xmax + 0.1*xwidth];
        yrange = [ymax + 0.1*ywidth, ymin - 0.1*ywidth];

        reg.property("xrange", xrange);
        reg.property("yrange", yrange);
    } else {
        xrange = reg.property("xrange");
        yrange = reg.property("yrange");
    }

    regressionPlots(d3.select("#reg"), d3.select("#resid"), data, opts,
                    xrange, yrange, diagnostic, "X", "Y",
                   {r2: d3.select("#r2"),
                    fdf2: d3.select("#fdf2"), fstat: d3.select("#fstat"),
                    p: d3.select("#pval"), pdir: d3.select("#pdir")});
}
