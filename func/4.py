import math


prime = 2**255 - 19
A = 486662
B = 1

def inverse_mod(v, mod):
	return pow(v, -1, mod)

def divide_mod(a, b, mod):
	return (a * inverse_mod(b, mod) % mod)

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

def add_neighbour_xs(x1, x2, base_x):
	return divide_mod(
		(x1 * x2 - 1) ** 2,
		base_x * (x2 - x1) ** 2,
		prime
	)

def triple_x(x):
	return add_neighbour_xs(x, double_x(x), x)

def mul_x(x, n):
	vi0 = x
	vi1 = double_x(x)
	process = False
	for bi in range(255, -1, -1):
		bit = n & (1 << bi)
		if not process:
			if bit:
				process = True
			continue
		low = double_x(vi0)
		mid = add_neighbour_xs(vi0, vi1, x)
		high = double_x(vi1)

		if bit:
			vi0, vi1 = mid, high
		else:
			vi0, vi1 = low, mid
	
	return vi0




# ---------------------- Add test ----------------------
print('----- Add -----')

add_res = add_points(
	(56391866308239752110494101482511933051315484376135027248208522567059122930692,
	 17671033459111968710988296061676524036652749365424210951665329683594356030064),
	(39028180402644761518992797890514644768585183933988208227318855598921766377692,
	 17694324391104469229766971147677885172552105420452910290862122102896539285628)
)
add_correct = (
	7769460008531208039267550090770832052561793182665100660016059978850497673345,
	50777594312607721283178588283812137388073334114015585272572035433724485979392
)

print(add_res)
print(add_correct)
print('Add test: ' + ('Correct' if add_correct == add_res else 'Wrong'))




# ---------------------- Provided multiplication test ----------------------
print('----- Mul -----')

mul_test_x = 56391866308239752110494101482511933051315484376135027248208522567059122930692
mul_correct = 41707806908216107150933211614905026312154955484464515789593741233629885877574

double_double_x = double_x(double_x(mul_test_x))
if double_double_x != mul_correct:
	raise f"Double double result doesn't match the expected"

multiplied_x = mul_x(mul_test_x, 4)
if multiplied_x != mul_correct:
	raise f"Multiplication result doesn't match the expected"

print('Provided task test passed')




# ---------------------- Mass multiplications test ----------------------
base_x = 9
base_point = (base_x, 14781619447589544791020593568409986887264606134616475288964881837755586237401)
cur = double_point(base_point)
ps_seq = [None, base_point, cur]

mul_test_max = 1000
for i in range(3, mul_test_max + 1):
	cur = add_points(cur, base_point)
	ps_seq += [cur]

mul_test_show = 7

print('----- Sequential addition -----')
for i in range(1, mul_test_show):
	print(f'{i}: seq={ps_seq[i][0]} mul={mul_x(base_x, i)}')

mul_correct = True
for i in range(1, mul_test_max + 1):
	if ps_seq[i][0] != mul_x(base_x, i):
		mul_correct = False
		raise f'Multiplication tests failed at factor={i}'
if mul_correct:
	print(f'All multiplication tests passed up to factor={mul_test_max}')



print('----- Specific -----')
print(double_x(base_x))
print(triple_x(base_x))




# ---------------------- Separator ----------------------
print()
