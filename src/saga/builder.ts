import { Command, STEP_PHASE } from "./commands";
import { SagaDefinition } from "./defenition";
import { SagaProcessor } from "./processor";

export type MessageFormatterPayload = {
  message: string;
  body: any;
  groupId: string;
  index: number;
  thread: string;
  move: STEP_PHASE;
  url: string;
};

export type StepChangedPayload = {
  from: string;
  to: string;
  thread: string;
  payload: any;
  move: STEP_PHASE;
};

export type FinshedPayload = {
  payload: any;
  rollbacked: boolean;
};

export class SagaDefinitionBuilder {
  private readonly logger = console;
  index: number = 0;
  sagaDefinitions: SagaDefinition[] = [];
  name: string;
  onStepChanged: (payload: StepChangedPayload) => void;
  onFinished: (payload: FinshedPayload) => void;

  constructor({
    name,
    onStepChanged,
    onFinished,
  }: {
    name: string;
    onStepChanged: (payload: StepChangedPayload) => void;
    onFinished: (payload: FinshedPayload) => void;
  }) {
    this.name = name;
    this.onStepChanged = onStepChanged;
    this.onFinished = onFinished;
  }

  step(stepName: string, auto = true): Pick<SagaDefinitionBuilder, "onReply"> {
    this.index = this.index === null ? 0 : this.index + 1;
    this.sagaDefinitions = [
      ...this.sagaDefinitions,
      {
        stepName,
        phases: {
          STEP_BACKWARD: undefined,
          STEP_FORWARD: undefined,
        },
        auto,
      },
    ];
    return this;
  }

  onReply(
    command: Command
  ): Pick<SagaDefinitionBuilder, "build" | "onRollback"> {
    this.checkIndex();
    this.sagaDefinitions[this.index].phases[STEP_PHASE.STEP_FORWARD] = {
      command,
    };
    return this;
  }

  onRollback(command: Command): Pick<SagaDefinitionBuilder, "build" | "step"> {
    this.checkIndex();
    this.sagaDefinitions[this.index].phases[STEP_PHASE.STEP_BACKWARD] = {
      command,
    };
    return this;
  }

  private checkIndex() {
    if (this.index === null) {
      throw new Error(
        "before build saga definition, you need to invoke step function before"
      );
    }
  }

  async build() {
    const sagaProcessor = new SagaProcessor({
      sagaDefinitions: this.sagaDefinitions,
      onFinished: this.onFinished,
      onStepChanged: this.onStepChanged,
    });

    sagaProcessor.init();
    return sagaProcessor;
  }
}
