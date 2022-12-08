import BN from 'bn.js';
import { Address, Cell, CommentMessage, Slice } from 'ton';
import { stackCell, stackSlice } from 'ton-contract-executor';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults, dummyInternalMessage, internalMessage, dummyAddress, suint, invokeGetMethodWithResultsAndLogs, saddress } from './shared.js';


let compiledSources = contractLoader('./../func/stdlib.fc', './../func/1.fc');


async function testCell(bigCell: Cell) {
	let contract = await compiledSources(cell());

	const destination = dummyAddress;

	const groups = await invokeGetMethod1Result<Cell[]>(
		contract, 'decomposite', 
		[stackCell(bigCell), stackSlice(saddress(destination))]
	);

	console.log(groups);

	// const assembleResult = await contract.sendInternalMessage(dummyInternalMessage(cell()));

	// if (assembleResult.type !== 'success') {
	// 	throw new Error(`Big cell reassembly should have suceeded`);
	// }
	// if (assembleResult.actionList.length === 0) {
	// 	throw new Error(`No messages send `);
	// }
	// if (assembleResult.actionList.length > 1) {
	// 	throw new Error(`More than one action send by try_elect`);
	// }
	// const action = assembleResult.actionList[0];
	// if (action.type !== 'send_msg') {
	// 	throw new Error(`Action by contract is not 'send_msg'`);
	// }
	// if (action.mode !== 64) {
	// 	throw new Error(`Message send by contract with wrong mode (${action.mode}), expected mode=64`);
	// }

	
	console.log()
}

await testCell(cell(
	suint(5, 40),
));

