import { StateHandleReponse } from "./state";

export interface IHandleState<T> {
  (payload: IStatePayload<T>): Promise<StateHandleReponse>;
}
export interface IStatePayload<T> {
  from?: string;
  payload?: T;
}
