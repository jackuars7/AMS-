/**
 * Authorization Policy Engine (AM-38 to AM-44)
 * Enforces server-side Segregation of Duties (SoD), four-eyes approvals,
 * and guards against autonomous AI decision-making.
 */

import { RoleId } from '../../types/index.ts';

export class AuthorizationPolicyEngine {
  /**
   * Enforces Maker-Checker Segregation of Duties: Checker cannot be the Maker.
   */
  public static assertNoSelfApproval(
    makerId: string,
    checkerId: string,
    action: string = 'approve this submission'
  ): void {
    if (!makerId || !checkerId) return;
    if (makerId.toLowerCase() === checkerId.toLowerCase()) {
      throw new Error(
        `Segregation of Duties Violation (AM-41): Maker (${makerId}) cannot ${action}. A distinct four-eyes reviewer is mandatory.`
      );
    }
  }

  /**
   * Asserts that an operation is performed by a qualified human, never autonomous AI.
   */
  public static assertHumanDecision(
    actor: { id: string; role: RoleId; isAi?: boolean },
    decisionType: string
  ): void {
    if (actor.isAi || actor.id.toLowerCase().includes('ai') || actor.id.toLowerCase().includes('bot')) {
      throw new Error(
        `Invariant Breach (AM-43): AI systems are strictly prohibited from submitting, approving, or escalating ${decisionType}. All compliance decisions require human attribution.`
      );
    }
  }

  /**
   * Checks if role can perform structured analyst disposition.
   */
  public static canSubmitAnalystDisposition(role: RoleId): boolean {
    return role === 'ANALYST' || role === 'CHECKER';
  }

  /**
   * Checks if role has QA Checker sign-off authority.
   */
  public static canReviewAndApprove(role: RoleId): boolean {
    return role === 'CHECKER' || role === 'COMPLIANCE_OFFICER' || role === 'MLRO';
  }

  /**
   * Checks if role can perform Compliance officer determinations.
   */
  public static canAuthorizeComplianceEscalation(role: RoleId): boolean {
    return role === 'COMPLIANCE_OFFICER' || role === 'MLRO';
  }

  /**
   * Checks if role has statutory MLRO SAR determination authority.
   */
  public static canExecuteMlroDetermination(role: RoleId): boolean {
    return role === 'MLRO';
  }

  /**
   * Checks if role can approve high-risk field overrides (AM-40).
   */
  public static canApproveOverride(role: RoleId, requiresDualAuth: boolean): boolean {
    if (!requiresDualAuth) return true;
    return role === 'CHECKER' || role === 'COMPLIANCE_OFFICER' || role === 'MLRO';
  }
}
