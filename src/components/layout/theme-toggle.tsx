"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 시스템 테마가 설정된 경우, 실제 resolved 값(light/dark)으로 확정
  useEffect(() => {
    if (mounted && theme === "system" && resolvedTheme) {
      setTheme(resolvedTheme)
    }
  }, [mounted, theme, resolvedTheme, setTheme])

  function toggleTheme() {
    const current = theme === "system" ? resolvedTheme : theme
    setTheme(current === "dark" ? "light" : "dark")
  }

  // SSR 시 placeholder (hydration mismatch 방지)
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="테마 변경">
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="테마 변경"
      title={
        (theme === "system" ? resolvedTheme : theme) === "dark"
          ? "다크 (클릭하여 라이트로)"
          : "라이트 (클릭하여 다크로)"
      }
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
