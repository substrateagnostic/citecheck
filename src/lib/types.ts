export interface Citation {
  raw: string;
  caseName?: string;
  volume?: string;
  reporter: string;
  page?: string;
  year?: string;
  court?: string;
  startIndex: number;
  endIndex: number;
}

export interface VerificationResult {
  citation: Citation;
  status: 'verified' | 'not_found' | 'partial_match' | 'format_error' | 'api_error';
  confidence: number;
  details: string;
  courtListenerUrl?: string;
  matchedCase?: {
    caseName: string;
    citation: string;
    dateFiled: string;
    court: string;
    docketNumber?: string;
  };
  warnings: string[];
}

export interface VerificationReport {
  documentName: string;
  totalCitations: number;
  verified: number;
  notFound: number;
  partialMatches: number;
  formatErrors: number;
  apiErrors: number;
  results: VerificationResult[];
  processedAt: string;
}

// Reporter abbreviations for federal courts
export const FEDERAL_REPORTERS: Record<string, string> = {
  'U.S.': 'United States Reports',
  'S. Ct.': 'Supreme Court Reporter',
  'L. Ed.': 'Lawyers Edition',
  'L. Ed. 2d': 'Lawyers Edition Second Series',
  'F.': 'Federal Reporter',
  'F.2d': 'Federal Reporter Second Series',
  'F.3d': 'Federal Reporter Third Series',
  'F.4th': 'Federal Reporter Fourth Series',
  'F. Supp.': 'Federal Supplement',
  'F. Supp. 2d': 'Federal Supplement Second Series',
  'F. Supp. 3d': 'Federal Supplement Third Series',
  'F.R.D.': 'Federal Rules Decisions',
  'B.R.': 'Bankruptcy Reporter',
  'Fed. Cl.': 'Federal Claims Reporter',
  'Vet. App.': 'Veterans Appeals Reporter',
};

// State reporter abbreviations (partial list of most common)
export const STATE_REPORTERS: Record<string, string> = {
  'N.Y.': 'New York Reports',
  'N.Y.2d': 'New York Reports Second Series',
  'N.Y.3d': 'New York Reports Third Series',
  'A.D.': 'Appellate Division Reports',
  'A.D.2d': 'Appellate Division Reports Second Series',
  'A.D.3d': 'Appellate Division Reports Third Series',
  'Cal.': 'California Reports',
  'Cal. 2d': 'California Reports Second Series',
  'Cal. 3d': 'California Reports Third Series',
  'Cal. 4th': 'California Reports Fourth Series',
  'Cal. 5th': 'California Reports Fifth Series',
  'Cal. App.': 'California Appellate Reports',
  'Cal. App. 2d': 'California Appellate Reports Second Series',
  'Cal. App. 3d': 'California Appellate Reports Third Series',
  'Cal. App. 4th': 'California Appellate Reports Fourth Series',
  'Cal. App. 5th': 'California Appellate Reports Fifth Series',
  'Ill.': 'Illinois Reports',
  'Ill. 2d': 'Illinois Reports Second Series',
  'Ill. App.': 'Illinois Appellate Court Reports',
  'Ill. App. 2d': 'Illinois Appellate Court Reports Second Series',
  'Ill. App. 3d': 'Illinois Appellate Court Reports Third Series',
  'Tex.': 'Texas Reports',
  'Pa.': 'Pennsylvania State Reports',
  'Ohio St.': 'Ohio State Reports',
  'Ohio St. 2d': 'Ohio State Reports Second Series',
  'Ohio St. 3d': 'Ohio State Reports Third Series',
  'Mass.': 'Massachusetts Reports',
  'N.J.': 'New Jersey Reports',
  'Mich.': 'Michigan Reports',
  'Minn.': 'Minnesota Reports',
  'Wis.': 'Wisconsin Reports',
  'Wis. 2d': 'Wisconsin Reports Second Series',
};

// Regional reporters
export const REGIONAL_REPORTERS: Record<string, string> = {
  'A.': 'Atlantic Reporter',
  'A.2d': 'Atlantic Reporter Second Series',
  'A.3d': 'Atlantic Reporter Third Series',
  'N.E.': 'North Eastern Reporter',
  'N.E.2d': 'North Eastern Reporter Second Series',
  'N.E.3d': 'North Eastern Reporter Third Series',
  'N.W.': 'North Western Reporter',
  'N.W.2d': 'North Western Reporter Second Series',
  'P.': 'Pacific Reporter',
  'P.2d': 'Pacific Reporter Second Series',
  'P.3d': 'Pacific Reporter Third Series',
  'S.E.': 'South Eastern Reporter',
  'S.E.2d': 'South Eastern Reporter Second Series',
  'S.W.': 'South Western Reporter',
  'S.W.2d': 'South Western Reporter Second Series',
  'S.W.3d': 'South Western Reporter Third Series',
  'So.': 'Southern Reporter',
  'So. 2d': 'Southern Reporter Second Series',
  'So. 3d': 'Southern Reporter Third Series',
};

export const ALL_REPORTERS = {
  ...FEDERAL_REPORTERS,
  ...STATE_REPORTERS,
  ...REGIONAL_REPORTERS,
};
