import { contractLoader, cell } from './shared.js';


let initialData = cell();
let contract = await contractLoader('./../func/stdlib.fc', './../func/5.fc')(initialData);
