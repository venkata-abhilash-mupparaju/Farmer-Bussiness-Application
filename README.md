# రైతు ఖాతా పుస్తకం (Farmer's Dry Grass Business & Accounts Management Application)

A mobile-first, offline-ready Progressive Web Application (PWA) designed specifically for small agricultural businesses buying and selling dry grass (**Rolls / Bales** and **Raw / Standing Grass**).

Tailored for farmers with low literacy or limited digital familiarity, with ultra-large touch targets, voice synthesis & speech-to-text name input in **Telugu (తెలుగు)** and **English**, 4-digit PIN protection, live **Supabase PostgreSQL** cloud connection, and financial calculations that distinguish between **True Business Profit** and **Cash Flow**.

---

## 🌾 Key New Features for Illiterate Farmers

### 1. 🎙️ "Listen to Name" (వాయిస్ ద్వారా పేర్ల నమోదు)
Since the farmer does not know how to type or spell names:
- **Big Microphone Button on Name Fields:** Tapping **🎙️ "పేరు చెప్పండి (Speak Name)"** activates voice recognition in Telugu (`te-IN`) or English (`en-IN`).
- **Spoken Prompts & Audio Readback:** The app prompts *"కస్టమర్ పేరు చెప్పండి"*, transcribes what the farmer says, and confirms aloud: *"పేరు: రాము డైరీ నమోదు చేయబడింది"* so the farmer is 100% sure the name was recorded correctly without reading.
- **1-Tap Visual Customer Badges:** Shows recurring customers with recognizable icons (🐄 Dairy, 🛕 Gowshala, 👨‍🌾 Farmer) for 1-touch selection.
- **Voice Search in Debts:** Tapping the microphone in the Debt Ledger allows searching customers purely by speaking their name.

### 2. 🟢 Live Database Connection (Supabase PostgreSQL + Offline Sync)
- **Database Status Indicator in Header:**
  - 🟢 **డేటాబేస్ కనెక్ట్ అయింది (DB Connected)**: When connected to Supabase cloud.
  - 📱 **ఆఫ్‌లైన్ (ఫోన్ మెమరీ)**: 100% functional offline; records are saved locally and synced automatically when connected.
- **Auto-Sync:** Every new purchase, sale, repayment, and expense automatically syncs to Supabase.
- **Test Connection & Manual Sync:** One-click connection test and sync buttons in the settings modal.

---

## 🧮 Financial Calculation Logic

$$\text{Available Rolls} = \sum \text{Rolls Purchased} - \sum \text{Rolls Sold}$$
$$\text{COGS for a Sale} = \text{Quantity Sold} \times \text{Weighted Average Purchase Cost}$$
$$\text{Net Profit} = \text{Total Sales} - \text{COGS} - \text{Transportation} - \text{Operating Expenses}$$
$$\text{Net Cash Flow} = \text{Total Cash Received} - (\text{Purchase Outflow} + \text{Expenses Outflow})$$
$$\text{Customer Debt} = \text{Total Sales Amount} - \text{Amount Paid Immediately} - \text{Subsequent Repayments}$$

---

## 🚀 Running the App

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your browser or phone.
