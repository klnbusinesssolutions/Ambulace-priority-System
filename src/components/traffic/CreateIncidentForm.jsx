import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePoliceStore } from "@/store/policeStore";

const INCIDENT_TYPES = [
  "Road Closed",
  "Heavy Traffic",
  "Accident",
  "VIP Movement",
  "Construction",
  "Flood",
  "Vehicle Breakdown",
];

const SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

export function CreateIncidentForm() {
  const emergencies = usePoliceStore((state) => state.emergencies);
  const addTrafficIncident = usePoliceStore((state) => state.addTrafficIncident);

  const [road, setRoad] = useState("");
  const [type, setType] = useState(INCIDENT_TYPES[0]);
  const [severity, setSeverity] = useState("Medium");
  const [createdBy, setCreatedBy] = useState("");
  const [affectedTrip, setAffectedTrip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = road.trim().length > 0 && createdBy.trim().length > 0 && !submitting;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");
    try {
      await addTrafficIncident({
        road: road.trim(),
        type,
        severity,
        createdBy: createdBy.trim(),
        affectedTrips: affectedTrip ? [affectedTrip] : [],
      });
      setRoad("");
      setCreatedBy("");
      setAffectedTrip("");
    } catch (submitError) {
      setError(submitError.message || "Unable to save incident to Firestore.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-5">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Road
        <Input value={road} onChange={(event) => setRoad(event.target.value)} placeholder="e.g. Ring Road South" />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Incident type
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {INCIDENT_TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Severity
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SEVERITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Affected trip
        <select
          value={affectedTrip}
          onChange={(event) => setAffectedTrip(event.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">None</option>
          {emergencies.map((emergency) => (
            <option key={emergency.id} value={emergency.id}>
              {emergency.id}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Created by
        <div className="flex gap-2">
          <Input value={createdBy} onChange={(event) => setCreatedBy(event.target.value)} placeholder="Const. name" />
          <Button type="submit" size="icon" disabled={!canSubmit} aria-label="Add incident">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </label>
      {error && <p className="text-sm text-red-600 sm:col-span-2 xl:col-span-5">{error}</p>}
    </form>
  );
}
