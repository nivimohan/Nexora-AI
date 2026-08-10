// ─────────────────────────────────────────────────────────────────────────────
// NEXORA AI — Feature 6: Daily Challenge Demo Data
// Used when DEMO MODE is active. Provides a static 4-task challenge bundle
// calibrated to the Data Scientist target role.
// ─────────────────────────────────────────────────────────────────────────────

export const dailyChallengeDemo = {
  target_job: "Data Scientist",

  aptitudeTask: {
    id: "dc-aptitude",
    type: "aptitude",
    title: "Probability & Statistics",
    question:
      "A dataset contains 200 samples — 140 positive and 60 negative. A model predicts 130 as positive and 70 as negative. Of the 130 predicted positive, 110 are truly positive. What is the model's Precision?",
    options: [
      "Approximately 84.6%",
      "Approximately 78.5%",
      "Approximately 55.0%",
      "Approximately 91.6%",
    ],
    correctAnswer: "Approximately 84.6%",
    explanation:
      "Precision = True Positives / Predicted Positives = 110 / 130 ≈ 84.6%. It measures how many of the predicted positives are actually positive.",
  },

  codingTask: {
    id: "dc-coding",
    type: "coding",
    title: "Python Coding Challenge",
    question:
      "Write a Python function `flatten(nested)` that converts a nested list of any depth into a flat list. Example: flatten([[1, [2]], [3, 4]]) → [1, 2, 3, 4].",
    solutionHint:
      "Use recursion — iterate over each element, and if an element is a list, recurse into it; otherwise append it to the result.",
    referenceAnswer: `def flatten(nested):
    result = []
    for item in nested:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result`,
  },

  hrTask: {
    id: "dc-hr",
    type: "hr",
    title: "HR Behavioral Round",
    question:
      "A project deadline is tomorrow, but you just discovered a significant data pipeline error. Your senior is unavailable. Describe step-by-step exactly what you would do.",
    sampleAnswer:
      "I would first assess the impact and severity of the error, then attempt a targeted fix using available documentation. If unresolved in 30 minutes, I would document the bug clearly and escalate through the secondary point of contact. I would proactively communicate the risk to stakeholders and propose a realistic revised timeline.",
  },

  verbalTask: {
    id: "dc-verbal",
    type: "verbal",
    title: "Communication Exercise",
    prompt:
      "Explain what 'Overfitting' means in Machine Learning to a non-technical stakeholder in 3 simple sentences. Avoid jargon. Focus on real-world analogy.",
    tips: [
      "Start with a simple everyday comparison (e.g., memorising instead of understanding).",
      "Explain the consequence in plain business terms (model fails on new data).",
      "End with why it matters for the company's decisions.",
    ],
  },
};
