export interface SubmissionWindow {
  open: string | null;
  close: string | null;
}

export function isSubmissionsOpen(window: SubmissionWindow, now = new Date()): boolean {
  if (window.open && now < new Date(window.open)) return false;
  if (window.close && now > new Date(window.close)) return false;
  return true;
}
