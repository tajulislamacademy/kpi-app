import { useState, useEffect } from "react";
import { T } from "../i18n";
import { MONTHS } from "../constants";
import { errMsg } from "../lib";
import { seedDemoData } from "../api/seed";
import { MonthsPicker } from "../components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dict, Lang, TermConfig } from "../types";

interface Props {
  t: Dict;
  lang: Lang;
  termConfig: TermConfig;
  onSaveTermConfig: (cfg: TermConfig) => Promise<void> | void;
  showNotif: (msg: string) => void;
}

const TERMS: (keyof TermConfig)[] = ["term1", "term2", "term3", "term4"];

export function SettingsPage({ t, lang, termConfig, onSaveTermConfig, showNotif }: Props) {
  const [cfg, setCfg] = useState<TermConfig>({ ...termConfig });
  const [seeding, setSeeding] = useState(false);
  const [savingTerm, setSavingTerm] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCfg({ ...termConfig }); }, [termConfig]);
  const termLabel = (ti: number) => (ti === 0 ? t.term1 : ti === 1 ? t.term2 : ti === 2 ? t.term3 : t.term4);
  const toggle = (term: keyof TermConfig, m: number) => { const cur = cfg[term]; setCfg({ ...cfg, [term]: cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m].sort((a, b) => a - b) }); };
  const handleSaveTerm = async () => { setSavingTerm(true); try { await onSaveTermConfig(cfg); showNotif(lang === "bn" ? "সেটিংস সংরক্ষণ!" : "Settings saved!"); } catch (e) { showNotif((lang === "bn" ? "ত্রুটি: " : "Error: ") + errMsg(e)); } finally { setSavingTerm(false); } };
  const handleSeed = async () => {
    setSeeding(true);
    try { await seedDemoData(msg => showNotif(msg)); }
    catch (e) { showNotif((lang === "bn" ? "সীড ত্রুটি: " : "Seed error: ") + errMsg(e)); }
    finally { setSeeding(false); }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">{t.settings}</h2>

      {import.meta.env.DEV && (
        <Card>
          <CardHeader><CardTitle>🌱 {lang === "bn" ? "ডেমো ডেটা (DEV)" : "Demo Data (DEV)"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{lang === "bn" ? "প্রশ্ন (সব role) ও ২ জন শিক্ষক (login সহ, পাসওয়ার্ড 123456) তৈরি করে। ইতিমধ্যে থাকলে skip করে। শুধু dev mode-এ দেখায়।" : "Creates questions (all roles) and 2 teachers (with login, password 123456). Skips existing. DEV-only."}</p>
            <Button onClick={handleSeed} disabled={seeding}>{seeding ? (lang === "bn" ? "সীড হচ্ছে…" : "Seeding…") : (lang === "bn" ? "ডেমো ডেটা সীড করুন" : "Seed demo data")}</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t.termConfig}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {TERMS.map((term, ti) => (
            <div key={term} className="space-y-2">
              <div className="text-sm font-bold text-foreground">{termLabel(ti)}</div>
              <MonthsPicker lang={lang} value={cfg[term]} onToggle={(mi) => toggle(term, mi)} />
            </div>
          ))}
          <Button onClick={handleSaveTerm} disabled={savingTerm}>{savingTerm ? (lang === "bn" ? "সংরক্ষণ…" : "Saving…") : t.save}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{lang === "bn" ? "বর্তমান কনফিগারেশন" : "Current Configuration"}</CardTitle></CardHeader>
        <CardContent>
          {TERMS.map((term, ti) => (
            <div key={term} className="border-b border-border py-2 text-sm text-foreground last:border-0">
              <strong>{termLabel(ti)}:</strong>
              <span className="ml-2 text-muted-foreground">{termConfig[term].map(m => T[lang][MONTHS[m]]).join(", ") || "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
