import { Command, STEP_PHASE } from "./commands";

export type SagaDefinition = {
  stepName: string;
  phases: {
    [key in STEP_PHASE]: { command: Command } | undefined;
  };
  auto: boolean;
};
