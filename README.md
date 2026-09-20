# 🎓 ShikshaMesh

> **An agentic, multilingual AI learning platform combining grounded course intelligence, adaptive learning, multimodal experiences, and real-time web research powered by SerpApi.**

### 🏆 Hackathon Tracks

**Primary Track:** `Ship It — Agents and AI`
**SerpApi Hackathon:** AI-powered governed research & learning-resource discovery

---

## 🌟 What is ShikshaMesh?

**ShikshaMesh** is an AI-powered education platform designed to go beyond the traditional "chat with your PDF" experience.

Instead of sending every request to a single LLM, ShikshaMesh uses a **policy-aware multi-agent architecture** where specialized agents collaborate across:

* 📚 Course-grounded tutoring
* 🔎 Real-time research powered by **SerpApi**
* 🧠 Adaptive assessments
* 🔬 Misconception detection with **Concept X-Ray**
* 🎤 AI-powered interviews
* 📝 Smart learning tools
* 🎨 Diagrams and collaborative Canvas
* 👨‍🏫 Teacher analytics and interventions
* 🌐 Live classrooms
* 📶 Offline-first learning

The system decides **which agent should handle a request, what data that agent is allowed to access, whether external research is necessary, and how the final answer should be grounded and cited.**

---

# 💡 The Problem

Modern AI tutors are powerful, but most educational assistants still suffer from several problems:

### 1. Generic answers

General-purpose LLMs may answer using broad model knowledge instead of the student's actual course material.

### 2. Outdated knowledge

Course retrieval alone cannot answer questions involving:

* latest education guidelines;
* current events;
* recent research;
* new technologies;
* updated policies;
* external learning resources.

### 3. Unsafe web research

Giving an AI unrestricted search access can expose private context or mix untrusted web information with official course material.

### 4. No understanding of *why* a student is wrong

Most platforms evaluate the final answer.

They do not identify the **first incorrect assumption in the student's reasoning**.

### 5. One AI model doing everything

Tutoring, research, assessment generation, teacher workflows, and learner analysis require different tools and permissions.

ShikshaMesh approaches this as an **agent orchestration problem**.

---

# 🚀 Our Solution

ShikshaMesh combines:

```text
Identity
    +
Deterministic Policy
    +
Agent Orchestration
    +
Private Course Retrieval
    +
SerpApi Live Research
    +
Learner Mastery
    +
AWS AI Services
    +
Observable Workflows
    =
Trustworthy AI Learning
```

A typical request flows through:

```text
Student Request
      │
      ▼
Authentication
      │
      ▼
Tenant / Class Scope
      │
      ▼
Deterministic RBAC + ABAC Policy
      │
      ▼
Intent Router
      │
      ▼
LangGraph Agent Orchestration
      │
      ├──────── Tutor Agent
      │
      ├──────── Adaptive Assessment Agent
      │
      ├──────── Teacher / Quiz Agent
      │
      └──────── Research Agent
                       │
                       ▼
                 SerpApi Gateway
                       │
                       ▼
             Trusted Web Evidence
      │
      ▼
Grounded Answer + Citations
```

---

# 🤖 Ship It — Agents and AI

ShikshaMesh is designed around **specialized AI agents rather than a single chatbot**.

The current architecture supports agent-oriented workflows for:

### 📚 Tutor Agent

Answers learner questions using authorized course material.

The tutor prioritizes institution-provided evidence rather than arbitrary web content.

When configured for AWS, the flow becomes:

```text
Student Question
      ↓
Authorization
      ↓
Course Retrieval
      ↓
Amazon Bedrock Knowledge Bases
      ↓
Relevant Course Chunks
      ↓
Amazon Bedrock
      ↓
Grounded Tutor Response
```

---

### 🔎 Research Agent

Handles questions requiring information beyond the learner's private course material.

Instead of allowing unrestricted web access:

```text
Research Intent
      ↓
Authorization
      ↓
PII-safe Query
      ↓
Approved Domain Policy
      ↓
SerpApi
      ↓
Normalized Results
      ↓
Cited External Evidence
```

This makes external research **explicit, controlled and auditable**.

---

### 🧠 Adaptive Assessment Agent

Uses learner mastery information to select appropriate questions.

The assessment system is designed so that:

* difficulty can adapt to learner state;
* learner progress can influence question selection;
* answer keys are not exposed in quiz-generation client payloads;
* mastery events can feed future learning models.

