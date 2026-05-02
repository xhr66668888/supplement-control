# Bio-Nutrient Manager

AI-driven dietary supplement management. Stop taking supplements blindly.

## Overview

Bio-Nutrient Manager helps users make science-based decisions about their dietary supplements. It combines hardcoded medical knowledge (US NIH, Japan MHLW dietary standards; WHO ATC drug classification) with AI at the edges: DeepSeek v4 Pro for symptom-to-condition structuring, and MIMO v2.5 Pro for supplement label OCR.

**Core principle: Rule engine first, AI at the edges only.** Medical decisions are never black-box. Every supplement recommendation is traceable to a specific ATC code, a nutrient standard, or a clinical context rule.

## Features

- **Medical Onboarding** -- Describe your symptoms in English or Chinese. DeepSeek standardizes them into ATC-coded conditions with evidence-backed supplement recommendations.
- **Supplement Label OCR** -- Photograph a supplement nutrition label. MIMO v2.5 Pro extracts all ingredients. Supports Chinese, English, French, German, Italian, and Spanish labels.
- **Smart Scheduling** -- Hardcoded rule engine allocates supplements to four daily time slots (morning empty-stomach, with-meal, after-lunch, before-bed) based on absorption kinetics, nutrient interactions, and clinical context.
- **UL Safety Warnings** -- Total daily intake is compared against Tolerable Upper Intake Levels from US and Japan standards. Exceeding UL triggers a critical alert.
- **Inventory Tracking** -- Track remaining pills, get low-stock alerts at 30 and 7 days. Shared supplement catalog across all users.
- **Hierarchical ATC Taxonomy** -- SMI-inspired parent-node anchoring handles rare diseases and long-tail conditions. Unknown ATC codes inherit supplement mappings from their nearest known ancestors.
- **Cross-Validation** -- Every AI recommendation is cross-checked against hardcoded nutrient standards, interaction rules, and clinical context patterns before reaching the user.
- **Bilingual** -- Full Chinese/English UI with language toggle. Chinese and English symptom input. Chinese supplement label OCR.

## Architecture

```
supplement-control/
├── app.js                    # Express server entry point
├── config/
│   ├── schema.sql            # SQLite DDL (8 tables)
│   └── database.js           # better-sqlite3 initialization
├── controllers/
│   ├── authController.js     # Register, login, onboarding (JWT + bcrypt)
│   ├── ocrController.js      # MIMO OCR import with validation
│   ├── dashboardController.js# Schedule, progress, consumption
│   └── elementsController.js # AI backfill for unknown elements
├── middleware/
│   ├── auth.js               # JWT generation and verification
│   └── errorHandler.js       # 404/500 handlers
├── routes/
│   ├── auth.js               # /api/auth/register, /api/auth/login
│   ├── dashboard.js          # /api/dashboard (GET, POST check/undo/skip)
│   ├── elements.js           # /api/elements (list, lookup)
│   ├── inventory.js          # /api/inventory (list, consume)
│   ├── supplements.js        # /api/supplements/import (OCR)
│   └── users.js              # /api/users (list)
├── seed/
│   ├── guidelines.js         # 160+ nutrient RDA/UL rows (US + JP)
│   ├── interactions.js       # 35 drug-nutrient interaction rules
│   ├── atc_conditions.js     # 35 ATC-coded condition mappings
│   ├── element_names_cn.js   # Chinese display names for all elements
│   ├── atc_names_cn.js       # Chinese display names for ATC conditions
│   └── run.js                # Seed runner
├── utils/
│   ├── aiClient.js           # DeepSeek + MIMO API wrappers
│   ├── apiReliable.js        # Timeout, retry, circuit breaker, cache
│   ├── elementResolver.js    # Multi-language element name resolution
│   ├── fallbackStructurize.js# Offline keyword-based symptom mapping
│   ├── medicalValidator.js   # Cross-validation + clinical contexts
│   ├── schedulerCore.js      # Hardcoded 4-slot scheduling engine
│   ├── taxonomy.js           # Hierarchical ATC tree with hyperbolic distance
│   └── unitConverter.js      # mcg/mg/g/IU normalization
├── public/
│   ├── index.html            # SPA dashboard
│   ├── app.js                # Frontend logic with i18n
│   └── i18n.js               # Chinese/English dictionary
└── fonts/
    └── Smartisan_Compact-*.ttf  # Local typeface (6 weights)
```

## Tech Stack

- **Backend**: Node.js, Express, better-sqlite3
- **AI**: DeepSeek v4 Pro (text/JSON), MIMO v2.5 Pro (vision/OCR)
- **Auth**: JWT + bcrypt
- **Frontend**: Vanilla JS SPA, Smartisan Compact typeface
- **Design**: Coinbase-inspired design system (DESIGN.md)

## Quick Start

```bash
npm install
cp .env.example .env   # Add your API keys
npm run seed           # Initialize database with reference data
npm start              # Start server on :3000
```

Open `http://localhost:3000` in a browser. Register an account, complete your health profile, and import a supplement label photo.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Get JWT token |
| POST | /api/auth/onboard | JWT | Complete health profile |
| GET | /api/auth/me | JWT | Get current user |
| POST | /api/onboard | JWT | Alias for profile completion |
| GET | /api/dashboard | JWT | Schedule + progress + alerts |
| POST | /api/dashboard/check | JWT | Mark dose consumed |
| POST | /api/dashboard/undo | JWT | Undo dose consumption |
| POST | /api/dashboard/skip | JWT | Skip today's dose |
| POST | /api/supplements/import | JWT | OCR import supplement label |
| POST | /api/ocr | JWT | Alias for OCR import |
| GET | /api/inventory | JWT | List user inventory |
| GET | /api/elements | JWT | List known elements |
| POST | /api/elements/lookup | JWT | AI research unknown element |

## Medical Standards

- **US**: NIH Office of Dietary Supplements RDA/UL values
- **Japan**: MHLW (厚生労働省) Dietary Reference Intakes
- **ATC**: WHO Anatomical Therapeutic Chemical Classification System

## License

Proprietary. All rights reserved.
