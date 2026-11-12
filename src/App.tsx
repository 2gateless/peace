import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { Header } from "./components/Header";
import {
  DoseDetailModal,
  MedicationActionModal,
  MedicationSettingsModal,
  SafetyWarningModal
} from "./components/Modals";
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
import { resolveSwipeTab, type AppTab } from "./lib/navigation";
import { getMedicationSafetyStatus } from "./lib/safety";
import { DEFAULT_MEDICATIONS, type AuthUser, type DoseLog, type Medication } from "./types";

type Tab = AppTab;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [medications, setMedications] = useState<Medication[]>(DEFAULT_MEDICATIONS);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [tab, setTab] = useState<Tab>("quick");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);

  const [actionMed, setActionMed] = useState<Medication | null>(null);
  const [warningMed, setWarningMed] = useState<Medication | null>(null);
  const [detailTarget, setDetailTarget] = useState<{ med: Medication; editing: DoseLog | null } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const uid = user && !user.isMock ? user.uid : null;
    const unsubMeds = subscribeMedications(uid, setMedications);
    const unsubLogs = subscribeLogs(uid, setLogs);
    return () => {
      unsubMeds();
      unsubLogs();
    };
  }, [authReady, user]);

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

  useEffect(() => {
    window.history.replaceState({ ...(window.history.state ?? {}), peaceTab: "quick" }, "");
    const handlePopState = (event: PopStateEvent) => {
      const nextTab = (event.state as { peaceTab?: Tab } | null)?.peaceTab;
      setTab(nextTab === "timeline" || nextTab === "stats" ? nextTab : "quick");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTab = (nextTab: Tab) => {
    if (nextTab === tab) return;
    if (nextTab === "quick") {
      const currentStateTab = (window.history.state as { peaceTab?: Tab } | null)?.peaceTab;
      if (currentStateTab === "timeline" || currentStateTab === "stats") {
        window.history.back();
        return;
      }
      setTab("quick");
      return;
    }

    if (tab === "quick") {
      window.history.pushState({ peaceTab: nextTab }, "");
    } else {
      window.history.replaceState({ peaceTab: nextTab }, "");
    }
    setTab(nextTab);
  };

  const hasOpenModal = Boolean(actionMed || warningMed || detailTarget || showSettings);

  const handleMainTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    if (hasOpenModal || event.touches.length !== 1) {
      swipeStartRef.current = null;
      return;
    }
    const targetTag = (event.target as HTMLElement | null)?.tagName;
    if (targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT") {
      swipeStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleMainTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || hasOpenModal || event.changedTouches.length !== 1) return;

    const touch = event.changedTouches[0];
    const targetTab = resolveSwipeTab(tab, touch.clientX - start.x, touch.clientY - start.y, Date.now() - start.time);
    if (targetTab) {
      navigateTab(targetTab);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2600);
  };

  const activeUid = user && !user.isMock ? user.uid : null;

  const commitDose = (
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

    // Do not await server ack so offline Firestore cache writes keep UI responsive.
    void saveDoseLog(activeUid, log).catch(() => {
      showToast("저장에 실패했습니다. 저장 공간 또는 권한을 확인하세요");
    });
  };

  const handleQuickTap = (med: Medication) => {
    const status = getMedicationSafetyStatus(logs, med, nowMs);
    if (status.needsWarning) {
      setWarningMed(med);
      return;
    }
    commitDose(med);
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
    try {
      await signOutUser();
      setUser(null);
      showToast("로그아웃되었습니다");
    } catch {
      showToast("로그아웃에 실패했습니다");
    }
  };

  const handleSaveMedications = (updated: Medication[]) => {
    setMedications(updated);
    setShowSettings(false);
    showToast("약물 설정이 저장되었습니다");

    void Promise.all(updated.map((m) => saveMedication(activeUid, m))).catch(() => {
      showToast("약물 설정 저장에 실패했습니다");
    });
  };

  const handleDeleteLog = (logId: string) => {
    if (!activeUid) {
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    }
    showToast("기록을 삭제했습니다");

    void deleteDoseLog(activeUid, logId).catch(() => {
      showToast("기록 삭제에 실패했습니다");
    });
  };

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="peace-backdrop relative flex min-h-[100dvh] flex-col text-slate-800">
      <PeaceScenery />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
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

        <main
          onTouchStart={handleMainTouchStart}
          onTouchEnd={handleMainTouchEnd}
          onTouchCancel={() => {
            swipeStartRef.current = null;
          }}
          className="mx-auto flex w-full max-w-2xl flex-1 touch-pan-y flex-col px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-4"
        >
          {!authReady ? (
            <div className="my-auto flex justify-center">
              <div className="zen-card rounded-2xl px-6 py-4 text-xs font-medium text-slate-500">
                연결 확인 중...
              </div>
            </div>
          ) : (
            <>
              {tab === "quick" && (
                <QuickLogView
                  medications={medications}
                  logs={logs}
                  nowMs={nowMs}
                  onSelectMedication={(med) => setActionMed(med)}
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
                  onDeleteLog={(id) => handleDeleteLog(id)}
                />
              )}

              {tab === "stats" && <StatsView logs={logs} medications={medications} />}
            </>
          )}
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
                  onClick={() => navigateTab(item.id)}
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

      {actionMed && (
        <MedicationActionModal
          medication={actionMed}
          logs={logs}
          nowMs={nowMs}
          onClose={() => setActionMed(null)}
          onQuickAdd={() => {
            const med = actionMed;
            setActionMed(null);
            handleQuickTap(med);
          }}
          onDetailAdd={() => {
            const med = actionMed;
            setActionMed(null);
            setDetailTarget({ med, editing: null });
          }}
          onEditLog={(log) => {
            const med = actionMed;
            setActionMed(null);
            setDetailTarget({ med, editing: log });
          }}
          onDeleteLog={(id) => handleDeleteLog(id)}
        />
      )}

      {warningMed && (
        <SafetyWarningModal
          medication={warningMed}
          status={getMedicationSafetyStatus(logs, warningMed, nowMs)}
          onCancel={() => setWarningMed(null)}
          onConfirm={() => {
            const med = warningMed;
            setWarningMed(null);
            commitDose(med);
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
            commitDose(payload.medication, {
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
          onSaveAll={(updated) => handleSaveMedications(updated)}
        />
      )}
    </div>
  );
}