---

### 👨‍🏫 Teacher / Quiz Agent

Teacher workflows support multi-step quiz and learning operations.

AWS orchestration is designed around:

```text
Teacher Request
      ↓
Policy Check
      ↓
Step Functions
      ↓
Lambda Workers
      ↓
Quiz Generation
      ↓
Translation / Scheduling / Analytics
```

The application already contains a Step Functions integration path with local development fallback behavior.

---

# 🔥 SerpApi — Live Intelligence Layer

SerpApi is a **first-class component of ShikshaMesh's Research Agent**.

We deliberately avoid treating search as:

```text
LLM → unrestricted Google search
```

Instead:

```text
Agent
  ↓
Research intent detected
  ↓
Authorization
  ↓
Sensitive context removed
  ↓
Domain policy applied
  ↓
SerpApi
  ↓
Results normalized
  ↓
Sources preserved
  ↓
Answer with citations
```

This gives ShikshaMesh a controlled bridge between:

```text
PRIVATE KNOWLEDGE
Course Notes
Institution Content
Learner Context

        +

LIVE KNOWLEDGE
Current Web Information
Official Education Sources
Learning Resources
```

---

# 🔍 How ShikshaMesh Uses SerpApi

## 1. Governed Web Research

The server-side Search Gateway uses SerpApi only when the application detects an **external research intent**.

For example:

> "What are the latest UGC guidelines related to this topic?"

The application can route this through:

```text
Question
   ↓
Intent Router
   ↓
Research Agent
   ↓
Policy Gateway
   ↓
SerpApi
   ↓
Approved Sources
   ↓
Cited Response
```

---

## 2. Official Source Allowlisting

External search can be restricted using:

```env
SERPAPI_ALLOWED_DOMAINS=ncert.nic.in,ugc.gov.in
```

This means the Research Agent can be configured to prefer or restrict itself to trusted education sources.

An empty allowlist disables the governed external-research flow.

---

## 3. PII-Aware Search

Student context should not automatically become a web search query.

The Research Gateway therefore creates a boundary between:

```text
PRIVATE STUDENT CONTEXT
        ✕
PUBLIC SEARCH QUERY
```

SerpApi calls happen **server-side**, and the API key is never intended to be exposed to the browser.

---

## 4. Normalized Citations

Search results are normalized into a predictable structure containing information such as:

```text
Title
URL
Snippet
Provider
```

The application can therefore distinguish:

```text
📘 Course Evidence

from

🌐 External SerpApi Evidence
```

instead of silently mixing both knowledge sources.

---

# 🎥 SerpApi-Powered Learning Resource Discovery

SerpApi is also used for discovering educational video playlists.

For a learner studying a topic, ShikshaMesh can search for:

```text
<topic> tutorial site:youtube.com/playlist
```

The system:

```text
Learning Topic
      ↓
SerpApi Google Search
      ↓
YouTube Playlist Results
      ↓
Playlist ID Validation
      ↓
Deduplication
      ↓
Learning Resource UI
```

Privacy-enhanced YouTube embeds can then be shown to the learner.

This turns SerpApi into more than a research backend.

It becomes a **learning-resource discovery engine**.

---

# 🧪 Verify the SerpApi Integration

From the application directory:

```bash
cd firstcommit
npm run verify:serpapi
```

The verification script performs a governed search and checks that allowed official sources are returned.

---

# 🧠 Concept X-Ray

One of ShikshaMesh's core learning experiences is **Concept X-Ray**.

Most education platforms ask:

> Did the student get the answer right?

Concept X-Ray asks:

> **Where did the student's reasoning first break?**

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
Recovery Bridge
       ↓
Explain It Back
```

Instead of merely giving the correct answer, the system attempts to identify the learner's first incorrect assumption and help repair it.

---

# 🗣️ Explain It Back

After receiving a correction, learners should demonstrate understanding.

The broader ShikshaMesh experience supports multimodal learning workflows involving:

* text;
* voice;
* code;
* diagrams;
* canvas-based interaction.

This creates a loop:

```text
Mistake
   ↓
Diagnosis
   ↓
Explanation
   ↓
Recovery
   ↓
Explain It Back
   ↓
