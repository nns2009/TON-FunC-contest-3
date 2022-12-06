import BN from "bn.js";
import { beginDict, Cell } from "ton";
import { contractLoader, cell, suint } from './shared.js';





let initialData = cell();
let contract = await contractLoader('./../func/2.fc')(initialData);


type ObjectDict<T> = { [key: string]: T };
function objectDict(obj: ObjectDict<number>): Cell | null {
	const res = beginDict(256);
	for (const [key, value] of Object.entries(obj)) {
		res.storeCell(key.charCodeAt(0), suint(value, 40));
	}
	return res.endDict();
}

async function testMerge(a: ObjectDict<number>, b: ObjectDict<number>) {
	const da = objectDict(a);
	const db = objectDict(b);

	const exres = await contract.invokeGetMethod('merge_hashmaps', [
		{ type: 'cell', value: '123' },
		{ type: 'cell', value: '45' },
	]);
	if (exres.type !== 'success' || exres.exit_code > 0) {
		throw new Error(`exit_code = ${exres.exit_code}`);
	}

	// const { result } = exres;

	// const res = result[0] as BN;
	// if (!res.eqn(expectedResult)) {
	// 	throw new Error(`Incorrect value, expected: ${expectedResult.toString(10)}, found: ${res.toString(10)}`);
	// }
	// console.log(`testGdc() passed, value = ${res.toString(10)}`);
}


await testMerge({}, {});
// !!! INCOMPLETE !!!
// I just sent the solution without testing
