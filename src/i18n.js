export const AVAILABLE_LOCALES = ["ko", "en"];

export const TRANSLATIONS = {
  ko: {
    app: {
      title: "Peace",
      short_description: "개인 두통 기록 & 패턴 트래커",
      description: "빠르게 발작을 기록하고 약물 효과와 패턴을 추적하는 개인용 두통 일지입니다."
    },
    languages: { ko: "한국어", en: "English" },
    auth: {
      title: "로그인",
      heading: "Peace",
      subtitle: "개인 두통 기록을 위해 Google 계정으로 로그인하세요",
      continue_with_google: "Google 계정으로 계속하기",
      oauth_missing: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.",
      unauthorized: "허용되지 않은 Google 계정입니다. ALLOWED_EMAILS 설정을 확인하세요.",
      failure: "Google 로그인에 실패했습니다. 다시 시도해 주세요.",
      signed_out: "로그아웃되었습니다."
    },
    nav: {
      logs: "기록",
      charts: "차트",
      new: "새 기록",
      new_log: "새 두통 기록",
      medications: "약물",
      timeline: "타임라인",
      account: "계정",
      settings: "계정 설정",
      language: "언어",
      sign_out: "로그아웃",
      back: "뒤로"
    },
    logs: {
      title: "두통 기록",
      new: "새 기록",
      print: "인쇄",
      download_pdf: "PDF 저장",
      ongoing: "진행 중",
      edit: "수정",
      delete: "삭제",
      delete_confirm: "이 두통 기록을 삭제할까요?",
      created: "두통 기록이 저장되었습니다.",
      updated: "두통 기록이 수정되었습니다.",
      deleted: "두통 기록이 삭제되었습니다.",
      empty: "아직 기록된 두통이 없습니다",
      empty_hint: "하단이나 상단의 '새 기록' 버튼을 눌러 첫 기록을 남겨보세요",
      no_matches: "필터 조건과 일치하는 기록이 없습니다",
      clear_filters: "필터 초기화",
      intensity: "통증 강도",
      start_time: "시작 시간",
      end_time: "종료 시간",
      now: "지금",
      triggers: "유발 요인",
      triggers_hint: "쉼표(,)로 구분해 입력하세요",
      triggers_placeholder: "예: 수면 부족, 피로, 기압 변화",
      trigger_suggestions: ["수면", "피로", "기상 직후", "누워 있을 때", "음주", "기압 변화", "스트레스"],
      pressure: "기압 (hPa)",
      pressure_hint: "선택 사항 · 870 ~ 1085 hPa",
      pressure_placeholder: "예: 1013.2",
      notes: "메모",
      notes_placeholder: "추가 증상이나 관찰 내용을 적어보세요...",
      photos: "사진",
      photos_hint: "최대 5장 (JPEG, PNG, WebP)",
      photo_count: "사진 %{count}장",
      create_btn: "기록 저장",
      update_btn: "기록 수정",
      new_title: "새 두통 기록",
      edit_title: "두통 기록 수정",
      detail_title: "두통 기록 상세",
      ongoing_banner_title: "진행 중인 발작",
      ongoing_banner_end: "지금 종료",
      dose_review_title: "복용한 약물이 효과가 있었나요?",
      dose_review_skip: "건너뛰기"
    },
    stats: {
      time_since_last: "마지막 발작 이후",
      none_yet: "기록 없음",
      today: "오늘 발작",
      average_intensity: "평균 강도"
    },
    streaks: {
      current: "현재 무통증 연속일",
      longest: "최장 무통증 연속일",
      attack_days: "총 발작 일수",
      attack_ongoing: "진행 중",
      since: "마지막: %{date}",
      in_cycles: "%{count}개 사이클"
    },
    filters: {
      title: "필터",
      active: "%{count}개 적용",
      date_range: "기간",
      start: "시작일",
      end: "종료일",
      keywords: "키워드",
      triggers: "유발 요인",
      medication: "약물",
      clear: "초기화",
      apply: "적용"
    },
    current_attack: {
      title: "현재 발작",
      start_heading: "지금 발작이 시작되었나요?",
      start_hint: "강도를 선택하면 한 번의 탭으로 시작 시간을 기록합니다",
      start_btn: "발작 시작 기록",
      ongoing_heading: "발작 진행 중",
      elapsed: "경과 시간",
      end_btn: "발작 종료 (지금)",
      quick_meds: "지금 복용한 약물 빠른 기록",
      full_form: "상세 입력 폼 열기",
      ended_notice: "발작 종료 시간이 기록되었습니다."
    },
    charts: {
      title: "차트 & 패턴",
      no_data: "차트를 그릴 데이터가 아직 없습니다",
      cycles_title: "군발 사이클 & 관해기",
      cycles_rule: "%{count}일 이상 연속 발작이 없으면 사이클이 종료(관해)된 것으로 구분합니다.",
      cycle_count: "사이클 수",
      current_cycle_since: "%{date}부터 진행 중",
      not_in_cycle: "현재 사이클 밖",
      avg_cycle_length: "평균 사이클 길이",
      avg_remission_length: "평균 사이클 간격",
      needs_two_cycles: "2개 이상 사이클 필요",
      heatmap_title: "최근 1년 발작 캘린더",
      fewer: "적음",
      more: "많음",
      cycle_table_title: "사이클 목록",
      cycle_start: "시작",
      cycle_end: "종료",
      cycle_length: "기간",
      cycle_attacks: "발작 수",
      cycle_avg_intensity: "평균 강도",
      cycle_since_prev: "이전 관해 기간",
      cycle_ongoing: "진행 중",
      ichd_remission: "3개월+ 관해",
      intensity_title: "시간별 강도 변화",
      attacks_per_day_title: "일별 발작 횟수",
      duration_title: "발작 지속 시간",
      hourly_title: "시간대별 빈도 & 강도",
      triggers_title: "주요 유발 요인",
      medications_title: "자주 사용한 약물",
      pressure_title: "기압대별 발작 분포",
      pressure_change_title: "24시간 내 기압 변화",
      adherence_title: "예방약 복용 순응도 vs 발작",
      days: "%{count}일"
    },
    medications: {
      title: "약물 관리",
      new: "새 약물",
      empty: "등록된 약물이 없습니다",
      took_it: "복용 기록",
      edit: "수정",
      delete: "약물 삭제",
      delete_confirm: "%{name} 약물과 연결된 복용 기록을 삭제할까요?",
      archived: "보관됨",
      archived_section: "보관된 약물 (%{count})",
      merge_title: "다른 약물로 병합",
      merge_submit: "병합",
      form_name: "약물 이름",
      form_kind: "분류",
      form_default_dose: "기본 용량",
      form_unit: "단위",
      form_frequency: "복용 주기",
      form_schedule_note: "복용 메모",
      form_color: "색상",
      form_archived: "보관하기",
      form_save: "저장",
      kinds: { abortive: "급성기(완화)", oxygen: "산소 흡입", preventive: "예방약", other: "기타" },
      frequencies: {
        as_needed: "필요시",
        daily: "매일 1회",
        twice_daily: "매일 2회",
        weekly: "주 1회",
        monthly: "월 1회",
        quarterly: "분기별"
      },
      doses_title: "복용 기록",
      log_dose: "복용 기록 추가",
      effectiveness: { helped: "효과 있음", no_effect: "효과 없음", made_worse: "악화됨", unrated: "미평가" },
      taken_at: "복용 시간",
      amount: "용량 / 유량",
      duration_minutes: "지속 시간(분)",
      minutes_to_relief: "완화까지 걸린 시간(분)",
      timeline_title: "타임라인",
      timeline_empty: "아직 타임라인 기록이 없습니다",
      insights_title: "약물 효과 요약",
      success_rate: "효과 비율",
      avg_relief: "평균 완화 시간",
      adherence: "순응도"
    },
    settings: {
      title: "계정 설정",
      preferences_title: "언어 & 시간 형식",
      language: "언어",
      automatic_language: "자동 (브라우저 언어)",
      time_format: "시간 형식",
      automatic_time: "자동",
      twelve_hour: "12시간 (예: 오후 7:05)",
      twenty_four_hour: "24시간 (예: 19:05)",
      save: "저장",
      saved: "설정이 저장되었습니다.",
      data_title: "데이터 관리",
      import_csv: "CSV 가져오기",
      export_logs_csv: "두통 기록 CSV 내보내기",
      export_doses_csv: "복용 기록 CSV 내보내기",
      import_modal_title: "두통 기록 CSV 가져오기",
      import_hint: "이 앱의 CSV 형식 또는 Migraine Buddy 내보내기 CSV를 지원합니다. 같은 시작 시간의 중복 기록은 건너뜁니다.",
      import_submit: "가져오기",
      import_done: "가져오기 완료: %{imported}건 추가, %{skipped}건 건너뜀",
      account_title: "Google 계정",
      delete_title: "계정 삭제",
      delete_hint: "계정과 모든 두통 기록, 사진, 약물·복용 데이터가 즉시 삭제됩니다. 되돌릴 수 없으므로 필요하면 먼저 CSV로 내보내세요.",
      delete_btn: "계정 삭제",
      delete_confirm: "정말로 계정과 모든 데이터를 삭제할까요?",
      account_deleted: "계정과 모든 데이터가 삭제되었습니다."
    },
    pdf: {
      modal_title: "PDF 리포트 저장",
      patient_name: "리포트에 표시할 이름 (선택)",
      prepared_for: "제출 대상 (예: 담당 의사, 선택)",
      cancel: "취소",
      download: "PDF 다운로드"
    },
    intensity_levels: {
      1: "미약한 눈 주변 압박감, 거의 신경 쓰이지 않음.",
      2: "한쪽 머리의 가벼운 욱신거림, 약간의 눈 불편감.",
      3: "간헐적 날카로운 통증이 동반된 지속적 압박감.",
      4: "눈 주변의 날카로운 통증과 약한 눈물.",
      5: "강한 작열감, 관자놀이 압통, 집중 어려움.",
      6: "심한 찌르는 듯한 통증 파동, 눈물, 코막힘.",
      7: "강렬한 작열감/찌르는 통증, 눈꺼풀 처짐, 활동 중단.",
      8: "참기 힘든 작열감과 압박감, 가만히 있기 어려움.",
      9: "극심하게 쇠약해지는 통증, 서성이거나 몸을 흔들게 됨.",
      10: "견딜 수 없는 극통, 일상 동작이 완전히 불가능함."
    },
    shortcuts: {
      heading: "키보드 단축키",
      new_log: "새 두통 기록",
      current_attack: "현재 발작 패널",
      help: "단축키 도움말",
      enable: "단축키 사용",
      close: "닫기"
    }
  },
  en: {
    app: {
      title: "Peace",
      short_description: "Personal Headache Tracker",
      description: "Personal cluster headache log, pattern charts, medication tracking, and PDF/CSV reports."
    },
    languages: { ko: "한국어", en: "English" },
    auth: {
      title: "Sign in",
      heading: "Peace",
      subtitle: "Sign in with your Google account to track your headaches",
      continue_with_google: "Continue with Google",
      oauth_missing: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured yet. Check your .env file.",
      unauthorized: "This Google account is not authorized. Check ALLOWED_EMAILS in .env.",
      failure: "Google sign-in failed. Please try again.",
      signed_out: "Signed out successfully."
    },
    nav: {
      logs: "Logs",
      charts: "Charts",
      new: "New",
      new_log: "New Log",
      medications: "Medications",
      timeline: "Timeline",
      account: "Account",
      settings: "Settings",
      language: "Language",
      sign_out: "Sign Out",
      back: "Back"
    },
    logs: {
      title: "Headache Logs",
      new: "New",
      print: "Print",
      download_pdf: "Download PDF",
      ongoing: "ONGOING",
      edit: "Edit",
      delete: "Delete",
      delete_confirm: "Are you sure you want to delete this headache log?",
      created: "Headache log created.",
      updated: "Headache log updated.",
      deleted: "Headache log deleted.",
      empty: "No headaches logged yet",
      empty_hint: "Tap New to log your first headache",
      no_matches: "No headaches found matching your filters",
      clear_filters: "Clear Filters",
      intensity: "Intensity",
      start_time: "Start Time",
      end_time: "End Time",
      now: "Now",
      triggers: "Triggers",
      triggers_hint: "Separate multiple with commas",
      triggers_placeholder: "e.g., Sleep, Tired",
      trigger_suggestions: ["Sleep", "Unknown", "Tired", "Woke up", "Laying down", "Alcohol", "Weather change"],
      pressure: "Barometric pressure (hPa)",
      pressure_hint: "Optional · 870 to 1085 hPa",
      pressure_placeholder: "e.g., 1013.2",
      notes: "Notes",
      notes_placeholder: "Any additional observations or details...",
      photos: "Photos",
      photos_hint: "Up to 5 photos (JPEG, PNG, WebP)",
      photo_count: "%{count} photos",
      create_btn: "Create Headache log",
      update_btn: "Update Headache log",
      new_title: "New Headache Log",
      edit_title: "Edit Headache Log",
      detail_title: "Headache Log",
      ongoing_banner_title: "Ongoing Headache",
      ongoing_banner_end: "End now",
      dose_review_title: "Did your medication help?",
      dose_review_skip: "Skip"
    },
    stats: {
      time_since_last: "Time Since Last",
      none_yet: "None yet",
      today: "Headaches Today",
      average_intensity: "Average Intensity"
    },
    streaks: {
      current: "Current streak",
      longest: "Longest streak",
      attack_days: "Attack days",
      attack_ongoing: "Ongoing",
      since: "Last: %{date}",
      in_cycles: "in %{count} cycles"
    },
    filters: {
      title: "Filters",
      active: "%{count} active",
      date_range: "Date Range",
      start: "Start",
      end: "End",
      keywords: "Keywords",
      triggers: "Triggers",
      medication: "Medication",
      clear: "Clear Filters",
      apply: "Apply Filters"
    },
    current_attack: {
      title: "Current Attack",
      start_heading: "Attack starting now?",
      start_hint: "Pick an intensity for one-tap start logging",
      start_btn: "Start Attack",
      ongoing_heading: "Attack in progress",
      elapsed: "Elapsed",
      end_btn: "End Attack Now",
      quick_meds: "Quick-log medication taken",
      full_form: "Open full form",
      ended_notice: "Attack ended."
    },
    charts: {
      title: "Charts & Patterns",
      no_data: "No chart data available yet",
      cycles_title: "Cluster Cycles & Remissions",
      cycles_rule: "A cycle ends after %{count} consecutive attack-free days.",
      cycle_count: "Cycles",
      current_cycle_since: "Current since %{date}",
      not_in_cycle: "Not in a cycle",
      avg_cycle_length: "Average cycle",
      avg_remission_length: "Average remission",
      needs_two_cycles: "Needs 2+ cycles",
      heatmap_title: "Attack Calendar",
      fewer: "Fewer",
      more: "More",
      cycle_table_title: "Cycles",
      cycle_start: "Start",
      cycle_end: "End",
      cycle_length: "Length",
      cycle_attacks: "Attacks",
      cycle_avg_intensity: "Avg intensity",
      cycle_since_prev: "Remission before",
      cycle_ongoing: "Ongoing",
      ichd_remission: "3m+ remission",
      intensity_title: "Intensity Over Time",
      attacks_per_day_title: "Attacks per Day",
      duration_title: "Attack Duration",
      hourly_title: "Attacks by Time of Day",
      triggers_title: "Top Triggers",
      medications_title: "Top Medications",
      pressure_title: "Attacks by Barometric Pressure",
      pressure_change_title: "24h Pressure Changes",
      adherence_title: "Preventive Adherence vs Attacks",
      days: "%{count} days"
    },
    medications: {
      title: "Medications",
      new: "New Medication",
      empty: "No medications yet",
      took_it: "Took it",
      edit: "Edit",
      delete: "Delete Medication",
      delete_confirm: "Delete %{name} and all its doses?",
      archived: "Archived",
      archived_section: "Archived (%{count})",
      merge_title: "Merge into another medication",
      merge_submit: "Merge",
      form_name: "Name",
      form_kind: "Kind",
      form_default_dose: "Default dose",
      form_unit: "Unit",
      form_frequency: "Frequency",
      form_schedule_note: "Schedule note",
      form_color: "Color",
      form_archived: "Archived",
      form_save: "Save",
      kinds: { abortive: "Abortive", oxygen: "Oxygen", preventive: "Preventive", other: "Other" },
      frequencies: {
        as_needed: "As needed",
        daily: "Once daily",
        twice_daily: "Twice daily",
        weekly: "Weekly",
        monthly: "Monthly",
        quarterly: "Quarterly"
      },
      doses_title: "Doses",
      log_dose: "Log Dose",
      effectiveness: { helped: "Helped", no_effect: "No effect", made_worse: "Made worse", unrated: "Unrated" },
      taken_at: "Taken at",
      amount: "Amount / Flow rate",
      duration_minutes: "Duration (min)",
      minutes_to_relief: "Minutes to relief",
      timeline_title: "Timeline",
      timeline_empty: "Nothing logged yet",
      insights_title: "Medication Insights",
      success_rate: "Success rate",
      avg_relief: "Avg relief",
      adherence: "Adherence"
    },
    settings: {
      title: "Account Settings",
      preferences_title: "Language & Time",
      language: "Language",
      automatic_language: "Automatic (browser language)",
      time_format: "Time format",
      automatic_time: "Automatic",
      twelve_hour: "12-hour (7:05 PM)",
      twenty_four_hour: "24-hour (19:05)",
      save: "Save",
      saved: "Preferences saved.",
      data_title: "Data Management",
      import_csv: "Import CSV",
      export_logs_csv: "Export Logs CSV",
      export_doses_csv: "Export Doses CSV",
      import_modal_title: "Import Headache Logs",
      import_hint: "Supports native CSV exports and Migraine Buddy CSV files. Duplicate start times are skipped.",
      import_submit: "Import",
      import_done: "Import complete: %{imported} imported, %{skipped} skipped",
      account_title: "Google Account",
      delete_title: "Delete account",
      delete_hint: "Deletes your account and everything in it immediately: logs, photos, medications, and doses. Export CSV first if you want a backup.",
      delete_btn: "Delete account",
      delete_confirm: "Delete your account and all of your data? This cannot be undone.",
      account_deleted: "Your account and all of its data have been deleted."
    },
    pdf: {
      modal_title: "Download PDF Report",
      patient_name: "Name shown on report (optional)",
      prepared_for: "Prepared for (optional)",
      cancel: "Cancel",
      download: "Download PDF"
    },
    intensity_levels: {
      1: "Mild eye pressure, barely noticeable.",
      2: "Light throbbing on one side, slight eye discomfort.",
      3: "Persistent pressure with occasional sharp pains.",
      4: "Sharp eye pain with throbbing, mild tearing.",
      5: "Strong burning sensation, tender temple area, affects focus.",
      6: "Severe piercing waves, eye tearing, nasal congestion.",
      7: "Intense burning/stabbing, drooping eyelid, disrupts activities.",
      8: "Severe burning and pressure, hard to stay still.",
      9: "Debilitating pain, pacing or rocking for relief.",
      10: "Unbearable torture-like pain, completely incapacitating."
    },
    shortcuts: {
      heading: "Keyboard Shortcuts",
      new_log: "New Headache Log",
      current_attack: "Current Attack Panel",
      help: "Show Shortcuts",
      enable: "Enable shortcuts",
      close: "Close"
    }
  }
};

