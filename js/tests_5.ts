import BN from 'bn.js';
import { Address, CommentMessage, Slice } from 'ton';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults, dummyInternalMessage, internalMessage, dummyAddress, suint, invokeGetMethodWithResultsAndLogs } from './shared.js';


let compiledSources = contractLoader('./../func/stdlib.fc', './../func/5.fc');

const factor_denominator = 65536;

type ParticipateRequest = {
	wc: number,
	addrHash: number,
	stake: number,
	maxFactor: number,
};

type RawResultEntry = [Slice, BN];

type ResultEntry = {
	wc: number,
	addrHash: number,
	amount: number,
};

function parseRawResultEntry(raw: RawResultEntry): ResultEntry {
	const [cs, amount] = raw;
	
	const address = cs.readAddress()!;

	return {
		wc: address.workChain,
		addrHash: cell(address.hash).beginParse().readUintNumber(256),
		amount: amount.toNumber(),
	}
}

async function testElection(...requests: ParticipateRequest[]) {
	console.log(`--------- New iteration ${requests.length} requests ---------`);
	let contract = await compiledSources(cell());

	const participants = new Set<string>();

	for (let i = 0; i < requests.length; i++) {
		const { wc, addrHash, stake, maxFactor } = requests[i];

		participants.add(`${wc}_${addrHash}`);

		const executionResult = await contract.sendInternalMessage(
			internalMessage(
				new Address(wc, suint(addrHash, 256).beginParse().readRemainingBytes()), dummyAddress,
				stake, false,
				cell(
					suint(0x5ce28eea, 32), // participate request
					suint(0, 64), // query_id
					suint(maxFactor, 24),
				)
			)
		);

		if (executionResult.type !== 'success') {
			throw new Error(`Participation request message failed: i=${i}, request: ${JSON.stringify(requests[i], null, 4)}`);
		}
		//console.log(executionResult);
	}
	console.log('--------- try_elect ---------');

	const electQueryId = 900800700;
	const electResult = await contract.sendInternalMessage(dummyInternalMessage(
		cell(
			suint(0x207fa5f5, 32),
			suint(electQueryId, 64),
		)
	));

	if (participants.size < 5) {
		if (electResult.type !== 'failed') {
			throw new Error(`There are less than 5 participants, so try_elect should have failed `);
		}
		console.log(`There supposed to be an error because there aren't enough participants, and there is`);
	} else {
		if (electResult.type !== 'success') {
			throw new Error(`There were at least 5 participants, so try_elect should have suceeded`);
		}

		if (electResult.actionList.length === 0) {
			throw new Error(`No messages send by try_elect`);
		}
		if (electResult.actionList.length > 1) {
			throw new Error(`More than one action send by try_elect`);
		}
		const action = electResult.actionList[0];
		if (action.type !== 'send_msg') {
			throw new Error(`Action by contract is not 'send_msg'`);
		}
		if (action.mode !== 64) {
			throw new Error(`Message send by contract with wrong mode (${action.mode}), expected mode=64`);
		}

		const replyBody = action.message.body;
		const cs = replyBody.beginParse();
		// if (cs.remaining < 32) {
		// 	throw new Error(`Reply body is too short`);
		// }
		const op_code = cs.readUint(32).toNumber();
		if (op_code !== 0xeefa5ea4) {
			throw new Error(`Reply's body op_code should equal 0xeefa5ea4 (election success)`);
		}
		const query_id = cs.readUint(64).toNumber();
		if (query_id !== electQueryId) {
			throw new Error(`Reply's query_id (${query_id}) != expected (${electQueryId})`);
		}

		const total_winners = cs.readUint(32).toNumber();
		const total_effective_stake = cs.readCoins().toNumber();
		const unused_stake = cs.readCoins().toNumber();

		console.log(total_winners, total_effective_stake, unused_stake);

		if (cs.remaining > 0) {
			throw new Error(`Some garbage (${cs.remaining} bits) remaining in the reply after reading all the required fields`);
		}


		console.log('--------- get_stake_table ---------')
		const [[winners_raw, unused_raw], stakeTableLogs] = await
			invokeGetMethodWithResultsAndLogs
			<[RawResultEntry[], RawResultEntry[]]>(contract, 'get_stake_table', []);

		const winners = winners_raw.map(parseRawResultEntry);
		const unused = unused_raw.map(parseRawResultEntry);

		console.log('winners:', winners);
		console.log('unused:', unused);

		console.log('logs:', stakeTableLogs);
		console.log('try_elect.gas:', electResult.gas_consumed);
	}
	
	console.log()
}

