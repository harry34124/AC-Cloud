"""Build an offline Windows portable folder from a pinned Electron runtime."""

import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import zipfile


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--electron", type=pathlib.Path)
    p.add_argument("--output", type=pathlib.Path)
    p.add_argument("--rcedit", type=pathlib.Path)
    p.add_argument("--zip", action="store_true")
    a = p.parse_args()
    root = pathlib.Path(__file__).resolve().parents[1]
    runtime = (a.electron or root / "node_modules/electron/dist").resolve()
    out = (a.output or root / "dist/AC Cloud").resolve()
    if not (runtime / "electron.exe").is_file():
        p.error(
            "Use --electron pointing to an Electron 33.2.0 Windows x64 directory, or run npm install first."
        )
    if out.exists():
        p.error("Output already exists; choose a new empty output path.")
    m = json.loads((root / "app/release-manifest.json").read_text(encoding="utf-8"))
    for rel, info in m["files"].items():
        b = (root / "app" / rel).read_bytes()
        if len(b) != info["bytes"] or hashlib.sha256(b).hexdigest() != info["sha256"]:
            raise RuntimeError(
                "Changed app file: "
                + rel
                + "; update manifest after intentional development edits."
            )
    shutil.copytree(runtime, out, ignore=shutil.ignore_patterns("default_app.asar"))
    (out / "electron.exe").rename(out / "AC Cloud.exe")
    shutil.copytree(root / "app", out / "resources/app")
    for filename in ["README.md", "THIRD_PARTY_NOTICES.md", "NOTICE.md"]:
        if (root / filename).exists():
            shutil.copy2(root / filename, out / filename)
    if (root / "licenses").exists():
        shutil.copytree(root / "licenses", out / "licenses")
    if (root / "docs").exists():
        shutil.copytree(root / "docs", out / "docs")
    if a.rcedit:
        subprocess.run(
            [
                str(a.rcedit.resolve()),
                str(out / "AC Cloud.exe"),
                "--set-icon",
                str(root / "app/desktop/icon.ico"),
                "--set-version-string",
                "ProductName",
                "AC Cloud",
                "--set-version-string",
                "FileDescription",
                "AC Cloud",
                "--set-version-string",
                "OriginalFilename",
                "AC Cloud.exe",
                "--set-file-version",
                "0.1.0",
                "--set-product-version",
                "0.1.0",
            ],
            check=True,
        )
    (out / "启动 AC Cloud.cmd").write_bytes(
        b'@echo off\r\ncd /d "%~dp0"\r\nstart "" "%~dp0AC Cloud.exe"\r\n'
    )
    print("Portable:", out)
    if a.zip:
        z = out.parent / "AC-Cloud-v0.1.0-windows-x64.zip"
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as f:
            for item in sorted(out.rglob("*")):
                if item.is_file():
                    f.write(item, item.relative_to(out.parent))
        h = hashlib.sha256(z.read_bytes()).hexdigest()
        (out.parent / "SHA256SUMS.txt").write_text(
            h + "  " + z.name + "\n", encoding="ascii"
        )
        print("ZIP:", z, "bytes:", z.stat().st_size)


if __name__ == "__main__":
    main()
