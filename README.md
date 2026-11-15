# Fox Disaster watch&#x20;

**An intelligent disaster awareness and preparedness platform powered by geospatial insights and Earth observation data.**

\


## Overview

Fox Disaster watch is a disaster awareness and preparedness application developed for the **NASA Space Apps Challenge**. It aims to help people understand environmental hazards, explore disaster-prone regions, access relevant Earth observation data, and prepare for potential emergencies.

The platform focuses on proactive disaster management by bringing geographical information, environmental observations, risk awareness, safety resources, and incident reporting into a unified interface.

Rather than focusing only on disaster response, Fox Disaster watch emphasizes **early awareness, prevention, and informed decision-making** to help communities prepare before a disaster occurs.

## Problem Statement

Natural disasters such as floods, wildfires, cyclones, earthquakes, and extreme weather events can threaten lives, infrastructure, and the environment. However, disaster-related information is often spread across different platforms, making it difficult for people to understand local risks and identify appropriate safety measures.

Key challenges include:

- Limited access to understandable, location-specific hazard information.
- Difficulty interpreting environmental and satellite observations.
- Delayed awareness of potential hazards and changing conditions.
- Limited access to nearby safe zones and preparedness information.
- Challenges in reporting incidents and sharing emergency information.
- Lack of accessible, consolidated disaster reports for further analysis.

Fox Disaster watch aims to address these challenges through an accessible, map-oriented disaster awareness platform.

## Objectives

- Improve awareness of natural hazards using reliable environmental data.
- Support location-based exploration of disaster risks.
- Present hazard information with timestamps and source references wherever available.
- Encourage preventive action through practical safety guidance.
- Provide access to safe-zone information and emergency resources.
- Support community reporting and incident verification.
- Make disaster information easier to understand through visualizations and downloadable reports.

## Key Features

### 1. Disaster Risk Dashboard

A centralized interface for exploring disaster-related information, environmental indicators, and hazard assessments.

- Overview of relevant hazards and regional conditions.
- Severity indicators for communicating risk levels.
- Location-based exploration of disaster information.
- Clear presentation of available observations and their timestamps.

### 2. Interactive Disaster Maps

Explore geographical regions and view available disaster-related information on an interactive map.

- Search for specific locations and regions.
- Explore relevant hazard information for selected areas.
- View available geographical overlays and incident reports.
- Access safe-zone information where available.
- Support location-based safety awareness and planning.

### 3. NASA and Earth Observation Data

The project is designed to incorporate relevant NASA datasets and other authoritative sources to support environmental monitoring and disaster awareness.

Potential integrations include:

- **NASA FIRMS:** Satellite-based active fire information.
- **NASA Earth observation datasets:** Environmental and land-surface observations relevant to selected hazards.
- **NASA POWER:** Meteorological and solar-related data for suitable environmental analyses.
- **USGS Earthquake Catalog:** Earthquake event information.
- **Weather data services:** Forecasts and current conditions, depending on the configured provider.

Data availability, geographic coverage, update frequency, and suitability depend on the source and its API. Each displayed assessment should identify its source and observation time wherever possible.

### 4. Hazard Assessment and Trend Analysis

Support the interpretation of environmental conditions and historical observations.

- Explore hazard information for selected locations.
- Compare historical and recent observations where datasets permit.
- Present trends through charts and geographical visualizations.
- Communicate the severity and potential relevance of available indicators.
- Distinguish observed events, forecasts, and model-based estimates.

Predictions and risk estimates must be supported by appropriate data and validated methods. They should not be interpreted as guaranteed disaster forecasts.

### 5. Prevention and Preparedness

Help users understand how to prepare for different types of disasters.

- Hazard-specific preparedness guidance.
- Preventive actions based on the selected hazard.
- Weather-related information where the required API is configured.
- Information about nearby safe areas where available.
- Guidance for responding to changing risk conditions.

### 6. Alert Classification

The planned alert framework uses three levels to communicate urgency:

| Level  | Colour | Purpose                                           |
| ------ | ------ | ------------------------------------------------- |
| Low    | Green  | General awareness and preventive information      |
| Medium | Yellow | Increased attention and preparedness              |
| High   | Red    | Urgent warnings and recommended protective action |

Alert timing and delivery should be based on verified source information and the capabilities of the integrated warning services. Colour classifications alone do not establish the probability or timing of a disaster.

### 7. B Fox AI Assistant

B Fox is the proposed AI-powered assistant for making the application easier to use through text and voice interaction.

Planned capabilities include:

- Answering questions about available disaster information.
- Helping users navigate application sections.
- Explaining graphs, indicators, and reports.
- Assisting with location searches and safety guidance.
- Supporting emergency workflows and SOS activation.

Voice recognition, spoken responses, application control, and emergency-message delivery depend on the corresponding integrations and permissions being implemented.

### 8. SOS and Emergency Contacts

The emergency assistance module is intended to help users share their location with trusted contacts when they need help.

Planned functionality includes:

- Manual SOS activation.
- Emergency contact management.
- Location sharing with user permission.
- Voice-assisted SOS activation through B Fox.
- Emergency message delivery through a configured communication service.
- Delivery-status feedback and manual fallback options.

An SOS message should only be reported as delivered when the connected service confirms its delivery status. Users should not rely exclusively on the application for emergency assistance.

### 9. Historical Reports and PDF Downloads

Generate structured disaster reports for review, reference, and offline access.

Reports can be designed to include:

