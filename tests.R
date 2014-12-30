data <- data.frame(x=c(30, 200, 37, 83, 142, 421, 321, 382, 401),
                   y=c(30, 200, 84, 103, 121, 333, 231, 292, 342))

m <- lm(y ~ x, data=data)

coef(m)

resid(m)[c(1,5)]

rstandard(m)[c(1,5)]

cooks.distance(m)[c(1,5)]

lm.influence(m)$hat[c(1,5)]

# Probit function
qnorm(0.5)
qnorm(0.7)
qnorm(0.99)

# Rankit function
qnorm(ppoints(9)[1])
qnorm(ppoints(9)[4])

# makeResidData for qqnorm
qqnorm(rstandard(m), plot.it=FALSE)$x