export function resolveLocale(req, user) {
  if (user?.locale && AVAILABLE_LOCALES.includes(user.locale)) return user.locale;
  const queryLocale = req.query?.locale;
  if (typeof queryLocale === "string" && AVAILABLE_LOCALES.includes(queryLocale)) return queryLocale;
  const cookieLocale = req.cookies?.peace_locale;
  if (typeof cookieLocale === "string" && AVAILABLE_LOCALES.includes(cookieLocale)) return cookieLocale;
  const accept = String(req.headers["accept-language"] || "").toLowerCase();
  if (accept.includes("ko")) return "ko";
  if (accept.includes("en")) return "en";
  return "ko";
}

export function createTranslator(locale) {
  const dict = TRANSLATIONS[locale] || TRANSLATIONS.ko;
  return function t(key, vars = {}) {
    const parts = key.split(".");
    let val = dict;
    for (const part of parts) val = val?.[part];
    if (val === undefined) {
      val = TRANSLATIONS.en;
      for (const part of parts) val = val?.[part];
    }
    if (typeof val !== "string") return val ?? key;
    return val.replace(/%\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `%{${k}}`));
  };
}

export function effectiveTimeFormat(user, locale) {
  if (user?.time_format === "12h" || user?.time_format === "24h") return user.time_format;
  return locale === "en" ? "12h" : "24h";
}

