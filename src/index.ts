import { forkJoin, of, timer } from "rxjs";
import { test } from "./test";
console.log("Application started");
export interface ITransfer {
  acc1: number;
  acc2: number;
  amount: number;
}
test();

const obervable = forkJoin({
  f1: of([1, 2, 3, 4]),
  f2: timer(4000),
});

obervable.subscribe(console.log);
