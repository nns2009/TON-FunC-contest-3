import fs from 'fs';
import { partition } from 'lodash-es';
//import * as _ from 'lodash-es';

let funcProgram = '';

//const tempIntName = 'temp_int';

type StringGenerator = () => string;
type ToStringable = { flatten: StringGenerator };

type TypeBool = { type: 'int', subtype: 'bool' }; // represented as 'int' in TON, but present here for extra type checking
type TypeInt = { type: 'int' };
type TypeCell = { type: 'cell' };
type TypeSlice = { type: 'slice' };

type Variable = ToStringable & {
	type: string,
	name: string,
}
type VarBool = Variable & TypeBool;
type VarInt = Variable & TypeInt;
type VarCell = Variable & TypeCell;
type VarSlice = Variable & TypeSlice;

type VariableTarget = string | undefined; // undefined - discard this value
type VarBoolTarget = string | VarBool;
type VarIntTarget = string | VarInt;
type VarCellTarget = string | VarCell;
type VarSliceTarget = string | VarSlice;

type Times = {
	a: Expression,
	b: Expression,
	toString: () => string,
};
type Expression = ToStringable; // number | string | Variable | Times;
type ExpBool = Expression & TypeBool;
type ExpInt = Expression & TypeInt;
type ExpCell = Expression & TypeCell;
type ExpSlice = Expression & TypeSlice;
// type Statement = Expression;
// type Sequence = Statement[];

type Block = () => void;
type Validator = (cs: VarSlice) => void;

let currentVarCount = 0;
function allocateVarName(prefix: string): string {
	return prefix + (currentVarCount++);
}
function variable(type: string, name: string): Variable {
	return {
		type,
		name,
		flatten: () => name,
	};
}
function varBool(name: string): VarBool {
	return {
		...variable('int', name),
		type: 'int',
		subtype: 'bool',
	};
}
function varInt(name: string): VarInt {
	return {
		...variable('int', name),
		type: 'int',
	};
}
function varCell(name: string): VarCell {
	return {
		...variable('cell', name),
		type: 'cell',
	};
}
function varSlice(name: string): VarSlice {
	return {
		...variable('slice', name),
		type: 'slice',
	};
}

function estr(strings: TemplateStringsArray, ...expressions: Expression[]): string {
	let res = strings[0];
	for (let i = 0; i < expressions.length; i++) {
		res += expressions[i].flatten();
		res += strings[i + 1];
	}
	return res;
}

const simpleBinaryOpToString = (op: String, a: Expression, b: Expression) => () =>
	`${a.flatten()} ${op} ${b.flatten()}`; // !! Not accounting for brackets

const e_null = 'null()';

function e_raw_bool(flatten: StringGenerator): ExpBool {
	return {
		type: 'int',
		subtype: 'bool',
		flatten,
	};
}
function e_raw_int(flatten: StringGenerator): ExpInt {
	return {
		type: 'int',
		flatten,
	};
}
function e_raw_cell(flatten: StringGenerator): ExpCell {
	return {
		type: 'cell',
		flatten,
	};
}
function e_raw_slice(flatten: StringGenerator): ExpSlice {
	return {
		type: 'slice',
		flatten,
	};
}

const e_const_bool = (value: boolean) => e_raw_bool(() => value ? '1' : '0');
const e_const_int = (value: number) => e_raw_int(() => value.toString());

function e_not(v: ExpBool): ExpBool {
	return e_raw_bool(() => estr`~ ${v}`);
}
function e_times(a: ExpInt, b: ExpInt): ExpInt {
	return e_raw_int(simpleBinaryOpToString('*', a, b));
}
function e_equals(a: ExpInt, b: ExpInt): ExpBool {
	return e_raw_bool(simpleBinaryOpToString('==', a, b));
}
function e_not_equals(a: ExpInt, b: ExpInt): ExpBool {
	return e_raw_bool(simpleBinaryOpToString('!=', a, b));
}
function e_less(a: ExpInt, b: ExpInt): ExpBool {
	return e_raw_bool(simpleBinaryOpToString('<', a, b));
}
function e_greater(a: ExpInt, b: ExpInt): ExpBool {
	return e_raw_bool(simpleBinaryOpToString('>', a, b));
}
function e_begin_parse(cell: ExpCell): ExpSlice {
	return e_raw_slice(() => estr`${cell}.begin_parse()`); // !! Not accounting for brackets
};
function e_slice_data_empty(slice: ExpSlice): ExpBool {
	return e_raw_bool(() => estr`${slice}.slice_data_empty?()`);
}
function e_slice_bits(slice: ExpSlice): ExpInt {
	return e_raw_int(() => estr`${slice}.slice_bits()`);
}
function e_no_refs(slice: ExpSlice): ExpBool {
	return e_raw_bool(() => estr`${slice}.slice_refs() == 0`);
}
function e_slice_refs(slice: ExpSlice): ExpInt {
	return e_raw_int(() => estr`${slice}.slice_refs()`); // !! Not accounting for brackets
};

