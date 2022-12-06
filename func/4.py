import math


prime = 2**255 - 19
A = 486662
B = 1

def inverse_mod(v, mod):
	return pow(v, mod - 2, mod)

def divide_mod(a, b, mod):
	return (a * inverse_mod(b, mod) % mod)

def get_y(x):
	d = (121665 * pow(121666, -1, prime)) % prime
		
	a = (1 + x**2) * pow((1 + d*(x**2) ), -1, prime)

	v = (prime-5)//8 % (prime-1)

	u = pow( 2*a,v, prime) 
	i = 2*a*u**2 % prime

	yp = a*u*(i-1) % prime
	yn = -yp % prime

	return (yp, yn)# finding y

# Without p1==p2 case
def add_points(p1, p2):
	x1, y1 = p1
	x2, y2 = p2
	slope = divide_mod(y2 - y1, x2 - x1, prime)

	x3 = (slope ** 2 - A - x1 - x2) % prime
	y3 = (slope * (x1 - x3) - y1) % prime
	
	return (x3, y3)

def double_point(p):
	x, y = p

	slope = divide_mod(3*x*x + 2*A*x + 1, 2*B*y, prime)
	dx = (slope ** 2 - A - 2*x) % prime
	dy = (slope * (x - dx) - y) % prime

	return (dx, dy)

# Seems correct!
def double_x(x):
	temp = divide_mod(
		(3*x*x + 2*A*x + 1) ** 2,
		4 * (x**3 + A*x**2 + x),
		prime
	) - A - 2*x
	return temp % prime

def triple_x(x):
	x1 = x
	x2 = double_x(x)

	temp = divide_mod(
		(x1 * x2 - 1) ** 2,
		x * (x2 - x1) ** 2,
		prime
	)
	return temp

def mul_point(p, n):
	pass

# Code suggested by ChatGPT (adapted and still incorrect)
def add_points_on_curve_25519(p1, p2):
	# p1 and p2 are tuples representing the x- and y-coordinates of the points
	x1, y1 = p1
	x2, y2 = p2

	# Compute the sum of the x-coordinates using modular arithmetic
	x_sum = (x1 + x2) % prime

	# Compute the sum of the y-coordinates using modular arithmetic
	y_sum = (y1 + y2) % prime

	# If the sum of the y-coordinates is 0, the result is the point at infinity
	if y_sum == 0:
		return (None, None)

	# Compute the slope of the line passing through the two points
	slope = divide_mod((3 * x1**2 + 486662) * y1 + y1, y2 - y1, prime)
	print(slope)
	
	# Compute the x-coordinate of the result using the slope and the x-coordinate sum
	x_result = (slope**2 - x1 - x2) % prime

	# Compute the y-coordinate of the result using the equation of the curve and the x-coordinate
	y_result = (slope * (x1 - x_result) - y1) % prime

	# Return the result as a tuple of the x- and y-coordinates
	return (x_result, y_result)





# ---------------------- Add test ----------------------
print('----- Add -----')

add_res = add_points(
	(56391866308239752110494101482511933051315484376135027248208522567059122930692,
	 17671033459111968710988296061676524036652749365424210951665329683594356030064),
	(39028180402644761518992797890514644768585183933988208227318855598921766377692,
	 17694324391104469229766971147677885172552105420452910290862122102896539285628)
)
add_correct = (7769460008531208039267550090770832052561793182665100660016059978850497673345, 50777594312607721283178588283812137388073334114015585272572035433724485979392)

print(add_res)
print(add_correct)
print('Add test: ' + ('Correct' if add_correct == add_res else 'Wrong'))





# ---------------------- Mul test ----------------------
print('----- Mul -----')

mul_test_x = 56391866308239752110494101482511933051315484376135027248208522567059122930692
mul_test_y = get_y(mul_test_x)[0]
print(mul_test_y)
mul_res = double_point(double_point(
	(mul_test_x, 9)
))
mul_correct = 41707806908216107150933211614905026312154955484464515789593741233629885877574

print(mul_res)
print(mul_correct)
print(double_x(double_x(mul_test_x))) # Correct




# ---------------------- Many multiplications test ----------------------
base_x = 9
base_point = (base_x, 14781619447589544791020593568409986887264606134616475288964881837755586237401)
cur = double_point(base_point)
ps = [None, base_point, cur]
for i in range(3, 8):
	cur = add_points(cur, base_point)
	ps += [cur]

for i, p in enumerate(ps):
	print(f'{i}: {p}')

print('----- Doubling -----')
print(double_x(base_x))
print(triple_x(base_x))
