"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@paysave/ui";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useForm } from "react-hook-form";
import { mockLoginSchema, type MockLoginInput } from "./mock-login-schema";
export function MockLoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MockLoginInput>({
    resolver: zodResolver(mockLoginSchema),
    defaultValues: { email: "demo@paysave.local", password: "MockOnly123!" },
  });
  const submit = async () => {
    await new Promise((r) => setTimeout(r, 250));
    router.push("/dashboard/executive" as Route);
  };
  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="email">
          อีเมล
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground" />
          <Input
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            className="h-12 pl-10"
            id="email"
            type="email"
            {...register("email")}
          />
        </div>
        {errors.email ? (
          <p className="text-sm text-danger" id="email-error" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="password">
          รหัสผ่าน
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground" />
          <Input
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={Boolean(errors.password)}
            className="h-12 pl-10"
            id="password"
            type="password"
            {...register("password")}
          />
        </div>
        {errors.password ? (
          <p className="text-sm text-danger" id="password-error" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <Button className="h-12 w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "กำลังเปิด Demo..." : "เข้าสู่ Mock Workspace"}
        <ArrowRight className="size-4" />
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        ปุ่มนี้นำไปยัง Dashboard จำลองเท่านั้น ไม่มีการส่งข้อมูลออกจาก Browser
      </p>
    </form>
  );
}
