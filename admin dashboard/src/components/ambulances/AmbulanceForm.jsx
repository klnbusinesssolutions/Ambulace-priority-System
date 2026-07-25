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

export default function AmbulanceForm({ value, onChange, hospitals = [], errors = {} }) {
  const update = (field, nextValue) => onChange({ ...value, [field]: nextValue });

  const handleRegistrationChange = (event) => {
    const uppercaseVal = event.target.value.toUpperCase();
    update("registrationNumber", uppercaseVal);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Number plate *"
        value={value.numberPlate}
        onChange={(event) => update("numberPlate", event.target.value)}
        placeholder="e.g. MH01AB1234"
        error={errors.numberPlate}
      />
      <Input
        label="Registration number *"
        value={value.registrationNumber}
        onChange={handleRegistrationChange}
        placeholder="e.g. MH01AB1234"
        error={errors.registrationNumber}
      />
      <Input
        label="Manufacturer *"
        value={value.manufacturer}
        onChange={(event) => update("manufacturer", event.target.value)}
        placeholder="e.g. Force / Tata"
        error={errors.manufacturer}
      />
      <Input
        label="Model *"
        value={value.model}
        onChange={(event) => update("model", event.target.value)}
        placeholder="e.g. Traveller / Winger"
        error={errors.model}
      />
      <Select
        label="Vehicle type *"
        value={value.vehicleType}
        onChange={(event) => update("vehicleType", event.target.value)}
        options={AMBULANCE_VEHICLE_TYPES}
        error={errors.vehicleType}
      />
      <Select
        label="Capacity *"
        value={value.capacity}
        onChange={(event) => update("capacity", event.target.value)}
        options={AMBULANCE_CAPACITIES}
        error={errors.capacity}
      />
      <Select
        label="Hospital *"
        value={value.hospitalId}
        onChange={(event) => update("hospitalId", event.target.value)}
        options={[{ label: "Select Hospital...", value: "" }, ...hospitals.map((item) => ({ label: item.name, value: item.hospitalId }))]}
        error={errors.hospitalId}
      />
      <Select
        label="Availability *"
        value={value.availability}
        onChange={(event) => update("availability", event.target.value)}
        options={["available", "on_trip", "offline"]}
        error={errors.availability}
      />
      <div className="sm:col-span-2">
        <Input
          label="Medical capabilities (optional, comma-separated)"
          value={Array.isArray(value.medicalCapabilities) ? value.medicalCapabilities.join(", ") : value.medicalCapabilities || ""}
          onChange={(event) => update("medicalCapabilities", event.target.value)}
          placeholder="e.g. Oxygen Support, Ventilator, Defibrillator"
        />
      </div>
    </div>
  );
}
