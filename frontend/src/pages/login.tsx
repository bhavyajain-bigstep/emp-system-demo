import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, CalendarClock, Plane, Scale, LockKeyhole } from "lucide-react";

import { useAuth } from "@/context/auth";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";
import { getErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: () => {
      toast("success", "Welcome back! You're signed in.");
      navigate(location.state?.from ?? "/dashboard", { replace: true });
    },
    onError: (error) => {
      toast("error", getErrorMessage(error));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate();
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-900 p-12 lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-primary-600/20 blur-3xl" />
        <div className="absolute bottom-0 -left-24 size-96 rounded-full bg-primary-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary-600 text-lg font-extrabold text-white">
            PH
          </div>
          <div>
            <p className="text-lg font-bold text-white">PulseHR</p>
            <p className="text-sm text-surface-400">Employee Leave & Attendance</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight text-white">
            Keep your team present, planned, and productive.
          </h1>
          <p className="mt-4 max-w-md text-surface-400">
            A single platform to manage attendance, leave requests, approvals, and reporting across your
            organization.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-4">
            {[
              { icon: CalendarClock, label: "Smart attendance", desc: "Check-in, summary & late tracking" },
              { icon: Plane, label: "Leave workflow", desc: "Apply, approve & balance tracking" },
              { icon: Scale, label: "Role-based access", desc: "Employee, manager & HR views" },
              { icon: ShieldCheck, label: "Audit trail", desc: "Every action is recorded" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-surface-800 bg-surface-800/50 p-4">
                <f.icon className="size-5 text-primary-400" />
                <p className="mt-2 text-sm font-semibold text-white">{f.label}</p>
                <p className="mt-0.5 text-xs text-surface-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-surface-500">
          © {new Date().getFullYear()} PulseHR · Employee Leave & Attendance Management System
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-surface-50 px-6 py-12 lg:w-1/2">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-600 text-base font-extrabold text-white">
            PH
          </div>
          <div>
            <p className="text-base font-bold text-surface-900">PulseHR</p>
            <p className="text-xs text-surface-500">Leave & Attendance</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold tracking-tight text-surface-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-surface-500">
            Use your work email and password to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldError message={errors.password} />
            </div>

            <Button type="submit" size="lg" className="w-full" loading={mutation.isPending}>
              {mutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-primary-100 bg-primary-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-800">
              <LockKeyhole className="size-4" />
              Demo accounts
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-primary-900">
              <span>admin@example.com</span>
              <span>hr@example.com</span>
              <span>manager@example.com</span>
              <span>employee@example.com</span>
            </div>
            <p className="mt-2 text-xs text-primary-700">
              Password for all demo accounts: <span className="font-mono font-semibold">Password@123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}