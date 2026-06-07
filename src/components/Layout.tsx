import { useState } from "react";
import type { ReactNode } from "react";
import { Menu, LogOut, Sun, Moon, Monitor } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet";
import { useTheme, type Theme } from "./theme-provider";
import type { Dict, Lang, SessionUser } from "../types";

const THEME_OPTIONS: [Theme, LucideIcon][] = [["light", Sun], ["system", Monitor], ["dark", Moon]];

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
  notif: string;
  children: ReactNode;
}

type SidebarProps = Omit<Props, "notif" | "children">;

// Dark sidebar body, shared between the desktop rail and the mobile drawer.
function Sidebar({ t, lang, setLang, currentUser, isAdmin, isTeacher, navItems, activeTab, onNav, onLogout }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const roleLabel = isAdmin ? t.admin : isTeacher ? t.teacher : currentUser.role === "student" ? t.student : t.parent;
  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-extrabold text-slate-900">KPI</div>
        <div className="truncate text-sm font-bold text-slate-100">{t.appTitle}</div>
      </div>
      <div className="space-y-2 px-4 py-3">
        <button
          onClick={() => setLang(lang === "bn" ? "en" : "bn")}
          className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
        >
          {lang === "bn" ? "English" : "বাংলা"}
        </button>
        <div className="flex gap-1 rounded-md border border-slate-700 bg-slate-800/60 p-1">
          {THEME_OPTIONS.map(([val, Icon]) => (
            <button
              key={val}
              onClick={() => setTheme(val)}
              title={val}
              className={cn(
                "flex flex-1 items-center justify-center rounded py-1.5 transition-colors",
                theme === val ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
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
                active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-3">
        <div className="mb-2 flex items-center gap-3 px-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-700 text-sm font-bold text-white">{(currentUser.name || "A")[0]}</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{currentUser.name}</div>
            <div className="text-xs text-slate-400">{roleLabel}</div>
            {currentUser.systemId && <div className="text-[10px] text-slate-500">{currentUser.systemId}</div>}
          </div>
        </div>
        <Button onClick={onLogout} size="sm" className="w-full gap-2 bg-slate-800 text-slate-100 hover:bg-slate-700">
          <LogOut className="h-4 w-4" />{t.logout}
        </Button>
      </div>
    </div>
  );
}

// App shell: desktop sidebar rail + mobile top bar (drawer) + <main>.
export function Layout(props: Props) {
  const { t, notif, children } = props;
  const [open, setOpen] = useState(false);
  const sidebarProps: SidebarProps = { ...props, onNav: (k) => { props.onNav(k); setOpen(false); } };
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {notif && (
        <div className="fixed right-3 top-3 z-50 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-lg md:right-4 md:top-4">{notif}</div>
      )}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 md:block">
        <Sidebar {...sidebarProps} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-slate-900 px-3 shadow md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-1 text-white" aria-label="Menu"><Menu className="h-6 w-6" /></button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 border-0 p-0">
              <SheetTitle className="sr-only">{t.appTitle}</SheetTitle>
              <Sidebar {...sidebarProps} />
            </SheetContent>
          </Sheet>
          <div className="grid h-7 w-7 place-items-center rounded bg-white text-xs font-extrabold text-slate-900">KPI</div>
          <span className="flex-1 truncate text-xs font-bold text-slate-100">{t.appTitle}</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
