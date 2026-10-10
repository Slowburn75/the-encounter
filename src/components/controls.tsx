"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, secondaryButtonClass } from "@/components/styles";

export function SubmitButton({
  label,
  pendingLabel,
  className = buttonClass,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={secondaryButtonClass}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const area = document.createElement("textarea");
          area.value = value;
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        setCopied(true);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
