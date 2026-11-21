"""Build an optional, deduplicated art-source companion; never change inputs."""

import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys
import zipfile

REPO = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def checked_path(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError(f"Missing or escaping source: {relative}")
    return path


def psd_metadata(data):
    """Read header and layer count; this is not a visual/editor validation."""
    if data[:4] != b"8BPS" or len(data) < 26:
        raise ValueError("Invalid PSD signature")
    version = struct.unpack_from(">H", data, 4)[0]
    if version != 1:
        raise ValueError(f"Expected PSD v1, got {version}")
    height, width = struct.unpack_from(">II", data, 14)
    offset = 26
    for _ in range(2):
        length = struct.unpack_from(">I", data, offset)[0]
        offset += 4 + length
    section_length = struct.unpack_from(">I", data, offset)[0]
    layers = 0
    if section_length:
        layer_length = struct.unpack_from(">I", data, offset + 4)[0]
        if layer_length:
            layers = abs(struct.unpack_from(">h", data, offset + 8)[0])
    return {"width": width, "height": height, "layers": layers}


def build(source, output):
    registry_path = checked_path(source, "01_统一设计参考/当前采用版本.json")
    registry = read_json(registry_path)
    manifest = read_json(REPO / "app/release-manifest.json")
    selection = read_json(REPO / "docs/art-source-selection.json")
    version = read_json(REPO / "package.json")["version"]
    action_ids = set(manifest["actions"]) | set(manifest.get("source_inputs", {})) | {
        "A01", "A49", "SI01", "SI02", "SI03", "SI04", "表情库"
    }
    entries = [e for e in registry["entries"] if e["id"] in action_ids]
    by_id = {e["id"]: e for e in entries}
    # Guard against packaging art against an unrelated frozen source version.
    for action, info in manifest.get("source_inputs", {}).items():
        if by_id[action]["current_task"] != info["current_task"]:
            raise ValueError(f"Source/runtime version disagreement: {action}")
    psd_root = source / "01_统一设计参考/PSD"
    psd_inputs = {p.relative_to(source).as_posix() for p in psd_root.rglob("*.psd")}
    for entry in entries:
        psd_inputs.update(entry.get("source_psd", []))
    records = []
    by_hash = {}
    occupied = {}
    payload = {}

    def add(relative, destination, kind, actions=(), scope=""):
        path = checked_path(source, relative)
        data = path.read_bytes()
        sha = digest(data)
        key = (kind, sha)
        if key in by_hash:
            record = by_hash[key]
            if relative not in record["origins"]:
                record["origins"].append(relative)
            record["actions"] = sorted(set(record["actions"]) | set(actions))
            return record["path"]
        if destination in occupied:
            raise ValueError(f"Conflicting destination: {destination}")
        record = {"path": destination, "kind": kind, "bytes": len(data),
                  "sha256": sha, "origins": [relative],
                  "actions": sorted(actions), "scope": scope}
        if kind == "psd":
            record["psd"] = psd_metadata(data)
        if kind == "cmo3" and not data.startswith(b"CAFF"):
            raise ValueError(f"Invalid native project signature: {relative}")
        records.append(record)
        by_hash[key] = record
        occupied[destination] = relative
        payload[destination] = path
        return destination

    psd_paths = {}
    for relative in sorted(psd_inputs):
        path = checked_path(source, relative)
        related = [e["id"] for e in entries if relative in e.get("source_psd", [])]
        if path.is_relative_to(psd_root):
            destination = "PSD/" + path.relative_to(psd_root).as_posix()
        elif related:
            category = "武器" if "六式" in path.name else "人物"
            destination = f"PSD/{category}/{related[0]}/{path.name}"
        else:
            raise ValueError(f"Unclassified PSD: {relative}")
        scope = "当前动作登记的源；认可范围见动作素材索引" if related else "补充素材/原始输入，不代表已通过动作"
        psd_paths[relative] = add(relative, destination, "psd", related, scope)

    native_paths = {}
    for item in selection["native_projects"]:
        destination = add(item["file"], f"绑定工程/{item['label']}/{Path(item['file']).name}",
                          "cmo3", item["actions"], item["scope"])
        for action in item["actions"]:
            native_paths.setdefault(action, []).append(destination)
    for relative in selection["references"]:
        add(relative, "形象参考/" + Path(relative).name, "reference", scope="人物形象参考，不替代动作源")

    action_index = []
    for entry in entries:
        action = entry["id"]
        runtime_source = manifest.get("source_inputs", {}).get(action)
        action_index.append({
            "id": action, "source_task": entry.get("current_task"),
            "recorded_status": entry.get("status"),
            "approval_scope": entry.get("approval_scope"),
            "psd": list(dict.fromkeys(psd_paths[p] for p in entry.get("source_psd", []))),
            "native_references": list(dict.fromkeys(native_paths.get(action, []))),
            "runtime_source": runtime_source,
            "runtime_models": entry.get("binding_models", []),
            "note": "编辑参考不是可直接替换的桌面运行导出；最新适配器、台词和曲线保留在源码。"
        })
    archive_name = f"AC-Cloud-v{version}-art-sources.zip"
    output.mkdir(parents=True, exist_ok=True)
    archive = output / archive_name
    if archive.exists():
        raise FileExistsError(f"Refusing to replace existing archive: {archive}")
    prefix = f"AC-Cloud-v{version}-art-sources/"
    catalog = {"schema": 1, "product": "AC Cloud", "version": version,
               "registry_sha256": digest(registry_path.read_bytes()),
               "runtime_manifest_sha256": digest((REPO / "app/release-manifest.json").read_bytes()),
               "validation": "PSD头部/图层计数、CMO签名、ZIP CRC及所有文件SHA256；未重新在图像/模型编辑器中验收",
               "files": records, "actions": action_index}
    table = ["# 动作素材索引", "", "状态摘自制作登记，不替代桌面版最新测试。空白原生工程表示未收录可确认的独立CMO；不要用旧候选补齐。", "",
             "| 动作 | 分层PSD | 原生编辑参考 |", "|---|---|---|"]
    for item in action_index:
        links = lambda paths: "<br>".join(f"[{Path(p).name}]({p})" for p in paths) or "共享或未收录独立源，见源码配置"
        table.append(f"| {item['id']} | {links(item['psd'])} | {links(item['native_references'])} |")
    readme = """# AC Cloud 开发素材包

这是 AC Cloud 源码的可选美术附件。玩家无需下载；运行程序与最新动作代码在源码/运行包中。

## 从哪里开始

1. 打开 `动作素材索引.md`，按动作编号找PSD与CMO编辑参考；详细版本、来源、认可范围和hash在 `catalog.json`。
2. `PSD/` 按人物、武器、摩托车、道具分类。原始输入和没有动作引用的补充素材不代表已修复或验收。
3. `绑定工程/` 是保存下来的原生CMO工程；`形象参考/` 用于对照造型。用支持相应格式的图像/模型编辑器打开。
4. 在独立副本改图、绑定或导出，然后在AC Cloud源码中更新资源与引用，刷新资源清单，运行检查再接入桌面。

## 动画并不全在CMO里

有的动作使用共用绑定，有的主要是PSD/PNG组件加JavaScript变形。各动作最新曲线、材质交接、表情、台词、打断和收刀仍由源码 `app/desktop/daily.json`、`generated/` 与 `app/assets/` 中的模块决定。源码的 `app/release-manifest.json` 映射原始虚拟URL到实际文件，`catalog.json` 的 runtime_models 是查这个映射的线索，不是本包内的文件路径。

部分CMO属于生产时保存的编辑基准；桌面导出经过后续修复和体积优化，不能直接用CMO重导出覆盖现有MOC并声称效果相同。尤其SI03原始工程较大，为继续编辑保留；运行程序仍用优化导出。A10仍保留需要调整标记。没有确认独立CMO的动作没有用旧候选冒充。完整原始制作历史、未采用候选、工具安装包和账号资料没有打入本包。

## 校验与使用范围

`SHA256SUMS.txt` 覆盖包内文件；打包时核对PSD尺寸/图层计数、CMO文件签名，并回读ZIP核对所有hash。未在本次打包中重新打开全部PSD或CMO进行编辑器和视觉验收。

角色与素材的授权范围沿用附带 `NOTICE.md`；公开文件不等于授予商业使用权，也不代表整个包采用MIT许可。请保留来源与版权说明。
"""
    documents = {
        "README.md": readme.encode("utf-8"),
        "动作素材索引.md": ("\n".join(table) + "\n").encode("utf-8"),
        "catalog.json": (json.dumps(catalog, ensure_ascii=False, indent=2) + "\n").encode("utf-8"),
        "NOTICE.md": (REPO / "NOTICE.md").read_bytes()
    }
    sums = {record["path"]: record["sha256"] for record in records}
    sums.update({p: digest(data) for p, data in documents.items()})
    documents["SHA256SUMS.txt"] = ("\n".join(f"{sha}  {p}" for p, sha in sorted(sums.items())) + "\n").encode("utf-8")
    # Write once, then independently read every entry and compare its bytes.
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for destination, path in payload.items():
            z.write(path, prefix + destination)
        for destination, data in documents.items():
            z.writestr(prefix + destination, data)
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise ValueError("Archive CRC failed")
        for destination, sha in sums.items():
            if digest(z.read(prefix + destination)) != sha:
                raise ValueError(f"Archive content changed: {destination}")
    result = {"archive": str(archive), "bytes": archive.stat().st_size,
              "sha256": digest(archive.read_bytes()), "unique_psd": sum(r["kind"] == "psd" for r in records),
              "unique_cmo3": sum(r["kind"] == "cmo3" for r in records),
              "actions": len(action_index), "verified": True}
    (output / "art-sources-summary.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / (archive.name + ".sha256")).write_text(f"{result['sha256']}  {archive.name}\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=REPO / "build/art-sources")
    args = parser.parse_args()
    build(args.source_root.resolve(), args.output.resolve())
