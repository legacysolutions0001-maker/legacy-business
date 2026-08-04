; ============================================================================
; Legacy Business ERP — NSIS Custom Installer Script
; Included by electron-builder's NSIS configuration
; ============================================================================

; ── Custom welcome text ────────────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Welcome to Legacy Business ERP"
!define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of Legacy Business ERP.$\r$\n$\r$\nLegacy Business ERP is a complete business management solution including:$\r$\n$\r$\n  • Inventory Management$\r$\n  • GST Billing & Invoicing$\r$\n  • Customer & Supplier CRM$\r$\n  • HR & Payroll$\r$\n  • Financial Reports$\r$\n  • Data Backup & Restore$\r$\n$\r$\nClick Next to continue."

; ── Custom finish page ─────────────────────────────────────────────────────
!define MUI_FINISHPAGE_TITLE "Installation Complete"
!define MUI_FINISHPAGE_TEXT "Legacy Business ERP has been installed on your computer.$\r$\n$\r$\nClick Finish to launch the application."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Legacy Business ERP.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Legacy Business ERP"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "View Quick Start Guide"

; ── Registry entries for Add/Remove Programs ───────────────────────────────
Section "Registry"
  WriteRegStr HKCU "Software\LegacyBusinessERP" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\LegacyBusinessERP" "Version" "1.0.0"
  
  ; Add/Remove Programs entry
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "DisplayName" "Legacy Business ERP"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "Publisher" "Legacy Business Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "URLInfoAbout" "https://legacybusiness.in"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\LegacyBusinessERP" \
    "DisplayIcon" "$INSTDIR\Legacy Business ERP.exe"
SectionEnd

; ── Create README.txt in install directory ─────────────────────────────────
Section "Documentation"
  FileOpen $0 "$INSTDIR\README.txt" w
  FileWrite $0 "Legacy Business ERP v1.0.0$\r$\n"
  FileWrite $0 "================================$\r$\n$\r$\n"
  FileWrite $0 "QUICK START$\r$\n"
  FileWrite $0 "-----------$\r$\n"
  FileWrite $0 "1. Launch from Desktop or Start Menu shortcut$\r$\n"
  FileWrite $0 "2. On first launch, complete the Setup Wizard$\r$\n"
  FileWrite $0 "3. Log in as Super Admin: username=bhullar01, password=Bhullar_01$\r$\n"
  FileWrite $0 "4. Change the default password immediately$\r$\n"
  FileWrite $0 "5. Create your company and users$\r$\n$\r$\n"
  FileWrite $0 "SUPPORT$\r$\n"
  FileWrite $0 "-------$\r$\n"
  FileWrite $0 "Email: support@legacybusiness.in$\r$\n"
  FileWrite $0 "Website: https://legacybusiness.in$\r$\n"
  FileClose $0
SectionEnd
