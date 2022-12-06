import fs from 'fs';

import { compileFunc } from "@ton-community/func-js";
import executor, { GasLimits, SmartContract, TVMExecutionResult, TVMStack } from "ton-contract-executor";
import ton, { Address, Cell, Slice, Builder, InternalMessage, ExternalMessage, CommonMessageInfo, CellMessage, toNano, Contract, Message, StateInit, TonClient } from "ton";
import BN from "bn.js";
import seedrandom from 'seedrandom';




// ------------------------ Various ------------------------

export const approximatelyEqual = (a: number, b: number, allowedError: number) =>
	Math.abs(a - b) < allowedError;

export const sleep = (seconds: number) =>
	new Promise((resolve, _) => setTimeout(resolve, seconds * 1000));

export function groupsOfSize<T>(array: T[], groupSize: number): T[][] {
	const res = [];

	for (let i = 0; i < array.length; i += groupSize) {
		res.push(array.slice(i, i + groupSize));
	}

	return res;
}

export function arrayRepeat<T>(array: T[], repeatCount: number): T[] {
	return [].concat(...Array(repeatCount).fill(array));
}



// ------------------------ String functions ------------------------

export function readString(filename: string): string {
	return fs.readFileSync(new URL(filename, import.meta.url), 'utf-8');
}


export function reverseString(str:string): string {
	return str.split("").reverse().join("");
}


export function bufferEqual(a: Buffer, b: Buffer): boolean {
	return Buffer.compare(a, b) === 0;
}



// ------------------------ Contract functions ------------------------

export const contractLoader = (...filenames: string[]) => {
	const compileResultPromise = compileFunc({
		sources: Object.fromEntries(
			filenames.map(path =>
				[path.split('/').at(-1), readString(path)]
			)),
		entryPoints: [filenames.at(-1)?.split('/').at(-1)!],
	})

	return async (dataCell: Cell) => {
		const compileResult = await compileResultPromise;

		if (compileResult.status === 'error')
			throw new Error('Compilation failed: ' + compileResult.message);
	
		return await SmartContract.fromCell(
			Cell.fromBoc(Buffer.from(compileResult.codeBoc, 'base64'))[0],
			dataCell,
		)
	}
};

export async function invokeGetMethodWithResults<T>(
	contract: SmartContract,
	method: string,
	args: TVMStack,
	opts?: { gasLimits?: GasLimits | undefined; } | undefined
): Promise<T> {
	const exres = await contract.invokeGetMethod(method, args, opts);
	if (exres.type !== 'success' || exres.exit_code > 0) {
		throw new Error(`exit_code = ${exres.exit_code}, ${exres.logs}`);
	}

	const { result } = exres;
	const value = result as T;

	return value;
}

export async function invokeGetMethod1Result<T>(
	contract: SmartContract,
	method: string,
	args: TVMStack,
	opts?: { gasLimits?: GasLimits | undefined; } | undefined
): Promise<T> {
	const results = await invokeGetMethodWithResults<[T]>(contract, method, args, opts);
	return results[0];
}




// ------------------------ Random generators ------------------------

export const createRandomGenerator = (rand: seedrandom.PRNG) => {
	function randomRange(min: number, max:number): number {
		return rand() * (max - min) + min;
	}

	function randomInt(min: number, max:number): number {
		return Math.floor(rand() * (max - min)) + min;
	}

	function randomChoice<T>(array: T[]): T {
		return array[randomInt(0, array.length)];
	}

	function randomBits(bitLength: number): Cell {
		const c = new Cell();
		for (let i = 0; i < bitLength; i++) {
			c.bits.writeBit(rand.int32() & 1);
		}
		return c;
	}

	return {
		range: randomRange,
		int: randomInt,
		choice: randomChoice,
		bits: randomBits,
	};
};



// ------------------------ Bit generation ------------------------

export function xbits(x: number, bitLength: number): Cell {
	if (x !== 0 && x !== 1)
		throw new Error(`xbits: incorrect x=(${x})`);

	const c = new Cell();
	for (let i = 0; i < bitLength; i++) {
		c.bits.writeBit(x);
	}
	return c;
}
export const zeros = (bitLength: number) => xbits(0, bitLength);
export const ones = (bitLength: number) => xbits(1, bitLength);




