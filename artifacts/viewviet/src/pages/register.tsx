import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirmPassword: "", displayName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.displayName);
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2 text-primary font-bold text-2xl">
              <img src="/logo192.png" alt="ViewViet Logo" className="h-8 w-8 object-cover rounded shadow-sm" />
              <span>ViewViet</span>
            </div>
          </div>
          <CardTitle className="text-xl">{t("auth.register")}</CardTitle>
          <CardDescription>{t("auth.register_subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="username">{t("auth.username")}</Label>
                <Input id="username" value={form.username} onChange={set("username")} required autoComplete="username" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="displayName">{t("auth.display_name")}</Label>
                <Input id="displayName" value={form.displayName} onChange={set("displayName")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input id="password" type="password" value={form.password} onChange={set("password")} required autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t("auth.confirm_password")}</Label>
              <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} required autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.registering") : t("auth.sign_up")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("auth.have_account")}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t("auth.sign_in")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
