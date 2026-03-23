# FLRT 2.0 User Acceptance Testing (UAT) Questionnaire

## Project Details
- Project Name: FLRT 2.0 (Lost and Found Item Return Tracker)
- Build/Version: ______________________
- Test Environment: ______________________
- Test Date: ______________________
- Tester Name: ______________________
- Tester Role: ______________________

## Scoring Guide
- Result: Pass / Fail / Blocked / N-A
- Severity (if Fail): Low / Medium / High / Critical

---

## UAT Checklist

| ID | Module | Test Question | Expected Result | Result | Severity | Notes / Defect ID | Screenshot / Evidence |
|---|---|---|---|---|---|---|---|
| UAT-001 | Public Report | Can user submit a Lost report with required fields (item, description, location, date)? | Report saves successfully and confirmation is shown |  |  |  |  |
| UAT-002 | Public Report | Can user submit a Found report with required fields? | Report saves successfully and confirmation is shown |  |  |  |  |
| UAT-003 | Public Report | Can user upload an image during report submission? | Image uploads successfully and appears in report details |  |  |  |  |
| UAT-004 | Matching | For Lost + image submission, does SIFT run on first submit? | Matching process runs once and returns result or no-match message |  |  |  |  |
| UAT-005 | Matching | If match is found and personal info is missing, is modal shown? | Personal info modal appears before claim creation |  |  |  |  |
| UAT-006 | Matching | After modal submit, is claim created without reprocessing image? | Pending claim is created and no second SIFT processing occurs |  |  |  |  |
| UAT-007 | Claims | Does matched claim appear in Verify Claims (not Manage Reports)? | Claim is visible in Verify Claims queue |  |  |  |  |
| UAT-008 | Claims | Can user submit a manual claim with valid contact details? | Claim saved successfully with pending status |  |  |  |  |
| UAT-009 | Admin Auth | Can admin login and access dashboard pages? | Admin can access All Reports, Verify Claims, Manage Reports, Found Items, Returned Reports |  |  |  |  |
| UAT-010 | Manage Reports | Does search work by ID, item name, location, and date? | Matching rows are filtered correctly and pagination updates |  |  |  |  |
| UAT-011 | Manage Reports | Can admin publish pending report after category selection? | Status changes to published and appears on claim page |  |  |  |  |
| UAT-012 | Found Coordination | Can admin contact finder with notes? | Status becomes contacted, date_contacted set, admin_id stored |  |  |  |  |
| UAT-013 | Found Coordination | Can admin verify coordination after contact? | Status becomes verified and ready to publish |  |  |  |  |
| UAT-014 | Published Control | Can admin hide published report from claim page? | Status reverts to lost/found and report no longer claimable |  |  |  |  |
| UAT-015 | Published Control | Can admin mark published report as returned? | Status updates to returned_lost/returned_found |  |  |  |  |
| UAT-016 | Returned Reports | Do returned reports move out of Manage Reports? | Returned items no longer appear in Manage Reports |  |  |  |  |
| UAT-017 | Returned Reports | Does Returned Reports page show separated Lost and Found returns? | Filters for All, Lost Returns, Found Returns work correctly |  |  |  |  |
| UAT-018 | Data Tracking | Is admin ID visible for coordination actions? | Handled-by admin ID is recorded and displayed |  |  |  |  |
| UAT-019 | Data Tracking | Is date_closed used correctly when item is closed/returned/cancelled? | Closure timestamp is set and stored correctly |  |  |  |  |
| UAT-020 | Notifications | Are webhook notifications routed correctly by event? | Publish/return notifications go to intended channels/audiences |  |  |  |  |
| UAT-021 | Security | Are non-admin users blocked from admin routes? | Unauthorized access is denied and redirected |  |  |  |  |
| UAT-022 | Stability | Does app handle API errors gracefully with clear messages? | Friendly error messages shown; app remains usable |  |  |  |  |
| UAT-023 | Cloud Access | If exposed via tunnel, can external users access public pages? | Public pages load and API requests succeed |  |  |  |  |
| UAT-024 | Performance | Are list pages responsive under normal data load? | Acceptable response time and smooth pagination/search |  |  |  |  |

---

## Summary
- Total Cases: 24
- Passed: _____
- Failed: _____
- Blocked: _____
- N-A: _____
- Pass Rate: _____%

## Go/No-Go Recommendation
- Recommendation: Go / No-Go
- Rationale:
  - __________________________________________
  - __________________________________________
  - __________________________________________

## Sign-off
- QA Lead: ______________________ Date: __________
- Product Owner: ______________________ Date: __________
- Client Representative: ______________________ Date: __________
