// SPDX-License-Identifier: GPL-2.0

#include <bootm.h>
#include <env.h>
#include <fdt_support.h>
#include <linux/libfdt.h>
#include <net.h>

static void mtk_fdt_set_eth0_mac(void *fdt, const uchar *mac)
{
	int eth, alias, alen;
	const char *path;
	const char *eth_path = NULL;

	if (!fdt || fdt_check_header(fdt))
		return;

	fdt_increase_size(fdt, 0x1000);

	if (fdt_path_offset(fdt, "/soc/ethernet@15100000") >= 0)
		eth_path = "/soc/ethernet@15100000";
	else if (fdt_path_offset(fdt, "/ethernet@15100000") >= 0)
		eth_path = "/ethernet@15100000";

	alias = fdt_path_offset(fdt, "/aliases");
	if (alias < 0)
		alias = fdt_add_subnode(fdt, 0, "aliases");
	if (alias >= 0) {
		if (eth_path) {
			fdt_setprop_string(fdt, alias, "ethernet0", eth_path);
			fdt_setprop_string(fdt, alias, "ethernet", eth_path);
		}

		path = fdt_getprop(fdt, alias, "ethernet0", &alen);
		if (!path)
			path = fdt_getprop(fdt, alias, "ethernet", &alen);
		if (path && alen > 1) {
			eth = fdt_path_offset(fdt, path);
			if (eth >= 0) {
				fdt_setprop(fdt, eth, "local-mac-address", mac,
					    ARP_HLEN);
				fdt_setprop(fdt, eth, "mac-address", mac,
					    ARP_HLEN);
				return;
			}
		}
	}

	eth = fdt_path_offset(fdt, "/ethernet@15100000");
	if (eth >= 0) {
		fdt_setprop(fdt, eth, "local-mac-address", mac, ARP_HLEN);
		fdt_setprop(fdt, eth, "mac-address", mac, ARP_HLEN);
		return;
	}

	eth = fdt_path_offset(fdt, "/soc/ethernet@15100000");
	if (eth >= 0) {
		fdt_setprop(fdt, eth, "local-mac-address", mac, ARP_HLEN);
		fdt_setprop(fdt, eth, "mac-address", mac, ARP_HLEN);
		return;
	}
}

#if !IS_ENABLED(CONFIG_MTK_DUAL_BOOT)
void board_prep_linux(struct bootm_headers *images)
{
	uchar ethaddr[ARP_HLEN];

	if (!images || !images->ft_addr || !images->ft_len)
		return;

	if (eth_env_get_enetaddr("ethaddr", ethaddr))
		mtk_fdt_set_eth0_mac(images->ft_addr, ethaddr);
}
#endif
