"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { BRAND_NAMES } from "@/features/cards/validation";
import { CATEGORY_LABELS, PROMOTION_CATEGORIES } from "@/features/promotions/catalog";
import {
  BANK_MAX_LENGTH,
  CONDITIONS_MAX_LENGTH,
  EVERY_CARD,
  MERCHANT_MAX_LENGTH,
  type PromotionErrors,
} from "@/features/promotions/validation";
import { createPromotion } from "./actions";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";

const LABEL_CLASS = "mt-4 mb-1.5 block text-sm font-medium";

const ERROR_CLASS = "mt-1.5 text-sm text-garnet";

const CHECK_CLASS = "flex min-h-11 items-center gap-2 font-serif text-sm";

/** Checkbox labels, Monday first; the index + 1 is the weekday. */
const DAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creando…" : "Crear promoción"}
    </Button>
  );
}

function FieldError({ name, errors }: { name: keyof PromotionErrors; errors?: PromotionErrors }) {
  const error = errors?.[name];
  if (!error) return null;
  return (
    <p id={`${name}-error`} role="alert" className={ERROR_CLASS}>
      {error}
    </p>
  );
}

export function PromotionForm() {
  const [state, action] = useActionState(createPromotion, undefined);
  const values = state?.values;
  const errors = state?.errors;
  const invalid = (name: keyof PromotionErrors) => ({
    "aria-invalid": Boolean(errors?.[name]),
    "aria-describedby": errors?.[name] ? `${name}-error` : undefined,
  });

  return (
    <form action={action} noValidate className="flex flex-col">
      <label htmlFor="bank" className="mb-1.5 block text-sm font-medium">
        Banco <span className="font-normal text-muted">(opcional)</span>
      </label>
      <input
        id="bank"
        name="bank"
        maxLength={BANK_MAX_LENGTH}
        placeholder="Banco Ceibo"
        defaultValue={values?.bank}
        {...invalid("bank")}
        className={INPUT_CLASS}
      />
      <FieldError name="bank" errors={errors} />

      <label htmlFor="cardBrand" className={LABEL_CLASS}>
        Emisora
      </label>
      <select
        id="cardBrand"
        name="cardBrand"
        // A new select per result, so the chosen value comes back after a submit.
        key={`cardBrand-${values?.cardBrand}`}
        defaultValue={values?.cardBrand ?? EVERY_CARD}
        {...invalid("cardBrand")}
        className={INPUT_CLASS}
      >
        <option value={EVERY_CARD}>Todas las tarjetas</option>
        {Object.entries(BRAND_NAMES).map(([brand, name]) => (
          <option key={brand} value={brand}>
            {name}
          </option>
        ))}
      </select>
      <FieldError name="cardBrand" errors={errors} />

      <label htmlFor="merchant" className={LABEL_CLASS}>
        Nombre
      </label>
      <input
        id="merchant"
        name="merchant"
        maxLength={MERCHANT_MAX_LENGTH}
        placeholder="Nombre del comercio"
        defaultValue={values?.merchant}
        {...invalid("merchant")}
        className={INPUT_CLASS}
      />
      <FieldError name="merchant" errors={errors} />

      <label htmlFor="category" className={LABEL_CLASS}>
        Categoría
      </label>
      <select
        id="category"
        name="category"
        key={`category-${values?.category}`}
        defaultValue={values?.category ?? PROMOTION_CATEGORIES[0]}
        {...invalid("category")}
        className={INPUT_CLASS}
      >
        {PROMOTION_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </select>
      <FieldError name="category" errors={errors} />

      <fieldset className="mt-4" {...invalid("weekdays")}>
        <legend className="mb-1.5 text-sm font-medium">Días</legend>
        <div className="grid grid-cols-2 gap-x-3">
          {DAY_LABELS.map((label, index) => (
            <label key={label} className={CHECK_CLASS}>
              <input
                type="checkbox"
                name="weekdays"
                value={index + 1}
                defaultChecked={values?.weekdays.includes(String(index + 1))}
                className="size-5 rounded accent-garnet"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <FieldError name="weekdays" errors={errors} />

      <label htmlFor="percent" className={LABEL_CLASS}>
        Porcentaje de descuento
      </label>
      <input
        id="percent"
        name="percent"
        inputMode="numeric"
        placeholder="10"
        defaultValue={values?.percent}
        {...invalid("percent")}
        className={INPUT_CLASS}
      />
      <FieldError name="percent" errors={errors} />

      <label htmlFor="cap" className={LABEL_CLASS}>
        Límite de descuento
      </label>
      <input
        id="cap"
        name="cap"
        inputMode="decimal"
        placeholder="10.000"
        defaultValue={values?.cap}
        {...invalid("cap")}
        className={INPUT_CLASS}
      />
      <label className={CHECK_CLASS}>
        <input
          type="checkbox"
          name="noCap"
          defaultChecked={values?.noCap}
          className="size-5 rounded accent-garnet"
        />
        Sin límite
      </label>
      <FieldError name="cap" errors={errors} />

      <label htmlFor="minimum" className={LABEL_CLASS}>
        Compra mínima
      </label>
      <input
        id="minimum"
        name="minimum"
        inputMode="decimal"
        placeholder="30.000"
        defaultValue={values?.minimum}
        {...invalid("minimum")}
        className={INPUT_CLASS}
      />
      <label className={CHECK_CLASS}>
        <input
          type="checkbox"
          name="noMinimum"
          defaultChecked={values?.noMinimum}
          className="size-5 rounded accent-garnet"
        />
        Sin mínimo
      </label>
      <FieldError name="minimum" errors={errors} />
      <p className="mt-1.5 text-xs text-muted">
        Montos en pesos. Con Sin límite o Sin mínimo marcado, el monto escrito no se usa.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="validFrom" className={LABEL_CLASS}>
            Vigencia desde
          </label>
          <input
            id="validFrom"
            name="validFrom"
            type="date"
            defaultValue={values?.validFrom}
            {...invalid("validFrom")}
            className={INPUT_CLASS}
          />
          <FieldError name="validFrom" errors={errors} />
        </div>
        <div>
          <label htmlFor="validUntil" className={LABEL_CLASS}>
            Vigencia hasta
          </label>
          <input
            id="validUntil"
            name="validUntil"
            type="date"
            defaultValue={values?.validUntil}
            {...invalid("validUntil")}
            className={INPUT_CLASS}
          />
          <FieldError name="validUntil" errors={errors} />
        </div>
      </div>

      <label htmlFor="conditions" className={LABEL_CLASS}>
        Descripción
      </label>
      <textarea
        id="conditions"
        name="conditions"
        rows={3}
        maxLength={CONDITIONS_MAX_LENGTH}
        placeholder="Condiciones de la promoción"
        defaultValue={values?.conditions}
        {...invalid("conditions")}
        className={`${INPUT_CLASS} h-auto py-3`}
      />
      <FieldError name="conditions" errors={errors} />

      {errors?.form && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.form}
        </p>
      )}

      <div className="pt-8">
        <SubmitButton />
      </div>
    </form>
  );
}
