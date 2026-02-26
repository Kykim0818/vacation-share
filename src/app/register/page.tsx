"use client";

import { VacationForm } from "@/components/vacation/vacation-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">휴가 등록</h1>
        <p className="text-sm text-muted-foreground">
          새 휴가를 등록합니다. GitHub Issue로 자동 생성됩니다.
        </p>
      </div>
      <VacationForm />
    </div>
  );
}
