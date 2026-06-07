import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import type { Lang } from "../types";

interface Props { lang: Lang; children: ReactNode; }
interface State { error: Error | null; }

// Catches render/runtime errors in the page subtree so one broken page shows a
// fallback instead of blanking the whole app. Key it by route to auto-reset on
// navigation. The sidebar/nav live outside this boundary and keep working.
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Page crashed:", error, info); }
  render() {
    if (this.state.error) {
      const bn = this.props.lang === "bn";
      return (
        <div className="mx-auto max-w-xl px-4 py-10">
          <div className="rounded-xl border bg-card p-6 text-center text-card-foreground shadow-sm">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <h2 className="mb-2 text-lg font-bold">{bn ? "কিছু একটা ভুল হয়েছে" : "Something went wrong"}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{bn ? "এই পৃষ্ঠাটি দেখাতে সমস্যা হয়েছে। পুনরায় লোড করুন বা অন্য পৃষ্ঠায় যান।" : "This page failed to render. Reload, or switch to another page."}</p>
            <pre className="mb-4 overflow-auto rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left text-xs text-destructive">{String(this.state.error?.message || this.state.error)}</pre>
            <Button onClick={() => window.location.reload()}>{bn ? "পুনরায় লোড" : "Reload"}</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
