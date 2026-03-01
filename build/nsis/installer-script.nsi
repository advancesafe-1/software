; AdvanceSafe custom NSIS macros
; Used by electron-builder during install/uninstall

!macro customInstall
  DetailPrint "AdvanceSafe custom install..."

  ; Create data directories
  CreateDirectory "$APPDATA\AdvanceSafe"
  CreateDirectory "$APPDATA\AdvanceSafe\data"
  CreateDirectory "$APPDATA\AdvanceSafe\reports"
  CreateDirectory "$APPDATA\AdvanceSafe\logs"

  ; Install Mosquitto MQTT as service (if bundled)
  IfFileExists "$INSTDIR\resources\mosquitto\mosquitto.exe" 0 no_mqtt
  DetailPrint "Installing MQTT Broker service..."
  ExecWait '"$INSTDIR\resources\mosquitto\mosquitto.exe" install -name "AdvanceSafeMQTT" -config "$INSTDIR\resources\mosquitto\mosquitto.conf"'
  ExecWait 'net start AdvanceSafeMQTT'
  no_mqtt:

  ; Firewall rules
  DetailPrint "Configuring firewall rules..."
  ExecWait 'netsh advfirewall firewall add rule name="AdvanceSafe MQTT" dir=in action=allow protocol=TCP localport=1883 remoteip=localsubnet profile=private'
  ExecWait 'netsh advfirewall firewall add rule name="AdvanceSafe Engine" dir=in action=allow protocol=TCP localport=7429 remoteip=127.0.0.1'

  ; Auto-start on boot (registry Run key)
  WriteRegStr HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Run" "AdvanceSafe" "$INSTDIR\AdvanceSafe.exe --hidden"

  ; Install info
  WriteRegStr HKLM "SOFTWARE\AdvanceSafe" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "SOFTWARE\AdvanceSafe" "Version" "${VERSION}"
!macroend

!macro customUninstall
  DetailPrint "AdvanceSafe custom uninstall..."

  ; Stop and remove Mosquitto service
  ExecWait 'net stop AdvanceSafeMQTT'
  IfFileExists "$INSTDIR\resources\mosquitto\mosquitto.exe" 0 no_mqtt_un
  ExecWait '"$INSTDIR\resources\mosquitto\mosquitto.exe" uninstall -name "AdvanceSafeMQTT"'
  no_mqtt_un:

  ; Remove firewall rules
  ExecWait 'netsh advfirewall firewall delete rule name="AdvanceSafe MQTT"'
  ExecWait 'netsh advfirewall firewall delete rule name="AdvanceSafe Engine"'

  ; Remove auto-start
  DeleteRegValue HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Run" "AdvanceSafe"

  ; Remove install registry
  DeleteRegKey HKLM "SOFTWARE\AdvanceSafe"

  ; Note: $APPDATA\AdvanceSafe is NOT deleted - factory data preserved
!macroend
