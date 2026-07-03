import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SOURCE_LABELS, type Lead, type LeadSource } from "@/lib/types";
import type { AgentOption, LeadInput } from "./api";
import { useAuth } from "@/features/auth/AuthProvider";

interface LeadFormProps {
  initial?: Lead;
  /** When provided, shows an agent picker (for gsm and above). */
  agents?: AgentOption[];
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: LeadInput) => void;
  onCancel?: () => void;
}

export function LeadForm({
  initial,
  agents,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
}: LeadFormProps) {
  const { profile } = useAuth();
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [source, setSource] = useState<LeadSource>(initial?.source ?? "walk_in");
  const [model, setModel] = useState(initial?.model ?? "");
  const [variant, setVariant] = useState(initial?.variant ?? "");
  const [estValue, setEstValue] = useState(
    initial?.estValue?.toString() ?? "",
  );
  const [probability, setProbability] = useState(
    (initial?.probability ?? 30).toString(),
  );
  const [agentId, setAgentId] = useState(
    initial?.agentId ?? (agents ? "" : (profile?.id ?? "")),
  );

  if (!profile) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      dealerId: profile!.dealerId,
      agentId: agentId || profile!.id,
      customerName: customerName.trim(),
      phone: phone.trim() || null,
      source,
      model: model.trim() || null,
      variant: variant.trim() || null,
      estValue: estValue === "" ? null : Number(estValue),
      probability: probability === "" ? 30 : Number(probability),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer name</Label>
          <Input
            id="customerName"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value as LeadSource)}
          >
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            placeholder="e.g. Vios"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="variant">Variant</Label>
          <Input
            id="variant"
            placeholder="e.g. 1.3 XLE CVT"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estValue">Est. value (₱)</Label>
          <Input
            id="estValue"
            type="number"
            min="0"
            step="1000"
            value={estValue}
            onChange={(e) => setEstValue(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="probability">Probability (%)</Label>
          <Input
            id="probability"
            type="number"
            min="0"
            max="100"
            step="1"
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
          />
        </div>
        {agents && (
          <div className="space-y-2">
            <Label htmlFor="agentId">Assigned agent</Label>
            <Select
              id="agentId"
              required
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              <option value="" disabled>
                Select an agent…
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
