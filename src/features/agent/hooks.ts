import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchLeads } from "@/features/leads/api";
import { fetchPendingFollowUps } from "@/features/followups/api";
import { STAGE_LABELS, happyPathNext, type Lead } from "@/lib/types";
import {
  advanceLeadStage,
  createLeadAtomic,
  fetchActivePromos,
  undoLeadAdvance,
} from "./api";

/** The signed-in agent's leads (RLS returns only their own rows). */
export function useAgentLeads() {
  return useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
}

/** Pending follow-ups for the agent's leads, soonest first. */
export function useAgentFollowUps() {
  return useQuery({
    queryKey: ["followups", "pending"],
    queryFn: fetchPendingFollowUps,
  });
}

export function useActivePromos() {
  return useQuery({ queryKey: ["promos", "active"], queryFn: fetchActivePromos });
}

/**
 * Live updates on the signed-in agent's own leads. Any insert/update/delete
 * to a visible lead (RLS-filtered server-side) refreshes the lead and
 * follow-up queries — so a GSM reassigning a lead away updates the agent's
 * list without a manual refresh.
 */
export function useLeadsRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("agent-leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leads"] });
          queryClient.invalidateQueries({ queryKey: ["followups"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const mutation = useMutation({
    mutationFn: createLeadAtomic,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  // Synchronous double-submit guard: isPending only flips after a re-render,
  // so two fast taps would otherwise create duplicate leads.
  return {
    ...mutation,
    mutate: ((variables, options) => {
      if (inFlight.current) return;
      inFlight.current = true;
      mutation.mutate(variables, options);
    }) as typeof mutation.mutate,
  };
}

const UNDO_WINDOW_MS = 6000;

export interface UndoState {
  leadId: string;
  message: string;
}

/**
 * One-tap stage advance with an undo window. `advance(lead)` captures the
 * pre-advance stage + probability so `undo()` can atomically revert (stage,
 * probability, and the auto-created follow-up). Returns `undoState` for a
 * toast the caller renders; it auto-clears after the window.
 */
export function useAdvanceStage() {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const snapshot = useRef<{ id: string; stage: Lead["stage"]; probability: number } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = (leadId: string) => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    queryClient.invalidateQueries({ queryKey: ["lead-history", leadId] });
    queryClient.invalidateQueries({ queryKey: ["followups"] });
  };

  const clearUndo = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setUndoState(null);
  };

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const advance = (lead: Lead) => {
    if (inFlight.current) return; // synchronous double-tap guard
    if (happyPathNext(lead.stage) === null) return; // nothing to advance to
    inFlight.current = true;
    setError(null);
    snapshot.current = {
      id: lead.id,
      stage: lead.stage,
      probability: lead.probability,
    };
    advanceLeadStage(lead.id)
      .then((updated) => {
        invalidate(lead.id);
        if (timer.current) clearTimeout(timer.current);
        setUndoState({
          leadId: lead.id,
          message: `${lead.customerName} → ${STAGE_LABELS[updated.stage]}`,
        });
        timer.current = setTimeout(() => setUndoState(null), UNDO_WINDOW_MS);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not advance lead");
      })
      .finally(() => {
        inFlight.current = false;
      });
  };

  const undo = () => {
    const snap = snapshot.current;
    if (!snap) return;
    clearUndo();
    undoLeadAdvance(snap.id, snap.stage, snap.probability)
      .then(() => invalidate(snap.id))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not undo");
      });
  };

  return { advance, undo, undoState, dismissUndo: clearUndo, error };
}
