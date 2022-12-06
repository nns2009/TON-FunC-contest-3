import { Cell } from "ton";
import { contractLoader, cell, suint, int, zeros, cellToBoc, sint } from './shared.js';




let initialData = cell();
let contract = await contractLoader('./../func/5.fc')(initialData);

async function testEncode(rawAddress: string, userFriendlyAddress: string) {
	const [wcStr, addrStr] = rawAddress.split(':');
	const wc = parseInt(wcStr);

	const c = cell(
		suint(2, 2),
		zeros(1),
		sint(wc, 8),
		suint(int(addrStr, 16), 256),
	);

	const exres = await contract.invokeGetMethod('for_self_testing', [
		{ type: 'cell', value: cellToBoc(c) },
	]);
	if (exres.type !== 'success' || exres.exit_code > 0) {
		throw new Error(`exit_code = ${exres.exit_code}`);
	}

	const { result } = exres;

	const resCell = result[0] as Cell;
	const resAddress = resCell.bits.buffer.toString('utf-8');
	
	if (resAddress !== userFriendlyAddress) {
		throw new Error(`Incorrect value, expected: ${userFriendlyAddress}, found: ${resAddress}`);
	}
	console.log(`testEncode() passed, address = ${resAddress}`);
}


await testEncode(
	'0:588af75cd06024fa79dccda32760db928e9797bb69c94b70d9e0aa8b8e8b17e6',
	'EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC'
);
await testEncode(
	'0:21137b0bc47669b3267f1de70cbb0cef5c728b8d8c7890451e8613b2d8998270',
	'EQAhE3sLxHZpsyZ_HecMuwzvXHKLjYx4kEUehhOy2JmCcHCT',
);
await testEncode(
	'-1:3333333333333333333333333333333333333333333333333333333333333333',
	'Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF',
);
