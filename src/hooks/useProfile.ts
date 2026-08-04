import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { ecom } from "../lib/gateway";
import { GET_PROFILE } from "../graphql/operations";
import { signedOutAtom } from "../state/atoms";

export type Profile = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  document: string | null;
};

export const profileQueryKey = ["profile"] as const;

export const fetchProfile = () =>
  ecom<{ profile: Profile | null }>(GET_PROFILE).then((data) => data.profile);

/**
 * The profile reflects the gateway session cookie, so it is the source of
 * truth for whether anyone is signed in — it comes back `null` when not.
 */
export function useProfile() {
  const signedOut = useAtomValue(signedOutAtom);

  return useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
    enabled: !signedOut,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
