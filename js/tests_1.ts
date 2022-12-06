import BN from "bn.js";
import { contractLoader, cell } from './shared.js';





let initialData = cell();
let contract = await contractLoader('./../func/1.fc')(initialData);


async function testGdc(a: number, b: number, expectedResult: number) {
	const exres = await contract.invokeGetMethod('gcd', [
		{ type: 'int', value: a.toString() },
		{ type: 'int', value: b.toString() },
	]);
	if (exres.type !== 'success' || exres.exit_code > 0) {
		throw new Error(`exit_code = ${exres.exit_code}`);
	}

	const { result } = exres;

	const res = result[0] as BN;
	if (!res.eqn(expectedResult)) {
		throw new Error(`Incorrect value, expected: ${expectedResult.toString(10)}, found: ${res.toString(10)}`);
	}
	console.log(`testGdc() passed, value = ${res.toString(10)}`);
}


await testGdc(20, 6, 2);
await testGdc(9, 8, 1);
await testGdc(100, 10, 10);
await testGdc(10, 100, 10);
await testGdc(16, 9, 1);
await testGdc(48, 18, 6);
await testGdc(20, 50, 10);

