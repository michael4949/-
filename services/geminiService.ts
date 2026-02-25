import { GoogleGenAI, Type, Schema } from "@google/genai";
import { IntelligenceResponse, IntelligenceReport, IntelSource, RefinementResponse } from "../types";

// ===== Schema: 情报细化问题 =====
const refinementSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING, description: "问题文本（中文）" },
          allowMultiple: { type: Type.BOOLEAN },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "选项标签（中文）" },
                value: { type: Type.STRING, description: "选项值" }
              }
            }
          }
        }
      }
    }
  },
  required: ["questions"]
};

// ===== Schema: 情报分析报告 =====
const intelligenceReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "情报主题（中文）" },
    reportTitle: { type: Type.STRING, description: "情报报告标题（中文）" },
    executiveSummary: { type: Type.STRING, description: "200字以内的情报摘要，概述关键发现（中文）" },
    generatedAt: { type: Type.STRING, description: "报告生成时间，格式: YYYY-MM-DD HH:mm" },
    overviewStats: {
      type: Type.OBJECT,
      properties: {
        totalSources: { type: Type.INTEGER, description: "采集信息源总数" },
        threatLevel: { type: Type.STRING, description: "综合威胁等级: 严重/高/中/低" },
        sentimentScore: { type: Type.INTEGER, description: "综合舆情评分 -100(极负面) 到 100(极正面)" },
        keyEntities: { type: Type.INTEGER, description: "识别到的关键实体数量" },
        timeSpan: { type: Type.STRING, description: "情报覆盖时间范围（中文）" }
      }
    },
    radarAnalysis: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "雷达分析标题（中文）" },
        description: { type: Type.STRING, description: "雷达分析说明（中文）" },
        dimensions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dimension: { type: Type.STRING, description: "维度名称（中文）" },
              score: { type: Type.INTEGER, description: "评分 0-100" },
              description: { type: Type.STRING, description: "简要说明（中文）" }
            }
          }
        }
      }
    },
    threats: {
      type: Type.ARRAY,
      description: "识别到的威胁/风险列表（5-8项）",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "威胁名称（中文）" },
          level: { type: Type.STRING, description: "critical/high/medium/low" },
          score: { type: Type.INTEGER, description: "威胁评分 0-100" },
          category: { type: Type.STRING, description: "威胁类别（中文）" },
          description: { type: Type.STRING, description: "威胁描述（中文）" }
        }
      }
    },
    trendData: {
      type: Type.ARRAY,
      description: "最近7个时间点的趋势数据",
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "日期标签" },
          "热度": { type: Type.INTEGER, description: "关注热度 0-100" },
          "正面": { type: Type.INTEGER, description: "正面信息量 0-100" },
          "负面": { type: Type.INTEGER, description: "负面信息量 0-100" }
        }
      }
    },
    entities: {
      type: Type.ARRAY,
      description: "关键实体列表（6-10个）",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "实体名称（中文）" },
          type: { type: Type.STRING, description: "person/organization/location/event/technology/policy" },
          relevance: { type: Type.INTEGER, description: "关联度 0-100" },
          description: { type: Type.STRING, description: "实体描述（中文）" },
          connections: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: "关联实体名称" }
          }
        }
      }
    },
    sentimentBreakdown: {
      type: Type.ARRAY,
      description: "各维度情感分析（4-6个维度）",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "分析维度（中文）" },
          positive: { type: Type.INTEGER, description: "正面占比 0-100" },
          neutral: { type: Type.INTEGER, description: "中性占比 0-100" },
          negative: { type: Type.INTEGER, description: "负面占比 0-100" }
        }
      }
    },
    timeline: {
      type: Type.ARRAY,
      description: "关键事件时间线（6-10个事件）",
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "事件日期" },
          title: { type: Type.STRING, description: "事件标题（中文）" },
          description: { type: Type.STRING, description: "事件描述（中文）" },
          importance: { type: Type.STRING, description: "critical/high/medium/low" },
          source: { type: Type.STRING, description: "信息来源" }
        }
      }
    },
    keyFindings: {
      type: Type.ARRAY,
      description: "核心发现（4-6项）",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "发现标题（中文）" },
          content: { type: Type.STRING, description: "详细内容（中文）" },
          category: { type: Type.STRING, description: "threat/opportunity/trend/insight" },
          priority: { type: Type.STRING, description: "critical/high/medium/low" }
        }
      }
    },
    recommendations: {
      type: Type.ARRAY,
      description: "行动建议（3-5项）",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "建议标题（中文）" },
          description: { type: Type.STRING, description: "建议详情（中文）" },
          urgency: { type: Type.STRING, description: "immediate/short_term/medium_term/long_term" },
          category: { type: Type.STRING, description: "建议类别（中文）" }
        }
      }
    },
    conclusion: { type: Type.STRING, description: "综合研判结论（中文）" }
  },
  required: [
    "topic", "reportTitle", "executiveSummary", "generatedAt",
    "overviewStats", "radarAnalysis", "threats", "trendData",
    "entities", "sentimentBreakdown", "timeline", "keyFindings",
    "recommendations", "conclusion"
  ]
};

