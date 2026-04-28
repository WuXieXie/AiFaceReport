export interface ReportImageState {
  status?: string | null;
  overlayUrl?: string | null;
  aiReportUrl?: string | null;
}

export function isReportImagePending(report: ReportImageState): boolean {
  return !report.aiReportUrl && !report.overlayUrl && report.status === 'image_processing';
}

export function shouldPollReport(report: ReportImageState): boolean {
  return report.status === 'analyzing' || report.status === 'image_processing';
}
