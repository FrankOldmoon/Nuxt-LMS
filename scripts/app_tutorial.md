%%%%% GG1
## 📱 走进 App 开发

手机上点开的每一个 App，背后都是一整套界面、状态与数据的编排。📱

这门课用 **Flutter**（一套代码跑安卓/iOS/Web）+ **AI Agent 结对**，从零做出一个真正能装到手机上的 App。

%%GA1%%

%%%%% K1
## 🌍 App 开发全景

### 🆚 原生 vs 跨平台

| 方案 | 语言 | 特点 |
| --- | --- | --- |
| 原生 Android / iOS | Kotlin / Swift | 性能最佳，但要写两套代码 |
| 🦋 **Flutter** | Dart | **一套代码多端运行**，UI 一致，热重载爽快 |
| React Native | JS | 网页技术栈复用 |

### 🦋 Flutter 的两大杀器

- ⚡ **热重载（Hot Reload）** — 改代码一秒内看到效果，不改状态
- 🧩 **一切皆 Widget** — 文字、按钮、布局、甚至手势，全都是 Widget（组件）

### 🎯 本课项目

**待办清单 App**：任务列表 → 添加 → 勾选完成 → 滑动删除 → 本地保存 → 打包安装。麻雀虽小五脏俱全。

:::callout icon=💡
Flutter 用 **Dart** 语言，语法与 Java/TS 同族 —— 会一点编程就能快速上手，剩下交给 Agent 和练习。
:::

%%K1A%%

%%K1B%%

%%%%% K2
## 🛠️ 环境搭建

### 📋 安装清单

1. 🦋 **Flutter SDK** — 下载解压、加入 PATH
2. 🩺 `flutter doctor` — 体检命令，缺什么它会告诉你
3. 💻 **VS Code + Flutter 插件**（或 Android Studio）
4. 📱 **模拟器/真机** — Android 模拟器（AVD）或用数据线连手机开 USB 调试

```bash
flutter doctor          # 环境体检
flutter create todo_app # 创建项目
cd todo_app && flutter run   # 跑起来！
```

:::callout icon=💡
环境问题最多、最杂 —— 这正是 Agent 的主场：把 `flutter doctor` 的完整输出直接贴给它，让它一步步带你修。
:::

%%K2A%%

%%K2B%%

%%%%% K3
## 🤖 用 Agent 学 App 开发

### 🔄 App 版 Agent 工作流

1. 🎯 **描述界面**：不用画图 —— 用文字说清「屏幕上有什么、点什么会发生什么」
2. ⚙️ **生成**：Agent 写出 Dart 文件
3. ⚡ **热重载验证**：保存即见效果，不合适马上说
4. 👀 **审查**：widget 树是否清晰、状态放对了吗

### 🗣️ 界面描述模板

> 🎨 页面：顶部标题栏"我的待办"，下方任务列表，右下角圆形悬浮按钮 ➕
> ⚙️ 交互：点悬浮按钮弹出输入框，提交后新任务插入列表顶部
> 🚧 约束：状态用 setState 管理，先用假数据

:::callout icon=💡
Flutter 的 UI 全是**嵌套的 Widget**，Agent 生成这种代码又快又稳 —— 你审查的重点是**层次是否合理**（别让它把 200 行塞进一个 build）。
:::

%%K3A%%

%%K3B%%

%%%%% GG2
## 🎯 Dart 语言基础

Flutter 用 **Dart** —— 会 JS/Java/Python 的话，一小时就能读通。🎯

三个章节覆盖 App 开发需要的 90% 语法。

%%GA2%%

%%%%% D1
## 🎯 Dart 快速上手

```dart
void main() {
  String name = 'Ada';        // 类型标注
  var age = 16;               // 类型推断
  final list = [1, 2, 3];     // final = 只能赋值一次

  print('你好，$name，${age + 1} 岁');   // 字符串插值
}
```

### 🛡️ Null Safety（Dart 的招牌特性）

```dart
String? nickname;        // ? 表示可为 null
nickname = null;
print(nickname?.length ?? 0);   // ?. 空安全调用，?? 空值兜底
```

