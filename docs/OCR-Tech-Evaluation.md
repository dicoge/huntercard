# OCR 图像识别技术方案评估报告

> 项目：hunterCard - Hololive 卡牌价格查询 App  
> 评估日期：2026-05-02  
> 评估人：Backend Engineer

---

## 一、需求分析

根据 `ScanScreen.tsx` 中的代码注释，项目当前需要一个真正的 OCR 实现：

```typescript
// 模擬 OCR 識別過程（實際需要使用 ML Kit 或 Vision Framework）
// 实际实现需要使用 expo-ml-kit 或 Apple Vision
```

OCR 功能需求：
- 识别卡牌上的文字（日文、中文、数字）
- 将识别结果用于卡牌搜索
- 支持拍照和相册选择图片
- 离线识别（本地处理）

---

## 二、可行性方案

### 方案一：expo-ocr-kit（推荐）

**简介**：Expo 官方支持的 OCR 模块，使用 ML Kit（Android）和 Vision（iOS）

**npm 包**：`expo-ocr-kit@0.1.4`

**特点**：
- 专为 Expo 设计，兼容性好
- 跨平台：iOS 使用 Apple Vision，Android 使用 Google ML Kit
- 提供统一的 JS API
- 支持图像批处理（非实时 OCR）
- 包含 bounding box 坐标信息

**安装**：
```bash
npx expo install expo-ocr-kit
```

**Expo 支持**：
| 方式 | 支持 |
|------|------|
| Expo Go | ❌ |
| Expo 开发者构建 | ✅ |
| expo prebuild | ✅ |
| EAS Build | ✅ |
| 纯 React Native | ✅ |

**使用示例**：
```typescript
import { recognizeText, type OcrResult } from 'expo-ocr-kit';

const result: OcrResult = await recognizeText(uri);
// result.text - 识别的完整文本
// result.blocks - 带 bounding box 的文本块
```

**优点**：
- ✅ 与现有 Expo 架构完美兼容
- ✅ 使用原生 OCR 引擎，性能优秀
- ✅ 离线识别，无需网络
- ✅ 支持多语言（日文、中文、英文等）
- ✅ 统一的跨平台 API
- ✅ Expo Modules API 构建，易于维护

**缺点**：
- ❌ 需要 `expo prebuild` 生成原生代码
- ❌ 不支持 Expo Go（需要自定义构建）

---

### 方案二：@bear-block/vision-camera-ocr

**简介**：React Native Vision Camera 插件，实时 OCR

**npm 包**：`@bear-block/vision-camera-ocr@1.1.2`

**特点**：
- 基于 react-native-vision-camera
- 实时文字识别（逐帧处理）
- 适合相机预览模式

**缺点**：
- ❌ 需要额外的 camera 依赖配置
- ❌ 实时 OCR 对于卡牌扫描场景可能过度
- ❌ 配置相对复杂

**评估**：不适合本项目的批量图像 OCR 需求

---

### 方案三：react-native-mlkit-ocr

**简介**：Google ML Kit 的 React Native 封装

**npm 包**：`react-native-mlkit-ocr@0.3.0`

**特点**：
- 只支持 Android（ML Kit）
- iOS 需要额外配置

**缺点**：
- ❌ 不是 Expo 原生模块
- ❌ 需要大量原生配置
- ❌ 维护状态不活跃（2023年后无更新）

**评估**：不推荐，维护状态不活跃

---

### 方案四：自建服务（云端 OCR）

**简介**：将图片上传到后端服务器，使用云服务进行 OCR 识别

**可选服务**：
- Google Cloud Vision API
- AWS Textract
- Azure Computer Vision
- Tesseract.js（服务端）

**优点**：
- ✅ 识别精度高
- ✅ 无需客户端处理
- ✅ 可使用更强大的模型

**缺点**：
- ❌ 需要网络连接
- ❌ 有 API 成本
- ❌ 隐私问题（图片上传）
- ❌ 增加服务器负载

**评估**：不适合离线使用场景

---

## 三、技术对比

| 特性 | expo-ocr-kit | vision-camera-ocr | react-native-mlkit-ocr | 云端 OCR |
|------|--------------|-------------------|------------------------|----------|
| Expo 兼容 | ✅ 官方支持 | ❌ 需配置 | ❌ 需配置 | ✅ |
| 离线支持 | ✅ | ✅ | ✅ | ❌ |
| 多语言 | ✅ | ✅ | ✅ | ✅ |
| 维护状态 | ✅ 活跃 | ✅ 活跃 | ❌ 停止维护 | ✅ |
| 配置复杂度 | 低 | 高 | 高 | 中 |
| 识别精度 | 高 | 高 | 高 | 最高 |
| 成本 | 免费 | 免费 | 免费 | 付费 |

---

## 四、推荐方案

### 推荐使用：**expo-ocr-kit**

**理由**：

1. **Expo 官方集成**：与项目现有的 Expo 架构完美兼容，不需要大量原生配置

2. **离线识别**：卡牌扫描通常在展会或实体店进行，离线识别更实用

3. **批量图像处理**：项目需要的是对拍摄的照片进行 OCR，不是实时逐帧识别

4. **维护活跃**：`expo-ocr-kit` 于 2026-04-08 发布最新版本，积极维护

5. **成本**：完全免费，无需 API 费用

6. **日文识别**：Apple Vision 和 Google ML Kit 都对日文有良好支持

---

## 五、初步实作方向

### 5.1 安装步骤

```bash
# 安装 expo-ocr-kit
npx expo install expo-ocr-kit

# 更新 app.json 配置（可选）
npx expo prebuild
```

### 5.2 app.json 插件配置

```json
{
  "expo": {
    "plugins": [
      [
        "expo-ocr-kit",
        {
          "cameraPermission": "允许 HoloHunter 访问相机以扫描卡牌"
        }
      ]
    ]
  }
}
```

### 5.3 代码实现思路

```typescript
// src/services/ocr.ts
import { recognizeText } from 'expo-ocr-kit';

export async function recognizeCardText(imageUri: string): Promise<string> {
  const result = await recognizeText(imageUri);
  return result.text;
}

// 在 ScanScreen.tsx 中使用
const handleCapture = async (uri: string) => {
  const text = await recognizeCardText(uri);
  // 解析文本，提取卡牌名称或编号
  const cardInfo = parseCardText(text);
  // 搜索卡牌
  await searchCard(cardInfo);
};
```

### 5.4 下一步工作

1. 安装 `expo-ocr-kit` 并测试
2. 修改 `ScanScreen.tsx` 中的 `handleScan` 函数
3. 实现文字后处理（提取卡牌名称）
4. 集成卡牌搜索功能
5. 测试日文识别效果
6. 优化图像预处理（提高识别率）

---

## 六、风险与注意事项

1. **构建方式**：必须使用 `expo prebuild` 或 EAS Build，不能使用 Expo Go
2. **日文字识别**：需要测试实际效果，可能需要图像预处理
3. **光照条件**：OCR 对光照敏感，需要提示用户拍摄环境
4. **图像质量**：建议拍摄高分辨率图片以提高识别率

---

## 七、总结

对于 hunterCard 项目的 OCR 需求，**expo-ocr-kit** 是最佳选择。它提供了：
- 简单的 API
- 优秀的跨平台兼容性
- 离线识别能力
- 活跃的维护支持

结合项目现有的 `expo-camera` 配置，可以快速实现卡牌扫描识别功能。

---

**评估完成**