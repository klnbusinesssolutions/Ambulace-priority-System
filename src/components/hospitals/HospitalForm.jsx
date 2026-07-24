import Input from "../ui/Input.jsx";
import Select from "../ui/Select.jsx";

export const hospitalDefaults = {
  hospitalId: "",
  name: "",
  address: "",
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
export default function HospitalForm({ value, onChange, isEdit }) {
  const update = (field, nextValue) => onChange({ ...value, [field]: nextValue });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Hospital ID (Auto-generated)"
        value={value.hospitalId}
        disabled={true}
        readOnly={true}
        placeholder="Auto-generated (e.g. HSP01)"
        className="bg-slate-50 cursor-not-allowed font-mono text-slate-700"
      />
      <Input
        label="Hospital name *"
        value={value.name}
        onChange={(event) => update("name", event.target.value)}
        placeholder="e.g. Bharati Hospital"
      />
      <Input
        label="Email address *"
        type="email"
        value={value.email}
        onChange={(event) => update("email", event.target.value)}
        placeholder="hospital@gmail.com"
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
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.
          </p>
        </div>
      )}
      <Input label="Phone" value={value.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Phone number" />
      <Input label="City" value={value.city} onChange={(event) => update("city", event.target.value)} placeholder="City" />
      <Input label="State" value={value.state} onChange={(event) => update("state", event.target.value)} placeholder="State" />
      <Select
        label="Status"
        value={value.isActive ? "Active" : "Inactive"}
        onChange={(event) => update("isActive", event.target.value === "Active")}
        options={["Active", "Inactive"]}
      />
      <div className="sm:col-span-2">
        <Input label="Address" value={value.address} onChange={(event) => update("address", event.target.value)} placeholder="Full street address" />
      </div>
    </div>
  );
}