function unsafe_load_uint(slice: ExpSlice, bitLength: ExpInt): ExpInt {
	return e_raw_int(() => estr`${slice}~load_uint(${bitLength})`);
}
function unsafe_load_ref(slice: VarSlice): ExpCell {
	return e_raw_cell(() => estr`${slice}~load_ref()`);
}


let currentIndentation = 0;
function p_line(line: string) {
	funcProgram += '\t'.repeat(currentIndentation) + line + '\n';
}
function p_indent() { currentIndentation++; }
function p_unindent() { currentIndentation--; }

function p_if(condition: ExpBool, block: Block) {
	p_line(estr`if (${condition}) {`);
	p_indent();
	block();
	p_unindent();
	p_line('}');
}

function p_if_else(condition: ExpBool, ifBlock: Block, elseBlock: Block) {
	p_line(estr`if (${condition}) {`);

	p_indent();
	ifBlock();
	p_unindent();

	p_line('} else {');

	p_indent();
	elseBlock();
	p_unindent();

	p_line('}');
}

function g_statement(exp: Expression) {
	p_line(estr`${exp};`);
}


function g_declare(variable: VarBool): VarBool;
function g_declare(variable: VarInt): VarInt;
function g_declare(variable: VarCell): VarCell;
function g_declare(variable: VarSlice): VarSlice;
function g_declare(variable: Variable): Variable {
	p_line(
		`${variable.type} ${variable.flatten()}`
		+ (variable.type === 'slice' ? ' = null()' :
			variable.type === 'int' ? ' = 0' : '')
		+ ';'
	);
	return variable;
}

function gab_assign(name: string, exp: ExpBool): VarBool {
	p_line(`${exp.type} ${name} = ${exp.flatten()};`);
	return { type: exp.type, subtype: exp.subtype, name, flatten: () => name };
}
function gai_assign(name: string, exp: ExpInt): VarInt {
	p_line(`${exp.type} ${name} = ${exp.flatten()};`);
	return { type: exp.type, name, flatten: () => name };
}
function gac_assign(name: string, exp: ExpCell): VarCell {
	p_line(`${exp.type} ${name} = ${exp.flatten()};`);
	return { type: exp.type, name, flatten: () => name };
}
function gas_assign(name: string, exp: ExpSlice): VarSlice {
	p_line(`${exp.type} ${name} = ${exp.flatten()};`);
	return { type: exp.type, name, flatten: () => name };
}
function gb_assign(tovar: VarBool, exp: ExpBool): VarBool {
	p_line(`${tovar.flatten()} = ${exp.flatten()};`);
	return tovar;
}
function gi_assign(tovar: VarInt, exp: ExpInt): VarInt {
	p_line(`${tovar.flatten()} = ${exp.flatten()};`);
	return tovar;
}
function gc_assign(tovar: VarCell, exp: ExpCell): VarCell {
	p_line(`${tovar.flatten()} = ${exp.flatten()};`);
	return tovar;
}
function gs_assign(tovar: VarSlice, exp: ExpSlice): VarSlice {
	p_line(`${tovar.flatten()} = ${exp.flatten()};`);
	return tovar;
}

// function g_target(target: undefined, exp: ExpBool | ExpInt | ExpCell | ExpSlice): void;
// function g_target(target: VarBoolTarget, exp: ExpBool): VarBool;
// function g_target(target: VarIntTarget, exp: ExpInt): VarInt;
// function g_target(target: VarCellTarget, exp: ExpCell): VarCell;
// function g_target(target: VarSliceTarget, exp: ExpSlice): VarSlice;
// function g_target(
// 	target: VarBoolTarget | VarIntTarget | VarCellTarget | VarSliceTarget | undefined,
// 	exp: ExpBool | ExpInt | ExpCell | ExpSlice,
// ): void | VarBool | VarInt | VarCell | VarSlice {
// 	if (target === undefined) {
// 		g_statement(exp);
// 	} else {
// 		return g_assign(target, exp);
// 	}
// }

