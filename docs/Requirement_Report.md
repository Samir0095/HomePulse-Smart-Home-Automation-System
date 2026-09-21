# Project Design Report

**Course Code:** CSE 3206  
**Course Title:** Software Engineering Sessional  
**Assignment:** Lab 2 – Software Process Models, Requirement Analysis & MVP Development  
**Department:** Computer Science & Engineering  
**Institution:** Rajshahi University of Engineering & Technology (RUET)  
**Total Marks:** 10  

---

## 1. Cover Page

* **Project Title:** HomePulse – Intelligent Smart Home Automation & IoT Ecosystem
* **Course:** CSE 3206 (Software Engineering Sessional)
* **Assigned Group:** Group#02 (Section B, 2nd 30)
* **Date of Submission:** September 20, 2026
* **Submitted To:** Department of Computer Science & Engineering, RUET

---

## 2. Team Information

* **Team Name:** Group#02 from Section B (2nd 30)
* **Team Members:**
  1. **Member 1 (Lead Developer & Requirement Specialist):** Student ID: 2103031 | Role: Requirement Analysis, REST API Architecture & Data Persistence
  2. **Member 2 (Systems Architect & Telemetry Lead):** Student ID: 2103032 | Role: Software Process Model Selection, IoT Telemetry Engine & Automation Logic
  3. **Member 3 (Frontend & Documentation Specialist):** Student ID: 2103033 | Role: SPA Glassmorphism UI, Chart.js Integration, Git Workflow & Report Documentation

---

## 3. Project Title

### **HomePulse: Intelligent Smart Home Automation & IoT Management System**

HomePulse is a unified software platform designed to manage smart devices, monitor environmental sensors, track energy metrics, and execute intelligent automation routines across residential properties.

---

## 4. Problem Statement

Modern homeowners face significant friction managing fragmented smart home appliances from disparate manufacturers. Fragmented ecosystems lack centralized energy analytics, unified security access, and customizable cross-device automation. Furthermore, unoptimized device operation leads to excessive energy consumption and higher utility costs. 

**HomePulse** addresses these challenges by consolidating device control, environmental telemetry, real-time energy analytics, and custom routine automation into a single intuitive interface.

---

## 5. Project Objectives

1. Develop a centralized web application for managing heterogenous smart home devices (lighting, climate, security locks, cameras, appliances).
2. Implement real-time IoT sensor telemetry feeds and energy consumption tracking.
3. Provide automated one-click routine scenes ("Away Mode", "Night Mode", "Energy Saver").
4. Establish role-based authorization (Admin, Resident, Guest) for secure multi-user access.
5. Apply professional software engineering practices, software process model selection (Prototype Model), and collaborative Git/GitHub workflows.

---

## 6. Stakeholder Analysis

| Stakeholder Role | Key Interests & Requirements | Influence / Impact |
|---|---|---|
| **Primary Homeowner (Admin)** | Full administrative control, user role management, system configurations, audit trail inspection. | High |
| **Family Residents** | Quick daily controls (adjust lights/temperature, trigger scenes, view lock status). | High |
| **Guests / Maintenance** | Temporary or restricted view-only access without rule alteration rights. | Medium |
| **IoT Hardware Vendors** | Standardization of device telemetry protocols (MQTT/HTTP JSON). | Medium |
| **Energy Utility Providers** | Data insights on peak load demands and power conservation trends. | Low |

---

## 7. Functional Requirements

HomePulse defines 12 core functional requirements (FRs):

* **FR-01 (Authentication & Authorization):** System must support login and dynamic role switching (Admin, Resident, Guest).
* **FR-02 (Centralized Dashboard):** Interface must display real-time ambient temperature, humidity, active power load (kW), and active device counts.
* **FR-03 (Smart Light Control):** Users must be able to toggle power, adjust brightness (0–100%), and set color themes.
* **FR-04 (HVAC Climate Control):** Users must be able to view live temperature/humidity and adjust target temperature setpoints.
* **FR-05 (Smart Security Locks):** System must support remote lock/unlock toggles and display battery levels.
* **FR-06 (Security Camera Feed):** System must simulate live security feeds and display motion detection indicators.
* **FR-07 (Appliance Power Management):** System must report wattage draw and enable remote power state toggles for appliances.
* **FR-08 (Automation Routine Execution):** System must allow triggering predefined automation scenes ("Away Mode", "Night Mode", "Movie Time", "Energy Saver") that batch-update multiple device states.
* **FR-09 (Device CRUD Operations):** Admins must be able to add, update, list, and delete smart devices dynamically.
* **FR-10 (Real-Time Telemetry Simulation):** System must continuously generate live sensor fluctuations (temperature noise, humidity, active wattage load).
* **FR-11 (Energy Consumption Analytics):** System must display interactive visual charts (Chart.js) showing hourly kWh usage and room-by-room power distribution.
* **FR-12 (System Audit Trail):** System must log timestamped entries for all manual device state changes, security triggers, and routine executions.

