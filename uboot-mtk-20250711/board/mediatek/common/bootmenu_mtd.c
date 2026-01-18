// SPDX-License-Identifier: GPL-2.0
/*
 * Copyright (C) 2022 MediaTek Inc. All Rights Reserved.
 *
 * Author: Weijie Gao <weijie.gao@mediatek.com>
 */

#include "bootmenu_common.h"
#include "autoboot_helper.h"
#include "mtd_helper.h"

static const struct data_part_entry mtd_parts[] = {
	{
		.name = "ATF BL2",
		.abbr = "bl2",
		.env_name = "bootfile.bl2",
		.validate = generic_validate_bl2,
		.write = generic_mtd_write_bl2,
	},
	{
		.name = "ATF FIP",
		.abbr = "fip",
		.env_name = "bootfile.fip",
		.validate = generic_validate_fip,
		.write = generic_mtd_write_fip,
		.post_action = UPGRADE_ACTION_CUSTOM,
		//.do_post_action = generic_invalidate_env,
	},
#ifdef CONFIG_MTK_FIP_SUPPORT
	{
		.name = "BL31 of ATF FIP",
		.abbr = "bl31",
		.env_name = "bootfile.bl31",
		.validate = generic_validate_bl31,
		.write = generic_mtd_update_bl31,
		.post_action = UPGRADE_ACTION_CUSTOM,
	},
	{
		.name = "BL33 of ATF FIP",
		.abbr = "bl33",
		.env_name = "bootfile.bl33",
		.validate = generic_validate_bl33,
		.write = generic_mtd_update_bl33,
		.post_action = UPGRADE_ACTION_CUSTOM,
		//.do_post_action = generic_invalidate_env,
	},
#endif
	{
		.name = "Firmware",
		.abbr = "fw",
		.env_name = "bootfile",
		.post_action = UPGRADE_ACTION_BOOT,
		.validate = generic_mtd_validate_fw,
		.write = generic_mtd_write_fw,
	},
	{
		.name = "Single image",
		.abbr = "simg",
		.env_name = "bootfile.simg",
		.validate = generic_validate_simg,
		.write = generic_mtd_write_simg,
	},
};

void board_upgrade_data_parts(const struct data_part_entry **dpes, u32 *count)
{
	*dpes = mtd_parts;
	*count = ARRAY_SIZE(mtd_parts);
}

int board_boot_default(bool do_boot)
{
	return generic_mtd_boot_image(do_boot);
}

static const struct bootmenu_entry mtd_bootmenu_entries[] = {
	{
		.desc = "启动正系统 (默认)",
		.cmd = "mtkboardboot"
	},
	{
		.desc = "更新固件 (ITB/Sysupgrade)",
		.cmd = "mtkupgrade fw"
	},
	{
		.desc = "更新 ATF BL2",
		.cmd = "mtkupgrade bl2"
	},
	{
		.desc = "更新 ATF FIP (U-Boot)",
		.cmd = "mtkupgrade fip"
	},
#ifdef CONFIG_MTK_FIP_SUPPORT
	{
		.desc = "  仅更新 ATF BL31",
		.cmd = "mtkupgrade bl31"
	},
	{
		.desc = "  仅更新 U-Boot 主程序",
		.cmd = "mtkupgrade bl33"
	},
#endif
	{
		.desc = "更新单映像 (Simg)",
		.cmd = "mtkupgrade simg"
	},
	{
		.desc = "加载映像 (TFTP/Kermit)",
		.cmd = "mtkload"
	},
#ifdef CONFIG_MTK_WEB_FAILSAFE
	{
		.desc = "启动 Web 恢复模式",
		.cmd = "httpd"
	},
#endif
	{
		.desc = "修改启动配置",
		.cmd = "mtkbootconf"
	},
};

void board_bootmenu_entries(const struct bootmenu_entry **menu, u32 *count)
{
	*menu = mtd_bootmenu_entries;
	*count = ARRAY_SIZE(mtd_bootmenu_entries);
}

void default_boot_set_defaults(void *fdt)
{
	mtd_boot_set_defaults(fdt);
}

int board_late_init(void)
{
	return 0;
}
