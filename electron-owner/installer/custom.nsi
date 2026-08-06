; ============================================================================
; Legacy Business Owner — NSIS Custom Installer Script
; Publisher: Legacy Solutions
; ============================================================================

; ── Custom welcome text ────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Welcome to Legacy Business Owner"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Legacy Business Owner v1.0.0 by Legacy Solutions.$\r$\n$\r$\nLegacy Business Owner is the super-admin management console including:$\r$\n$\r$\n  • Company Management$\r$\n  • License Generation & Activation$\r$\n  • User Management$\r$\n  • Subscription Management$\r$\n  • System Notifications$\r$\n$\r$\nPostgreSQL is checked automatically during installation.$\r$\nClick Next to continue."

; ── Custom finish page ─────────────────────────────────────────────────────
!define MUI_FINISHPAGE_TITLE "Installation Complete"
!define MUI_FINISHPAGE_TEXT "Legacy Business Owner has been installed successfully.$\r$\n$\r$\nFor support: legacysolutions0001@gmail.com$\r$\nPhone: +91 7452888421$\r$\n$\r$\nClick Finish to launch the application."

; ── PostgreSQL Auto-Detection Section ──────────────────────────────────────
Section "PostgreSQL Check" SEC_POSTGRES
  SectionIn RO

  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-17" "Version"
  IfErrors 0 pg_found

  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-16" "Version"
  IfErrors 0 pg_found

  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-15" "Version"
  IfErrors 0 pg_found

  IfFileExists "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" pg_found
  IfFileExists "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" pg_found
  IfFileExists "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" pg_found

  ; Not found — inform user
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "PostgreSQL was not found on this computer.$\r$\n$\r$\nWould you like to open the PostgreSQL download page?" \
    IDNO pg_done

  ExecShell "open" "https://www.postgresql.org/download/windows/"
  Goto pg_done

  pg_found:
    DetailPrint "PostgreSQL found: version $0"
    nsExec::ExecToLog 'net start postgresql-x64-17'
    nsExec::ExecToLog 'net start postgresql-x64-16'
    nsExec::ExecToLog 'net start postgresql-x64-15'

  pg_done:
SectionEnd

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
SectionEnd

; ── Create README.txt in install directory ─────────────────────────────────
Section "Documentation"
  FileOpen $0 "$INSTDIR\README.txt" w
  FileWrite $0 "Legacy Business Owner v1.0.0$\r$\n"
  FileWrite $0 "by Legacy Solutions$\r$\n"
  FileWrite $0 "================================$\r$\n$\r$\n"
  FileWrite $0 "HOW TO LOGIN$\r$\n"
  FileWrite $0 "------------$\r$\n"
  FileWrite $0 "Username: bhullar_01$\r$\n"
  FileWrite $0 "Password: Bhullar_01$\r$\n$\r$\n"
  FileWrite $0 "SUPPORT$\r$\n"
  FileWrite $0 "-------$\r$\n"
  FileWrite $0 "Email: legacysolutions0001@gmail.com$\r$\n"
  FileWrite $0 "Phone: +91 7452888421$\r$\n"
  FileClose $0
SectionEnd
