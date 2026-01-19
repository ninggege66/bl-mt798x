// SPDX-License-Identifier: GPL-2.0
/*
 * Copyright (C) 2021 MediaTek Inc. All Rights Reserved.
 *
 * Author: Weijie Gao <weijie.gao@mediatek.com>
 *
 * Generic data upgrading command
 */

#include <command.h>
#include <env.h>
#include <image.h>
#include <linux/types.h>
#include <cli.h>
#include <linux/delay.h>

#include "load_data.h"
#include "colored_print.h"
#include "upgrade_helper.h"

static const struct data_part_entry *upgrade_parts;
static u32 num_parts;


static int do_post_action(const struct data_part_entry *dpe, const void *data,
			  size_t size)
{
	int i;

	if (dpe->do_post_action)
		dpe->do_post_action(dpe->priv, dpe, data, size);

	printf("\n*** 更新成功！***\n");
	printf("系统将在 5 秒后自动返回主菜单。\n");
	printf("此时按 [任意键] 可进入命令行控制台 (MT7981>)\n\n");

	for (i = 5; i > 0; i--) {
		printf("\r倒计时: %2d 秒 ", i);
		if (tstc()) {
			getchar(); // 消耗输入
			printf("\n\n已中断。进入命令行控制台...\n\n");
			env_set("bootmenu_exit", "1");
			return CMD_RET_SUCCESS;
		}
		mdelay(1000);
	}

	printf("\r倒计时:  0 秒 \n");
	printf("\n正在返回主菜单 ...\n\n");

	return CMD_RET_SUCCESS;
}

static const struct data_part_entry *select_part(void)
{
	u32 i;
	char c;

	printf("\n");
	cprintln(PROMPT, "可用于更新的分区:");

	for (i = 0; i < num_parts; i++)
		printf("    %d - %s\n", i, upgrade_parts[i].name);

	while (1) {
		printf("\n");
		cprint(PROMPT, "请选择一个分区:");
		printf(" ");

		c = getchar();
		if (c == '\r' || c == '\n')
			continue;

		printf("%c\n", c);
		break;
	}

	i = c - '0';
	if (c < '0' || i >= num_parts) {
		cprintln(ERROR, "*** 无效的选择！ ***");
		return NULL;
	}

	return &upgrade_parts[i];
}

static const struct data_part_entry *find_part(const char *abbr)
{
	u32 i;

	if (!abbr)
		return NULL;

	for (i = 0; i < num_parts; i++) {
		if (!strcmp(upgrade_parts[i].abbr, abbr))
			return &upgrade_parts[i];
	}

	cprintln(ERROR, "*** 无效的更新分区！ ***");

	return NULL;
}

static int do_mtkupgrade(struct cmd_tbl *cmdtp, int flag, int argc,
			 char *const argv[])
{
	const struct data_part_entry *dpe = NULL;
	ulong data_load_addr;
	size_t data_size = 0;

	board_upgrade_data_parts(&upgrade_parts, &num_parts);

	if (!upgrade_parts || !num_parts) {
		printf("mtkupgrade is not configured!\n");
		return CMD_RET_FAILURE;
	}

	if (argc < 2)
		dpe = select_part();
	else
		dpe = find_part(argv[1]);

	if (!dpe)
		return CMD_RET_FAILURE;

	printf("\n");
	cprintln(PROMPT, "*** 正在更新 %s ***", dpe->name);
	printf("\n");


	/* Set load address */
#if defined(CONFIG_SYS_LOAD_ADDR)
	data_load_addr = CONFIG_SYS_LOAD_ADDR;
#elif defined(CONFIG_LOADADDR)
	data_load_addr = CONFIG_LOADADDR;
#endif

	/* Load data */
	if (load_data(data_load_addr, &data_size, dpe->env_name))
		return CMD_RET_FAILURE;

	printf("\n");
	cprintln(PROMPT, "*** 已加载 %zd (0x%zx) 字节，内存地址 0x%08lx ***",
		 data_size, data_size, data_load_addr);
	printf("\n");

	image_load_addr = data_load_addr;

	/* Validate data */
	if (dpe->validate) {
		if (dpe->validate(dpe->priv, dpe, (void *)data_load_addr,
				  data_size))
			return CMD_RET_FAILURE;
	}

	/* Write data */
	if (dpe->write(dpe->priv, dpe, (void *)data_load_addr, data_size))
		return CMD_RET_FAILURE;

	printf("\n");
	cprintln(PROMPT, "*** %s 更新已完成！ ***", dpe->name);

	return do_post_action(dpe, (void *)data_load_addr, data_size);
}

U_BOOT_CMD(mtkupgrade, 2, 0, do_mtkupgrade,
	   "MTK firmware/bootloader upgrading utility",
	   "mtkupgrade [<part>]\n"
	   "part    - upgrade data part\n"
);
