type Availability = { usgs?: boolean; eonet?: boolean };

// Old in-memory responses predate these flags. Never infer coverage from row counts.
export function mapSourceStatus(availability: Availability | null | undefined, source: keyof Availability) {
  const available = availability?.[source];
  return available === true ? "Updated" : available === false ? "Unavailable" : "Status unknown";
}