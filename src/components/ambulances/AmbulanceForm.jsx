import { AMBULANCE_CAPACITIES, AMBULANCE_VEHICLE_TYPES } from "../../firebase/collections.js";
import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";

export const ambulanceDefaults = {
  numberPlate: "",
  manufacturer: "",
  model: "",
  registrationNumber: "",
  vehicleType: "ICU",
  capacity: "12 Seater",
  medicalCapabilities: "",
  hospitalId: "",
  availability: "available",
};

export default function AmbulanceForm({ value, onChange, hospitals }) {
  const update = (field, nextValue) => onChange({ ...value, [field]: nextValue });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Number plate" value={value.numberPlate} onChange={(event) => update("numberPlate", event.target.value)} />
      <Input label="Registration number" value={value.registrationNumber} onChange={(event) => update("registrationNumber", event.target.value)} />
      <Input label="Manufacturer" value={value.manufacturer} onChange={(event) => update("manufacturer", event.target.value)} />
      <Input label="Model" value={value.model} onChange={(event) => update("model", event.target.value)} />
      <Select label="Vehicle type" value={value.vehicleType} onChange={(event) => update("vehicleType", event.target.value)} options={AMBULANCE_VEHICLE_TYPES} />
      <Select label="Capacity" value={value.capacity} onChange={(event) => update("capacity", event.target.value)} options={AMBULANCE_CAPACITIES} />
      <Select
        label="Hospital"
        value={value.hospitalId}
        onChange={(event) => update("hospitalId", event.target.value)}
        options={["", ...hospitals.map((item) => ({ label: item.name, value: item.hospitalId }))]}
      />
      <Select label="Availability" value={value.availability} onChange={(event) => update("availability", event.target.value)} options={["available", "on_trip", "offline"]} />
      <div className="sm:col-span-2">
        <Input
          label="Medical capabilities (comma-separated)"
          value={Array.isArray(value.medicalCapabilities) ? value.medicalCapabilities.join(", ") : value.medicalCapabilities}
          onChange={(event) => update("medicalCapabilities", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
        />
      </div>
    </div>
  );
}
