export const dataScientistDemo = {
  target_job: "Data Scientist",

  aptitudeQuestions: [
    {
      id: 1,
      question: "A diagnostic test detects a disease with 99% sensitivity and 95% specificity. The disease affects 1% of people. If someone tests positive, what is the probability they actually have the disease?",
      options: [
        "Approximately 16.5%",
        "Approximately 1%",
        "Approximately 5%",
        "Approximately 99%"
      ],
      correctAnswer: "Approximately 16.5%",
      explanation:
        "Because the disease is rare, many positive results are false positives. The probability is about 16.5%."
    },

    {
      id: 2,
      question: "Which chart is best for comparing sales across different product categories?",
      options: [
        "Bar Chart",
        "Pie Chart",
        "Scatter Plot",
        "Histogram"
      ],
      correctAnswer: "Bar Chart",
      explanation:
        "Bar charts are best for comparing values between categories."
    },

    {
      id: 3,
      question: "If a dataset has many missing values, what should you do first?",
      options: [
        "Delete the whole dataset",
        "Analyze the missing values",
        "Train the model immediately",
        "Ignore them"
      ],
      correctAnswer: "Analyze the missing values",
      explanation:
        "Always understand why data is missing before deciding how to handle it."
    },

    {
      id: 4,
      question: "Which Python library is mainly used for data analysis?",
      options: [
        "Pandas",
        "TensorFlow",
        "Flask",
        "BeautifulSoup"
      ],
      correctAnswer: "Pandas",
      explanation:
        "Pandas is widely used for cleaning, analyzing and manipulating data."
    },

    {
      id: 5,
      question: "What is the main purpose of Machine Learning?",
      options: [
        "To make computers learn from data",
        "To design websites",
        "To build databases",
        "To create operating systems"
      ],
      correctAnswer: "To make computers learn from data",
      explanation:
        "Machine Learning enables computers to recognize patterns and make predictions from data."
    }
  ],

  dsaArenaProblems: [
    {
      id: 1,
      problemTitle: "Find Maximum Number",
      description: "Return the largest number in an array.",
      inputFormat: "Array of integers",
      expectedOutput: "Largest integer"
    },

    {
      id: 2,
      problemTitle: "Reverse String",
      description: "Reverse the given string.",
      inputFormat: "String",
      expectedOutput: "Reversed String"
    },

    {
      id: 3,
      problemTitle: "Count Even Numbers",
      description: "Count how many even numbers are present in an array.",
      inputFormat: "Array of integers",
      expectedOutput: "Count"
    },

    {
      id: 4,
      problemTitle: "Find Duplicate",
      description: "Find the duplicated element in an integer array.",
      inputFormat: "Array",
      expectedOutput: "Duplicate Number"
    },

    {
      id: 5,
      problemTitle: "Binary Search",
      description: "Find the index of the target using Binary Search.",
      inputFormat: "Sorted Array and Target",
      expectedOutput: "Index"
    }
  ],

  coreConceptsGuide: {
    topicTitle: "Machine Learning Fundamentals",
    studyBullets: [
      "Understand supervised learning.",
      "Learn unsupervised learning.",
      "Know the difference between training and testing data.",
      "Understand overfitting and underfitting.",
      "Practice model evaluation metrics like Accuracy and F1 Score."
    ]
  }
};