export function formatWallClock(isoString, locale, timeFormat, mode = "date_and_time") {
  if (!isoString) return "";
  const normalized = isoString.replace(" ", "T").slice(0, 16);
  const [datePart, timePart = "00:00"] = normalized.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if (!y || !m || !d) return isoString;

  const date = new Date(y, m - 1, d, hh || 0, mm || 0);
  const loc = locale === "ko" ? "ko-KR" : "en-US";
  const hour12 = timeFormat === "12h";

  if (mode === "date") {
    return new Intl.DateTimeFormat(loc, { year: "numeric", month: "short", day: "numeric" }).format(date);
  }
  if (mode === "time") {
    return new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit", hour12 }).format(date);
  }
  return new Intl.DateTimeFormat(loc, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12
  }).format(date);
}

export function formatDurationBetween(startIso, endIso, locale = "ko") {
  if (!startIso || !endIso) return "";
  const ms = new Date(endIso.replace(" ", "T")) - new Date(startIso.replace(" ", "T"));
  if (!Number.isFinite(ms) || ms < 0) return "";
  const totalMin = Math.round(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (locale === "ko") {
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  }
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function intensityColor(intensity) {
  const value = Number(intensity) || 1;
  if (value <= 3) return "hsl(142, 71%, 45%)";
  if (value <= 6) {
    const ratio = (value - 3) / 3;
    return `hsl(${Math.round(142 - ratio * 97)}, ${Math.round(71 + ratio * 22)}%, ${Math.round(45 + ratio * 2)}%)`;
  }
  const ratio = (value - 6) / 4;
  return `hsl(${Math.round(45 * (1 - ratio))}, ${Math.round(93 - ratio * 9)}%, ${Math.round(47 + ratio * 13)}%)`;
}

export function localWallClockNow(tzOffsetMinutes = null) {
  const now = new Date();
  if (Number.isFinite(tzOffsetMinutes)) {
    const shifted = new Date(now.getTime() - tzOffsetMinutes * 60000);
    return shifted.toISOString().slice(0, 16);
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function todayIsoDate(tzOffsetMinutes = null) {
  return localWallClockNow(tzOffsetMinutes).slice(0, 10);
}

