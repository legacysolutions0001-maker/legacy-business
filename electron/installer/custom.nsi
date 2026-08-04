; ============================================================================
; Legacy Business ERP — NSIS Custom Installer Script
; Publisher: Legacy Solutions
; ============================================================================

; ── Custom welcome text ────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Welcome to Legacy Business ERP"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Legacy Business ERP v1.0.0 by Legacy Solutions.$\r$\n$\r$\nLegacy Business ERP is a complete business management solution including:$\r$\n$\r$\n  • Inventory Management$\r$\n  • GST Billing & Invoicing$\r$\n  • Customer & Supplier Management$\r$\n  • HR, Attendance & Payroll$\r$\n  • Financial Reports & Day Book$\r$\n  • Automatic Daily Backup & Restore$\r$\n  • Branch Management$\r$\n$\r$\nClick Next to continue."

; ── Custom finish page ─────────────────────────────────────────────────────
; Note: MUI_FINISHPAGE_RUN and MUI_FINISHPAGE_SHOWREADME are defined by
; electron-builder's assistedInstaller.nsh — do NOT redefine them here.
!define MUI_FINISHPAGE_TITLE "Installation Complete"
!define MUI_FINISHPAGE_TEXT "Legacy Business ERP has been installed successfully.$\r$\n$\r$\nFor support: legacysolutions0001@gmail.com$\r$\nPhone: +91 7452888421$\r$\n$\r$\nClick Finish to launch the application."

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
  FileWrite $0 "2. On first launch, enter your Company Code and License Key$\r$\n"
  FileWrite $0 "3. Complete the Setup Wizard to configure your business$\r$\n"
  FileWrite $0 "4. Create your admin user and set a secure password$\r$\n$\r$\n"
  FileWrite $0 "SUPPORT$\r$\n"
  FileWrite $0 "-------$\r$\n"
  FileWrite $0 "Email: legacysolutions0001@gmail.com$\r$\n"
  FileWrite $0 "Phone: +91 7452888421$\r$\n$\r$\n"
  FileWrite $0 "DATA STORAGE$\r$\n"
  FileWrite $0 "------------$\r$\n"
  FileWrite $0 "Your business data is stored locally on this computer.$\r$\n"
  FileWrite $0 "Daily automatic backups are configured during setup.$\r$\n"
  FileWrite $0 "Please ensure backups are stored in a separate location.$\r$\n"
  FileClose $0
SectionEnd
