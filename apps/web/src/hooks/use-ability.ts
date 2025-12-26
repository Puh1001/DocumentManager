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

  useEffect(() => {
    if (!user || !accessToken) {
      setAbility(null);
      setLoading(false);
      return;
    }

    const loadAbilities = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ rules: RawRuleOf<AppAbility>[] }>(
          "/auth/abilities"
        );
        const newAbility = createMongoAbility<AppAbility>(response.rules);
        setAbility(newAbility);
      } catch (error) {
        console.error("Failed to load abilities:", error);
        // Create empty ability on error
        setAbility(createMongoAbility<AppAbility>([]));
      } finally {
        setLoading(false);
      }
    };

    loadAbilities();
  }, [user, accessToken]);

  return { ability, loading };
}