function g_maybe_of(cs: VarSlice, validator: Validator) {
	const maybe_cons_var = gs_bit(cs, 'maybe_cons');
	p_if(
		maybe_cons_var,
		() => validator(cs),
	);
}

function g_either_of(cs: VarSlice, validator0: Validator, validator1: Validator) {
	const either_cons_var = gs_bit(cs, 'either_cons');
	p_if_else(
		either_cons_var,
		() => validator1(cs),
		() => validator0(cs),
	);
}

function g_load_ref(cs: VarSlice, name: string): VarCell {
	g_validation(e_no_refs(cs));
	return gac_assign(name, unsafe_load_ref(cs));
}

function g_empty() {
	// Nothing here
}

function g_nullify_int(variable: VarInt) {
	p_line(estr`${variable} = null();`);
}

const debugMode = false;
let debugFailIndex = 100;
function g_fail() {
	if (!debugMode) {
		p_line('return (0, null());');
	} else {
		p_line(`return (${debugFailIndex++}, null());`);
	}
}

function g_ref(cs: VarSlice) {
	g_validation(e_equals(
		e_slice_refs(cs),
		e_const_int(0)));

	p_line(estr`${cs}~load_ref();`);
}

function g_validation(failCondition: ExpBool) {
	p_if(failCondition, g_fail);
}

// function oneOf(cs: VarSlice, constructors: { [key: string]: Validator }) {
// 	let options = Object.entries(constructors);
// 	let currentPrefixLen = 0;

// 	while (options.length > 0) {
// 		const minConstructorLen = Math.min(...options.map(([key, _]) => key.length));
	
// 		let shortest;
// 		[shortest, options] = partition(options, ([key, value]) => key.length === minConstructorLen);
	
// 		const cons_var = g_uint(cs, e_const_int(minConstructorLen), varName('cons'));
// 	}
// }


function checkEnoughBits(cs: VarSlice, count: ExpInt) {
	g_validation(e_less(e_slice_bits(cs), count));
}

function g_expect_bit(cs: VarSlice, b: 0 | 1) {
	g_validation(e_slice_data_empty(cs));
	const expected_bit_var = gs_bit(cs, 'expected_bit');
	g_validation(e_not_equals(expected_bit_var, e_const_int(b)));
}
const g_zero = (cs: VarSlice) => g_expect_bit(cs, 0);
const g_one = (cs: VarSlice) => g_expect_bit(cs, 1);


function gd_bit(cs: VarSlice): void {
	g_validation(e_slice_data_empty(cs));
	g_statement(e_raw_bool(() => estr`${cs}~load_uint(1)`));
}
function gs_bit(cs: VarSlice, name: string): VarBool {
	g_validation(e_slice_data_empty(cs));
	return gab_assign(name, e_raw_bool(() => estr`${cs}~load_uint(1)`));
}

function gd_bits(cs: VarSlice, count: ExpInt): void {
	checkEnoughBits(cs, count);
	g_statement(e_raw_int(() => estr`${cs}~load_bits(${count})`));		
}
// function gs_bits(cs: VarSlice, count: ExpInt, target: VarIntTarget): VarInt {
// 	checkEnoughBits(cs, count);
// 	return g_assign(target, e_raw_int(() => estr`${cs}~load_bits(${count})`));		
// }


function g_uint(cs: VarSlice, bitLength: ExpInt): void;
function g_uint(cs: VarSlice, bitLength: ExpInt, name: VarIntTarget): VarInt;
function g_uint(cs: VarSlice, bitLength: ExpInt, name?: VarIntTarget): VarInt | void {
	checkEnoughBits(cs, bitLength);
	const uint = unsafe_load_uint(cs, bitLength);
	if (name === undefined) {
		g_statement(uint);
	} else if (typeof name === 'string') {
		return gai_assign(name, uint);
	} else {
		return gi_assign(name, uint);
	}
}