- ❓ `String?` 可空 vs `String` 不可空 —— 编译期就拦住空指针
- 🔗 `?.` 链式安全调用、`??` 默认值、`!` 断言非空（慎用）

:::callout icon=💡
`?.` 和 `??` 是 Dart 代码里出镜率最高的符号 —— 让 Agent 解释你在示例里看到的每一个 `?`，直到不再困惑。
:::

%%D1A%%

%%D1B%%

%%%%% D2
## 📚 集合与异步

### 📚 常用集合

```dart
final tasks = ['写作业', '跑步'];      // List
tasks.add('读书');
final scores = {'语文': 95, '数学': 88}; // Map

for (final t in tasks) print(t);
tasks.map((t) => t.toUpperCase());      // 函数式风格
tasks.where((t) => t.length > 2);       // 过滤
```

### ⏳ 异步：Future 与 async/await

App 随时在等数据（网络、文件、延迟）：

```dart
Future<String> fetchName() async {
  await Future.delayed(Duration(seconds: 1));  // 模拟网络
  return 'Ada';
}

final name = await fetchName();
```

:::callout icon=⚠️
`async/await` 模式：**async 标记函数，await 等待 Future**。忘写 await 是 Dart 异步第一大 bug —— 数据"晚一拍"才出现，多半是它。
:::

%%D2A%%

%%D2B%%

%%%%% D3
## 🏗️ Dart 面向对象

```dart
class Task {
  final String title;
  bool done;
  Task({required this.title, this.done = false});   // 命名参数 + 默认值

  void toggle() => done = !done;

  Map<String, dynamic> toJson() => {'title': title, 'done': done};
  factory Task.fromJson(Map<String, dynamic> json) =>
      Task(title: json['title'], done: json['done']);
}
```

### 🧩 要点

- 🏷️ **命名参数** `{required this.title}` — Flutter API 处处是它（可读性极强）
- 🏭 **factory 构造** — `Task.fromJson`：把 Map 变成对象（存取数据的桥梁）
- ➡️ 箭头函数 `=>` — 单行函数的简写

:::callout icon=💡
数据模型类（如 Task）是 App 的骨架：**字段 + toJson + fromJson** 三件套写熟，存取、网络、列表全靠它。
:::

%%D3A%%

%%D3B%%

%%%%% GG3
## 🧩 Flutter 核心：Widget

Flutter 的世界只有一句话：**一切皆 Widget**。🧩

布局、文字、手势、甚至"居中"本身，都是 Widget。这四个概念就是 Flutter 的全部地基。

%%GA3%%

%%%%% F1
## 🧩 一切皆 Widget

```dart
MaterialApp(                    // App 根
  home: Scaffold(               // 页面骨架
    appBar: AppBar(title: Text('我的待办')),
    body: Center(child: Text('Hello Flutter')),
    floatingActionButton: FloatingActionButton(
      child: Icon(Icons.add),
      onPressed: () {},
    ),
  ),
)
```

### 🌳 Widget 树

UI 是一棵**嵌套的 Widget 树**：`MaterialApp → Scaffold → Center → Text`。写 Flutter = 组装这棵树。

### 🪨 Stateless vs Stateful

- 🪨 **StatelessWidget** — 不会变：一张卡片、一个标题
- 🔄 **StatefulWidget** — 会变：输入框、计数器、勾选状态

:::callout icon=💡
选型口诀：**数据会变就是 Stateful，否则 Stateless**。拿不准时问 Agent："这个 Widget 应该是 stateful 吗？"
:::

%%F1A%%

%%F1B%%

%%%%% F2
## 📐 布局 Widget

```dart
Column(                          // 纵向排列
  children: [
    Row(                         // 横向排列
      children: [
        Icon(Icons.check_circle),
        Expanded(child: Text('写作业')),   // Expanded 占满剩余空间
      ],
    ),
    Container(                   // 盒子：颜色+边距+圆角
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text('卡片内容'),
    ),
  ],
)
```

