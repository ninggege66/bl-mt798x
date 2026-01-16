# K25pro (MT7981) Documentation

## Build Instructions
This method compiles the Bootloader (BL2), Firmware Image Package (FIP), and GPT partition table for the K25pro device.

### 1. Requirements
- Linux environment (Ubuntu 20.04/22.04 recommended)
- Python 3
- `device-tree-compiler`
- `build-essential`

### 2. Build Command
The configuration for K25pro has been ported to the `2025` versions of U-Boot and ATF. You must manually specify these directories.

```bash
# Go to the build directory
cd bl-mt798x

# Run the build command
SOC=mt7981 BOARD=iwlan-k25pro UBOOT_DIR=uboot-mtk-20250711 ATF_DIR=atf-20250711 ./build.sh
```

### 3. Output Files
After a successful build, the following files are located in the `output/` directory:
- `mt7981_iwlan-k25pro-bl2.img`: BL2 Bootloader
- `mt7981_iwlan-k25pro-fip.bin`: FIP Image
- `mt7981_iwlan-k25pro-gpt.bin`: GPT Partition Table (if generated)

---

## Hardware Configuration

### Memory (RAM)
- **Type**: DDR4
- **Base Address**: 0x40000000
- **Size**: 256MB/512MB (Refer to `mt7981-iwlan-k25pro` config)

### Storage (NAND/eMMC/SPI)
- **Flash Type**: SPI-NAND
- **Model**: EKRG5.PRO

### Partition Layout
Based on `mt7981_iwlan-k25pro_defconfig`:

| Partition | Size | Type |
| :--- | :--- | :--- |
| **bl2** | 1MB | Bootloader |
| **u-boot-env** | 512KB | U-Boot Environment |
| **factory** | 2MB | Calibration Data |
| **fip** | 2MB | Firmware Image Package |
| **ubi** | Remaining | RootFS / User Data |

---

## GPIO Pinout
Based on `mt7981-iwlan-k25pro.dts`:

| Component | Label | GPIO Pin | Active State |
| :--- | :--- | :--- | :--- |
| **Button** | Reset | GPIO 1 | Low |
| **LED** | 5G | GPIO 10 | High |
| **LED** | 4G | GPIO 11 | High |
| **LED** | RSSI1 | GPIO 13 | High |
| **LED** | RSSI2 | GPIO 12 | High |
