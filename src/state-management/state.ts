import { Subject } from "rxjs";
import { IStatePayload } from "./handle-state";

export type StateHandleReponse = {
  next?: string[];
  result?: any;
};

export abstract class State {
  abstract name: string;
  abstract subject: Subject<any>;
  abstract handle(payload: IStatePayload<any>): Promise<StateHandleReponse>;
}
