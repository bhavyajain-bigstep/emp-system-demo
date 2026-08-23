import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Shield, Calendar, Users, Plane, Lock, Sparkles } from "lucide-react";

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
      toast("success", "Welcome back. You're signed in.");
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
    <div className="flex min-h-screen bg-[var(--bg-page)]">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 relative">
        <div className="absolute inset-0 opacity-50 bg-pattern" />
        
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-lg font-extrabold text-white border border-white/30">
            T
          </div>
          <div>
            <p className="text-lg font-bold text-white">TimeFlow</p>
            <p className="text-sm text-brand-100">Workforce Time & Attendance</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
            One platform. Complete workforce visibility.
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            Track attendance, manage time off, and approve requests in one unified system. Built for teams that value clarity.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { icon: Calendar, label: "Smart attendance", desc: "Check-in, overtime & late tracking" },
              { icon: Plane, label: "Time off workflow", desc: "Request, approve & balance sync" },
              { icon: Users, label: "Role-based views", desc: "Employee, lead & admin dashboards" },
              { icon: Shield, label: "Full audit trail", desc: "Every action recorded" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4">
                <f.icon className="size-5 text-brand-300" />
                <p className="mt-2 text-sm font-semibold text-white">{f.label}</p>
                <p className="mt-0.5 text-xs text-brand-200">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between">
          <p className="text-xs text-brand-200">
            © {new Date().getFullYear()} TimeFlow · Workforce Time & Attendance Platform
          </p>
          <div className="flex items-center gap-3 text-xs text-brand-200">
            <Sparkles className="size-4" />
            <span>Simple by design</span>
            <Shield className="size-4" />
            <span>Secure by default</span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-[var(--bg-page)] px-6 py-12 lg:w-1/2">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-base font-extrabold text-white">
            T
          </div>
          <div>
            <p className="text-base font-bold text-[var(--text-primary)]">TimeFlow</p>
            <p className="text-xs text-[var(--text-muted)]">Time & Attendance</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Sign in to your workspace</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
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

          <div className="mt-8 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
              <Lock className="size-4" />
              Demo accounts
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
              <span>admin@demo.com</span>
              <span>hr@demo.com</span>
              <span>lead@demo.com</span>
              <span>employee@demo.com</span>
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Password for all accounts: <span className="font-mono font-semibold">Password@123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}