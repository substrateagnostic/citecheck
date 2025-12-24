import { VerificationResult, VerificationReport } from './types';
import { formatCitation } from './extractor';

export function generateReport(
  documentName: string,
  results: VerificationResult[]
): VerificationReport {
  const verified = results.filter(r => r.status === 'verified').length;
  const notFound = results.filter(r => r.status === 'not_found').length;
  const partialMatches = results.filter(r => r.status === 'partial_match').length;
  const formatErrors = results.filter(r => r.status === 'format_error').length;
  const apiErrors = results.filter(r => r.status === 'api_error').length;

  return {
    documentName,
    totalCitations: results.length,
    verified,
    notFound,
    partialMatches,
    formatErrors,
    apiErrors,
    results,
    processedAt: new Date().toISOString(),
  };
}

export function formatReportAsText(report: VerificationReport): string {
  const lines: string[] = [];
  
  lines.push('═'.repeat(70));
  lines.push('CITATION VERIFICATION REPORT');
  lines.push('═'.repeat(70));
  lines.push('');
  lines.push(`Document: ${report.documentName}`);
  lines.push(`Processed: ${new Date(report.processedAt).toLocaleString()}`);
  lines.push('');
  lines.push('─'.repeat(70));
  lines.push('SUMMARY');
  lines.push('─'.repeat(70));
  lines.push(`Total Citations Found: ${report.totalCitations}`);
  lines.push(`  ✓ Verified:        ${report.verified}`);
  lines.push(`  ⚠ Partial Match:   ${report.partialMatches}`);
  lines.push(`  ✗ Not Found:       ${report.notFound}`);
  lines.push(`  ! Format Errors:   ${report.formatErrors}`);
  lines.push(`  ? API Errors:      ${report.apiErrors}`);
  lines.push('');

  // Risk assessment
  const riskScore = calculateRiskScore(report);
  lines.push(`Risk Level: ${riskScore.level} (${riskScore.score}/100)`);
  lines.push(`Recommendation: ${riskScore.recommendation}`);
  lines.push('');

  lines.push('─'.repeat(70));
  lines.push('DETAILED RESULTS');
  lines.push('─'.repeat(70));

  for (let i = 0; i < report.results.length; i++) {
    const result = report.results[i];
    lines.push('');
    lines.push(`[${i + 1}] ${formatCitation(result.citation)}`);
    lines.push(`    Status: ${formatStatus(result.status)} (${result.confidence}% confidence)`);
    lines.push(`    ${result.details}`);
    
    if (result.matchedCase) {
      lines.push(`    Matched: ${result.matchedCase.caseName}`);
      lines.push(`    Filed: ${result.matchedCase.dateFiled} | Court: ${result.matchedCase.court}`);
    }
    
    if (result.courtListenerUrl) {
      lines.push(`    Link: ${result.courtListenerUrl}`);
    }
    
    if (result.warnings.length > 0) {
      lines.push(`    Warnings: ${result.warnings.join('; ')}`);
    }
  }

  lines.push('');
  lines.push('═'.repeat(70));
  lines.push('END OF REPORT');
  lines.push('═'.repeat(70));
  lines.push('');
  lines.push('NOTE: This tool verifies citations against the CourtListener database,');
  lines.push('which primarily covers federal cases. State court citations may show as');
  lines.push('"not found" even if valid. Always perform manual verification for');
  lines.push('citations marked as not found or partial match before filing.');
  lines.push('');

  return lines.join('\n');
}

function formatStatus(status: string): string {
  switch (status) {
    case 'verified': return '✓ VERIFIED';
    case 'not_found': return '✗ NOT FOUND';
    case 'partial_match': return '⚠ PARTIAL MATCH';
    case 'format_error': return '! FORMAT ERROR';
    case 'api_error': return '? API ERROR';
    default: return status.toUpperCase();
  }
}

