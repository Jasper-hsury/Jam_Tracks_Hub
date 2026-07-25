#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER_SCRIPT="$SCRIPT_DIR/start_youtube_helper_mac.sh"
APP_DIR="$HOME/Applications/Jam Tracks Hub YouTube Helper.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
PLIST_FILE="$CONTENTS_DIR/Info.plist"
LAUNCHER_FILE="$MACOS_DIR/jasper-youtube-helper"
CONFIG_DIR="$HOME/.jasper-music-helper"
CONFIG_FILE="$CONFIG_DIR/helper-path"

if [ ! -f "$HELPER_SCRIPT" ]; then
  echo "Helper script not found: $HELPER_SCRIPT"
  exit 1
fi

mkdir -p "$MACOS_DIR" "$CONFIG_DIR"
printf "%s\n" "$HELPER_SCRIPT" > "$CONFIG_FILE"

cat > "$PLIST_FILE" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>jasper-youtube-helper</string>
    <key>CFBundleIdentifier</key>
    <string>com.jaspermusic.youtube-helper</string>
    <key>CFBundleName</key>
    <string>Jam Tracks Hub YouTube Helper</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>Jam Tracks Hub YouTube Helper</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>jasper-helper</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
PLIST

cat > "$LAUNCHER_FILE" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="$HOME/.jasper-music-helper/helper-path"

if [ ! -f "$CONFIG_FILE" ]; then
  osascript -e 'display dialog "Jam Tracks Hub YouTube Helper is not configured. Run INSTALL_MAC_HELPER_PROTOCOL.command again." buttons {"OK"} default button "OK"'
  exit 1
fi

HELPER_SCRIPT="$(cat "$CONFIG_FILE")"

if [ ! -f "$HELPER_SCRIPT" ]; then
  osascript -e 'display dialog "The Jam Tracks Hub YouTube Helper folder was moved. Run INSTALL_MAC_HELPER_PROTOCOL.command from the helper folder again." buttons {"OK"} default button "OK"'
  exit 1
fi

osascript - "$HELPER_SCRIPT" <<'APPLESCRIPT'
on run argv
  set helperScript to item 1 of argv
  tell application "Terminal"
    activate
    do script quoted form of helperScript
  end tell
end run
APPLESCRIPT
LAUNCHER

chmod +x "$LAUNCHER_FILE" "$HELPER_SCRIPT"

/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f "$APP_DIR" >/dev/null 2>&1 || true

echo "Jam Tracks Hub YouTube Helper protocol installed."
echo "Protocol: jasper-helper://start"
echo "App: $APP_DIR"
echo ""
echo "Return to the Key Finder page. The page can now try to start the helper automatically."
