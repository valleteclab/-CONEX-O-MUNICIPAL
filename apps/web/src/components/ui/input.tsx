import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full min-h-[44px] rounded-btn border-2 border-marinha-900/12 bg-white px-3 py-2 text-marinha-900 placeholder:text-marinha-500/70",
        "focus:border-municipal-600 focus:outline-none focus:ring-2 focus:ring-municipal-600/25",
        "transition-shadow",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full min-h-[100px] rounded-btn border-2 border-marinha-900/12 bg-white px-3 py-2 text-marinha-900 placeholder:text-marinha-500/70",
        "focus:border-municipal-600 focus:outline-none focus:ring-2 focus:ring-municipal-600/25",
        "resize-y",
        className,
      )}
      {...props}
    />
  );
}
