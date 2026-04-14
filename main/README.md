# FLIRT 2.0 (FLRT-2.0)

FLIRT 2.0 is a full-stack Lost and Found Management System built to help communities (such as schools or campuses) report missing items, publish found items, and safely verify ownership before return.

The system combines a public reporting and claiming portal with an admin verification dashboard and image-assisted matching workflows.

## What Kind of System Is This?

This repository contains a **smart lost-and-found platform** with:

- Public item reporting for both lost and found items
- Public claim submissions for published items
- Admin review and verification of claims
- Status tracking from report to return
- Image-based matching workflow (SIFT service)
- Optional Google Drive image storage and Discord notifications

In short: this is an end-to-end operational system for managing the full lifecycle of lost and found items.

## Core Features

- Report a lost or found item with details and optional image
- Browse claimable items in a searchable public page
- Submit ownership claims with claimant details and optional proof image
- Admin dashboard for report publishing, claim verification, and stats
- Return workflow that marks items as resolved/returned and archives images
- Auto-refreshing system statistics for operational visibility

## System Architecture

### Frontend (`client/`)

- React + TypeScript (Vite)
- TanStack Router for page routing
- TanStack Query for API data fetching
- Tailwind CSS for styling

### Backend (`server/`)

- Flask REST API
- SQLAlchemy models and persistence
- JWT-based admin auth support
- Modular route groups: `auth`, `reports`, `claims`, `found-items`, `stats`, `sift`

### Matching and Integrations

- SIFT-based image matching pipeline
- Google Drive integration for image hosting/storage
- Discord webhook notifications for admin/user announcements

## Main User Flows

1. A user reports an item (lost or found).
2. Admin can review and publish reports to the claim page.
3. Claimants submit claims for published items.
4. Admin approves/rejects claims.
5. Approved claims become returned records and the item lifecycle is closed.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, TanStack Router, TanStack Query
- Backend: Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-CORS
- Data/Infra: PostgreSQL (typical), Redis support, Google APIs
- CV/ML Utils: OpenCV (contrib), NumPy, Matplotlib

## Quick Start

### 1) Backend setup

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API starts on `http://localhost:5000` by default.

### 2) Frontend setup

```bash
cd client
npm install
npm run dev
```

The frontend starts on `http://localhost:3000`.

## Configuration Notes

- Configure backend environment variables for database, JWT, and optional integrations.
- Set frontend `VITE_API_URL` when backend is not running on localhost.
- Google Drive and Discord features are optional but supported by the codebase.

## Repository Layout

```text
client/   # React frontend application
server/   # Flask backend API and domain modules
uploads/  # Uploaded files (runtime)
```

## Project Goal

FLIRT 2.0 focuses on making lost-and-found operations faster, traceable, and safer by combining user-friendly reporting with administrative verification and smart matching support.