import BN from 'bn.js';
import { CommentMessage } from 'ton';
import { stackInt } from 'ton-contract-executor';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults, dummyInternalMessage } from './shared.js';


let initialData = cell();
let contract = await contractLoader('./../func/stdlib.fc', './../func/3.fc')(initialData);

async function testExpression(expression: string) {
	const executionResult = contract.sendInternalMessage(dummyInternalMessage(cell(new CommentMessage(expression))));
	console.log(`Correct:`, eval(expression));
	console.log(executionResult);
	console.log('--------------');
}


await testExpression('300');
await testExpression('-8000');
await testExpression('2+5');
await testExpression('100-9');
await testExpression('1+2+3+10+20-100-200-300');
await testExpression('2*3*10*30/7/11*4');
