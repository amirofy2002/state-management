export interface IPreparedMessage {
  message: string;
  body: any;
  queu: string;
}

export type Payload = {
  thread: string;
  index: number;
  payload: any;
  move: STEP_PHASE;
  tryCount: number;
};

export interface IGeneralOutput {
  output: any;
}
export type Command<P = Payload, RES = IGeneralOutput> = (
  payload: P
) => Promise<RES>;
// export type PrepareMessageCommand<P = Payload, RES = IPreparedMessage> = (
//   payload?: P
// ) => Promise<RES>;

export enum STEP_PHASE {
  STEP_FORWARD = "STEP_FORWARD",
  STEP_BACKWARD = "STEP_BACKWARD",
}

export type SagaMessage<P = any> = {
  payload: P;
  saga: {
    index: number;
    phase: STEP_PHASE;
    thread: string;
  };
};
