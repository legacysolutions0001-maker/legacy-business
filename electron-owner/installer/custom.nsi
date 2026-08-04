; ============================================================================
; Legacy Business Owner — NSIS Custom Installer Script
; Publisher: Legacy Solutions
; ============================================================================

; ── Custom welcome text ────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Welcome to Legacy Business Owner"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Legacy Business Owner v1.0.0 by Legacy Solutions.$\r$\n$\r$\nLegacy Business Owner provides:$\r$\n$\r$\n  • Super Admin Authentication$\r$\n  • Company Registration & Management$\r$\n  • License Key Generation$\r$\n  • Subscription & Plan Control$\r$\n  • User, Device & Branch Limit Management$\r$\n  • Firebase Synchronisation$\r$\n  • Reports & Analytics$\r$\n$\r$\nThis application is for authorised Legacy Solutions personnel only.$\r$\n$\r$\nClick Next to continue."

; ── Custom finish page ─────────────────────────────────────────────────────
; Note: MUI_FINISHPAGE_RUN is defined by electron-builder's
; assistedInstaller.nsh — do NOT redefine it here.
!define MUI_FINISHPAGE_TITLE "Installation Complete"
!define MUI_FINISHPAGE_TEXT "Legacy Business Owner has been installed successfully.$\r$\n$\r$\nFor support: legacysolutions0001@gmail.com$\r$\nPhone: +91 7452888421$\r$\n$\r$\nClick Finish to launch the application."

; ── Registry entries for Add/Remove Programs ───────────────────────────────
Section "Registry"
  WriteRegStr HKCU "Software\LegacySolutions\LegacyBusinessOwner" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\LegacySolutions\LegacyBusinessOwner" "Version" "1.0.0"

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessOwner" \
    "DisplayName" "Legacy Business Owner"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessOwner" \
    "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessOwner" \
    "Publisher" "Legacy Solutions"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessOwner" \
    "URLInfoAbout" "mailto:legacysolutions0001@gmail.com"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessOwner" \
    "DisplayIcon" "$INSTDIR\Legacy Business Owner.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessOwner" \
    "HelpLink" "mailto:legacysolutions0001@gmail.com"
SectionEnd

; ── Create README.txt in install directory ─────────────────────────────────
Section "Documentation"
  FileOpen $0 "$INSTDIR\README.txt" w
  FileWrite $0 "Legacy Business Owner v1.0.0$\r$\n"
  FileWrite $0 "by Legacy Solutions$\r$\n"
  FileWrite $0 "================================$\r$\n$\r$\n"
  FileWrite $0 "ACCESS$\r$\n"
  FileWrite $0 "------$\r$\n"
  FileWrite $0 "This application is for Legacy Solutions administrators only.$\r$\n"
  FileWrite $0 "Use your Super Admin credentials to log in.$\r$\n$\r$\n"
  FileWrite $0 "SUPPORT$\r$\n"
  FileWrite $0 "-------$\r$\n"
  FileWrite $0 "Email: legacysolutions0001@gmail.com$\r$\n"
  FileWrite $0 "Phone: +91 7452888421$\r$\n"
  FileClose $0
SectionEnd