// ===== 第一步：生成情报细化问题 =====
export const generateRefinementQuestions = async (initialInput: string): Promise<RefinementResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    你是一位专业的情报分析师。用户希望对以下主题进行全网情报挖掘与分析:
    "${initialInput}"

    为了进行更精准的情报采集和分析，请生成 6 个具体的情报需求确认问题。

    这些问题必须覆盖以下维度:
    1. **情报时间范围** - 用户关注的时间跨度（近24小时/近一周/近一月/近三月/近一年）
    2. **情报深度** - 需要的分析深度（快速概览/标准分析/深度研判/全面穿透）
    3. **重点关注领域** - 该主题下最关心的子领域或方面
    4. **威胁/风险偏好** - 重点关注的风险类型（政治风险/经济风险/技术风险/安全风险/舆论风险/合规风险）
    5. **信息源偏好** - 优先采信的信息源类型（官方媒体/社交网络/专业论坛/学术论文/行业报告/暗网情报）
    6. **输出侧重点** - 希望报告的重点输出（威胁预警/趋势预测/实体关系图谱/舆情分析/竞争情报/行动建议）

    请用简体中文输出。确保每个问题有 3-5 个选项。
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
  if (!text) throw new Error("无法生成情报需求确认问题");

  return JSON.parse(text) as RefinementResponse;
};

// ===== 第二步：生成完整情报分析报告 =====
export const generateIntelligenceReport = async (
  initialInput: string,
  refinementContext?: Record<string, string[]>
): Promise<IntelligenceResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let contextString = "";
  if (refinementContext) {
    contextString = "用户的详细情报需求如下:\n";
    for (const [key, values] of Object.entries(refinementContext)) {
      contextString += `- ${key}: ${values.join(", ")}\n`;
    }
  }

  const prompt = `
    你是一位顶级情报分析师，精通 OSINT（开源情报）分析方法论。

    用户的情报需求指令: "${initialInput}"

    ${contextString}

    请基于以上需求，利用 Google Search 工具进行全网情报挖掘，并生成一份专业的情报分析报告。

    报告要求:
    1. **情报摘要**: 200字以内概述核心发现和研判结论
    2. **多维雷达分析**: 从政治环境、经济影响、技术态势、安全形势、舆论走向、法规合规 6个维度评估（评分0-100）
    3. **威胁/风险识别**: 识别5-8个主要威胁或风险点，按严重程度排序
    4. **趋势分析**: 生成最近7个时间点（可以是日、周、月，根据时间范围调整）的热度/正面/负面趋势数据
    5. **关键实体识别**: 识别6-10个相关的关键人物、组织、地点、事件、技术或政策
    6. **情感分析**: 从4-6个维度分析舆论情感倾向
    7. **事件时间线**: 梳理6-10个关键事件节点
    8. **核心发现**: 提炼4-6条核心情报发现
    9. **行动建议**: 给出3-5条具体可行的行动建议
    10. **综合研判**: 给出整体分析结论

    所有输出请使用简体中文。
    使用 Google Search 工具搜集真实、最新的信息，确保情报的时效性和准确性。

    请严格按照以下 JSON Schema 格式输出:
    ${JSON.stringify(intelligenceReportSchema, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) throw new Error("情报报告生成失败");

    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const reportData = JSON.parse(cleanedText) as IntelligenceReport;

    // 提取信息来源
    const rawSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk) => {
        if (chunk.web) {
          return {
            title: chunk.web.title || "网络来源",
            uri: chunk.web.uri || "#",
            credibility: 'medium' as const,
            type: '网络来源'
          };
        }
        return null;
      })
      .filter((s): s is IntelSource => s !== null) || [];

    const uniqueSources = Array.from(new Map(rawSources.map(s => [s.uri, s])).values());

    return {
      report: reportData,
      sources: uniqueSources
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
