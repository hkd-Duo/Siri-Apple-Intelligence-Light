# Siri Apple Intelligence Light ✨

一个 **DeepSeek Harness (DSH)** 的 UI 插件:点击发送按钮(或按 Enter)发送消息时,播放 **Apple Intelligence / Siri 风格的波纹光冲击波** —— 光从输入框底部涌出,彩色流体沿边缘流动,波纹一圈圈向外扩散。

![icon](icon.svg)

## 效果一览

| 模式 | 效果 |
|---|---|
| 🔵 **输入框流光**(默认) | 输入框底部绽放极光光晕,三层错峰波纹向外滚动,彩色色轮在边框后液态流动,一条白色彗星沿卡片边框扫过一圈,发送按钮自身脉冲一次 |
| ◎ **窗口光环** | 不扩散、不填光 —— 一条**沿整个窗口边缘扫过一圈的 Apple Intelligence 边缘流光**(彩色光环 + 白色彗星),窗口最外圈发光,内部界面保持干净 |
| ⛔ **关闭** | 不播放任何特效 |

模式开关是发送按钮旁的**小圆钮**,点击循环切换三种模式,状态保存在 `localStorage`,刷新页面不丢失。

其他细节:

- 自动适配亮 / 暗主题
- 系统开启"减少动态效果"(`prefers-reduced-motion`)时自动禁用特效
- 特效层 portal 到 `document.body`,不干扰页面布局与交互

## 环境要求

- [DeepSeek Harness](https://github.com/) 桌面端 / Web GUI(支持 Cordis 插件体系的版本)
- 无需额外依赖:React 由 DSH Client 模块表提供,插件零安装依赖

## 安装

### 方式一:让 DSH 里的 AI 助手帮你装(推荐)

1. 把仓库克隆到本地任意目录:

```powershell
git clone git@github.com:hkd-Duo/Siri-Apple-Intelligence-Light.git
cd Siri-Apple-Intelligence-Light
```

2. 在 DeepSeek Harness 的会话中直接对助手说(替换成你的实际路径):

> 请把 `D:\SoftWare\Siri-Apple-Intelligence-Light` 这个目录安装为插件

助手会通过 DSH 的插件管理器(`install_bundle`)以本地目录链接方式安装,返回 `application: applied` 即为生效。

3. **刷新 GUI 页面**(Ctrl+R),让页面加载新的 Client 模块。

### 方式二:手动确认安装结果

安装后可在 DSH 的 **Plugins(插件)页** 看到 `@local/apple-glow-shockwave`,确认开关处于启用状态。若卸载,同样在插件页操作,或在会话中让助手执行 `remove_bundle`。

## 使用

1. 在输入框输入内容
2. 点击发送按钮(或按 Enter)→ 波纹光从输入框底部绽放
3. 点发送按钮左侧的小圆钮切换:输入框流光 → 窗口光环 → 关闭

## 自定义

所有视觉效果集中在 `client.js` 的 `CSS_TEXT` 常量里,常用调整点:

| 想改什么 | 位置 |
|---|---|
| 配色 | `.aigw-flow` / `.aigw-fs-flow` 的 `conic-gradient`,以及各层 `rgba(...)` 颜色 |
| 光效时长 | 各 `animation` 的时长与 `fire()` 末尾的 `setTimeout(dismiss, ...)` |
| 模糊强度(液态感) | `.aigw-flow` 的 `filter: blur(26px)`,数值越大越柔和 |
| 波纹层数 / 节奏 | `fire()` 中 `for (const delayCls of ['', ' d2', ' d3'])` 与 `.d2` / `.d3` 的 `animation-delay` |
| 发送按钮识别 | 顶部 `SEND_LABEL_RE` 正则(若你的界面语言不含在已支持列表里) |

改完保存后刷新页面即可生效(本地目录链接安装,无需重装)。

## 故障排查

| 现象 | 处理 |
|---|---|
| 发送后无任何效果 | 先刷新页面;确认插件页里插件已启用;确认开关不是 ⛔ 关闭状态 |
| 部分语言界面不触发 | `client.js` 顶部 `SEND_LABEL_RE` 加入对应语言的按钮文案(如 `senden`、`envoyer`),回车发送不受影响 |
| 完全没有动画 | 系统开了"减少动态效果",这是刻意的无障碍行为 |
| 想完全卸载 | DSH 插件页移除,或在会话中让助手 `remove_bundle` |

## 文件结构

```
Siri-Apple-Intelligence-Light/
├── package.json        # DSH 插件清单(dsh.client / dsh.bundle.patch 声明)
├── cordis.patch.yml    # Loader patch:插入插件条目
├── index.js            # Host 半(本插件无需 Host 逻辑)
├── client.js           # Client 半:全部光效逻辑 + 模式开关
├── locale/en.json      # 英文标题与描述
├── locale/zh.json      # 中文标题与描述
└── icon.svg            # 插件图标
```

## 技术说明

- 注册槽位:`conversation.input.overlay`(特效锚点)+ `conversation.input.right`(模式开关)
- 触发判定:捕获阶段监听 composer 区域内语义匹配的发送按钮点击 + 无修饰 Enter 键;特效层通过 portal 挂到 `document.body`
- 模式持久化:`localStorage` 键 `aigw:mode`

## License

MIT
