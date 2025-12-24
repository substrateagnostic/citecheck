'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { VerificationReport, VerificationResult } from '@/lib/types';
import { formatCitation } from '@/lib/extractor';

type FilterStatus = 'all' | 'verified' | 'not_found' | 'partial_match' | 'errors';

export default function ResultsPage() {
  const router = useRouter();
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('citationReport');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setReport(parsed);
      setIsLoaded(true);
    } catch {
      router.push('/');
    }
  }, [router]);

  const risk = useMemo(() => {
    if (!report || report.totalCitations === 0) {
      return { level: 'none', color: 'gray', text: 'No Citations', bgClass: 'bg-gray-500' };
    }
    const unverifiedRatio = (report.notFound + report.formatErrors) / report.totalCitations;

    if (unverifiedRatio === 0) return { level: 'low', color: 'green', text: 'Low Risk', bgClass: 'risk-low' };
    if (unverifiedRatio <= 0.1) return { level: 'medium', color: 'yellow', text: 'Medium Risk', bgClass: 'risk-medium' };
    if (unverifiedRatio <= 0.3) return { level: 'high', color: 'orange', text: 'High Risk', bgClass: 'risk-high' };
    return { level: 'critical', color: 'red', text: 'Critical Risk', bgClass: 'risk-critical' };
  }, [report]);

  const filteredResults = useMemo(() => {
    if (!report) return [];
    return report.results.filter(r => {
      if (filter === 'all') return true;
      if (filter === 'errors') return r.status === 'format_error' || r.status === 'api_error';
      return r.status === filter;
    });
  }, [report, filter]);

  const toggleCard = (index: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedCards(new Set(filteredResults.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedCards(new Set());
  };

  const downloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citecheck-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = () => {
    if (!report) return;

    let md = `# CiteCheck Verification Report\n\n`;
    md += `**Document:** ${report.documentName}\n`;
    md += `**Processed:** ${new Date(report.processedAt).toLocaleString()}\n`;
    md += `**Risk Level:** ${risk.text}\n\n`;

    md += `## Summary\n\n`;
    md += `| Status | Count |\n|--------|-------|\n`;
    md += `| Verified | ${report.verified} |\n`;
    md += `| Not Found | ${report.notFound} |\n`;
    md += `| Partial Match | ${report.partialMatches} |\n`;
    md += `| Errors | ${report.formatErrors + report.apiErrors} |\n`;
    md += `| **Total** | **${report.totalCitations}** |\n\n`;

    md += `## Detailed Results\n\n`;
    report.results.forEach((result, i) => {
      const emoji = getStatusEmoji(result.status);
      md += `### ${i + 1}. ${emoji} ${formatCitation(result.citation)}\n\n`;
      md += `**Status:** ${result.status.replace('_', ' ').toUpperCase()} (${result.confidence}%)\n\n`;
      md += `${result.details}\n\n`;
      if (result.matchedCase) {
        md += `**Matched Case:** ${result.matchedCase.caseName}\n\n`;
      }
      if (result.courtListenerUrl) {
        md += `[View on CourtListener](${result.courtListenerUrl})\n\n`;
      }
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citecheck-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!report || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-legal-navy/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-legal-navy animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-500">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in-down">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-legal-navy dark:text-legal-gold
                       hover:opacity-80 transition-opacity font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            New Verification
          </button>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <button
                onClick={downloadJson}
                className="flex items-center gap-2 glass-card px-4 py-2.5 rounded-xl
                         hover:shadow-lg transition-all text-sm font-medium
                         text-legal-navy dark:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                JSON
              </button>
            </div>
            <button
              onClick={downloadMarkdown}
              className="flex items-center gap-2 glass-card px-4 py-2.5 rounded-xl
                       hover:shadow-lg transition-all text-sm font-medium
                       text-legal-navy dark:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Markdown
            </button>
          </div>
        </header>

        {/* Document Info Card */}
        <div className="glass-card rounded-2xl p-6 mb-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-legal-navy dark:text-white mb-2">
                Verification Report
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {report.documentName}
                </span>
                <span className="hidden md:inline text-gray-300 dark:text-gray-600">|</span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(report.processedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Risk Badge */}
            <div className={`px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg ${risk.bgClass}`}>
              {risk.text}
            </div>
          </div>
        </div>

        {/* Summary Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <SummaryCard
            label="Total"
            count={report.totalCitations}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            color="blue"
            onClick={() => setFilter('all')}
            active={filter === 'all'}
          />
          <SummaryCard
            label="Verified"
            count={report.verified}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
            onClick={() => setFilter('verified')}
            active={filter === 'verified'}
          />
          <SummaryCard
            label="Not Found"
            count={report.notFound}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="red"
            onClick={() => setFilter('not_found')}
            active={filter === 'not_found'}
          />
          <SummaryCard
            label="Partial"
            count={report.partialMatches}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            color="yellow"
            onClick={() => setFilter('partial_match')}
            active={filter === 'partial_match'}
          />
          <SummaryCard
            label="Errors"
            count={report.formatErrors + report.apiErrors}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="gray"
            onClick={() => setFilter('errors')}
            active={filter === 'errors'}
          />
        </div>

        {/* Verification Score Ring */}
        {report.totalCitations > 0 && (
          <div className="glass-card rounded-2xl p-6 mb-8 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(report.verified / report.totalCitations) * 251.2} 251.2`}
                    className="text-green-500 transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-legal-navy dark:text-white">
                    {Math.round((report.verified / report.totalCitations) * 100)}%
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">verified</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-500">{report.verified}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Verified</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{report.partialMatches}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Partial</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{report.notFound}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Not Found</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-500">{report.formatErrors + report.apiErrors}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Errors</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results List */}
        {report.totalCitations === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-3">
              No Citations Found
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              We couldn't find any legal citations in this document.
              Make sure the document contains standard legal citations
              (e.g., "123 F.3d 456").
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {/* List Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-legal-navy dark:text-white">
                {filteredResults.length} Citation{filteredResults.length !== 1 ? 's' : ''}
                {filter !== 'all' && (
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({filter.replace('_', ' ')})
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAll}
                  className="text-xs text-legal-navy dark:text-legal-gold hover:underline"
                >
                  Expand all
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={collapseAll}
                  className="text-xs text-legal-navy dark:text-legal-gold hover:underline"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* Citation Cards */}
            {filteredResults.map((result, index) => (
              <CitationCard
                key={index}
                result={result}
                index={report.results.indexOf(result) + 1}
                expanded={expandedCards.has(index)}
                onToggle={() => toggleCard(index)}
              />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 glass-card rounded-2xl p-5 border-l-4 border-blue-500 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1">
                Important Disclaimer
              </h3>
              <p className="text-blue-700 dark:text-blue-200/80 text-sm leading-relaxed">
                This tool verifies citations against the CourtListener database, which primarily covers
                federal cases. Citations marked as "not found" may still exist in state court databases.
                <strong> Always perform manual verification before filing any legal document.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  count,
  icon,
  color,
  onClick,
  active,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  active: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-emerald-600',
    red: 'from-red-400 to-rose-600',
    yellow: 'from-yellow-400 to-amber-600',
    gray: 'from-gray-400 to-slate-600',
  };

  return (
    <button
      onClick={onClick}
      className={`
        glass-card rounded-xl p-4 text-center transition-all duration-300 group
        ${active ? 'ring-2 ring-legal-navy dark:ring-legal-gold ring-offset-2 ring-offset-legal-cream dark:ring-offset-dark-bg' : 'hover:scale-105'}
      `}
    >
      <div className={`
        w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br ${colorClasses[color]}
        flex items-center justify-center text-white shadow-lg
        group-hover:scale-110 transition-transform
      `}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-legal-navy dark:text-white">{count}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
    </button>
  );
}

function CitationCard({
  result,
  index,
  expanded,
  onToggle,
}: {
  result: VerificationResult;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig: Record<string, { gradient: string; icon: React.ReactNode; label: string; borderColor: string }> = {
    verified: {
      gradient: 'from-green-400 to-emerald-500',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
      label: 'Verified',
      borderColor: 'border-l-green-500',
    },
    not_found: {
      gradient: 'from-red-400 to-rose-500',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
      label: 'Not Found',
      borderColor: 'border-l-red-500',
    },
    partial_match: {
      gradient: 'from-yellow-400 to-amber-500',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
      label: 'Partial',
      borderColor: 'border-l-yellow-500',
    },
    format_error: {
      gradient: 'from-orange-400 to-orange-500',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      label: 'Format Error',
      borderColor: 'border-l-orange-500',
    },
    api_error: {
      gradient: 'from-gray-400 to-slate-500',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      label: 'API Error',
      borderColor: 'border-l-gray-500',
    },
  };

  const config = statusConfig[result.status] || statusConfig.api_error;

  return (
    <div className={`glass-card rounded-xl overflow-hidden border-l-4 ${config.borderColor} transition-all duration-300`}>
      <button
        onClick={onToggle}
        className="w-full p-4 md:p-5 text-left flex items-start gap-4 hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
      >
        {/* Status Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} text-white flex items-center justify-center shadow-lg`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{index}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium bg-gradient-to-r ${config.gradient} text-white`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {result.confidence}% confidence
            </span>
          </div>
          <p className="font-mono text-sm text-legal-navy dark:text-white break-words">
            {formatCitation(result.citation)}
          </p>
        </div>

        {/* Expand Arrow */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 md:px-5 pb-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 animate-fade-in">
          <div className="pt-4 space-y-4 text-sm">
            {/* Raw Citation */}
            <div>
              <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-1">Raw Citation</h4>
              <p className="font-mono text-legal-navy dark:text-white bg-white dark:bg-dark-card p-3 rounded-lg">
                {result.citation.raw}
              </p>
            </div>

            {/* Analysis */}
            <div>
              <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-1">Analysis</h4>
              <p className="text-gray-700 dark:text-gray-200">{result.details}</p>
            </div>

            {/* Matched Case */}
            {result.matchedCase && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-3">Matched Case</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Name</span>
                    <p className="text-legal-navy dark:text-white font-medium">{result.matchedCase.caseName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Citation</span>
                    <p className="text-legal-navy dark:text-white font-mono">{result.matchedCase.citation}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Filed</span>
                    <p className="text-legal-navy dark:text-white">{result.matchedCase.dateFiled}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Court</span>
                    <p className="text-legal-navy dark:text-white">{result.matchedCase.court}</p>
                  </div>
                </div>
              </div>
            )}

            {/* CourtListener Link */}
            {result.courtListenerUrl && (
              <a
                href={result.courtListenerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-legal-navy dark:text-legal-gold hover:underline font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on CourtListener
              </a>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Warnings
                </h4>
                <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-200 space-y-1">
                  {result.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'verified': return '✅';
    case 'not_found': return '❌';
    case 'partial_match': return '⚠️';
    case 'format_error': return '⚡';
    case 'api_error': return '🔌';
    default: return '❓';
  }
}
