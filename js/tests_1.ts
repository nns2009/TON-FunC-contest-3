import BN from 'bn.js';
import { Address, Cell, CommentMessage, Slice } from 'ton';
import { stackCell, stackSlice } from 'ton-contract-executor';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults, dummyInternalMessage, internalMessage, dummyAddress, suint, invokeGetMethodWithResultsAndLogs, saddress, invokeGetMethod1ResultAndLogs, zeros, ones, invokeGetMethod1ResultAndLogsGas } from './shared.js';


let compiledSources = contractLoader('./../func/stdlib.fc', './../func/1.fc');


type CellTotals = {
	bits: number,
	cells: number,
};
function getCellTotals(cell: Cell): CellTotals {
	const res = {
		bits: cell.beginParse().remaining,
		cells: 1,
	};

	for (const child of cell.refs) {
		const childTotal = getCellTotals(child);
		res.bits += childTotal.bits;
		res.cells += childTotal.cells;
	}

	return res;
}

let contract = await compiledSources(cell());

let currentTestIndex = 0;
async function testCell(name: string, bigCell: Cell) {
	const cellTotals = getCellTotals(bigCell);
	// console.log('---------------------');
	console.log(`Test ${currentTestIndex} "${name}"::: Max depth: ${bigCell.getMaxDepth()}, total cells: ${cellTotals.cells}, total bits: ${cellTotals.bits}`);

	const destination = dummyAddress;

	// console.log('--------- decomposite ---------');
	const [groups, logs, decompositeGas] = await invokeGetMethod1ResultAndLogsGas<Cell[]>(
		contract, 'decomposite', 
		[stackCell(bigCell), stackSlice(saddress(destination))]
	);

	// console.log('logs:', logs);
	// console.log('groups:', groups);

	// console.log('--------- reassembly ---------');

	const gasUsages = [];

	let groupMaxBits = -1;
	let groupMaxCells = -1;
	let groupMaxDepth = -1;
	let groupMaxBocSize = -1;

	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];

		const groupTotals = getCellTotals(group);
		groupMaxBits = Math.max(groupMaxBits, groupTotals.bits);
		groupMaxCells = Math.max(groupMaxCells, groupTotals.cells);
		groupMaxDepth = Math.max(groupMaxDepth, group.getMaxDepth());
		groupMaxBocSize = Math.max(groupMaxBocSize, group.toBoc({ idx: false }).length); // bytes
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
		const restoredHash = restoredCell.hash().toString('hex');
		const originalHash = bigCell.hash().toString('hex');

		if (originalHash.length < 20) {
			throw new Error(`Group ${i}: Something is wrong with hashes!\noriginalHash: ${originalHash}\nrestoredHash: ${restoredHash}`);
		}

		const same = originalHash === restoredHash; // bigCell.equals(restoredCell); <- This produces "incorrect unequal" at least for some nested cells


		if (!same) {
			console.log('original hash:', originalHash);
			console.log('original:', bigCell);
			console.log('restored hash:', restoredHash);
			console.log('restored:', restoredCell);
			throw new Error(`Group ${i}: restored cell is not the same as the original!`);
		}
	}

	console.log(`Test ${currentTestIndex} "${name}" passed. Gas: decomposit=${decompositeGas}, last=${gasUsages.at(-1)}, total=${gasUsages.reduce((a, b) => a + b, 0)}. Max depth: ${bigCell.getMaxDepth()}, total cells: ${cellTotals.cells}, total bits: ${cellTotals.bits}. Groups: ${groups.length}, max depth: ${groupMaxDepth}, max cells: ${groupMaxCells}, max bits: ${groupMaxBits}, max boc size: ${groupMaxBocSize * 8}`);

	currentTestIndex++;
}



// await testCell('Empty', cell());
// await testCell('Small Flat', cell(suint(5, 40), suint(13, 24)));
// await testCell('1-level fork',
// 	cell(suint(123, 41))
// 	.withReference(suint(150, 299))
// 	.withReference(suint(180, 512))
// 	.withReference(suint(900900, 1023))
// )
// await testCell('2-level fork',
// 	suint(123456, 41)
// 	.withReference(
// 		suint(150, 299)
// 		.withReference(suint(100100, 32))
// 		.withReference(suint(100200, 33))
// 	).withReference(
// 		suint(180, 512)
// 		.withReference(suint(200100, 42))
// 		.withReference(suint(200200, 43))
// 		.withReference(suint(200300, 44))
// 	).withReference(
// 		suint(900900, 1023)
// 		.withReference(suint(300100, 52))
// 		.withReference(suint(300200, 53))
// 		.withReference(suint(300300, 54))
// 		.withReference(suint(300400, 55))
// 	)
// )
// await testCell('1023 x 0', zeros(1023));
// await testCell('1023 x 1', ones(1023));
// await testCell('1022 x 0', zeros(1022));
// await testCell('1021 x 1', ones(1021));
// await testCell('1020 x 0', zeros(1021));

// function depthTestCell(
// 	depth: number,
// 	nSelector: (d: number) => number,
// 	bitlenSelector: (d: number) => number,
// ): Cell {
// 	let child = null;
// 	for (let i = depth; i >= 0; i--) {
// 		const container = suint(nSelector(i), bitlenSelector(i))
// 		if (child) {
// 			container.withReference(child);
// 		}
// 		child = container;
// 	}
// 	return child!;
// }
// {
// 	// 511 fails because can't send internal messages with depth >= 512
// 	// (and there is one extra indirection)
// 	for (const depth of [1, 10, 140, 255, 300, 510]) {
// 		await testCell(`Deep (d=${depth})`, depthTestCell(depth, d => d, d => d + 1));
// 	}
// 	for (const bitlen of [325, 330, 334, 339]) {
// 		await testCell(`Deep (bl=${bitlen})`, depthTestCell(510, d => d + 10, d => bitlen));
// 	}
// }

function randomTestCell(childCountDistribution: number[], maxDepth: number): Cell {
	function dfs(level: number): Cell {
		let contentLen = Math.floor(Math.random()**2 * 990) + 32;
		if (Math.random() < 0.05) contentLen = 1023;
		else if (Math.random() < 0.05) contentLen = 0;

		const res = contentLen < 32
			? cell()
			: suint(
				Math.floor(Math.random() * 1000**3),
				contentLen
			);
		if (level >= maxDepth) {
			return res;
		}

		let r = Math.random();
		let i;
		for (i = 0; i < childCountDistribution.length; i++) {
			if (r < childCountDistribution[i])
				break;
			r -= childCountDistribution[i];
		}

		const childCount = i;
		for (let i = 0; i < childCount; i++) {
			res.withReference(dfs(level + 1));
		}
		return res;
	}

	return dfs(0);
}
{
	//let maxDepth = 18;
	for (let ri = 0; ri < 100; ri++) {
		let cell = null;
		while (true) {
			cell = randomTestCell([0.4, 0.35, 0.1, 0.1], 80);
			// cell = randomTestCell([0.3, 0.35, 0.1, 0.1], 18);
			const totals = getCellTotals(cell);
			// if (totals.cells < 100) continue;
			if (totals.bits >= 2000000) continue;
			if (totals.cells >= 50000) continue;
			break;
		}
		await testCell(`Random`, cell);
	}
	// for (let maxDepth of [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]) {
	// 	await testCell(`Random`, randomTestCell([0.3, 0.35, 0.1, 0.1], maxDepth));
	// }
}


console.log(`All ${currentTestIndex} tests passed!`);
