"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

/**
 * Whether the signed-in user operates this instance, asked of the server.
 *
 * Client components cannot import lib/admin: it reads a server-only environment
 * variable, and importing it here is what used to bake the operator list into
 * the JS bundle. So the browser asks GET /api/me and learns one boolean about
 * itself.
 *
 * `ready` matters for gating. Until the answer arrives `isAdmin` is false, and a
 * caller that cannot tell "not an admin" from "not asked yet" will flash
 * operator UI closed, or worse, briefly open. Gate on `ready && isAdmin`.
 *
 * Fails closed: any error leaves isAdmin false. Since this only decides what UI
 * to show, and the server re-checks every privileged call, a false negative
 * costs a hidden menu item rather than a hole.
 */
export function useIsAdmin(user: User | null | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.ok ? await res.json() : null;
        if (!cancelled) setIsAdmin(data?.isAdmin === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, ready };
}