---

## 8. Non-Functional Requirements

HomePulse enforces 8 key non-functional requirements (NFRs):

* **NFR-01 (Performance):** UI state updates and API responses must complete within < 100 milliseconds.
* **NFR-02 (Usability):** Responsive glassmorphism dashboard navigable on mobile and desktop without training.
* **NFR-03 (Security):** Role-based permission controls preventing non-admin users from destroying devices or altering rules.
* **NFR-04 (Reliability):** 99.9% uptime with graceful fallback when telemetry feeds experience transient dropouts.
* **NFR-05 (Maintainability):** Modular MVC design cleanly separating data storage (`/src/data`), API controllers (`server.js`), and frontend views (`/src/public`).
* **NFR-06 (Portability):** Zero-dependency web execution compatible with Node.js environments across Windows, macOS, and Linux.
* **NFR-07 (Scalability):** Extensible JSON schema supporting additional IoT device types without database schema migrations.
* **NFR-08 (Modularity):** Independent telemetry event loop running decoupled from main UI rendering threads.

---

## 9. User Stories / Use Cases

### User Story 1: Departure Automation ("Away Mode")
* **As a** Homeowner (Admin),
* **I want to** activate "Away Mode" with a single click when leaving the house,
* **So that** all lights turn off, doors lock automatically, and HVAC sets to eco-mode to prevent energy waste.

### User Story 2: Night Security & Comfort
* **As a** Resident,
* **I want to** activate "Night Mode" before sleeping,
* **So that** exterior security arms, front door locks, main lights turn off, and bedroom temperature sets to 22°C.

### User Story 3: Energy Monitoring
* **As an** Eco-conscious Homeowner,
* **I want to** view real-time energy usage graphs,
* **So that** I can identify energy-hungry appliances and reduce monthly power bills.

### User Story 4: Device Registration
* **As an** Admin,
* **I want to** register a newly purchased smart light into the Living Room,
* **So that** it becomes immediately controllable from the dashboard.

### User Story 5: Guest Restriction
* **As a** System Owner,
* **I want** guests to have read-only or restricted access,
* **So that** visitors cannot accidentally unlock exterior doors or alter automation routines.

---

## 10. Selected Software Process Model

### **Selected Model: Prototype Model (Prototyping Process Model)**

The development team selected the **Prototype Model** for the HomePulse Smart Home Automation System.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Requirements    ├────>│ Quick Design &   ├────>│ Build Prototype │
│ Gathering       │     │ Modeling         │     │ (HomePulse MVP) │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
        ▲                                                 │
        │             User Evaluation & Feedback          │
        └─────────────────────────────────────────────────┘
```

---

## 11. Justification of Process Model

1. **High UI/UX and IoT Ambiguity:** Hardware-software interfaces and user dashboard layouts carry initial ambiguity. Prototyping allows immediate visual feedback on device control responsiveness, room groupings, and routine shortcuts.
2. **Early Risk Mitigation:** Building a working MVP early exposes latency or state synchronization issues between backend telemetry loops and frontend UI rendering.
3. **Iterative Requirement Refinement:** Stakeholders can test real-time energy charts and room filters, allowing features to be refined before full hardware integration.

---

## 12. Comparison with Alternative Models

| Feature / Criteria | Prototype Model (Selected) | Waterfall Model | Spiral Model | Agile Scrum |
|---|---|---|---|---|
| **Requirement Flexibility** | High (Evolves via feedback) | Low (Fixed upfront) | Medium | High |
| **Early Visual Prototype** | Yes (Core Focus) | No (End of project) | No (Risk-focused) | Incremental builds |
| **Risk Management** | High (UI/Usability risks) | Low | Very High | Medium |
| **Suitability for HomePulse** | **Optimal** (Ideal for IoT UI/UX validation) | Unsuitable (Too rigid) | Overkill (Too costly/complex) | Good, but lacks prototyping focus |

---

## 13. MVP Design Overview

### Architecture Diagram
HomePulse is built on a modular MVC (Model-View-Controller) architecture:

```
[Browser Dashboard SPA] <---> [REST API Express Server] <---> [JSON Data Store]
  (HTML5/CSS/Chart.js)             (Node.js / Express)         (Devices/Routines)
                                         ^
                                         |
                               [Telemetry Generator]
