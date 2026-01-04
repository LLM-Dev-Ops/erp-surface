/**
 * Customer Master Models
 * Defines state machines and domain models for customer management
 */

import { EntityId, ISODateTimeString, Money } from '../../common/types';

// ============================================================================
// Customer State Machine
// ============================================================================

export type CustomerState = 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface CustomerStateMachine {
  readonly currentState: CustomerState;
  readonly previousState?: CustomerState;
  readonly stateHistory: readonly CustomerStateHistoryEntry[];
  readonly enteredAt: ISODateTimeString;
}

export interface CustomerStateHistoryEntry {
  readonly fromState: CustomerState;
  readonly toState: CustomerState;
  readonly trigger: string;
  readonly triggeredBy: EntityId;
  readonly triggeredAt: ISODateTimeString;
  readonly reason?: string;
}

export const customerStateTransitionMatrix: Record<CustomerState, readonly CustomerState[]> = {
  PROSPECT: ['ACTIVE', 'INACTIVE'],
  ACTIVE: ['INACTIVE', 'BLOCKED'],
  INACTIVE: ['ACTIVE'],
  BLOCKED: ['ACTIVE'],
} as const;

export function canTransitionTo(
  currentState: CustomerState,
  targetState: CustomerState
): boolean {
  const allowedTransitions = customerStateTransitionMatrix[currentState];
  return allowedTransitions.includes(targetState);
}

export function createCustomerStateMachine(
  initialState: CustomerState = 'PROSPECT'
): CustomerStateMachine {
  return {
    currentState: initialState,
    previousState: undefined,
    stateHistory: [],
    enteredAt: new Date().toISOString(),
  };
}

export function transitionCustomerState(
  machine: CustomerStateMachine,
  targetState: CustomerState,
  trigger: string,
  triggeredBy: EntityId,
  reason?: string
): CustomerStateMachine {
  if (!canTransitionTo(machine.currentState, targetState)) {
    throw new Error(
      `Invalid state transition from ${machine.currentState} to ${targetState}`
    );
  }

  const historyEntry: CustomerStateHistoryEntry = {
    fromState: machine.currentState,
    toState: targetState,
    trigger,
    triggeredBy,
    triggeredAt: new Date().toISOString(),
    reason,
  };

  return {
    currentState: targetState,
    previousState: machine.currentState,
    stateHistory: [...machine.stateHistory, historyEntry],
    enteredAt: new Date().toISOString(),
  };
}

// ============================================================================
// Customer Segment Classification
// ============================================================================

export type CustomerSegment = 
  | 'ENTERPRISE'
  | 'MID_MARKET'
  | 'SMB'
  | 'STARTUP'
  | 'INDIVIDUAL';

export interface SegmentCriteria {
  readonly segment: CustomerSegment;
  readonly minRevenue?: Money;
  readonly maxRevenue?: Money;
  readonly minEmployees?: number;
  readonly maxEmployees?: number;
  readonly industries?: readonly string[];
}

export const segmentCriteriaDefinitions: readonly SegmentCriteria[] = [
  {
    segment: 'ENTERPRISE',
    minRevenue: { amount: 1000000000, currency: 'USD' },
    minEmployees: 10000,
  },
  {
    segment: 'MID_MARKET',
    minRevenue: { amount: 50000000, currency: 'USD' },
    maxRevenue: { amount: 1000000000, currency: 'USD' },
    minEmployees: 500,
    maxEmployees: 10000,
  },
  {
    segment: 'SMB',
    minRevenue: { amount: 5000000, currency: 'USD' },
    maxRevenue: { amount: 50000000, currency: 'USD' },
    minEmployees: 50,
    maxEmployees: 500,
  },
  {
    segment: 'STARTUP',
    maxRevenue: { amount: 5000000, currency: 'USD' },
    maxEmployees: 50,
  },
  {
    segment: 'INDIVIDUAL',
    maxEmployees: 1,
  },
];

export interface SegmentClassificationInput {
  readonly annualRevenue?: Money;
  readonly employeeCount?: number;
  readonly industry?: string;
}

export function classifyCustomerSegment(
  input: SegmentClassificationInput
): CustomerSegment {
  const { annualRevenue, employeeCount } = input;

  if (!annualRevenue && !employeeCount) {
    return 'INDIVIDUAL';
  }

  // Enterprise: $1B+ revenue or 10,000+ employees
  if (
    (annualRevenue && annualRevenue.amount >= 1000000000) ||
    (employeeCount && employeeCount >= 10000)
  ) {
    return 'ENTERPRISE';
  }

  // Mid-Market: $50M-$1B revenue or 500-10,000 employees
  if (
    (annualRevenue &&
      annualRevenue.amount >= 50000000 &&
      annualRevenue.amount < 1000000000) ||
    (employeeCount && employeeCount >= 500 && employeeCount < 10000)
  ) {
    return 'MID_MARKET';
  }

  // SMB: $5M-$50M revenue or 50-500 employees
  if (
    (annualRevenue &&
      annualRevenue.amount >= 5000000 &&
      annualRevenue.amount < 50000000) ||
    (employeeCount && employeeCount >= 50 && employeeCount < 500)
  ) {
    return 'SMB';
  }

  // Startup: <$5M revenue or <50 employees
  if (
    (annualRevenue && annualRevenue.amount < 5000000) ||
    (employeeCount && employeeCount > 1 && employeeCount < 50)
  ) {
    return 'STARTUP';
  }

  return 'INDIVIDUAL';
}

