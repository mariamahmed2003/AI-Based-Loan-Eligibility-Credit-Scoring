// app/services/OpenAIService.js
// ═══════════════════════════════════════════════════════════════
// OPENAI LOAN PREDICTION SERVICE
// Uses GPT-4 to predict loan eligibility based on Egyptian
// banking benchmarks and financial profile data.
// Returns: score, approval decision, factor weights, explanation
// ═══════════════════════════════════════════════════════════════

const OPENAI_API_KEY = 'process.env.EXPO_PUBLIC_OPENAI_API_KEY'; // 🔑 Replace with your key
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Egyptian banking benchmarks used as AI context.
 * Sources: CBE regulations, NBE, CIB, Banque Misr public data.
 */
const EGYPTIAN_BANKING_CONTEXT = `
You are an Egyptian bank loan officer AI assistant.
Use the following real Egyptian banking benchmarks to evaluate loan applications:

ELIGIBILITY RULES (hard requirements — any failure = auto reject):
- Age: must be 21–65 years old at time of application
- Minimum monthly income: EGP 10,000 (most banks; some require EGP 15,000+)
- Employment: must be actively employed; unemployed applicants are rejected
- Probation: must have completed probation period (minimum 6 months at current job)
- DTI hard cap: total monthly obligations must not exceed 50% of net monthly income
- Nationality: Egyptian national or foreigner with valid residency permit

SCORING FACTORS AND REAL WEIGHTS (based on Egyptian bank practices):
1. Debt-to-Income Ratio (DTI) — Weight: 30%
   - Under 20%: Excellent (+30 pts)
   - 20–35%: Good (+22 pts)
   - 35–40%: Acceptable (+14 pts)
   - 40–50%: Risky (+6 pts)
   - Above 50%: Auto-reject (Egyptian hard cap)

2. Monthly Income Level — Weight: 25%
   - EGP 50,000+/month: Excellent (+25 pts)
   - EGP 25,000–50,000: Good (+18 pts)
   - EGP 15,000–25,000: Acceptable (+12 pts)
   - EGP 10,000–15,000: Minimum (+6 pts)
   - Below EGP 10,000: Auto-reject

3. Employment Stability — Weight: 20%
   - Permanent government job: Excellent (+20 pts) — preferred by Egyptian banks
   - Permanent private sector: Good (+16 pts)
   - Contract (min 1 year): Acceptable (+10 pts)
   - Self-employed (3+ years): Acceptable (+8 pts)
   - Contract under 1 year: Risky (+4 pts)
   - Unemployed: Auto-reject

4. Employment Duration — Weight: 10%
   - 5+ years: Excellent (+10 pts)
   - 3–5 years: Good (+7 pts)
   - 1–3 years: Acceptable (+5 pts)
   - 0.5–1 year: Minimum (+3 pts)
   - Under 0.5 years: Auto-reject (probation not complete)

5. Savings/Disposable Income Rate — Weight: 10%
   - Above 25% of income saved: Excellent (+10 pts)
   - 15–25%: Good (+7 pts)
   - 10–15%: Acceptable (+5 pts)
   - 5–10%: Low (+3 pts)
   - Under 5%: Very low (+1 pt)

6. Age Factor — Weight: 5%
   - 30–50 years: Optimal (+5 pts)
   - 25–30 or 50–55: Good (+4 pts)
   - 21–25 or 55–60: Acceptable (+3 pts)
   - 60–65: Risky (+1 pt)
   - Under 21 or over 65: Auto-reject

PERSONAL LOAN TERMS (Egypt, 2024–2025):
- Interest rates: 25–35% per annum (following CBE rate of ~27.25%)
- Maximum term: 84 months (7 years)
- Maximum amount: typically 20–40× monthly salary
- Monthly installment: must not exceed 40–50% of monthly income
- Salary transfer to lending bank is usually mandatory
- Employer must be on bank's approved employer list

CREDIT SCORE SCALE: 300–850 (FICO-style)
- 300–499: Very Poor — Auto-reject
- 500–579: Poor — Likely rejected
- 580–649: Fair — May qualify with conditions
- 650–699: Good — Likely approved
- 700–749: Very Good — Approved with good rates
- 750–850: Excellent — Best rates available

APPROVAL THRESHOLD: Score >= 580 AND all hard eligibility rules passed
`;

