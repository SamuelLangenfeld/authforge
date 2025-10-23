import { useState, useEffect } from "react";
import { organizationApi, ApiError } from "../api";
import { Member } from "../types";

export function useOrganizationMembers(organizationId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data } = await organizationApi.getMembers(organizationId);
        setMembers(data.members || []);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to fetch members");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [organizationId]);

  return {
    members,
    loading,
    error,
  };
}