// ============================================================================
// Customer Hierarchy
// ============================================================================

export interface CustomerHierarchy {
  readonly rootCustomerId: EntityId;
  readonly parentCustomerId?: EntityId;
  readonly children: readonly CustomerHierarchyNode[];
  readonly level: number;
  readonly path: readonly EntityId[];
}

export interface CustomerHierarchyNode {
  readonly customerId: EntityId;
  readonly accountNumber: string;
  readonly legalName: string;
  readonly segment: CustomerSegment;
  readonly state: CustomerState;
  readonly children: readonly CustomerHierarchyNode[];
  readonly level: number;
}

export function buildCustomerHierarchy(
  rootCustomerId: EntityId,
  nodes: readonly CustomerHierarchyNode[],
  maxDepth: number = 10
): CustomerHierarchy {
  const rootNode = nodes.find((n) => n.customerId === rootCustomerId);
  
  if (!rootNode) {
    return {
      rootCustomerId,
      parentCustomerId: undefined,
      children: [],
      level: 0,
      path: [rootCustomerId],
    };
  }

  const buildTree = (
    nodeId: EntityId,
    allNodes: readonly CustomerHierarchyNode[],
    currentLevel: number
  ): readonly CustomerHierarchyNode[] => {
    if (currentLevel >= maxDepth) return [];

    return allNodes
      .filter((n) => n.customerId !== nodeId && n.level === currentLevel + 1)
      .map((child) => ({
        ...child,
        children: buildTree(child.customerId, allNodes, currentLevel + 1),
      }));
  };

  return {
    rootCustomerId,
    parentCustomerId: undefined,
    children: buildTree(rootCustomerId, nodes, 0),
    level: 0,
    path: [rootCustomerId],
  };
}

export function getHierarchyDepth(hierarchy: CustomerHierarchy): number {
  const calculateDepth = (nodes: readonly CustomerHierarchyNode[]): number => {
    if (nodes.length === 0) return 0;
    return 1 + Math.max(...nodes.map((n) => calculateDepth(n.children)));
  };

  return calculateDepth(hierarchy.children);
}

export function countNodesInHierarchy(hierarchy: CustomerHierarchy): number {
  const countNodes = (nodes: readonly CustomerHierarchyNode[]): number => {
    return nodes.reduce(
      (sum, node) => sum + 1 + countNodes(node.children),
      0
    );
  };

  return 1 + countNodes(hierarchy.children); // +1 for root
}

export function countActiveNodesInHierarchy(hierarchy: CustomerHierarchy): number {
  const countActive = (nodes: readonly CustomerHierarchyNode[]): number => {
    return nodes.reduce(
      (sum, node) =>
        sum +
        (node.state === 'ACTIVE' ? 1 : 0) +
        countActive(node.children),
      0
    );
  };

  return countActive(hierarchy.children);
}

// ============================================================================
// Customer Relationship Types
// ============================================================================

export type CustomerRelationshipType =
  | 'PARENT_CHILD'
  | 'AFFILIATE'
  | 'PARTNER'
  | 'RESELLER'
  | 'DISTRIBUTOR';

export interface CustomerRelationship {
  readonly relationshipId: EntityId;
  readonly sourceCustomerId: EntityId;
  readonly targetCustomerId: EntityId;
  readonly relationshipType: CustomerRelationshipType;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly isPrimary: boolean;
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// Credit Status
// ============================================================================

export type CreditStatus = 'GOOD_STANDING' | 'WARNING' | 'ON_HOLD' | 'SUSPENDED';

export interface CustomerCreditInfo {
  readonly creditLimit: Money;
  readonly availableCredit: Money;
  readonly outstandingBalance: Money;
  readonly creditStatus: CreditStatus;
  readonly lastCreditReviewDate?: string;
  readonly nextCreditReviewDate?: string;
  readonly paymentScore?: number;
}

export function calculateCreditStatus(
  creditInfo: Omit<CustomerCreditInfo, 'creditStatus'>
): CreditStatus {
  const utilizationRate =
    creditInfo.creditLimit.amount > 0
      ? (creditInfo.creditLimit.amount - creditInfo.availableCredit.amount) /
        creditInfo.creditLimit.amount
      : 0;

  if (utilizationRate >= 1.0) {
    return 'SUSPENDED';
  }

  if (utilizationRate >= 0.9) {
    return 'ON_HOLD';
  }

  if (utilizationRate >= 0.75) {
    return 'WARNING';
  }

  return 'GOOD_STANDING';
}

// ============================================================================
// Customer Tags and Categories
// ============================================================================

export interface CustomerTag {
  readonly name: string;
  readonly category: string;
  readonly color?: string;
  readonly createdAt: ISODateTimeString;
  readonly createdBy: EntityId;
}

export interface CustomerCategory {
  readonly categoryId: EntityId;
  readonly name: string;
  readonly description?: string;
  readonly parentCategoryId?: EntityId;
  readonly sortOrder: number;
}
