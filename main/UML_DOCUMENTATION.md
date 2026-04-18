# FLRT System UML Documentation

This document provides comprehensive UML diagrams and documentation for the key components of the Found Lost Return Thing (FLRT) system.

---

## Table of Contents

1. [Report Lost/Found Item](#1-report-lostfound-item)
2. [SIFT Algorithm](#2-sift-algorithm)
3. [Claim Item](#3-claim-item)
4. [Admin Validation](#4-admin-validation)

---

## 1. Report Lost/Found Item

### 1.1 Overview
The Report Lost/Found Item component allows users to submit reports about lost or found items. The system captures item details, images, and location information.

### 1.2 Class Diagram

```
classDiagram
    class Reports {
        -report_id: int
        -item_name: string
        -description: string
        -status: string
        -location: string
        -date_reported: datetime
        -date_lost: date
        -time: time
        -image: string
        -category: string
        +to_json()
    }
    
    class ReportService {
        +submit_report(data, image_url): Reports
        +get_all_reports(): dict
        +get_claimable_reports(): dict
        -_is_sift_busy_error(error_text): bool
        -_parse_iso_date(raw_value): date
    }
    
    class ReportRoutes {
        +POST /api/reports: submit_report
        +GET /api/reports: get_all_reports
        +GET /api/reports/claimable: get_claimable_reports
    }
    
    Reports "1" -- "*" PendingClaims
    Reports "1" -- "*" Returns
    ReportService --> Reports
    ReportRoutes --> ReportService
```

### 1.3 Entity Relationship Diagram

```
erDiagram
    REPORTS ||--o{ PENDING_CLAIMS : contains
    REPORTS ||--o{ RETURNS : contains
    REPORTS {
        int report_id PK
        string item_name
        string description
        string status
        string location
        datetime date_reported
        date date_lost
        time time
        string image
        string category
    }
    
    PENDING_CLAIMS {
        int claim_id PK
        int report_id FK
        string student_name
        string student_number
        string contact_info
        string description
        string status
        string image
        datetime date_claimed
    }
    
    RETURNS {
        int return_id PK
        int report_id FK
        datetime date_returned
    }
```

### 1.4 Status Flow Diagram

```
stateDiagram-v2
    [*] --> lost: Lost Item Report
    [*] --> found: Found Item Report
    
    lost --> published_lost: Admin Publishes
    found --> published_found: Admin Publishes
    
    lost --> returned_lost: Item Returned
    found --> returned_found: Item Returned
    
    published_lost --> returned_lost: Claimed & Returned
    published_found --> returned_found: Claimed & Returned
    
    returned_lost --> [*]
    returned_found --> [*]
```

### 1.5 Sequence Diagram: Submit Report

```
sequenceDiagram
    participant User
    participant Client
    participant API
    participant ReportService
    participant SIFTService
    participant Database
    
    User->>Client: Fill Report Form
    Client->>API: POST /api/reports
    API->>ReportService: submit_report(data, image_url)
    ReportService->>Database: Create Reports record
    Database-->>ReportService: Report created
    ReportService->>SIFTService: process_image_for_report()
    SIFTService-->>ReportService: Image processed
    ReportService-->>API: Return new_report
    API-->>Client: 201 Created
    Client-->>User: Confirmation
```

---

## 2. SIFT Algorithm

### 2.1 Overview
SIFT (Scale-Invariant Feature Transform) is used to match lost and found item images. It analyzes visual features in images to find similar items and suggest matches.

### 2.2 Architecture Diagram

```
graph TB
    subgraph Input["Input Processing"]
        A[User Submits Image]
        B[Download from Google Drive]
        C[Convert to OpenCV Format]
    end
    
    subgraph SIFT_Proc["SIFT Processing"]
        D[Extract Keypoints]
        E[Extract Descriptors]
        F[Feature Matching with FLANN]
        G[Lowe's Ratio Test]
    end
    
    subgraph Scoring["Scoring & Validation"]
        H[Calculate Match Score]
        I[Apply Thresholds]
        J[Verify Second Best Multiplier]
    end
    
    subgraph Output["Output"]
        K[Generate Match Results]
        L[Upload to Google Drive]
        M[Return Matches to Client]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
```

### 2.3 Class Diagram

```
classDiagram
    class SIFTAlgorithm {
        -sift: cv2.SIFT
        -flannMatcher: cv2.FlannBasedMatcher
        -MIN_MATCH_COUNT: int
        -LOWE_RATIO_TEST: float
        -MIN_MATCH_RATIO: float
        -SECOND_BEST_MATCH_MULTIPLIER: float
        +detect_keypoints(image): KeyPoints
        +extract_descriptors(keypoints): Descriptors
        +match_features(descriptors1, descriptors2): Matches
        +apply_lowe_ratio_test(matches): FilteredMatches
        +calculate_match_score(matches): float
    }
    
    class SIFTService {
        +process_image_for_report(report_data): dict
        +query_database(query_image, database_file): MatchResult
        +get_match_with_highest_score(matches): MatchResult
        +upload_public_copy(image_data): UploadResult
        +archive_returned_item_images(report_id): void
    }
    
    class Database {
        -db_file: pickle
        -images: list
        +save_image(name, features): void
        +load_database(): dict
        +query(image_features): list
    }
    
    class GoogleDriveIntegration {
        +download_image(file_id): bytes
        +upload_image(local_path): str
        +get_public_link(file_id): str
    }
    
    SIFTAlgorithm <-- SIFTService
    Database <-- SIFTService
    GoogleDriveIntegration <-- SIFTService
```

### 2.4 SIFT Matching Process Diagram

```
sequenceDiagram
    participant Client
    participant API
    participant SIFTService
    participant Algorithm
    participant Database
    participant GDrive
    
    Client->>API: POST /api/reports/process-image
    API->>SIFTService: process_image_for_report()
    
    SIFTService->>GDrive: Download query image
    GDrive-->>SIFTService: Image bytes
    
    SIFTService->>SIFTService: Load database
    
    SIFTService->>Algorithm: Extract keypoints & descriptors
    Algorithm-->>SIFTService: Features
    
    loop For each database image
        SIFTService->>Algorithm: Match features
        Algorithm->>Algorithm: Apply Lowe's Ratio Test
        Algorithm-->>SIFTService: Match count
        SIFTService->>Algorithm: Calculate match score
        Algorithm-->>SIFTService: Score
    end
    
    SIFTService->>SIFTService: Apply thresholds
    SIFTService->>SIFTService: Filter best match
    
    SIFTService->>GDrive: Upload match image (if found)
    GDrive-->>SIFTService: Public link
    
    SIFTService-->>API: Match result
    API-->>Client: JSON response
```

### 2.5 Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `SIFT_MIN_MATCH_COUNT` | 30 | Minimum number of good matches required |
| `SIFT_LOWE_RATIO` | 0.75 | Lowe's ratio test threshold (0.0-1.0) |
| `SIFT_MIN_MATCH_RATIO` | 0.15 | Minimum ratio of matches to database |
| `SIFT_SECOND_BEST_MULTIPLIER` | 1.5 | Second best match multiplier for confidence |
| `SIFT_MATCH_WORKERS` | 1 | Number of worker threads for matching |
| `GDRIVE_AUTH_MODE` | oauth | Authentication mode (oauth or service_account) |

### 2.6 Matching Score Calculation

```
Score Calculation:
├── Count good matches (apply Lowe's ratio test)
├── Calculate ratio: good_matches / total_matches
├── Compare against MIN_MATCH_RATIO threshold
├── Verify second best match:
│   └── best_score * SECOND_BEST_MATCH_MULTIPLIER > second_best_score
└── Return match score and status
```

---

## 3. Claim Item

### 3.1 Overview
The Claim Item component allows students to claim lost items they believe belong to them by providing proof of ownership.

### 3.2 Class Diagram

```
classDiagram
    class PendingClaims {
        -claim_id: int
        -report_id: int
        -student_name: string
        -student_number: string
        -contact_info: string
        -description: string
        -status: string
        -image: string
        -date_claimed: datetime
        +to_json()
    }
    
    class ClaimService {
        +submit_claim(data): PendingClaims
        +get_claims_by_report(report_id): list
        +get_claims_by_student(student_number): list
        +check_existing_claim(report_id, student_number): bool
        +update_claim_status(claim_id, status): void
    }
    
    class ClaimRoutes {
        +POST /api/claims: submit_claim
        +GET /api/claims/report/:id: get_claims_by_report
        +GET /api/claims/student/:number: get_claims_by_student
        +PUT /api/claims/:id: update_claim
    }
    
    class Reports {
        -report_id: int
        -item_name: string
        -status: string
    }
    
    PendingClaims "*" -- "1" Reports
    ClaimService --> PendingClaims
    ClaimRoutes --> ClaimService
```

### 3.3 Use Case Diagram

```
graph TB
    Actor["Student"]
    
    subgraph UC["Claim Item Use Cases"]
        UC1["Submit Claim"]
        UC2["View Claim Status"]
        UC3["Provide Proof of Ownership"]
        UC4["Contact Finder"]
    end
    
    subgraph Events["System Events"]
        E1["Claim Accepted"]
        E2["Claim Rejected"]
        E3["Claim Pending"]
    end
    
    Actor -->|Claims Found Item| UC1
    Actor -->|Checks Status| UC2
    UC1 -.->|Requires| UC3
    UC1 -->|Triggers| UC2
    UC2 -->|Results in| E1
    UC2 -->|Results in| E2
    UC2 -->|Results in| E3
    UC1 -->|Enables| UC4
```

### 3.4 Claim Status State Machine

```
stateDiagram-v2
    [*] --> pending: Claim Submitted
    
    pending --> accepted: Admin Approves\nProof Verified
    pending --> rejected: Admin Rejects\nProof Invalid
    pending --> pending: Awaiting Review
    
    accepted --> [*]: Claim Accepted\nItem Returned
    rejected --> [*]: Claim Rejected
```

### 3.5 Sequence Diagram: Submit Claim

```
sequenceDiagram
    participant Student
    participant Client
    participant API
    participant ClaimService
    participant Database
    
    Student->>Client: Fill Claim Form
    Student->>Client: Attach Proof Image
    Client->>API: POST /api/claims
    API->>ClaimService: submit_claim(data)
    
    ClaimService->>Database: Check existing claim
    Database-->>ClaimService: No existing claim
    
    ClaimService->>Database: Create PendingClaims record
    Database-->>ClaimService: Claim created
    
    ClaimService-->>API: Return claim_id
    API-->>Client: 201 Created
    Client-->>Student: Claim Submitted Confirmation
    
    Note over Student,Database: Admin reviews claim status
```

### 3.6 Claim Validation Rules

```
Validation Rules:
├── Student Information
│   ├── Student number must be valid
│   ├── Contact info must be provided
│   └── Student name (optional)
├── Ownership Proof
│   ├── Description required (detailed proof)
│   ├── Image attachment (recommended)
│   └── Must demonstrate genuine ownership
├── Report Constraints
│   ├── Report must exist
│   ├── Report status must be claimable
│   ├── One active claim per student per report
│   └── Item must not already be returned
└── Duplicate Check
    └── Prevent duplicate claims from same student
```

---

## 4. Admin Validation

### 4.1 Overview
The Admin Validation component handles administrative verification and approval of claims, management of found items, and overall report validation.

### 4.2 Class Diagram

```
classDiagram
    class Admins {
        -admin_id: int
        -username: string
        -password_hash: string
        -email: string
        -role: string
        -created_at: datetime
        +verify_password(password): bool
        +to_json()
    }
    
    class AdminService {
        +verify_claim(claim_id, status, notes): void
        +update_found_item_status(found_item_id, status): void
        +contact_finder(found_item_id, message): void
        +verify_report(report_id, verification_result): void
        +get_pending_validations(): list
    }
    
    class AdminRoutes {
        +GET /api/admin/claims/pending: get_pending_claims
        +PUT /api/admin/claims/:id/verify: verify_claim
        +GET /api/admin/found-items: get_found_items
        +PUT /api/admin/found-items/:id: update_found_item
        +POST /api/admin/found-items/:id/contact: contact_finder
    }
    
    class PendingClaims {
        -claim_id: int
        -status: string
    }
    
    class FoundItems {
        -found_item_id: int
        -status: string
        -admin_id: int
    }
    
    class Reports {
        -report_id: int
    }
    
    Admins "1" -- "*" FoundItems
    AdminService --> PendingClaims
    AdminService --> FoundItems
    AdminService --> Reports
    AdminRoutes --> AdminService
```

### 4.3 Role-Based Access Control

```
graph TB
    User["User/Admin"] -->|Has Role| Role
    
    subgraph Roles["Role Hierarchy"]
        SA["Superadmin"]
        A["Admin"]
        M["Moderator"]
    end
    
    subgraph Permissions["Permissions"]
        P1["View Dashboard"]
        P2["Verify Claims"]
        P3["Manage Found Items"]
        P4["Contact Finders"]
        P5["Manage Admins"]
        P6["System Settings"]
    end
    
    SA -->|Permission| P1
    SA -->|Permission| P2
    SA -->|Permission| P3
    SA -->|Permission| P4
    SA -->|Permission| P5
    SA -->|Permission| P6
    
    A -->|Permission| P1
    A -->|Permission| P2
    A -->|Permission| P3
    A -->|Permission| P4
    
    M -->|Permission| P1
    M -->|Permission| P3
```

### 4.4 Authentication & Authorization Flow

```
sequenceDiagram
    participant Admin
    participant Client
    participant API
    participant AuthService
    participant TokenService
    participant Database
    
    Admin->>Client: Enter Credentials
    Client->>API: POST /api/auth/login
    API->>AuthService: validate_credentials(username, password)
    
    AuthService->>Database: Query admin user
    Database-->>AuthService: Admin record
    
    AuthService->>AuthService: Hash password & compare
    
    alt Valid Credentials
        AuthService->>TokenService: generate_access_token(admin_id, role)
        TokenService-->>AuthService: JWT token
        AuthService-->>API: auth_success
        API-->>Client: 200 OK + Token
        Client->>Client: Store token
        Client-->>Admin: Login Success
    else Invalid Credentials
        AuthService-->>API: auth_failed
        API-->>Client: 401 Unauthorized
        Client-->>Admin: Login Failed
    end
```

### 4.5 Claim Verification Workflow

```
graph TD
    Start["Claim Submitted"] -->|Admin Reviews| Review["Review Claim Details"]
    Review -->|Check Proof| Check["Analyze Ownership Proof"]
    
    Check -->|Valid Proof| Valid["Proof Verified"]
    Check -->|Invalid Proof| Invalid["Proof Rejected"]
    
    Valid -->|Contact Finder| Contact["Contact Item Finder"]
    Invalid -->|Notify Student| RejectNotify["Send Rejection"]
    
    Contact -->|Finder Confirms| Confirmed["Match Confirmed"]
    Contact -->|Finder Denies| Denied["Match Denied"]
    
    Confirmed -->|Update Status| Accept["Accept Claim"]
    Denied -->|Update Status| RejectMatch["Reject Claim"]
    
    Accept -->|Arrange Return| Return["Item Returned"]
    RejectMatch -->|Notify| RejectNotify
    RejectNotify -->|End| End1["Claim Ended"]
    
    Return -->|Close Record| End2["Claim Closed"]
```

### 4.6 Found Items Coordination

```
classDiagram
    class FoundItems {
        -found_item_id: int
        -finder_name: string
        -finder_student_number: string
        -finder_contact_info: string
        -item_name: string
        -item_description: string
        -item_location: string
        -date_found: date
        -category: string
        -image: string
        -report_id: int
        -status: string
        -admin_notes: text
        -date_submitted: datetime
        -date_contacted: datetime
        -date_closed: datetime
        -admin_id: int
        +to_json()
    }
    
    class FoundItemStatuses {
        +pending: "Newly submitted"
        +contacted: "Admin contacted finder"
        +verified: "Finder verified item"
        +returned: "Item returned to owner"
        +cancelled: "Item no longer available"
    }
    
    FoundItems "*" -- "1" FoundItemStatuses
```

### 4.7 Found Items Status Flow

```
stateDiagram-v2
    [*] --> pending: Found Item Reported
    
    pending --> contacted: Admin Contacts Finder
    
    contacted --> verified: Finder Confirms\nItem Available
    contacted --> cancelled: Finder Unavailable
    
    verified --> returned: Match Arranged\nItem Returned
    
    cancelled --> [*]: Item No Longer Available
    returned --> [*]: Item Returned to Owner
```

### 4.8 Admin Dashboard Overview

```
graph TB
    Dashboard["Admin Dashboard"]
    
    subgraph Widgets["Dashboard Widgets"]
        W1["Pending Claims"]
        W2["Found Items Coordination"]
        W3["Report Statistics"]
        W4["Recent Activity"]
    end
    
    subgraph Metrics["Key Metrics"]
        M1["Total Reports"]
        M2["Claim Resolution Rate"]
        M3["Item Return Rate"]
        M4["Average Response Time"]
    end
    
    Dashboard -->|Displays| W1
    Dashboard -->|Displays| W2
    Dashboard -->|Displays| W3
    Dashboard -->|Displays| W4
    
    W1 -->|Shows| M2
    W2 -->|Shows| M3
    W1 -->|Shows| M4
    W3 -->|Shows| M1
```

---

## 5. Integration Flows

### 5.1 End-to-End Lost Item Claim Flow

```
sequenceDiagram
    participant Owner as Item Owner
    participant Finder as Item Finder
    participant Client
    participant API
    participant Service
    participant Admin
    
    Finder->>Client: Report Found Item
    Client->>API: POST /api/reports
    API->>Service: submit_report(found)
    Service->>Service: Process image via SIFT
    
    Owner->>Client: Report Lost Item
    Client->>API: POST /api/reports
    API->>Service: submit_report(lost)
    Service->>Service: Query SIFT database
    Service-->>API: Match found!
    
    Owner->>Client: View Match & Claim Item
    Client->>API: POST /api/claims
    API->>Service: submit_claim(proof)
    
    Admin->>Admin: Review Dashboard
    Admin->>Admin: Check Claim & Found Item
    Admin->>Admin: Contact Finder for Verification
    
    Finder->>Admin: Confirm Match Verified
    Admin->>API: Update Claim Status
    API->>Service: verify_claim(accepted)
    
    Service->>Service: Arrange return coordination
    Owner->>Admin: Collect Item
    Admin->>API: Mark as Returned
    Service->>Service: Archive images
    
    Service-->>Owner: Item Returned
    Service-->>Finder: Return Confirmation
```

### 5.2 Data Flow Architecture

```
graph TB
    subgraph Client["Client Layer"]
        C1["Lost Item Form"]
        C2["Found Item Form"]
        C3["Claim Form"]
        C4["Admin Dashboard"]
    end
    
    subgraph API["API Layer"]
        A1["/api/reports"]
        A2["/api/claims"]
        A3["/api/admin"]
        A4["/api/sift"]
    end
    
    subgraph Service["Service Layer"]
        S1["Report Service"]
        S2["Claim Service"]
        S3["SIFT Service"]
        S4["Admin Service"]
    end
    
    subgraph Data["Data Layer"]
        D1["Reports DB"]
        D2["Claims DB"]
        D3["Found Items DB"]
        D4["SIFT Database"]
        D5["Admin Users DB"]
    end
    
    C1 --> A1
    C2 --> A1
    C3 --> A2
    C4 --> A3
    
    A1 --> S1
    A2 --> S2
    A4 --> S3
    A3 --> S4
    
    S1 --> D1
    S1 --> S3
    S2 --> D2
    S3 --> D4
    S4 --> D1
    S4 --> D2
    S4 --> D3
    S4 --> D5
```

---

## 6. Key Constraints & Validations

### 6.1 Report Constraints

| Constraint | Type | Description |
|-----------|------|-------------|
| `status` | CHECK | Must be one of: 'lost', 'found', 'published_lost', 'published_found', 'returned', 'returned_lost', 'returned_found' |
| `item_name` | NOT NULL | Item name is required |
| `location` | NOT NULL | Location must be provided |
| `date_reported` | NOT NULL | Report date is automatic |
| `category` | Foreign | Must match valid category (Electronics, Accessories, Bags, Books, Stationery) |

### 6.2 Claim Constraints

| Constraint | Type | Description |
|-----------|------|-------------|
| `status` | CHECK | Must be one of: 'pending', 'accepted', 'rejected' |
| `report_id` | FK | Must reference existing report |
| `contact_info` | NOT NULL | Contact information required |
| `description` | NOT NULL | Proof of ownership description required |
| `date_claimed` | NOT NULL | Claim date is automatic |
| `Uniqueness` | UNIQUE | One pending claim per student per report |

### 6.3 Found Items Constraints

| Constraint | Type | Description |
|-----------|------|-------------|
| `status` | CHECK | Must be one of: 'pending', 'contacted', 'verified', 'returned', 'cancelled' |
| `finder_name` | NOT NULL | Finder name required |
| `finder_contact_info` | NOT NULL | Finder contact required |
| `date_found` | NOT NULL | Date found required |
| `report_id` | FK | Optional linked report |
| `admin_id` | FK | Optional assigned admin |

---

## 7. Error Handling & Recovery

### 7.1 SIFT Algorithm Error Scenarios

```
SIFT Errors:
├── Image Processing
│   ├── Invalid image format → Return error, suggest retry
│   ├── Image too small → Return error with minimum size
│   └── Download timeout → Retry with exponential backoff
├── Matching Process
│   ├── No features detected → Return "no match"
│   ├── Database corrupted → Rebuild database
│   └── Matching timeout → Return "SIFT busy" error
└── Google Drive Integration
    ├── Authentication failed → Refresh token/re-authenticate
    ├── Upload failed → Retry with circuit breaker
    └── Download failed → Use fallback image source
```

### 7.2 Claim Validation Errors

```
Claim Validation Errors:
├── Invalid Student Info
│   └── Return 400 Bad Request
├── Duplicate Claim
│   └── Return 409 Conflict
├── Invalid Report
│   └── Return 404 Not Found
├── Report Not Claimable
│   └── Return 422 Unprocessable Entity
└── Missing Proof
    └── Return 400 Bad Request
```

---

## 8. Database Schema Summary

### 8.1 Tables

```
REPORTS
├── PK: report_id
├── FK: (none)
├── Indexes: status, date_reported, category
└── Constraints: status validation

PENDING_CLAIMS
├── PK: claim_id
├── FK: report_id → REPORTS
├── Indexes: report_id, status, student_number, date_claimed
└── Constraints: status validation, unique(report_id, student_number)

FOUND_ITEMS
├── PK: found_item_id
├── FK: report_id → REPORTS, admin_id → ADMINS
├── Indexes: status, date_submitted, finder_student_number, admin_id, report_id
└── Constraints: status validation

ADMINS
├── PK: admin_id
├── FK: (none)
├── Indexes: username
└── Constraints: unique(username)

RETURNS
├── PK: return_id
├── FK: report_id → REPORTS
├── Indexes: report_id, date_returned
└── Constraints: (none)
```

---

## 9. Summary

This UML documentation covers:

- **Report Lost/Found Item**: User submission workflows, data models, and status management
- **SIFT Algorithm**: Image matching backend, feature extraction, and similarity scoring
- **Claim Item**: Proof of ownership submission, claim tracking, and status management
- **Admin Validation**: Verification workflows, role-based access, and item coordination

Together, these components form a complete system for reporting lost/found items, matching them using computer vision, managing claims, and coordinating returns through administrative oversight.
