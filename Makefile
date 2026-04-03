include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-gli-vlan-wizard
LUCI_TITLE:=LuCI GL.iNet VLAN Wizard
LUCI_DEPENDS:=+luci-base +rpcd
LUCI_PKGARCH:=all
PKG_LICENSE:=MIT

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot entrypoint
