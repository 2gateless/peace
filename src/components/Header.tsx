import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../types";

interface HeaderProps {
  user: AuthUser | null;
  firebaseConfigured: boolean;
  canInstallPwa: boolean;
  onInstallPwa: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Header({
  user,
  firebaseConfigured,
  canInstallPwa,
  onInstallPwa,
  onSignIn,
  onSignOut
}: HeaderProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [accountMenuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-900/10 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2.5">
          <img
            src="/peace-logo.png"
            alt="Peace"
            className="h-8 w-auto object-contain select-none"
          />
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              firebaseConfigured && user && !user.isMock
                ? "bg-emerald-100 text-emerald-800"
                : "bg-sky-100 text-slate-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                firebaseConfigured && user && !user.isMock ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {firebaseConfigured && user && !user.isMock ? "동기화 중" : "로컬"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canInstallPwa && (
            <button
              type="button"
              onClick={onInstallPwa}
              className="rounded-full border border-emerald-700/20 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
            >
              앱 설치
            </button>
          )}

          {user ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-xs text-slate-700 shadow-xs transition hover:border-emerald-400"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-5 w-5 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-800">
                    {(user.displayName || user.email || "G").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[110px] truncate">{user.email || user.displayName}</span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-40 rounded-2xl border border-emerald-100 bg-white/95 p-2 shadow-xl backdrop-blur">
                  <p className="truncate px-2 py-1 text-[11px] text-slate-500">
                    {user.email || user.displayName}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onSignOut();
                    }}
                    className="mt-1 w-full rounded-xl bg-orange-50 px-3 py-1.5 text-left text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
                  >
                    로그아웃
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen(false)}
                    className="mt-1 w-full rounded-xl px-3 py-1 text-left text-[11px] text-slate-500 hover:bg-slate-50"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:border-emerald-500 hover:bg-emerald-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google 로그인</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
