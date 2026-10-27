const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
module.exports = (root) => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "release-manifest.json"), "utf8"),
  );
  function physical(rel) {
    const p = path.resolve(root, rel);
    if (!p.startsWith(root + path.sep)) throw Error("Invalid asset path");
    return p;
  }
  return {
    resolve(url) {
      const rel = manifest.routes[url];
      return rel ? physical(rel) : null;
    },
    validate() {
      for (const [rel, info] of Object.entries(manifest.files)) {
        const p = physical(rel);
        if (!fs.existsSync(p) || fs.statSync(p).size !== info.bytes)
          throw Error("AC Cloud 文件缺失或损坏：" + rel);
        if (rel.startsWith("desktop/") || rel === "package.json")
          if (
            crypto
              .createHash("sha256")
              .update(fs.readFileSync(p))
              .digest("hex") !== info.sha256
          )
            throw Error("AC Cloud 文件校验失败：" + rel);
      }
    },
  };
};
