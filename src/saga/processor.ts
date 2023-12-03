import EventEmitter from "events";
import { FinshedPayload, StepChangedPayload } from "./builder";
import { Payload, STEP_PHASE } from "./commands";
import { SagaDefinition } from "./defenition";
import { randomBytes } from "crypto";

export type SendingMessagePayload = {
  index: number;
  thread: string;
  msg: string;
  body: any;
  move: STEP_PHASE;
};

export type CacheSetting = {
  stepOutput: any;
  currentMovement: STEP_PHASE;
  tryCount: number;
  currentIndex: number;
  transactionId: string;
  messageIds: string[];
};
export class SagaProcessor {
  private readonly logger = console;

  private sagaDefinitions: SagaDefinition[];
  private onFinished: (payload: FinshedPayload) => void;
  private onStepChanged: (payload: StepChangedPayload) => void;

  private eventManager = new EventEmitter();

  constructor({
    sagaDefinitions,
    onFinished,
    onStepChanged,
  }: {
    sagaDefinitions: SagaDefinition[];
    onFinished: (payload: FinshedPayload) => void;
    onStepChanged: (payload: StepChangedPayload) => void;
  }) {
    this.sagaDefinitions = sagaDefinitions;

    this.onFinished = onFinished;
    this.onStepChanged = onStepChanged;
  }

  on(
    event: "step-changing" | "step-changed" | "error" | "warning",
    callback: (data: any) => void
  ) {
    this.eventManager.on(event, callback);
  }

  static initialized = false;

  init() {
    if (SagaProcessor.initialized) return;

    SagaProcessor.initialized = true;
  }

  private _getCommand(index: number, move: STEP_PHASE) {
    const auto = this.sagaDefinitions[index].auto;
    const name = this.sagaDefinitions[index].stepName;
    try {
      const COMMAND = this.sagaDefinitions[index].phases[move]?.command;
      return { COMMAND, name, auto };
    } catch (err) {
      const errorMessage = `the selected index (${index}) does not exist in the defenition`;
      this.eventManager.emit("error", { err: errorMessage, index, move, name });
      return;
    }
  }

  private async process({ thread, index, move, payload, tryCount }: Payload) {
    const commmand = this._getCommand(index, move);
    if (!commmand) return;
    const { COMMAND, name, auto } = commmand;
    const { transaction } = payload;
    if (!COMMAND) return;
    try {
      const response = await COMMAND({
        index,
        move,
        payload,
        thread,
        tryCount,
      });

      this.handleNextStep(response.output, thread, auto, move, index);

      const nextStep = this._getNextStep(index, move);
      this.logger.log(
        {
          meta_data: {
            thread: thread,
            transaction_id: transaction?.id,
            index,
            name,
            move,

            nextStep,
          },
        },
        `STEP:${name}:${move}:Done`
      );
      this.onStepChanged({
        from: name,
        to: nextStep!,
        thread,
        payload: { ...payload, move },
        move,
      });
    } catch (e) {
      this.logger.error(
        {
          meta_data: {
            thread: thread,
            transaction_id: transaction?.id,
            index,
            name,
            move,
            error: e,
          },
        },
        `STEP:${name}:${move}:Error`
      );
      await this.makeStepBackward(thread, index, payload, 0);
    }
  }

  private _getNextStep(index: number, move: STEP_PHASE) {
    if (move == STEP_PHASE.STEP_BACKWARD && index <= 0) return;
    return this.sagaDefinitions[
      index + (move == STEP_PHASE.STEP_FORWARD ? 1 : -1)
    ]?.stepName;
  }

  private async handleNextStep(
    response: any,
    thread: string,
    auto: boolean,
    move: STEP_PHASE,
    index: number
  ) {
    const stepOutput = response;
    const cacheKey = `mem:${thread}`;

    let tryCount = 0;

    if (auto) {
      if (move == STEP_PHASE.STEP_FORWARD)
        return this.makeStepForward(thread, index, response, tryCount);
      else return this.makeStepBackward(thread, index, response, tryCount);
    }
  }

  async makeStepForward(
    thread: string,
    index: number,
    payload: any,
    tryCount: number
  ) {
    if (index + 1 >= this.sagaDefinitions.length) {
      const { transaction } = payload;
      this.logger.log(
        {
          meta_data: {
            thread,
            index,
            transaction_id: transaction?.id,
          },
          payload,
        },
        `Saga finished and transaction successful`
      );
      this.onFinished({
        payload: {
          meta_data: {
            thread,
            index,
            transaction_id: transaction?.id,
          },
          payload,
        },
        rollbacked: false,
      });
      return;
    }

    return this.process({
      index: index + 1,
      move: STEP_PHASE.STEP_FORWARD,
      thread,
      payload,
      tryCount,
    });
  }

  async makeStepBackward(
    thread: string,
    index: number,
    payload: any,
    tryCount: number
  ) {
    if (index <= 0) {
      this.logger.log(
        {
          meta_data: {
            thread,
            index,
          },
        },
        `Saga finished and transaction rolled back`
      );
      this.onFinished({
        payload: {
          meta_data: {
            thread,
            index,
          },
          payload,
        },
        rollbacked: true,
      });
      return;
    }

    return this.process({
      index: index - 1,
      move: STEP_PHASE.STEP_BACKWARD,
      thread,
      payload,
      tryCount,
    });
  }

  async start(payload: { req: any }) {
    const id = randomBytes(5).toString("hex");
    const cacheKey = `mem:${id}`;

    this.logger.log(
      {
        meta_data: {
          payload,
        },
      },
      "SagaStarted"
    );

    this.process({
      index: 0,
      move: STEP_PHASE.STEP_FORWARD,
      payload,
      thread: id,
      tryCount: 0,
    });
  }
}
