import BN from 'bn.js';
import { stackInt } from 'ton-contract-executor';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults } from './shared.js';


let initialData = cell();
let contract = await contractLoader('./../func/4.fc')(initialData);

async function testInverseMod(v: number, mod: number) {
	const value = await invokeGetMethod1Result<BN>(contract, 'inverse_mod', [
		stackInt(v), stackInt(mod)
	]);

	//console.log(`inverse_mod result is ${value.toString()}`);
	const num = value.toNumber();

	const multiplied = (v * num) % mod;
	const correct = multiplied === 1;

	console.log(`${v} * ${num} = ${multiplied} (mod ${mod}) - ${correct ? 'Correct' : 'Wrong'}`);
	if (!correct) {
		throw 'Test failed';
	}
}

async function testAdd(x1: BN, y1: BN, x2: BN, y2: BN, correctX: BN, correctY: BN) {
	const added = await invokeGetMethodWithResults<[BN, BN]>(contract, 'add', [
		stackInt(x1), stackInt(y1), stackInt(x2), stackInt(y2)
	]);
	const [addedX, addedY] = added;
	console.log('Addition result:', addedX.toString(), addedY.toString());

	if (!addedX.eq(correctX)) {
		throw new Error(`Addition result X is incorrect:\nexpected ${correctX.toString()}\ngot: ${addedX.toString()}`);
	}
	if (!addedY.eq(correctY)) {
		throw new Error(`Addition result Y is incorrect:\nexpected ${correctY.toString()}\ngot: ${addedY.toString()}`);
	}

	console.log('(Correct)');
}

async function testMul(x: BN, factor: BN, answer: BN) {
	const multiplied = await invokeGetMethod1Result<BN>(contract, 'mul', [
		stackInt(x), stackInt(factor)
	]);
	
	const correct = multiplied.eq(answer);
	console.log(`${x.toString()} * ${factor.toString()} = ${multiplied.toString()} - ${correct ? 'Correct' : 'Wrong'}`);

	if (!correct) {
		throw new Error(`Multiplication result wrong:\nexpected ${answer.toString()}\ngot ${multiplied.toString()}`);
	}
}


await testInverseMod(40, 97);
await testInverseMod(50, 129);
await testInverseMod(2, 131);
await testInverseMod(26, 171);
await testInverseMod(200, 15485867);
await testInverseMod(414, 373587911);
await testInverseMod(266, 879190841);


await testAdd(
	int('56391866308239752110494101482511933051315484376135027248208522567059122930692'),
	int('17671033459111968710988296061676524036652749365424210951665329683594356030064'),
	int('39028180402644761518992797890514644768585183933988208227318855598921766377692'),
	int('17694324391104469229766971147677885172552105420452910290862122102896539285628'),
	int('7769460008531208039267550090770832052561793182665100660016059978850497673345'),
	int('50777594312607721283178588283812137388073334114015585272572035433724485979392')
);

// Testing adding point to itself
await testAdd(
	int('9'),
	int('14781619447589544791020593568409986887264606134616475288964881837755586237401'),
	int('9'),
	int('14781619447589544791020593568409986887264606134616475288964881837755586237401'),
	int('14847277145635483483963372537557091634710985132825781088887140890597596352251'),
	int('8914613091229147831277935472048643066880067899251840418855181793938505594211'),
);


await testMul(
	int('56391866308239752110494101482511933051315484376135027248208522567059122930692'),
	int('4'),
	int('41707806908216107150933211614905026312154955484464515789593741233629885877574'),
);

await testMul(
	int('9'),
	int('400'),
	int('51183824765180923838357410076652967527391981375594480769412766045456729713757'),
);
await testMul(
	int('9'),
	int('500'),
	int('412032401330688009537669280341675230706719615976564131277155884598995837867'),
);
await testMul(
	int('9'),
	int('900'),
	int('9708516049406557598358815603894673803203043153162733025951424549800834417285'),
);
