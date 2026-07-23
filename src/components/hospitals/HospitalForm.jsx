import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";

export const hospitalDefaults = {
  hospitalId: "",
  name: "",
  address: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  lat: "",
  lng: "",
  isActive: true,
};

export default function HospitalForm({ value, onChange, isEdit }) {
  const update = (field, nextValue) =>
    onChange({ ...value, [field]: nextValue });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Hospital ID"
        value={value.hospitalId}
        disabled={isEdit}
        placeholder="HSP01"
        onChange={(event) => update("hospitalId", event.target.value)}
      />

      <Input
        label="Hospital Name"
        value={value.name}
        onChange={(event) => update("name", event.target.value)}
      />

      <Input
        label="City"
        value={value.city}
        onChange={(event) => update("city", event.target.value)}
      />

      <Input
        label="State"
        value={value.state}
        onChange={(event) => update("state", event.target.value)}
      />

      <Input
        label="Phone"
        value={value.phone}
        onChange={(event) => update("phone", event.target.value)}
      />

      <Input
        label="Email"
        type="email"
        value={value.email}
        onChange={(event) => update("email", event.target.value)}
      />

      <Input
        label="Latitude"
        type="number"
        step="any"
        placeholder="18.5018"
        value={value.lat}
        onChange={(event) => update("lat", Number(event.target.value))}
      />

      <Input
        label="Longitude"
        type="number"
        step="any"
        placeholder="73.8636"
        value={value.lng}
        onChange={(event) => update("lng", Number(event.target.value))}
      />

      <div className="sm:col-span-2">
        <Input
          label="Address"
          value={value.address}
          onChange={(event) => update("address", event.target.value)}
        />
      </div>

      <Select
        label="Status"
        value={value.isActive ? "Active" : "Inactive"}
        onChange={(event) =>
          update("isActive", event.target.value === "Active")
        }
        options={["Active", "Inactive"]}
      />
    </div>
  );
}