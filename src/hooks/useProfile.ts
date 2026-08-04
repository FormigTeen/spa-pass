import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { core } from "../lib/gateway";
import { GET_PROFILE } from "../graphql/operations";
import { signedOutAtom } from "../state/atoms";

export type Profile = { email: string | null; document: string | null };

export const profileQueryKey = ["profile"] as const;

export const fetchProfile = () =>
  core<{ getProfile: Profile }>(GET_PROFILE).then((data) => data.getProfile);

/**
 * `getProfile` reflects the gateway session cookie, so it is the source of
 * truth for a code sign in. A passkey sign in returns a Firebase token
 * instead and never sets that cookie.
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
