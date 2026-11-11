import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { DoseDetailModal, MedicationSettingsModal, SafetyWarningModal } from "./components/Modals";
import { PeaceScenery } from "./components/PeaceScenery";
import { QuickLogView } from "./components/QuickLogView";
import { StatsView } from "./components/StatsView";
import { TimelineView } from "./components/TimelineView";
import {
  deleteDoseLog,
  isFirebaseConfigured,
  saveDoseLog,
  saveMedication,
  signInWithGoogle,
  signOutUser,
  subscribeAuth,
  subscribeLogs,
  subscribeMedications
} from "./lib/firebase";
import { getMedicationSafetyStatus } from "./lib/safety";
import { DEFAULT_MEDICATIONS, type AuthUser, type DoseLog, type Medication } from "./types";

type Tab = "quick" | "timeline" | "stats";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [medications, setMedications] = useState<Medication[]>(DEFAULT_MEDICATIONS);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [tab, setTab] = useState<Tab>("quick");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);

  const [warningMed, setWarningMed] = useState<Medication | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ med: Medication; editing: DoseLog | null } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth(setUser);
    return unsub;
  }, []);

  useEffect(() => {
    const uid = user && !user.isMock ? user.uid : null;
    const unsubMeds = subscribeMedications(uid, setMedications);
    const unsubLogs = subscribeLogs(uid, setLogs);
    return () => {
      unsubMeds();
      unsubLogs();
    };
  }, [user]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2600);
  };

  const activeUid = user && !user.isMock ? user.uid : null;

  const commitDose = async (
    med: Medication,
    opts?: { id?: string; timestamp?: number; dose?: string; painScale?: number | null; notes?: string }
  ) => {
    const log: DoseLog = {
      id: opts?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: opts?.timestamp ?? Date.now(),
      medicationId: med.id,
      medicationName: med.name,
      category: med.category,
      dose: opts?.dose ?? med.defaultDose,
      painScale: opts?.painScale ?? null,
      notes: opts?.notes || ""
    };

    await saveDoseLog(activeUid, log);
    if (!activeUid) {
      setLogs((prev) =>
        (prev.some((l) => l.id === log.id)
          ? prev.map((l) => (l.id === log.id ? log : l))
          : [log, ...prev]
        ).sort((a, b) => b.timestamp - a.timestamp)
      );
    }
    setNowMs(Date.now());
    showToast(`${med.name} 기록되었습니다`);
  };

  const handleQuickTap = (med: Medication) => {
    const status = getMedicationSafetyStatus(logs, med, nowMs);
    if (status.needsWarning) {
      setWarningMed(med);
      return;
    }
    void commitDose(med);
  };

  const handleSignIn = async () => {
    try {
      const signedIn = await signInWithGoogle();
      if (signedIn) setUser(signedIn);
      showToast(signedIn?.isMock ? "로컬 Google 모의 로그인 완료" : "Google 로그인 완료");
    } catch {
      showToast("로그인에 실패했습니다");
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    showToast("로그아웃되었습니다");
  };

  const handleSaveMedications = async (updated: Medication[]) => {
    await Promise.all(updated.map((m) => saveMedication(activeUid, m)));
    setMedications(updated);
    setShowSettings(false);
    showToast("약물 설정이 저장되었습니다");
  };

  const handleDeleteLog = async (logId: string) => {
    await deleteDoseLog(activeUid, logId);
    if (!activeUid) {
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    }
    showToast("기록을 삭제했습니다");
  };

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="peace-backdrop relative flex min-h-screen flex-col text-slate-800">
      <PeaceScenery />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header
          user={user}
          firebaseConfigured={isFirebaseConfigured}
          canInstallPwa={Boolean(installPrompt)}
          onInstallPwa={() => void handleInstallPwa()}
          onSignIn={() => void handleSignIn()}
          onSignOut={() => void handleSignOut()}
        />

        {toast && (
          <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-full border border-emerald-200 bg-white/95 px-4 py-2 text-xs font-medium text-emerald-800 shadow-lg backdrop-blur">
            {toast}
          </div>
        )}

        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-4">
          {tab === "quick" && (
            <QuickLogView
              medications={medications}
              logs={logs}
              nowMs={nowMs}
              onQuickTap={handleQuickTap}
              onOpenDetailed={(med) => setDetailTarget({ med, editing: null })}
              onOpenHeadacheOnly={() => setDetailTarget({ med: medications[0], editing: null })}
              onOpenMedSettings={() => setShowSettings(true)}
            />
          )}

          {tab === "timeline" && (
            <TimelineView
              logs={logs}
              medications={medications}
              onEditLog={(log) => {
                const med = medications.find((m) => m.id === log.medicationId) || medications[0];
                setDetailTarget({ med, editing: log });
              }}
              onDeleteLog={(id) => void handleDeleteLog(id)}
            />
          )}

          {tab === "stats" && <StatsView logs={logs} medications={medications} />}
        </main>

        <nav
          aria-label="주요 메뉴"
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-900/10 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
        >
          <div className="mx-auto grid max-w-2xl grid-cols-3">
            {(
              [
                { id: "quick", label: "투약 기록" },
                { id: "timeline", label: "타임라인" },
                { id: "stats", label: "패턴 통계" }
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`py-3.5 text-center text-xs font-semibold transition ${
                    active ? "text-emerald-700" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span className="block">{item.label}</span>
                  {active && <span className="mx-auto mt-1 block h-1 w-6 rounded-full bg-emerald-600" />}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {warningMed && (
        <SafetyWarningModal
          medication={warningMed}
          status={getMedicationSafetyStatus(logs, warningMed, nowMs)}
          onCancel={() => setWarningMed(null)}
          onConfirm={() => {
            const med = warningMed;
            setWarningMed(null);
            void commitDose(med);
          }}
        />
      )}

      {detailTarget && (
        <DoseDetailModal
          medications={medications}
          initialMedication={detailTarget.med}
          editingLog={detailTarget.editing}
          onClose={() => setDetailTarget(null)}
          onSave={(payload) => {
            setDetailTarget(null);
            void commitDose(payload.medication, {
              id: payload.id,
              timestamp: payload.timestamp,
              dose: payload.dose,
              painScale: payload.painScale,
              notes: payload.notes
            });
          }}
        />
      )}

      {showSettings && (
        <MedicationSettingsModal
          medications={medications}
          onClose={() => setShowSettings(false)}
          onSaveAll={(updated) => void handleSaveMedications(updated)}
        />
      )}
    </div>
  );
}
