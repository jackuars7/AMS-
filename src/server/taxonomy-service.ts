/**
 * AM-22 Versioned, Configurable Adverse-Event Taxonomy Service
 * Manages versioned risk categories, indicators, and multi-label classification rules.
 */
import { TaxonomyCategory, TaxonomyVersion } from '../types/index.ts';

export class TaxonomyService {
  private versions: Map<string, TaxonomyVersion> = new Map();
  private currentVersionId = 'tax-v2026-1';

  constructor() {
    this.seedInitialTaxonomies();
  }

  private seedInitialTaxonomies() {
    const v1Categories: TaxonomyCategory[] = [
      {
        id: 'cat-fraud',
        code: 'FRAUD',
        name: 'Financial Fraud & Deceit',
        description: 'Intentional deception for financial gain, embezzlement, accounting fraud, or false representation.',
        riskWeight: 'HIGH',
        indicators: ['wire fraud', 'securities fraud', 'accounting irregularity', 'embezzlement', 'defrauded investors', 'ponzi'],
        isActive: true,
      },
      {
        id: 'cat-corruption',
        code: 'CORRUPTION',
        name: 'Public & Private Corruption',
        description: 'Abuse of entrusted power or public office for illicit private advantage.',
        riskWeight: 'CRITICAL',
        indicators: ['misuse of public funds', 'cronyism', 'graft', 'political scandal', 'kickback scheme'],
        isActive: true,
      },
      {
        id: 'cat-bribery',
        code: 'BRIBERY',
        name: 'Bribery & Foreign Corrupt Practices',
        description: 'Offering, giving, receiving, or soliciting valuable items to influence official actions.',
        riskWeight: 'CRITICAL',
        indicators: ['FCPA', 'Bribery Act', 'facilitation payment', 'bribe payment', 'corrupt inducement'],
        isActive: true,
      },
      {
        id: 'cat-aml',
        code: 'MONEY_LAUNDERING',
        name: 'Money Laundering & Illicit Finance',
        description: 'Concealing the origins of illegally obtained money via layering, smurfing, or sham entities.',
        riskWeight: 'CRITICAL',
        indicators: ['layering', 'shell company', 'unexplained wealth', 'illicit flows', 'trade-based money laundering'],
        isActive: true,
      },
      {
        id: 'cat-sanctions',
        code: 'SANCTIONS_EVASION',
        name: 'Sanctions Evasion & Export Violations',
        description: 'Circumventing economic sanctions, embargoes, or denied party trade restrictions.',
        riskWeight: 'CRITICAL',
        indicators: ['OFAC', 'sanctioned entity', 'transshipment', 'shadow fleet', 'dual-use goods evasion'],
        isActive: true,
      },
      {
        id: 'cat-tax',
        code: 'TAX_CRIME',
        name: 'Tax Evasion & Carousel Fraud',
        description: 'Illegal evasion of tax liabilities, VAT carousel schemes, and undeclared offshore wealth.',
        riskWeight: 'HIGH',
        indicators: ['tax evasion', 'VAT carousel', 'false invoices', 'offshore concealment', 'tax authority raid'],
        isActive: true,
      },
      {
        id: 'cat-orgcrime',
        code: 'ORGANIZED_CRIME',
        name: 'Organized Crime & Racketeering',
        description: 'Structured criminal enterprises engaged in extortion, smuggling, trafficking, or racketeering.',
        riskWeight: 'CRITICAL',
        indicators: ['RICO', 'cartel', 'syndicate', 'trafficking', 'extortion ring'],
        isActive: true,
      },
      {
        id: 'cat-reg-enforce',
        code: 'REGULATORY_ENFORCEMENT',
        name: 'Regulatory Enforcement & Disciplinary Sanctions',
        description: 'Fines, censures, license suspensions, and cease-and-desist orders by statutory regulators.',
        riskWeight: 'MEDIUM',
        indicators: ['SEC settlement', 'FCA fine', 'cease and desist', 'license revoked', 'regulatory penalty'],
        isActive: true,
      },
      {
        id: 'cat-governance',
        code: 'GOVERNANCE_FAILURE',
        name: 'Governance & Internal Controls Failure',
        description: 'Systemic failure of board oversight, compliance controls, risk management, or audit deficiencies.',
        riskWeight: 'MEDIUM',
        indicators: ['whistleblower complaint', 'internal audit failure', 'board resignation', 'compliance monitor'],
        isActive: true,
      },
      {
        id: 'cat-cyber',
        code: 'CYBERCRIME_EXTORTION',
        name: 'Cybercrime, Ransomware & Data Theft',
        description: 'State-sponsored or illicit computer intrusions, ransomware payments, and critical infrastructure attacks.',
        riskWeight: 'HIGH',
        indicators: ['ransomware', 'cyber intrusion', 'data extortion', 'unauthorized access'],
        isActive: true,
      },
      {
        id: 'cat-terrorist-financing',
        code: 'TERRORIST_FINANCING',
        name: 'Terrorist Financing & Proscribed Entities',
        description: 'Provision of funds or logistical assistance to proscribed groups or terrorist organizations.',
        riskWeight: 'CRITICAL',
        indicators: ['designated terrorist', 'terrorist funding', 'proscribed organization'],
        isActive: true,
      },
    ];

    const v1: TaxonomyVersion = {
      versionId: 'tax-v2026-1',
      versionNumber: 1,
      name: 'Global Financial Crime Taxonomy 2026.1',
      effectiveDate: '2026-01-01T00:00:00Z',
      categories: v1Categories,
      isCurrent: true,
      createdBy: 'SYSTEM_COMPLIANCE_OFFICE',
    };

    this.versions.set(v1.versionId, v1);
  }

  public getCurrentVersion(): TaxonomyVersion {
    return this.versions.get(this.currentVersionId)!;
  }

  public getVersion(versionId: string): TaxonomyVersion | undefined {
    return this.versions.get(versionId);
  }

  public getAllVersions(): TaxonomyVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => b.versionNumber - a.versionNumber);
  }

  public getCategory(code?: string, versionId?: string): TaxonomyCategory | undefined {
    if (!code) return undefined;
    const ver = versionId ? this.getVersion(versionId) : this.getCurrentVersion();
    if (!ver) return undefined;
    return ver.categories.find((c) => c.code && c.code.toUpperCase() === code.toUpperCase());
  }

  public createNewVersion(
    name: string,
    categories: TaxonomyCategory[],
    createdBy: string
  ): TaxonomyVersion {
    const current = this.getCurrentVersion();
    current.isCurrent = false;

    const newNumber = current.versionNumber + 1;
    const newId = `tax-v2026-${newNumber}`;

    const newVersion: TaxonomyVersion = {
      versionId: newId,
      versionNumber: newNumber,
      name,
      effectiveDate: new Date().toISOString(),
      categories,
      isCurrent: true,
      createdBy,
    };

    this.versions.set(newId, newVersion);
    this.currentVersionId = newId;
    return newVersion;
  }
}
