import { UntrustedInputState } from './types.js';

export function markAsUntrusted(
  content: string,
  source: string,
  contentPreview?: string
): UntrustedInputState {
  return {
    isTainted: true,
    source,
    contentPreview: contentPreview ?? content.slice(0, 200) + (content.length > 200 ? '...' : ''),
  };
}

export function isUntrusted(content: string): boolean {
  const suspiciousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /\$\{.*\}/,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /require\s*\(/i,
  ];
  
  return suspiciousPatterns.some((pattern) => pattern.test(content));
}

export function shouldTaintAction(
  tier: number,
  hasUntrustedInput: boolean
): boolean {
  return hasUntrustedInput && tier >= 2;
}

export function getUntrustedInputRecommendation(state: UntrustedInputState): string {
  if (!state.isTainted) return 'Input is trusted';
  
  return `Review untrusted input from ${state.source || 'unknown source'} before proceeding`;
}

export function stripInstructionsFromUntrusted(content: string): string {
  const lines = content.split('\n');
  
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim().toLowerCase();
    const instructionStarts = ['you should', 'you must', 'please', 'ask', 'do', 'implement', 'fix', 'change', '- do', '- implement', '- fix', '- change'];
    return !instructionStarts.some((prefix) => trimmed.startsWith(prefix));
  });
  
  return filteredLines.join('\n');
}

export function createUntrustedEventMetadata(
  state: UntrustedInputState,
  actionTier: number
): {
  label: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  showSource: boolean;
} {
  const severity: 'low' | 'medium' | 'high' | 'critical' = actionTier >= 3
    ? 'critical'
    : actionTier === 2
    ? 'high'
    : actionTier === 1
    ? 'medium'
    : 'low';
  
  return {
    label: 'Untrusted Input',
    severity,
    showSource: state.source != null,
  };
}
