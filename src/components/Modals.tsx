import { useState } from "react";
import type { MedicationSafetyStatus } from "../lib/safety";
import type { DoseLog, Medication, MedicationCategory } from "../types";

function toLocalDateTimeInput(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function SafetyWarningModal({
  medication,
  status,
  onCancel,
  onConfirm
}: {
  medication: Medication;
  status: MedicationSafetyStatus;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="zen-card w-full max-w-md rounded-3xl border border-amber-500/40 p-5 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-300">
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold">안전 간격 확인</span>
          <span className="text-sm font-semibold text-white">{medication.name}</span>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-slate-300">
          {status.isWithinInterval && (
            <p>
              권장 최소 간격({medication.minIntervalHours}시간)이 아직 지나지 않았습니다.{" "}
              <span className="font-semibold text-amber-300">{status.formattedRemaining} 남음</span> (마지막 복용:{" "}
              {status.formattedElapsed}).
            </p>
          )}
          {status.isAtDailyLimit && (
            <p className="text-rose-300">
              오늘 권장 최대 횟수({medication.dailyMaxLimit}회)에 이미 도달했습니다 (현재 {status.dailyCount}회).
            </p>
          )}
          <p className="text-xs text-slate-400">그래도 지금 복용 기록을 추가할까요?</p>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-slate-700 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-amber-500 py-2.5 text-sm font-semibold text-[#090d16] hover:bg-amber-400"
          >
            그래도 기록
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoseDetailModal({
  medications,
  initialMedication,
  editingLog,
  onClose,
  onSave
}: {
  medications: Medication[];
  initialMedication: Medication;
  editingLog: DoseLog | null;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    medication: Medication;
    timestamp: number;
    dose: string;
    painScale: number | null;
    notes: string;
  }) => void;
}) {
  const [medId, setMedId] = useState(editingLog?.medicationId || initialMedication.id);
  const [dtValue, setDtValue] = useState(toLocalDateTimeInput(editingLog?.timestamp || Date.now()));
  const selectedMed = medications.find((m) => m.id === medId) || initialMedication;
  const [dose, setDose] = useState(editingLog?.dose ?? selectedMed.defaultDose ?? "");
  const [hasPain, setHasPain] = useState(
    editingLog ? editingLog.painScale !== null && editingLog.painScale !== undefined : true
  );
  const [painScale, setPainScale] = useState<number>(editingLog?.painScale ?? 4);
  const [notes, setNotes] = useState(editingLog?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTime = new Date(dtValue).getTime();
    onSave({
      id: editingLog?.id,
      medication: selectedMed,
      timestamp: Number.isFinite(parsedTime) ? parsedTime : Date.now(),
      dose: dose.trim(),
      painScale: hasPain ? painScale : null,
      notes: notes.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <form onSubmit={handleSubmit} className="zen-card w-full max-w-md space-y-4 rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            {editingLog ? "기록 수정" : "상세 투약 & 통증 기록"}
          </h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-white">
            닫기
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">약물</label>
          <select
            value={medId}
            onChange={(e) => {
              const nextId = e.target.value;
              setMedId(nextId);
              const nextMed = medications.find((m) => m.id === nextId);
              if (nextMed && !editingLog) setDose(nextMed.defaultDose);
            }}
            className="w-full rounded-xl border border-slate-700 bg-[#090d16] px-3 py-2 text-sm text-slate-100"
          >
            {medications.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.subtitle})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-1 block text-xs text-slate-400">복용 일시</label>
            <input
              type="datetime-local"
              value={dtValue}
              onChange={(e) => setDtValue(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-[#090d16] px-3 py-2 text-xs text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">복용량 / 단위</label>
            <input
              type="text"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="예: 500mg, 1잔"
              className="w-full rounded-xl border border-slate-700 bg-[#090d16] px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-[#090d16]/70 p-3">
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={hasPain}
                onChange={(e) => setHasPain(e.target.checked)}
                className="accent-[#84a98c]"
              />
              <span>두통 통증 강도 기록</span>
            </label>
            {hasPain && <span className="text-sm font-bold text-[#84a98c]">{painScale} / 10</span>}
          </div>
          {hasPain && (
            <input
              type="range"
              min={0}
              max={10}
              value={painScale}
              onChange={(e) => setPainScale(Number(e.target.value))}
              className="mt-2 w-full accent-[#84a98c]"
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">메모 (유발 요인 등)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="예: 안티그래비티 작업 후 뒷목 뻐근함"
            className="w-full rounded-xl border border-slate-700 bg-[#090d16] px-3 py-2 text-sm text-slate-100"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-700 py-2.5 text-sm text-slate-300"
          >
            취소
          </button>
          <button
            type="submit"
            className="flex-1 rounded-full bg-[#84a98c] py-2.5 text-sm font-semibold text-[#090d16] hover:bg-[#9bbba1]"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
}

export function MedicationSettingsModal({
  medications,
  onClose,
  onSaveAll
}: {
  medications: Medication[];
  onClose: () => void;
  onSaveAll: (updated: Medication[]) => void;
}) {
  const [drafts, setDrafts] = useState<Medication[]>(() => medications.map((m) => ({ ...m })));

  const updateField = <K extends keyof Medication>(index: number, field: K, value: Medication[K]) => {
    setDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
      <div className="zen-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">5가지 약물 & 안전 간격 설정</h3>
            <p className="text-xs text-slate-400">버튼 이름, 세부 라벨, 최소 간격(시간), 일일 한도를 수정하세요</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-white">
            닫기
          </button>
        </div>

        <div className="space-y-3">
          {drafts.map((med, idx) => (
            <div key={med.id} className="space-y-2 rounded-2xl border border-slate-800 bg-[#090d16]/70 p-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={med.name}
                  onChange={(e) => updateField(idx, "name", e.target.value)}
                  placeholder="버튼 이름"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-white"
                />
                <input
                  type="text"
                  value={med.subtitle}
                  onChange={(e) => updateField(idx, "subtitle", e.target.value)}
                  placeholder="세부 라벨 (예: 페퍼민트)"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <select
                  value={med.category}
                  onChange={(e) => updateField(idx, "category", e.target.value as MedicationCategory)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
                >
                  <option value="herb">허브</option>
                  <option value="painkiller">진통제</option>
                </select>
                <label className="flex flex-col text-[10px] text-slate-400">
                  간격(h)
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={med.minIntervalHours}
                    onChange={(e) => updateField(idx, "minIntervalHours", Number(e.target.value) || 0)}
                    className="mt-0.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  />
                </label>
                <label className="flex flex-col text-[10px] text-slate-400">
                  일일 한도
                  <input
                    type="number"
                    min={1}
                    value={med.dailyMaxLimit}
                    onChange={(e) => updateField(idx, "dailyMaxLimit", Math.max(1, Number(e.target.value) || 1))}
                    className="mt-0.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  />
                </label>
                <label className="flex flex-col text-[10px] text-slate-400">
                  기본 용량
                  <input
                    type="text"
                    value={med.defaultDose}
                    onChange={(e) => updateField(idx, "defaultDose", e.target.value)}
                    className="mt-0.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-slate-700 py-2.5 text-sm text-slate-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSaveAll(drafts)}
            className="flex-1 rounded-full bg-[#84a98c] py-2.5 text-sm font-semibold text-[#090d16] hover:bg-[#9bbba1]"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}