interface RiskScore {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

function calculateRiskScore(report: VerificationReport): RiskScore {
  if (report.totalCitations === 0) {
    return {
      score: 0,
      level: 'LOW',
      recommendation: 'No citations found to verify.',
    };
  }

  // Calculate risk based on unverified citations
  const unverifiedRatio = (report.notFound + report.formatErrors) / report.totalCitations;
  const partialRatio = report.partialMatches / report.totalCitations;
  
  // Score: 100 = all verified, 0 = all not found
  const score = Math.round(
    ((report.verified / report.totalCitations) * 100) -
    (partialRatio * 15) // Partial matches reduce score slightly
  );

  if (report.notFound === 0 && report.formatErrors === 0) {
    return {
      score: Math.max(score, 85),
      level: 'LOW',
      recommendation: 'All citations verified. Document appears safe to file.',
    };
  }

  if (unverifiedRatio <= 0.1) {
    return {
      score,
      level: 'MEDIUM',
      recommendation: `${report.notFound + report.formatErrors} citation(s) need manual verification before filing.`,
    };
  }

  if (unverifiedRatio <= 0.3) {
    return {
      score,
      level: 'HIGH',
      recommendation: `Significant number of unverified citations. Thorough review required before filing.`,
    };
  }

  return {
    score: Math.min(score, 25),
    level: 'CRITICAL',
    recommendation: `Majority of citations could not be verified. Do not file without comprehensive manual review.`,
  };
}

export function formatReportAsMarkdown(report: VerificationReport): string {
  const lines: string[] = [];
  
  lines.push('# Citation Verification Report');
  lines.push('');
  lines.push(`**Document:** ${report.documentName}`);
  lines.push(`**Processed:** ${new Date(report.processedAt).toLocaleString()}`);
  lines.push('');
  
  lines.push('## Summary');
  lines.push('');
  lines.push('| Status | Count |');
  lines.push('|--------|-------|');
  lines.push(`| ✅ Verified | ${report.verified} |`);
  lines.push(`| ⚠️ Partial Match | ${report.partialMatches} |`);
  lines.push(`| ❌ Not Found | ${report.notFound} |`);
  lines.push(`| ⚡ Format Error | ${report.formatErrors} |`);
  lines.push(`| 🔌 API Error | ${report.apiErrors} |`);
  lines.push(`| **Total** | **${report.totalCitations}** |`);
  lines.push('');

  const riskScore = calculateRiskScore(report);
  lines.push(`### Risk Assessment: ${riskScore.level}`);
  lines.push('');
  lines.push(`> ${riskScore.recommendation}`);
  lines.push('');

  lines.push('## Detailed Results');
  lines.push('');

  for (let i = 0; i < report.results.length; i++) {
    const result = report.results[i];
    const statusEmoji = getStatusEmoji(result.status);
    
    lines.push(`### ${i + 1}. ${statusEmoji} ${formatCitation(result.citation)}`);
    lines.push('');
    lines.push(`**Status:** ${result.status.replace('_', ' ').toUpperCase()} (${result.confidence}% confidence)`);
    lines.push('');
    lines.push(result.details);
    lines.push('');
    
    if (result.matchedCase) {
      lines.push('**Matched Case:**');
      lines.push(`- Name: ${result.matchedCase.caseName}`);
      lines.push(`- Citation: ${result.matchedCase.citation}`);
      lines.push(`- Filed: ${result.matchedCase.dateFiled}`);
      lines.push(`- Court: ${result.matchedCase.court}`);
      lines.push('');
    }
    
    if (result.courtListenerUrl) {
      lines.push(`[View on CourtListener](${result.courtListenerUrl})`);
      lines.push('');
    }
    
    if (result.warnings.length > 0) {
      lines.push('**⚠️ Warnings:**');
      for (const warning of result.warnings) {
        lines.push(`- ${warning}`);
      }
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
  }

  lines.push('## Disclaimer');
  lines.push('');
  lines.push('This tool verifies citations against the CourtListener database (Free Law Project), ');
  lines.push('which primarily covers federal cases. State court citations may show as "not found" ');
  lines.push('even if valid. Always perform manual verification for citations marked as not found ');
  lines.push('or partial match before filing any legal document.');
  lines.push('');

  return lines.join('\n');
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
