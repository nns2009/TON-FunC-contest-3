# TON FunC Contest #3 - solutions and (partial) tests
These are my solutions and (partial) tests for the TON Foundations's 3rd smart contract developement contest for TON blockchain:

https://ton.org/ton-smart-challenge-3

https://github.com/ton-blockchain/func-contest3


## Project structure

- `/func` - my contest solutions
- `/js` - TypeScript tests

## Running TypeScript tests
Install TypeScript and project dependencies (once, in the root folder):
```
npm install -g typescript
npm install -g ts-node
npm install
```

To lanuch tests, run (from the root folder):
```
ts-node-esm ./js/tests_N.ts
```
`ReadMe` from my previous FunC contest said to run:
```
node --no-experimental-fetch --loader ts-node/esm ./js/tests_N.ts
```
but it wasn't necessary for me this time, <br />
but I'll leave it just in case `ts-node-esm` alone doesn't work for you.

## Tests details

In tasks 1 and 5 some tests are commented out.

### Task 1
Legit automatic tests, but primarily generates Trees, instead of Directed-Acyclic-Graphs, so solution passing these tests could still fail on test #3 in the contest testing system.

### Task 2
No real testing, test-files are only there to launch the contract and make sure it compiles. I submitted my solutions of this task without testing and they just worked.

### Task 3
Basic testing against JavaScript's built-in `eval()` function. Very limited, because in JavaScript:
- Division produces floating-point numbers
- Numbers are float-64 (unlike FunC's int-257)

so to test division and big integers properly, I would have to code parsing and computation once again, but in JS. Or I could just not test it:)

### Task 4
A few tests of addition and multiplication. I initially wrote the whole solution in Python (take a look at `/func/4_**.py` files) before re-writing everything in FunC.

It took much more time than I anticipated to find the correct formulas for addition and multiplication. After extensive googling and searching through 20+ tabs with each having it's own formulas for the curve, I eventually dug out these sources with formulas that worked:
- Addition: https://www.intechopen.com/chapters/68653
- Multiplication: https://www.cl.cam.ac.uk/teaching/2122/Crypto/curve25519.pdf

### Task 5
Some tests, but no auto-checking, use "visual inspection" of the output:)

## Errors

### Windows, Linux
This is based on my previous contest repo: https://github.com/nns2009/TON-FunC-contest-2 <br />
I was doing it on Mac this time and I am not sure if the paragraph below is relevant anymore.

If you are not on Mac, you'll get something like:
```
/bin/sh: 1: /root/TON-FunC-contest-1/node_modules/ton-compiler/bin/macos/func: Exec format error
/root/TON-FunC-contest-1/node_modules/ton-contract-executor/dist/vm-exec/vm-exec.js:147
      throw ex;
```
that's because `ton-compiler` package only officially works on MacOS. I found a way to fix it on Windows: [install](https://github.com/ton-blockchain/ton/actions/runs/2830772466) (unpack) TON binaries and then replace the contents of `macos` folder from above with the the content of this TON binaries folder (the one containing `func.exe`, `fift.exe`). It should work after this. Same thing works for Ubuntu/WSL.

It's _probably_ not necessary to copy the entire TON binaries folder. _Maybe_ copying just `func.exe` and `fift.exe` is enough. But I didn't try. Storage is cheap.


# Author
### Igor Konyakhin
Telegram: [@nns2009](https://t.me/nns2009) <br>
YouTube: [Awesome GameDev](https://www.youtube.com/channel/UCZacxOhkmPS2cklzU1_Ya9Q) <br>
https://codeforces.com/profile/nns2009 <br>
https://vk.com/nns2009 <br>
https://facebook.com/nns2009
