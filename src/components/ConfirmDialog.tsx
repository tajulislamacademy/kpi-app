import { cn } from "../lib";
import { buttonVariants } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import type { Lang } from "../types";

interface Props { lang: Lang; name: string; onConfirm: () => void; onCancel: () => void; }

// Destructive-confirm dialog. Rendered only while a deletion is pending, so it's
// always open; ESC / overlay / Cancel all route to onCancel.
export function ConfirmDialog({ lang, name, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{lang === "bn" ? "নিশ্চিত করুন?" : "Confirm Delete?"}</AlertDialogTitle>
          <AlertDialogDescription>{lang === "bn" ? `"${name}" মুছে ফেলবেন?` : `Delete "${name}"?`}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{lang === "bn" ? "না" : "Cancel"}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={cn(buttonVariants({ variant: "destructive" }))}>{lang === "bn" ? "হ্যাঁ, মুছুন" : "Yes, Delete"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
