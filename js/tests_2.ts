import BN from 'bn.js';
import { stackInt } from 'ton-contract-executor';

import { contractLoader, cell, int, invokeGetMethod1Result, invokeGetMethodWithResults } from './shared.js';


let initialData = cell();
let contract = await contractLoader('./../func/stdlib.fc', './../func/2.fc')(initialData);
