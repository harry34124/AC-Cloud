# AC Cloud 开发说明

## 目录与运行方式

| 路径 | 用途 |
|---|---|
| `app/desktop/main.cjs` | Electron 主进程、透明窗口、托盘、本机资源服务、设置存储 |
| `app/desktop/` | 页面、交互调度、场景、菜单与动作配置 |
| `app/assets/` | 按内容哈希保存的模型、贴图、动作和运行模块 |
| `app/release-manifest.json` | `routes` 将运行时 URL 映射到实际资源文件，`files`保存大小和SHA256 |
| `scripts/update_manifest.py` | 修改应用文件后更新资源校验；不自动创建新URL映射 |
| `scripts/build_portable.py` | 将源码与 Electron 运行时组装为 Windows 完整运行包 |

这是可编辑的精简运行工程，包含继续修改桌宠所需的源码和发布资源；不包含全部原始 PSD、生成工单、历史试制、审阅录像和作者开发工具。现成动作可以直接运行和调整控制代码，重画或重绑模型时仍需要对应的原始美术工程。

```powershell
npm install
npm start
```

从仓库根目录运行。Electron 固定为 `33.2.0`；保留依赖锁文件。修改运行代码不需要 PSD2Live、Java、在线 API 或原作者本机目录。

## 理解资源映射

主进程启动一个仅供本机使用的资源服务。页面仍使用发布前的逻辑 URL，资源清单中的 `routes` 把这些 URL 定位到 `app/assets/` 的实际文件。内容哈希用于核对和去重，不是动作版本号。

新增资源时同时更新实际文件、清单映射和引用。不要仅改哈希目录名称、把两个不同动作的模型强行指向同一份文件，或把 `?instance=...` 等模块查询参数当作无用文本删除；模块实例可能保存每个动作独立的状态。相对路径、`new URL(..., import.meta.url)` 和运行时拼出的资源名需要实际加载检查，不能只做字符串替换。

不要把本地绝对路径、旧项目的嵌套工作目录、个人设置或浏览器缓存写进发布清单。运行包应在没有原项目目录的机器上也能完整加载。

当前入口会检查清单中的文件大小，并对桌面代码和应用package.json校验SHA256；打包脚本还核对所有清单文件的SHA256。有意修改文件后运行：

```powershell
python scripts/update_manifest.py
npm start
```

该脚本只刷新已有`files/routes`所列文件的校验值，不会替你决定新资源URL。新增文件时先维护routes/引用，再刷新清单。遇到文件损坏先定位来源，不用刷新校验来掩盖意外损坏。

本机设置默认保存在Windows应用数据目录的`AC Cloud/settings.json`（主进程也支持`CLOUD_PET_DATA`覆盖）；不提交个人设置或运行缓存。

## 修改动作与交互

场景控制、日常动作宿主和生产适配器各有自己的职责。先定位动作实际使用的配置和模块，再修改对应环节：

1. 改菜单、权重、冷却或触发条件，优先修改桌面调度层。
2. 改已通过动作的姿态、时序、表情或道具，先在独立副本修改并对照原版。
3. 动作结束时使用它的实际回正或交接接口，先完成最终画面，再切回待机；不能仅因固定秒数到达就销毁仍在收尾的模型。
4. 始终保持一个显示所有者和一个有效推进时钟。暂停、缩放、失焦、打断和退出也要一起处理。

A50等动作会留下新位置并请求后续动作，不能一律当作原地演出结束；骑乘动作还需要前方空间、真实移动距离与轮速的配合。已有动画文件不等于这些桌面调度已经完成。

角色美术不对称，反向移动不能直接镜像整个人物。避免为了适配关键帧切碎原来连续的腿部或衣料；调整父级或网格后，复查肩肘腕、裤靴、披风和遮挡组件。

## 性能与资源生命周期

原生模型、贴图和首个着色器上传可能造成首次交互停顿。启动阶段的交互预备不应增加怒气、随机抽取用户事件或留下测试姿态；预备完成后要恢复中性状态。

