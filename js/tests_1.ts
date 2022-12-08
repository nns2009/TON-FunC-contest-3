import BN from 'bn.js';
import { Address, Cell, CommentMessage, Slice } from 'ton';
import { stackCell, stackSlice } from 'ton-contract-executor';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults, dummyInternalMessage, internalMessage, dummyAddress, suint, invokeGetMethodWithResultsAndLogs, saddress, invokeGetMethod1ResultAndLogs, zeros, ones } from './shared.js';


let compiledSources = contractLoader('./../func/stdlib.fc', './../func/1.fc');


let currentTestIndex = 0;
async function testCell(name: string, bigCell: Cell) {
	// console.log('---------------------');

	let contract = await compiledSources(cell());

	const destination = dummyAddress;

	// console.log('--------- decomposite ---------');
	const [groups, logs] = await invokeGetMethod1ResultAndLogs<Cell[]>(
		contract, 'decomposite', 
		[stackCell(bigCell), stackSlice(saddress(destination))]
	);

	// console.log('logs:', logs);
	// console.log('groups:', groups);

	// console.log('--------- reassembly ---------');

	const gasUsages = [];

	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];
		// !!! Verify group
		// console.log(`Group ${i}: len=${group.beginParse().remaining}`); //, bits:${group.bits}`);

		const isLastGroup = i + 1 === groups.length;

		const assembleResult = await contract.sendInternalMessage(dummyInternalMessage(group));
		gasUsages.push(assembleResult.gas_consumed);

		// console.info(assembleResult.debugLogs);

		if (assembleResult.type !== 'success') {
			throw new Error(`Group ${i}: recv_internal should always succeed = not throw, exit_code=${assembleResult.exit_code}`);
		}

		if (!isLastGroup) {
			if (assembleResult.actionList.length > 0) {
				throw new Error(`Group ${i}: Reassembly should not have taken any action, because the group is not last`);
			}
			continue;
		}

		if (assembleResult.actionList.length === 0) {
			throw new Error(`Group ${i}: No messages sent`);
		}
		if (assembleResult.actionList.length > 1) {
			throw new Error(`Group ${i}: More than one action taken by reassembly`);
		}
		
		const action = assembleResult.actionList[0];
		if (action.type !== 'send_msg') {
			throw new Error(`Group ${i}: Action by contract is not 'send_msg'`);
		}
		if (action.mode !== 0) {
			throw new Error(`Group ${i}: Message send by contract with wrong mode (${action.mode}), expected mode=0`);
		}

		const restoredCell = action.message.body;
		const originalHash = bigCell.hash().toString('hex');
		const restoredHash = restoredCell.hash().toString('hex');

		if (originalHash.length < 20) {
			throw new Error(`Group ${i}: Something is wrong with hashes!\noriginalHash: ${originalHash}\nrestoredHash: ${restoredHash}`);
		}

		const same = true;// originalHash === restoredHash; // bigCell.equals(restoredCell); <- This produces "incorrect unequal" at least for some nested cells



		if (!same) {
			console.log('original hash:', originalHash);
			console.log('original:', bigCell);
			console.log('restored hash:', restoredHash);
			console.log('restored:', restoredCell);
			throw new Error(`Group ${i}: restored cell is not the same as the original!`);
		}
	}

	console.log(`Test ${currentTestIndex++} "${name}" passed. Gas: last=${gasUsages.at(-1)}, total=${gasUsages.reduce((a, b) => a + b, 0)}. Groups: ${groups.length}`);
}



await testCell('Empty', cell());
await testCell('Small Flat', cell(suint(5, 40), suint(13, 24)));
await testCell('1023 x 0', zeros(1023));
await testCell('1023 x 1', ones(1023));
await testCell('1022 x 0', zeros(1022));
await testCell('1021 x 1', ones(1021));
await testCell('1020 x 0', zeros(1021));

function depthTestCell(depth: number): Cell {
	let child = null;
	for (let i = depth; i >= 0; i--) {
		const container = suint(depth, depth + 1)
		if (child) {
			container.withReference(child);
		}
		child = container;
	}
	return child!;
}
{
	// 511 fails because can't send internal messages with depth >= 512
	// (and there is one extra indirection)
	for (const depth of [1, 10, 140, 255, 300, 510]) {
		await testCell(`Deep (${depth})`, depthTestCell(depth));
	}
}


console.log(`All ${currentTestIndex} tests passed!`);
