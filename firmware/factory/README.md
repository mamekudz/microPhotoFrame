# Factory firmware

Stock images only — not the firmware this repo builds. Place a vendor dump here so a failed custom flash can be undone. Project firmware for NeoFrame is built via µGulp **Target** `NeoFrame`, not from these files.

```
firmware/factory/neoframe/factory.bin
firmware/factory/reterminal-e1002/factory.bin
```

A merged image is written at `0x0` (full flash / Arduino export). Accepted names:

- `factory.bin`, `stock.bin`, `original.bin`, `firmware.bin`
- `GDEPE073E01.ino.merged.bin` (GooDisplay Arduino export for NeoFrame)
- any other `*.ino.merged.bin`

Or add `manifest.json`:

```json
{
  "chip": "esp32s3",
  "flash": [
    { "offset": "0x0", "file": "bootloader.bin" },
    { "offset": "0x8000", "file": "partitions.bin" },
    { "offset": "0x10000", "file": "firmware.bin" }
  ]
}
```

µGulp: choose **Target**, then run **Restore Factory Firmware**. You can also pick any `.bin` in the task form. Binaries are gitignored.
