import { Ambulance, CheckCircle2, Clock3, Siren, TimerReset, TrafficCone } from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { usePoliceStore } from "@/store/policeStore";

export function KpiGrid() {
  const getKpis = usePoliceStore((state) => state.getKpis);
  const kpis = getKpis();

  const cards = [
    {
      key: "activeEmergencies",
      label: "Active Emergencies",
      value: kpis.activeEmergencies,
      icon: Siren,
      tone: "critical",
    },
    {
      key: "ambulancesEnRoute",
      label: "Ambulances En Route",
      value: kpis.ambulancesEnRoute,
      icon: Ambulance,
      tone: "primary",
    },
    {
      key: "averageEta",
      label: "Average ETA",
      value: kpis.averageEta,
      suffix: "min",
      icon: Clock3,
      tone: "warning",
    },
    {
      key: "trafficAlerts",
      label: "Traffic Alerts",
      value: kpis.trafficAlerts,
      icon: TrafficCone,
      tone: "warning",
    },
    {
      key: "fiveMinAlerts",
      label: "5 Minute Alerts",
      value: kpis.fiveMinAlerts,
      icon: TimerReset,
      tone: "critical",
    },
    {
      key: "completedTripsToday",
      label: "Completed Trips Today",
      value: kpis.completedTripsToday,
      icon: CheckCircle2,
      tone: "success",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <KpiCard key={card.key} {...card} />
      ))}
    </div>
  );
}
