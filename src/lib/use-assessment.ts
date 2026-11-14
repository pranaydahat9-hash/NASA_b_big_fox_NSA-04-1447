import { useQuery } from "@tanstack/react-query";
import { assessArea, type Assessment } from "./hazards.functions";
import { cacheJson, readJson } from "./offline";

export function useAssessment(lat: number | null | undefined, lon: number | null | undefined) {
  const key = lat != null && lon != null ? `${lat.toFixed(3)},${lon.toFixed(3)}` : null;
  return useQuery({
    queryKey: ["assess", key],
    enabled: !!key,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Assessment & { fromCache?: string }> => {
      try {
        const a = await assessArea({ data: { lat: lat!, lon: lon! } });
        cacheJson("assess:" + key, a);
        return a;
      } catch (e) {
        const c = readJson<Assessment>("assess:" + key);
        if (c) return { ...c.v, fromCache: c.at };
        throw e;
      }
    },
  });
}