- Disaster type and affected geographical region.
- Relevant observations, dates, and timestamps.
- Maps, graphs, and statistical summaries.
- Hazard severity and historical trends where supported.
- Data-source links and NASA references where applicable.
- Limitations, data gaps, and interpretation notes.

PDF generation and saved-report access depend on the implementation available in the application. Reports must distinguish verified historical events from forecasts and model estimates.

### 10. Accessibility and User Settings

The planned settings module is intended to improve accessibility and usability through:

- Language selection, including Hindi and Marathi.
- Font-size and accessibility preferences.
- Light and dark themes.
- Notification preferences.
- Emergency contact management.
- Account and privacy settings.
- Saved locations and offline resources where supported.

## Technology Stack

The application is being developed as a web-based project using Lovable. The exact technologies and integrations should be confirmed against the current repository configuration.

| Component                  | Technology or Service                  |
| -------------------------- | -------------------------------------- |
| Application development    | Lovable                                |
| Source control             | Git and GitHub                         |
| Earth observation          | NASA APIs and datasets, as configured  |
| Fire monitoring            | NASA FIRMS, if integrated              |
| Seismic information        | USGS Earthquake Catalog, if integrated |
| Weather information        | Configured weather API                 |
| Mapping                    | Configured mapping provider            |
| Backend and authentication | Configured backend services            |
| AI assistant               | Configured AI and voice services       |

**Note:** The table describes the project's intended integrations, not a guarantee that every service is currently implemented. Check the source code and environment configuration before relying on any particular integration.

## Data Sources and References

The following official resources can support the development and validation of the platform:

- [NASA Open APIs](https://api.nasa.gov/) — NASA API documentation and available datasets.
- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) — Satellite-based active fire information.
- [NASA Earthdata](https://www.earthdata.nasa.gov/) — Earth science data and documentation.
- [NASA POWER](https://power.larc.nasa.gov/) — Meteorological and solar data services.
- [USGS Earthquake Catalog](https://earthquake.usgs.gov/earthquakes/search/) — Earthquake event records.
- [OpenWeather](https://openweathermap.org/api) — Weather API documentation, if used by the project.

Data should be attributed to its original provider, with observation dates, retrieval timestamps, units, and relevant limitations wherever possible.

## Getting Started

### Prerequisites

Install the following tools before running the project locally:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) with a compatible npm version

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/pranaydahat9-hash/NASA_b_big_fox_NSA-04-1447.git
```

**2. Open the project directory**

```bash
cd NASA_b_big_fox_NSA-04-1447
```

**3. Install dependencies**

```bash
npm install
```

**4. Configure environment variables**

Review the project's environment configuration and documentation. Add the API keys and service credentials required by the actual implementation.

If the project provides an `.env.example` file, use it as a reference for creating your local `.env` file.

Never commit API secrets, private keys, passwords, or other sensitive credentials to GitHub.

**5. Start the development server**

```bash
npm run dev
```

Open the local URL printed in the terminal to access the application.

> These commands assume the repository contains a Node.js-based web application with the corresponding npm scripts. Follow the actual project configuration if the setup differs.

## Data Accuracy and Limitations

Fox Disaster Sentinel aims to prioritize trustworthy information and transparent risk communication.

- **Source transparency:** Show the origin and timestamp of relevant observations.
- **No fabricated readings:** Do not present invented environmental measurements as real NASA or government data.
- **Clear uncertainty:** Distinguish measured conditions, official warnings, forecasts, and experimental predictions.
- **Geographical relevance:** Associate observations with the correct coordinates, region, and time period.
- **Responsible interpretation:** Historical trends do not guarantee future outcomes.
- **API availability:** External services may require credentials, impose usage limits, or experience interruptions.
- **Emergency limitations:** The application does not replace official warnings, trained emergency services, or local authorities.

Not every hazard can be predicted reliably. For example, earthquake occurrence cannot currently be forecast with dependable precision for a specific location and time. Any hazard assessment should communicate these limitations clearly.

## Future Development

Potential improvements include:

- Expanded NASA Earth observation integrations.
- More robust location-specific hazard analysis.
- Historical event validation and prediction-performance evaluation.
- Improved flood and water-level monitoring where suitable data is available.
- Interactive safe-zone maps and evacuation information.
- Multilingual accessibility and offline emergency resources.
- Reliable voice-assisted emergency workflows.
- Automated PDF report generation with traceable sources.
- Better handling of API failures, missing data, and uncertainty.

## Project Links

- **Live Application:** [https://fox-disaster-sentinel.lovable.app](https://fox-disaster-sentinel.lovable.app)
- **GitHub Repository:** [https://github.com/pranaydahat9-hash/NASA_b_big_fox_NSA-04-1447](https://github.com/pranaydahat9-hash/NASA_b_big_fox_NSA-04-1447)
- **Development Platform:** [https://lovable.dev/](https://lovable.dev/)
- **NASA Space Apps Challenge:** [https://www.spaceappschallenge.org/](https://www.spaceappschallenge.org/)

## Acknowledgements

This project was developed as part of the NASA Space Apps Challenge, with the goal of exploring how Earth observation data, mapping, and digital technologies can contribute to disaster awareness and preparedness.

We acknowledge NASA and other public data providers for making scientific information available to developers, researchers, and communities.

## Disclaimer

Fox Disaster Sentinel is an informational and preparedness-oriented project. Its outputs depend on the availability, quality, and interpretation of the underlying data and services. It is not a substitute for official emergency alerts, professional assessments, or instructions from local authorities.

Always follow verified warnings and guidance issued by the relevant emergency management agencies.

---

**Fox Disaster watch  — Understand the risk. Prepare early. Protect lives.**



