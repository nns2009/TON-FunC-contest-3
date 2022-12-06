import BN from "bn.js";
import { Address, Cell, CellMessage, CommonMessageInfo, ExternalMessage, InternalMessage, Slice, toNano } from "ton";
import { contractLoader, cell, suint, int, zeros, cellToBoc, sint, internalMessage, dummyInternalMessage } from './shared.js';




let initialData = cell();
let contract = await contractLoader('./../func/3.fc')(initialData);

async function testMessage(cellToVerify: Cell) {
	const exres = await contract.invokeGetMethod('validate_message', [
		{ type: 'cell', value: cellToBoc(cellToVerify) },
	]);
	// console.log('logs:', exres.logs); // ton-contract-executor doesn't show anything anyway
	if (exres.type !== 'success' || exres.exit_code > 0) {
		throw new Error(`exit_code = ${exres.exit_code}, .type = ${exres.type}`);
	}

	const { result } = exres;
	//console.log(result);

	const resCode = result[0] as BN;
	let resSrc: Slice | null = null;
	let resDest: Slice | null = null;
	let resAmount: BN | null = null;
	if (result[1]) {
		const tuple = result[1] as any[];
		resSrc = tuple[0] as Slice;
		resDest = tuple[1] as Slice;
		resAmount = tuple[2] as BN;
	}

	console.log(
		resCode.toString(10),
		resSrc?.readAddress?.(),
		resDest?.readAddress?.(),
		resAmount?.toString?.(10)
	);
	//console.log(resSrc);
	
	// if (resAddress !== userFriendlyAddress) {
	// 	throw new Error(`Incorrect value, expected: ${userFriendlyAddress}, found: ${resAddress}`);
	// }
	// console.log(`testMessage() passed, address = ${resAddress}`);
}


const addr1 = Address.parse('EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC');
const addr2 = Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t');
const addr3 = Address.parse('EQAhE3sLxHZpsyZ_HecMuwzvXHKLjYx4kEUehhOy2JmCcHCT');
const addr4 = Address.parse('Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF');


await testMessage(cell());
await testMessage(cell(new InternalMessage({
	from: addr1,
	to: addr2,
	value: toNano(333),
	bounce: false,
	body: new CommonMessageInfo({
		stateInit: undefined,
		body: new CellMessage(cell()),
	}),
	createdAt: 55555,
	createdLt: 666666,
})));
await testMessage(cell(new InternalMessage({
	from: addr1,
	to: null as any as Address,
	value: toNano('123456789123456789'),
	bounce: false,
	body: new CommonMessageInfo({
		stateInit: undefined,
		body: new CellMessage(cell()),
	}),
	createdAt: 55555,
	createdLt: 666666,
})));
await testMessage(cell(new InternalMessage({
	from: null,
	to: addr2,
	value: toNano(1),
	bounce: false,
	body: new CommonMessageInfo({
		stateInit: undefined,
		body: new CellMessage(cell()),
	}),
	createdAt: 55555,
	createdLt: 666666,
})));

await testMessage(cell(new ExternalMessage({
	from: addr3,
	to: addr4,
	body: new CommonMessageInfo({
		stateInit: undefined,
		body: new CellMessage(cell()),
	}),
	importFee: 800,
})));
