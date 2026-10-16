"""PlatformIO post action: export the actual upload layout for release packaging."""
Import("env")
import json
from pathlib import Path

def export_layout(source, target, env):
    parts = [{"offset": int(str(offset), 0), "file": str(Path(env.subst(str(file))).resolve())}
             for offset, file in env.get("FLASH_EXTRA_IMAGES", [])]
    parts.append({"offset": int(env.subst("$ESP32_APP_OFFSET"), 0),
                  "file": str(Path(env.subst("$BUILD_DIR/${PROGNAME}.bin")).resolve())})
    if len(parts) < 3:
        raise RuntimeError("Incomplete PlatformIO flash layout")
    Path(env.subst("$BUILD_DIR/release-layout.json")).write_text(json.dumps(parts, indent=2))

env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", export_layout)
