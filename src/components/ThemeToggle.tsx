import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  console.log("ThemeToggle - Current theme:", theme)

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    console.log("Changing theme to:", newTheme)
    setTheme(newTheme)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => console.log("Theme button clicked")}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">החלף מצב צבע</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-background border border-border shadow-lg z-50 min-w-[120px]"
        sideOffset={5}
      >
        <DropdownMenuItem 
          onClick={() => handleThemeChange("light")}
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            🌞 בהיר
          </span>
          {theme === "light" && <span className="text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("dark")}
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            🌙 כהה
          </span>
          {theme === "dark" && <span className="text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("system")}
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            💻 מערכת
          </span>
          {theme === "system" && <span className="text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}