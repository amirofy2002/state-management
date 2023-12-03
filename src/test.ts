import { StateStore } from "./state-management/state-store";
import { ITransfer } from ".";

export function test() {
  const accounts = {
    acc1: 1000,
    acc2: 10,
  };
  const store = new StateStore();
  const st = store
    .add<ITransfer>("check balance", async ({ from, payload }) => {
      console.log("check balance", { from, payload });
      if (accounts.acc1 <= 0) throw new Error("insuffient fund!");

      return {
        next: ["debit"],
        result: payload,
      };
    })
    .add<ITransfer>("debit", async ({ from, payload }) => {
      console.log("debit", { from, payload });
      accounts.acc1 = accounts.acc1 - payload!.amount;
      return {
        next: ["credit"],
        result: { ...payload, cur: "debit" },
      };
    })
    .add<ITransfer>("credit", async ({ from, payload }) => {
      console.log("credit", { from, payload });
      accounts.acc2 = accounts.acc2 + payload!.amount;
      return {
        next: [],
        result: { ...payload, cur: "creidt" },
      };
    })
    .add("save", async ({ from, payload }) => {
      console.log("save", { from, payload });
      console.log({ accounts });
      return {
        next: undefined,
      };
    })
    .add("print", async ({ from, payload }) => {
      console.dir({ from, payload }, { depth: null });
      return {
        next: undefined,
      };
    })
    .join("finalization", ["credit", "debit"], "save")

    .build({
      onError: (name, payload, error) => {
        console.log(`onError: ${name} : ${error}`);
      },
      onFinished: (name, payload) => {
        //console.log(`onFinished: ${name}`, { payload });
      },
      onStepChanged: (name, payload) => {
        //console.log(`STEP CHANGED: ${name}`);
      },
    });

  st.execute("check balance", { acc1: 1, acc2: 2, amount: 10 });
}
