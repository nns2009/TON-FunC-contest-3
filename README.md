# TON FunC Contest #3 - solutions and (partial) tests
?? These are my solutions and (partial) tests for the TON Foundations's 3rd smart contract developement contest for TON blockchain:

https://ton.org/ton-smart-challenge-3

https://github.com/ton-blockchain/func-contest3


## ?? Project structure

- `/func` - my contest solutions (all tasks, but 3rd one is generated)
- `/js` - TypeScript (partial) tests (all tasks) and 3rd task solution

## Running TypeScript tests
Install TypeScript and project dependencies (once, in the root folder):
```
npm install -g typescript
npm install -g ts-node
npm install
```

To lanuch tests, run (from the root folder):
```
node --no-experimental-fetch --loader ts-node/esm ./js/tests_N.ts
```

You might also just try:
```
ts-node-esm ./js/tests_N.ts
```
but it doesn't work for me in Node 18.X

## ?? Tests details

Tests for this contest are nearly not as thourough as [my tests for TON Contest #1] (https://github.com/nns2009/TON-FunC-contest-1) because solutions were evaluated and scored immediately, so I could just sent my solutions without much testing.

### Task 1 and 5
Have some legit automatic tests
### Task 3
A few quick manual tests, but no auto-checking, use visual inspection of results
### Task 2 and 4
No real testing, test-files are only there to launch contracts and make sure they compile. I submitted my solutions without testing and they just worked.

## Errors

### Windows, Linux
If you are not on Mac, you'll get something like:
```
/bin/sh: 1: /root/TON-FunC-contest-1/node_modules/ton-compiler/bin/macos/func: Exec format error
/root/TON-FunC-contest-1/node_modules/ton-contract-executor/dist/vm-exec/vm-exec.js:147
      throw ex;
```
that's because `ton-compiler` package only officially works on MacOS. I found a way to fix it on Windows: [install](https://github.com/ton-blockchain/ton/actions/runs/2830772466) (unpack) TON binaries and then replace the contents of `macos` folder from above with the the content of this TON binaries folder (the one containing `func.exe`, `fift.exe`). It should work after this. Same thing works for Ubuntu/WSL.

It's _probably_ not necessary to copy the entire TON binaries folder. _Maybe_ copying just `func.exe` and `fift.exe` is enough. But I didn't try. Storage is cheap.

Based on my previous contest repo: https://github.com/nns2009/TON-FunC-contest-2

# Author
### Igor Konyakhin
Telegram: [@nns2009](https://t.me/nns2009) <br>
YouTube: [Awesome GameDev](https://www.youtube.com/channel/UCZacxOhkmPS2cklzU1_Ya9Q) <br>
https://codeforces.com/profile/nns2009 <br>
https://vk.com/nns2009 <br>
https://facebook.com/nns2009
