"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import type { AirtableRecordWithId } from "@/lib/types";

interface Props {
  submission: AirtableRecordWithId;
}

interface FormState {
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  country: string;
  zipCode: string;
}

export function ClaimForm({ submission }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    addressLine1: submission["Address (Line 1)"] ?? "",
    addressLine2: submission["Address (Line 2)"] ?? "",
    city: submission.City ?? "",
    stateProvince: submission["State / Province"] ?? "",
    country: submission.Country ?? "",
    zipCode: submission["ZIP / Postal Code"] ?? "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function field(name: keyof FormState) {
    return {
      value: form[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [name]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const res = await fetch(`/api/submissions/${submission._id}/claim-tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push(`/claim/${submission._id}/claimed`);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Something went wrong. Try again.");
      setStatus("error");
    }
  }

  const inputClass =
    "w-full border-[1.5px] border-ink rounded-md px-4 py-3 font-body text-sm bg-paper placeholder:text-smoke transition-[border-color,box-shadow] duration-150 focus:outline-none focus:border-magenta focus:shadow-[0_0_0_4px_rgba(255,45,111,0.12)]";

  return (
    <div className="max-w-[600px] mx-auto px-6 py-16">
      <EyebrowLabel className="mb-4 block">claim your luggage tag</EyebrowLabel>
      <h1
        className="font-display text-ink mb-4"
        style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 0.96 }}
      >
        where's it shipping?
      </h1>
      <p className="text-ink-soft text-sm mb-10">
        Confirm or update the shipping address for {submission["First Name"]} {submission["Last Name"]}'s
        approved project.
      </p>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <EyebrowLabel>address line 1</EyebrowLabel>
            <input className={inputClass} required {...field("addressLine1")} />
          </div>
          <div className="flex flex-col gap-2">
            <EyebrowLabel>address line 2 (optional)</EyebrowLabel>
            <input className={inputClass} {...field("addressLine2")} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <EyebrowLabel>city</EyebrowLabel>
              <input className={inputClass} required {...field("city")} />
            </div>
            <div className="flex flex-col gap-2">
              <EyebrowLabel>state / province</EyebrowLabel>
              <input className={inputClass} required {...field("stateProvince")} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <EyebrowLabel>country</EyebrowLabel>
              <input className={inputClass} required {...field("country")} />
            </div>
            <div className="flex flex-col gap-2">
              <EyebrowLabel>zip / postal code</EyebrowLabel>
              <input className={inputClass} required {...field("zipCode")} />
            </div>
          </div>

          {status === "error" && (
            <p className="text-magenta text-sm border border-magenta rounded-md px-4 py-3 bg-magenta-soft/30">
              {errorMsg}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={status === "submitting"} className="self-start">
            {status === "submitting" ? "claiming..." : "claim my tag →"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
