# Code from https://asecuritysite.com/ecc/curve25519p ???
# I don't remember. Seems similar, but not exact

P = 2 ** 255 - 19
A24 = 121665
def bytes_to_int(bytes):
    result = 0
    
    for b in bytes:
        result = result * 256 + int(b)
    
    return result
def int_to_bytes(value, length):
    result = []
    for i in range(0, length):
        result.append(value >> (i * 8) & 0xff)
    
    return result
def cswap(swap, x_2, x_3):
    dummy = swap * ((x_2 - x_3) % P)
    x_2 = x_2 - dummy
    x_2 %= P
    x_3 = x_3 + dummy
    x_3 %= P
    return (x_2, x_3)
# Based on https://tools.ietf.org/html/rfc7748
def X25519(k, u):
    x_1 = u
    x_2 = 1
    z_2 = 0
    x_3 = u
    z_3 = 1
    swap = 0
    for t in reversed(range(255)):
        k_t = (k >> t) & 1
        swap ^= k_t
        x_2, x_3 = cswap(swap, x_2, x_3)
        z_2, z_3 = cswap(swap, z_2, z_3)
        swap = k_t
        A = x_2 + z_2
        A %= P
        AA = A * A
        AA %= P
        B = x_2 - z_2
        B %= P
        BB = B * B
        BB %= P
        E = AA - BB
        E %= P
        C = x_3 + z_3
        C %= P
        D = x_3 - z_3
        D %= P
        DA = D * A
        DA %= P
        CB = C * B
        CB %= P
        x_3 = ((DA + CB) % P)**2
        x_3 %= P
        z_3 = x_1 * (((DA - CB) % P)**2) % P
        z_3 %= P
        x_2 = AA * BB
        x_2 %= P
        z_2 = E * ((AA + (A24 * E) % P) % P)
        z_2 %= P
    x_2, x_3 = cswap(swap, x_2, x_3)
    z_2, z_3 = cswap(swap, z_2, z_3)
    return (x_2 * pow(z_2, P - 2, P)) % P
def decodeScalar25519(k):
  k_list = [(b) for b in k]
  k_list[0] &= 248
  k_list[31] &= 127
  k_list[31] |= 64
  return decodeLittleEndian(k_list)
def decodeLittleEndian(b):
    return sum([b[i] << 8*i for i in range( 32 )])
def unpack2(s):
    if len(s) != 32:
        raise ValueError('Invalid Curve25519 scalar (len=%d)' % len(s))
    t = sum((ord(s[i]) ) << (8 * i) for i in range(31))
    t += (((ord(s[31]) ) & 0x7f) << 248)
    return t    
def pack(n):
    return ''.join([chr((n >> (8 * i)) & 255) for i in range(32)])
def clamp(n):
    n &= ~7
    n &= ~(128 << 8 * 31)
    n |= 64 << 8 * 31
    return n
# Return nP
def multscalar(n, p):
    n = clamp(decodeScalar25519(n))
    p = unpack2(p)
    return pack(X25519(n, p))
# Start at x=9. Find point n times x-point
def base_point_mult(n):
    n = clamp(decodeScalar25519(n))
    return pack(X25519(n, 9))


print(X25519(clamp(56391866308239752110494101482511933051315484376135027248208522567059122930692), 4))
# Expected 41707806908216107150933211614905026312154955484464515789593741233629885877574
# Not correct