### 🧭 布局心法

- ➡️ **Row / Column** — 横排/竖排，一切布局的起点
- 📦 **Container** — 万能盒子（颜色、边距、圆角、尺寸）
- ↕️ **Expanded / Flexible** — 弹性分配剩余空间
- 📜 **ListView** — 可滚动列表（内容超出屏幕必用它）

%%F2A%%

%%F2B%%

%%%%% F3
## 🔄 状态管理：setState

```dart
class TodoListPage extends StatefulWidget {
  @override
  State<TodoListPage> createState() => _TodoListPageState();
}

class _TodoListPageState extends State<TodoListPage> {
  List<Task> tasks = [];

  void addTask(String title) {
    setState(() {                // 包住"改状态"的代码
      tasks.insert(0, Task(title: title));
    });                          // setState 结束 → 界面自动刷新
  }
}
```

### 🔄 心智模型

- 🔁 **setState = "数据变了，请重建界面"** — 不调用它，数据变了界面也不动（高频 bug！）
- 📌 **状态放哪？** 谁用谁管：一个页面用 → 放本页 State；父子共用 → 放父级（状态提升）

:::callout icon=⚠️
两大数据刷新 bug：① 改了列表忘包 `setState`；② 把状态放在 StatelessWidget 里改。界面"不更新"先查这两个。
:::

%%F3A%%

%%F3B%%

%%%%% F4
## 🧭 导航与路由

```dart
// 前进：push 一个新页面（等待返回值）
final result = await Navigator.push(
  context,
  MaterialPageRoute(builder: (ctx) => EditPage(task: task)),
);

// 返回：pop，可携带数据
Navigator.pop(context, '保存成功');
```

### 🧭 页面栈

导航像**一叠盘子**：push 放一个新页面上去，pop 拿掉顶层回到上一页。

- 📋 命名路由 — 大 App 用 `routes:` 注册表统一管理
- 📦 页面间传参 — 构造参数传入 + pop 返回值带回

%%F4A%%

%%F4B%%

%%%%% GG4
## 🔧 实战功能模块

真实 App 的四大件：**表单、列表、存储、网络**。🔧

每个模块都是"学一个组件 + 让 Agent 融进项目"的组合拳。

%%GA4%%

%%%%% S1
## ✏️ 表单与输入

```dart
final controller = TextEditingController();   // 读取/清空输入框

TextField(
  controller: controller,
  decoration: InputDecoration(
    labelText: '任务名称',
    border: OutlineInputBorder(),
  ),
  onSubmitted: (value) {          // 回车提交
    if (value.trim().isNotEmpty) addTask(value);
    controller.clear();
  },
)
```

### ✅ 输入校验

- 🚫 空内容不让提交（`trim().isEmpty` 判断 + 提示 SnackBar）
- 📏 长度限制 `maxLength`、键盘类型 `keyboardType`（数字/邮箱）
- 🧪 复杂表单用 **Form + GlobalKey + validator**（Agent 非常熟这套）

%%S1A%%

%%S1B%%

%%%%% S2
## 📜 列表与交互

```dart
ListView.builder(                 // 长列表高性能（按需构建）
  itemCount: tasks.length,
  itemBuilder: (ctx, i) => Dismissible(
    key: Key(tasks[i].title),
    onDismissed: (_) => removeTask(i),   // 滑动删除
    background: Container(color: Colors.red),
    child: CheckboxListTile(
      value: tasks[i].done,
      onChanged: (_) => toggleTask(i),
      title: Text(tasks[i].title),
    ),
  ),
)
```

- 📜 **ListView.builder** — 长列表必用：只构建屏幕内的项
- 👉 **Dismissible** — 左滑右滑删除/归档（手机 App 的标配手感）
- ✅ **CheckboxListTile / Card** — 现成的组合组件

%%S2A%%

%%S2B%%

%%%%% S3
## 💾 数据持久化

App 关掉数据不能丢 —— 最简单方案 **shared_preferences**（键值存储）：

