import { Decision, KillSwitchState } from './types.js';

export interface KillSwitchContext {
  spaceId: string;
  userId: string;
  activeBudgetStops: number;
  pendingApprovals: number;
  currentCost: number;
}

export interface KillSwitchDecision {
  active: boolean;
  action: 'continue' | 'pause' | 'stop';
  reason: string;
  escalationLevel?: 'warning' | 'critical';
}

export function checkKillSwitch(state: KillSwitchState | undefined, context: KillSwitchContext): KillSwitchDecision {
  if (!state || !state.active) {
    return {
      active: false,
      action: 'continue',
      reason: 'No active kill switch',
    };
  }
  
  return getKillSwitchAction(state.scope, context);
}

function getKillSwitchAction(scope: KillSwitchState['scope'], context: KillSwitchContext): KillSwitchDecision {
  const { activeBudgetStops, pendingApprovals } = context;
  
  if (scope === 'all') {
    return {
      active: true,
      action: 'stop',
      reason: 'Global kill switch is active. All operations stopped.',
      escalationLevel: 'critical',
    };
  }
  
  if (scope === 'run' && activeBudgetStops > 0) {
    return {
      active: true,
      action: 'stop',
      reason: `Run killed due to ${activeBudgetStops} budget limit(s) exceeded.`,
      escalationLevel: 'critical',
    };
  }
  
  if (scope === 'task' && pendingApprovals > 10) {
    return {
      active: true,
      action: 'pause',
      reason: 'Task paused due to excessive pending approvals.',
      escalationLevel: 'warning',
    };
  }
  
  return {
    active: true,
    action: 'continue',
    reason: 'Kill switch is active but current operation is allowed',
  };
}

export function shouldPauseForImportantTask(decision: Decision, isImportant: boolean): boolean {
  if (!isImportant) return false;
  return decision === 'ask';
}

export function getImportantTaskBehavior(decision: Decision, isImportant: boolean): 'auto' | 'pause' | 'stop' {
  if (!isImportant) {
    return decision === 'deny' ? 'stop' : 'auto';
  }
  
  if (decision === 'ask') {
    return 'pause';
  }
  
  return decision === 'deny' ? 'stop' : 'auto';
}

export function createKillSwitch(scope: KillSwitchState['scope'], reason: string): KillSwitchState {
  return {
    active: true,
    scope,
    reason,
    triggeredAt: new Date(),
  };
}

export function activateKillSwitch(state: KillSwitchState | undefined, scope: KillSwitchState['scope'], reason: string): KillSwitchState {
  return createKillSwitch(scope, reason);
}

export function deactivateKillSwitch(/* state: KillSwitchState | undefined */): KillSwitchState | undefined {
  return undefined;
}

export function formatKillSwitchReason(state: KillSwitchState): string {
  const scopes = {
    run: 'run',
    task: 'task',
    all: 'all operations',
  };
  
  const timestamp = state.triggeredAt?.toLocaleString() ?? 'Unknown time';
  
  return `Kill switch ${state.reason || 'activated'} for ${scopes[state.scope]} at ${timestamp}`;
}

export function getEscalationPath(decision: Decision, isImportant: boolean): {
  nextAction: 'continue' | 'pause' | 'stop';
  escalationLevel: 'none' | 'warning' | 'critical';
  message: string;
} {
  if (decision === 'deny') {
    return {
      nextAction: 'stop',
      escalationLevel: 'critical',
      message: 'Operation denied by policy',
    };
  }
  
  if (decision === 'ask' && isImportant) {
    return {
      nextAction: 'pause',
      escalationLevel: 'warning',
      message: 'Important task requires approval - paused',
    };
  }
  
  if (decision === 'ask' && !isImportant) {
    return {
      nextAction: 'stop',
      escalationLevel: 'warning',
      message: 'Task requires approval but is not marked important - stopped',
    };
  }
  
  return {
    nextAction: 'continue',
    escalationLevel: 'none',
    message: 'Operation allowed',
  };
}
