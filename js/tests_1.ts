import BN from 'bn.js';
import { Address, Cell, CommentMessage, Slice } from 'ton';
import { stackCell, stackSlice } from 'ton-contract-executor';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults, dummyInternalMessage, internalMessage, dummyAddress, suint, invokeGetMethodWithResultsAndLogs, saddress, invokeGetMethod1ResultAndLogs } from './shared.js';


let compiledSources = contractLoader('./../func/stdlib.fc', './../func/1.fc');


async function testCell(bigCell: Cell) {
	console.log('---------------------');

	let contract = await compiledSources(cell());

	const destination = dummyAddress;

	console.log('--------- decomposite ---------');
	const [groups, logs] = await invokeGetMethod1ResultAndLogs<Cell[]>(
		contract, 'decomposite', 
		[stackCell(bigCell), stackSlice(saddress(destination))]
	);

	console.log('logs:', logs);
	console.log('groups:', groups);

	console.log('--------- reassembly ---------');

	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];
		console.log(`Group ${i}: len=${group.beginParse().remaining}`); //, bits:${group.bits}`);

		const isLastGroup = i + 1 === groups.length;

		const assembleResult = await contract.sendInternalMessage(dummyInternalMessage(group));

		console.info(assembleResult.debugLogs);

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
		console.log('original:', bigCell);
		console.log('restored:', restoredCell);
	}

	console.log()
}



// await testCell(cell());
await testCell(cell(suint(5, 40), suint(13, 24)));

