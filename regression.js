// regression and resid should be d3 selections of the elements which should get
// plots appended to them.
// diagnostic can be:
// - "residuals" for ordinary residuals
// - "rstandard" for standardized residuals
// - "cooks" for Cook's distances
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

        var residData = pts.map(function(d, i) {
            return [d[0], r[4][i]];
        }); 

        rsvg.selectAll("circle")
            .data(residData)
            .attr("cx", function(d) { return xScale(d[0]); })
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
    rsvg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0, " + (opts.height - opts.padding + 5) + ")")
        .call(xAxis);

    if (diagnostic === "cooks") {
        var ryScale = d3.scale.linear()
                              .domain([1.2, 0])
                              .range([opts.padding, opts.height - opts.padding])
                              .nice();
    } else {
        var residRange = 1.5 * d3.max(r[4].map(Math.abs));
    
        var ryScale = d3.scale.linear()
                              .domain([residRange, -residRange])
                              .range([opts.padding, opts.height - opts.padding])
                              .nice();
    }
    var ryAxis = d3.svg.axis()
                       .scale(ryScale)
                       .orient("left")
                       .ticks(4);
    rsvg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + opts.padding + ", 0)")
        .call(ryAxis);

    // Horizontal line at y = 0. Not needed for Cook's distance plots
    if (diagnostic !== "cooks") {
        rsvg.append("line")
            .attr("x1", xScale(minX))
            .attr("x2", xScale(maxX))
            .attr("y1", ryScale(0))
            .attr("y2", ryScale(0))
            .attr("class", "rline");
    }
    var residData = data.map(function(d, i) {
        return [d[0], r[4][i]];
    });

    rsvg.append("g")
        .attr("id", "resids")
        .selectAll("circle")
        .data(residData)
        .enter()
        .append("circle")
        .attr("r", opts.ptRadius)
        .attr("cx", function(d) { return xScale(d[0]); })
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
    }
    else {
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

    if (diagnostics === "rstandard") {
        residuals = rstandard(residuals, hat);
    } else if (diagnostics === "cooks") {
        residuals = cooks(rstandard(residuals, hat), hat);
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

function cooks(residuals, hat) {
    return residuals.map(function(r, i) {
        var hii = hat.e(i, i);
        return Math.pow(r, 2) * hii / (1 - hii) / 2;
    });
}