// await testElection(
// 	{ wc: 5, addrHash: 5000, stake: 500, maxFactor: factor_denominator * 2 },
// 	{ wc: 31, addrHash: 3100, stake: 300, maxFactor: factor_denominator * 2 },
// 	{ wc: 11, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	{ wc: 12, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// );

try {
	await testElection(
		{ wc: 1, addrHash: 1001, stake: 100, maxFactor: 1 },
		{ wc: 1, addrHash: 1002, stake: 100, maxFactor: factor_denominator },
		{ wc: 1, addrHash: 1003, stake: 100, maxFactor: 1 },
		{ wc: 1, addrHash: 1004, stake: 100, maxFactor: 2 },
	
		{ wc: 1, addrHash: 1005, stake: 30, maxFactor: factor_denominator * 100 },
		{ wc: 1, addrHash: 1005, stake: 50, maxFactor: factor_denominator * 90 },
		{ wc: 1, addrHash: 1005, stake: 20, maxFactor: factor_denominator * 2 },
	
		{ wc: 3, addrHash: 3001, stake: 50, maxFactor: 10 },
		{ wc: 3, addrHash: 3001, stake: 35, maxFactor: 10 },
	);
} catch (ex) {
	console.error('Error:', ex);
}
// await testElection(
// 	...Array(5).fill(null).map((_, i) => ({ wc: i + 100, addrHash: i, stake: 100, maxFactor: factor_denominator })),
// 	...Array(100).fill(null).map((_, i) => ({ wc: i, addrHash: i, stake: 10, maxFactor: factor_denominator })),
// );

// await testElection(
// 	{ wc: 5, addrHash: 5000, stake: 500, maxFactor: factor_denominator * 2 },
// 	{ wc: 31, addrHash: 3100, stake: 300, maxFactor: factor_denominator * 2 },
// 	{ wc: 11, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	{ wc: 12, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	{ wc: 13, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	{ wc: 14, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	{ wc: 15, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	{ wc: 16, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	{ wc: 17, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	//{ wc: 18, addrHash: 1000, stake: 100, maxFactor: factor_denominator * 2 },
// 	{ wc: 2, addrHash: 2000, stake: 110, maxFactor: factor_denominator * 2 },
// 	{ wc: 2, addrHash: 2000, stake: 40, maxFactor: factor_denominator * 2 },
// 	{ wc: 2, addrHash: 2000, stake: 50, maxFactor: factor_denominator * 2 },
// 	{ wc: 6, addrHash: 6000, stake: 500, maxFactor: factor_denominator * 2 },
// 	{ wc: 6, addrHash: 6000, stake: 1, maxFactor: Math.floor(factor_denominator * 3) },
// 	// { wc: 32, addrHash: 3200, stake: 300, maxFactor: factor_denominator * 2 },
// 	{ wc: 4, addrHash: 4000, stake: 400, maxFactor: factor_denominator * 2 },
// 	{ wc: 100, addrHash: 10000, stake: 100000, maxFactor: factor_denominator * 100 },
// );

// await testElection(
// 	...(
// 		Object.entries({
// 		"0": {
// 		  "max_factor": 192076,
// 		  "stakeAmount": 1411,
// 		  "sender": "0"
// 		},
// 		"1": {
// 		  "max_factor": 377587,
// 		  "stakeAmount": 6671,
// 		  "sender": "1"
// 		},
// 		"2": {
// 		  "max_factor": 270950,
// 		  "stakeAmount": 8918,
// 		  "sender": "2"
// 		},
// 		"3": {
// 		  "max_factor": 302714,
// 		  "stakeAmount": 431,
// 		  "sender": "3"
// 		},
// 		"4": {
// 		  "max_factor": 111062,
// 		  "stakeAmount": 7158,
// 		  "sender": "4"
// 		}
// 	}).map(([k, v]) => ({
// 		wc: parseInt(k),
// 		addrHash: parseInt(k) * 1000,
// 		stake: v.stakeAmount,
// 		maxFactor: v.max_factor,
// 	}))
// 	)
// )
