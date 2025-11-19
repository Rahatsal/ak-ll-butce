import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Transaction, Category } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const analyzeReceiptWithGemini = async (base64Image: string): Promise<{ amount: number, description: string, category: string, date: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Bu fişi analiz et. Toplam tutarı, kısa bir açıklamayı (örn: Market Fişi), en uygun kategoriyi ve tarihi çıkar.
            Kategoriler şunlardan biri olmalı: Gıda, Ulaşım, Alışveriş, Faturalar, Eğlence, Sağlık, Diğer.
            Eğer tarih okunamazsa bugünün tarihini kullan (YYYY-MM-DD formatında).`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["amount", "description", "category", "date"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);

  } catch (error) {
    console.error("Receipt analysis failed:", error);
    throw error;
  }
};

export const getFinancialAdvice = async (transactions: Transaction[]): Promise<string> => {
  if (transactions.length === 0) return "Henüz yeterli veri yok. Harcama eklemeye başlayın!";

  const transactionSummary = JSON.stringify(transactions.slice(0, 50)); // Limit context size

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Aşağıdaki işlem geçmişine dayanarak, kullanıcıya Türkçe olarak kısa, motive edici ve eyleme geçirilebilir bir finansal tavsiye ver.
      Kullanıcının çok harcama yaptığı alanları uyar veya tasarruf potansiyeli olan yerleri belirt.
      Samimi bir dil kullan. Maksimum 3 cümle olsun.
      
      İşlemler: ${transactionSummary}`
    });

    return response.text || "Tavsiye oluşturulamadı.";
  } catch (error) {
    console.error("Advice generation failed:", error);
    return "Şu anda tavsiye oluşturamıyorum, lütfen daha sonra tekrar deneyin.";
  }
};
