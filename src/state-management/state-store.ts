import { IHandleState } from "./handle-state";
import { State } from "./state";
import { Subject, forkJoin, map, of, take, zip } from "rxjs";

export class StateStore {
  private stateMap: Map<string, State> = new Map();
  private intermediatesObject: any = {};
  onStepChanged?: (name: string, payload: any) => void;
  onFinished?: (name: string, payload: any) => void;
  onError?: (name: string, payload: any, error: string) => void;
  add<T>(
    name: string,
    handle: IHandleState<T>
  ): Pick<StateStore, "add" | "build" | "join"> {
    const subject = new Subject();
    this.stateMap.set(name, {
      name,
      subject,
      handle: async (payload) => {
        try {
          const response = await handle(payload);

          subject.next(response ?? {});
          this.onStepChanged?.(name, payload);
          const { next, result } = response;
          const nextSteps = next ?? [];
          if (nextSteps.length == 0) {
            this.onFinished?.(name, payload);
          }
          for (const nextStep of nextSteps) {
            await this.stateMap
              .get(nextStep)
              ?.handle({ from: name, payload: result });
          }
          return Promise.resolve({ next: undefined });
        } catch (err: any) {
          this.onError?.(name, payload, err.message);
          return { next: [] };
        }
      },
    });
    return this;
  }

  join(
    name: string,
    states: string[],
    redirect: string
  ): Pick<StateStore, "add" | "join" | "build"> {
    const stateList: State[] = [];
    for (const name of states) {
      const state = this.stateMap.get(name);
      if (!state) throw new Error(`state ${name} not found!`);
      stateList.push(state);
    }

    zip(stateList.map((f) => f.subject))
      .pipe(take(states.length))
      .subscribe((x) => {
        this.stateMap
          .get(redirect)!
          .handle({ from: name, payload: x.map((x) => x.result) });
      });

    return this;
  }

  build(payload: {
    onStepChanged: (name: string, payload: any) => void;
    onFinished: (name: string, payload: any) => void;
    onError: (name: string, payload: any, error: string) => void;
  }): Pick<StateStore, "execute"> {
    this.onError = payload.onError;
    this.onFinished = payload.onFinished;
    this.onStepChanged = payload.onStepChanged;
    return this;
  }
  execute(state: string, payload: any) {
    this.stateMap.get(state)?.handle({ from: undefined, payload });
  }
}
