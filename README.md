# VLAN Wizard (CLI)

Simple interactive script to create VLANs, Wi-Fi networks, DHCP, and firewall rules on GL.iNet / OpenWrt routers.

## Usage

chmod +x vlan-wizard.sh
./vlan-wizard.sh

Follow the prompts to:
- Enter VLAN IDs
- Set SSID names (optional)
- Choose isolation
- Assign ports

## What it does

- Creates VLAN interfaces (192.168.X.1)
- Sets up DHCP + firewall per VLAN
- Creates Wi-Fi SSIDs (if specified)
- Uses LAN4 as trunk (tagged on all VLANs)

## Safety

- Validates config before applying
- Auto backup + 60s rollback if something breaks

## Notes

- Only one VLAN can be untagged per port
- Do not assign WAN ports
- No management VLAN enforcement (be careful)

Test on a non-production device first.
