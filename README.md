# 🎓 ShikshaMesh

> **An AWS-powered, agentic, multilingual learning platform that transforms course material into personalized tutoring, adaptive assessments, AI interviews, misconception diagnosis, visual learning, and collaborative classrooms.**

[![AWS](https://img.shields.io/badge/AWS-Powered-FF9900?logo=amazonaws&logoColor=white)](#-aws-cloud-architecture)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](#-technology-stack)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](#-technology-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](#-technology-stack)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)](#-running-locally)

**Live Demo:** https://shikshamesh.onrender.com/ 
**Repository:** https://github.com/shreesriv12/WeMakeDevs

---

# 🌟 What is ShikshaMesh?

ShikshaMesh is an intelligent learning workspace designed for students and teachers who already have PDFs, notes, slides, lectures, and assignments but still struggle with a more important problem:

> **Understanding exactly what a student misunderstood and what they should learn next.**

Traditional AI tutors usually behave like generic chatbots. They answer questions, but they do not necessarily follow the teacher's material, understand classroom permissions, track misconceptions, adapt assessments, or connect learning activities together.

ShikshaMesh approaches education as an **agent orchestration problem**.

Instead of sending every request to one model, the platform combines specialized AI agents, deterministic authorization, course-grounded retrieval, learner mastery signals, AWS AI services, serverless workflows, multilingual tools, and collaborative learning experiences.

```text
                    Student / Teacher
                           │
                           ▼
                  Amazon Cognito
                           │
                           ▼
               Authentication + Policy
                           │
                           ▼
                    Intent Router
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         Tutor Agent   Assessment   Research Agent
                           Agent
              │            │            │
              ▼            ▼            ▼
          Bedrock      SageMaker      SerpApi
              │
              ▼
      Bedrock Knowledge Base
              │
              ▼
             S3

                     +
                     
        Step Functions + Lambda
                     │
                  Translate
                     │
                EventBridge
                     │
                 CloudWatch
```

---

# 🏆 Hackathon Tracks

ShikshaMesh combines both the **Build It** and **Ship It** development approaches.

## 🔨 Build It

The local development environment uses AWS-compatible open-source tools so important infrastructure and authorization workflows can be developed and tested locally.

Implemented tooling includes:

| Tool | Usage |
| --- | --- |
| **AWS SAM** | Local Lambda workflow definition and quiz-worker invocation |
| **LocalStack** | Local emulation of AWS-style S3, Lambda, SQS, and EventBridge workflows |
| **Cedar** | Deterministic student, teacher, administrator, class, and institution authorization policies |
| **Docker / Docker Compose** | Local PostgreSQL, supporting services, and application containers |

The local workflow makes it possible to develop and verify important cloud behavior without requiring every development request to reach AWS.

---

# 🚀 Ship It

AWS powers the cloud intelligence, storage, authentication, workflows, observability, and live-learning capabilities of ShikshaMesh.

## AWS services implemented in ShikshaMesh

| AWS Service | Implementation in ShikshaMesh |
| --- | --- |
| **Amazon Bedrock** | Grounded tutor, quiz, interview, explanation, and educational generation |
| **Amazon Bedrock Knowledge Bases** | Retrieval of authorized course material before AI generation |
| **Amazon SageMaker AI** | Runtime integration for multilingual intent classification and learner-mastery inference |
| **Amazon S3** | Secure storage of uploaded PDFs, DOCX files, TXT files, processed learning content, and Knowledge Base sources |
| **Amazon Cognito** | Student, teacher, and administrator authentication and role-aware access |
| **AWS Lambda** | Serverless quiz-generation and processing worker |
| **AWS Step Functions** | Multi-stage quiz workflow orchestration |
| **Amazon Translate** | Multilingual quiz translation |
| **Amazon EventBridge** | Audit, workflow, notification, and analytics events |
| **Amazon CloudWatch** | Logs, workflow visibility, operational debugging, and monitoring |
| **Amazon IVS Real-Time** | Real-time classroom video participation |
| **AWS IAM** | Least-privilege access between AWS services |
| **IAM Identity Center** | Secure development and CLI access |
| **Amazon ECR** | Container image storage for the ShikshaMesh application |

---

# ☁️ AWS Cloud Architecture

AWS is not used as a simple hosting checkbox in ShikshaMesh.

Different services are responsible for different parts of the learning lifecycle.

```text
┌──────────────────────────────────────────────────────┐
│                    ShikshaMesh UI                    │
│                                                      │
│ Student • Teacher • Admin • Canvas • Live Classroom │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ Amazon Cognito   │
                │ Authentication   │
                └────────┬─────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ Authentication + Policy Layer  │
        │ RBAC • ABAC • Cedar            │
        │ Institution • Class Scope      │
        └───────────────┬────────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │  Agent Router   │
               └────────┬────────┘
                        │
       ┌────────────────┼─────────────────┐
       │                │                 │
       ▼                ▼                 ▼
┌────────────┐   ┌─────────────┐   ┌─────────────┐
│   Tutor    │   │ Assessment  │   │  Research   │
│   Agent    │   │    Agent    │   │    Agent    │
└─────┬──────┘   └──────┬──────┘   └──────┬──────┘
      │                 │                 │
      ▼                 ▼                 ▼
Amazon Bedrock     SageMaker AI        SerpApi
      │
      ▼
Bedrock Knowledge Bases
      │
      ▼
   Amazon S3


┌──────────────────────────────────────────────────────┐
│                Serverless Workflow                   │
│                                                      │
│ Step Functions → Lambda → Translate → EventBridge   │
└────────────────────────┬─────────────────────────────┘
                         │
                         ▼
                    CloudWatch


┌──────────────────────────────────────────────────────┐
│                  Live Learning                       │
│                                                      │
│              Amazon IVS Real-Time                    │
└──────────────────────────────────────────────────────┘
```

---

# 🤖 Multi-Agent Learning Architecture

ShikshaMesh does not treat every learning request as the same problem.

Different specialized agents handle different tasks.

## 📚 Tutor Agent

The Tutor Agent answers questions using the learner's authorized course material.

```text
Student Question
      ↓
Authentication
      ↓
Class / Institution Scope
      ↓
Course Retrieval
      ↓
Bedrock Knowledge Bases
      ↓
Relevant Course Evidence
      ↓
Amazon Bedrock
      ↓
Grounded Explanation
```

The system prioritizes teacher-provided material instead of immediately relying on general web knowledge.

This keeps explanations aligned with the learner's actual syllabus.

---

## 🧠 Adaptive Assessment Agent

The assessment system creates quizzes and updates learner mastery signals.

It considers:

- course material;
- topic;
- previous attempts;
- difficulty;
- learner mastery;
- language;
- assessment history.

This allows ShikshaMesh to move beyond static quizzes.

A learner who struggles with a topic can receive additional practice instead of immediately moving to harder questions.

---

## 👨‍🏫 Teacher / Quiz Agent

Teachers can create course-aware assessments using an AWS serverless workflow.

```text
Teacher Request
      ↓
Authorization
      ↓
AWS Step Functions
      ↓
AWS Lambda
      ↓
Course Retrieval
      ↓
Amazon Bedrock
      ↓
Quiz Generation
      ↓
Amazon Translate
      ↓
Notification / Analytics Events
      ↓
Amazon EventBridge
      ↓
Amazon CloudWatch
```

The workflow separates long-running learning operations from the main application request.

---

## 🔎 Research Agent

The Research Agent handles questions requiring information beyond private course material.

External research does not automatically receive the student's private learning context.

```text
External Research Request
          ↓
Authorization
          ↓
Research Intent Detection
          ↓
PII-Safe Query
          ↓
Approved Domain Policy
          ↓
SerpApi
          ↓
Normalized Evidence
          ↓
Cited Response
```

SerpApi therefore acts as a **controlled external research tool**, while AWS services remain the primary learning and cloud infrastructure.

---

# 📚 Grounded AI Tutor

A teacher can upload course material such as:

- PDF documents;
- DOCX notes;
- text files;
- lecture material;
- institutional learning content.

The learning pipeline then creates a trusted knowledge layer.

```text
Teacher Upload
      ↓
Amazon S3
      ↓
Document Processing
      ↓
Bedrock Knowledge Base
      ↓
Metadata-Scoped Retrieval
      ↓
Amazon Bedrock
      ↓
Grounded Student Response
```

Retrieval can be scoped using:

- institution;
- class;
- document;
- learner authorization.

This prevents unrelated course material from silently entering another class's learning context.

---

# 🔬 Concept X-Ray

One of ShikshaMesh's core learning features is **Concept X-Ray**.

Most learning applications answer:

> Did the student get the answer correct?

ShikshaMesh asks:

> **Where did the student's reasoning first become incorrect?**

Example:

```text
Student Explanation
       ↓
Concept X-Ray
       ↓
Reasoning Analysis
       ↓
First Likely Misconception
       ↓
Course-Grounded Correction
       ↓
Recovery Challenge
       ↓
Explain It Back
```

For example, if a learner says that `up[v][j]` represents the `j-th` ancestor in binary lifting, Concept X-Ray can identify the misconception that the jump actually represents `2^j`.

Instead of simply showing the final answer, the learner is shown:

1. where the reasoning changed direction;
2. why that assumption is incorrect;
3. the correct concept;
4. a small recovery exercise;
5. an Explain It Back challenge.

---

# 🗣️ Explain It Back

Correcting a learner does not guarantee that they understood the correction.

ShikshaMesh therefore asks students to explain the concept again using their own reasoning.

Students can explain through:

- text;
- voice;
- code;
- diagrams;
- Canvas drawings.

```text
Mistake
   ↓
Diagnosis
   ↓
Correction
   ↓
Recovery Activity
   ↓
Explain It Back
   ↓
Mastery Signal
```

---

# 🎤 AI Interview

Students can practise explaining course concepts through an interactive AI interview.

The interview can:

- generate questions from uploaded course material;
- ask progressively deeper follow-up questions;
- accept typed answers;
- accept spoken answers;
- convert speech to text;
- generate spoken questions;
- score responses;
- provide feedback;
- generate an interview report.

This tests whether a learner can **explain a concept**, rather than simply recognize the correct multiple-choice option.

---

# 📝 Smart Notes

Smart Notes converts course concepts into revision-friendly learning material.

Generated learning material can include:

- concise summaries;
- key concepts;
- important definitions;
- examples;
- memory hooks;
- common mistakes;
- revision prompts;
- flashcard-style questions;
- bilingual explanations.

The goal is to turn long notes into something a student can actually revise from.

---

# 🎨 Diagram Studio

Many technical topics are easier to understand visually.

Diagram Studio allows students and teachers to create and edit:

- flowcharts;
- UML diagrams;
- sequence diagrams;
- class diagrams;
- database schemas;
- state diagrams;
- system architecture diagrams;
- DSA decision trees;
- algorithm flows.

Mermaid-based diagrams make generated visuals editable instead of producing static images only.

---

# 🖌️ Learning Canvas

The Learning Canvas gives students a workspace where they can reason visually.

It supports:

- freehand drawing;
- text notes;
- shapes;
- arrows;
- connectors;
- code blocks;
- diagrams;
- geometry objects;
- collaborative annotations;
- visual explanations.

This is particularly useful for subjects where the reasoning itself is spatial or diagrammatic.

---

# 💻 Code Workspace

Technical learners can explain and experiment using code through a Monaco-based editor.

The code workspace allows programming concepts to be studied alongside:

- tutoring;
- diagrams;
- Canvas explanations;
- Concept X-Ray;
- Explain It Back.

Students are not forced to convert every technical explanation into plain text.

---

# 📊 Adaptive Learning and Mastery

Learner activity produces mastery signals that can influence subsequent learning experiences.

Signals can include:

```text
Quiz Attempts
     +
Interview Responses
     +
Concept X-Ray Results
     +
Explain It Back
     +
Assessment History
     =
Learner Mastery State
```

The mastery model can influence:

- question difficulty;
- recommended revision topics;
- intervention timing;
- assessment selection;
- next learning activity.

Amazon SageMaker AI integration provides the runtime path for specialized intent and mastery models.

---

# 🌐 Multilingual Learning

ShikshaMesh supports learning experiences designed for:

- English;
- Hindi;
- Hinglish;
- additional Indian-language quiz workflows.

Amazon Translate is integrated into the quiz workflow for multilingual assessments.

This allows the same teacher-created learning material to support students who may understand the subject better in a different language.

---

# 👨‍🏫 Teacher Intelligence

Teachers receive a different workspace from students.

The teacher experience includes:

- course-document uploads;
- ingestion tracking;
- assessment generation;
- quiz scheduling;
- language selection;
- misconception patterns;
- learner intervention signals;
- classroom activity;
- reusable diagram templates;
- live-class controls;
- attendance signals.

---

# 🔥 Misconception Heatmap

Concept X-Ray results can be aggregated into classroom-level misconception patterns.

Instead of only showing:

```text
40% students answered incorrectly
```

the platform can help identify patterns such as:

```text
Students understand binary lifting
but frequently confuse j with 2^j.
```

This gives teachers something actionable to explain again.

---

# 🌐 Live Classroom

ShikshaMesh includes a real-time collaborative classroom experience.

Features include:

- student presence;
- attendance;
- realtime chat;
- raised hands;
- shared learning activities;
- collaborative Canvas;
- linked diagrams;
- note-grounded doubt support;
- teacher controls;
- optional video participation.

## Amazon IVS Real-Time

Amazon IVS Real-Time provides the live-video layer.

Students can join as viewers and selectively enable:

- camera;
- microphone.

Participant access uses short-lived server-issued tokens rather than exposing privileged credentials in the client.

---

# 📶 Offline-Friendly Learning

ShikshaMesh includes an offline-first foundation.

```text
Student Action
      ↓
Internet Available?
    ↙           ↘
  Yes           No
   ↓             ↓
Server      IndexedDB Queue
                  ↓
          Connectivity Returns
                  ↓
               Replay
                  ↓
          Server Authorization
```

Implemented offline foundations include:

- PWA manifest;
- service worker;
- IndexedDB;
- connectivity detection;
- offline request queue;
- replay after connectivity returns.

Privileged requests are still re-authorized by the server after replay.

---

# 🔐 Security Architecture

ShikshaMesh follows one important rule:

> **Models generate. Policies authorize.**

The AI model does not decide whether a student is allowed to access a document, classroom, teacher workflow, or privileged tool.

Authorization happens before agent execution.

Implemented controls include:

- Amazon Cognito authentication;
- signed JWT verification;
- student / teacher / admin roles;
- RBAC;
- ABAC;
- Cedar policies;
- institution isolation;
- class-scoped authorization;
- metadata-scoped retrieval;
- server-side secrets;
- PII-aware research queries;
- privacy-safe audit events;
- server authorization for offline replay;
- account deletion workflow;
- research/training consent controls.

---

# 🪪 Amazon Cognito

Amazon Cognito provides the production authentication layer.

The platform supports:

```text
User
 │
 ├── Student
 ├── Teacher
 └── Administrator
```

Cognito identity information feeds the deterministic policy layer before protected tools or learning data are accessed.

---

# 💾 Amazon S3

Amazon S3 stores teacher-uploaded course material and Bedrock ingestion sources.

Stored objects use institution/class-aware paths and metadata.

```text
Institution
    ↓
Class
    ↓
Document
    ↓
Processed Learning Content
```

This storage hierarchy supports authorization-aware retrieval.

---

# 🧠 Amazon Bedrock

Amazon Bedrock is used for grounded educational generation.

Bedrock-powered workflows include:

- tutor explanations;
- assessment generation;
- interview generation;
- grounded educational responses;
- reasoning support;
- Knowledge Base retrieval.

Generation is combined with authorized course evidence rather than treating the language model as the source of truth.

---

# 📚 Amazon Bedrock Knowledge Bases

Bedrock Knowledge Bases connects private learning documents with AI generation.

```text
Course Material
     ↓
Amazon S3
     ↓
Bedrock Knowledge Base
     ↓
Metadata Filter
     ↓
Relevant Chunks
     ↓
Amazon Bedrock
     ↓
Grounded Response
```

---

# ⚡ AWS Lambda

The quiz worker runs as a serverless Lambda workflow component.

The worker handles stages including:

- quiz generation;
- course retrieval;
- multilingual translation;
- notification events;
- analytics events.

---

# 🔄 AWS Step Functions

Step Functions orchestrates multi-stage assessment workflows.

```text
Generate Quiz
      ↓
Validate
      ↓
Translate
      ↓
Notify
      ↓
Analytics
```

Using a workflow engine keeps these operations visible and independently traceable instead of hiding every operation inside one large application endpoint.

---

# 🌍 Amazon Translate

Amazon Translate powers multilingual assessment workflows.

A generated quiz can be translated while preserving:

- question IDs;
- question ordering;
- answer options;
- correct answer indexes;
- difficulty;
- quiz structure.

---

# 📡 Amazon EventBridge

EventBridge provides event-driven communication for:

- workflow events;
- audit events;
- assessment events;
- notification events;
- analytics events.

Sensitive information such as raw student answers, JWTs, private documents, and API keys is excluded from audit event payloads.

---

# 📊 Amazon CloudWatch

CloudWatch provides operational visibility into AWS-backed workflows.

It is used for:

- Lambda logs;
- structured workflow logs;
- error investigation;
- workflow monitoring;
- operational dashboards.

---

# 🔑 IAM and IAM Identity Center

AWS IAM controls permissions between services.

IAM Identity Center is used for secure development and AWS CLI access without relying on permanent credentials inside the repository.

---

# 📦 Amazon ECR

The ShikshaMesh application is containerized and its container deployment workflow uses Amazon ECR for image storage.

This keeps application packaging consistent between development and cloud deployment workflows.

---

# 🔎 Governed External Research

SerpApi is intentionally kept separate from private course intelligence.

```text
PRIVATE KNOWLEDGE
Course Material
Student Context
Institution Content
       │
       ▼
S3 + Bedrock Knowledge Bases


PUBLIC KNOWLEDGE
Current Information
Official Resources
Recent Research
       │
       ▼
Research Agent + SerpApi
```

Student private context is not automatically converted into public web-search queries.

---

# 🎥 Learning Resource Discovery

The Research Agent can also find relevant learning resources such as educational video playlists.

```text
Learning Topic
      ↓
Research Agent
      ↓
SerpApi
      ↓
Educational Results
      ↓
Validation
      ↓
Deduplication
      ↓
Learning Resource UI
```

---

# 🧩 Model Context Protocol

ShikshaMesh includes MCP-based tooling so AI agents interact with explicit, policy-bound tools instead of receiving unrestricted access to application data.

Examples include:

- course retrieval;
- research;
- learning context;
- authorization-aware operations.

---

# 🏗️ Complete Platform Flow

```text
                         Student / Teacher
                                │
                                ▼
                         Amazon Cognito
                                │
                                ▼
                      RBAC + ABAC + Cedar
                                │
                                ▼
                          Agent Router
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
          ▼                     ▼                      ▼
     Tutor Agent          Assessment Agent       Research Agent
          │                     │                      │
          ▼                     ▼                      ▼
 Amazon Bedrock         SageMaker AI             SerpApi
          │
          ▼
Bedrock Knowledge Bases
          │
          ▼
      Amazon S3
          
          
Teacher Quiz Request
        │
        ▼
AWS Step Functions
        │
        ▼
AWS Lambda
        │
        ├── Bedrock
        ├── Bedrock Knowledge Base
        ├── Amazon Translate
        └── EventBridge
                 │
                 ▼
             CloudWatch


Live Classroom
        │
        ▼
Amazon IVS Real-Time
```

---

# ✨ Feature Summary

| Capability | Implementation |
| --- | --- |
| 🤖 Multi-Agent Routing | Specialized tutoring, assessment, teacher, and research workflows |
| 📚 Grounded Tutor | Course-aware answers with retrieved evidence |
| 🧠 Adaptive Assessment | Difficulty and mastery-aware quizzes |
| 🔬 Concept X-Ray | Finds the first likely misconception in student reasoning |
| 🗣️ Explain It Back | Validates understanding after correction |
| 🎤 AI Interview | Voice/text course-based interview practice |
| 📝 Smart Notes | Structured revision material |
| 🎨 Diagram Studio | UML, Mermaid, DSA, system and database diagrams |
| 🖌️ Learning Canvas | Collaborative visual reasoning workspace |
| 💻 Code Workspace | Monaco-based programming environment |
| 🌐 Live Classroom | Presence, chat, collaboration and video |
| 📶 Offline Learning | PWA + IndexedDB queue and replay |
| 👨‍🏫 Teacher Intelligence | Misconceptions, assessments and interventions |
| 🔎 Governed Research | Policy-controlled external information retrieval |
| 🎥 Resource Discovery | Educational resource and playlist discovery |
| 🔐 Policy Engine | Cognito + RBAC + ABAC + Cedar |
| ☁️ AWS Intelligence | Bedrock, SageMaker, S3 and AWS serverless workflows |

---

# 🛠️ Technology Stack

## Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Mermaid
- React Konva
- Monaco Editor

## Agentic AI

- LangGraph
- Model Context Protocol
- Amazon Bedrock
- Amazon Bedrock Knowledge Bases
- Amazon SageMaker AI

## AWS

- Amazon Bedrock
- Amazon Bedrock Knowledge Bases
- Amazon SageMaker AI
- Amazon S3
- Amazon Cognito
- AWS Lambda
- AWS Step Functions
- Amazon Translate
- Amazon EventBridge
- Amazon CloudWatch
- Amazon IVS Real-Time
- AWS IAM
- IAM Identity Center
- Amazon ECR

## Build It

- AWS SAM
- LocalStack
- Cedar
- Docker
- Docker Compose

## Backend

- Next.js API Routes
- PostgreSQL
- Socket.IO
- Zod

## Retrieval and Search

- Bedrock Knowledge Bases
- Qdrant
- SerpApi

## DevOps

- Docker
- GitHub Actions
- Terraform
- AWS CLI

---

# 📁 Repository Structure

```text
WeMakeDevs/
│
├── README.md
│
└── firstcommit/
    │
    ├── app/
    │   ├── api/
    │   ├── teacher/
    │   ├── interview/
    │   ├── concept-xray/
    │   ├── canvas/
    │   ├── diagrams/
    │   └── ...
    │
    ├── components/
    │
    ├── lib/
    │   ├── aws/
    │   ├── authentication/
    │   ├── policy/
    │   ├── retrieval/
    │   ├── research/
    │   └── learning/
    │
    ├── workers/
    │   └── quiz/
    │
    ├── policies/
    │
    ├── mcp/
    │
    ├── ml/
    │   ├── intent/
    │   └── mastery/
    │
    ├── infra/
    │
    ├── realtime/
    │
    ├── db/
    │
    ├── scripts/
    │
    ├── tests/
    │
    ├── template.yaml
    ├── Dockerfile
    ├── compose.yaml
    └── package.json
```

---

# 🚀 Running Locally

## 1. Clone the repository

```bash
git clone https://github.com/shreesriv12/WeMakeDevs.git
cd WeMakeDevs/firstcommit
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Windows:

```powershell
copy .env.example .env.local
```

Never commit `.env.local`.

---

## 4. Start PostgreSQL

```bash
docker compose up -d db
```

---

## 5. Start ShikshaMesh

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🔨 Running the Build It Environment

## LocalStack

Start the local AWS-compatible environment:

```bash
docker compose --profile local-aws up -d localstack
```

LocalStack provides local development equivalents for workflows involving:

```text
S3
Lambda
SQS
EventBridge
```

---

## Cedar

Run local authorization verification:

```bash
npm run policy:cedar
```

The Cedar policy tests validate scenarios including:

- student self-access;
- teacher class access;
- administrator access;
- governed research permissions.

---

## AWS SAM

The repository contains a SAM template and local quiz-worker configuration for serverless workflow development.

```bash
npm run sam:quiz-local
```

---

# 🧪 Testing

Run application tests:

```bash
npm test
```

Run a production build:

```bash
npm run build
```

Evaluate intent classification:

```bash
npm run eval:intents
```

Verify external research:

```bash
npm run verify:serpapi
```

Verify Cedar policies:

```bash
npm run policy:cedar
```

---

# 🎬 Hackathon Demo Flow

A complete demo can be shown as one connected learning journey.

## 1. Authentication

Sign in using Amazon Cognito.

Show that students and teachers receive different experiences.

---

## 2. Upload Course Material

Upload a PDF, DOCX, or TXT file.

Show:

```text
Teacher Upload
→ Amazon S3
→ Bedrock Knowledge Base
→ Course Intelligence
```

---

## 3. Grounded Tutor

Ask a question about the uploaded course material.

Show:

```text
Student Question
→ Authorization
→ Course Retrieval
→ Bedrock Knowledge Base
→ Amazon Bedrock
→ Grounded Response
```

---

## 4. Adaptive Quiz

Create a quiz from course content.

Show:

```text
Teacher Request
→ Step Functions
→ Lambda
→ Bedrock
→ Translate
→ EventBridge
→ CloudWatch
```

---

## 5. AI Interview

Start a course-based interview.

Answer using voice or text and show the final feedback report.

---

## 6. Concept X-Ray

Give the system an intentionally incorrect explanation.

Show:

```text
Student Reasoning
→ Concept X-Ray
→ First Misconception
→ Correction
→ Recovery Challenge
→ Explain It Back
```

---

## 7. Smart Notes

Generate revision notes from the same learning context.

---

## 8. Diagram Studio + Canvas

Generate a diagram and continue explaining the topic visually.

---

## 9. Live Classroom

Show:

- realtime presence;
- chat;
- shared Canvas;
- raised hands;
- teacher interaction;
- Amazon IVS Real-Time video.

---

## 10. Governed Research

Ask a question requiring current information.

Show:

```text
Research Intent
→ Policy Check
→ PII-Safe Query
→ SerpApi
→ Approved Sources
→ Cited Evidence
```

---

# 💡 What Makes ShikshaMesh Different?

ShikshaMesh is not simply:

```text
Student → LLM → Answer
```

It is:

```text
                         Student
                            │
                            ▼
                     Identity + Policy
                            │
                            ▼
                     AI Orchestrator
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
    Course Knowledge   Learner State    Live Research
           │                │                │
           ▼                ▼                ▼
      Bedrock KB        SageMaker         SerpApi
           │                │                │
           └────────────────┼────────────────┘
                            │
                            ▼
                    Specialized Agents
                            │
                            ▼
                   Personalized Learning
```

The platform does not only generate answers.

It connects:

**identity + policy + private knowledge + AI generation + learner mastery + serverless workflows + live collaboration + external evidence**

into one learning system.

---

# 🎓 Vision

Students should not have to wait until an exam to discover that they misunderstood a foundational concept.

Teachers should not need to manually inspect every student's reasoning to discover the same misconception repeated across an entire classroom.

AI should not simply provide another answer.

It should help learners:

- retrieve the right evidence;
- understand concepts;
- practise;
- make mistakes safely;
- identify misconceptions;
- repair reasoning;
- explain ideas back;
- adapt their learning;
- collaborate with teachers.

That is what ShikshaMesh is built to do.

---

# 🎓 ShikshaMesh

### **AWS-powered agents. Grounded knowledge. Adaptive learning. Better classrooms.**

**Build It:** SAM · LocalStack · Cedar · Docker  
**Ship It:** Bedrock · SageMaker AI · S3 · Cognito · Lambda · Step Functions · Translate · EventBridge · CloudWatch · IVS · IAM · ECR

**External Research:** SerpApi

**GitHub:** https://github.com/shreesriv12/WeMakeDevs
