"""Render the editable .src.docx to a versioned DOCX and PDF using LibreOffice."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
output = root / 'release-assets'
output.mkdir(exist_ok=True)
target = output / f'microPhotoFrame_Handbuch_DE_v{version}.docx'
with zipfile.ZipFile(root / 'docs/manual/microPhotoFrame_Handbuch_DE.src.docx') as src, zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as dst:
    for entry in src.infolist():
        data = src.read(entry.filename)
        if entry.filename.endswith('.xml'):
            data = data.replace(b'{{VERSION}}', version.encode())
        dst.writestr(entry, data)
soffice = os.environ.get('SOFFICE') or shutil.which('soffice')
if not soffice and Path('C:/Program Files/LibreOffice/program/soffice.com').exists():
    soffice = 'C:/Program Files/LibreOffice/program/soffice.com'
if not soffice:
    raise SystemExit('LibreOffice installieren oder SOFFICE setzen.')
pdf = target.with_suffix('.pdf')
pdf.unlink(missing_ok=True)
with tempfile.TemporaryDirectory(prefix='photoframe-lo-') as profile:
    subprocess.run([soffice, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', 'pdf', '--outdir', str(output), str(target)], check=True, timeout=180)
if not pdf.exists() or pdf.stat().st_size < 100:
    raise SystemExit('PDF conversion failed')
print(pdf)
