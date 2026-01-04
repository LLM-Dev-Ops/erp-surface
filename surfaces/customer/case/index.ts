/**
 * Case Module Exports
 */

// Export contracts (main contract interfaces and types)
export {
  // Types
  CaseId,
  CaseNumber,
  ContactId,
  QueueId,
  AgentId,
  ResolutionId,
  CaseType,
  SLATarget,
  CaseProfile,
  ResolutionCode,
  EscalationType,

  // Contracts
  CreateCaseInput,
  CreateCaseOutput,
  CreateCaseContract,
  ResolveCaseInput,
  ResolveCaseOutput,
  ResolveCaseContract,
  EscalateCaseInput,
  EscalateCaseOutput,
  EscalateCaseContract,
  ReopenCaseInput,
  ReopenCaseOutput,
  ReopenCaseContract,

  // Preconditions and Postconditions
  createCasePreconditions,
  createCasePostconditions,
  resolveCasePreconditions,
  resolveCasePostconditions,
  escalateCasePreconditions,
  escalateCasePostconditions,
  reopenCasePreconditions,
  reopenCasePostconditions,

  // Surface Interface
  CaseSurface,

  // Helpers
  defaultSLATargets,
  calculateSLADeadline,
  generateCaseNumber,
} from './contracts';

// Export models (state machines and domain models)
export * from './models';

// Export events (observable event types)
export * from './events';