Mastery Signal
```

---

# ✨ Core Capabilities

| Capability                 | Description                                             |
| -------------------------- | ------------------------------------------------------- |
| 🤖 Agent Orchestration     | LangGraph-based routing across specialized AI workflows |
| 📚 Grounded Tutor          | Answers based on authorized course evidence             |
| 🔎 Research Agent          | SerpApi-powered governed external research              |
| 🎥 Resource Discovery      | SerpApi-powered educational playlist discovery          |
| 🧠 Adaptive Assessment     | Mastery-aware assessment workflows                      |
| 🔬 Concept X-Ray           | Detects likely reasoning misconceptions                 |
| 🗣️ Explain It Back        | Learner recovery and understanding validation           |
| 🎤 AI Interviews           | Course-oriented interview sessions and reports          |
| 👨‍🏫 Teacher Intelligence | Misconceptions, interventions and analytics             |
| 🎨 Diagram Studio          | Visual educational diagrams                             |
| 🖌️ Collaborative Canvas   | Shared learning workspace                               |
| 🌐 Live Classroom          | Realtime classroom collaboration                        |
| 📶 Offline Learning        | PWA + IndexedDB request queue                           |
| 🔐 Policy Engine           | Deterministic RBAC/ABAC authorization                   |
| 🧩 MCP                     | Agent-facing policy-bound tools                         |
| ☁️ AWS Integration         | Bedrock, SageMaker, Cognito, S3 and workflows           |

---

# 🏗️ System Architecture

```text
┌──────────────────────────────────────────────┐
│               ShikshaMesh UI                │
│                                              │
│ Student • Teacher • Admin • Canvas • Live   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│            Next.js Application API           │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│        Authentication + Policy Layer         │
│                                              │
│ Cognito • RBAC • ABAC • Tenant/Class Scope  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│             Intent / Agent Router            │
│                                              │
│       Local Router / SageMaker Adapter       │
└──────────────┬──────────────────┬────────────┘
               │                  │
               ▼                  ▼
┌──────────────────────┐   ┌──────────────────────┐
│ Private Knowledge    │   │ External Knowledge   │
│                      │   │                      │
│ Course Repository    │   │ Research Agent       │
│ Bedrock KB           │   │ SerpApi Gateway      │
│ Qdrant               │   │ Approved Sources     │
└──────────┬───────────┘   └──────────┬───────────┘
           │                          │
           └────────────┬─────────────┘
                        ▼
┌──────────────────────────────────────────────┐
│                AI Agent Layer                │
│                                              │
│ Tutor • Research • Assessment • Teacher     │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│       Data / Workflows / Observability       │
│                                              │
│ PostgreSQL • S3 • Step Functions            │
│ EventBridge • CloudWatch • SNS/SQS          │
└──────────────────────────────────────────────┘
```

---

# ☁️ AWS Deployment Architecture

ShikshaMesh is being designed for an AWS-native production deployment while keeping local development inexpensive and straightforward.

## 🤖 Agents and AI

### Amazon Bedrock

Planned/adapter-backed uses include:

* tutor generation;
* grounded explanations;
* agent reasoning;
* educational content generation;
* Knowledge Base retrieval.

### Amazon SageMaker

The SageMaker path is intended for specialized ML workloads such as:

* multilingual intent classification;
* learner modeling;
* custom education models;
* mastery prediction.

A SageMaker runtime adapter already exists so the deterministic local intent router can be replaced by a hosted model.

---

# ⚡ Serverless

## AWS Lambda

Planned for asynchronous worker tasks including:

* quiz generation;
* content processing;
* translation;
* background learning jobs;
* notification processing.

## AWS Step Functions

Used/planned for multi-stage workflows such as:

```text
Generate Quiz
    ↓
Validate
    ↓
Translate
    ↓
Store
    ↓
Schedule
    ↓
Analytics
```

The project already includes an application integration path and Terraform placeholder workflow.

## Amazon EventBridge

Used for privacy-aware application and audit events.

---

# 💾 Data and Search

## Amazon S3

Used/planned for:

* course uploads;
* institutional documents;
* ingestion sources;
* learning artifacts.

The repository already contains an AWS-ready S3 course-upload adapter.

## Amazon RDS / PostgreSQL

PostgreSQL is currently used locally.

Production deployment is planned around **Amazon RDS for PostgreSQL**.

Structured data can include:

* learners;
* courses;
* assessments;
* mastery events;
* classroom state;
* teacher analytics.

## Amazon Bedrock Knowledge Bases

The AWS-native RAG architecture is:

```text
Teacher / Institution Upload
            ↓
           S3
            ↓
   Bedrock Knowledge Base
            ↓
