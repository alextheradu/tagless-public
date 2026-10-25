export function isIdVerified(status?: string): boolean {
  return status === "verified" || status === "verified_but_over18";
}