/**
 * Call OpenAI API to get real loan prediction
 * @param {Object} profileData - Financial profile data
 * @returns {Object} - AI prediction result
 */
const predictLoanEligibility = async (profileData) => {
  const {
    monthlyIncome,
    monthlyExpenses,
    existingDebts,
    age,
    employmentType,
    employmentYears,
    requestedLoanAmount,
    dti,
    disposableIncome,
    savingsRate,
    employmentStabilityScore,
    loanToIncomeRatio,
  } = profileData;

  const prompt = `
Analyze this Egyptian personal loan application and provide a detailed assessment.

APPLICANT FINANCIAL PROFILE:
- Age: ${age} years
- Monthly Income: EGP ${monthlyIncome?.toLocaleString()}
- Monthly Expenses: EGP ${monthlyExpenses?.toLocaleString()}
- Total Existing Debts: EGP ${existingDebts?.toLocaleString()}
- Employment Type: ${employmentType}
- Years at Current Job: ${employmentYears} years
- Requested Loan Amount: EGP ${requestedLoanAmount?.toLocaleString()}

CALCULATED METRICS:
- Debt-to-Income Ratio (DTI): ${dti?.toFixed(2)}%
- Monthly Disposable Income: EGP ${disposableIncome?.toLocaleString()}
- Savings Rate: ${savingsRate?.toFixed(2)}%
- Employment Stability Score: ${employmentStabilityScore}/100
- Loan-to-Annual-Income Ratio: ${loanToIncomeRatio?.toFixed(2)}x

Based on Egyptian banking standards and the benchmarks provided, respond ONLY with a valid JSON object in exactly this format (no markdown, no explanation outside JSON):

{
  "creditScore": <number 300-850>,
  "approved": <true or false>,
  "approvalProbability": <number 0-100>,
  "riskLevel": <"Very Low" | "Low" | "Moderate" | "High" | "Very High">,
  "rating": <"Exceptional" | "Very Good" | "Good" | "Fair" | "Poor">,
  "hardReject": <true or false>,
  "hardRejectReasons": [<strings, empty array if not hard rejected>],
  "factorScores": {
    "dti": { "score": <0-30>, "maxScore": 30, "impact": <"Positive"|"Neutral"|"Negative">, "value": "<DTI%>", "label": "Debt-to-Income Ratio" },
    "income": { "score": <0-25>, "maxScore": 25, "impact": <"Positive"|"Neutral"|"Negative">, "value": "EGP <amount>", "label": "Monthly Income" },
    "employment": { "score": <0-20>, "maxScore": 20, "impact": <"Positive"|"Neutral"|"Negative">, "value": "<type>", "label": "Employment Stability" },
    "employmentDuration": { "score": <0-10>, "maxScore": 10, "impact": <"Positive"|"Neutral"|"Negative">, "value": "<years> years", "label": "Employment Duration" },
    "savings": { "score": <0-10>, "maxScore": 10, "impact": <"Positive"|"Neutral"|"Negative">, "value": "<savings%>", "label": "Savings Rate" },
    "age": { "score": <0-5>, "maxScore": 5, "impact": <"Positive"|"Neutral"|"Negative">, "value": "<age> years", "label": "Age Factor" }
  },
  "positiveFactors": [<list of strength strings>],
  "negativeFactors": [<list of weakness strings>],
  "reasons": [<list of explanation strings, first one being the main verdict>],
  "maxLoanAmount": <number in EGP>,
  "recommendedMonthlyInstallment": <number in EGP>,
  "interestRateMin": <number, e.g. 25>,
  "interestRateMax": <number, e.g. 30>,
  "loanTermMonths": <number, max 84>,
  "recommendations": [
    {
      "title": "<string>",
      "description": "<string>",
      "priority": <"high"|"medium"|"low">,
      "icon": "<ionicon name>"
    }
  ],
  "financialHealthSummary": "<one sentence summary>"
}
`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: EGYPTIAN_BANKING_CONTEXT },
          { role: 'user',   content: prompt },
        ],
        temperature: 0.2, // Low temperature = consistent, factual responses
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('Empty response from OpenAI');

    // Clean and parse JSON
    const cleaned = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const result = JSON.parse(cleaned);
    return { success: true, data: result };

  } catch (error) {
    console.error('OpenAI prediction error:', error);
    return { success: false, error: error.message };
  }
};

export { predictLoanEligibility };
export default { predictLoanEligibility };