Metadata-Scoped Retrieval
            ↓
        Bedrock
            ↓
Grounded Educational Response
```

Retrieval can be constrained by institution/class metadata.

## Qdrant

Qdrant is currently an **external vector-search option** for development and experimentation.

The long-term AWS-native retrieval path focuses on **Bedrock Knowledge Bases**.

---

# 🔐 Authentication and Policy

## Amazon Cognito

Cognito is used/planned as the production identity layer.

The application contains Cognito access-token verification.

Trusted claims can provide:

```text
User
Role
Institution
Tenant
Class
```

Those claims feed deterministic authorization.

The important architectural rule is:

> **The LLM does not decide whether the user is authorized.**

Authorization happens before agent/tool execution.

---

# 🐳 Containers and Runtime

## Docker

The application can run locally as a container:

```bash
docker build -t shikshamesh .
```

```bash
docker run --rm -p 3000:3000 --env-file .env.local shikshamesh
```

## Amazon ECS / AWS App Runner

Production container hosting is planned using:

* **Amazon ECS**, or
* **AWS App Runner**

for the Next.js application and supporting containerized services.

The realtime Socket.IO classroom service can be deployed independently.

---

# 🔧 Platform Plumbing

The production architecture plans to use:

### Amazon CloudWatch

For:

* application logs;
* metrics;
* agent execution visibility;
* alarms;
* operational debugging.

### AWS Budgets

For:

* hackathon cost controls;
* Bedrock spend monitoring;
* SageMaker spend monitoring;
* infrastructure budget alerts.

### Amazon SNS

For:

* notifications;
* workflow events;
* teacher alerts.

### Amazon SQS

For:

* asynchronous jobs;
* retry queues;
* document processing;
* decoupled agent workflows.

---

# ☁️ AWS Architecture Summary

```text
                         ┌─────────────────┐
                         │ Amazon Cognito  │
                         └────────┬────────┘
                                  │
                                  ▼
┌──────────────┐        ┌────────────────────┐
│ Student /    │───────▶│ Next.js App        │
│ Teacher      │        │ ECS / App Runner   │
└──────────────┘        └─────────┬──────────┘
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                     ▼                         ▼
              ┌─────────────┐          ┌──────────────┐
              │ LangGraph   │          │ Policy Layer │
              │ Agents      │          │ RBAC / ABAC  │
              └──────┬──────┘          └──────────────┘
                     │
       ┌─────────────┼──────────────────────┐
       │             │                      │
       ▼             ▼                      ▼
┌────────────┐ ┌─────────────┐      ┌──────────────┐
│ Bedrock    │ │ SageMaker   │      │ SerpApi      │
│ + KB       │ │ ML Models   │      │ Live Search  │
└─────┬──────┘ └─────────────┘      └──────────────┘
      │
      ▼
┌────────────┐
│ S3 Course  │
│ Documents  │
└────────────┘

      ┌─────────────────────────────────────┐
      │         Workflow Layer              │
      │                                     │
      │ Lambda • Step Functions             │
      │ EventBridge • SNS • SQS             │
      └─────────────────────────────────────┘

      ┌─────────────────────────────────────┐
      │             Data                    │
      │                                     │
      │ RDS/PostgreSQL • Bedrock KB         │
      │ Qdrant (external/current option)    │
      └─────────────────────────────────────┘

      ┌─────────────────────────────────────┐
      │          Observability              │
      │                                     │
      │ CloudWatch • AWS Budgets            │
      └─────────────────────────────────────┘
