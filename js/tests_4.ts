import BN from 'bn.js';
import { stackInt } from 'ton-contract-executor';

import { contractLoader, cell } from './shared.js';




let initialData = cell();
let contract = await contractLoader('./../func/4.fc')(initialData);

async function testInverseMod(v: number, mod: number) {

	const exres = await contract.invokeGetMethod('zhuk', [
		stackInt(v), stackInt(mod)
	]);
	if (exres.type !== 'success' || exres.exit_code > 0) {
		throw new Error(`exit_code = ${exres.exit_code}, ${exres.logs}`);
	}

	const { result } = exres;
	const value = result[0]! as BN;

	console.log(value.toString());
	//console.log(`testEncode() passed, address = ${resAddress}`);
}


// !!! INCOMPLETE !!!
// I just sent the solution without testing once it compiled
// At least one "test" launch is needed to make sure it compiled
await testInverseMod(40, 97);