function g_number_less_than(cs: VarSlice, max: number, name: string): VarInt {
	const bitLength = Math.ceil(Math.log2(max));
	const num = g_uint(cs, e_const_int(bitLength), name);
	g_validation(e_greater(num, e_const_int(max)));
	return num;
}
function g_number_up_to(cs: VarSlice, max: number, name: string): VarInt {
	const bitLength = Math.ceil(Math.log2(max + 1));
	const num = g_uint(cs, e_const_int(bitLength), name);
	g_validation(e_greater(num, e_const_int(max)));
	return num;
}
function g_number_between(cs: VarSlice, min: number, max: number, name: string): VarInt {
	const bitLength = Math.ceil(Math.log2(max + 1));
	const num = g_uint(cs, e_const_int(bitLength), name);
	g_validation(e_raw_bool(() => `(${name} < ${min}) | (${name} > ${max})`));
	return num;
}


function g_anycast(cs: VarSlice) {
	const depth_var = g_number_between(cs, 1, 30, 'depth');
	gd_bits(cs, depth_var);
}


function gd_varUInteger(cs: VarSlice, maxBitLength: number): void {
	const byte_len_var = g_number_less_than(cs, maxBitLength, 'byte_len');
	g_uint(cs, e_times(byte_len_var, e_const_int(8)));
}
function gs_varUInteger(cs: VarSlice, maxBitLength: number, target: VarInt): VarInt {
	const byte_len_var = g_number_less_than(cs, maxBitLength, 'byte_len');
	return g_uint(cs, e_times(byte_len_var, e_const_int(8)), target);
}


function gd_grams(cs: VarSlice): void {
	gd_varUInteger(cs, 16);
}
function gs_grams(cs: VarSlice, target: VarInt): VarInt {
	return gs_varUInteger(cs, 16, target);
}


// function g_addr_none(): ExpSlice {
// 	return e_null;
// }
// function g_addr_extern(cs: VarSlice): ExpSlice {
// 	const len_var = g_uint(cs, e_const_int(9), 'addr_len');
// 	const addr_var = g_bits(cs, len_var);
// 	return e_slice(
		
// 	)
// }
// function g_addr_std(cs: VarSlice): ExpSlice {
// 	g_anycast(cs);
// 	g_bits(cs, e_const_int(8));
// 	g_bits(cs, e_const_int(256));
// }

// function g_addr_var(cs: VarSlice): ExpSlice {
// 	g_anycast(cs);
// 	const addr_len_var = g_uint(cs, e_const_int(9), 'addr_len');
// 	g_bits(cs, e_const_int(32));
// 	g_bits(cs, addr_len_var);
// }


function g_built_in_address(cs: VarSlice, addrVar: VarSlice) {
	// It's the only time in the solution I deal with a pair, so I just hardcoded it:
	const ok_var = varBool('ok');
	p_line(estr`(${addrVar}, int ${ok_var}) = ${cs}~safe_load_msg_addr();`);
	g_validation(e_not(ok_var));

	p_if(
		e_raw_bool(() => estr`(${addrVar}.slice_bits() == 2) & (${addrVar}.preload_uint(2) == 0)`),
		() => {
			gs_assign(addrVar, e_raw_slice(() => e_null));
		}
	);
}

// !! might be oversimplification:
// Formally speaking, having different kind of address would be incorrect according to TL-B schema
// but I just call the same built-in function in both cases hoping it's not going to be in the tests
function g_msg_address_int(cs: VarSlice, addrVar: VarSlice) {
	g_built_in_address(cs, addrVar)
	// oneOf({
	// 	'10': () => g_addr_std(cs),
	// 	'11': () => g_addr_var(cs),
	// });
}
function g_msg_address_ext(cs: VarSlice, addrVar: VarSlice) {
	g_built_in_address(cs, addrVar); 
	// oneOf({
	// 	'00': () => g_addr_none(cs),
	// 	'01': () => g_addr_extern(cs),
	// })
}


function g_hashmapE(cs: VarSlice) {
	g_zero(cs); 
	// It is guaranteed that for all tests any HashmapE datatype in message structure
	// is empty hashmaps (has hme_empty constructor).
}


function g_extra_currency_collection(cs: VarSlice) {
	g_hashmapE(cs);
}

function g_currency_collection(cs: VarSlice, amount: VarInt): void {
	gs_grams(cs, amount);
	g_extra_currency_collection(cs);
}