// ------------------------ Bit manipulations ------------------------

export const bits2number = (c: Cell) => parseInt(c.bits.toString(), 2);
export const bits2int = (c: Cell) => int(c.bits.toString(), 2);
export const bits2string = (c: Cell) => bits2int(c).toString('hex');




// ------------------------ Cell manipulations ------------------------

export const builder = () => new Builder();
export const int = (value: number | string | Buffer, base?: number) => new BN(value, base);
export const slice = (cell: Cell) => Slice.fromCell(cell);

export const sint = (value: number | BN, bitLength: number) => builder().storeInt(value, bitLength).endCell();
export const suint = (value: number | BN, bitLength: number) => builder().storeUint(value, bitLength).endCell();

export const saddress = (value: Address | null) => builder().storeAddress(value).endCell();
export const sgrams = (value: number | BN) => builder().storeCoins(value).endCell();
export const sstring = (value: string) => builder().storeBuffer(Buffer.from(value, 'utf-8')).endCell();
export const scomment = (value: string) => cell(zeros(32), sstring(value));

export const cell = (...content: (Cell | Buffer | Message)[]) => {
	// const b = builder();
	const c = new Cell();

	for (let v of content) {
		if (v instanceof Cell) {
			c.writeCell(v);
		} else if (Buffer.isBuffer(v)) {
			c.bits.writeBuffer(v);
		} else {
			v.writeTo(c);
		}
	}

	return c;
};

export const cellToBoc = (cell: Cell) => {
	return cell.toBoc({idx: false}).toString('base64');
}
export const bocToCell = (boc: string) => {
	return Cell.fromBoc(Buffer.from(boc, 'base64'))[0];
}
export const sliceEqual = (a: Slice, b: Slice) =>
	a.toCell().equals(b.toCell());

export const addressEqual = (a: Address | null, b: Address | null) =>
	(!a && !b) || (a && b && a.equals(b));




// ------------------------ Messages ------------------------

export const internalMessage = (
	fromAddress: Address, toAddress: Address,
	value: number | BN, bounce: boolean,
	body: Cell | undefined, stateInit?: StateInit
) => new InternalMessage({
	from: fromAddress,
	to: toAddress,
	value,
	bounce,
	body: new CommonMessageInfo({
		stateInit,
		body: body ? new CellMessage(body) : undefined,
	}),
});

export const dummyInternalMessage = (body: Cell) => internalMessage(
	Address.parse('EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC'),
	Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'),
	toNano(333),
	false,
	body,
);

export const externalMessage = (address: Address, body: Cell | undefined, stateInit?: StateInit) => new ExternalMessage({
	to: address,
	body: new CommonMessageInfo({
		stateInit,
		body: body ? new CellMessage(body) : undefined,
	}),
});

export const dummyExternalMessage = (body: Cell) =>
	externalMessage(
		Address.parse('EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t'),
		body
	);




// ------------------------ Assertions ------------------------

export function assertEmpty(value: Slice) {
	if (value.remaining != 0) {
		throw new Error(`remaining bits: ${value.remaining}, value: ${value}`);
	}
	if (value.remainingRefs != 0) {
		throw new Error(`remaining refs: ${value.remainingRefs}, value: ${value}`);
	}
}
export function assertExitSuccess(result: TVMExecutionResult) {
	if (!result.ok) {
		throw new Error(`exit_code = ${result.exit_code}`);
	}
}




// ------------------------ Contract functions ------------------------

export async function retryInvoke(
	tonClient: TonClient,
	maxRetries: number,
	address: Address, methodName: string,
) {
	for (let i = 0; i < maxRetries - 1; i++) {
		try {
			return await tonClient.callGetMethodWithError(address, methodName);
		} catch (ex) {
			await sleep(1.6);
		}
	}
	try {
		return await tonClient.callGetMethodWithError(address, methodName);
	} catch (ex) {
		console.error('retryInvoke failed:', maxRetries, address, methodName);
		throw ex;
	}
}


export const executeExternal = (contract: SmartContract, cell: Cell) =>
	contract.sendExternalMessage(dummyExternalMessage(cell));


