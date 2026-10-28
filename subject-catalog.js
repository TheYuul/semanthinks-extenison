/* Curriculum-derived subjects and their recommendation keywords.
 * These keywords are used locally in the browser; no browsing data is sent out. */
const SUBJECT_CATALOG = {
  "Computer Science": [
    ["cs-programming", "Computer Programming", ["programming", "coding", "algorithm", "java", "python", "c++", "javascript", "variables", "functions"]],
    ["cs-discrete", "Discrete Structures", ["discrete mathematics", "logic", "set theory", "proof", "graph theory", "combinatorics", "boolean algebra"]],
    ["cs-database", "Database Management Systems", ["database", "sql", "mysql", "postgresql", "normalization", "erd", "entity relationship"]],
    ["cs-information-management", "Information Management", ["information management", "data management", "information system", "data governance"]],
    ["cs-data-structures", "Data Structures & Algorithms", ["data structures", "algorithms", "array", "linked list", "stack", "queue", "tree", "sorting"]],
    ["cs-calculus", "Calculus for Computing", ["calculus", "derivative", "integral", "differential", "mathematical modeling"]],
    ["cs-digital-logic", "Digital Logic Design", ["digital logic", "logic gates", "circuit", "flip flop", "verilog", "boolean algebra"]],
    ["cs-graphics", "Graphics & Visual Computing", ["computer graphics", "visual computing", "opengl", "rendering", "3d graphics", "animation"]],
    ["cs-security", "Information Assurance & Security", ["cybersecurity", "information security", "network security", "cryptography", "ethical hacking", "security"]],
    ["cs-robotics", "Microprocessor & Robotics", ["microprocessor", "robotics", "arduino", "embedded systems", "raspberry pi", "sensors"]],
    ["cs-networks", "Networks & Communications", ["computer networks", "networking", "tcp ip", "routing", "switching", "wireless"]],
    ["cs-oop", "Object-Oriented Programming", ["object oriented programming", "oop", "classes", "objects", "inheritance", "java", "c#"]],
    ["cs-data-science", "Practical Data Science", ["data science", "data analysis", "pandas", "visualization", "dataset", "machine learning"]],
    ["cs-programming-languages", "Programming Languages", ["programming languages", "compiler", "interpreter", "syntax", "language design"]],
    ["cs-complexity", "Algorithm & Complexity", ["algorithm complexity", "big o", "time complexity", "computational complexity", "dynamic programming"]],
    ["cs-emerging-tech", "Application Development & Emerging Technology", ["application development", "emerging technology", "cloud computing", "internet of things", "iot"]],
    ["cs-architecture", "Architecture & Organization", ["computer architecture", "computer organization", "cpu", "memory", "assembly language"]],
    ["cs-hci", "Human & Computer Interaction", ["human computer interaction", "hci", "user experience", "ux", "usability", "user interface"]],
    ["cs-intelligent-systems", "Intelligent Systems", ["artificial intelligence", "ai", "machine learning", "neural network", "expert system"]],
    ["cs-mobile", "Mobile Application Development", ["mobile development", "android", "ios", "flutter", "react native", "kotlin", "swift"]],
    ["cs-modeling", "Modeling & Simulation", ["modeling", "simulation", "simulink", "system model", "quantitative methods"]],
    ["cs-operating-systems", "Operating Systems", ["operating systems", "process scheduling", "memory management", "linux", "kernel", "threads"]],
    ["cs-distributed", "Parallel & Distributed Computing", ["distributed computing", "parallel computing", "concurrent programming", "cluster computing"]],
    ["cs-software-engineering", "Software Engineering", ["software engineering", "software development", "agile", "scrum", "testing", "software design"]],
    ["cs-automata", "Automata Theory & Formal Languages", ["automata", "formal languages", "finite state machine", "regular expression", "turing machine"]],
    ["cs-thesis", "Thesis & Research", ["thesis", "research methodology", "literature review", "research paper", "capstone"]]
  ],
  "Information Technology": [
    ["it-programming", "Computer Programming", ["programming", "coding", "java", "python", "c++", "javascript", "variables", "functions"]],
    ["it-discrete", "Discrete Mathematics", ["discrete mathematics", "logic", "set theory", "proof", "graph theory", "combinatorics"]],
    ["it-database", "Database Management Systems", ["database", "sql", "mysql", "postgresql", "normalization", "erd", "entity relationship"]],
    ["it-business-analytics", "Business Analytics", ["business analytics", "business intelligence", "data analysis", "dashboard", "power bi", "excel analytics"]],
    ["it-data-structures", "Data Structures & Algorithm", ["data structures", "algorithms", "array", "linked list", "stack", "queue", "tree", "sorting"]],
    ["it-information-management", "Information Management", ["information management", "data management", "information system", "data governance"]],
    ["it-platform", "Platform Technologies", ["platform technologies", "cloud computing", "virtualization", "web platform", "deployment"]],
    ["it-web", "Web Development", ["web development", "html", "css", "javascript", "frontend", "backend", "website"]],
    ["it-hci", "Human Computer Interaction", ["human computer interaction", "hci", "user experience", "ux", "usability", "user interface"]],
    ["it-integrative", "Integrative Programming & Technologies", ["integrative programming", "api", "integration", "web services", "software integration"]],
    ["it-networking", "Networking", ["computer networks", "networking", "tcp ip", "routing", "switching", "wireless"]],
    ["it-emerging-tech", "Application Development & Emerging Technology", ["application development", "emerging technology", "cloud computing", "internet of things", "iot"]],
    ["it-data-science", "Practical Data Science", ["data science", "data analysis", "pandas", "visualization", "dataset", "machine learning"]],
    ["it-multimedia", "Multimedia", ["multimedia", "digital media", "video editing", "graphic design", "audio editing"]],
    ["it-systems-integration", "Systems Integration & Architecture", ["systems integration", "system architecture", "enterprise architecture", "system design"]],
    ["it-security", "Information Assurance & Security", ["cybersecurity", "information security", "network security", "cryptography", "ethical hacking", "security"]],
    ["it-capstone", "Capstone Project & Research", ["capstone", "research methodology", "literature review", "research paper", "project proposal"]],
    ["it-mobile", "Mobile Application Development", ["mobile development", "android", "ios", "flutter", "react native", "kotlin", "swift"]],
    ["it-oop", "Object-Oriented Programming", ["object oriented programming", "oop", "classes", "objects", "inheritance", "java", "c#"]],
    ["it-quantitative", "Quantitative Methods & Modeling", ["quantitative methods", "modeling", "simulation", "statistics", "data analysis"]],
    ["it-systems-admin", "Systems Administration & Maintenance", ["systems administration", "server administration", "linux administration", "windows server", "maintenance"]],
    ["it-internship", "Practicum / Internship", ["internship", "practicum", "on the job training", "it career", "portfolio"]]
  ]
};

// Combined mode keeps duplicate course names distinguishable in the checklist.
SUBJECT_CATALOG["Computer Science & Information Technology"] = [
  ...SUBJECT_CATALOG["Computer Science"].map(([id, label, keywords]) => [id, `CS - ${label}`, keywords]),
  ...SUBJECT_CATALOG["Information Technology"].map(([id, label, keywords]) => [id, `IT - ${label}`, keywords])
];