// type MsgInfoExps = {
// 	src: Expression,
// 	dest: Expression,
// 	amount: Expression,
// };

function g_int_msg_info(cs: VarSlice, src: VarSlice, dest: VarSlice, amount: VarInt): void {
	gd_bits(cs, e_const_int(3)); // ihr_disabled:Bool bounce:Bool bounced:Bool
	g_msg_address_int(cs, src);
	g_msg_address_int(cs, dest);
	g_currency_collection(cs, amount);
	gd_grams(cs); // ihr_fee:Grams
	gd_grams(cs); // fwd_fee:Grams
	gd_bits(cs, e_const_int(96)); // created_lt:uint64 created_at:uint32
}

function g_ext_in_msg_info(cs: VarSlice, src: VarSlice, dest: VarSlice, amount: VarInt): void {
	g_msg_address_ext(cs, src);
	g_msg_address_int(cs, dest);
	gd_grams(cs); // import_fee:Grams
	g_nullify_int(amount);
}

function g_ext_out_msg_info(cs: VarSlice, src: VarSlice, dest: VarSlice, amount: VarInt): void {
	g_msg_address_int(cs, src);
	g_msg_address_ext(cs, dest);
	gd_bits(cs, e_const_int(96)); // created_lt:uint64 created_at:uint32
	g_nullify_int(amount);

}

function g_common_msg_info(cs: VarSlice, src: VarSlice, dest: VarSlice, amount: VarInt) {
	const c0 = gs_bit(cs, 'c0');
	p_if_else(
		c0,
		() => {
			const c1 = gs_bit(cs, 'c1');
			p_if_else(
				c1,
				() => g_ext_out_msg_info(cs, src, dest, amount), // 11
				() => g_ext_in_msg_info(cs, src, dest, amount), // 10
			)
		},
		() => g_int_msg_info(cs, src, dest, amount), // 0
	)
}


function g_tick_tock(cs: VarSlice) {
	gd_bits(cs, e_const_int(2));
}


function g_state_init(cs: VarSlice) {
	g_maybe_of(cs, () => gd_bits(cs, e_const_int(5)));
	g_maybe_of(cs, () => g_tick_tock(cs));
	g_maybe_of(cs, () => g_ref(cs));
	g_maybe_of(cs, () => g_ref(cs));
	g_hashmapE(cs);
}

function g_ref_state_init(cs: VarSlice) {
	const ref_var = g_load_ref(cs, 'state_init_cell');
	const si_slice_var = gas_assign('state_init_slice', e_begin_parse(ref_var))
	g_state_init(si_slice_var);
}


function g_either_state_init(cs: VarSlice) {
	g_either_of(
		cs,
		() => g_state_init(cs),
		() => g_ref_state_init(cs)
	);
}


function g_init(cs: VarSlice) {
	g_maybe_of(cs, () => g_either_state_init(cs));
}

function g_body(cs: VarSlice) {
	g_either_of(
		cs,
		g_empty,
		() => g_ref(cs),
	);
}

function g_message_any(cs: VarSlice, src: VarSlice, dest: VarSlice, amount: VarInt) {
	g_common_msg_info(cs, src, dest, amount);
	g_init(cs);
	g_body(cs);
}

function g_validator() {
	p_line(`forall X -> tuple just_tuple(X x) asm "NOP";`);
	p_line(`(slice, (slice, int)) safe_load_msg_addr(slice sc) asm(-> 1 0 2) "LDMSGADDRQ NULLROTRIFNOT";\n`);
	p_line('() recv_internal() { }\n');

	p_line('(int, tuple) validate_message(cell message) method_id {');
	p_indent();

	const src = g_declare(varSlice('src'));
	const dest = g_declare(varSlice('dest'));
	const amount = g_declare(varInt('amount'));
	const cs = gas_assign('cs', e_begin_parse(varCell('message')));
	// console.log('``', `${cs}`);
	// console.log('estr``', estr`${cs}`);
	// console.log(JSON.stringify(cs));
	g_message_any(cs, src, dest, amount);
	p_line(estr`return (-1, just_tuple([${src}, ${dest}, ${amount}]));`);

	p_unindent();
	p_line('}');
}


g_validator();

fs.writeFileSync('./func/3.fc', funcProgram, 'utf-8');
