// Replaces {token} placeholders in a dictionary string with values. Kept in its
// own module (no dictionary imports) so server and client can share one
// implementation without pulling either language's strings into the client bundle.
export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in params ? String(params[key]) : `{${key}}`
  )
}
