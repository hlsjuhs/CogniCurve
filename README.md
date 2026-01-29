# CogniCurve - Scientific Memory System | 科学记忆系统

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg) ![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey)

**CogniCurve** is a modern, scientific learning management desktop application based on the **Ebbinghaus Forgetting Curve**. It combines advanced Spaced Repetition System (SRS) algorithms with a clean, research-oriented UI to help users master knowledge efficiently.

**CogniCurve** 是一款基于**艾宾浩斯遗忘曲线**的现代化科学学习管理桌面软件。它结合了先进的间隔重复系统 (SRS) 算法与简洁的科研风格界面，帮助用户高效掌握知识，对抗遗忘。

---

## ✨ Key Features | 核心功能

### 🧠 Smart Dashboard | 智能仪表盘
- **Cognitive Load Visualization**: Real-time Ebbinghaus decay curve vs. predicted retention chart.
- **Intraday Learning Logic**: Distinguishes between "Review Mode" and "Consolidation Wait Time".
- **Daily Stats**: Tracks streaks, average retention rates, and daily learning goals.
- **认知负荷可视化**: 实时展示记忆自然衰减曲线与预测保持率图表。
- **日内学习逻辑**: 智能区分“复习模式”与“记忆巩固等待期”。
- **每日统计**: 追踪连续打卡天数、平均记忆保留率及每日目标完成度。

### 📚 Diverse Learning Modes | 多样化学习模式
CogniCurve supports 4 specific card types tailored for different knowledge:
CogniCurve 支持 4 种针对不同知识类型的卡片模式：

1.  **Basic (基础闪卡)**: Standard Q&A with AI polish suggestions. (标准问答)
2.  **Cloze (填空/完形)**: Supports `{{c1::answer}}` syntax generation for context learning. (支持挖空语法，用于上下文记忆)
3.  **Visual Notes (视觉笔记)**: **Image Occlusion** tool. Draw masks over images to test memory on diagrams/anatomy. (图片遮挡工具，支持在图片上绘制标注和遮挡区域)
4.  **Case Study (综合案例)**: Optimized for complex logic chains and problem-solving scenarios. (专为复杂逻辑链和案例分析优化)

### 🚀 Efficient Creation & Batch Import | 高效创建与批量导入
- **Visual Editor**: Built-in canvas for drawing annotations and masks on images.
- **Batch Text Import**: Custom syntax (`## Title ## Content`) for rapid bulk creation.
- **Batch Image Upload**: Upload multiple images at once and turn them into flashcards.
- **Auto-Save**: Never lose your progress with local draft saving.
- **视觉编辑器**: 内置画布工具，支持在图片上绘制遮挡和高亮。
- **批量文本导入**: 支持自定义语法 (`## 标题 ## 内容`) 快速批量生成卡片。
- **批量图片上传**: 一键上传多张图片并自动转换为卡片草稿。
- **自动保存**: 本地草稿自动保存功能，防止数据丢失。

### 📅 SRS Algorithm & Calendar | SRS 算法与日历
- **Customizable Algorithm**: Fine-tune the interval multipliers and stability factors for Easy/Medium/Hard/Forgotten ratings.
- **Heatmap Calendar**: Visualize future workload predictions for the next 30 days.
- **Intelligent Scheduling**: Algorithms automatically handle "Learning Phase" (short intervals) vs. "Review Phase" (long intervals).
- **可定制算法**: 自由微调简单/一般/困难/遗忘各个等级的间隔倍率和稳定度系数。
- **热力图日历**: 可视化未来 30 天的复习工作量预测。
- **智能调度**: 算法自动处理“学习期”（短间隔）与“复习期”（长间隔）的切换。

### 🗃️ Library Management | 知识库管理
- **Advanced Filtering**: Filter by Status (New/Learning/Review/Mastered), Tags, and Date.
- **Batch Actions**: Bulk update status or add tags to multiple items.
- **Data Safety**: Full JSON Export (Backup) and Import capabilities.
- **高级筛选**: 支持按状态、标签、创建日期组合筛选。
- **批量操作**: 批量更改卡片状态或添加标签。
- **数据安全**: 支持完整的 JSON 格式导出（备份）与导入。

---

## 🛠 Tech Stack | 技术栈

- **Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Desktop Framework**: [Electron](https://www.electronjs.org/)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icons)
- **Visualization**: [Recharts](https://recharts.org/)
- **Packaging**: [Electron Builder](https://www.electron.build/)

---

## 💻 Installation & Usage | 安装与使用

### Prerequisites | 前置要求
- Node.js (v16 or higher)
- npm or yarn

### Development | 开发模式

```bash
# 1. Install dependencies | 安装依赖
npm install

# 2. Run React dev server | 启动 React 开发服务器
npm run dev

# 3. Run Electron (in a separate terminal) | 启动 Electron (在新的终端窗口)
npm run electron:dev
```

### Build for Production | 打包发布

To create an executable (`.exe` for Windows):
打包生成可执行文件 (`.exe`)：

**Using Docker (Recommended for consistency) | 使用 Docker (推荐)**:

```powershell
docker run --rm -ti -v "${PWD}:/project" -w /project electronuserland/builder:wine /bin/bash -c "npm install && npm run dist"
```

**Using Local Environment | 使用本地环境**:

```bash
npm run dist
```

The output files will be located in the `release/` directory.
打包后的文件将位于 `release/` 目录中。

---

## 📝 License

This project is licensed under the MIT License.
本项目采用 MIT 许可证。