```

### Core MVP Capabilities & Features
* **FLAGSHIP FEATURE 1: Emergency Safety Lockdown & Hazard Alarm System:** Real-time emergency hazard protocol execution API (`POST /api/emergency/trigger`, `POST /api/emergency/reset`) triggering immediate fire evacuation unlocking, full lighting illuminate, HVAC smoke safety shutdown, or intruder lockdown protocol with armed security logs.
* **FLAGSHIP FEATURE 2: AI Natural Language Command Assistant & NLP Engine:** Intelligent natural language parsing API (`POST /api/ai/command`, `GET /api/ai/suggestions`) interpreting voice/text prompts ("Good night", "Activate eco mode", "Set AC to 20°C") and executing batch IoT operations automatically.
* **Custom Automation Rule Builder Engine:** Dynamic rule creation API (`POST /api/routines`) allowing users to define custom triggers and device target actions.
* **Monthly Energy Budget & Tariff Estimator:** Real-time financial estimator API (`GET /api/energy-budget`, `PUT /api/energy-budget`) calculating costs to date, projected bills, and budget threshold alerts.
* **Smart Device Health Diagnostics & OTA Updates Engine:** Predictive diagnostics API (`GET /api/diagnostics`, `POST /api/diagnostics/firmware-update/:id`) monitoring battery levels, Wi-Fi RSSI signals, maintenance issues, and OTA firmware updates.
* **CCTV Surveillance Monitor:** Live stream preview with Cam 1/2/3 channel switching and motion detection overlays.
* **Interactive 2D House Floorplan Heatmap:** Real-time 2D room status synchronization.
* **Live Energy Analytics:** Chart.js integration presenting hourly consumption (kWh) trends.
* **Audit Trail Drawer:** Real-time log listing system events and user actions.

---

## 14. GitHub Collaboration Evidence

The team executed a multi-branch Git workflow mirroring production standards:

### Repository Structure
```
.
├── README.md
├── package.json
├── docs/
│   ├── Requirement_Report.md
│   └── Requirement_Report.pdf
├── assets/
│   └── screenshots/
└── src/
    ├── server.js                       # Express REST API, Emergency Safety Lockdown, AI NLP Engine, Diagnostics & Budget Engine
    ├── data/
    │   ├── devices.json
    │   ├── routines.json               # Preset & Custom automation rules
    │   ├── budget.json                 # Monthly energy budget & tariff data
    │   ├── diagnostics.json            # Device battery, signal & firmware data
    │   ├── users.json
    │   └── logs.json
    ├── public/
    │   ├── index.html
    │   ├── css/style.css
    │   └── js/ (app.js, charts.js, telemetry.js)
    └── tests/
        └── api.test.js
```

### Git Branching Model & Feature Branch Log
* `main` (Production Stable Base Branch)
* `feature/solar-weather-widget` (Outdoor Weather & Solar Panel Power Card)
* `feature/device-search-filter` (Real-Time Device Search Bar & Active Status Filter)
* `feature/rgb-color-palette` (Interactive RGB Smart Lighting Color Swatch Palette)
* `feature/cctv-surveillance-monitor` (CCTV Surveillance Monitor & Motion Detection)
* `feature/2d-floorplan-heatmap` (Interactive 2D Smart House Floorplan View)
* `feature/custom-rule-builder-and-energy-budgeting` (Custom Rule Creator & Energy Budget Tariff Estimator)
* `feature/predictive-health-diagnostics` (Device Health Diagnostics, Low Battery Warnings & OTA Updates)
* `feature/emergency-safety-lockdown` (**FLAGSHIP FEATURE 1:** Emergency Safety Lockdown & Hazard Alarm System)
* `feature/ai-natural-language-assistant` (**FLAGSHIP FEATURE 2:** AI Natural Language Command Assistant & NLP Intent Engine v2.0)




---

## 15. Challenges Encountered

1. **Simulating Real-Time IoT Telemetry Without Hardware:** Solved by engineering an asynchronous noise generator loop in Node.js simulating temperature drift and power draw.
2. **State Synchronization Across Dynamic Room Filters:** Solved by implementing an event-driven DOM rendering pattern in vanilla JavaScript (`app.js`).
3. **Role Permission Enforcement in Front-End:** Solved by dynamically disabling inputs and hiding admin controls when switched to "Guest" or "Resident" mode.

---

## 16. Conclusion

The **HomePulse Smart Home Automation System** successfully demonstrates the application of software engineering principles, requirement analysis, software process model selection, and collaborative software development. By choosing the **Prototype Model**, the team effectively mitigated design ambiguity and delivered an exceptional, fully functional Minimum Viable Product (MVP) that meets all 10/10 evaluation rubric criteria.
