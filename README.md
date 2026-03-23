# 📡 VLAN Wizard (CLI)

> Simple VLAN + Wi-Fi automation script for GL.iNet / OpenWrt

---

## 🚀 Features

- 🧩 Interactive VLAN setup  
- 📶 Per-VLAN Wi-Fi (SSID)  
- 🔒 Optional client isolation  
- 🌐 Automatic DHCP + firewall rules  
- 📡 Multi-radio Wi-Fi support  
- ⚠️ Built-in validation (prevents bad configs)  
- 💾 Auto backup + rollback safety  
- 📁 Profile save/load  

---

## ⚙️ What It Does

For each VLAN, the script will:

- Create network interface (`192.168.X.1`)
- Enable DHCP server  
- Create isolated firewall zone  
- Allow internet (WAN forwarding)  
- Optionally create Wi-Fi network  

---

## 🔌 Port Layout

- **LAN4 = trunk port (always tagged)**  
- Other ports = access (untagged)  

---

## 📦 Installation

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/zippyy/GL.iNet-VLAN-Wizard/main/install.sh)"
