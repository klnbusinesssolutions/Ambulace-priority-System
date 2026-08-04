import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";
import HospitalLocationAutocomplete from "./HospitalLocationAutocomplete.jsx";

export const hospitalDefaults = {
  hospitalId: "",
  name: "",
  address: "",
  location: "",
  latitude: null,
  longitude: null,
  phone: "",
  email: "",
  password: "",
  city: "",
  state: "",
  isActive: true,
};

export function getNextHospitalId(hospitalsList = []) {
  let maxId = 0;
  hospitalsList.forEach((h) => {
    const idStr = h.hospitalId || h.id || "";
    const match = idStr.match(/^HSP(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  });
  const nextNum = maxId + 1;
  return `HSP${String(nextNum).padStart(2, "0")}`;
}

export default function HospitalForm({ value, onChange, errors = {}, isEdit }) {
  const update = (field, nextValue) => onChange({ ...value, [field]: nextValue });

  const handleLocationSelect = (locData) => {
    onChange({
      ...value,
      location: locData.location,
      address: locData.address,
      latitude: locData.latitude,
      longitude: locData.longitude,
      city: locData.city || value.city,
      state: locData.state || value.state,
      name: value.name ? value.name : locData.placeName || value.name,
    });
  };

  const handleLocationInputChange = (text) => {
    onChange({
      ...value,
      location: text,
      address: text,
      latitude: null,
      longitude: null,
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Hospital ID (Auto-generated)"
        value={value.hospitalId || ""}
        disabled={true}
        readOnly={true}
        placeholder="Auto-generated (e.g. HSP01)"
        className="bg-slate-50 cursor-not-allowed font-mono text-slate-700"
      />
      <Input
        label="Hospital name *"
        value={value.name || ""}
        onChange={(event) => update("name", event.target.value)}
        placeholder="e.g. Bharati Hospital"
        error={errors.name}
      />
      <Input
        label="Email address *"
        type="email"
        value={value.email || ""}
        onChange={(event) => update("email", event.target.value)}
        placeholder="hospital@gmail.com"
        error={errors.email}
      />
      {!isEdit && (
        <div>
          <Input
            label="Password *"
            type="password"
            value={value.password || ""}
            onChange={(event) => update("password", event.target.value)}
            placeholder="Min 8 chars (A-Z, a-z, 0-9)"
            required
            error={errors.password}
          />
          {!errors.password && (
            <p className="mt-1 text-[11px] text-slate-500">
              Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.
            </p>
          )}
        </div>
      )}
      <Input
        label="Phone number *"
        value={value.phone || ""}
        onChange={(event) => update("phone", event.target.value)}
        placeholder="10-digit phone number"
        error={errors.phone}
      />

      <Select
        label="Status"
        value={value.isActive ? "Active" : "Inactive"}
        onChange={(event) => update("isActive", event.target.value === "Active")}
        options={["Active", "Inactive"]}
      />

      {/* Google Places Autocomplete Location Input */}
      <div className="sm:col-span-2">
        <HospitalLocationAutocomplete
          value={value.location || value.address || ""}
          latitude={value.latitude}
          longitude={value.longitude}
          onSelectLocation={handleLocationSelect}
          onChangeInput={handleLocationInputChange}
          error={errors.location || errors.address || errors.coordinates}
        />
      </div>

      {/* Auto-populated read-only Latitude & Longitude fields */}
      <div>
        <Input
          label="Latitude (Auto-filled)"
          value={
            typeof value.latitude === "number" && !isNaN(value.latitude)
              ? value.latitude.toFixed(6)
              : ""
          }
          placeholder="Auto-fetched from Google Places"
          readOnly={true}
          disabled={true}
          className="bg-slate-50 cursor-not-allowed font-mono text-slate-600"
        />
      </div>

      <div>
        <Input
          label="Longitude (Auto-filled)"
          value={
            typeof value.longitude === "number" && !isNaN(value.longitude)
              ? value.longitude.toFixed(6)
              : ""
          }
          placeholder="Auto-fetched from Google Places"
          readOnly={true}
          disabled={true}
          className="bg-slate-50 cursor-not-allowed font-mono text-slate-600"
        />
      </div>

      <Input
        label="City"
        value={value.city || ""}
        onChange={(event) => update("city", event.target.value)}
        placeholder="City"
      />
      <Input
        label="State"
        value={value.state || ""}
        onChange={(event) => update("state", event.target.value)}
        placeholder="State"
      />
    </div>
  );
}
