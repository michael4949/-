import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ReportResponse, ReportData, GroundingSource, RefinementResponse } from "../types";

// Schema for Refinement Questions
const refinementSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING, description: "The question text in Chinese" },
          allowMultiple: { type: Type.BOOLEAN },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Option label in Chinese" },
                value: { type: Type.STRING, description: "Option value" }
              }
            }
          }
        }
      }
    }
  },
  required: ["questions"]
};

// Define the JSON schema for the report structure
const reportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    companyName: { type: Type.STRING, description: "分析的企业名称 (中文)" },
    reportTitle: { type: Type.STRING, description: "一个吸引人、专业的 AI 战略报告标题 (中文)" },
    executiveSummary: { type: Type.STRING, description: "2-3 句话的高层战略价值总结 (中文)" },
    backgroundImageKeyword: { type: Type.STRING, description: "用于搜索背景图片的单个英文关键词 (例如: 'factory', 'finance', 'technology')." },
    maturityModel: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "成熟度模型标题 (中文)" },
        description: { type: Type.STRING, description: "解释所使用的成熟度模型 (例如 AIM² - AI Adoption Maturity Model) (中文)" },
        data: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dimension: { type: Type.STRING, description: "例如：战略、数据、基础设施、人才、治理 (中文)" },
              score: { type: Type.INTEGER, description: "评估得分 0-100" },
              description: { type: Type.STRING, description: "简短的理由 (中文)" }
            }
          }
        }
      }
    },
    highValueScenarios: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "高价值场景标题 (中文)" },
        description: { type: Type.STRING, description: "描述 (中文)" },
        data: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "业务场景名称 (中文)" },
              impact: { type: Type.INTEGER, description: "业务价值影响 (0-100)" },
              feasibility: { type: Type.INTEGER, description: "技术可行性 (0-100)" },
              description: { type: Type.STRING, description: "场景描述 (中文)" }
            }
          }
        }
      }
    },
    methodologies: {
      type: Type.ARRAY,
      description: "本分析中使用的 4 种关键方法论。",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "方法论标题 (中文)" },
          iconType: { type: Type.STRING, enum: ["chart", "process", "target", "puzzle"] },
          content: { type: Type.STRING, description: "方法论描述 (中文)" }
        }
      }
    },
    roadmap: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phase: { type: Type.STRING, description: "例如：第一阶段 (中文)" },
          timeframe: { type: Type.STRING, description: "例如：2024年第三季度 (中文)" },
          title: { type: Type.STRING, description: "阶段标题 (中文)" },
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: "行动项 (中文)" }
          }
        }
      }
    },
    conclusion: { type: Type.STRING, description: "总结陈词 (中文)" }
  },
  required: ["companyName", "reportTitle", "executiveSummary", "maturityModel", "highValueScenarios", "methodologies", "roadmap", "conclusion", "backgroundImageKeyword"]
};

// STEP 1: Generate Refinement Questions based on initial input
export const generateRefinementQuestions = async (initialInput: string): Promise<RefinementResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    用户希望为一家企业生成 AI 战略报告。用户的初始指令是: "${initialInput}"。
    
    请分析该指令，识别出目标企业（如果有）。
    为了生成更精准的报告，请生成 6 个具体的后续追问问题。
    
    这些问题必须包含以下维度，并且选项必须根据识别出的企业（如贵州茅台、特斯拉等）进行定制化：
    1. 报告的时间范围规划 (Timeframe)
    2. 报告的详细程度 (Detail Level)
    3. 报告的主要应用领域 (Application Areas)
    4. 重点关注的业务领域 (Specific Business Areas) - *对于此项，请务必列出该企业特有的实际业务部门或环节（例如若是茅台，应包含酿造、防伪、供应链等）*
    5. 技术路径倾向 (Technical Path)
    6. 创新性关注层面 (Innovation Focus)

    请用 Simplified Chinese (简体中文) 输出。
    确保每个问题有 3-5 个选项。
    
    输出格式必须符合 JSON Schema。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: refinementSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate refinement questions");
  
  return JSON.parse(text) as RefinementResponse;
};

// STEP 2: Generate Final Report with Refinement Data
export const generateReport = async (
  initialInput: string, 
  refinementContext?: Record<string, string[]>
): Promise<ReportResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let contextString = "";
  if (refinementContext) {
    contextString = "用户的详细需求偏好如下:\n";
    for (const [key, values] of Object.entries(refinementContext)) {
      contextString += `- ${key}: ${values.join(", ")}\n`;
    }
  }

  const prompt = `
    你是一位世界级的资深 AI 战略顾问。
    你的客户给出了一个口语化的指令：“${initialInput}”。
    
    ${contextString}
    
    请根据上述指令和用户的详细偏好，为该企业生成一份初步的 AI 战略研究报告。
    重点关注方法论（AIM² - AI 应用成熟度模型）、业务场景全景图和高价值场景排序。
    
    语气应专业、深刻且具有启发性。
    请务必使用 Simplified Chinese (简体中文) 输出所有内容。
    使用 Google Search 工具查找有关该公司的实际背景（行业、近期新闻、目标），以确保报告的真实性。
    
    请严格按照以下 JSON Schema 格式输出单个有效的 JSON 对象：
    ${JSON.stringify(reportSchema, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType and responseSchema are NOT allowed when using googleSearch
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response generated");

    // Clean potential markdown formatting
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const reportData = JSON.parse(cleanedText) as ReportData;
    
    // Extract grounding chunks for sources
    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk) => {
        if (chunk.web) {
          return { title: chunk.web.title || "网络来源", uri: chunk.web.uri || "#" };
        }
        return null;
      })
      .filter((s): s is GroundingSource => s !== null) || [];

    // Remove duplicates based on URI
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    return {
      report: reportData,
      sources: uniqueSources
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