SI墙边网格的优化保留了原曲线和可见网格：隐藏组件只有在不参与遮罩时才跳过无效计算，部分矩阵与静态网格权重在保持原运算顺序下缓存。不要把这些优化改成任意降低帧率、减网格或删除当前隐藏但后续会用的组件。

Cubism Core 扩容后，旧 TypedArray 可能失效。读取模型 owner 的当前数组，避免在工厂闭包中长时间捕获单个 Core 顶点/参数 view；保存静态拓扑或基准值时使用真正的副本。原生模型、RenderTexture、事件监听和临时动作上下文都应在退出时释放。

画面对照与性能测试分开执行。逐帧 `readPixels`、大数组转 JSON 和哈希会影响下一帧的 GC/GPU 同步，不能用混合了这些操作的 p95 代表真实游玩流畅度。

## 检查、构建和本机安装

在仓库根目录执行：

```powershell
npm run check:all
npm run build
npm run install:local
```

`npm run check:all` 一条命令顺序执行CPU/资源检查和六组真实桌面检查，任一失败立即停止。也可单独执行下述命令。

`npm test` 不需要安装Electron：核对全部资源清单、路由、版本和源码语法，并运行台词定位、构建身份等CPU测试。GitHub工作流运行同一命令。`npm run test:desktop` 使用独立用户数据目录验证真实窗口、100/150/300px动作、打断、回正和版本显示，报告保存在忽略的 `build/test-results/`。桌面命令顺序运行基础回归、台词、骑车、落地、手套和窄屏六组，任一失败即退出；可用 `-- --suite regression` 等参数单独复现。

开发时先运行 `npm install` 获取固定Electron33.2.0。已有运行时可设置 `ELECTRON_PATH` 给桌面测试，并向构建传入目录：

```powershell
$env:ELECTRON_PATH = 'D:\Tools\electron-v33.2.0-win32-x64\electron.exe'
npm run test:desktop
npm run build -- --electron 'D:\Tools\electron-v33.2.0-win32-x64' --zip
```

构建输出为 `build/v版本-资源指纹/AC Cloud`，已有输出不会覆盖。版本从package.json读取并与app/package.json核对；ZIP名称使用实际版本。构建身份包含提交、未提交修改标记和资源清单SHA256，随包保存到build-info.json。构建成功后才更新本机 `build/latest.json`。

`npm run install:local` 验证最新构建与暂存副本，正常退出旧实例，备份旧安装并替换固定入口 `dist/AC Cloud/AC Cloud.exe`，更新桌面快捷方式，随后打开程序。失败会尝试恢复旧目录；安装过程不清除AppData中的设置。可传 `-BuildDirectory` 选择其他构建，或 `-NoStart` 安装后暂不运行。

源码启动 `npm start` 标记为开发版。日常使用桌面快捷方式或仓库根目录“启动 AC Cloud.cmd”。在“玩法与操作”末尾查看版本、资源指纹和实际安装路径，托盘菜单也显示版本。源码提交不会自动更新安装副本；不要跳过构建与安装。

发布前对构建副本另跑 `npm run test:desktop -- --root "构建目录/resources/app"`，再上传完整ZIP。当前流程不会自行推送GitHub或替换公开下载包。Electron DLL、resources、locales及第三方许可材料必须一起保留。

## 动作加载与释放

`app/desktop/action-lifecycle.mjs` 只管理可取消等待和上下文释放，不采样或修改动作。日常宿主负责自己的加载scope；被打断时先取消scope，再撤销当前代次和移除旧iframe。正在等待load、actionReady、尺寸准备或预热的调用都应及时返回，不能只删iframe却留下永远等待的Promise。后续动作预备使用独立scope。

`disposeActionContext` 对同一个上下文只执行一次适配器释放，并清理canvas和iframe。采样、位置交接和调度顺序仍由原宿主负责。台词定位保持在dialogue-host/dialogue-geometry模块。继续整理其他动作时以这些边界为基础，逐批回归，避免把模型修复混进宿主重构。
