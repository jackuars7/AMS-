import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  FileBadge,
  Globe2,
  Hash,
  MapPin,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Subject, SubjectAttribute } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Drawer } from '../../common/Drawer.tsx';

interface SubjectProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onOpenAliasManager: () => void;
}

export const SubjectProfileDrawer: React.FC<SubjectProfileDrawerProps> = ({
  isOpen,
  onClose,
  subject,
  onOpenAliasManager,
}) => {
  if (!subject) return null;

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'date_of_birth':
      case 'incorporation_date':
        return <Calendar className="h-4 w-4 text-slate-400" />;
      case 'nationality':
      case 'country_of_incorporation':
        return <Globe2 className="h-4 w-4 text-slate-400" />;
      case 'registered_address':
        return <MapPin className="h-4 w-4 text-slate-400" />;
      case 'tax_id':
      case 'passport_number':
      case 'commercial_registry_number':
        return <Hash className="h-4 w-4 text-slate-400" />;
      default:
        return <FileBadge className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatFieldName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Consolidated Subject Profile (AM-02)"
      subtitle={`Entity ID: ${subject.id} • Party Role: ${subject.role}`}
      width="xl"
    >
      <div className="space-y-6">
        {/* Subject Header Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                {subject.subjectType === 'NATURAL_PERSON' ? (
                  <User className="h-5 w-5" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{subject.primaryName}</h4>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span>{subject.subjectType.replace(/_/g, ' ')}</span>
                  <span>•</span>
                  <span>Jurisdiction: {subject.jurisdiction}</span>
                  {subject.ownershipPercentage !== undefined && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">
                        {subject.ownershipPercentage}% Ownership
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Completeness</span>
              <span className="text-sm font-bold text-emerald-600">
                {subject.completenessScore}%
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Approved Aliases</span>
              <span className="font-semibold text-slate-800">
                {subject.aliases.filter((a) => a.state === 'APPROVED').length} active
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Pending Aliases</span>
              <span className="font-semibold text-amber-600">
                {subject.aliases.filter((a) => a.state === 'PENDING_APPROVAL').length} awaiting review
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Attribute Conflicts</span>
              <span className={`font-semibold ${subject.hasConflicts ? 'text-rose-600' : 'text-emerald-600'}`}>
                {subject.hasConflicts ? 'Conflicts Flagged' : 'None detected'}
              </span>
            </div>
          </div>
        </div>

        {/* Conflict Warning Banner if present */}
        {subject.hasConflicts && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-amber-950">
                Discrepant Attribute Values Flagged Across Ingestion Sources
              </span>
              <span>
                One or more verified attributes show conflicting historical records. Both conflicting
                values are preserved below with source provenance to ensure no evidence is discarded.
              </span>
            </div>
          </div>
        )}

        {/* Multi-Source Attributes Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Verified Multi-Source Attributes & Provenance
            </h5>
            <span className="text-xs text-slate-400">
              {subject.attributes.length} recorded attributes
            </span>
          </div>

          <div className="space-y-3">
            {subject.attributes.map((attr) => (
              <div
                key={attr.id}
                className={`p-3.5 rounded-lg border text-xs transition-colors ${
                  attr.conflictState?.hasConflict
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getFieldIcon(attr.fieldName)}
                    <span className="font-medium text-slate-700">
                      {formatFieldName(attr.fieldName)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      size="sm"
                      variant={
                        attr.validationStatus === 'VERIFIED'
                          ? 'success'
                          : attr.validationStatus === 'DISCREPANCY_DETECTED'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {attr.validationStatus.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-500">
                      {Math.round(attr.confidence * 100)}% conf
                    </span>
                  </div>
                </div>

                <div className="mt-2 font-mono font-semibold text-slate-900 text-sm pl-6">
                  {attr.fieldValue}
                </div>

                {/* Conflicting values display */}
                {attr.conflictState?.hasConflict && attr.conflictState.conflictingValues && (
                  <div className="mt-2.5 pl-6 pt-2 border-t border-amber-200/80 space-y-1.5">
                    <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      Conflicting Records in Data Sources:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attr.conflictState.conflictingValues.map((cv, idx) => (
                        <div key={idx} className="p-2 rounded bg-white border border-amber-200 text-[11px]">
                          <span className="text-slate-500 block text-[10px] uppercase font-mono">
                            Source: {cv.source}
                          </span>
                          <span className="font-semibold text-slate-800">{cv.value}</span>
                          <span className="text-[10px] text-slate-400 block">
                            Ref: {cv.documentRef || cv.source || 'Official Record'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Provenance Footer */}
                <div className="mt-2 pl-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                  <span>
                    Source: {attr.provenance?.sourceSystem || attr.source || 'Verified Source Ingestion'}
                  </span>
                  <span>•</span>
                  <span>
                    Ingested:{' '}
                    {new Date(
                      attr.provenance?.ingestedAt || attr.createdAt || attr.effectiveDate || Date.now()
                    ).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>
                    Ref: {attr.provenance?.sourceDocumentRef || attr.sourceRecordRef || 'N/A'}
                  </span>
                  {attr.captureMethod && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-slate-500 uppercase">
                        {attr.captureMethod.replace(/_/g, ' ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alias Section CTA */}
        <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-between gap-4">
          <div>
            <h5 className="text-xs font-semibold text-indigo-950">
              Name Variants & Script Transliterations (AM-03)
            </h5>
            <p className="text-[11px] text-indigo-700 mt-0.5">
              Review approved aliases, transliterations (Cyrillic, Arabic), and generate AI-assisted
              suggestions with mandatory human sign-off.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAliasManager}
            className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
          >
            Manage Aliases ({subject.aliases.length})
          </button>
        </div>
      </div>
    </Drawer>
  );
};
