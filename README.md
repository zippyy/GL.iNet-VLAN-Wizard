# VLAN Wizard

> Simple VLAN + Wi-Fi automation for GL.iNet / OpenWrt

## Features

- Interactive CLI VLAN setup
- LuCI web GUI on the `feature/luci-plugin` branch
- Per-VLAN Wi-Fi SSIDs
- Optional client isolation
- Automatic DHCP and firewall rules
- Multi-radio Wi-Fi support
- Validation for VLAN IDs and port conflicts
- Backup and rollback safety
- Profile save and load support

## What It Does

For each VLAN, the wizard will:

- Create a network interface on `192.168.<VLAN>.1/24`
- Enable a DHCP server
- Create an isolated firewall zone
- Allow internet access through WAN forwarding
- Optionally create a Wi-Fi network on all radios

## Port Layout

- `LAN4` is the tagged trunk port
- Other LAN ports are access/untagged ports

## CLI Installation

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/zippyy/GL.iNet-VLAN-Wizard/main/install.sh)"
```

## LuCI Plugin Installation

The LuCI web GUI is on the `feature/luci-plugin` branch.

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/zippyy/GL.iNet-VLAN-Wizard/feature/luci-plugin/install-luci.sh)"
```

After installation, open LuCI and go to `Network -> VLAN Wizard`.
