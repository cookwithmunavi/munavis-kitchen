// api/chefbot.js
import { GoogleGenAI } from "@google/genai";

// Secure connection to your server-side environment key variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
    // Block unauthorized request structures
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { history, mode, recipe } = req.body;
        
        // Safety check to ensure history is formatted as an array
        const clientHistory = Array.isArray(history) ? history : [];
        
        if (clientHistory.length === 0) {
            return res.status(400).json({ error: 'Conversation history is empty.' });
        }

        // FIX 1: Safely extract the raw string message text using clear references
        const lastTurn = clientHistory[clientHistory.length - 1];
        let lastUserText = "";
        
        if (lastTurn && lastTurn.parts) {
            lastUserText = typeof lastTurn.parts === 'string' 
                ? lastTurn.parts 
                : (lastTurn.parts[0]?.text || "");
        }

        // Establish your dynamic core system persona configurations
        let systemInstruction = `You are "ChefBot," an empathetic, ultra-patient kitchen mentor embedded in the CookWithMunavi website. Your audience consists of complete kitchen beginners. `;

        if (mode === 'home') {
            systemInstruction += `CURRENT MODE: HOME PAGE PLANNER. Focus entirely on helping users discover dishes. If they list ingredients they have in their fridge, dynamically suggest 2-3 suitable meals they can make with them. Focus on keeping preparation simple. Give options clearly using clean bullet points.`;
        } else if (mode === 'recipe') {
            systemInstruction += `CURRENT MODE: REAL-TIME COOKING GUIDE. You are strictly locked into guiding the user through the recipe titled: "${recipe}". Walk them through this specific dish step-by-step. Give only ONE step at a time and wait for user confirmation (e.g., "Ready for the next step?") before proceeding. Highlight physical kitchen safety alerts in bold text: warn about hot splattering oil, handling hot metal pan handles, and safe knife grips.`;
        }

        // FIX 2: Let the SDK handle history natively without manual popping adjustments
        const chat = ai.chats.create({
            model: 'gemini-1.5-flash',
            history: clientHistory.slice(0, -1), // Pass everything except the current un-replied question
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.6,
            }
        });

        // Generate response using the official correct object format parameter
        const response = await chat.sendMessage({ message: lastUserText });
        
        // Return clear structured reply data to frontend JavaScript
        return res.status(200).json({ reply: response.text });

    } catch (error) {
        console.error("ChefBot System Error Log:", error);
        return res.status(500).json({ error: 'AI processing failed' });
    }
}