```dart
// 存：对象列表 → JSON 字符串
final json = jsonEncode(tasks.map((t) => t.toJson()).toList());
await prefs.setString('tasks', json);

// 取：JSON 字符串 → 对象列表
final raw = prefs.getString('tasks');
if (raw != null) {
  tasks = (jsonDecode(raw) as List)
      .map((e) => Task.fromJson(e)).toList();
}
```

### 🗄️ 存储选型

- 📦 **shared_preferences** — 设置项、小数据（本课用）
- 🗃️ **sqflite / Drift** — 结构化大量数据
- ☁️ 云端 — 后端 API（学完 Web 课就能接）

%%S3A%%

%%S3B%%

%%%%% S4
## 🌐 网络请求与 JSON

```dart
Future<List<Task>> fetchTasks() async {
  final res = await http.get(Uri.parse('https://api.example.com/todos'));
  if (res.statusCode != 200) throw Exception('请求失败 ${res.statusCode}');
  final list = jsonDecode(res.body) as List;
  return list.map((e) => Task.fromJson(e)).toList();
}

// FutureBuilder：自动处理"加载中 / 出错 / 有数据"三种界面
FutureBuilder<List<Task>>(
  future: fetchTasks(),
  builder: (ctx, snap) {
    if (snap.connectionState == ConnectionState.waiting)
      return CircularProgressIndicator();
    if (snap.hasError) return Text('加载失败');
    return ListView(children: snap.data!.map(...).toList());
  },
)
```

:::callout icon=💡
**FutureBuilder** 模式：future 给请求、builder 按 connectionState 分三种画面 —— 加载圈、错误提示、数据列表。学完 Web 课的 useFetch，这里似曾相识。
:::

%%S4A%%

%%S4B%%

%%%%% GG5
## 🚀 实战项目：待办清单 App

总装时刻！🚀 用四个功能模块拼出完整 App：**任务列表 + 添加 + 勾选 + 滑动删除 + 本地保存**。

按 Agent 工作流四次迭代，每步可玩。

%%GA5%%

%%%%% T1
## 📋 App 规划与任务拆解

### 📐 一页纸规划（先于一切代码）

- 🖼️ **页面**：主页（列表 + 悬浮按钮）→ 弹窗添加 → 无单独详情页（保持简单）
- 🧊 **状态**：`List<Task> tasks`，主页 State 管
- 💾 **数据**：Task 模型（title + done）+ shared_preferences 持久化
- ✅ **验收**：杀掉 App 重开，数据还在

### ✂️ 拆给 Agent 的四步

1. 主页 UI（假数据）→ 2. 添加交互 → 3. 勾选与删除 → 4. 持久化

:::callout icon=💡
**验收标准先写**（如"重启数据还在"）—— 这是给 Agent 的试金石，也是给自己的完成定义。
:::

%%T1A%%

%%T1B%%

%%%%% T2
## 🖥️ 核心页面开发

### 🪜 迭代一 + 二：列表与添加

1. 🧱 让 Agent 生成主页骨架：Scaffold + AppBar + ListView（3 条假数据）
2. ➕ 悬浮按钮 → `showModalBottomSheet` 弹出输入面板 → 提交插入列表
3. ✅ 勾选：CheckboxListTile 划线样式（`TextDecoration.lineThrough`）
4. 🗑️ Dismissible 左滑删除

:::callout icon=💡
每步完成后**热重载立刻试**：布局挤了、颜色丑了、手势冲突了 —— 当场反馈给 Agent 当场改，不攒债。
:::

%%T2A%%

%%T2B%%

%%%%% T3
## 💾 持久化与体验打磨

### 💾 迭代三：数据落袋

- 📦 引入 shared_preferences，读写 `tasks`（Task 三件套：toJson/fromJson）
- 🚀 App 启动时读取（`initState` 里 await），每次增删改后保存

### ✨ 迭代四：体验升级

- 🈳 **空状态**：没有任务时显示一张"今天没安排 🎉"插图
- 🎨 **主题**：`ThemeData` 统一色板（Material 3、`seedColor` 一键换肤）
- 🔢 进度徽标：AppBar 显示"已完成 x/y"

