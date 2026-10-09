import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import type { Draft } from "@/lib/model";
import { matchFields, type Field } from "@/lib/fields";
import { pitFields } from "@/lib/pit-fields";
import { translate } from "@/lib/translations";

export type ValueUpdate = string | number | ((current: string | number) => string | number);
export default function ReportForm({
  draft,
  update,
  language,
}: {
  draft: Draft;
  update: (key: string, value: ValueUpdate) => void;
  language: string;
}) {
  const pit = draft.mode === "pit";
  const fields = draft.mode === "pit" ? pitFields : matchFields[draft.mode];
  const t = (label: string) => (pit ? translate(label, language) : label);
  function renderField(field: Field, prefix = "") {
    const key = prefix + field.key;
    const value = draft.values[key] ?? (field.type === "count" ? 0 : "");
    return (
      <div key={key} className="space-y-2 min-w-0">
        <Label htmlFor={key}>{t(field.label)}</Label>
        {field.type === "count" ? (
          <div className="counter">
            <Input
              id={key}
              type="number"
              min={0}
              className="counter-value"
              value={value}
              onChange={(event) => update(key, Math.max(0, Number(event.target.value)))}
            />
            <div className="counter-buttons">
              {[-1, 1, 3, 5, 10].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  type="button"
                  aria-label={`${field.label} ${amount > 0 ? "plus" : "minus"} ${Math.abs(amount)}`}
                  onClick={() => update(key, (current) => Math.max(0, Number(current || 0) + amount))}
                >
                  {amount > 0 ? "+" : ""}
                  {amount}
                </Button>
              ))}
            </div>
          </div>
        ) : field.type === "multi" ? (
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => {
              const selected = String(value).split(" | ").includes(option);
              return (
                <Button
                  key={option}
                  variant={selected ? "default" : "outline"}
                  aria-pressed={selected}
                  onClick={() =>
                    update(key, (current) => {
                      const options = String(current).split(" | ").filter(Boolean);
                      return (
                        options.includes(option)
                          ? options.filter((item) => item !== option)
                          : [...options, option]
                      ).join(" | ");
                    })
                  }
                >
                  {t(option)}
                </Button>
              );
            })}
          </div>
        ) : field.type === "select" ? (
          <select
            id={key}
            className="field"
            value={value}
            onChange={(event) => update(key, event.target.value)}
          >
            <option value="">{pit ? t("selectOption") : "Choose…"}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {t(option)}
              </option>
            ))}
          </select>
        ) : field.type === "textarea" ? (
          <Textarea
            id={key}
            value={value}
            placeholder={t(field.placeholder ?? "")}
            onChange={(event) => update(key, event.target.value)}
          />
        ) : (
          <Input
            id={key}
            value={value}
            placeholder={t(field.placeholder ?? "")}
            onChange={(event) => update(key, event.target.value)}
          />
        )}
      </div>
    );
  }
  const sections = [
    ...new Set(fields.filter((field) => field.section !== "Autos").map((field) => field.section)),
  ];
  const autoCount = Number(draft.values.autoCount ?? 0);
  return (
    <div className="space-y-6" dir={pit && language === "he" ? "rtl" : "ltr"}>
      {sections.map((section, index) => (
        <section key={section} className="form-section">
          <div className="section-heading">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{t(section)}</h3>
          </div>
          <div className="form-grid">
            {fields.filter((field) => field.section === section).map((field) => renderField(field))}
          </div>
        </section>
      ))}
      {pit && (
        <section className="form-section space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3>
              {t("Autos")} · {autoCount}
            </h3>
            <Button
              variant="outline"
              disabled={autoCount >= 12}
              onClick={() => update("autoCount", (current) => Number(current || 0) + 1)}
            >
              {t("addAuto")}
            </Button>
          </div>
          {Array.from({ length: autoCount }, (_, index) => (
            <details key={index} open className="auto-card">
              <summary>
                {t("Autos")} {index + 1}
              </summary>
              <div className="form-grid mt-4">
                {fields
                  .filter((field) => field.section === "Autos")
                  .map((field) => renderField(field, `auto_${index + 1}_`))}
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
