#!/bin/sh

set -eu

BASE_URL="https://raw.githubusercontent.com/zippyy/GL.iNet-VLAN-Wizard/feature/luci-plugin"
VIEW_PATH="/www/luci-static/resources/view/vlan-wizard.js"
MENU_PATH="/usr/share/luci/menu.d/luci-app-gli-vlan-wizard.json"
ACL_PATH="/usr/share/rpcd/acl.d/luci-app-gli-vlan-wizard.json"
RPCD_PATH="/usr/libexec/rpcd/vlanwizard"

fetch_to() {
	url="$1"
	path="$2"

	if command -v wget >/dev/null 2>&1; then
		wget -O "$path" "$url"
	elif command -v curl >/dev/null 2>&1; then
		curl -fsSL "$url" -o "$path"
	else
		echo "wget or curl is required to install this LuCI app."
		exit 1
	fi
}

echo "Installing LuCI VLAN Wizard"
echo

mkdir -p "$(dirname "$VIEW_PATH")"
mkdir -p "$(dirname "$MENU_PATH")"
mkdir -p "$(dirname "$ACL_PATH")"
mkdir -p "$(dirname "$RPCD_PATH")"

fetch_to "$BASE_URL/htdocs/luci-static/resources/view/vlan-wizard.js" "$VIEW_PATH"
fetch_to "$BASE_URL/root/usr/share/luci/menu.d/luci-app-gli-vlan-wizard.json" "$MENU_PATH"
fetch_to "$BASE_URL/root/usr/share/rpcd/acl.d/luci-app-gli-vlan-wizard.json" "$ACL_PATH"
fetch_to "$BASE_URL/root/usr/libexec/rpcd/vlanwizard" "$RPCD_PATH"

chmod 0644 "$VIEW_PATH" "$MENU_PATH" "$ACL_PATH"
chmod 0755 "$RPCD_PATH"

/etc/init.d/rpcd restart >/dev/null 2>&1 || true
/etc/init.d/uhttpd restart >/dev/null 2>&1 || true

echo "Installed."
echo "Open LuCI and go to Network -> VLAN Wizard."
