import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { MODELS } from "@/lib/models";
import { SOURCE_LABELS, type LeadSource } from "@/lib/types";
import { useCreateLead } from "./hooks";

export function AddLeadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const createLead = useCreateLead();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [source, setSource] = useState<LeadSource>("walk_in");
  const [estValue, setEstValue] = useState("");

  function reset() {
    setCustomerName("");
    setPhone("");
    setModel("");
    setVariant("");
    setSource("walk_in");
    setEstValue("");
    createLead.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleModelChange(value: string) {
    setModel(value);
    const preset = MODELS.find((m) => m.model === value);
    setEstValue(preset ? String(preset.defaultEstValue) : "");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createLead.mutate(
      {
        customerName: customerName.trim(),
        phone: phone.trim() || null,
        model: model || null,
        variant: variant.trim() || null,
        source,
        estValue: estValue === "" ? null : Number(estValue),
      },
      {
        onSuccess: (lead) => {
          handleClose();
          navigate(`/app/agent/leads/${lead.id}`);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add lead"
      className="max-md:h-dvh max-md:max-h-none max-md:rounded-none"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="alCustomerName">Customer name</Label>
            <Input
              id="alCustomerName"
              required
              autoFocus
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alPhone">Phone</Label>
            <Input
              id="alPhone"
              type="tel"
              placeholder="+63 917 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alSource">Source</Label>
            <Select
              id="alSource"
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
            <Label htmlFor="alModel">Model</Label>
            <Select
              id="alModel"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <option value="">No model yet</option>
              {MODELS.map((m) => (
                <option key={m.model} value={m.model}>
                  {m.model}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alVariant">Variant</Label>
            <Input
              id="alVariant"
              placeholder="e.g. 1.3 XLE CVT"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alEstValue">Est. value (₱)</Label>
            <Input
              id="alEstValue"
              type="number"
              min="0"
              step="1000"
              value={estValue}
              onChange={(e) => setEstValue(e.target.value)}
            />
          </div>
        </div>
        {createLead.error && (
          <p role="alert" className="text-sm text-destructive">
            {createLead.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createLead.isPending}>
            {createLead.isPending ? "Saving…" : "Create lead"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
