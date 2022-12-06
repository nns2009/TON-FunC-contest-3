import BN from 'bn.js';
import { stackInt } from 'ton-contract-executor';

import { contractLoader, cell, invokeGetMethod1Result } from './shared.js';


let initialData = cell();
let contract = await contractLoader('./../func/4.fc')(initialData);

async function testInverseMod(v: number, mod: number) {
	const value = await invokeGetMethod1Result<BN>(contract, 'inverse_mod', [
		stackInt(v), stackInt(mod)
	]);

	console.log(`inverse_mod result is ${value.toString()}`);
	const num = value.toNumber();

	const multiplied = (v * num) % mod;
	const correct = multiplied === 1;

	console.log(`${v} * ${num} = ${multiplied} (mod ${mod}) - ${correct ? 'Correct' : 'Wrong'}`);
	if (!correct) {
		throw 'Test failed';
	}
}


await testInverseMod(40, 97);