```

---

# 📊 Deployment Status

We intentionally distinguish between **implemented integrations** and **planned production infrastructure**.

| Component                      | Status        |
| ------------------------------ | ------------- |
| Next.js application            | ✅ Implemented |
| Docker image                   | ✅ Implemented |
| `/api/health` endpoint         | ✅ Implemented |
| PostgreSQL local environment   | ✅ Implemented |
| SerpApi Research Gateway       | ✅ Implemented |
| SerpApi YouTube discovery      | ✅ Implemented |
| LangGraph agent routing        | ✅ Implemented |
| MCP research/course tools      | ✅ Implemented |
| Cognito integration            | ✅ Implemented |
| S3 adapter                     | ✅ Implemented |
| Bedrock tutor adapter          | ✅ Implemented |
| Bedrock Knowledge Base adapter | ✅ Implemented |
| SageMaker runtime adapter      | ✅ Implemented |
| Step Functions integration     | ✅ Implemented |
| EventBridge audit integration  | ✅ Implemented |
| Terraform AWS foundation       | ✅ Implemented |
| Public AWS deployment          | 🛠️ Planned   |
| ECS / App Runner runtime       | 🛠️ Planned   |
| Production RDS                 | 🛠️ Planned   |
| Lambda worker fleet            | 🛠️ Planned   |
| SNS/SQS async architecture     | 🛠️ Planned   |
| Production Bedrock KB          | 🛠️ Planned   |
| Production SageMaker endpoints | 🛠️ Planned   |
| CloudWatch dashboards/alarms   | 🛠️ Planned   |
| AWS budget guardrails          | 🛠️ Planned   |

---

# 🛠️ Tech Stack

### Frontend

* Next.js 15
* React 19
* TypeScript
* Tailwind CSS
* shadcn
* Mermaid
* React Konva
* Monaco Editor

### Agentic AI

* LangGraph
* Model Context Protocol
* Amazon Bedrock
* Amazon Bedrock Knowledge Bases
* Amazon SageMaker

### Search

* **SerpApi**
* Qdrant
* Bedrock Knowledge Bases

### Backend

* Next.js API routes
* PostgreSQL
* Socket.IO
* Zod

### AWS

* Amazon Bedrock
* Amazon SageMaker
* Amazon S3
* Amazon Cognito
* AWS Lambda — planned production worker layer
* AWS Step Functions
* Amazon EventBridge
* Amazon RDS/PostgreSQL — planned production database
* Amazon ECS / App Runner — planned runtime
* Amazon CloudWatch — planned production observability
* Amazon SNS/SQS — planned async plumbing
* AWS Budgets — planned cost controls
* Amazon IVS

### DevOps

* Docker
* Docker Compose
* GitHub Actions
* Terraform

---

# 📁 Repository Structure

The primary application currently lives inside `firstcommit/`.

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
    │   ├── authentication
    │   ├── policy
    │   ├── retrieval
    │   ├── SerpApi
    │   ├── research gateway
    │   └── AWS adapters
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
    ├── Dockerfile
    ├── compose.yaml
    └── package.json
```

---

# 🚀 Running Locally

## Prerequisites

Install:

* Node.js
* npm
* Docker
* Docker Compose

Optional:

* SerpApi API key
* AWS account/credentials for testing configured AWS integrations

---

## 1. Clone

```bash
git clone https://github.com/shreesriv12/WeMakeDevs.git
```

```bash
cd WeMakeDevs/firstcommit
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment

Copy:

```text
.env.example
```

to:

```text
.env.local
```

Windows:

```powershell
copy .env.example .env.local
```

Linux/macOS:

```bash
cp .env.example .env.local
```

---

# 🔑 Configure SerpApi

Add:

```env
SERPAPI_API_KEY=your_serpapi_key
SERPAPI_ALLOWED_DOMAINS=ncert.nic.in,ugc.gov.in
```

The SerpApi key is **server-only**.

Do not expose it using a `NEXT_PUBLIC_` environment variable.

---

# 🐘 Start PostgreSQL

```bash
docker compose up -d db
```

The local database uses port:

```text
5433
```

by default.

---

# ▶️ Start ShikshaMesh

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🌐 Realtime Classroom

Start the realtime Socket.IO service:

```bash
npm run realtime
```

This supports realtime classroom capabilities including shared state and collaborative experiences.

---

# 🧪 Testing

Run tests:

```bash
npm test
```

Production build:

```bash
npm run build
```

Evaluate intents:

```bash
npm run eval:intents
```

Verify SerpApi:

```bash
npm run verify:serpapi
```

---

# 🔐 Security Philosophy

ShikshaMesh follows a simple principle:

> **Models generate. Policies authorize.**

The AI model is never treated as the security boundary.

Important controls include:

* deterministic RBAC/ABAC;
* server-side authentication;
* tenant isolation;
* class-scoped retrieval;
* server-only SerpApi;
* controlled external research;
* PII-aware search;
* course-evidence separation;
* reauthorization of privileged offline actions;
* privacy-aware audit events.

---

# 📶 Offline-First Learning

ShikshaMesh contains an offline-first foundation using:

* PWA manifest;
* service worker;
* IndexedDB;
* request queue;
* connectivity-aware replay.

```text
Student Action
      ↓
