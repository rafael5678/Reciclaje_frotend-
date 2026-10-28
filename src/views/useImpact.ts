import { useCallback, useEffect, useState } from "react";
import type { Impact } from "../models/types";
import { impactService } from "../services/impactService";
import { useSession } from "./SessionProvider";

export function useImpact() {
  const { revision } = useSession();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError("");
    impactService
      .get()
      .then((data) => {
        if (alive) setImpact(data);
      })
      .catch((err: Error) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [revision, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { impact, error, retry };
}
