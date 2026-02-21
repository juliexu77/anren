import { useState } from "react";
import { useColorTheme } from "@/contexts/ColorThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { usePeople } from "@/hooks/usePeople";
import { cn } from "@/lib/utils";
import { Check, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactImportSheet } from "@/components/ContactImportSheet";

export function SettingsPage() {
  const { currentTheme, setTheme, themes } = useColorTheme();
  const { user, signOut } = useAuth();
  const { people, addPerson } = usePeople();
  const [showImport, setShowImport] = useState(false);

  return (
    <main className="px-5 pb-8 space-y-8">
      {/* Account */}
      <section>
        <h2 className="text-section-header text-muted-foreground mb-4">Account</h2>
        <div className="rounded-2xl border border-border p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Signed in with Google</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="w-4 h-4 mr-1.5" />
            Sign out
          </Button>
        </div>
      </section>

      {/* Import Contacts */}
      <section>
        <h2 className="text-section-header text-muted-foreground mb-4">People</h2>
        <button
          onClick={() => setShowImport(true)}
          className="w-full text-left rounded-2xl border border-border p-4 flex items-center gap-3 transition-colors hover:bg-foreground/5"
        >
          <UserPlus className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Import from Contacts</p>
            <p className="text-xs text-muted-foreground">Add people from your iPhone contact book</p>
          </div>
        </button>
      </section>

      {/* Theme */}
      <section>
        <h2 className="text-section-header text-muted-foreground mb-4">Theme</h2>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => {
            const isActive = currentTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={cn(
                  "relative rounded-2xl p-4 text-left transition-all duration-200",
                  "border",
                  isActive
                    ? "border-primary/40 shadow-md"
                    : "border-border hover:border-primary/20 hover:shadow-sm"
                )}
                style={{ background: `hsl(${theme.cardBg})` }}
              >
                <div className="flex gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full border border-black/5" style={{ background: `hsl(${theme.bgPrimary})` }} />
                  <div className="w-8 h-8 rounded-full" style={{ background: `hsl(${theme.accent1})` }} />
                  <div className="w-8 h-8 rounded-full" style={{ background: `hsl(${theme.accent2})` }} />
                </div>
                <p className="text-sm font-medium" style={{ color: `hsl(${theme.textPrimary})` }}>{theme.name}</p>
                <p className="text-xs mt-0.5" style={{ color: `hsl(${theme.textMuted})` }}>{theme.description}</p>
                {isActive && (
                  <div className="absolute top-3 right-3">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <ContactImportSheet
        open={showImport}
        onClose={() => setShowImport(false)}
        onImport={async (contacts) => {
          for (const c of contacts) {
            await addPerson({ name: c.name, email: c.email, phone: c.phone });
          }
        }}
        existingNames={people.map((p) => p.name)}
      />
    </main>
  );
}
