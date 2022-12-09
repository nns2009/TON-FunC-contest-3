import BN from 'bn.js';
import { CommentMessage } from 'ton';
import { stackInt } from 'ton-contract-executor';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults, dummyInternalMessage } from './shared.js';


let initialData = cell();
let contract = await contractLoader(['./../func/stdlib.fc', './../func/3.fc'], './../fift/3.fif')(initialData);

let totalGas = 0;
async function testExpression(expression: string) {
	//console.log('--------------');

	const messageBody = cell(new CommentMessage(expression));
	//console.log(messageBody);
	const executionResult = await contract.sendInternalMessage(
		dummyInternalMessage(messageBody)
	);
	totalGas += executionResult.gas_consumed;

	const answerEvaled = eval(expression);
	//console.log(executionResult.debugLogs);

	if (executionResult.actionList.length === 0) {
		throw new Error(`No messages send while processing expression: ${expression}`);
	}
	if (executionResult.actionList.length > 1) {
		throw new Error(`More than one action taken while processing expression: ${expression}`);
	}

	const action = executionResult.actionList[0];
	if (action.type !== 'send_msg') {
		throw new Error(`Action by contract is not 'send_msg'`);
	}

	if (action.mode !== 64) {
		throw new Error(`Message send by contract with wrong mode (${action.mode}), expected mode=64`);
	}

	const replyBody = action.message.body;
	const cs = replyBody.beginParse();
	if (cs.remaining < 32) {
		throw new Error(`Reply body is too short`);
	}
	const op_code = cs.readUint(32).toNumber();
	if (op_code !== 0) {
		throw new Error(`Reply's body op_code should equal 0 (comment message)`);
	}
	const replyComment = cs.readRemainingBytes().toString('ascii');
	console.log(`Reply: ${replyComment}, expression eval'ed: ${answerEvaled}`);

	const replyValue = int(replyComment);
}


await testExpression('7382');
await testExpression('300');
await testExpression('-8000');
await testExpression('2+5');
await testExpression('100-9');
await testExpression('1+'.repeat(300) + '1');
await testExpression('1+2+3+10+20-100-200-300');
// await testExpression('2*3*10*30/7/11*4');

console.log(`All tests finished. Gas: ${totalGas}`);
