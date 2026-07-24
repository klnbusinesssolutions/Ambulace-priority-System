import { cn } from "../../utils/cn.js";

export function Card({ className, ...props }) {
  return (
    <section
      className={cn("rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("border-b border-slate-100/90 px-6 py-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h2 className={cn("text-base font-semibold tracking-tight text-slate-950", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("mt-1 text-sm text-slate-500", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-6", className)} {...props} />;
}
