import { useAppStore } from "./store";

export function useFormConfig(formId) {
  const { formConfigs } = useAppStore();
  const config = formConfigs.find((c) => c.formId === formId);
  const fields = config?.fields || [];

  function field(fieldId) {
    const f = fields.find((x) => x.fieldId === fieldId);
    if (!f) return { visible: true, required: false, label: fieldId, options: [], placeholder: "", type: "text" };
    return {
      visible: f.visible !== false,
      required: !!f.required,
      label: f.label,
      options: f.options || [],
      placeholder: f.placeholder || "",
      type: f.type || "text",
    };
  }

  const customFields = fields.filter((f) => f.isCustom && f.visible !== false);

  return { field, customFields, config, fields };
}
