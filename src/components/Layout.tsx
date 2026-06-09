import { useState } from "react";
import type { ReactNode } from "react";
import { Menu, LogOut, Sun, Moon, Languages } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet";
import { useTheme, type Theme } from "./theme-provider";
import type { Dict, Lang, SessionUser } from "../types";

const THEME_OPTIONS: [Theme, LucideIcon][] = [["light", Sun], ["dark", Moon]];

export interface NavItem { key: string; icon: LucideIcon; label: string; }

interface Props {
  t: Dict;
  lang: Lang;
  setLang: (l: Lang) => void;
  currentUser: SessionUser;
  isAdmin: boolean;
  isTeacher: boolean;
  navItems: NavItem[];
  activeTab: string;
  onNav: (k: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

type SidebarProps = Omit<Props, "children">;

// Theme-aware sidebar body (light in light mode, dark in dark mode), shared
// between the desktop rail and the mobile drawer.
function Sidebar({ t, lang, setLang, currentUser, navItems, activeTab, onNav, onLogout }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex h-full flex-col border-r border-border bg-card text-card-foreground">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground">KPI</div>
        <div className="truncate text-sm font-bold text-foreground">{t.appTitle}</div>
      </div>
      <div className="px-4 py-3">
        <div className="flex gap-1 rounded-md border border-border bg-muted/50 p-1">
          {THEME_OPTIONS.map(([val, Icon]) => (
            <button
              key={val}
              onClick={() => setTheme(val)}
              title={val}
              className={cn(
                "flex flex-1 items-center justify-center rounded py-1.5 transition-colors",
                theme === val ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          <button
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            title={lang === "bn" ? "English" : "বাংলা"}
            aria-label={lang === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন"}
            className="flex flex-1 items-center justify-center rounded bg-primary py-1.5 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Languages className="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNav(item.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-3 px-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{(currentUser.name || "A")[0]}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{currentUser.name}</div>
            {currentUser.systemId && <div className="text-xs text-muted-foreground">{currentUser.systemId}</div>}
          </div>
        </div>
        <Button onClick={onLogout} size="sm" variant="secondary" className="w-full gap-2">
          <LogOut className="h-4 w-4" />{t.logout}
        </Button>
      </div>
    </div>
  );
}

// App shell: desktop sidebar rail + mobile top bar (drawer) + <main>.
export function Layout(props: Props) {
  const { t, children } = props;
  const [open, setOpen] = useState(false);
  const sidebarProps: SidebarProps = { ...props, onNav: (k) => { props.onNav(k); setOpen(false); } };
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 md:block">
        <Sidebar {...sidebarProps} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card px-3 shadow-sm md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-1 text-foreground" aria-label="Menu"><Menu className="h-6 w-6" /></button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-0 p-0">
              <SheetTitle className="sr-only">{t.appTitle}</SheetTitle>
              <Sidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>
          <div className="grid h-7 w-7 place-items-center rounded bg-primary text-xs font-extrabold text-primary-foreground">KPI</div>
          <span className="flex-1 truncate text-xs font-bold text-foreground">{t.appTitle}</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