Internet available?
   ↙       ↘
 Yes       No
  ↓         ↓
Server    IndexedDB Queue
             ↓
       Connectivity Returns
             ↓
          Replay
             ↓
     Server Authorization
```

Privileged operations remain server-authorized even after offline replay.

---

# 🧠 ML & Deep Learning

ShikshaMesh also contains an ML experimentation path.

## Multilingual Intent Classification

The intent pipeline includes tooling for:

* dataset preparation;
* synthetic augmentation;
* training;
* evaluation;
* error analysis;
* human review;
* deployment gating.

The production direction is:

```text
User Request
      ↓
SageMaker Intent Model
      ↓
Intent Labels
      ↓
LangGraph
      ↓
Specialized Agent
```

---

## Deep Knowledge Tracing

A GRU-based Deep Knowledge Tracing baseline is included for learner-mastery experimentation.

The goal is to estimate learner understanding over time using pseudonymous learning events.

This can eventually influence:

```text
Question Difficulty
Recommended Topics
Revision Timing
Interventions
Assessment Selection
```

Training is intentionally separate from the standard web application build to avoid unexpected compute costs.

---

# 🔄 CI/CD

GitHub Actions handles application validation such as:

```text
Push / Pull Request
        ↓
Type Checking
        ↓
Tests
        ↓
Intent Evaluation
        ↓
Production Build
```

AWS credentials are intentionally not required by the standard CI pipeline.

Infrastructure deployment remains an explicit action.

---

# 🏗️ Infrastructure as Code

The AWS Terraform foundation is located at:

```text
firstcommit/infra/
```

The current foundation includes resources/pathways for:

* encrypted/versioned S3 course storage;
* EventBridge audit bus;
* Cognito user pool;
* Cognito web client;
* Step Functions quiz workflow foundation.

Typical workflow:

```bash
cd firstcommit/infra
```

```bash
cp terraform.tfvars.example terraform.tfvars
```

```bash
terraform init
terraform plan
terraform apply
```

> ⚠️ Always inspect `terraform plan` before creating cloud resources.

Production infrastructure should also consider:

* IAM least privilege;
* KMS;
* data residency;
* log retention;
* Secrets Manager;
* CloudWatch alarms;
* AWS Budgets;
* backup policies;
* deletion policies.

---

# 🎬 Hackathon Demo Flow

A strong demo for both **Agents & AI** and **SerpApi** judges is:

### Step 1 — Grounded Learning

Sign in as a student and ask a question about uploaded course material.

Show:

```text
Question
→ Tutor Agent
→ Course Retrieval
→ Grounded Answer
```

---

### Step 2 — Live Research

Ask something requiring fresh external information.

For example:

> "Find the latest official guidance related to this topic."

Show:

```text
Question
→ Intent Router
→ Research Agent
→ Policy Gateway
→ SerpApi
→ Official Sources
→ Citations
```

Highlight that the application clearly distinguishes **external research** from **course evidence**.

---

### Step 3 — SerpApi Resource Discovery

Search for learning resources related to the current topic.

Show SerpApi discovering relevant YouTube playlists.

This demonstrates that SerpApi is used for both:

```text
Research Intelligence
        +
Learning Resource Discovery
```

---

### Step 4 — Concept X-Ray

Give the system an intentionally incorrect explanation.

Show:

```text
Student Reasoning
→ Concept X-Ray
→ Misconception
→ Correction Bridge
→ Explain It Back
```

---

### Step 5 — Adaptive Learning

Open the quiz experience and demonstrate mastery-aware assessment behavior.

---

### Step 6 — Teacher Intelligence

Switch to the teacher experience.

Show:

* misconception signals;
* interventions;
* analytics;
* learning workflows.

---

### Step 7 — Collaborative Learning

Demonstrate:

* Canvas;
* diagrams;
* live classroom;
* realtime collaboration.

---

### Step 8 — AWS Architecture

Finish with the deployment architecture.

Explain:

```text
Agents
→ Bedrock

Custom ML
→ SageMaker

Documents
→ S3

RAG
→ Bedrock Knowledge Bases

Identity
→ Cognito

Workflows
→ Step Functions + Lambda

Events
→ EventBridge

Database
→ RDS/PostgreSQL

Containers
→ ECS / App Runner

Async
→ SNS/SQS

Monitoring
→ CloudWatch

