; ============================================================================
; Legacy Business ERP — NSIS Custom Installer Script
; Publisher: Legacy Solutions
; ============================================================================

; ── Custom welcome text ────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Welcome to Legacy Business ERP"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Legacy Business ERP v1.0.0 by Legacy Solutions.$\r$\n$\r$\nLegacy Business ERP is a complete business management solution including:$\r$\n$\r$\n  • Inventory Management$\r$\n  • GST Billing & Invoicing$\r$\n  • Customer & Supplier Management$\r$\n  • HR, Attendance & Payroll$\r$\n  • Financial Reports & Day Book$\r$\n  • Automatic Daily Backup & Restore$\r$\n  • Branch Management$\r$\n$\r$\nPostgreSQL is checked automatically during installation.$\r$\nClick Next to continue."

; ── Custom finish page ─────────────────────────────────────────────────────
!define MUI_FINISHPAGE_TITLE "Installation Complete"
!define MUI_FINISHPAGE_TEXT "Legacy Business ERP has been installed successfully.$\r$\n$\r$\nFor support: legacysolutions0001@gmail.com$\r$\nPhone: +91 7452888421$\r$\n$\r$\nClick Finish to launch the application."

; ── PostgreSQL Auto-Detection Section ──────────────────────────────────────
Section "PostgreSQL Check" SEC_POSTGRES
  SectionIn RO ; Always install this section

  ; Check if PostgreSQL is installed by looking at common registry keys
  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\PostgreSQL Global Development Group\PostgreSQL" "Version"
  IfErrors 0 pg_found_registry

  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-17" "Version"
  IfErrors 0 pg_found_registry

  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-16" "Version"
  IfErrors 0 pg_found_registry

  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-15" "Version"
  IfErrors 0 pg_found_registry

  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\PostgreSQL\Installations\postgresql-x64-14" "Version"
  IfErrors 0 pg_found_registry

  ; Check if pg_ctl.exe exists in common paths
  IfFileExists "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" pg_found_files
  IfFileExists "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" pg_found_files
  IfFileExists "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" pg_found_files
  IfFileExists "C:\Program Files\PostgreSQL\14\bin\pg_ctl.exe" pg_found_files
  IfFileExists "C:\Program Files\PostgreSQL\13\bin\pg_ctl.exe" pg_found_files

  ; PostgreSQL not found — inform user and offer to download
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "PostgreSQL was not found on this computer.$\r$\n$\r$\nLegacy Business ERP requires PostgreSQL to store your data.$\r$\n$\r$\nWould you like to open the PostgreSQL download page?$\r$\n$\r$\nNote: You can also install PostgreSQL after the app installation.$\r$\nThe application will detect and use it automatically on first launch." \
    IDNO pg_skip_download

  ; Open PostgreSQL download page
  ExecShell "open" "https://www.postgresql.org/download/windows/"
  MessageBox MB_OK|MB_ICONINFORMATION \
    "PostgreSQL download page has been opened in your browser.$\r$\n$\r$\nPlease:$\r$\n  1. Download and install PostgreSQL (default settings)$\r$\n  2. Set the postgres password to 'postgres' during install$\r$\n  3. Keep default port 5432$\r$\n  4. Launch Legacy Business ERP after PostgreSQL is installed"
  Goto pg_skip_download

  pg_found_registry:
    DetailPrint "PostgreSQL found in registry: version $0"
    Goto pg_done

  pg_found_files:
    DetailPrint "PostgreSQL found in installation directory"
    ; Try to start the PostgreSQL service automatically
    nsExec::ExecToLog 'net start postgresql-x64-17'
    nsExec::ExecToLog 'net start postgresql-x64-16'
    nsExec::ExecToLog 'net start postgresql-x64-15'
    nsExec::ExecToLog 'net start postgresql-x64-14'
    Goto pg_done

  pg_skip_download:
  pg_done:
SectionEnd

; ── Registry entries for Add/Remove Programs ───────────────────────────────
Section "Registry"
  WriteRegStr HKCU "Software\LegacySolutions\LegacyBusinessERP" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\LegacySolutions\LegacyBusinessERP" "Version" "1.0.0"

  ; Add/Remove Programs entry
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "DisplayName" "Legacy Business ERP"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "Publisher" "Legacy Solutions"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "URLInfoAbout" "mailto:legacysolutions0001@gmail.com"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "DisplayIcon" "$INSTDIR\Legacy Business ERP.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "HelpLink" "mailto:legacysolutions0001@gmail.com"
SectionEnd

; ── Create README.txt in install directory ─────────────────────────────────
Section "Documentation"
  FileOpen $0 "$INSTDIR\README.txt" w
  FileWrite $0 "Legacy Business ERP v1.0.0$\r$\n"
  FileWrite $0 "by Legacy Solutions$\r$\n"
  FileWrite $0 "================================$\r$\n$\r$\n"
  FileWrite $0 "QUICK START$\r$\n"
  FileWrite $0 "-----------$\r$\n"
  FileWrite $0 "1. Launch from Desktop or Start Menu shortcut$\r$\n"
  FileWrite $0 "2. On first launch, you will be asked where to store backups$\r$\n"
  FileWrite $0 "3. PostgreSQL is detected and started automatically$\r$\n"
  FileWrite $0 "4. Click 'Registration' and enter your License Key$\r$\n"
  FileWrite $0 "5. Fill in company details and create all user accounts$\r$\n"
  FileWrite $0 "6. Click 'Login' to sign in with the credentials you created$\r$\n$\r$\n"
  FileWrite $0 "DATABASE$\r$\n"
  FileWrite $0 "--------$\r$\n"
  FileWrite $0 "PostgreSQL is used to store all business data.$\r$\n"
  FileWrite $0 "The application automatically detects and starts PostgreSQL.$\r$\n"
  FileWrite $0 "You do NOT need to open pgAdmin or type any SQL commands.$\r$\n$\r$\n"
  FileWrite $0 "SUPPORT$\r$\n"
  FileWrite $0 "-------$\r$\n"
  FileWrite $0 "Email: legacysolutions0001@gmail.com$\r$\n"
  FileWrite $0 "Phone: +91 7452888421$\r$\n$\r$\n"
  FileWrite $0 "DATA STORAGE$\r$\n"
  FileWrite $0 "------------$\r$\n"
  FileWrite $0 "Your business data is stored locally on this computer.$\r$\n"
  FileWrite $0 "Daily automatic backups are configured on first launch.$\r$\n"
  FileClose $0
SectionEnd