%%T3A%%

%%T3B%%

%%%%% T4
## 🐞 调试与热重载工作流

### ⚡ 热重载 vs 热重启

- ⚡ **热重载（r）** — 保留状态秒级刷新 UI（改布局/样式）
- 🔄 **热重启（R）** — 状态清零从头跑（改 initState/初始化逻辑）
- 🛑 全量重启 — 改原生配置（AndroidManifest 等）才需要

### 🐞 报错处理流

Flutter 的报错**信息量极大**（红屏直接指出 widget 和行号）：

> 📋 把红屏全文 + 你刚改的代码贴给 Agent：「这个错误怎么理解？根因是什么？怎么修？」

:::callout icon=💡
Flutter DevTools：Widget 树查看器、性能面板 —— 布局溢出（黄黑条纹！）先看 Widget 约束，99% 是 Row 里塞了没有宽度的子项，套个 Expanded 就好。
:::

%%T4A%%

%%T4B%%

%%%%% GG6
## 📦 发布与心法

App 做完只是开始：**装到真机上、给同学用**，才是完成的定义。📦

最后一组：构建发布、体验打磨、以及长期与 Agent 协作的心法。

%%GA6%%

%%%%% R1
## 📦 多平台构建与发布

```bash
flutter build apk          # 安卓安装包（发给同学直接装）
flutter build apk --split-per-abi   # 按架构分包，体积更小
flutter build web          # Web 版（发链接即玩）
flutter build ipa          # iOS（需要 Mac + 苹果开发者账号）
```

### 📲 上架前的小事

- 🖼️ **App 图标** — flutter_launcher_icons 包一键生成全尺寸
- 🏷️ **应用名与包名** — AndroidManifest / ios 配置里改
- 🔖 **版本号** — pubspec.yaml 的 version 字段

:::callout icon=💡
最快的学习闭环：`build apk` → 传给同学装 → 收集反馈 → 让 Agent 排优先级 → 迭代。**真实用户 > 一切测试。**
:::

%%R1A%%

%%R1B%%

%%%%% R2
## ✨ UI 规范与体验打磨

### 🎨 Material 3 与主题

```dart
MaterialApp(
  theme: ThemeData(colorSchemeSeed: Colors.teal, useMaterial3: true),
  darkTheme: ThemeData.dark(),      // 深色模式
)
```

- 🎨 主题色收敛到一处，全 App 自动跟随
- 🌗 适配深色模式（用户真的会看）

### ✨ 动效与响应式

- 🎬 隐式动画：`AnimatedContainer`、`AnimatedOpacity` — 一行代码的过渡
- 📐 响应式：`MediaQuery` / `LayoutBuilder` — 平板横屏两栏布局
- 🤝 手势细节：InkWell 水波纹、Hero 转场

%%R2A%%

%%R2B%%

%%%%% R3
## 🤝 Agent 协作心法与进阶

### 🧭 App 开发的 Agent 心法（课程总结）

- 🖼️ **用界面语言沟通**："列表项右滑出红色删除背景" > "实现 Dismissible"
- ⚡ **热重载节奏**：小改动 → r 键 → 立刻看 → 立刻反馈，一分钟一轮
- 📋 **报错即上下文**：红屏全文永远直接贴给 Agent
- 👀 **审查 widget 树**：警惕 Agent 生成的超深嵌套，该抽组件就抽

### 🗺️ 进阶路线

- 🧊 **状态管理升级** — Provider → Riverpod / Bloc（App 变大后）
- 🗃️ **数据升级** — Drift/Isar 本地数据库、REST/GraphQL 后端
- 📲 **平台能力** — 相机、通知、定位（plugin 生态）

:::callout icon=🎯
结课作业：为**真实用户**做一个 App（班级值日表、社团签到、个人习惯打卡），走完「规划 → Agent 迭代 → 打包 APK → 交给用户 → 收反馈 → 迭代」全流程。你已经是能交付的 App 开发者了！🚀
:::

%%R3A%%

%%R3B%%
