function regress(data, minX, maxX, standardize) {
    if (typeof(standardize) === "undefined") { 
        standardize = false; 
    }
    
    var X = $M(data).minor(1, 1, data.length, 1);
    var Y = $M(data).minor(1, 2, data.length, 1);
    
    var S = X.transpose().multiply(X).inverse().multiply(X.transpose());
    
    var hat = X.multiply(S);
    var beta = S.multiply(Y);
    
    var intercept = beta.e(2, 1);
    var slope = beta.e(1, 1);
    
    var residuals = Matrix.I(data.length).subtract(hat).multiply(Y).col(1);
   
    if (standardize) {
        residuals = rstandard(residuals, hat);
    }
    
    return [minX, maxX, intercept + slope * minX,
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
        return r / Math.sqrt(s2 * (1 - hat.e(i + 1, i + 1))); 
    });
}