Cost Controls
→ AWS Budgets
```

---

# 🏆 Why ShikshaMesh for Agents & AI?

ShikshaMesh demonstrates an agent architecture where different tasks are handled by different specialized systems.

```text
              ShikshaMesh
                   │
        ┌──────────┼───────────┐
        │          │           │
      Tutor     Research    Assessment
      Agent       Agent        Agent
        │          │           │
        │       SerpApi        │
        │          │           │
        └──────────┼───────────┘
                   │
               Policy Layer
                   │
            Trusted Data/Tools
```

The key idea is:

> **Agents can be powerful without being unrestricted.**

---

# 🏆 Why ShikshaMesh for the SerpApi Hackathon?

SerpApi is not included merely to display search results.

It acts as the **live intelligence layer for the Research Agent**.

The integration demonstrates:

* intent-aware search;
* agent-driven research;
* server-side API usage;
* official-domain controls;
* privacy boundaries;
* normalized evidence;
* citations;
* learning-resource discovery;
* separation between private and public knowledge.

```text
Private Course Intelligence
            +
SerpApi Live Intelligence
            +
Policy-Aware Agents
            =
Grounded, Current Learning
```

---

# 🗺️ Roadmap

## Current

* ✅ Next.js learning platform
* ✅ LangGraph agent routing
* ✅ SerpApi Research Gateway
* ✅ SerpApi playlist discovery
* ✅ RBAC/ABAC authorization
* ✅ PostgreSQL development environment
* ✅ Cognito integration
* ✅ S3 adapter
* ✅ Bedrock adapter
* ✅ Bedrock Knowledge Base adapter
* ✅ SageMaker runtime adapter
* ✅ Step Functions integration
* ✅ EventBridge integration
* ✅ Concept X-Ray
* ✅ Adaptive assessments
* ✅ AI interviews
* ✅ Collaborative Canvas
* ✅ Realtime classroom foundation
* ✅ Offline-first foundation
* ✅ Docker
* ✅ Terraform foundation
* 🔜 Deploy application to ECS / App Runner
* 🔜 Deploy production RDS PostgreSQL
* 🔜 Provision production Bedrock Knowledge Base
* 🔜 Deploy SageMaker intent model
* 🔜 Add Lambda workers
* 🔜 Add SQS asynchronous jobs
* 🔜 Add SNS notifications
* 🔜 Expand CloudWatch monitoring
* 🔜 Configure AWS Budgets
* 🔜 Expand Research Agent capabilities
* 🔜 Improve SerpApi source ranking and research synthesis

---

# 📚 Project Documentation

More detailed documentation is available inside `firstcommit/`:

```text
HACKATHON_SUBMISSION.md
HACKATHON_DEMO_RUNBOOK.md
HACKATHON_DELIVERY_PLAN.md
PRODUCT_ROADMAP.md
ML_DL_IMPLEMENTATION_PLAN.md
infra/README.md
mcp/README.md
realtime/DEPLOYMENT.md
```

---

# ⚠️ Deployment Status

The repository contains AWS-ready application adapters, Docker packaging, Cognito integration, workflow integrations, and Terraform infrastructure foundations.

A full public production environment still requires deployment into an AWS account and configuration of:

* IAM roles;
* runtime secrets;
* networking;
* RDS;
* Bedrock resources;
* SageMaker endpoints;
* container hosting;
* monitoring;
* cost controls.

No AWS resources are automatically created during normal local development.

---

# 🌍 Vision

We believe the future of AI education is not:

```text
Student → Chatbot → Answer
```

It is:

```text
                  Student
                     │
                     ▼
               AI Orchestrator
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
 Course Knowledge  Live Research  Learner State
       │             │             │
       ▼             ▼             ▼
   Bedrock KB      SerpApi       Mastery Model
       │             │             │
       └─────────────┼─────────────┘
                     │
                     ▼
              Specialized Agents
                     │
                     ▼
          Personalized Learning
```

AI should not simply generate answers.

It should **understand the learning context, retrieve the right evidence, research when necessary, detect misconceptions, adapt to the learner, and help teachers understand where intervention matters.**

---

# 🎓 ShikshaMesh

### **Private knowledge. Live intelligence. Specialized agents. Better learning.**

**Primary Hackathon Category:** `Ship It — Agents and AI`

**SerpApi:** powering governed real-time research and learning-resource discovery.

**AWS:** powering the planned production architecture for agents, ML, retrieval, identity, workflows, storage, compute, and observability.
