"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { createMongoAbility } from "@casl/ability";
import { RawRuleOf } from "@casl/ability";
import { AppAbility } from "@/lib/types/ability.types";

export function useAbility() {
  const { user, accessToken } = useAuth();
  const [ability, setAbility] = useState<AppAbility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !accessToken) {
      setAbility(null);
      setLoading(false);
      setError(null);
      return;
    }

    const loadAbilities = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<{ rules: RawRuleOf<AppAbility>[] }>(
          "/auth/abilities"
        );
        const newAbility = createMongoAbility<AppAbility>(response.rules);
        setAbility(newAbility);
      } catch (err) {
        console.error("Failed to load abilities:", err);
        const error = err instanceof Error ? err : new Error("Failed to load abilities");
        setError(error);
        // Create empty ability on error to prevent crashes
        setAbility(createMongoAbility<AppAbility>([]));
      } finally {
        setLoading(false);
      }
    };

    loadAbilities();
  }, [user, accessToken]);

  return { ability, loading, error };
}
