# Changelog

All notable changes to the ink-encoder package will be documented in this file.

## [1.1.0] - 2026-01-03

### Added
- 4-level grayscale display support (IDs: A-F)
  - `COLORS_GRAY4`: White, Light Gray, Dark Gray, Black
  - Support for Waveshare grayscale displays
  - reTerminal E1001 (Gray4 7.5" · 800×480, ID: "D")

### Changed
- **BREAKING**: Display IDs reorganized for better structure and future-proofing
  - Monochrome (B&W): IDs 0-9
  - Grayscale (4-level): IDs A-F
  - Spectra 6 (Full Color): IDs G-P
  - Spectra 3-Color (BWR/BWY): IDs Q-Z
  - Spectra 4-Color (BWRY): IDs a-f
  - Future/New Models: IDs f-z (reserved)
- reTerminal E1002 display ID changed from "9" to "I"
- Display naming convention updated to use × (multiplication sign) instead of x
- Display naming updated to use period (.) for decimal sizes

### Migration Guide
If you have existing .ink files created with version 1.0.0:
1. The display ID is stored in byte 1 of the .ink file header
2. Old files with ID "9" are for reTerminal E1002 (Spectra 6 7.3")
3. Re-encode images with the new ID "I" for reTerminal E1002
4. Firmware must be updated to use the new display IDs

## [1.0.0] - 2026-01-01

### Added
- Initial release
- Support for E-Ink display encoding/decoding
- LZW compression
- Multiple display types support
- Sharp integration for image processing

